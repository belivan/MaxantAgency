import { log } from './logger.js';

/**
 * Retry handler with exponential backoff
 *
 * @param {Function} fn - Async function to retry
 * @param {Object} config - Retry configuration
 * @param {number} config.attempts - Max retry attempts (default: 3)
 * @param {number} config.delay - Initial delay in ms (default: 1000)
 * @param {string} config.backoff - Backoff strategy: 'exponential' or 'linear' (default: 'exponential')
 * @param {string} stepName - Name of the step being retried (for logging)
 * @returns {Promise<any>} Result from successful execution
 */
export async function retry(fn, config = {}, stepName = 'unknown') {
  const {
    attempts = 3,
    delay = 1000,
    backoff = 'exponential'
  } = config;

  let lastError;
  let currentDelay = delay;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      // Try executing the function
      const result = await fn();

      // Success!
      if (attempt > 1) {
        log.info('Retry succeeded', {
          step: stepName,
          attempt,
          totalAttempts: attempts
        });
      }

      return result;

    } catch (error) {
      lastError = error;

      log.stepFailed(stepName, error, attempt);

      // If this was the last attempt, throw the error
      if (attempt === attempts) {
        log.error('All retry attempts exhausted', {
          step: stepName,
          attempts,
          error: error.message
        });
        throw error;
      }

      // Wait before retrying
      log.info('Retrying after delay', {
        step: stepName,
        attempt,
        delayMs: currentDelay
      });

      await sleep(currentDelay);

      // Calculate next delay based on backoff strategy
      if (backoff === 'exponential') {
        currentDelay = currentDelay * 2; // 1s -> 2s -> 4s -> 8s
      } else if (backoff === 'linear') {
        currentDelay = currentDelay + delay; // 1s -> 2s -> 3s -> 4s
      }
      // else keep the same delay (constant)
    }
  }

  // This should never be reached, but just in case
  throw lastError;
}

/**
 * Sleep helper function
 *
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry with timeout
 * Wraps a function with both retry logic AND a timeout
 *
 * @param {Function} fn - Async function to execute
 * @param {Object} config - Configuration
 * @param {number} config.timeout - Timeout in ms
 * @param {number} config.attempts - Retry attempts
 * @param {number} config.delay - Retry delay
 * @param {string} config.backoff - Backoff strategy
 * @param {string} stepName - Step name for logging
 * @returns {Promise<any>}
 */
export async function retryWithTimeout(fn, config = {}, stepName = 'unknown') {
  const { timeout = 30000, ...retryConfig } = config;

  const fnWithTimeout = async () => {
    return Promise.race([
      fn(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout)
      )
    ]);
  };

  return retry(fnWithTimeout, retryConfig, stepName);
}

/**
 * Check if an error is retryable
 * Some errors should not be retried (e.g., validation errors, 400 bad request)
 *
 * @param {Error} error - The error to check
 * @returns {boolean} True if error should be retried
 */
export function isRetryableError(error) {
  // Network errors - retry
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
    return true;
  }

  // HTTP status codes
  if (error.status) {
    // 5xx server errors - retry
    if (error.status >= 500 && error.status < 600) {
      return true;
    }

    // 429 rate limit - retry
    if (error.status === 429) {
      return true;
    }

    // 408 request timeout - retry
    if (error.status === 408) {
      return true;
    }

    // 4xx client errors (except rate limit) - don't retry
    if (error.status >= 400 && error.status < 500) {
      return false;
    }
  }

  // Timeout errors - retry
  if (error.message?.includes('timeout') || error.message?.includes('Timeout')) {
    return true;
  }

  // Default: retry
  return true;
}

/**
 * Smart retry that only retries retryable errors
 *
 * @param {Function} fn - Async function to retry
 * @param {Object} config - Retry configuration
 * @param {string} stepName - Step name for logging
 * @returns {Promise<any>}
 */
export async function smartRetry(fn, config = {}, stepName = 'unknown') {
  const {
    attempts = 3,
    delay = 1000,
    backoff = 'exponential'
  } = config;

  let lastError;
  let currentDelay = delay;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const result = await fn();

      if (attempt > 1) {
        log.info('Smart retry succeeded', {
          step: stepName,
          attempt
        });
      }

      return result;

    } catch (error) {
      lastError = error;

      // Check if error is retryable
      if (!isRetryableError(error)) {
        log.error('Non-retryable error, aborting', {
          step: stepName,
          error: error.message,
          status: error.status
        });
        throw error;
      }

      log.stepFailed(stepName, error, attempt);

      if (attempt === attempts) {
        throw error;
      }

      await sleep(currentDelay);

      if (backoff === 'exponential') {
        currentDelay = currentDelay * 2;
      } else if (backoff === 'linear') {
        currentDelay = currentDelay + delay;
      }
    }
  }

  throw lastError;
}

export default retry;
