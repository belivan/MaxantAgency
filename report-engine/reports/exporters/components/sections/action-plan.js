/**
 * Action Plan Section Component
 * Generates priority action plan with top 5-7 critical improvements ranked by business impact
 */

import { escapeHtml, extractTopIssues } from '../utils/helpers.js';

/**
 * Format screenshot references from SS-X IDs to human-readable format
 * @param {Array<string>} evidenceIds - Array of screenshot IDs like ["SS-1", "SS-3"]
 * @param {Array<Object>} screenshotReferences - Array of screenshot metadata
 * @returns {string} Formatted evidence string like "Homepage (Desktop), About Page (Mobile)"
 */
function formatScreenshotEvidence(evidenceIds, screenshotReferences = []) {
  if (!evidenceIds || evidenceIds.length === 0) return '';
  if (!screenshotReferences || screenshotReferences.length === 0) {
    // Fallback: just show the IDs if references aren't available
    return evidenceIds.join(', ');
  }

  const formatted = evidenceIds.map(id => {
    const ref = screenshotReferences.find(r => r.id === id);
    if (!ref) return id; // Fallback to ID if not found

    // Format as "Page Title (Viewport)"
    const title = ref.title || 'Page';
    const viewport = ref.viewport ? ref.viewport.charAt(0).toUpperCase() + ref.viewport.slice(1) : '';
    return viewport ? `${title} (${viewport})` : title;
  });

  return formatted.join(', ');
}

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

  // Check for AI-generated critical findings first (much richer data)
  const criticalFindings = synthesisData?.executiveSummary?.criticalFindings;

  if (criticalFindings && criticalFindings.length > 0) {
    // Use AI-generated critical findings with business impacts and ROI
    criticalFindings.slice(0, 7).forEach((finding, index) => {
      // Map rank to priority (1-2 = critical, 3-4 = high, 5+ = medium)
      const priority = finding.rank <= 2 ? 'critical' : finding.rank <= 4 ? 'high' : 'medium';

      html += `        <div class="action-card ${priority}">\n`;
      html += '          <div class="action-header">\n';
      html += `            <div class="action-number">${finding.rank || (index + 1)}</div>\n`;
      html += `            <h3 class="action-title">${escapeHtml(finding.issue)}</h3>\n`;
      html += '          </div>\n';
      html += '          <div class="action-content">\n';

      // Show quantified impact
      if (finding.impact) {
        html += `            <p class="action-description">${escapeHtml(finding.impact)}</p>\n`;
      }

      // Show evidence references if available (transformed from SS-X to readable format)
      if (finding.evidence && finding.evidence.length > 0) {
        const formattedEvidence = formatScreenshotEvidence(finding.evidence, synthesisData.screenshotReferences);
        if (formattedEvidence) {
          html += `            <div style="margin: 8px 0; font-size: 13px; color: var(--text-secondary);">📸 Evidence: ${escapeHtml(formattedEvidence)}</div>\n`;
        }
      }

      // Show recommendation
      if (finding.recommendation) {
        html += '            <div class="action-recommendation">\n';
        html += `              <span>→ ${escapeHtml(finding.recommendation)}</span>\n`;
        html += '            </div>\n';
      }

      // Show ROI estimate and urgency
      if (finding.estimatedValue || finding.urgency) {
        html += '            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-light);">\n';
        if (finding.estimatedValue) {
          html += `              <div style="color: var(--success); font-weight: 500; margin-bottom: 4px;">💰 ${escapeHtml(finding.estimatedValue)}</div>\n`;
        }
        if (finding.urgency) {
          html += `              <div style="color: var(--warning); font-size: 13px;">⚠️ ${escapeHtml(finding.urgency)}</div>\n`;
        }
        html += '            </div>\n';
      }

      // Add subtle source label (if available from the original issue)
      if (finding.source) {
        const sourceLabels = {
          'seo-analyzer': 'SEO',
          'content-analyzer': 'Content',
          'accessibility-analyzer': 'Accessibility',
          'social-analyzer': 'Social',
          'desktop-visual-analyzer': 'Desktop Visual',
          'mobile-visual-analyzer': 'Mobile Visual',
          'unified-visual-analyzer': 'Visual',
          'unified-technical-analyzer': 'Technical'
        };
        const sourceLabel = sourceLabels[finding.source] || finding.source;
        html += `            <div style="margin-top: 8px; text-align: right;"><span style="font-size: 0.7rem; color: #999; opacity: 0.6;">Source: ${escapeHtml(sourceLabel)}</span></div>\n`;
      }

      html += '          </div>\n';
      html += '        </div>\n';
    });
  } else {
    // Fallback to consolidated issues or raw issues
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

      // Add subtle source label
      if (issue.source) {
        const sourceLabels = {
          'seo-analyzer': 'SEO',
          'content-analyzer': 'Content',
          'accessibility-analyzer': 'Accessibility',
          'social-analyzer': 'Social',
          'desktop-visual-analyzer': 'Desktop Visual',
          'mobile-visual-analyzer': 'Mobile Visual',
          'unified-visual-analyzer': 'Visual',
          'unified-technical-analyzer': 'Technical'
        };
        const sourceLabel = sourceLabels[issue.source] || issue.source;
        html += `            <div style="margin-top: 8px; text-align: right;"><span style="font-size: 0.7rem; color: #999; opacity: 0.6;">Source: ${escapeHtml(sourceLabel)}</span></div>\n`;
      }

      html += '          </div>\n';
      html += '        </div>\n';
    });
  }

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
