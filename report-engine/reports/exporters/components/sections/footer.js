/**
 * Footer Section Component
 * Generates report footer with branding, date, and metadata
 */

import { formatDate } from '../utils/helpers.js';

/**
 * Generate footer section HTML
 * @param {Object} analysisResult - Full analysis result data
 * @param {Object} synthesisData - AI synthesis data (if available)
 * @param {Object} options - Generation options
 * @returns {string} HTML string for footer section
 */
export function generateFooter(analysisResult, synthesisData = null, options = {}) {
  const { reportType = 'full' } = options;

  const {
    years_in_business,
    employee_count,
    pricing_visible,
    budget_indicator,
    premium_features,
    tech_stack,
    analysis_cost,
    analysis_time
  } = analysisResult;

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  let html = '';

  // Full report has dedicated sections for all this data, so skip "Additional Insights"
  // (kept in preview report for quick summary)

  html += '    <div class="report-footer">\n';
  html += '      <div class="container">\n';
  html += '        <div class="footer-content">\n';
  html += '          <div class="footer-logo">MaxantAgency</div>\n';
  html += '          <p class="footer-text">\n';
  html += '            Professional website analysis powered by AI-driven insights.\n';
  html += `            Report generated on ${today}.\n`;
  html += '          </p>\n';
  html += '        </div>\n';
  html += '      </div>\n';
  html += '    </div>\n';
  return html;
}
