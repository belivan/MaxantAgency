import fetch from 'node-fetch';
import { log } from '../shared/logger.js';
import { smartRetry } from '../shared/retry-handler.js';

/**
 * Execute sender step
 * Calls Agent 3 (Outreach Engine) API to send emails
 *
 * @param {Object} config - Step configuration
 * @returns {Promise<Object>} Step results
 */
export async function executeSenderStep(config) {
  const startTime = Date.now();

  log.stepStarted(config.name, config);

  // Prepare the API call function
  const sendFn = async () => {
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
      throw new Error(`Sender API failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    return result;
  };

  try {
    // Execute with retry logic
    // Note: Be careful with retries on send operations!
    // We use smart retry which won't retry on 4xx errors (already sent, etc.)
    const result = await smartRetry(sendFn, config.retry, config.name);

    const endTime = Date.now();

    // Extract metrics from result
    const stepResult = {
      success: true,
      emails_sent: result.sent || result.count || 0,
      emails_failed: result.failed || 0,
      emails_queued: result.queued || 0,
      cost: result.cost || result.totalCost || 0,
      time_ms: endTime - startTime,
      raw_result: result
    };

    log.stepCompleted(config.name, stepResult);

    return stepResult;

  } catch (error) {
    log.error('Sender step failed after all retries', {
      step: config.name,
      endpoint: config.endpoint,
      error: error.message
    });

    throw error;
  }
}

/**
 * Wait for send batch completion (if async)
 *
 * @param {string} endpoint - Polling endpoint
 * @param {string} batchId - Batch ID to poll
 * @param {number} maxWaitMs - Max time to wait (default: 20 minutes)
 * @returns {Promise<Object>} Final results
 */
export async function waitForSendCompletion(endpoint, batchId, maxWaitMs = 1200000) {
  const startTime = Date.now();
  const pollInterval = 10000; // Poll every 10 seconds (sending can take a while)

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const response = await fetch(`${endpoint}/${batchId}`);

      if (!response.ok) {
        throw new Error(`Polling failed: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.status === 'completed') {
        return result;
      }

      if (result.status === 'failed') {
        throw new Error(`Send batch failed: ${result.error}`);
      }

      // Still running, wait and poll again
      log.debug('Send batch still running', {
        batchId,
        status: result.status,
        sent: result.sent || 0,
        total: result.total || 0
      });

      await new Promise(resolve => setTimeout(resolve, pollInterval));

    } catch (error) {
      log.error('Error polling send batch', { batchId, error: error.message });
      throw error;
    }
  }

  throw new Error(`Send batch timeout after ${maxWaitMs}ms`);
}

export default executeSenderStep;
