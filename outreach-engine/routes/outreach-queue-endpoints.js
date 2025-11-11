/**
 * Outreach Queue Endpoints
 *
 * New async queue-based endpoints for outreach composition using the universal work queue.
 * These endpoints provide a cleaner async API alongside the existing SSE-based /api/compose-batch endpoints.
 */

import { createClient } from '@supabase/supabase-js';
import { batchGenerateConsolidated } from '../batch-generate-consolidated.js';
import { enqueueWork, cancelWork, getJob, getQueueStatus } from '../../database-tools/shared/work-queue.js';

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * POST /api/compose-queue
 * Queue outreach composition (async with job ID)
 *
 * Body:
 * {
 *   lead_ids: ['uuid1', 'uuid2', ...] (required - leads to process),
 *   options: {
 *     forceRegenerate: false,      // Force regeneration even if exists
 *     project_id: 'uuid',           // Filter by project
 *     status: 'analyzed',           // Filter by lead status
 *     priority_tier: 'high',        // Filter by priority tier
 *     website_grade: 'C'            // Filter by website grade
 *   }
 * }
 */
export async function queueOutreachComposition(req, res) {
  try {
    const { lead_ids, options = {} } = req.body;

    // Validate input - need either lead_ids OR filter options
    if (!lead_ids || !Array.isArray(lead_ids) || lead_ids.length === 0) {
      // Check if we have filter options instead
      if (!options.project_id && !options.status && !options.priority_tier && !options.website_grade) {
        return res.status(400).json({
          success: false,
          error: 'Either lead_ids array or filter options (project_id, status, priority_tier, website_grade) are required'
        });
      }
    }

    // Validate lead_ids exist if provided
    if (lead_ids && lead_ids.length > 0) {
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('id, company_name, url')
        .in('id', lead_ids);

      if (leadsError) {
        return res.status(500).json({
          success: false,
          error: 'Failed to validate lead_ids',
          details: leadsError.message
        });
      }

      if (!leads || leads.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No leads found with provided lead_ids'
        });
      }

      if (leads.length !== lead_ids.length) {
        const foundIds = leads.map(l => l.id);
        const missingIds = lead_ids.filter(id => !foundIds.includes(id));
        return res.status(404).json({
          success: false,
          error: 'Some lead_ids not found',
          missing_ids: missingIds
        });
      }

      console.log(`[Outreach Queue] Queuing composition for ${leads.length} leads:`);
      leads.forEach(lead => {
        console.log(`  - ${lead.company_name || lead.url} (${lead.id})`);
      });
    }

    // Calculate priority based on batch size
    // Small batches (1-5 leads) = Priority 1 (high)
    // Medium batches (6-20 leads) = Priority 2 (medium)
    // Large batches (21+ leads) = Priority 3 (low)
    const batchSize = lead_ids ? lead_ids.length : 50; // Default to 50 if using filters
    let priority;
    if (batchSize <= 5) {
      priority = 1;
    } else if (batchSize <= 20) {
      priority = 2;
    } else {
      priority = 3;
    }

    console.log(`[Outreach Queue] Batch size: ${batchSize} leads → Priority ${priority}`);

    // Queue the outreach composition job
    const jobId = await enqueueWork('outreach', {
      leadIds: lead_ids || null,
      options: {
        forceRegenerate: options.forceRegenerate || false,
        projectId: options.project_id || null,
        status: options.status || null,
        priority_tier: options.priority_tier || null,
        website_grade: options.website_grade || null,
        limit: options.limit || null
      }
    }, priority, async (data) => {
      // Execute outreach composition
      return await executeOutreachComposition(data);
    });

    console.log(`[Outreach Queue] Queued outreach composition job: ${jobId}`);

    // Return immediately with job ID
    res.json({
      success: true,
      job_id: jobId,
      message: `Queued outreach composition for ${batchSize} lead${batchSize === 1 ? '' : 's'}`,
      batch_size: batchSize,
      priority,
      variations_per_lead: 12,
      total_variations: batchSize * 12
    });

  } catch (error) {
    console.error('[Outreach Queue] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}

/**
 * GET /api/compose-status
 * Get status of queued/running/completed outreach composition jobs
 *
 * Query params:
 * - job_ids: Comma-separated job IDs (required)
 */
export async function getCompositionStatus(req, res) {
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
        result: job.result // Full composition result when completed
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
    console.error('[Compose Status] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}

/**
 * POST /api/cancel-compose
 * Cancel queued outreach composition jobs
 *
 * Body:
 * {
 *   "job_ids": ["uuid1", "uuid2", ...]
 * }
 */
export async function cancelComposition(req, res) {
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

    console.log(`[Outreach Queue] Cancelled ${cancelledCount}/${job_ids.length} jobs`);

    res.json({
      success: true,
      cancelled: cancelledCount,
      total: job_ids.length,
      results
    });

  } catch (error) {
    console.error('[Cancel Compose] Error:', error);
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
 * Execute outreach composition (called by work queue)
 *
 * CRITICAL: This function MUST always return a result (success or failure).
 * It should never throw errors or hang indefinitely.
 */
async function executeOutreachComposition(data) {
  const startTime = Date.now();

  try {
    console.log(`[Outreach Executor] Generating outreach compositions...`);

    const { leadIds, options } = data;

    // Build options for batchGenerateConsolidated
    const batchOptions = {
      leadIds: leadIds || null,
      forceRegenerate: options.forceRegenerate || false,
      projectId: options.projectId || null,
      status: options.status || null,
      priority_tier: options.priority_tier || null,
      website_grade: options.website_grade || null,
      limit: options.limit || null,
      dryRun: false,
      progressCallback: null // Queue system handles progress differently
    };

    // Generate outreach using batch-generate-consolidated
    const stats = await batchGenerateConsolidated(batchOptions);

    const duration = Date.now() - startTime;
    console.log(`[Outreach Executor] Completed ${stats.processedLeads}/${stats.totalLeads} leads in ${duration}ms`);

    return {
      success: true,
      total_leads: stats.totalLeads,
      processed_leads: stats.processedLeads,
      total_variations: stats.processedLeads * 12,
      total_cost: parseFloat(stats.totalCost.toFixed(4)),
      cost_per_lead: stats.processedLeads > 0 ? parseFloat((stats.totalCost / stats.processedLeads).toFixed(4)) : 0,
      cost_per_variation: stats.processedLeads > 0 ? parseFloat((stats.totalCost / (stats.processedLeads * 12)).toFixed(6)) : 0,
      generation_time_ms: stats.totalTime,
      total_duration_ms: duration,
      errors: stats.errors || [],
      error_count: stats.errors ? stats.errors.length : 0
    };

  } catch (error) {
    // Catch-all for any unexpected errors
    const duration = Date.now() - startTime;
    console.error(`[Outreach Executor] Unexpected error:`, error);
    console.error(`[Outreach Executor] Stack trace:`, error.stack);

    return {
      success: false,
      error: `Unexpected error: ${error.message}`,
      duration_ms: duration
    };
  }
}
