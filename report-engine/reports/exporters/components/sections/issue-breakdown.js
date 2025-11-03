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
    performance_issues = [],
    social_profiles = {}
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
    // Special handling for Social Media Issues - show disclaimer if no profiles found
    const isSocialMediaCategory = category.title === 'Social Media Issues';
    const hasSocialProfiles = social_profiles && Object.keys(social_profiles).filter(key => social_profiles[key]).length > 0;
    const hasIssues = category.issues && category.issues.length > 0;

    // Show Social Media section with disclaimer if no profiles found (even if no issues)
    if (isSocialMediaCategory && !hasSocialProfiles) {
      html += `      <div style="background: var(--bg-secondary); padding: 24px; border-radius: var(--radius-lg); margin-bottom: 24px; border: 1px solid var(--border-light);">\n`;
      html += `        <h3 style="font-size: 1.2rem; font-weight: 600; margin-bottom: 16px; color: var(--text-primary);">\n`;
      html += `          ${category.icon} ${escapeHtml(category.title)}\n`;
      html += '        </h3>\n';

      // Show disclaimer
      html += '        <div style="background: var(--bg-primary); padding: 20px; border-radius: var(--radius-md); border-left: 4px solid var(--primary); border: 1px solid var(--border-light);">\n';
      html += '          <div style="display: flex; gap: 16px; align-items: start;">\n';
      html += '            <span style="font-size: 2rem; opacity: 0.6;">ℹ️</span>\n';
      html += '            <div>\n';
      html += '              <h4 style="font-weight: 600; margin: 0 0 8px 0; color: var(--text-primary);">No Social Media Profiles Found</h4>\n';
      html += '              <p style="margin: 0; opacity: 0.8; font-size: 0.95rem; line-height: 1.6; color: var(--text-secondary);">\n';
      html += '                Our analysis used <strong>Google Maps data</strong> and <strong>AI-powered web scraping</strong> to search for social media profiles, but we could not identify any active profiles for this business. This may indicate an opportunity to establish a social media presence or improve visibility of existing profiles.\n';
      html += '              </p>\n';
      html += '            </div>\n';
      html += '          </div>\n';
      html += '        </div>\n';

      // Still show issues if they exist (e.g., recommendations to add social media)
      if (hasIssues) {
        html += '        <div style="display: grid; gap: 12px; margin-top: 16px;">\n';
        category.issues.forEach((issue, idx) => {
          const severity = issue.severity || issue.priority || 'medium';
          const showColoredBadge = (severity === 'high' || severity === 'critical');
          const severityColor = severity === 'critical' ? 'var(--danger)' : 'var(--warning)';

          html += '          <div style="background: var(--bg-primary); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-light);">\n';
          html += '            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">\n';
          html += `              <h4 style="font-weight: 600; margin: 0; flex: 1; color: var(--text-primary);">${idx + 1}. ${escapeHtml(issue.title || issue.description || 'Issue')}</h4>\n`;

          if (showColoredBadge) {
            html += `              <span style="background: ${severityColor}; color: white; padding: 4px 10px; border-radius: var(--radius-lg); font-size: 0.75rem; font-weight: 600; text-transform: uppercase; margin-left: 12px;">${severity}</span>\n`;
          }

          html += '            </div>\n';

          if (issue.description && issue.title) {
            html += `            <p style="opacity: 0.7; margin: 8px 0; font-size: 0.95rem; color: var(--text-secondary);">${escapeHtml(issue.description)}</p>\n`;
          }

          if (issue.recommendation) {
            html += `            <p style="margin-top: 12px; padding: 12px; background: var(--bg-tertiary); border-radius: var(--radius-sm); font-size: 0.95rem; color: var(--text-secondary);"><strong style="color: var(--text-primary);">💡 Recommendation:</strong> ${escapeHtml(issue.recommendation)}</p>\n`;
          }

          html += '          </div>\n';
        });
        html += '        </div>\n';
      }

      html += '      </div>\n';
      return; // Skip the normal rendering for Social Media
    }

    // Normal rendering for all other categories
    if (hasIssues) {
      // Minimal styling - subtle gray border
      html += `      <div style="background: var(--bg-secondary); padding: 24px; border-radius: var(--radius-lg); margin-bottom: 24px; border: 1px solid var(--border-light);">\n`;
      html += `        <h3 style="font-size: 1.2rem; font-weight: 600; margin-bottom: 16px; color: var(--text-primary);">\n`;
      html += `          ${category.icon} ${escapeHtml(category.title)} (${category.issues.length})\n`;
      html += '        </h3>\n';

      html += '        <div style="display: grid; gap: 12px;">\n';
      category.issues.forEach((issue, idx) => {
        const severity = issue.severity || issue.priority || 'medium';

        // Only show colored badge for high/critical severity
        const showColoredBadge = (severity === 'high' || severity === 'critical');
        const severityColor = severity === 'critical' ? 'var(--danger)' : 'var(--warning)';

        // Clean minimal card with subtle gray border
        html += '          <div style="background: var(--bg-primary); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-light);">\n';
        html += '            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">\n';
        html += `              <h4 style="font-weight: 600; margin: 0; flex: 1; color: var(--text-primary);">${idx + 1}. ${escapeHtml(issue.title || issue.description || 'Issue')}</h4>\n`;

        // Only show badge for high/critical issues
        if (showColoredBadge) {
          html += `              <span style="background: ${severityColor}; color: white; padding: 4px 10px; border-radius: var(--radius-lg); font-size: 0.75rem; font-weight: 600; text-transform: uppercase; margin-left: 12px;">${severity}</span>\n`;
        }

        html += '            </div>\n';

        if (issue.description && issue.title) {
          html += `            <p style="opacity: 0.7; margin: 8px 0; font-size: 0.95rem; color: var(--text-secondary);">${escapeHtml(issue.description)}</p>\n`;
        }

        if (issue.recommendation) {
          // Minimal recommendation styling - just subtle background, no colored border
          html += `            <p style="margin-top: 12px; padding: 12px; background: var(--bg-tertiary); border-radius: var(--radius-sm); font-size: 0.95rem; color: var(--text-secondary);"><strong style="color: var(--text-primary);">💡 Recommendation:</strong> ${escapeHtml(issue.recommendation)}</p>\n`;
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
