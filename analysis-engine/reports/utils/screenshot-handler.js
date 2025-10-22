/**
 * Screenshot Handler for Reports
 * Manages screenshot URLs and embedding for different report formats
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

/**
 * Process screenshot URLs for inclusion in reports
 * Handles both local files and remote URLs
 *
 * @param {object} analysisResult - Analysis result with screenshot URLs
 * @param {string} format - Report format ('markdown' or 'html')
 * @returns {Promise<object>} Processed screenshot data
 */
export async function processScreenshots(analysisResult, format = 'markdown') {
  const result = {
    desktop: null,
    mobile: null
  };

  // Process desktop screenshot
  if (analysisResult.screenshot_desktop_url) {
    result.desktop = await processScreenshot(
      analysisResult.screenshot_desktop_url,
      'desktop',
      format
    );
  }

  // Process mobile screenshot
  if (analysisResult.screenshot_mobile_url) {
    result.mobile = await processScreenshot(
      analysisResult.screenshot_mobile_url,
      'mobile',
      format
    );
  }

  return result;
}

/**
 * Process a single screenshot
 *
 * @param {string} screenshotUrl - URL or path to screenshot
 * @param {string} type - 'desktop' or 'mobile'
 * @param {string} format - Report format
 * @returns {Promise<object>} Processed screenshot data
 */
async function processScreenshot(screenshotUrl, type, format) {
  try {
    // Check if it's a Supabase Storage URL
    if (screenshotUrl.includes('supabase.co/storage')) {
      return {
        type,
        format: 'url',
        url: screenshotUrl,
        embedded: false
      };
    }

    // Check if it's any other remote URL
    if (screenshotUrl.startsWith('http://') || screenshotUrl.startsWith('https://')) {
      return {
        type,
        format: 'url',
        url: screenshotUrl,
        embedded: false
      };
    }

    // Check if it's a local file
    if (existsSync(screenshotUrl)) {
      if (format === 'html') {
        // For HTML, embed as base64
        try {
          const buffer = await readFile(screenshotUrl);
          const base64 = buffer.toString('base64');
          const mimeType = screenshotUrl.endsWith('.png') ? 'image/png' : 'image/jpeg';

          return {
            type,
            format: 'base64',
            data: `data:${mimeType};base64,${base64}`,
            embedded: true
          };
        } catch (err) {
          console.warn(`⚠️ Could not embed ${type} screenshot: ${err.message}`);
        }
      } else {
        // For Markdown, use file path as-is
        return {
          type,
          format: 'file',
          url: screenshotUrl,
          embedded: false
        };
      }
    }

    // Fallback - return URL as-is
    return {
      type,
      format: 'url',
      url: screenshotUrl,
      embedded: false
    };

  } catch (error) {
    console.warn(`⚠️ Error processing ${type} screenshot: ${error.message}`);
    return null;
  }
}

/**
 * Format screenshot for Markdown
 *
 * @param {object} screenshot - Processed screenshot data
 * @param {string} altText - Alternative text for the image
 * @returns {string} Markdown image syntax
 */
export function formatScreenshotMarkdown(screenshot, altText = 'Screenshot') {
  if (!screenshot) return '';

  if (screenshot.url) {
    return `![${altText}](${screenshot.url})`;
  }

  // If we have base64 data but are generating markdown, we can't embed it
  // So we'll add a note instead
  if (screenshot.embedded) {
    return `*[Screenshot available in HTML format]*`;
  }

  return '';
}

/**
 * Format screenshot for HTML
 *
 * @param {object} screenshot - Processed screenshot data
 * @param {string} altText - Alternative text for the image
 * @param {object} options - HTML formatting options
 * @returns {string} HTML image tag
 */
export function formatScreenshotHTML(screenshot, altText = 'Screenshot', options = {}) {
  if (!screenshot) return '';

  const {
    className = '',
    style = 'width: 100%; display: block;',
    containerStyle = ''
  } = options;

  let imgSrc = '';

  if (screenshot.embedded && screenshot.data) {
    // Use embedded base64 data
    imgSrc = screenshot.data;
  } else if (screenshot.url) {
    // Use external URL
    imgSrc = screenshot.url;
  } else {
    return '';
  }

  // Build image tag
  let html = '';

  if (containerStyle) {
    html += `<div style="${containerStyle}">\n`;
  }

  html += `<img src="${imgSrc}" alt="${altText}"`;

  if (className) {
    html += ` class="${className}"`;
  }

  if (style) {
    html += ` style="${style}"`;
  }

  html += ' />';

  if (containerStyle) {
    html += '\n</div>';
  }

  return html;
}

/**
 * Check if screenshots should be included based on configuration
 *
 * @param {object} config - Report configuration
 * @returns {boolean} Whether to include screenshots
 */
export function shouldIncludeScreenshots(config = {}) {
  // Check environment variable
  const envSetting = process.env.INCLUDE_SCREENSHOTS;
  if (envSetting !== undefined) {
    return envSetting === 'true';
  }

  // Check config object
  if (config.includeScreenshots !== undefined) {
    return config.includeScreenshots;
  }

  // Default: include screenshots if URLs are available
  return true;
}

/**
 * Get screenshot display options based on format and type
 *
 * @param {string} format - Report format
 * @param {string} type - Screenshot type ('desktop' or 'mobile')
 * @returns {object} Display options
 */
export function getScreenshotDisplayOptions(format, type) {
  if (format === 'html') {
    if (type === 'mobile') {
      return {
        containerStyle: 'margin: 2rem auto; max-width: 375px; border: 1px solid #333; border-radius: 8px; overflow: hidden;',
        style: 'width: 100%; display: block;'
      };
    } else {
      return {
        containerStyle: 'margin: 2rem 0; border: 1px solid #333; border-radius: 8px; overflow: hidden;',
        style: 'width: 100%; display: block;'
      };
    }
  }

  return {};
}