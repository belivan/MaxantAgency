/**
 * Auto Report Generator
 * Automatically generates and uploads reports after analysis
 */

import { generateReport, generateStoragePath, generateReportFilename, validateAnalysisResult } from './report-generator.js';
import { uploadReport, saveReportMetadata } from './storage/supabase-storage.js';
import { runReportSynthesis } from './synthesis/report-synthesis.js';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Automatically generate and upload a report after analysis
 *
 * @param {object} analysisResult - The complete analysis result
 * @param {object} options - Options for report generation
 * @returns {Promise<object>} Report metadata including storage path and URL
 */
export async function autoGenerateReport(analysisResult, options = {}) {
  const {
    format = 'markdown',
    sections = ['all'],
    saveToDatabase = true,
    project_id = null
  } = options;

  try {
    console.log(`📝 Auto-generating ${format} report for ${analysisResult.company_name}...`);

    // Map database fields to report generator expected fields
    const reportData = {
      ...analysisResult,
      grade: analysisResult.grade || analysisResult.website_grade, // Handle both field names
      overall_score: analysisResult.overall_score || analysisResult.website_score
    };

    // Validate analysis result has required fields
    validateAnalysisResult(reportData);

    // PHASE 2: AI SYNTHESIS (if enabled)
    let synthesisData = null;
    const useSynthesis = process.env.USE_AI_SYNTHESIS === 'true';

    if (useSynthesis) {
      try {
        console.log(`🤖 Running AI synthesis for ${reportData.company_name}...`);
        const synthesisStartTime = Date.now();

        synthesisData = await runReportSynthesis({
          companyName: reportData.company_name,
          industry: reportData.industry,
          grade: reportData.grade,
          overallScore: reportData.overall_score,
          url: reportData.url,
          issuesByModule: {
            desktop: reportData.design_issues_desktop || [],
            mobile: reportData.design_issues_mobile || [],
            seo: reportData.seo_issues || [],
            content: reportData.content_issues || [],
            social: reportData.social_issues || [],
            accessibility: reportData.accessibility_issues || []
          },
          quickWins: reportData.quick_wins || [],
          leadScoring: {
            lead_priority: reportData.lead_priority,
            priority_tier: reportData.priority_tier,
            budget_likelihood: reportData.budget_likelihood
          },
          topIssue: reportData.top_issue,
          techStack: reportData.tech_stack,
          hasBlog: reportData.has_blog,
          socialPlatforms: reportData.social_platforms_present || [],
          isMobileFriendly: reportData.is_mobile_friendly,
          hasHttps: reportData.has_https,
          crawlPages: reportData.crawl_metadata?.pages_analyzed || []
        });

        const synthesisDuration = ((Date.now() - synthesisStartTime) / 1000).toFixed(1);
        console.log(`✅ AI synthesis complete (${synthesisDuration}s)`);
        console.log(`   - Consolidated Issues: ${synthesisData.consolidatedIssues?.length || 0}`);
        console.log(`   - Executive Summary: ${synthesisData.executiveSummary ? 'Generated' : 'Missing'}`);
        console.log(`   - Synthesis Errors: ${synthesisData.errors?.length || 0}`);
        
        // DEBUG: Log synthesis data structure
        console.log(`[AUTO-REPORT] Synthesis data structure check:`);
        console.log(`  - synthesisData keys: ${Object.keys(synthesisData).join(', ')}`);
        if (synthesisData.executiveSummary) {
          console.log(`  - executiveSummary type: ${typeof synthesisData.executiveSummary}`);
          console.log(`  - executiveSummary keys: ${Object.keys(synthesisData.executiveSummary).join(', ')}`);
        }

      } catch (synthesisError) {
        console.warn(`⚠️  AI synthesis failed, using fallback: ${synthesisError.message}`);
        // Continue with regular report generation - synthesis is optional
        synthesisData = null;
      }
    } else {
      console.log('ℹ️  AI synthesis disabled (USE_AI_SYNTHESIS=false)');
    }

    // Generate the report (with or without synthesis data)
    const report = await generateReport(reportData, {
      format,
      sections,
      synthesisData  // Pass synthesis results to report generator
    });

    // Handle local backup based on format
    const reportsDir = join(__dirname, '..', '..', 'local-backups', 'analysis-engine', 'reports');
    await mkdir(reportsDir, { recursive: true });
    const localFilename = generateReportFilename(reportData, format);
    const localReportPath = join(reportsDir, localFilename);

    let localPath = localReportPath;
    let contentForUpload = report.content;

    // For PDF format, the file is already saved, just need to copy or reference it
    if (format === 'pdf' && report.path) {
      // PDF was already generated to a file
      const { readFile: fsReadFile, copyFile } = await import('fs/promises');
      
      // Copy the PDF to local backup location
      await copyFile(report.path, localReportPath);
      console.log(`📄 Local PDF backup saved: ${localReportPath}`);
      
      // Read the PDF for Supabase upload
      contentForUpload = await fsReadFile(report.path);
      localPath = localReportPath;
    } else if (report.content) {
      // For text-based formats (markdown, html), save content to file
      await writeFile(localReportPath, report.content, 'utf8');
      console.log(`📄 Local report backup saved: ${localReportPath}`);
    } else {
      throw new Error(`Report generation failed: No content or path returned for format ${format}`);
    }

    const shouldUpload = format !== 'html';
    let uploadResult = { path: null, fullPath: null };

    if (shouldUpload) {
      const storagePath = generateStoragePath(reportData, format);

      const contentTypeMap = {
        'markdown': 'text/markdown',
        'html': 'text/html',
        'pdf': 'application/pdf',
        'json': 'application/json'
      };
      const contentType = contentTypeMap[format] || 'text/plain';

      try {
        uploadResult = await uploadReport(contentForUpload, storagePath, contentType);
      } catch (uploadError) {
        console.log('Supabase upload skipped: '+ uploadError.message);
        console.log('Report available locally at: '+ localPath);
        // Continue without upload - local backup is enough
      }
    } else {
      console.log('Skipping Supabase upload for HTML report. Report available locally at: '+ localPath);
    }

    // Save metadata to database if requested (only if upload succeeded)
    let reportRecord = null;
    if (saveToDatabase && uploadResult.path) {
      // Calculate file size based on what we're uploading
      const fileSize = Buffer.isBuffer(contentForUpload) 
        ? contentForUpload.length 
        : Buffer.byteLength(contentForUpload, 'utf8');

      const metadata = {
        lead_id: analysisResult.id, // The lead ID from the analysis
        project_id: project_id || analysisResult.project_id,
        report_type: 'website_audit',
        format,
        storage_path: uploadResult.path,
        storage_bucket: 'reports',
        file_size_bytes: fileSize,
        company_name: reportData.company_name,
        website_url: reportData.url,
        overall_score: Math.round(reportData.overall_score),
        website_grade: reportData.grade,
        config: {
          sections: sections.includes('all') ? 'all' : sections.join(','),
          generation_time_ms: report.metadata.generation_time_ms,
          word_count: report.metadata.word_count || 0,
          used_ai_synthesis: useSynthesis && synthesisData !== null,
          synthesis_errors: synthesisData?.errors?.length || 0,
          consolidated_issues_count: synthesisData?.consolidatedIssues?.length || 0
        },
        status: 'completed',
        generated_at: new Date().toISOString()
      };

      reportRecord = await saveReportMetadata(metadata);
      console.log(`✅ Report saved: ${reportRecord.id}`);
    }

    // Calculate file size for return value
    const fileSize = Buffer.isBuffer(contentForUpload) 
      ? contentForUpload.length 
      : Buffer.byteLength(contentForUpload, 'utf8');

    return {
      success: true,
      report_id: reportRecord?.id,
      storage_path: uploadResult.path,
      full_path: uploadResult.fullPath,
      local_path: localPath,
      format,
      file_size: fileSize,
      metadata: report.metadata,
      synthesis: {
        used: useSynthesis && synthesisData !== null,
        errors: synthesisData?.errors || [],
        consolidatedIssuesCount: synthesisData?.consolidatedIssues?.length || 0
      }
    };

  } catch (error) {
    console.error('❌ Auto report generation failed:', error);

    // Return error but don't throw - we don't want report generation
    // failure to break the analysis workflow
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate reports for multiple analysis results
 *
 * @param {array} analysisResults - Array of analysis results
 * @param {object} options - Options for report generation
 * @returns {Promise<array>} Array of report generation results
 */
export async function batchGenerateReports(analysisResults, options = {}) {
  const results = [];

  for (const analysis of analysisResults) {
    try {
      const result = await autoGenerateReport(analysis, options);
      results.push({
        company_name: analysis.company_name,
        ...result
      });

      // Small delay to avoid overwhelming storage
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      results.push({
        company_name: analysis.company_name,
        success: false,
        error: error.message
      });
    }
  }

  // Summary
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`\n📊 Batch report generation complete:`);
  console.log(`   ✅ Successful: ${successful}`);
  if (failed > 0) {
    console.log(`   ❌ Failed: ${failed}`);
  }

  return results;
}

/**
 * Check if reports bucket exists and create if needed
 */
export async function ensureReportsBucket() {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.warn('⚠️ Could not list storage buckets:', listError.message);
      return false;
    }

    const reportsExists = buckets?.some(bucket => bucket.name === 'reports');

    if (!reportsExists) {
      console.log('📦 Creating reports bucket...');

      const { data, error } = await supabase.storage.createBucket('reports', {
        public: false, // Keep reports private by default
        allowedMimeTypes: [
          'text/markdown',
          'text/html',
          'application/pdf',
          'application/json',
          'text/plain'
        ],
        fileSizeLimit: 10485760 // 10MB limit
      });

      if (error) {
        console.error('❌ Failed to create reports bucket:', error.message);
        return false;
      }

      console.log('✅ Reports bucket created successfully');
    } else {
      console.log('✅ Reports bucket already exists');
    }

    return true;

  } catch (error) {
    console.error('❌ Error checking/creating reports bucket:', error);
    return false;
  }
}