/**
 * Promise Timeout Utility
 *
 * Wraps promises with timeout to prevent hanging indefinitely.
 */

/**
 * Wrap a promise with a timeout
 *
 * @param {Promise} promise - The promise to wrap
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} errorMessage - Error message if timeout occurs
 * @returns {Promise} Promise that rejects on timeout
 */
export function withTimeout(promise, timeoutMs, errorMessage = 'Operation timed out') {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${errorMessage} (${timeoutMs}ms)`)), timeoutMs)
    )
  ]);
}

/**
 * Wrap an async function with timeout
 *
 * @param {Function} fn - Async function to wrap
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Function} Wrapped function with timeout
 */
export function withTimeoutFn(fn, timeoutMs) {
  return async (...args) => {
    return withTimeout(
      fn(...args),
      timeoutMs,
      `Function ${fn.name || 'anonymous'} timed out`
    );
  };
}
