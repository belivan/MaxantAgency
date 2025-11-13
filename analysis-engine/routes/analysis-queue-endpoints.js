/**
 * Analysis Queue Endpoints
 *
 * New async queue-based endpoints for analysis using the universal work queue.
 * These endpoints replace the old SSE-based /api/analyze with a cleaner async API.
 */

import { createClient } from '@supabase/supabase-js';
import { analyzeWebsiteIntelligent } from '../orchestrator-refactored.js';
import { enqueueWork, cancelWork, getJob, getQueueStatus } from '../../database-tools/shared/work-queue.js';
import { saveLocalBackup, markAsUploaded, markAsFailed } from '../utils/local-backup.js';
import { incrementAnalysisCount } from '../optimization/services/optimization-scheduler.js';
import { withTimeout } from '../utils/promise-timeout.js';
import { getProspectById } from '../database/supabase-client.js';

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * POST /api/analyze
 * Queue prospects for analysis (async with job IDs)
 */
export async function analyzeProspects(req, res) {
  try {
    const { prospect_ids, prospects: providedProspects, project_id, custom_prompts } = req.body;

    if (!project_id) {
      return res.status(400).json({ error: 'project_id is required - every lead must belong to a project' });
    }

    // Accept either prospect_ids OR prospects array directly
    let prospects;
    let missingIds = [];

    if (providedProspects && providedProspects.length > 0) {
      // Mode 1: Direct prospect data (no database needed)
      console.log(`[Analysis Queue] Using ${providedProspects.length} provided prospects (no database fetch)`);
      prospects = providedProspects;
    } else if (prospect_ids && prospect_ids.length > 0) {
      // Mode 2: Fetch by IDs from database
      console.log(`[Analysis Queue] Fetching ${prospect_ids.length} prospects from database...`);

      const { data: fetchedProspects, error: fetchError} = await supabase
        .from('prospects')
        .select('id, company_name, website, industry, city, state, address, contact_email, contact_phone, contact_name, description, services, social_profiles, social_metadata, icp_match_score, google_rating, google_review_count, most_recent_review_date, website_status, crawl_error_details')
        .in('id', prospect_ids)
        .not('website', 'is', null)
        .not('website_status', 'in', '(bot_protected,timeout,ssl_error,not_found)'); // Skip uncrawlable prospects

      if (fetchError) {
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch prospects',
          details: fetchError.message
        });
      }

      // Track missing IDs
      const foundIds = new Set((fetchedProspects || []).map(p => p.id));
      missingIds = prospect_ids.filter(id => !foundIds.has(id));

      if (missingIds.length > 0) {
        console.warn(`[Analysis Queue] ${missingIds.length} prospect(s) not found in database:`, missingIds);
      }

      if (!fetchedProspects || fetchedProspects.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No prospects found',
          details: `None of the ${prospect_ids.length} requested prospect(s) were found in the database`,
          missing_prospect_ids: missingIds
        });
      }

      // Look up project assignments
      const { data: assignments, error: assignmentError } = await supabase
        .from('project_prospects')
        .select('prospect_id, project_id, status, notes, custom_score, discovery_query, discovery_time_ms, discovery_cost_usd, run_id')
        .in('prospect_id', prospect_ids)
        .eq('project_id', project_id);

      if (assignmentError) {
        return res.status(500).json({
          success: false,
          error: 'Failed to verify prospect project assignments',
          details: assignmentError.message
        });
      }

      const assignmentByProspect = new Map((assignments || []).map(row => [row.prospect_id, row]));
      const assignedProspects = new Set(assignmentByProspect.keys());

      // Ensure every prospect is assigned to the requested project
      const unassignedProspects = fetchedProspects.filter(p => !assignedProspects.has(p.id));
      if (unassignedProspects.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Cannot analyze prospects from different projects. All prospects must belong to project: ${project_id}`,
          details: `${unassignedProspects.length} prospect(s) missing project assignment for this project`
        });
      }

      // Attach verified project assignment
      prospects = fetchedProspects.map(p => ({
        ...p,
        project_assignment: assignmentByProspect.get(p.id)
      }));
    } else {
      return res.status(400).json({
        success: false,
        error: 'Either prospect_ids or prospects array is required'
      });
    }

    console.log(`[Analysis Queue] Queuing ${prospects.length} prospects for analysis...`);

    // Queue all prospects for analysis
    const jobIds = [];
    const batchSize = prospects.length; // For priority calculation

    for (const prospect of prospects) {
      const assignment = prospect.project_assignment || {};

      const jobId = await enqueueWork('analysis', {
        // Analysis data
        url: prospect.website,
        company_name: prospect.company_name || 'Unknown Company',
        industry: prospect.industry || 'unknown',
        project_id: project_id,
        prospect_id: prospect.id || null,
        city: prospect.city || null,
        state: prospect.state || null,
        address: prospect.address || null,
        contact_email: prospect.contact_email || null,
        contact_phone: prospect.contact_phone || null,
        contact_name: prospect.contact_name || null,
        project_notes: assignment.notes || null,
        project_status: assignment.status || null,
        custom_score: assignment.custom_score || null,
        discovery_query: assignment.discovery_query || null,
        description: prospect.description || null,
        services: prospect.services || null,
        google_rating: prospect.google_rating || null,
        google_review_count: prospect.google_review_count || null,
        icp_match_score: prospect.icp_match_score || null,
        most_recent_review_date: prospect.most_recent_review_date || null,
        website_status: prospect.website_status || null,
        social_profiles_from_prospect: prospect.social_profiles || null,
        social_metadata_from_prospect: prospect.social_metadata_from_prospect || null,
        custom_prompts: custom_prompts || undefined
      }, batchSize, async (data) => {
        // Execute analysis
        return await executeAnalysis(data);
      });

      jobIds.push(jobId);
    }

    console.log(`[Analysis Queue] Queued ${jobIds.length} analysis jobs`);

    // Return immediately with job IDs
    res.json({
      success: true,
      job_ids: jobIds,
      total: jobIds.length,
      missing_prospect_ids: missingIds,
      message: `Queued ${jobIds.length} analyses${missingIds.length > 0 ? ` (${missingIds.length} skipped)` : ''}`
    });

  } catch (error) {
    console.error('[Analysis Queue] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}

/**
 * GET /api/analysis-status
 * Get status of queued/running/completed analyses
 *
 * Query params:
 * - job_ids: Comma-separated job IDs (required)
 */
export async function getAnalysisStatus(req, res) {
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
        result: job.result // Full analysis result when completed
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
    console.error('[Analysis Status] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}

/**
 * POST /api/cancel-analysis
 * Cancel queued analyses
 *
 * Body:
 * {
 *   "job_ids": ["uuid1", "uuid2", ...]
 * }
 */
export async function cancelAnalysis(req, res) {
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

    console.log(`[Analysis Queue] Cancelled ${cancelledCount}/${job_ids.length} jobs`);

    res.json({
      success: true,
      cancelled: cancelledCount,
      total: job_ids.length,
      results
    });

  } catch (error) {
    console.error('[Cancel Analysis] Error:', error);
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
 * Execute analysis (called by work queue)
 *
 * CRITICAL: This function MUST always return a result (success or failure).
 * It should never throw errors or hang indefinitely.
 */
async function executeAnalysis(data) {
  const startTime = Date.now();
  const ANALYSIS_TIMEOUT = 5 * 60 * 1000; // 5 minutes max per analysis

  try {
    console.log(`[Analysis Executor] Analyzing ${data.company_name}...`);

    // Run analysis with timeout protection
    let result;
    try {
      result = await withTimeout(
        analyzeWebsiteIntelligent(data.url, data, {
          customPrompts: data.custom_prompts
        }),
        ANALYSIS_TIMEOUT,
        `Analysis timed out for ${data.company_name}`
      );
    } catch (timeoutError) {
      console.error(`[Analysis Executor] Timeout for ${data.company_name}:`, timeoutError.message);
      return {
        success: false,
        prospect_id: data.prospect_id,
        url: data.url,
        company_name: data.company_name,
        error: timeoutError.message,
        duration_ms: Date.now() - startTime
      };
    }

    if (result.success) {
      // Fetch business intelligence from prospect if available
      let businessIntelligence = null;
      if (data.prospect_id) {
        try {
          console.log(`[Analysis Executor] Fetching business intelligence from prospect ${data.prospect_id}...`);
          const prospect = await getProspectById(data.prospect_id);
          businessIntelligence = prospect?.business_intelligence || null;

          if (businessIntelligence) {
            console.log(`[Analysis Executor] Business intelligence found for ${data.company_name}`);
          } else {
            console.log(`[Analysis Executor] No business intelligence found for ${data.company_name}`);
          }
        } catch (biError) {
          console.warn(`[Analysis Executor] Failed to fetch business intelligence for ${data.company_name}:`, biError.message);
          // Continue without BI data - not a critical failure
        }
      }

      // Prepare lead data for database
      const leadData = {
        // Core information
        url: result.url,
        company_name: result.company_name,
        industry: result.industry,
        project_id: data.project_id,
        prospect_id: data.prospect_id,
        city: result.city || data.city || null,
        state: result.state || data.state || null,

        // Grading & Scores
        overall_score: Math.round(result.overall_score),
        website_grade: result.grade,
        design_score: Math.round(result.design_score),
        design_score_desktop: Math.round(result.design_score_desktop || result.design_score),
        design_score_mobile: Math.round(result.design_score_mobile || result.design_score),
        seo_score: Math.round(result.seo_score),
        content_score: Math.round(result.content_score),
        social_score: Math.round(result.social_score),
        accessibility_score: Math.round(result.accessibility_score || 50),

        // Issues & Recommendations
        design_issues: result.design_issues || [],
        seo_issues: result.seo_issues || [],
        content_issues: result.content_issues || [],
        social_issues: result.social_issues || [],
        accessibility_issues: result.accessibility_issues || [],
        quick_wins: result.quick_wins || [],
        top_issues: result.top_issues || [],
        top_issue: result.top_issue || null,
        one_liner: result.one_liner || null,

        // Screenshots
        desktop_screenshot: result.desktop_screenshot_url || null,
        mobile_screenshot: result.mobile_screenshot_url || null,

        // Business Intelligence (from Prospecting Engine)
        business_intelligence: businessIntelligence,

        // Metadata
        analysis_cost: result.analysis_cost || 0,
        analysis_timestamp: new Date().toISOString(),
        status: 'ready_for_outreach'
      };

      // Save local backup (non-blocking, don't fail on backup errors)
      let backupPath = null;
      try {
        backupPath = await withTimeout(
          saveLocalBackup(leadData),
          30000, // 30 second timeout for backup
          'Local backup timed out'
        );
      } catch (backupError) {
        console.warn(`[Analysis Executor] Backup failed for ${data.company_name} (non-critical):`, backupError.message);
        // Continue anyway - backup failure shouldn't kill the analysis
      }

      // Save to database
      const { data: savedLead, error: saveError } = await supabase
        .from('leads')
        .upsert(leadData, {
          onConflict: 'url,project_id',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (saveError) {
        console.error(`[Analysis Executor] Database save failed for ${data.company_name}:`, saveError.message);

        // Mark backup as failed if we have one
        if (backupPath) {
          try {
            await markAsFailed(backupPath);
          } catch (e) {
            console.warn(`[Analysis Executor] Failed to mark backup as failed:`, e.message);
          }
        }

        return {
          success: false,
          prospect_id: data.prospect_id,
          url: data.url,
          company_name: data.company_name,
          error: `Database save failed: ${saveError.message}`,
          duration_ms: Date.now() - startTime
        };
      }

      // Mark backup as uploaded
      if (backupPath) {
        try {
          await markAsUploaded(backupPath);
        } catch (e) {
          console.warn(`[Analysis Executor] Failed to mark backup as uploaded:`, e.message);
        }
      }

      // Increment analysis count for optimization (non-blocking)
      try {
        await incrementAnalysisCount(data.industry || 'unknown');
      } catch (e) {
        console.warn(`[Analysis Executor] Failed to increment analysis count:`, e.message);
      }

      const duration = Date.now() - startTime;
      console.log(`[Analysis Executor] Completed ${data.company_name} (${result.grade}, score: ${result.overall_score}) in ${duration}ms`);

      return {
        success: true,
        lead_id: savedLead.id,
        prospect_id: data.prospect_id,
        url: data.url,
        company_name: data.company_name,
        grade: result.grade,
        overall_score: result.overall_score,
        analysis_cost: result.analysis_cost,
        duration_ms: duration
      };

    } else {
      // Analysis failed
      console.error(`[Analysis Executor] Failed ${data.company_name}:`, result.error);

      // Check for bot protection (non-blocking)
      if (result.error && result.error.toLowerCase().includes('bot') && result.error.toLowerCase().includes('protect')) {
        try {
          if (data.prospect_id) {
            await supabase
              .from('prospects')
              .update({
                website_status: 'bot_protected',
                updated_at: new Date().toISOString()
              })
              .eq('id', data.prospect_id);

            console.warn(`[Analysis Executor] Marked prospect ${data.prospect_id} as bot_protected`);
          }
        } catch (e) {
          console.warn(`[Analysis Executor] Failed to update prospect status:`, e.message);
        }
      }

      return {
        success: false,
        prospect_id: data.prospect_id,
        url: data.url,
        company_name: data.company_name,
        error: result.error || 'Analysis failed',
        duration_ms: Date.now() - startTime
      };
    }

  } catch (error) {
    // Catch-all for any unexpected errors
    const duration = Date.now() - startTime;
    console.error(`[Analysis Executor] Unexpected error for ${data.company_name}:`, error);
    console.error(`[Analysis Executor] Stack trace:`, error.stack);

    return {
      success: false,
      prospect_id: data.prospect_id,
      url: data.url,
      company_name: data.company_name,
      error: `Unexpected error: ${error.message}`,
      duration_ms: duration
    };
  }
}
