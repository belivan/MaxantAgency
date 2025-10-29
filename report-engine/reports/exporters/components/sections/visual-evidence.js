/**
 * Visual Evidence Section Component
 * Displays desktop and mobile screenshots of the analyzed website
 */

import { escapeHtml } from '../utils/helpers.js';

/**
 * Generate visual evidence section HTML
 * @param {Object} screenshotData - Screenshot data with dataUri arrays
 * @param {Object} registry - Screenshot registry for linking
 * @param {Object} options - Generation options
 * @returns {string} HTML string for visual evidence section
 */
export function generateVisualEvidence(screenshotData, registry = {}, options = {}) {
  const { reportType = 'full' } = options;

  let html = '    <!-- Visual Evidence -->\n';
  html += '    <section class="section" id="screenshots">\n';
  html += '      <div class="section-header">\n';
  html += '        <h2 class="section-title">\n';
  html += '          <span class="section-title-icon">📸</span>\n';
  html += '          Current State\n';
  html += '        </h2>\n';
  html += '      </div>\n';

  html += '      <div class="screenshots-grid">\n';

  // Show only desktop and mobile views (not every page)
  const mainScreenshots = screenshotData.screenshots.filter(s =>
    s.title === 'Desktop View' || s.title === 'Mobile View'
  ).slice(0, 2);

  mainScreenshots.forEach(screenshot => {
    html += '        <div class="screenshot-card">\n';
    html += `          <img src="${screenshot.dataUri}" alt="${escapeHtml(screenshot.title)}" class="screenshot-image">\n`;
    html += `          <div class="screenshot-caption">${escapeHtml(screenshot.title)}</div>\n`;
    html += '        </div>\n';
  });

  html += '      </div>\n';
  html += '    </section>\n\n';
  return html;
}
