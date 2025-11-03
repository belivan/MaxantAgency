/**
 * Database Request Queue & Retry Logic
 *
 * Prevents overwhelming Supabase with too many concurrent requests
 * Adds exponential backoff retry logic for failed operations
 */

// Configuration
const MAX_CONCURRENT_REQUESTS = parseInt(process.env.SUPABASE_MAX_CONCURRENT_REQUESTS) || 20;
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

// Queue state
const queue = [];
let activeRequests = 0;

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute a database operation with retry logic
 *
 * @param {Function} operation - Async function to execute
 * @param {string} operationName - Name for logging
 * @param {number} attempt - Current attempt number (internal)
 * @returns {Promise<any>} Result of the operation
 */
async function executeWithRetry(operation, operationName = 'database operation', attempt = 1) {
  try {
    return await operation();
  } catch (error) {
    const isFetchError = error.message?.includes('fetch failed') ||
                         error.message?.includes('timeout') ||
                         error.message?.includes('ENOTFOUND') ||
                         error.message?.includes('Connection') ||
                         error.code === 'ECONNRESET';

    if (isFetchError && attempt < MAX_RETRIES) {
      const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1); // Exponential backoff
      console.warn(`⚠️  ${operationName} failed (attempt ${attempt}/${MAX_RETRIES}). Retrying in ${delay}ms...`);
      console.warn(`   Error: ${error.message}`);

      await sleep(delay);
      return executeWithRetry(operation, operationName, attempt + 1);
    }

    // Not retryable or max retries exceeded
    throw error;
  }
}

/**
 * Process the next item in the queue
 */
async function processQueue() {
  if (queue.length === 0 || activeRequests >= MAX_CONCURRENT_REQUESTS) {
    return;
  }

  const { operation, operationName, resolve, reject } = queue.shift();
  activeRequests++;

  try {
    const result = await executeWithRetry(operation, operationName);
    resolve(result);
  } catch (error) {
    reject(error);
  } finally {
    activeRequests--;
    processQueue(); // Process next item
  }
}

/**
 * Add a database operation to the queue
 *
 * @param {Function} operation - Async database operation
 * @param {string} operationName - Name for logging/debugging
 * @returns {Promise<any>} Result of the operation
 */
export function queueDatabaseOperation(operation, operationName = 'database operation') {
  return new Promise((resolve, reject) => {
    queue.push({ operation, operationName, resolve, reject });
    processQueue();
  });
}

/**
 * Get current queue status (for debugging)
 */
export function getQueueStatus() {
  return {
    queueLength: queue.length,
    activeRequests,
    maxConcurrent: MAX_CONCURRENT_REQUESTS
  };
}
