/**
 * Compose Executor
 * Executes email composition steps and handles Agent 3 compose API communication
 */

import { executeOutreachStep } from '../steps/outreach-step.js';
import { log } from '../shared/logger.js';

/**
 * Execute outreach composition step
 *
 * @param {Object} stepConfig - Step configuration from campaign
 * @param {Object} context - Execution context (runId, campaignId, etc.)
 * @returns {Promise<Object>} Execution results
 */
export async function executeComposeStep(stepConfig, context = {}) {
  const startTime = Date.now();

  try {
    log.info('Starting email compose execution', {
      step: stepConfig.name,
      runId: context.runId,
      campaignId: context.campaignId
    });

    // Validate step configuration
    validateComposeConfig(stepConfig);

    // Execute outreach composition via Agent 3
    const result = await executeOutreachStep(stepConfig);

    // Add context to result
    result.runId = context.runId;
    result.campaignId = context.campaignId;
    result.executionTime = Date.now() - startTime;

    log.info('Email compose execution completed', {
      step: stepConfig.name,
      emailsComposed: result.emails_composed,
      cost: result.cost,
      duration: result.executionTime
    });

    return result;

  } catch (error) {
    log.error('Email compose execution failed', {
      step: stepConfig.name,
      error: error.message,
      runId: context.runId
    });

    throw new Error(`Compose step failed: ${error.message}`);
  }
}

/**
 * Validate compose step configuration
 *
 * @param {Object} config - Step config
 * @throws {Error} If config is invalid
 */
function validateComposeConfig(config) {
  if (!config.params) {
    throw new Error('Compose step missing params');
  }

  if (!config.endpoint) {
    throw new Error('Compose step missing endpoint');
  }

  if (!config.params.filters) {
    throw new Error('Compose step missing filters (grade, hasEmail, etc.)');
  }

  if (!config.params.strategy) {
    throw new Error('Compose step missing strategy');
  }

  return true;
}

/**
 * Get compose execution metrics
 *
 * @param {Object} result - Execution result
 * @returns {Object} Metrics object
 */
export function getComposeMetrics(result) {
  return {
    emailsComposed: result.emails_composed || 0,
    emailsReady: result.emails_ready || 0,
    avgQualityScore: result.avg_quality_score || 0,
    cost: result.cost || 0,
    timeMs: result.time_ms || 0,
    success: result.success || false
  };
}

export default { executeComposeStep, getComposeMetrics };
