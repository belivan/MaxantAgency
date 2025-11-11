/**
 * Report Queue Endpoints
 *
 * New async queue-based endpoints for report generation using the universal work queue.
 * These endpoints provide a cleaner async API alongside the existing synchronous /api/generate.
 */

import { createClient } from '@supabase/supabase-js';
import { autoGenerateReport } from '../reports/auto-report-generator.js';
import { enqueueWork, cancelWork, getJob, getQueueStatus } from '../../database-tools/shared/work-queue.js';

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * POST /api/generate-queue
 * Queue report generation (async with job ID)
 *
 * Body:
 * {
 *   lead_id: 'uuid' (optional - fetches from database),
 *   analysisResult: { ...full analysis data... } (optional - if not using lead_id),
 *   options: {
 *     format: 'html' | 'markdown' | 'pdf',
 *     sections: ['all'] | ['executive', 'technical', ...],
 *     saveToDatabase: true,
 *     project_id: 'uuid',
 *     lead_id: 'uuid' (optional - for existing leads)
 *   }
 * }
 */
export async function queueReportGeneration(req, res) {
  try {
    const { lead_id, analysisResult: providedAnalysisResult, options = {} } = req.body;

    // Validate input - need either lead_id OR analysisResult
    if (!lead_id && !providedAnalysisResult) {
      return res.status(400).json({
        success: false,
        error: 'Either lead_id or analysisResult is required'
      });
    }

    let analysisResult = providedAnalysisResult;
    let leadData = null;

    // If lead_id is provided, fetch from database
    if (lead_id) {
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

      leadData = lead;

      // Fetch benchmark data if matched_benchmark_id exists
      let matchedBenchmark = null;
      if (lead.matched_benchmark_id) {
        const { data: benchmark, error: benchmarkError } = await supabase
          .from('benchmarks')
          .select('*')
          .eq('id', lead.matched_benchmark_id)
          .single();

        if (!benchmarkError && benchmark) {
          const matchScore = benchmark.match_score || lead.benchmark_match_score || 85;
          const matchReasoning = benchmark.match_reasoning || lead.benchmark_match_reasoning || null;

          const tierMapping = {
            'local': 'Local Leader',
            'regional': 'Regional Leader',
            'national': 'National Leader',
            'enterprise': 'Enterprise Leader'
          };
          const comparisonTier = tierMapping[benchmark.benchmark_tier] || 'Industry Leader';

          matchedBenchmark = {
            id: benchmark.id,
            company_name: benchmark.company_name,
            website_url: benchmark.website_url,
            industry: benchmark.industry,
            benchmark_tier: benchmark.benchmark_tier,
            match_score: matchScore,
            match_reasoning: matchReasoning,
            comparison_tier: comparisonTier,
            desktop_screenshot_url: benchmark.desktop_screenshot_url,
            mobile_screenshot_url: benchmark.mobile_screenshot_url,
            screenshot_desktop_url: benchmark.desktop_screenshot_url,
            screenshot_mobile_url: benchmark.mobile_screenshot_url,
            screenshots_manifest: benchmark.screenshots_manifest,
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
            design_strengths: benchmark.design_strengths || benchmark.analysis_results?.design_strengths,
            seo_strengths: benchmark.seo_strengths || benchmark.analysis_results?.seo_strengths,
            content_strengths: benchmark.content_strengths || benchmark.analysis_results?.content_strengths,
            social_strengths: benchmark.social_strengths || benchmark.analysis_results?.social_strengths,
            accessibility_strengths: benchmark.accessibility_strengths || benchmark.analysis_results?.accessibility_strengths,
            visual_strengths: benchmark.visual_strengths || benchmark.analysis_results?.visual_strengths,
            technical_strengths: benchmark.technical_strengths || benchmark.analysis_results?.technical_strengths,
            ...benchmark.analysis_results,
            analysis_results: benchmark.analysis_results
          };
        }
      }

      // Extract analysis data from lead (comprehensive field mapping)
      analysisResult = {
        company_name: lead.company_name,
        url: lead.url,
        industry: lead.industry,
        overall_score: lead.overall_score || lead.website_score,
        grade: lead.website_grade,
        design_score: lead.design_score,
        seo_score: lead.seo_score,
        performance_score: lead.performance_score,
        content_score: lead.content_score,
        accessibility_score: lead.accessibility_score,
        social_score: lead.social_score,
        design_issues: lead.design_issues || [],
        seo_issues: lead.seo_issues || [],
        content_issues: lead.content_issues || [],
        accessibility_issues: lead.accessibility_issues || [],
        social_issues: lead.social_issues || [],
        quick_wins: lead.quick_wins || [],
        top_issue: lead.top_issue,
        one_liner: lead.one_liner,
        top_issues: lead.top_issues || [],
        top_issues_summary: lead.top_issues_summary,
        top_issues_selection_strategy: lead.top_issues_selection_strategy,
        top_issues_selection_cost: lead.top_issues_selection_cost,
        top_issues_selection_model: lead.top_issues_selection_model,
        total_issues_count: lead.total_issues_count,
        high_critical_issues_count: lead.high_critical_issues_count,
        screenshot_desktop: lead.screenshot_desktop,
        screenshot_mobile: lead.screenshot_mobile,
        screenshot_desktop_path: lead.screenshot_desktop_path || lead.screenshot_desktop_url,
        screenshot_mobile_path: lead.screenshot_mobile_path || lead.screenshot_mobile_url,
        screenshot_desktop_url: lead.screenshot_desktop_url,
        screenshot_mobile_url: lead.screenshot_mobile_url,
        screenshots_manifest: lead.screenshots_manifest,
        design_analysis: lead.design_analysis,
        seo_analysis: lead.seo_analysis,
        content_analysis: lead.content_analysis,
        accessibility_analysis: lead.accessibility_analysis,
        social_analysis: lead.social_analysis,
        social_profiles: lead.social_profiles,
        social_platforms_present: lead.social_platforms_present,
        social_metadata: lead.social_metadata,
        business_intelligence: lead.business_intelligence,
        tech_stack: lead.tech_stack,
        has_https: lead.has_https,
        is_mobile_friendly: lead.is_mobile_friendly,
        page_load_time: lead.page_load_time,
        performance_metrics_pagespeed: lead.performance_metrics_pagespeed,
        performance_metrics_crux: lead.performance_metrics_crux,
        performance_score_mobile: lead.performance_score_mobile,
        performance_score_desktop: lead.performance_score_desktop,
        design_tokens_desktop: lead.design_tokens_desktop,
        design_tokens_mobile: lead.design_tokens_mobile,
        contact_email: lead.contact_email,
        contact_phone: lead.contact_phone,
        contact_name: lead.contact_name,
        city: lead.city,
        state: lead.state,
        weights: lead.weights,
        weight_reasoning: lead.weight_reasoning,
        design_score_desktop: lead.design_score_desktop,
        design_score_mobile: lead.design_score_mobile,
        design_issues_desktop: lead.design_issues_desktop || [],
        design_issues_mobile: lead.design_issues_mobile || [],
        desktop_critical_issues: lead.desktop_critical_issues || 0,
        mobile_critical_issues: lead.mobile_critical_issues || 0,
        accessibility_compliance: lead.accessibility_compliance || {},
        accessibility_wcag_level: lead.accessibility_wcag_level || 'AA',
        performance_issues: lead.performance_issues || [],
        performance_api_errors: lead.performance_api_errors || [],
        lead_priority: lead.lead_priority,
        lead_priority_reasoning: lead.lead_priority_reasoning,
        priority_tier: lead.priority_tier,
        budget_likelihood: lead.budget_likelihood,
        fit_score: lead.fit_score,
        quality_gap_score: lead.quality_gap_score,
        budget_score: lead.budget_score,
        urgency_score: lead.urgency_score,
        industry_fit_score: lead.industry_fit_score,
        company_size_score: lead.company_size_score,
        engagement_score: lead.engagement_score,
        ai_page_selection: lead.ai_page_selection,
        analysis_cost: lead.analysis_cost,
        analysis_time: lead.analysis_time,
        discovery_log: lead.discovery_log,
        has_blog: lead.has_blog || false,
        content_insights: lead.content_insights || {},
        page_title: lead.page_title,
        meta_description: lead.meta_description,
        seo_analysis_model: lead.seo_analysis_model,
        content_analysis_model: lead.content_analysis_model,
        desktop_visual_model: lead.desktop_visual_model,
        mobile_visual_model: lead.mobile_visual_model,
        social_analysis_model: lead.social_analysis_model,
        accessibility_analysis_model: lead.accessibility_analysis_model,
        pages_discovered: lead.pages_discovered,
        pages_crawled: lead.pages_crawled,
        pages_analyzed: lead.pages_analyzed,
        crawl_metadata: lead.crawl_metadata,
        analyzed_at: lead.analyzed_at,
        analysis_time_ms: lead.analysis_time_ms,
        matched_benchmark: matchedBenchmark
      };
    }

    // Validate analysisResult
    if (!analysisResult.company_name || !analysisResult.url) {
      return res.status(400).json({
        success: false,
        error: 'analysisResult must include company_name and url'
      });
    }

    console.log(`[Report Queue] Queuing report generation for: ${analysisResult.company_name}`);

    // Queue the report generation job (priority 1 = single report, high priority)
    const jobId = await enqueueWork('report', {
      analysisResult,
      options: {
        format: options.format || 'html',
        sections: options.sections || ['all'],
        saveToDatabase: options.saveToDatabase !== false,
        project_id: options.project_id || leadData?.project_id || null,
        lead_id: options.lead_id || lead_id || leadData?.id || null
      }
    }, 1, async (data) => {
      // Execute report generation
      return await executeReportGeneration(data);
    });

    console.log(`[Report Queue] Queued report generation job: ${jobId}`);

    // Return immediately with job ID
    res.json({
      success: true,
      job_id: jobId,
      message: `Queued report generation for ${analysisResult.company_name}`,
      company_name: analysisResult.company_name,
      website_url: analysisResult.url,
      format: options.format || 'html'
    });

  } catch (error) {
    console.error('[Report Queue] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}

/**
 * GET /api/report-status
 * Get status of queued/running/completed report generation jobs
 *
 * Query params:
 * - job_ids: Comma-separated job IDs (required)
 */
export async function getReportStatus(req, res) {
  try {
    const { job_ids } = req.query;

    if (!job_ids) {
      return res.status(400).json({
        success: false,
        error: 'job_ids query parameter is required (comma-separated)'
      });
    }

    const jobIdArray = job_ids.split(',').map(id => id.trim());
    const statuses = [];

    for (const jobId of jobIdArray) {
      const job = getJob(jobId);

      if (!job) {
        statuses.push({
          job_id: jobId,
          state: 'not_found',
          error: 'Job not found'
        });
        continue;
      }

      statuses.push({
        job_id: jobId,
        state: job.state,
        type: job.type,
        priority: job.priority,
        created_at: job.createdAt,
        started_at: job.startedAt,
        completed_at: job.completedAt,
        error: job.error,
        result: job.result // Full report result when completed
      });
    }

    // Calculate summary
    const summary = {
      total: statuses.length,
      queued: statuses.filter(s => s.state === 'queued').length,
      running: statuses.filter(s => s.state === 'running').length,
      completed: statuses.filter(s => s.state === 'completed').length,
      failed: statuses.filter(s => s.state === 'failed').length,
      cancelled: statuses.filter(s => s.state === 'cancelled').length,
      not_found: statuses.filter(s => s.state === 'not_found').length
    };

    res.json({
      success: true,
      jobs: statuses,
      summary
    });

  } catch (error) {
    console.error('[Report Status] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}

/**
 * POST /api/cancel-report
 * Cancel queued report generation jobs
 *
 * Body:
 * {
 *   "job_ids": ["uuid1", "uuid2", ...]
 * }
 */
export async function cancelReport(req, res) {
  try {
    const { job_ids } = req.body;

    if (!job_ids || !Array.isArray(job_ids)) {
      return res.status(400).json({
        success: false,
        error: 'job_ids array is required'
      });
    }

    const results = [];

    for (const jobId of job_ids) {
      const cancelled = await cancelWork(jobId);
      results.push({
        job_id: jobId,
        cancelled
      });
    }

    const cancelledCount = results.filter(r => r.cancelled).length;

    console.log(`[Report Queue] Cancelled ${cancelledCount}/${job_ids.length} jobs`);

    res.json({
      success: true,
      cancelled: cancelledCount,
      total: job_ids.length,
      results
    });

  } catch (error) {
    console.error('[Cancel Report] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}

/**
 * GET /api/queue-status
 * Get overall queue status for all work types
 */
export async function getOverallQueueStatus(req, res) {
  try {
    const status = await getQueueStatus();

    res.json({
      success: true,
      ...status
    });

  } catch (error) {
    console.error('[Queue Status] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}

/**
 * Execute report generation (called by work queue)
 *
 * CRITICAL: This function MUST always return a result (success or failure).
 * It should never throw errors or hang indefinitely.
 */
async function executeReportGeneration(data) {
  const startTime = Date.now();

  try {
    console.log(`[Report Executor] Generating report for ${data.analysisResult.company_name}...`);

    // Generate report using auto-report-generator
    const reportResult = await autoGenerateReport(data.analysisResult, data.options);

    const duration = Date.now() - startTime;
    console.log(`[Report Executor] Completed report generation in ${duration}ms (Report ID: ${reportResult.report_id || 'N/A'})`);

    return {
      success: true,
      report_id: reportResult.report_id,
      storage_path: reportResult.storage_path,
      storage_bucket: reportResult.storage_bucket || 'reports',
      local_path: reportResult.local_path,
      preview_path: reportResult.preview_path,
      full_report_path: reportResult.full_report_path,
      download_url: reportResult.download_url || null,
      format: data.options.format || 'html',
      company_name: data.analysisResult.company_name,
      website_url: data.analysisResult.url,
      file_size_bytes: reportResult.file_size_bytes || 0,
      metadata: reportResult.metadata || null,
      synthesis: reportResult.synthesis || null,
      duration_ms: duration
    };

  } catch (error) {
    // Catch-all for any unexpected errors
    const duration = Date.now() - startTime;
    console.error(`[Report Executor] Unexpected error for ${data.analysisResult.company_name}:`, error);
    console.error(`[Report Executor] Stack trace:`, error.stack);

    return {
      success: false,
      error: `Unexpected error: ${error.message}`,
      company_name: data.analysisResult.company_name,
      website_url: data.analysisResult.url,
      duration_ms: duration
    };
  }
}
