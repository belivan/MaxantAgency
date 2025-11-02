/**
 * URL Filter Utility
 *
 * Centralized URL filtering to prevent crawling downloadable files
 * Used across sitemap discovery, AI selection, and crawler modules
 */

// File extensions that should be excluded from crawling
const DOWNLOADABLE_EXTENSIONS = [
  // Documents
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.odt', '.ods', '.odp', '.rtf', '.txt', '.csv',

  // Images
  '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.bmp', '.ico',
  '.tiff', '.tif', '.heic', '.heif', '.raw',

  // Archives
  '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz',

  // Media
  '.mp4', '.mp3', '.avi', '.mkv', '.mov', '.wmv', '.flv',
  '.wav', '.flac', '.m4a', '.aac', '.ogg', '.wma',

  // Executables and installers
  '.exe', '.dmg', '.pkg', '.deb', '.rpm', '.msi', '.app',
  '.apk', '.ipa',

  // Other binary files
  '.iso', '.bin', '.dat'
];

// URL patterns to exclude (e.g., API endpoints, auth pages)
const EXCLUDED_PATTERNS = [
  // Authentication and account pages
  '/login', '/logout', '/signin', '/signout', '/register', '/signup',
  '/account', '/profile', '/settings', '/preferences',
  '/forgot-password', '/reset-password',

  // E-commerce flows
  '/cart', '/checkout', '/payment', '/order', '/invoice',
  '/add-to-cart', '/remove-from-cart',

  // Admin areas
  '/admin', '/wp-admin', '/wp-login', '/dashboard', '/cpanel',

  // API endpoints
  '/api/', '/graphql', '/.json', '/.xml',

  // Search and filters
  '?search=', '?q=', '?s=', '?filter=', '?sort=',
  '?page=', '?p=', '?id=',

  // Anchors and fragments
  '#'
];

/**
 * Check if a URL points to a downloadable file
 *
 * @param {string} url - URL to check
 * @returns {boolean} True if the URL is a downloadable file
 */
export function isDownloadableFile(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }

  const lowerUrl = url.toLowerCase();

  // Remove query parameters and anchors for extension check
  const cleanUrl = lowerUrl.split('?')[0].split('#')[0];

  return DOWNLOADABLE_EXTENSIONS.some(ext => cleanUrl.endsWith(ext));
}

/**
 * Check if a URL should be excluded from crawling
 *
 * @param {string} url - URL to check
 * @returns {boolean} True if the URL should be excluded
 */
export function shouldExcludeUrl(url) {
  if (!url || typeof url !== 'string') {
    return true; // Exclude invalid URLs
  }

  const lowerUrl = url.toLowerCase();

  // Check if it's a downloadable file
  if (isDownloadableFile(url)) {
    return true;
  }

  // Check against excluded patterns
  for (const pattern of EXCLUDED_PATTERNS) {
    if (lowerUrl.includes(pattern)) {
      return true;
    }
  }

  return false;
}

/**
 * Filter an array of URLs to remove downloadable files and excluded patterns
 *
 * @param {string[]} urls - Array of URLs to filter
 * @param {object} options - Filter options
 * @param {boolean} options.logSkipped - Whether to log skipped URLs
 * @param {string} options.logPrefix - Prefix for log messages
 * @returns {object} Object with validUrls and skippedUrls arrays
 */
export function filterUrls(urls, options = {}) {
  const {
    logSkipped = true,
    logPrefix = '[URL Filter]'
  } = options;

  const validUrls = [];
  const skippedUrls = [];

  for (const url of urls) {
    if (shouldExcludeUrl(url)) {
      skippedUrls.push(url);
      if (logSkipped) {
        if (isDownloadableFile(url)) {
          console.log(`${logPrefix} ⚠️  Skipping downloadable file: ${url}`);
        } else {
          console.log(`${logPrefix} ⚠️  Skipping excluded pattern: ${url}`);
        }
      }
    } else {
      validUrls.push(url);
    }
  }

  if (logSkipped && skippedUrls.length > 0) {
    console.log(`${logPrefix} Filtered out ${skippedUrls.length} URL(s)`);
  }

  return { validUrls, skippedUrls };
}

/**
 * Get list of excluded file extensions
 * @returns {string[]} Array of file extensions
 */
export function getExcludedExtensions() {
  return [...DOWNLOADABLE_EXTENSIONS];
}

/**
 * Get list of excluded URL patterns
 * @returns {string[]} Array of URL patterns
 */
export function getExcludedPatterns() {
  return [...EXCLUDED_PATTERNS];
}

// Default export for convenience
export default {
  isDownloadableFile,
  shouldExcludeUrl,
  filterUrls,
  getExcludedExtensions,
  getExcludedPatterns
};