/**
 * Send Executor
 * Executes email sending steps and handles Agent 3 send API communication
 */

import { executeSenderStep } from '../steps/sender-step.js';
import { log } from '../shared/logger.js';

/**
 * Execute email sending step
 *
 * @param {Object} stepConfig - Step configuration from campaign
 * @param {Object} context - Execution context (runId, campaignId, etc.)
 * @returns {Promise<Object>} Execution results
 */
export async function executeSendStep(stepConfig, context = {}) {
  const startTime = Date.now();

  try {
    log.info('Starting email send execution', {
      step: stepConfig.name,
      runId: context.runId,
      campaignId: context.campaignId,
      actualSend: stepConfig.params?.actualSend || false
    });

    // Validate step configuration
    validateSendConfig(stepConfig);

    // Execute email sending via Agent 3
    const result = await executeSenderStep(stepConfig);

    // Add context to result
    result.runId = context.runId;
    result.campaignId = context.campaignId;
    result.executionTime = Date.now() - startTime;

    log.info('Email send execution completed', {
      step: stepConfig.name,
      emailsSent: result.emails_sent,
      emailsFailed: result.emails_failed,
      cost: result.cost,
      duration: result.executionTime
    });

    return result;

  } catch (error) {
    log.error('Email send execution failed', {
      step: stepConfig.name,
      error: error.message,
      runId: context.runId
    });

    throw new Error(`Send step failed: ${error.message}`);
  }
}

/**
 * Validate send step configuration
 *
 * @param {Object} config - Step config
 * @throws {Error} If config is invalid
 */
function validateSendConfig(config) {
  if (!config.params) {
    throw new Error('Send step missing params');
  }

  if (!config.endpoint) {
    throw new Error('Send step missing endpoint');
  }

  if (config.params.actualSend && !config.params.provider) {
    throw new Error('Send step missing provider when actualSend is true');
  }

  if (!config.params.filters) {
    throw new Error('Send step missing filters (status, quality_score_min, etc.)');
  }

  return true;
}

/**
 * Get send execution metrics
 *
 * @param {Object} result - Execution result
 * @returns {Object} Metrics object
 */
export function getSendMetrics(result) {
  return {
    emailsSent: result.emails_sent || 0,
    emailsFailed: result.emails_failed || 0,
    successRate: result.success_rate || 0,
    cost: result.cost || 0,
    timeMs: result.time_ms || 0,
    success: result.success || false
  };
}

export default { executeSendStep, getSendMetrics };
