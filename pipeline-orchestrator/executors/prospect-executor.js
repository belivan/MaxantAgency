/**
 * Prospect Executor
 * Executes prospecting step and handles Agent 1 communication
 */

import { executeProspectingStep } from '../steps/prospecting-step.js';
import { log } from '../shared/logger.js';

/**
 * Execute prospect generation step
 *
 * @param {Object} stepConfig - Step configuration from campaign
 * @param {Object} context - Execution context (runId, campaignId, etc.)
 * @returns {Promise<Object>} Execution results
 */
export async function executeProspectStep(stepConfig, context = {}) {
  const startTime = Date.now();

  try {
    log.info('Starting prospect execution', {
      step: stepConfig.name,
      runId: context.runId,
      campaignId: context.campaignId
    });

    // Validate step configuration
    validateProspectConfig(stepConfig);

    // Execute prospecting via Agent 1
    const result = await executeProspectingStep(stepConfig);

    // Add context to result
    result.runId = context.runId;
    result.campaignId = context.campaignId;
    result.executionTime = Date.now() - startTime;

    log.info('Prospect execution completed', {
      step: stepConfig.name,
      prospectsGenerated: result.prospects_generated,
      cost: result.cost,
      duration: result.executionTime
    });

    return result;

  } catch (error) {
    log.error('Prospect execution failed', {
      step: stepConfig.name,
      error: error.message,
      runId: context.runId
    });

    throw new Error(`Prospect step failed: ${error.message}`);
  }
}

/**
 * Validate prospect step configuration
 *
 * @param {Object} config - Step config
 * @throws {Error} If config is invalid
 */
function validateProspectConfig(config) {
  if (!config.params) {
    throw new Error('Prospect step missing params');
  }

  if (!config.params.brief) {
    throw new Error('Prospect step missing brief');
  }

  if (!config.endpoint) {
    throw new Error('Prospect step missing endpoint');
  }

  return true;
}

/**
 * Get prospect execution metrics
 *
 * @param {Object} result - Execution result
 * @returns {Object} Metrics object
 */
export function getProspectMetrics(result) {
  return {
    prospectsFound: result.prospects_generated || 0,
    prospectsVerified: result.prospects_verified || 0,
    cost: result.cost || 0,
    timeMs: result.time_ms || 0,
    success: result.success || false
  };
}

export default executeProspectStep;
