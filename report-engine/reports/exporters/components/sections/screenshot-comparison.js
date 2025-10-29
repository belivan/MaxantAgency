/**
 * Screenshot Comparison Section Component
 *
 * Displays side-by-side visual comparisons:
 * - Desktop view: Your website vs. Benchmark (max-height: 400px)
 * - Mobile view: Your website vs. Benchmark (max-height: 500px)
 * - Screenshots use object-fit: cover with object-position: top
 */

import { escapeHtml } from '../utils/helpers.js';

/**
 * Generate Side-by-Side Screenshot Comparison Section
 * @param {Object} analysisResult - Complete analysis data
 * @param {Object} screenshotData - Processed screenshot data with dataUris
 * @param {Object} options - Configuration options
 * @returns {string} HTML section
 */
export function generateSideBySideComparison(analysisResult, screenshotData, options = {}) {
  const { reportType = 'full' } = options;
  const { matched_benchmark } = analysisResult;

  if (!matched_benchmark) {
    return '';
  }

  // Check if we have screenshot data available
  const hasScreenshots = screenshotData && screenshotData.screenshots && screenshotData.screenshots.length > 0;
  const hasBenchmarkScreenshots = screenshotData && screenshotData.benchmarkScreenshots && screenshotData.benchmarkScreenshots.length > 0;

  if (!hasScreenshots || !hasBenchmarkScreenshots) {
    return '';
  }

  let html = '';
  html += '    <!-- Side-by-Side Screenshot Comparison -->\n';
  html += '    <section class="section" id="screenshot-comparison">\n';
  html += '      <div class="section-header">\n';
  html += '        <h2 class="section-title" style="font-size: 1.5rem; font-weight: bold;">\n';
  html += '          <span class="section-title-icon">📸</span>\n';
  html += '          Visual Comparison\n';
  html += '        </h2>\n';
  html += `        <p class="section-description">Side-by-side comparison with ${escapeHtml(matched_benchmark.company_name)} showing design differences and opportunities.</p>\n`;
  html += '      </div>\n\n';

  // Find screenshots
  const yourDesktopScreenshot = screenshotData.screenshots.find(s => s.device === 'desktop');
  const yourMobileScreenshot = screenshotData.screenshots.find(s => s.device === 'mobile');
  const benchmarkDesktopScreenshot = screenshotData.benchmarkScreenshots?.find(s => s.device === 'desktop');
  const benchmarkMobileScreenshot = screenshotData.benchmarkScreenshots?.find(s => s.device === 'mobile');

  // Desktop Comparison
  if (yourDesktopScreenshot?.dataUri && benchmarkDesktopScreenshot?.dataUri) {
    html += '      <div style="margin-bottom: 48px;">\n';
    html += '        <h3 style="font-size: 1.3rem; font-weight: 600; margin-bottom: 20px; color: var(--text-primary);">Desktop View</h3>\n';
    html += '        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 24px; justify-content: center; margin: 0 auto; max-width: 1200px;">\n';

    // Your Website
    html += '          <div style="background: var(--bg-secondary); border-radius: 12px; overflow: hidden; border: 2px solid var(--border-default);">\n';
    html += '            <div style="padding: 16px; background: var(--bg-tertiary); border-bottom: 2px solid rgba(255, 255, 255, 0.1);">\n';
    html += '              <div style="font-weight: 600; font-size: 1rem; color: var(--text-primary);">Your Website</div>\n';
    html += '            </div>\n';
    html += '            <div style="padding: 0;">\n';
    html += `              <img src="${yourDesktopScreenshot.dataUri}" alt="Your Website - Desktop" style="width: 100%; max-height: 400px; object-fit: cover; object-position: top; display: block;" />\n`;
    html += '            </div>\n';
    html += '          </div>\n';

    // Benchmark Website
    html += '          <div style="background: var(--bg-secondary); border-radius: 12px; overflow: hidden; border: 2px solid var(--primary);">\n';
    html += '            <div style="padding: 16px; background: var(--primary-lightest); border-bottom: 2px solid var(--primary);">\n';
    html += `              <div style="font-weight: 600; font-size: 1rem; color: var(--primary);">${escapeHtml(matched_benchmark.company_name)} (Benchmark)</div>\n`;
    html += '            </div>\n';
    html += '            <div style="padding: 0;">\n';
    html += `              <img src="${benchmarkDesktopScreenshot.dataUri}" alt="${escapeHtml(matched_benchmark.company_name)} - Desktop" style="width: 100%; max-height: 400px; object-fit: cover; object-position: top; display: block;" />\n`;
    html += '            </div>\n';
    html += '          </div>\n';

    html += '        </div>\n';
    html += '      </div>\n';
  }

  // Mobile Comparison
  if (yourMobileScreenshot?.dataUri && benchmarkMobileScreenshot?.dataUri) {
    html += '      <div>\n';
    html += '        <h3 style="font-size: 1.3rem; font-weight: 600; margin-bottom: 20px; color: var(--text-primary);">Mobile View</h3>\n';
    html += '        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 24px; max-width: 500px; justify-content: center; margin: 0 auto;">\n';

    // Your Website
    html += '          <div style="background: var(--bg-secondary); border-radius: 12px; overflow: hidden; border: 2px solid var(--border-default);">\n';
    html += '            <div style="padding: 16px; background: var(--bg-tertiary); border-bottom: 2px solid rgba(255, 255, 255, 0.1);">\n';
    html += '              <div style="font-weight: 600; font-size: 1rem; color: var(--text-primary);">Your Website</div>\n';
    html += '            </div>\n';
    html += '            <div style="padding: 0;">\n';
    html += `              <img src="${yourMobileScreenshot.dataUri}" alt="Your Website - Mobile" style="width: 100%; max-height: 500px; object-fit: cover; object-position: top; display: block;" />\n`;
    html += '            </div>\n';
    html += '          </div>\n';

    // Benchmark Website
    html += '          <div style="background: var(--bg-secondary); border-radius: 12px; overflow: hidden; border: 2px solid var(--primary);">\n';
    html += '            <div style="padding: 16px; background: var(--primary-lightest); border-bottom: 2px solid var(--primary);">\n';
    html += `              <div style="font-weight: 600; font-size: 1rem; color: var(--primary);">${escapeHtml(matched_benchmark.company_name)} (Benchmark)</div>\n`;
    html += '            </div>\n';
    html += '            <div style="padding: 0;">\n';
    html += `              <img src="${benchmarkMobileScreenshot.dataUri}" alt="${escapeHtml(matched_benchmark.company_name)} - Mobile" style="width: 100%; max-height: 500px; object-fit: cover; object-position: top; display: block;" />\n`;
    html += '            </div>\n';
    html += '          </div>\n';

    html += '        </div>\n';
    html += '      </div>\n';
  }

  html += '    </section>\n\n';
  return html;
}
