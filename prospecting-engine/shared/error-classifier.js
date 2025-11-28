/**
 * Error Classification Utility
 *
 * Classifies crawl/scrape errors into standardized categories
 * for proper website_status tracking and error handling.
 *
 * Extracted from orchestrator.js for reusability.
 */

/**
 * Classify crawl error into error type and determine website_status
 *
 * @param {string} errorMessage - Error message from scrapeWebsite or extractFromDOM
 * @returns {object} {error_type, website_status, error_message}
 */
export function classifyError(errorMessage) {
  const msg = errorMessage.toLowerCase();

  // Antibot protection (403, bot detection, cloudflare, etc.)
  if (
    msg.includes('403') ||
    msg.includes('forbidden') ||
    msg.includes('cloudflare') ||
    msg.includes('bot') ||
    msg.includes('captcha') ||
    msg.includes('denied')
  ) {
    return {
      error_type: 'antibot',
      website_status: 'bot_protected',
      error_message: errorMessage
    };
  }

  // Timeout errors
  if (
    msg.includes('timeout') ||
    msg.includes('timed out') ||
    msg.includes('navigation timeout')
  ) {
    return {
      error_type: 'timeout',
      website_status: 'timeout',
      error_message: errorMessage
    };
  }

  // SSL/Certificate errors
  if (
    msg.includes('ssl') ||
    msg.includes('certificate') ||
    msg.includes('cert') ||
    msg.includes('https')
  ) {
    return {
      error_type: 'ssl',
      website_status: 'ssl_error',
      error_message: errorMessage
    };
  }

  // Network errors (DNS, connection refused, etc.)
  if (
    msg.includes('enotfound') ||
    msg.includes('dns') ||
    msg.includes('connection') ||
    msg.includes('econnrefused') ||
    msg.includes('net::')
  ) {
    return {
      error_type: 'network',
      website_status: 'not_found',
      error_message: errorMessage
    };
  }

  // 404 / Not Found
  if (msg.includes('404') || msg.includes('not found')) {
    return {
      error_type: 'not_found',
      website_status: 'not_found',
      error_message: errorMessage
    };
  }

  // Unknown error
  return {
    error_type: 'unknown',
    website_status: 'timeout', // Default to timeout for unknown errors
    error_message: errorMessage
  };
}

export default { classifyError };
