/**
 * Complete Issue Breakdown Section - Full Report Only
 * Displays all identified issues across all analysis modules (not just top priorities).
 */

import { escapeHtml } from '../utils/helpers.js';

/**
 * Generate Complete Issue Breakdown Section
 * @param {Object} analysisResult - Complete analysis result object
 * @returns {string} HTML string for complete issue breakdown section
 */
export function generateCompleteIssueBreakdown(analysisResult) {
  const {
    design_issues_desktop = [],
    design_issues_mobile = [],
    seo_issues = [],
    content_issues = [],
    social_issues = [],
    accessibility_issues = [],
    performance_issues = []
  } = analysisResult;

  let html = '';
  html += '    <!-- Complete Issue Breakdown -->\n';
  html += '    <section class="section" id="complete-issues">\n';
  html += '      <div class="section-header">\n';
  html += '        <h2 class="section-title" style="font-size: 1.5rem; font-weight: bold;">\n';
  html += '          <span class="section-title-icon">🔍</span>\n';
  html += '          Complete Issue Breakdown\n';
  html += '        </h2>\n';
  html += '        <p class="section-description">All identified issues across all analysis modules (not just top priorities).</p>\n';
  html += '      </div>\n\n';

  const issueCategories = [
    { title: 'Desktop Design Issues', icon: '🖥️', issues: design_issues_desktop },
    { title: 'Mobile Design Issues', icon: '📱', issues: design_issues_mobile },
    { title: 'SEO Issues', icon: '🔍', issues: seo_issues },
    { title: 'Content Issues', icon: '📝', issues: content_issues },
    { title: 'Accessibility Issues', icon: '♿', issues: accessibility_issues },
    { title: 'Social Media Issues', icon: '👥', issues: social_issues },
    { title: 'Performance Issues', icon: '⚡', issues: performance_issues }
  ];

  issueCategories.forEach(category => {
    if (category.issues && category.issues.length > 0) {
      // Minimal styling - subtle gray border
      html += `      <div style="background: var(--bg-secondary); padding: 24px; border-radius: 12px; margin-bottom: 24px; border: 1px solid var(--border-light);">\n`;
      html += `        <h3 style="font-size: 1.2rem; font-weight: 600; margin-bottom: 16px; color: var(--text-primary);">\n`;
      html += `          ${category.icon} ${escapeHtml(category.title)} (${category.issues.length})\n`;
      html += '        </h3>\n';

      html += '        <div style="display: grid; gap: 12px;">\n';
      category.issues.forEach((issue, idx) => {
        const severity = issue.severity || issue.priority || 'medium';

        // Only show colored badge for high/critical severity
        const showColoredBadge = (severity === 'high' || severity === 'critical');
        const severityColor = severity === 'critical' ? '#ef4444' : '#f59e0b';

        // Clean minimal card with subtle gray border
        html += '          <div style="background: var(--bg-primary); padding: 16px; border-radius: 8px; border: 1px solid var(--border-light);">\n';
        html += '            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">\n';
        html += `              <h4 style="font-weight: 600; margin: 0; flex: 1; color: var(--text-primary);">${idx + 1}. ${escapeHtml(issue.title || issue.description || 'Issue')}</h4>\n`;

        // Only show badge for high/critical issues
        if (showColoredBadge) {
          html += `              <span style="background: ${severityColor}; color: white; padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; margin-left: 12px;">${severity}</span>\n`;
        }

        html += '            </div>\n';

        if (issue.description && issue.title) {
          html += `            <p style="opacity: 0.7; margin: 8px 0; font-size: 0.95rem; color: var(--text-secondary);">${escapeHtml(issue.description)}</p>\n`;
        }

        if (issue.recommendation) {
          // Minimal recommendation styling - just subtle background, no colored border
          html += `            <p style="margin-top: 12px; padding: 12px; background: var(--bg-tertiary); border-radius: 6px; font-size: 0.95rem; color: var(--text-secondary);"><strong style="color: var(--text-primary);">💡 Recommendation:</strong> ${escapeHtml(issue.recommendation)}</p>\n`;
        }

        html += '          </div>\n';
      });
      html += '        </div>\n';
      html += '      </div>\n';
    }
  });

  html += '    </section>\n\n';
  return html;
}
