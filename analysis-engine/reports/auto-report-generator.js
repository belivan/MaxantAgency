/**
 * Auto Report Generator
 * Automatically generates and uploads reports after analysis
 */

import { generateReport, generateStoragePath, validateAnalysisResult } from './report-generator.js';
import { uploadReport, saveReportMetadata } from './storage/supabase-storage.js';

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

    // Generate the report
    const report = await generateReport(reportData, { format, sections });

    // Generate storage path
    const storagePath = generateStoragePath(reportData, format);

    // Determine content type
    const contentTypeMap = {
      'markdown': 'text/markdown',
      'html': 'text/html',
      'pdf': 'application/pdf',
      'json': 'application/json'
    };
    const contentType = contentTypeMap[format] || 'text/plain';

    // Upload to Supabase Storage
    const uploadResult = await uploadReport(report.content, storagePath, contentType);

    // Save metadata to database if requested
    let reportRecord = null;
    if (saveToDatabase) {
      const metadata = {
        lead_id: analysisResult.id, // The lead ID from the analysis
        project_id: project_id || analysisResult.project_id,
        report_type: 'website_audit',
        format,
        storage_path: uploadResult.path,
        storage_bucket: 'reports',
        file_size_bytes: Buffer.byteLength(report.content, 'utf8'),
        company_name: reportData.company_name,
        website_url: reportData.url,
        overall_score: Math.round(reportData.overall_score),
        website_grade: reportData.grade,
        config: {
          sections: sections === ['all'] ? 'all' : sections,
          generation_time_ms: report.metadata.generation_time_ms,
          word_count: report.metadata.word_count
        },
        status: 'completed',
        generated_at: new Date().toISOString()
      };

      reportRecord = await saveReportMetadata(metadata);
      console.log(`✅ Report saved: ${reportRecord.id}`);
    }

    return {
      success: true,
      report_id: reportRecord?.id,
      storage_path: uploadResult.path,
      full_path: uploadResult.fullPath,
      format,
      file_size: Buffer.byteLength(report.content, 'utf8'),
      metadata: report.metadata
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