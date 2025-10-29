/**
 * Action Plan Section Component
 * Generates priority action plan with top 5-7 critical improvements ranked by business impact
 */

import { escapeHtml, extractTopIssues } from '../utils/helpers.js';

/**
 * Generate action plan section HTML
 * @param {Object} analysisResult - Full analysis result data
 * @param {Object} synthesisData - Optional AI synthesis data with consolidated issues
 * @param {Object} options - Generation options
 * @returns {string} HTML string for action plan section
 */
export function generateActionPlan(analysisResult, synthesisData = {}, options = {}) {
  const { reportType = 'full' } = options;

  let html = '';
  html += '    <!-- Action Plan -->\n';
  html += '    <section class="section" id="actions">\n';
  html += '      <div class="section-header">\n';
  html += '        <h2 class="section-title">\n';
  html += '          <span class="section-title-icon">📋</span>\n';
  html += '          Priority Action Plan\n';
  html += '        </h2>\n';
  html += '        <p class="section-description">Top 5-7 critical improvements ranked by business impact. Focus on these first for maximum ROI.</p>\n';
  html += '      </div>\n';

  html += '      <div class="actions-grid">\n';

  // Get issues (consolidated or raw)
  const issues = synthesisData.consolidatedIssues || extractTopIssues(analysisResult);

  // Group by priority
  const critical = issues.filter(i => i.severity === 'critical' || i.priority === 'critical');
  const high = issues.filter(i => (i.severity === 'high' || i.priority === 'high') && !critical.includes(i));
  const medium = issues.filter(i => (i.severity === 'medium' || i.priority === 'medium') && !critical.includes(i) && !high.includes(i));

  let actionNumber = 1;

  // Show only top 2 critical, 3 high, 2 medium to avoid repetition
  [...critical.slice(0, 2), ...high.slice(0, 3), ...medium.slice(0, 2)].forEach(issue => {
    const priority = issue.severity || issue.priority || 'medium';
    const titleText = issue.title || issue.description || 'Issue';
    // Consolidated issues use 'impact', raw issues use 'businessImpact'
    const impactText = issue.impact || issue.businessImpact || '';
    // Show description if it's different from title
    const descText = (issue.description && issue.description !== titleText) ? issue.description : impactText;

    html += `        <div class="action-card ${priority}">\n`;
    html += '          <div class="action-header">\n';
    html += `            <div class="action-number">${actionNumber++}</div>\n`;
    html += `            <h3 class="action-title">${escapeHtml(titleText)}</h3>\n`;
    html += '          </div>\n';
    html += '          <div class="action-content">\n';

    // Show description or impact if available
    if (descText) {
      html += `            <p class="action-description">${escapeHtml(descText)}</p>\n`;
    }

    if (issue.recommendation) {
      html += '            <div class="action-recommendation">\n';
      html += `              <span>→ ${escapeHtml(issue.recommendation)}</span>\n`;
      html += '            </div>\n';
    }

    html += '          </div>\n';
    html += '        </div>\n';
  });

  // Quick Wins (if available and not redundant)
  const quickWins = analysisResult.quick_wins || [];
  if (quickWins.length > 0) {
    html += '        <div class="action-card low">\n';
    html += '          <div class="action-header">\n';
    html += '            <div class="action-number">⚡</div>\n';
    html += '            <h3 class="action-title">Quick Wins</h3>\n';
    html += '          </div>\n';
    html += '          <div class="action-content">\n';
    html += '            <ul style="margin: 0; padding-left: 20px; line-height: 1.8;">\n';
    quickWins.slice(0, 5).forEach(win => {
      html += `              <li>${escapeHtml(win)}</li>\n`;
    });
    html += '            </ul>\n';
    html += '          </div>\n';
    html += '        </div>\n';
  }

  html += '      </div>\n';
  html += '    </section>\n\n';
  return html;
}
