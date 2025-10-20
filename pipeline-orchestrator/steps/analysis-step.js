import fetch from 'node-fetch';
import { log } from '../shared/logger.js';
import { smartRetry } from '../shared/retry-handler.js';

/**
 * Execute analysis step
 * Calls Agent 2 (Analysis Engine) API
 *
 * @param {Object} config - Step configuration
 * @returns {Promise<Object>} Step results
 */
export async function executeAnalysisStep(config) {
  const startTime = Date.now();

  log.stepStarted(config.name, config);

  // Prepare the API call function
  const analyzeFn = async () => {
    const response = await fetch(config.endpoint, {
      method: config.method || 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config.params),
      signal: AbortSignal.timeout(config.timeout || 600000) // 10 min default
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Analysis API failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    return result;
  };

  try {
    // Execute with retry logic
    const result = await smartRetry(analyzeFn, config.retry, config.name);

    const endTime = Date.now();

    // Extract metrics from result
    const stepResult = {
      success: true,
      leads_analyzed: result.analyzed || result.count || 0,
      leads_updated: result.updated || result.analyzed || 0,
      grade_a: result.gradeA || 0,
      grade_b: result.gradeB || 0,
      grade_c: result.gradeC || 0,
      cost: result.cost || result.totalCost || 0,
      time_ms: endTime - startTime,
      raw_result: result
    };

    log.stepCompleted(config.name, stepResult);

    return stepResult;

  } catch (error) {
    log.error('Analysis step failed after all retries', {
      step: config.name,
      endpoint: config.endpoint,
      error: error.message
    });

    throw error;
  }
}

/**
 * Wait for analysis job completion (if async)
 *
 * @param {string} endpoint - Polling endpoint
 * @param {string} jobId - Job ID to poll
 * @param {number} maxWaitMs - Max time to wait (default: 15 minutes)
 * @returns {Promise<Object>} Final results
 */
export async function waitForAnalysisCompletion(endpoint, jobId, maxWaitMs = 900000) {
  const startTime = Date.now();
  const pollInterval = 10000; // Poll every 10 seconds (analysis takes longer)

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const response = await fetch(`${endpoint}/${jobId}`);

      if (!response.ok) {
        throw new Error(`Polling failed: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.status === 'completed') {
        return result;
      }

      if (result.status === 'failed') {
        throw new Error(`Analysis job failed: ${result.error}`);
      }

      // Still running, wait and poll again
      log.debug('Analysis job still running', {
        jobId,
        status: result.status,
        progress: result.progress
      });

      await new Promise(resolve => setTimeout(resolve, pollInterval));

    } catch (error) {
      log.error('Error polling analysis job', { jobId, error: error.message });
      throw error;
    }
  }

  throw new Error(`Analysis job timeout after ${maxWaitMs}ms`);
}

export default executeAnalysisStep;
