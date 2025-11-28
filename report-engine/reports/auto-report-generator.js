/**
 * Auto Report Generator
 * Automatically generates and uploads reports after analysis
 */

import { generateReport, generateStoragePath, generateReportFilename, validateAnalysisResult } from './report-generator.js';
import { uploadReport, ensureReportsBucket } from './storage/supabase-storage.js';
import { saveReportMetadata, getBenchmarkById } from '../database/supabase-client.js';
import { runReportSynthesis } from './synthesis/report-synthesis.js';
import { generateHTMLReportV3 } from './exporters/html-exporter-v3.js';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Prepare screenshot data for HTML report embedding
 * Loads screenshots as base64 dataURIs
 */
/**
 * Fetch screenshot from URL or local file path and convert to data URI
 */
async function fetchScreenshotAsDataUri(url) {
  try {
    // Check if it's a local file path (not HTTP URL)
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      // It's a local file path - read directly from disk
      if (existsSync(url)) {
        const buffer = await readFile(url);
        return `data:image/png;base64,${buffer.toString('base64')}`;
      } else {
        console.warn(`⚠️ Local screenshot file not found: ${url}`);
        return null;
      }
    }

    // It's an HTTP URL - fetch from network
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return `data:image/png;base64,${buffer.toString('base64')}`;
  } catch (error) {
    console.error(`❌ Failed to fetch screenshot from ${url}:`, error.message);
    return null;
  }
}

async function prepareScreenshotData(reportData) {
  const screenshotData = {
    screenshots: [],
    benchmarkScreenshots: []
  };

  // PRIORITY 1: Try local file paths first (faster, no network calls)
  if (reportData.screenshot_desktop_path || reportData.screenshot_mobile_path) {
    console.log(`📸 Trying to load screenshots from local file paths`);

    if (reportData.screenshot_desktop_path && existsSync(reportData.screenshot_desktop_path)) {
      try {
        const buffer = await readFile(reportData.screenshot_desktop_path);
        screenshotData.screenshots.push({
          page: '/',
          device: 'desktop',
          dataUri: `data:image/png;base64,${buffer.toString('base64')}`
        });
      } catch (err) {
        console.warn(`⚠️ Could not load desktop screenshot: ${err.message}`);
      }
    }

    if (reportData.screenshot_mobile_path && existsSync(reportData.screenshot_mobile_path)) {
      try {
        const buffer = await readFile(reportData.screenshot_mobile_path);
        screenshotData.screenshots.push({
          page: '/',
          device: 'mobile',
          dataUri: `data:image/png;base64,${buffer.toString('base64')}`
        });
      } catch (err) {
        console.warn(`⚠️ Could not load mobile screenshot: ${err.message}`);
      }
    }
  }

  // PRIORITY 2: Try screenshot URLs (Supabase Storage) - fallback if no screenshots loaded
  if (screenshotData.screenshots.length === 0 && (reportData.screenshot_desktop_url || reportData.screenshot_mobile_url)) {
    console.log(`📸 Loading screenshots from Supabase Storage URLs`);

    if (reportData.screenshot_desktop_url) {
      const dataUri = await fetchScreenshotAsDataUri(reportData.screenshot_desktop_url);
      if (dataUri) {
        screenshotData.screenshots.push({
          page: '/',
          device: 'desktop',
          dataUri
        });
      }
    }

    if (reportData.screenshot_mobile_url) {
      const dataUri = await fetchScreenshotAsDataUri(reportData.screenshot_mobile_url);
      if (dataUri) {
        screenshotData.screenshots.push({
          page: '/',
          device: 'mobile',
          dataUri
        });
      }
    }
  }

  // PRIORITY 3: Use screenshots_manifest with multiple pages - fallback if no screenshots loaded
  if (screenshotData.screenshots.length === 0 && reportData.screenshots_manifest && reportData.screenshots_manifest.pages) {
    console.log(`📸 Loading screenshots from manifest (${reportData.screenshots_manifest.total_screenshots} total)`);

    for (const [pageUrl, viewports] of Object.entries(reportData.screenshots_manifest.pages)) {
      // Load desktop screenshot
      if (viewports.desktop?.url) {
        const dataUri = await fetchScreenshotAsDataUri(viewports.desktop.url);
        if (dataUri) {
          screenshotData.screenshots.push({
            page: pageUrl,
            device: 'desktop',
            dataUri,
            metadata: viewports.desktop
          });
        }
      }

      // Load mobile screenshot
      if (viewports.mobile?.url) {
        const dataUri = await fetchScreenshotAsDataUri(viewports.mobile.url);
        if (dataUri) {
          screenshotData.screenshots.push({
            page: pageUrl,
            device: 'mobile',
            dataUri,
            metadata: viewports.mobile
          });
        }
      }
    }
  }

  // Load benchmark screenshots
  const benchmark = reportData.matched_benchmark;
  if (benchmark) {
    // PRIORITY: Try local file paths first (faster, no network calls)
    if (benchmark.screenshot_desktop_path || benchmark.screenshot_mobile_path) {
      console.log(`📸 Loading benchmark screenshots from local file paths`);

      if (benchmark.screenshot_desktop_path && existsSync(benchmark.screenshot_desktop_path)) {
        try {
          const buffer = await readFile(benchmark.screenshot_desktop_path);
          screenshotData.benchmarkScreenshots.push({
            page: '/',
            device: 'desktop',
            dataUri: `data:image/png;base64,${buffer.toString('base64')}`
          });
        } catch (err) {
          console.warn(`⚠️ Could not load benchmark desktop screenshot: ${err.message}`);
        }
      }

      if (benchmark.screenshot_mobile_path && existsSync(benchmark.screenshot_mobile_path)) {
        try {
          const buffer = await readFile(benchmark.screenshot_mobile_path);
          screenshotData.benchmarkScreenshots.push({
            page: '/',
            device: 'mobile',
            dataUri: `data:image/png;base64,${buffer.toString('base64')}`
          });
        } catch (err) {
          console.warn(`⚠️ Could not load benchmark mobile screenshot: ${err.message}`);
        }
      }
    }
    // PRIORITY 2: Try screenshot URLs (Supabase Storage)
    else if (benchmark.screenshot_desktop_url || benchmark.screenshot_mobile_url) {
      console.log(`📸 Loading benchmark screenshots from Supabase Storage URLs`);

      if (benchmark.screenshot_desktop_url) {
        const dataUri = await fetchScreenshotAsDataUri(benchmark.screenshot_desktop_url);
        if (dataUri) {
          screenshotData.benchmarkScreenshots.push({
            page: '/',
            device: 'desktop',
            dataUri
          });
        }
      }

      if (benchmark.screenshot_mobile_url) {
        const dataUri = await fetchScreenshotAsDataUri(benchmark.screenshot_mobile_url);
        if (dataUri) {
          screenshotData.benchmarkScreenshots.push({
            page: '/',
            device: 'mobile',
            dataUri
          });
        }
      }
    }
    // PRIORITY 3: Use benchmark screenshots manifest (legacy mode)
    else if (benchmark.screenshots_manifest && benchmark.screenshots_manifest.pages) {
      console.log(`📸 Loading benchmark screenshots from manifest - legacy mode`);

      for (const [pageUrl, viewports] of Object.entries(benchmark.screenshots_manifest.pages)) {
        if (viewports.desktop?.url) {
          const dataUri = await fetchScreenshotAsDataUri(viewports.desktop.url);
          if (dataUri) {
            screenshotData.benchmarkScreenshots.push({
              page: pageUrl,
              device: 'desktop',
              dataUri,
              metadata: viewports.desktop
            });
          }
        }

        if (viewports.mobile?.url) {
          const dataUri = await fetchScreenshotAsDataUri(viewports.mobile.url);
          if (dataUri) {
            screenshotData.benchmarkScreenshots.push({
              page: pageUrl,
              device: 'mobile',
              dataUri,
              metadata: viewports.mobile
            });
          }
        }
      }
    }
  }

  console.log(`📸 Loaded ${screenshotData.screenshots.length} target screenshots, ${screenshotData.benchmarkScreenshots.length} benchmark screenshots`);
  return screenshotData;
}

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
    project_id = null,
    lead_id = null,
    user_id = null  // Required for user data isolation
  } = options;

  try {
    console.log(`📝 Auto-generating ${format} report for ${analysisResult.company_name}...`);

    // Map database fields to report generator expected fields
    const reportData = {
      ...analysisResult,
      grade: analysisResult.grade || analysisResult.website_grade, // Handle both field names
      overall_score: analysisResult.overall_score || analysisResult.website_score
    };

    // DIAGNOSTIC: Log key fields to debug missing data
    console.log('[Report Debug] Data check:');
    console.log(`  - tech_stack: "${reportData.tech_stack}" (${typeof reportData.tech_stack})`);
    console.log(`  - has performance_metrics_pagespeed: ${!!reportData.performance_metrics_pagespeed}`);
    console.log(`  - has business_intelligence: ${!!reportData.business_intelligence}`);
    if (reportData.business_intelligence) {
      console.log(`    - business_intelligence keys: ${Object.keys(reportData.business_intelligence).join(', ')}`);
    }
    console.log(`  - has performance_api_errors: ${Array.isArray(reportData.performance_api_errors) && reportData.performance_api_errors.length > 0}`);
    if (reportData.performance_api_errors && reportData.performance_api_errors.length > 0) {
      console.log(`    - performance errors: ${JSON.stringify(reportData.performance_api_errors)}`);
    }

    // Validate analysis result has required fields
    validateAnalysisResult(reportData);

    // PHASE 1.5: BENCHMARK DATA HYDRATION
    // If lead has matched_benchmark_id but no matched_benchmark object, fetch it
    if (reportData.matched_benchmark_id && !reportData.matched_benchmark) {
      try {
        console.log(`🔍 Fetching benchmark data for ID: ${reportData.matched_benchmark_id}...`);
        const benchmark = await getBenchmarkById(reportData.matched_benchmark_id);

        if (benchmark) {
          // Transform benchmark data to expected format for report templates
          reportData.matched_benchmark = {
            id: benchmark.id,
            company_name: benchmark.company_name,
            industry: benchmark.industry,
            url: benchmark.url,
            match_score: benchmark.match_score || 85,
            match_reasoning: benchmark.match_reasoning || 'Industry leader with similar business model',
            comparison_tier: benchmark.comparison_tier || 'Industry Leader',

            // Scores object (required by templates)
            scores: {
              overall: benchmark.overall_score || benchmark.website_score || 0,
              design: benchmark.design_score || 0,
              seo: benchmark.seo_score || 0,
              performance: benchmark.performance_score || 0,
              content: benchmark.content_score || 0,
              accessibility: benchmark.accessibility_score || 0,
              social: benchmark.social_score || 0,
              grade: benchmark.overall_grade || benchmark.website_grade || benchmark.grade || 'N/A'
            },

            // Strengths (for "What they do well" section)
            design_strengths: benchmark.design_strengths || [],
            seo_strengths: benchmark.seo_strengths || [],
            performance_strengths: benchmark.performance_strengths || [],
            content_strengths: benchmark.content_strengths || [],
            accessibility_strengths: benchmark.accessibility_strengths || [],
            social_strengths: benchmark.social_strengths || [],

            // Screenshot paths
            screenshot_desktop_path: benchmark.desktop_screenshot || benchmark.desktop_screenshot_url,
            screenshot_mobile_path: benchmark.mobile_screenshot || benchmark.mobile_screenshot_url
          };

          console.log(`✅ Benchmark data loaded: ${benchmark.company_name}`);
        } else {
          console.warn(`⚠️  Benchmark ${reportData.matched_benchmark_id} not found in database`);
        }
      } catch (error) {
        console.error(`❌ Failed to fetch benchmark data: ${error.message}`);
        // Continue without benchmark data - report will skip benchmark sections
      }
    }

    // PHASE 2: AI SYNTHESIS (ALWAYS ENABLED by default, only disabled if explicitly set to 'false')
    let synthesisData = null;
    const useSynthesis = process.env.USE_AI_SYNTHESIS !== 'false';

    if (useSynthesis) {
      try {
        console.log(`🤖 Running AI synthesis for ${reportData.company_name}...`);
        const synthesisStartTime = Date.now();

        // Transform screenshots_manifest.pages object to array format expected by buildScreenshotReferences
        const pagesObject = reportData.screenshots_manifest?.pages || {};
        const crawlPages = Object.entries(pagesObject).map(([pageUrl, screenshots]) => {
          // Generate page title from URL
          let title = pageUrl === '/' ? 'Homepage' : pageUrl.substring(1).replace(/[-_]/g, ' ').replace(/\//g, ' - ');
          title = title.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

          return {
            url: pageUrl,
            fullUrl: reportData.url + (pageUrl === '/' ? '' : pageUrl),
            title: title,
            screenshot_paths: {
              desktop: screenshots.desktop?.path,
              mobile: screenshots.mobile?.path
            },
            analyzed_for: {
              'desktop-visual': !!screenshots.desktop,
              'mobile-visual': !!screenshots.mobile
            }
          };
        });

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
          crawlPages: crawlPages,
          topIssues: reportData.top_issues || []  // NEW: Pre-selected top issues from Analysis Engine
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
        // Enhanced error logging for diagnosis
        console.error('\n' + '!'.repeat(80));
        console.error('[SYNTHESIS ERROR] Full diagnostic information:');
        console.error('!'.repeat(80));
        console.error('Error Message:', synthesisError.message);
        console.error('Error Type:', synthesisError.constructor.name);
        console.error('Error Stack:');
        console.error(synthesisError.stack);
        console.error('!'.repeat(80) + '\n');

        console.warn(`⚠️  AI synthesis failed, using fallback: ${synthesisError.message}`);

        // Generate basic fallback summary instead of null
        synthesisData = generateFallbackSynthesis(reportData);
        console.log('✅ Using fallback synthesis (non-AI generated)');
      }
    } else {
      console.log('ℹ️  AI synthesis disabled (USE_AI_SYNTHESIS=false)');
      // Generate basic fallback summary even when synthesis is disabled
      synthesisData = generateFallbackSynthesis(reportData);
      console.log('✅ Using fallback synthesis (non-AI generated)');
    }

    // Generate the report (with or without synthesis data)
    const report = await generateReport(reportData, {
      format,
      sections,
      synthesisData,  // Pass synthesis results to report generator
      report_type: 'full'  // Always generate full report with all sections including screenshots
    });

    // Handle local backup based on format
    const reportsDir = join(__dirname, '..', '..', 'local-backups', 'report-engine', 'reports');
    await mkdir(reportsDir, { recursive: true });
    const localFilename = generateReportFilename(reportData, format);
    const localReportPath = join(reportsDir, localFilename);

    // If format is HTML, generate comprehensive report only
    let previewPath = null; // Kept for backward compatibility
    let fullPath = null;
    let fullPdfPath = null; // Track full PDF path for Supabase upload

    if (format === 'html') {
      console.log('📊 Generating comprehensive HTML report...');

      // Load screenshots as base64 dataURIs for embedding
      const screenshotData = await prepareScreenshotData(reportData);

      // Generate full (comprehensive) report
      const { generateHTMLReportV3Full } = await import('./exporters/html-exporter-v3.js');
      const fullContent = await generateHTMLReportV3Full(reportData, synthesisData, screenshotData);
      const fullFilename = `${reportData.company_name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-FULL.html`;
      fullPath = join(reportsDir, fullFilename);
      await writeFile(fullPath, fullContent, 'utf8');
      console.log(`📄 Full report saved: ${fullFilename}`);

      // Generate PDF version if enabled
      if (process.env.AUTO_GENERATE_PDF === 'true') {
        console.log('📄 Generating PDF from HTML...');

        try {
          const { generatePDFFromContent } = await import('./exporters/pdf-generator.js');

          // Generate full PDF only
          const fullPdfFilename = `${reportData.company_name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-FULL.pdf`;
          fullPdfPath = join(reportsDir, fullPdfFilename);
          const fullPdfResult = await generatePDFFromContent(fullContent, fullPdfPath, {
            companyName: reportData.company_name,
            reportType: 'full'
          });

          if (fullPdfResult.success) {
            console.log(`   ✅ Full PDF saved: ${fullPdfFilename}`);
          } else {
            console.warn(`   ⚠️  Full PDF generation failed: ${fullPdfResult.error || 'Unknown error'}`);
            fullPdfPath = null; // Clear path if generation failed
          }
        } catch (pdfError) {
          console.warn(`   ⚠️  PDF generation error: ${pdfError.message}`);
          console.warn('   Continuing without PDF...');
          fullPdfPath = null;
        }
      }
    }

    // For HTML format, we've already generated Full HTML+PDF report above
    // Now we'll upload the PDF to Supabase Storage
    let localPath = null;
    let contentForUpload = null;
    let uploadResult = { path: null, fullPath: null };

    // Upload FULL PDF to Supabase Storage (if generated) - REQUIRED, not optional
    if (format === 'html' && fullPdfPath) {
      console.log('📤 Uploading FULL PDF to Supabase Storage...');
      const { readFile: fsReadFile } = await import('fs/promises');
      const pdfBuffer = await fsReadFile(fullPdfPath);

      const storagePath = `${reportData.company_name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/FULL.pdf`;

      try {
        uploadResult = await uploadReport(pdfBuffer, storagePath, 'application/pdf');
        console.log(`✅ PDF uploaded to Supabase Storage: ${storagePath}`);
      } catch (uploadError) {
        console.error(`❌ CRITICAL: Supabase upload failed: ${uploadError.message}`);
        console.error(`   Stack: ${uploadError.stack}`);
        console.error(`   Local file: ${fullPdfPath}`);
        throw new Error(`Failed to upload PDF to Supabase Storage: ${uploadError.message}. Report generation aborted.`);
      }
    }
    // Only handle non-HTML formats (markdown, json, etc.)
    else if (format !== 'html') {
      localPath = localReportPath;
      contentForUpload = report.content;

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
        // For text-based formats (markdown, json), save content to file
        await writeFile(localReportPath, report.content, 'utf8');
        console.log(`📄 Local report backup saved: ${localReportPath}`);
      } else {
        throw new Error(`Report generation failed: No content or path returned for format ${format}`);
      }
    }

    const shouldUpload = format !== 'html' && contentForUpload;

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
        console.log(`✅ Report uploaded to Supabase Storage: ${storagePath}`);
      } catch (uploadError) {
        console.error(`❌ CRITICAL: Supabase upload failed: ${uploadError.message}`);
        console.error(`   Stack: ${uploadError.stack}`);
        console.error(`   Local file: ${localPath}`);
        throw new Error(`Failed to upload report to Supabase Storage: ${uploadError.message}. Report generation aborted.`);
      }
    }

    // Save metadata to database if requested
    let reportRecord = null;
    if (saveToDatabase) {
      // Calculate file size based on what we're uploading (for HTML, size doesn't matter as we have separate files)
      const fileSize = contentForUpload
        ? (Buffer.isBuffer(contentForUpload) ? contentForUpload.length : Buffer.byteLength(contentForUpload, 'utf8'))
        : 0;

      // Calculate synthesis metrics
      const totalSynthesisCost = synthesisData?.stageMetadata ?
        Object.values(synthesisData.stageMetadata).reduce((sum, stage) => sum + (stage.estimated_cost || 0), 0) : 0;
      const totalSynthesisTokens = synthesisData?.stageMetadata ?
        Object.values(synthesisData.stageMetadata).reduce((sum, stage) => sum + (stage.total_tokens || 0), 0) : 0;
      const totalSynthesisDuration = synthesisData?.stageMetadata ?
        Object.values(synthesisData.stageMetadata).reduce((sum, stage) => sum + (stage.duration_ms || 0), 0) : 0;

      // Calculate original issues count
      const originalIssuesCount = (
        (reportData.design_issues_desktop?.length || 0) +
        (reportData.design_issues_mobile?.length || 0) +
        (reportData.seo_issues?.length || 0) +
        (reportData.content_issues?.length || 0) +
        (reportData.social_issues?.length || 0) +
        (reportData.accessibility_issues?.length || 0)
      );

      const consolidatedIssuesCount = synthesisData?.consolidatedIssues?.length || originalIssuesCount;
      const issueReductionPercentage = originalIssuesCount > 0 ?
        Math.round(((originalIssuesCount - consolidatedIssuesCount) / originalIssuesCount) * 100) : 0;

      const metadata = {
        lead_id: lead_id || analysisResult.id, // Use options.lead_id if provided, fallback to analysisResult.id
        project_id: project_id || analysisResult.project_id,
        user_id: user_id || analysisResult.user_id, // Required for user data isolation
        report_type: 'website_audit',
        format,
        storage_path: uploadResult?.path || null, // MUST be from Supabase Storage, never local path
        storage_bucket: 'reports',
        file_size_bytes: fileSize,
        company_name: reportData.company_name,
        website_url: reportData.url,
        overall_score: Math.round(reportData.overall_score),
        website_grade: reportData.grade,

        // Synthesis metrics (new columns)
        synthesis_used: useSynthesis && synthesisData !== null,
        synthesis_cost: totalSynthesisCost > 0 ? totalSynthesisCost : null,
        synthesis_tokens: totalSynthesisTokens > 0 ? totalSynthesisTokens : null,
        synthesis_duration_ms: totalSynthesisDuration > 0 ? totalSynthesisDuration : null,
        synthesis_errors: synthesisData?.errors?.length || 0,
        consolidated_issues_count: consolidatedIssuesCount,
        original_issues_count: originalIssuesCount,
        issue_reduction_percentage: issueReductionPercentage,

        // Report generation metadata (new columns)
        report_version: process.env.REPORT_VERSION || 'v3',
        report_subtype: format === 'html' ? (sections.includes('all') ? 'full' : 'preview') : null,
        sections_included: sections.includes('all') ? null : sections,
        generation_time_ms: report.metadata.generation_time_ms,
        word_count: report.metadata.word_count || 0,

        // Synthesis data (new JSONB column)
        synthesis_data: (useSynthesis && synthesisData !== null) ? {
          consolidatedIssues: synthesisData.consolidatedIssues || [],
          mergeLog: synthesisData.mergeLog || [],
          consolidationStatistics: synthesisData.consolidationStatistics || null,
          executiveSummary: synthesisData.executiveSummary || null,
          executiveMetadata: synthesisData.executiveMetadata || null,
          screenshotReferences: synthesisData.screenshotReferences || [],
          stageMetadata: synthesisData.stageMetadata || {},
          errors: synthesisData.errors || []
        } : null,

        // Legacy config (for backward compatibility)
        config: {
          sections: sections.includes('all') ? 'all' : sections.join(','),
          generation_time_ms: report.metadata.generation_time_ms,
          word_count: report.metadata.word_count || 0
        },

        status: 'completed',
        generated_at: new Date().toISOString()
      };

      // Validate that we have a valid Supabase Storage path before saving to database
      if (!metadata.storage_path) {
        throw new Error('Cannot save report to database: Supabase Storage path is missing. This should never happen if upload was successful.');
      }

      try {
        reportRecord = await saveReportMetadata(metadata);
        console.log(`✅ Report saved: ${reportRecord.id}`);
      } catch (dbError) {
        console.error('❌ Failed to save report metadata to database:', dbError.message);
        console.error('Metadata that failed:', JSON.stringify(metadata, null, 2));
        // Don't throw - let the function continue and return what it can
      }
    }

    // Calculate file size for return value (handle null for HTML reports that skip upload)
    const fileSize = contentForUpload
      ? (Buffer.isBuffer(contentForUpload)
          ? contentForUpload.length
          : Buffer.byteLength(contentForUpload, 'utf8'))
      : 0;

    // Debug logging
    console.log('🔍 DEBUG: reportRecord =', reportRecord ? `{id: ${reportRecord.id}}` : 'null');
    console.log('🔍 DEBUG: Returning report_id =', reportRecord?.id || 'undefined');

    return {
      success: true,
      report_id: reportRecord?.id,
      storage_path: uploadResult?.path || null,
      full_path: uploadResult?.fullPath || null,
      local_path: localPath,
      preview_path: previewPath, // Preview report path (HTML only)
      full_report_path: fullPath, // Full report path (HTML only)
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
 * Generate fallback synthesis when AI synthesis fails
 * Provides basic executive summary without AI processing
 */
function generateFallbackSynthesis(reportData) {
  const {
    company_name,
    grade,
    overall_score,
    design_issues_desktop = [],
    design_issues_mobile = [],
    seo_issues = [],
    content_issues = [],
    social_issues = [],
    accessibility_issues = []
  } = reportData;

  // Combine all issues
  const allIssues = [
    ...design_issues_desktop,
    ...design_issues_mobile,
    ...seo_issues,
    ...content_issues,
    ...social_issues,
    ...accessibility_issues
  ];

  // Sort by priority (critical > high > medium > low)
  const priorityRank = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
  const sortedIssues = allIssues.sort((a, b) => {
    const aPriority = priorityRank[a.priority || a.severity] || 0;
    const bPriority = priorityRank[b.priority || b.severity] || 0;
    return bPriority - aPriority;
  });

  // Get top 3 issues for critical findings
  const topIssues = sortedIssues.slice(0, 3);

  // Generate basic executive summary
  const gradeText = {
    'A': 'excellent',
    'B': 'good',
    'C': 'average',
    'D': 'below average',
    'F': 'poor'
  }[grade] || 'average';

  return {
    executiveSummary: {
      headline: `${company_name} achieves a ${grade}-grade (${overall_score}/100) - ${gradeText} overall performance`,
      overview: `Our analysis identified ${allIssues.length} areas for improvement across design, SEO, content, and accessibility. With focused improvements, this website can significantly enhance user experience and conversion rates.`,
      criticalFindings: topIssues.map((issue, index) => ({
        rank: index + 1,
        issue: issue.title || 'Website improvement needed',
        impact: issue.impact || 'Affects user experience and conversion rates',
        evidence: [],
        recommendation: issue.fix || issue.recommendation || 'Address this issue to improve site performance',
        estimatedValue: null
      })),
      strategicRoadmap: {
        month1: {
          title: 'Quick Wins & Foundation',
          description: 'Implement high-impact improvements with minimal effort',
          priorities: topIssues.slice(0, 2).map(i => i.title || 'Priority improvement'),
          estimatedCost: '$500-$1,500',
          expectedROI: '2-3x return'
        },
        month2: {
          title: 'Core Improvements',
          description: 'Address fundamental design and technical issues',
          priorities: ['Improve mobile responsiveness', 'Enhance SEO optimization', 'Optimize page speed'],
          estimatedCost: '$2,000-$4,000',
          expectedROI: '3-4x return'
        },
        month3: {
          title: 'Advanced Optimization',
          description: 'Fine-tune and scale improvements',
          priorities: ['A/B testing implementation', 'Content strategy refinement', 'Conversion optimization'],
          estimatedCost: '$3,000-$5,000',
          expectedROI: '4-5x return'
        }
      },
      roiStatement: 'Based on typical improvements, expect 3-5x return on investment within 6 months through increased conversions and improved user engagement.',
      callToAction: 'Ready to transform your website? Let\'s discuss implementing these improvements.'
    },
    consolidatedIssues: allIssues, // Use original issues as-is (no deduplication)
    errors: []
  };
}

