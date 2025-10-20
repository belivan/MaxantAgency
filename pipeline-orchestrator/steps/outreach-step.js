import fetch from 'node-fetch';
import { log } from '../shared/logger.js';
import { smartRetry } from '../shared/retry-handler.js';

/**
 * Execute outreach composition step
 * Calls Agent 3 (Outreach Engine) API to compose emails
 *
 * @param {Object} config - Step configuration
 * @returns {Promise<Object>} Step results
 */
export async function executeOutreachStep(config) {
  const startTime = Date.now();

  log.stepStarted(config.name, config);

  // Prepare the API call function
  const composeFn = async () => {
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
      throw new Error(`Outreach API failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    return result;
  };

  try {
    // Execute with retry logic
    const result = await smartRetry(composeFn, config.retry, config.name);

    const endTime = Date.now();

    // Extract metrics from result
    const stepResult = {
      success: true,
      emails_composed: result.composed || result.count || 0,
      emails_ready: result.ready || result.composed || 0,
      avg_quality_score: result.avgQuality || result.averageQuality || 0,
      cost: result.cost || result.totalCost || 0,
      time_ms: endTime - startTime,
      raw_result: result
    };

    log.stepCompleted(config.name, stepResult);

    return stepResult;

  } catch (error) {
    log.error('Outreach composition step failed after all retries', {
      step: config.name,
      endpoint: config.endpoint,
      error: error.message
    });

    throw error;
  }
}

/**
 * Wait for outreach job completion (if async)
 *
 * @param {string} endpoint - Polling endpoint
 * @param {string} jobId - Job ID to poll
 * @param {number} maxWaitMs - Max time to wait (default: 10 minutes)
 * @returns {Promise<Object>} Final results
 */
export async function waitForOutreachCompletion(endpoint, jobId, maxWaitMs = 600000) {
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
        throw new Error(`Outreach job failed: ${result.error}`);
      }

      // Still running, wait and poll again
      log.debug('Outreach job still running', {
        jobId,
        status: result.status,
        progress: result.progress
      });

      await new Promise(resolve => setTimeout(resolve, pollInterval));

    } catch (error) {
      log.error('Error polling outreach job', { jobId, error: error.message });
      throw error;
    }
  }

  throw new Error(`Outreach job timeout after ${maxWaitMs}ms`);
}

export default executeOutreachStep;
