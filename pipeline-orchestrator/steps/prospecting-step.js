import fetch from 'node-fetch';
import { log } from '../shared/logger.js';
import { smartRetry } from '../shared/retry-handler.js';

/**
 * Execute prospecting step
 * Calls Agent 1 (Prospecting Engine) API
 *
 * @param {Object} config - Step configuration
 * @returns {Promise<Object>} Step results
 */
export async function executeProspectingStep(config) {
  const startTime = Date.now();

  log.stepStarted(config.name, config);

  // Prepare the API call function
  const prospectFn = async () => {
    const response = await fetch(config.endpoint, {
      method: config.method || 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config.params),
      signal: AbortSignal.timeout(config.timeout || 300000) // 5 min default
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Prospecting API failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    return result;
  };

  try {
    // Execute with retry logic
    const result = await smartRetry(prospectFn, config.retry, config.name);

    const endTime = Date.now();

    // Extract metrics from result
    const stepResult = {
      success: true,
      prospects_generated: result.found || result.count || 0,
      prospects_verified: result.verified || result.found || 0,
      cost: result.cost || result.totalCost || 0,
      time_ms: endTime - startTime,
      raw_result: result
    };

    log.stepCompleted(config.name, stepResult);

    return stepResult;

  } catch (error) {
    log.error('Prospecting step failed after all retries', {
      step: config.name,
      endpoint: config.endpoint,
      error: error.message
    });

    throw error;
  }
}

/**
 * Wait for prospecting job completion (if async)
 * Some engines might return a job ID and require polling
 *
 * @param {string} endpoint - Polling endpoint
 * @param {string} jobId - Job ID to poll
 * @param {number} maxWaitMs - Max time to wait (default: 10 minutes)
 * @returns {Promise<Object>} Final results
 */
export async function waitForProspectingCompletion(endpoint, jobId, maxWaitMs = 600000) {
  const startTime = Date.now();
  const pollInterval = 5000; // Poll every 5 seconds

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
        throw new Error(`Job failed: ${result.error}`);
      }

      // Still running, wait and poll again
      log.debug('Prospecting job still running', { jobId, status: result.status });
      await new Promise(resolve => setTimeout(resolve, pollInterval));

    } catch (error) {
      log.error('Error polling prospecting job', { jobId, error: error.message });
      throw error;
    }
  }

  throw new Error(`Prospecting job timeout after ${maxWaitMs}ms`);
}

export default executeProspectingStep;
