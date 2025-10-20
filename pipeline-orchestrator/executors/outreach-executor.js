/**
 * Outreach Executor
 * Executes outreach steps (compose + send) and handles Agent 3 communication
 */

import { executeOutreachStep } from '../steps/outreach-step.js';
import { executeSenderStep } from '../steps/sender-step.js';
import { log } from '../shared/logger.js';

/**
 * Execute outreach composition step
 *
 * @param {Object} stepConfig - Step configuration from campaign
 * @param {Object} context - Execution context (runId, campaignId, etc.)
 * @returns {Promise<Object>} Execution results
 */
export async function executeOutreachComposeStep(stepConfig, context = {}) {
  const startTime = Date.now();

  try {
    log.info('Starting outreach compose execution', {
      step: stepConfig.name,
      runId: context.runId,
      campaignId: context.campaignId
    });

    // Validate step configuration
    validateOutreachConfig(stepConfig);

    // Execute outreach composition via Agent 3
    const result = await executeOutreachStep(stepConfig);

    // Add context to result
    result.runId = context.runId;
    result.campaignId = context.campaignId;
    result.executionTime = Date.now() - startTime;

    log.info('Outreach compose execution completed', {
      step: stepConfig.name,
      emailsComposed: result.emails_composed,
      cost: result.cost,
      duration: result.executionTime
    });

    return result;

  } catch (error) {
    log.error('Outreach compose execution failed', {
      step: stepConfig.name,
      error: error.message,
      runId: context.runId
    });

    throw new Error(`Outreach compose step failed: ${error.message}`);
  }
}

/**
 * Execute email sending step
 *
 * @param {Object} stepConfig - Step configuration from campaign
 * @param {Object} context - Execution context (runId, campaignId, etc.)
 * @returns {Promise<Object>} Execution results
 */
export async function executeOutreachSendStep(stepConfig, context = {}) {
  const startTime = Date.now();

  try {
    log.info('Starting outreach send execution', {
      step: stepConfig.name,
      runId: context.runId,
      campaignId: context.campaignId
    });

    // Validate step configuration
    validateSendConfig(stepConfig);

    // Execute email sending via Agent 3
    const result = await executeSenderStep(stepConfig);

    // Add context to result
    result.runId = context.runId;
    result.campaignId = context.campaignId;
    result.executionTime = Date.now() - startTime;

    log.info('Outreach send execution completed', {
      step: stepConfig.name,
      emailsSent: result.emails_sent,
      cost: result.cost,
      duration: result.executionTime
    });

    return result;

  } catch (error) {
    log.error('Outreach send execution failed', {
      step: stepConfig.name,
      error: error.message,
      runId: context.runId
    });

    throw new Error(`Outreach send step failed: ${error.message}`);
  }
}

/**
 * Validate outreach step configuration
 *
 * @param {Object} config - Step config
 * @throws {Error} If config is invalid
 */
function validateOutreachConfig(config) {
  if (!config.params) {
    throw new Error('Outreach step missing params');
  }

  if (!config.endpoint) {
    throw new Error('Outreach step missing endpoint');
  }

  return true;
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

  return true;
}

/**
 * Get outreach execution metrics
 *
 * @param {Object} result - Execution result
 * @returns {Object} Metrics object
 */
export function getOutreachMetrics(result) {
  return {
    emailsComposed: result.emails_composed || 0,
    emailsReady: result.emails_ready || 0,
    emailsSent: result.emails_sent || 0,
    emailsFailed: result.emails_failed || 0,
    avgQualityScore: result.avg_quality_score || 0,
    cost: result.cost || 0,
    timeMs: result.time_ms || 0,
    success: result.success || false
  };
}

export default { executeOutreachComposeStep, executeOutreachSendStep };
