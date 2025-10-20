import { logDebug } from './logger.js';

/**
 * Rate Limiter
 *
 * Prevents overwhelming APIs with too many concurrent requests.
 * Implements token bucket algorithm with configurable limits.
 */

class RateLimiter {
  constructor(maxConcurrent = 5, delayMs = 1000) {
    this.maxConcurrent = maxConcurrent;
    this.delayMs = delayMs;
    this.activeRequests = 0;
    this.queue = [];
    this.lastRequestTime = 0;
  }

  /**
   * Execute a function with rate limiting
   *
   * @param {Function} fn - Async function to execute
   * @returns {Promise} Result of the function
   */
  async execute(fn) {
    // Wait if at max concurrency
    while (this.activeRequests >= this.maxConcurrent) {
      await this.sleep(100);
    }

    // Wait for delay between requests
    const timeSinceLastRequest = Date.now() - this.lastRequestTime;
    if (timeSinceLastRequest < this.delayMs) {
      await this.sleep(this.delayMs - timeSinceLastRequest);
    }

    this.activeRequests++;
    this.lastRequestTime = Date.now();

    logDebug('Rate limiter: executing request', {
      active: this.activeRequests,
      max: this.maxConcurrent
    });

    try {
      const result = await fn();
      return result;
    } finally {
      this.activeRequests--;
    }
  }

  /**
   * Sleep for specified milliseconds
   *
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current status
   *
   * @returns {object} Status object
   */
  getStatus() {
    return {
      activeRequests: this.activeRequests,
      maxConcurrent: this.maxConcurrent,
      delayMs: this.delayMs
    };
  }
}

// Export singleton instances for different services
export const googleMapsLimiter = new RateLimiter(
  parseInt(process.env.MAX_CONCURRENT_REQUESTS) || 5,
  parseInt(process.env.REQUEST_DELAY_MS) || 1000
);

export const generalLimiter = new RateLimiter(10, 500);

export default RateLimiter;
