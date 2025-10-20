import { executeStep } from '../steps/index.js';
import { isBudgetExceeded } from '../budget/budget-enforcer.js';
import { extractCostFromStepResult } from '../budget/cost-tracker.js';
import { log } from '../shared/logger.js';
import {
  createCampaignRun,
  updateCampaignRun,
  updateCampaign
} from '../database/supabase-client.js';
import crypto from 'crypto';

/**
 * Generate a unique run ID
 *
 * @returns {string} UUID
 */
export function generateRunId() {
  return crypto.randomUUID();
}

/**
 * Execute a complete campaign run
 * Runs all steps sequentially, handles errors, tracks costs
 *
 * @param {Object} campaign - Campaign object from database
 * @param {string} triggerType - 'scheduled' or 'manual'
 * @returns {Promise<Object>} Run results
 */
export async function runCampaign(campaign, triggerType = 'scheduled') {
  const runId = generateRunId();
  const startTime = Date.now();

  log.campaignStarted(campaign, runId);

  // Initialize run record in database
  const run = await createCampaignRun({
    id: runId,
    campaign_id: campaign.id,
    status: 'running',
    trigger_type: triggerType,
    steps_completed: 0,
    steps_failed: 0,
    results: {},
    errors: [],
    total_cost: 0
  });

  const results = {
    runId,
    campaign_id: campaign.id,
    started_at: new Date(),
    steps_completed: 0,
    steps_failed: 0,
    total_cost: 0,
    errors: [],
    step_results: {}
  };

  try {
    // Budget check before starting
    const budgetCheck = await isBudgetExceeded(campaign.id, campaign.config.budget);

    if (budgetCheck.exceeded) {
      const error = new Error(`Budget exceeded: ${budgetCheck.reason}`);
      error.budgetExceeded = true;

      log.error('Campaign aborted - budget exceeded', {
        campaign: campaign.name,
        runId,
        reason: budgetCheck.reason
      });

      // Update run status
      await updateCampaignRun(runId, {
        status: 'aborted',
        completed_at: new Date().toISOString(),
        errors: [{ step: 'budget-check', error: budgetCheck.reason }]
      });

      // Pause the campaign
      await updateCampaign(campaign.id, { status: 'paused' });

      throw error;
    }

    // Run each step sequentially
    const steps = campaign.config.steps || [];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];

      log.info(`Running step ${i + 1}/${steps.length}`, {
        step: step.name,
        engine: step.engine
      });

      try {
        // Inject campaign's project_id into step params (if exists)
        const stepConfig = {
          ...step,
          params: {
            ...step.params,
            options: {
              ...step.params?.options,
              projectId: campaign.project_id  // Pass campaign's project_id to engines
            }
          }
        };

        // Execute the step
        const stepResult = await executeStep(stepConfig);

        // Extract and accumulate cost
        const stepCost = extractCostFromStepResult(stepResult);
        results.total_cost += stepCost;

        // Store step result
        results.step_results[step.name] = stepResult;
        results.steps_completed++;

        log.info('Step completed successfully', {
          step: step.name,
          cost: stepCost,
          totalCost: results.total_cost
        });

        // Update run in database with progress
        await updateCampaignRun(runId, {
          steps_completed: results.steps_completed,
          total_cost: results.total_cost,
          results: results.step_results
        });

        // Handle onSuccess action
        if (step.onSuccess === 'abort') {
          log.info('Step configured to abort on success', { step: step.name });
          break;
        }

      } catch (error) {
        log.error('Step failed', {
          step: step.name,
          error: error.message,
          stack: error.stack
        });

        results.steps_failed++;
        results.errors.push({
          step: step.name,
          error: error.message,
          timestamp: new Date().toISOString()
        });

        // Update run in database with error
        await updateCampaignRun(runId, {
          steps_failed: results.steps_failed,
          errors: results.errors
        });

        // Handle onFailure action
        if (step.onFailure === 'abort') {
          log.error('Step configured to abort on failure, stopping campaign', {
            step: step.name
          });
          throw error;
        } else if (step.onFailure === 'continue') {
          log.warn('Step configured to continue on failure, proceeding to next step', {
            step: step.name
          });
          continue;
        } else if (step.onFailure === 'log') {
          log.warn('Step configured to log on failure, proceeding', {
            step: step.name
          });
          continue;
        }
      }
    }

    // Campaign completed
    results.completed_at = new Date();
    results.status = results.steps_failed === 0 ? 'completed' : 'partial';
    results.duration_ms = Date.now() - startTime;

    // Update run record as completed
    await updateCampaignRun(runId, {
      status: results.status,
      completed_at: results.completed_at.toISOString(),
      steps_completed: results.steps_completed,
      steps_failed: results.steps_failed,
      total_cost: results.total_cost,
      results: results.step_results,
      errors: results.errors
    });

    // Update campaign totals
    await updateCampaign(campaign.id, {
      last_run_at: results.completed_at.toISOString(),
      total_runs: (campaign.total_runs || 0) + 1,
      total_cost: (parseFloat(campaign.total_cost) || 0) + results.total_cost
    });

    log.campaignCompleted(campaign, runId, results);

    return results;

  } catch (error) {
    // Campaign failed
    results.completed_at = new Date();
    results.status = 'failed';
    results.duration_ms = Date.now() - startTime;

    // Update run record as failed
    await updateCampaignRun(runId, {
      status: 'failed',
      completed_at: results.completed_at.toISOString(),
      errors: results.errors
    });

    log.campaignFailed(campaign, runId, error);

    throw error;
  }
}

/**
 * Run multiple campaigns in parallel
 *
 * @param {Array<Object>} campaigns - Array of campaign objects
 * @param {string} triggerType - 'scheduled' or 'manual'
 * @returns {Promise<Array<Object>>} Array of results
 */
export async function runMultipleCampaigns(campaigns, triggerType = 'scheduled') {
  log.info('Running multiple campaigns', { count: campaigns.length });

  const promises = campaigns.map(campaign =>
    runCampaign(campaign, triggerType).catch(error => ({
      campaign_id: campaign.id,
      error: error.message,
      failed: true
    }))
  );

  const results = await Promise.all(promises);

  const successful = results.filter(r => !r.failed).length;
  const failed = results.filter(r => r.failed).length;

  log.info('Multiple campaigns completed', { successful, failed, total: campaigns.length });

  return results;
}

export default runCampaign;
