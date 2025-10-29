/**
 * At a Glance Section
 *
 * One-page summary showing the most important metrics at a glance
 */

/**
 * Generate "At a Glance" summary section for HTML reports
 * @param {object} analysisResult - Full analysis result
 * @param {object} synthesisData - AI synthesis data (optional)
 * @returns {string} HTML content
 */
export function generateAtAGlanceHTML(analysisResult, synthesisData = null) {
  const {
    company_name,
    grade,
    overall_score,
    quick_wins = [],
    top_issue,
    lead_priority,
    priority_tier,
    is_mobile_friendly,
    has_https,
    page_load_time
  } = analysisResult;

  // Calculate total issues
  const totalIssues =
    (analysisResult.design_issues_desktop?.length || 0) +
    (analysisResult.design_issues_mobile?.length || 0) +
    (analysisResult.seo_issues?.length || 0) +
    (analysisResult.content_issues?.length || 0) +
    (analysisResult.social_issues?.length || 0) +
    (analysisResult.accessibility_issues?.length || 0);

  // Use consolidated issues if synthesis available
  const issueCount = synthesisData?.consolidatedIssues?.length || totalIssues;

  // Estimate fix time based on issue count and quick wins
  const estimatedWeeks = Math.ceil((issueCount * 2 + (quick_wins.length * 0.5)) / 40); // 40 hours/week

  // Get top issue text
  const topIssueText = top_issue ||
    (analysisResult.design_issues_desktop?.[0]?.title) ||
    (analysisResult.seo_issues?.[0]?.title) ||
    'Multiple areas identified';

  // Get ROI statement from synthesis or generate basic one
  let roiStatement = '3-5x return within 6 months';
  if (synthesisData?.executiveSummary?.executiveSummary?.roiStatement) {
    roiStatement = synthesisData.executiveSummary.executiveSummary.roiStatement;
  } else if (synthesisData?.executiveSummary?.roiStatement) {
    roiStatement = synthesisData.executiveSummary.roiStatement;
  }

  // Grade color
  const gradeClass = {
    'A': 'grade-a',
    'B': 'grade-b',
    'C': 'grade-c',
    'D': 'grade-d',
    'F': 'grade-f'
  }[grade] || 'grade-c';

  // Priority badge
  const priorityBadge = priority_tier || (lead_priority >= 70 ? 'High Priority' : lead_priority >= 40 ? 'Medium Priority' : 'Low Priority');

  let html = '<div class="section at-a-glance">\n';
  html += '  <h2>📊 At a Glance</h2>\n';
  html += '  <p class="text-secondary mb-3">Key metrics and priorities for this website audit</p>\n\n';

  html += '  <div class="glance-grid">\n';

  // Overall Grade
  html += '    <div class="glance-card glance-highlight">\n';
  html += '      <div class="glance-label">Overall Grade</div>\n';
  html += `      <div class="glance-value ${gradeClass}">${grade}</div>\n`;
  html += `      <div class="glance-sublabel">${overall_score}/100</div>\n`;
  html += '    </div>\n';

  // Priority
  html += '    <div class="glance-card">\n';
  html += '      <div class="glance-label">Lead Priority</div>\n';
  html += `      <div class="glance-value">${priorityBadge}</div>\n`;
  if (lead_priority) {
    html += `      <div class="glance-sublabel">${lead_priority}/100</div>\n`;
  }
  html += '    </div>\n';

  // Issue Count
  html += '    <div class="glance-card">\n';
  html += '      <div class="glance-label">Issues Found</div>\n';
  html += `      <div class="glance-value">${issueCount}</div>\n`;
  html += `      <div class="glance-sublabel">${synthesisData ? 'Consolidated' : 'Total'}</div>\n`;
  html += '    </div>\n';

  // Quick Wins
  html += '    <div class="glance-card glance-positive">\n';
  html += '      <div class="glance-label">Quick Wins</div>\n';
  html += `      <div class="glance-value">${quick_wins.length}</div>\n`;
  html += '      <div class="glance-sublabel">Easy improvements</div>\n';
  html += '    </div>\n';

  // Estimated Timeline
  html += '    <div class="glance-card">\n';
  html += '      <div class="glance-label">Est. Fix Time</div>\n';
  html += `      <div class="glance-value">${estimatedWeeks}${estimatedWeeks === 1 ? ' week' : ' weeks'}</div>\n`;
  html += '      <div class="glance-sublabel">Full implementation</div>\n';
  html += '    </div>\n';

  // Expected ROI
  html += '    <div class="glance-card glance-roi">\n';
  html += '      <div class="glance-label">Expected ROI</div>\n';
  html += `      <div class="glance-value">3-5x</div>\n`;
  html += '      <div class="glance-sublabel">Within 6 months</div>\n';
  html += '    </div>\n';

  html += '  </div>\n\n';

  // Top Issue Banner
  html += '  <div class="top-issue-banner">\n';
  html += '    <div class="top-issue-icon">⚠️</div>\n';
  html += '    <div>\n';
  html += '      <div class="top-issue-label">Top Priority Issue</div>\n';
  html += `      <div class="top-issue-text">${escapeHtml(topIssueText)}</div>\n`;
  html += '    </div>\n';
  html += '  </div>\n\n';

  // Technical Health Indicators
  html += '  <div class="health-indicators">\n';
  html += '    <h3>Technical Health</h3>\n';
  html += '    <div class="indicators-grid">\n';

  // Mobile Friendly
  const mobileIcon = is_mobile_friendly ? '✓' : '✗';
  const mobileClass = is_mobile_friendly ? 'indicator-good' : 'indicator-bad';
  html += `      <div class="indicator ${mobileClass}">\n`;
  html += `        <span class="indicator-icon">${mobileIcon}</span>\n`;
  html += '        <span>Mobile-Friendly</span>\n';
  html += '      </div>\n';

  // HTTPS
  const httpsIcon = has_https ? '✓' : '✗';
  const httpsClass = has_https ? 'indicator-good' : 'indicator-bad';
  html += `      <div class="indicator ${httpsClass}">\n`;
  html += `        <span class="indicator-icon">${httpsIcon}</span>\n`;
  html += '        <span>HTTPS Secure</span>\n';
  html += '      </div>\n';

  // Page Speed
  let speedIcon = '✓';
  let speedClass = 'indicator-good';
  let speedLabel = 'Fast';
  if (page_load_time) {
    if (page_load_time > 3000) {
      speedIcon = '✗';
      speedClass = 'indicator-bad';
      speedLabel = `Slow (${(page_load_time / 1000).toFixed(1)}s)`;
    } else if (page_load_time > 2000) {
      speedIcon = '⚠';
      speedClass = 'indicator-warning';
      speedLabel = `OK (${(page_load_time / 1000).toFixed(1)}s)`;
    } else {
      speedLabel = `Fast (${(page_load_time / 1000).toFixed(1)}s)`;
    }
  }
  html += `      <div class="indicator ${speedClass}">\n`;
  html += `        <span class="indicator-icon">${speedIcon}</span>\n`;
  html += `        <span>Page Speed: ${speedLabel}</span>\n`;
  html += '      </div>\n';

  html += '    </div>\n';
  html += '  </div>\n';

  html += '</div>\n\n';

  return html;
}

/**
 * Generate "At a Glance" summary section for Markdown reports
 * @param {object} analysisResult - Full analysis result
 * @param {object} synthesisData - AI synthesis data (optional)
 * @returns {string} Markdown content
 */
export function generateAtAGlanceMarkdown(analysisResult, synthesisData = null) {
  const {
    company_name,
    grade,
    overall_score,
    quick_wins = [],
    top_issue,
    lead_priority,
    priority_tier,
    is_mobile_friendly,
    has_https,
    page_load_time
  } = analysisResult;

  // Calculate total issues
  const totalIssues =
    (analysisResult.design_issues_desktop?.length || 0) +
    (analysisResult.design_issues_mobile?.length || 0) +
    (analysisResult.seo_issues?.length || 0) +
    (analysisResult.content_issues?.length || 0) +
    (analysisResult.social_issues?.length || 0) +
    (analysisResult.accessibility_issues?.length || 0);

  // Use consolidated issues if synthesis available
  const issueCount = synthesisData?.consolidatedIssues?.length || totalIssues;

  // Estimate fix time based on issue count and quick wins
  const estimatedWeeks = Math.ceil((issueCount * 2 + (quick_wins.length * 0.5)) / 40); // 40 hours/week

  // Get top issue text
  const topIssueText = top_issue ||
    (analysisResult.design_issues_desktop?.[0]?.title) ||
    (analysisResult.seo_issues?.[0]?.title) ||
    'Multiple areas identified';

  // Get ROI statement from synthesis or generate basic one
  let roiStatement = '3-5x return within 6 months';
  if (synthesisData?.executiveSummary?.executiveSummary?.roiStatement) {
    roiStatement = synthesisData.executiveSummary.executiveSummary.roiStatement;
  } else if (synthesisData?.executiveSummary?.roiStatement) {
    roiStatement = synthesisData.executiveSummary.roiStatement;
  }

  // Priority badge
  const priorityBadge = priority_tier || (lead_priority >= 70 ? 'High Priority' : lead_priority >= 40 ? 'Medium Priority' : 'Low Priority');

  let markdown = '## 📊 At a Glance\n\n';
  markdown += '_Key metrics and priorities for this website audit_\n\n';

  // Key Metrics Table
  markdown += '### Key Metrics\n\n';
  markdown += '| Metric | Value | Details |\n';
  markdown += '|--------|-------|----------|\n';
  markdown += `| **Overall Grade** | **${grade}** | ${overall_score}/100 |\n`;
  markdown += `| **Lead Priority** | ${priorityBadge} | ${lead_priority ? lead_priority + '/100' : 'N/A'} |\n`;
  markdown += `| **Issues Found** | ${issueCount} | ${synthesisData ? 'Consolidated' : 'Total'} issues |\n`;
  markdown += `| **Quick Wins** | ${quick_wins.length} | Easy improvements available |\n`;
  markdown += `| **Est. Fix Time** | ${estimatedWeeks} ${estimatedWeeks === 1 ? 'week' : 'weeks'} | Full implementation |\n`;
  markdown += `| **Expected ROI** | 3-5x | Within 6 months |\n`;
  markdown += '\n';

  // Top Priority Issue
  markdown += '### ⚠️ Top Priority Issue\n\n';
  markdown += `> **${topIssueText}**\n\n`;

  // Technical Health Status
  markdown += '### Technical Health Status\n\n';

  // Mobile Friendly
  const mobileStatus = is_mobile_friendly ? '✅ Mobile-Friendly' : '❌ Not Mobile-Friendly';
  markdown += `- ${mobileStatus}\n`;

  // HTTPS
  const httpsStatus = has_https ? '✅ HTTPS Secure' : '❌ No HTTPS';
  markdown += `- ${httpsStatus}\n`;

  // Page Speed
  let speedStatus;
  if (page_load_time) {
    const loadTimeSeconds = (page_load_time / 1000).toFixed(1);
    if (page_load_time > 3000) {
      speedStatus = `❌ Page Speed: Slow (${loadTimeSeconds}s)`;
    } else if (page_load_time > 2000) {
      speedStatus = `⚠️ Page Speed: OK (${loadTimeSeconds}s)`;
    } else {
      speedStatus = `✅ Page Speed: Fast (${loadTimeSeconds}s)`;
    }
  } else {
    speedStatus = '⏱️ Page Speed: Not measured';
  }
  markdown += `- ${speedStatus}\n`;

  markdown += '\n---\n\n';

  return markdown;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  if (!text || typeof text !== 'string') return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}
