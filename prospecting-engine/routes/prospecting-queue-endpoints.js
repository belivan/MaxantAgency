/**
 * Prospecting Queue Endpoints
 *
 * New async queue-based endpoints for prospecting using the universal work queue.
 * These endpoints provide a cleaner async API alongside the existing SSE-based /api/prospect.
 */

import { runProspectingPipeline } from '../orchestrator.js';
import { enqueueWork, cancelWork, getJob, getQueueStatus } from '../../database-tools/shared/work-queue.js';

/**
 * POST /api/prospect-queue
 * Queue prospects for discovery (async with job ID)
 *
 * Body:
 * {
 *   brief: { industry, city, target, count },
 *   options: {
 *     projectId: string,
 *     model: string (optional),
 *     visionModel: string (optional),
 *     customPrompts: object (optional),
 *     model_selections: object (optional),
 *     useIterativeDiscovery: boolean (optional),
 *     maxIterations: number (optional),
 *     maxVariationsPerIteration: number (optional),
 *     minRating: number (optional),
 *     checkRelevance: boolean (optional),
 *     filterIrrelevant: boolean (optional)
 *   }
 * }
 */
export async function queueProspecting(req, res) {
  try {
    const { brief, options = {}, custom_prompts, model_selections } = req.body;

    // Validate request
    if (!brief) {
      return res.status(400).json({
        success: false,
        error: 'Missing "brief" in request body'
      });
    }

    // Normalize brief format to handle both simple and comprehensive ICP brief formats
    let normalizedBrief = { ...brief };

    if (!brief.industry && brief.industries) {
      normalizedBrief.industry = Array.isArray(brief.industries)
        ? brief.industries.join(', ')
        : brief.industries;
    }

    if (!brief.target && brief.target_description) {
      normalizedBrief.target = brief.target_description;
    }

    if (!brief.city && brief.location) {
      normalizedBrief.city = brief.location.hq_city || brief.location.metro || '';
    }

    // Validate normalized brief
    if (!normalizedBrief.industry && !normalizedBrief.target) {
      return res.status(400).json({
        success: false,
        error: 'Brief must include "industry"/"industries" or "target"/"target_description"'
      });
    }

    console.log(`[Prospecting Queue] Queuing prospecting job for ${normalizedBrief.industry || normalizedBrief.target}`);

    // Calculate batch size for priority (smaller batches = higher priority)
    const batchSize = normalizedBrief.count || 50;

    // Apply environment-based defaults if not explicitly set in options
    const enableSocialScraping = process.env.ENABLE_SOCIAL_SCRAPING === 'true';
    const useVisionFallback = process.env.USE_VISION_FALLBACK !== 'false'; // Default true for backward compatibility

    // Queue the prospecting job
    const jobId = await enqueueWork('prospecting', {
      brief: normalizedBrief,
      options: {
        ...options,
        customPrompts: custom_prompts,
        modelSelections: model_selections,
        // Override defaults if not explicitly set
        findSocial: options.findSocial !== undefined ? options.findSocial : enableSocialScraping,
        scrapeSocial: options.scrapeSocial !== undefined ? options.scrapeSocial : enableSocialScraping,
        useGrokFallback: options.useGrokFallback !== undefined ? options.useGrokFallback : useVisionFallback
      }
    }, batchSize, async (data) => {
      // Execute prospecting pipeline
      return await executeProspecting(data);
    });

    console.log(`[Prospecting Queue] Queued prospecting job: ${jobId}`);

    // Return immediately with job ID
    res.json({
      success: true,
      job_id: jobId,
      message: `Queued prospecting for ${batchSize} prospects`,
      brief: {
        industry: normalizedBrief.industry,
        city: normalizedBrief.city,
        target: normalizedBrief.target,
        count: batchSize
      }
    });

  } catch (error) {
    console.error('[Prospecting Queue] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}

/**
 * GET /api/prospect-status
 * Get status of queued/running/completed prospecting jobs
 *
 * Query params:
 * - job_ids: Comma-separated job IDs (required)
 */
export async function getProspectStatus(req, res) {
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
        result: job.result // Full prospecting result when completed
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
    console.error('[Prospect Status] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}

/**
 * POST /api/cancel-prospect
 * Cancel queued prospecting jobs
 *
 * Body:
 * {
 *   "job_ids": ["uuid1", "uuid2", ...]
 * }
 */
export async function cancelProspecting(req, res) {
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

    console.log(`[Prospecting Queue] Cancelled ${cancelledCount}/${job_ids.length} jobs`);

    res.json({
      success: true,
      cancelled: cancelledCount,
      total: job_ids.length,
      results
    });

  } catch (error) {
    console.error('[Cancel Prospecting] Error:', error);
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
 * Execute prospecting (called by work queue)
 *
 * CRITICAL: This function MUST always return a result (success or failure).
 * It should never throw errors or hang indefinitely.
 */
async function executeProspecting(data) {
  const startTime = Date.now();

  try {
    console.log(`[Prospecting Executor] Starting prospecting for ${data.brief.industry || data.brief.target}...`);

    // Run prospecting pipeline (no onProgress callback since we're using job-based architecture)
    const result = await runProspectingPipeline(data.brief, data.options, null);

    const duration = Date.now() - startTime;
    console.log(`[Prospecting Executor] Completed prospecting in ${duration}ms (Found: ${result.found}, Saved: ${result.saved})`);

    return {
      success: true,
      ...result,
      duration_ms: duration
    };

  } catch (error) {
    // Catch-all for any unexpected errors
    const duration = Date.now() - startTime;
    console.error(`[Prospecting Executor] Unexpected error:`, error);
    console.error(`[Prospecting Executor] Stack trace:`, error.stack);

    return {
      success: false,
      error: `Unexpected error: ${error.message}`,
      duration_ms: duration,
      found: 0,
      saved: 0,
      failed: 0,
      skipped: 0,
      prospects: []
    };
  }
}
