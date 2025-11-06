/**
 * Path Utilities - Cross-platform file path sanitization
 *
 * Ensures file paths are valid on all operating systems (Windows, macOS, Linux)
 */

/**
 * Sanitize a string for use in file paths
 *
 * Removes characters that are invalid on Windows (most restrictive):
 * < > : " / \ | ? *
 *
 * Also handles:
 * - Multiple consecutive spaces/hyphens
 * - Leading/trailing hyphens
 * - Empty strings
 * - Very long strings
 *
 * @param {string} input - Raw string (e.g., company name, project name)
 * @param {Object} options - Sanitization options
 * @param {number} options.maxLength - Maximum length (default: 200)
 * @param {string} options.fallback - Fallback if empty after sanitization (default: "untitled")
 * @returns {string} Sanitized string safe for file paths
 *
 * @example
 * sanitizeForFilePath("Hartford Dental: Dr. Smith")
 * // Returns: "hartford-dental-dr-smith"
 *
 * sanitizeForFilePath("C:/Users/Test")
 * // Returns: "c-users-test"
 *
 * sanitizeForFilePath("  Multiple   Spaces  ")
 * // Returns: "multiple-spaces"
 */
export function sanitizeForFilePath(input, options = {}) {
  const {
    maxLength = 200,
    fallback = 'untitled'
  } = options;

  if (!input || typeof input !== 'string') {
    return fallback;
  }

  let sanitized = input
    .toLowerCase()
    .trim()
    // Remove Windows-invalid characters: < > : " / \ | ? *
    .replace(/[<>:"/\\|?*]+/g, '')
    // Replace spaces with hyphens
    .replace(/\s+/g, '-')
    // Remove other problematic characters (keep alphanumeric, hyphens, underscores, periods)
    .replace(/[^a-z0-9\-_.]+/g, '')
    // Collapse multiple hyphens
    .replace(/-+/g, '-')
    // Collapse multiple underscores
    .replace(/_+/g, '_')
    // Collapse multiple periods
    .replace(/\.+/g, '.')
    // Remove leading/trailing hyphens, underscores, periods
    .replace(/^[-_.]+|[-_.]+$/g, '');

  // Truncate to max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
    // Remove trailing hyphen if truncation created one
    sanitized = sanitized.replace(/[-_.]+$/, '');
  }

  // Return fallback if empty after sanitization
  return sanitized || fallback;
}

/**
 * Sanitize a full file path (directory + filename)
 *
 * @param {string} input - Raw file path
 * @param {Object} options - Sanitization options (passed to sanitizeForFilePath)
 * @returns {string} Sanitized file path
 *
 * @example
 * sanitizePath("My Company: Inc/reports/Q1 Report")
 * // Returns: "my-company-inc/reports/q1-report"
 */
export function sanitizePath(input, options = {}) {
  if (!input || typeof input !== 'string') {
    return options.fallback || 'untitled';
  }

  // Split on both forward and back slashes
  const parts = input.split(/[/\\]/);

  // Sanitize each part separately
  const sanitizedParts = parts
    .map(part => sanitizeForFilePath(part, options))
    .filter(part => part !== options.fallback && part !== '');

  return sanitizedParts.join('/');
}

/**
 * Create a URL-safe slug from a string
 * Similar to sanitizeForFilePath but more strict
 *
 * @param {string} input - Raw string
 * @param {Object} options - Sanitization options
 * @returns {string} URL-safe slug
 *
 * @example
 * createSlug("Hello World!")
 * // Returns: "hello-world"
 */
export function createSlug(input, options = {}) {
  const {
    maxLength = 100,
    fallback = 'untitled'
  } = options;

  if (!input || typeof input !== 'string') {
    return fallback;
  }

  let slug = input
    .toLowerCase()
    .trim()
    // Remove all non-alphanumeric except spaces and hyphens
    .replace(/[^a-z0-9\s-]+/g, '')
    // Replace spaces with hyphens
    .replace(/\s+/g, '-')
    // Collapse multiple hyphens
    .replace(/-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '');

  // Truncate to max length
  if (slug.length > maxLength) {
    slug = slug.substring(0, maxLength);
    slug = slug.replace(/-+$/, '');
  }

  return slug || fallback;
}
