/**
 * Analyze Executor
 * Executes analysis step and handles Agent 2 communication
 */

import { executeAnalysisStep } from '../steps/analysis-step.js';
import { log } from '../shared/logger.js';

/**
 * Execute analysis step
 *
 * @param {Object} stepConfig - Step configuration from campaign
 * @param {Object} context - Execution context (runId, campaignId, etc.)
 * @returns {Promise<Object>} Execution results
 */
export async function executeAnalyzeStep(stepConfig, context = {}) {
  const startTime = Date.now();

  try {
    log.info('Starting analysis execution', {
      step: stepConfig.name,
      runId: context.runId,
      campaignId: context.campaignId
    });

    // Validate step configuration
    validateAnalysisConfig(stepConfig);

    // Execute analysis via Agent 2
    const result = await executeAnalysisStep(stepConfig);

    // Add context to result
    result.runId = context.runId;
    result.campaignId = context.campaignId;
    result.executionTime = Date.now() - startTime;

    log.info('Analysis execution completed', {
      step: stepConfig.name,
      leadsAnalyzed: result.leads_analyzed,
      cost: result.cost,
      duration: result.executionTime
    });

    return result;

  } catch (error) {
    log.error('Analysis execution failed', {
      step: stepConfig.name,
      error: error.message,
      runId: context.runId
    });

    throw new Error(`Analysis step failed: ${error.message}`);
  }
}

/**
 * Validate analysis step configuration
 *
 * @param {Object} config - Step config
 * @throws {Error} If config is invalid
 */
function validateAnalysisConfig(config) {
  if (!config.params) {
    throw new Error('Analysis step missing params');
  }

  if (!config.endpoint) {
    throw new Error('Analysis step missing endpoint');
  }

  return true;
}

/**
 * Get analysis execution metrics
 *
 * @param {Object} result - Execution result
 * @returns {Object} Metrics object
 */
export function getAnalysisMetrics(result) {
  return {
    leadsAnalyzed: result.leads_analyzed || 0,
    leadsUpdated: result.leads_updated || 0,
    gradeA: result.grade_a || 0,
    gradeB: result.grade_b || 0,
    gradeC: result.grade_c || 0,
    cost: result.cost || 0,
    timeMs: result.time_ms || 0,
    success: result.success || false
  };
}

export default executeAnalyzeStep;
