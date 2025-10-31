import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import fs from 'fs/promises';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from root .env
dotenv.config({ path: resolve(__dirname, '../.env') });

// Import report generation modules
import { autoGenerateReport } from './reports/auto-report-generator.js';
import { generateReport } from './reports/report-generator.js';
// Storage operations (files/buckets)
import {
  uploadReport,
  deleteReport,
  getSignedUrl,
  ensureReportsBucket
} from './reports/storage/supabase-storage.js';
// Database operations (reports table)
import {
  supabase,
  saveReportMetadata,
  getReportById,
  getReportsByLeadId,
  incrementDownloadCount
} from './database/supabase-client.js';

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ==========================================
// HEALTH CHECK
// ==========================================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'report-engine',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ==========================================
// REPORT GENERATION ENDPOINTS
// ==========================================

/**
 * POST /api/generate
 * Generate a report from analysis data
 *
 * Body:
 * {
 *   analysisResult: { ...full analysis data... },
 *   options: {
 *     format: 'html' | 'markdown' | 'pdf',
 *     sections: ['all'] | ['executive', 'technical', ...],
 *     saveToDatabase: true,
 *     project_id: 'uuid',
 *     lead_id: 'uuid' (optional - for existing leads)
 *   }
 * }
 */
app.post('/api/generate', async (req, res) => {
  try {
    const { analysisResult, options = {} } = req.body;

    // Validate input
    if (!analysisResult) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: analysisResult'
      });
    }

    if (!analysisResult.company_name || !analysisResult.url) {
      return res.status(400).json({
        success: false,
        error: 'analysisResult must include company_name and url'
      });
    }

    console.log(`\n📊 Generating report for: ${analysisResult.company_name}`);
    console.log(`   URL: ${analysisResult.url}`);
    console.log(`   Format: ${options.format || 'html'}`);
    console.log(`   Synthesis: ${process.env.USE_AI_SYNTHESIS === 'true' ? 'ENABLED' : 'DISABLED'}`);

    // Generate report using auto-report-generator
    const reportResult = await autoGenerateReport(analysisResult, {
      format: options.format || 'html',
      sections: options.sections || ['all'],
      saveToDatabase: options.saveToDatabase !== false,
      project_id: options.project_id || null,
      lead_id: options.lead_id || null
    });

    console.log(`✅ Report generated successfully`);
    console.log(`   Report ID: ${reportResult.report_id || 'N/A'}`);
    console.log(`   Storage Path: ${reportResult.storage_path || 'N/A'}`);
    console.log(`   Local Path: ${reportResult.local_path || 'N/A'}`);

    res.json({
      success: true,
      report: {
        id: reportResult.report_id,
        storage_path: reportResult.storage_path,
        local_path: reportResult.local_path,
        preview_path: reportResult.preview_path,
        full_report_path: reportResult.full_report_path,
        format: options.format || 'html',
        company_name: analysisResult.company_name,
        website_url: analysisResult.url,
        download_url: reportResult.download_url || null,
        metadata: reportResult.metadata || null,
        synthesis: reportResult.synthesis || null
      }
    });

  } catch (error) {
    console.error('❌ Error generating report:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * POST /api/generate-from-lead
 * Generate report for an existing lead (fetches from database)
 *
 * Body:
 * {
 *   lead_id: 'uuid',
 *   format: 'html' | 'markdown' | 'pdf',
 *   sections: ['all'] | ['executive', 'technical', ...]
 * }
 */
app.post('/api/generate-from-lead', async (req, res) => {
  try {
    const { lead_id, format = 'html', sections = ['all'] } = req.body;

    if (!lead_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: lead_id'
      });
    }

    console.log(`\n📊 Generating report for lead: ${lead_id}`);
    console.log(`   Format: ${format}`);

    // Fetch lead from database
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', lead_id)
      .single();

    if (leadError || !lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found',
        details: leadError?.message
      });
    }

    // Fetch benchmark data if matched_benchmark_id exists
    let matchedBenchmark = null;
    if (lead.matched_benchmark_id) {
      const { data: benchmark, error: benchmarkError } = await supabase
        .from('benchmarks')
        .select('*')
        .eq('id', lead.matched_benchmark_id)
        .single();

      if (!benchmarkError && benchmark) {
        // Calculate match score based on similarity (simplified version)
        // Could be made more sophisticated by comparing multiple metrics
        const matchScore = 85; // Default high match since it was AI-selected

        // Format tier for display
        const tierMapping = {
          'local': 'Local Leader',
          'regional': 'Regional Leader',
          'national': 'National Leader',
          'enterprise': 'Enterprise Leader'
        };
        const comparisonTier = tierMapping[benchmark.benchmark_tier] || 'Industry Leader';

        // Structure benchmark data for report compatibility
        matchedBenchmark = {
          id: benchmark.id,
          company_name: benchmark.company_name,
          website_url: benchmark.website_url,
          industry: benchmark.industry,
          benchmark_tier: benchmark.benchmark_tier,

          // Fields expected by report sections
          match_score: matchScore,
          comparison_tier: comparisonTier,

          // Create scores object that report sections expect
          scores: {
            overall: benchmark.analysis_results?.overall_score || 0,
            grade: benchmark.analysis_results?.grade || 'N/A',
            design: benchmark.analysis_results?.design_score || 0,
            seo: benchmark.analysis_results?.seo_score || 0,
            content: benchmark.analysis_results?.content_score || 0,
            social: benchmark.analysis_results?.social_score || 0,
            accessibility: benchmark.analysis_results?.accessibility_score || 0,
            performance: benchmark.analysis_results?.performance_score || 0
          },

          // Include full analysis_results for detailed sections
          ...benchmark.analysis_results,

          // Keep original nested structure for reference
          analysis_results: benchmark.analysis_results
        };
        console.log(`   📊 Benchmark loaded: ${benchmark.company_name} (Grade: ${matchedBenchmark.scores.grade}, Tier: ${comparisonTier})`);
      }
    }

    // Extract analysis data from lead
    const analysisResult = {
      company_name: lead.company_name,
      url: lead.url,
      industry: lead.industry,
      overall_score: lead.overall_score || lead.website_score,
      grade: lead.website_grade,
      design_score: lead.design_score,
      seo_score: lead.seo_score,
      performance_score: lead.performance_score,  // Don't default to 0 - let it be undefined if not available
      content_score: lead.content_score,
      accessibility_score: lead.accessibility_score,
      social_score: lead.social_score,

      // Structured data for report
      design_issues: lead.design_issues || [],
      seo_issues: lead.seo_issues || [],
      content_issues: lead.content_issues || [],
      accessibility_issues: lead.accessibility_issues || [],
      social_issues: lead.social_issues || [],

      quick_wins: lead.quick_wins || [],
      top_issue: lead.top_issue,
      one_liner: lead.one_liner,

      // Screenshots
      screenshot_desktop: lead.screenshot_desktop,
      screenshot_mobile: lead.screenshot_mobile,

      // Raw analyzer outputs
      design_analysis: lead.design_analysis,
      seo_analysis: lead.seo_analysis,
      content_analysis: lead.content_analysis,
      accessibility_analysis: lead.accessibility_analysis,
      social_analysis: lead.social_analysis,

      // Metadata
      analyzed_at: lead.analyzed_at,
      analysis_time_ms: lead.analysis_time_ms,

      // Benchmark comparison data
      matched_benchmark: matchedBenchmark
    };

    // Generate report using auto-report-generator
    const reportResult = await autoGenerateReport(analysisResult, {
      format,
      sections,
      saveToDatabase: true,
      project_id: lead.project_id || null,
      lead_id: lead.id
    });

    console.log(`✅ Report generated successfully`);
    console.log(`   Report ID: ${reportResult.report_id || 'N/A'}`);
    console.log(`   Storage Path: ${reportResult.storage_path || 'N/A'}`);

    // Validate that report was saved to database
    if (!reportResult.report_id) {
      return res.status(500).json({
        success: false,
        error: 'Report was generated but not saved to database',
        details: 'report_id is missing from result'
      });
    }

    res.json({
      success: true,
      report: {
        id: reportResult.report_id,
        lead_id: lead.id,
        project_id: lead.project_id,
        report_type: 'website-audit',
        format,
        storage_path: reportResult.storage_path,
        storage_bucket: reportResult.storage_bucket || 'reports',
        file_size_bytes: reportResult.file_size_bytes || 0,
        company_name: lead.company_name,
        website_url: lead.website,
        overall_score: lead.overall_score || lead.website_score,
        website_grade: lead.website_grade,
        download_count: 0,
        status: 'completed',
        generated_at: new Date().toISOString(),
        download_url: reportResult.download_url || null
      }
    });

  } catch (error) {
    console.error('❌ Error generating report from lead:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==========================================
// REPORT RETRIEVAL ENDPOINTS
// ==========================================

/**
 * GET /api/reports/:id
 * Get report metadata by ID
 */
app.get('/api/reports/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const report = await getReportById(id);

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    res.json({
      success: true,
      report
    });

  } catch (error) {
    console.error('❌ Error fetching report:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/reports/:id/download
 * Get signed download URL for a report
 */
app.get('/api/reports/:id/download', async (req, res) => {
  try {
    const { id } = req.params;

    const report = await getReportById(id);

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    // Generate signed URL
    const downloadUrl = await getSignedUrl(report.storage_path);

    // Increment download counter
    await incrementDownloadCount(id);

    res.json({
      success: true,
      download_url: downloadUrl,
      report: {
        id: report.id,
        company_name: report.company_name,
        website_url: report.website_url,
        format: report.format,
        generated_at: report.generated_at,
        download_count: report.download_count + 1
      }
    });

  } catch (error) {
    console.error('❌ Error generating download URL:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/reports/lead/:lead_id
 * Get all reports for a specific lead
 */
app.get('/api/reports/lead/:lead_id', async (req, res) => {
  try {
    const { lead_id } = req.params;

    const reports = await getReportsByLeadId(lead_id);

    res.json({
      success: true,
      reports,
      count: reports.length
    });

  } catch (error) {
    console.error('❌ Error fetching lead reports:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==========================================
// REPORT DELETION ENDPOINT
// ==========================================

/**
 * DELETE /api/reports/:id
 * Delete a report (from storage and database)
 */
app.delete('/api/reports/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const report = await getReportById(id);

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    // Delete from storage and database
    await deleteReport(report.storage_path, id);

    res.json({
      success: true,
      message: 'Report deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting report:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==========================================
// ERROR HANDLING
// ==========================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// ==========================================
// SERVER STARTUP
// ==========================================

async function startServer() {
  try {
    // Ensure Supabase Storage bucket exists
    console.log('🔧 Checking Supabase Storage bucket...');
    await ensureReportsBucket();

    // Start Express server
    app.listen(PORT, () => {
      console.log('\n' + '='.repeat(60));
      console.log('📊 REPORT ENGINE - READY');
      console.log('='.repeat(60));
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🤖 AI Synthesis: ${process.env.USE_AI_SYNTHESIS !== 'false' ? 'ENABLED (default on)' : 'DISABLED'}`);
      console.log(`📝 Default Format: ${process.env.REPORT_FORMAT || 'html'}`);
      console.log(`📦 Report Version: ${process.env.REPORT_VERSION || 'v3'}`);
      console.log('='.repeat(60));
      console.log('\n📚 Available endpoints:');
      console.log(`   POST   http://localhost:${PORT}/api/generate`);
      console.log(`   POST   http://localhost:${PORT}/api/generate-from-lead`);
      console.log(`   GET    http://localhost:${PORT}/api/reports/:id`);
      console.log(`   GET    http://localhost:${PORT}/api/reports/:id/download`);
      console.log(`   GET    http://localhost:${PORT}/api/reports/lead/:lead_id`);
      console.log(`   DELETE http://localhost:${PORT}/api/reports/:id`);
      console.log(`   GET    http://localhost:${PORT}/health`);
      console.log('='.repeat(60) + '\n');
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
