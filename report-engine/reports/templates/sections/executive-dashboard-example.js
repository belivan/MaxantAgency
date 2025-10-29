/**
 * Executive Dashboard Section
 * One-page visual summary for decision makers
 */

export function generateExecutiveDashboard(analysisResult, synthesisData) {
  const {
    company_name,
    grade,
    overall_score,
    quick_wins = [],
    lead_priority
  } = analysisResult;

  const {
    consolidatedIssues = [],
    executiveSummary = {}
  } = synthesisData;

  // Calculate key metrics
  const criticalIssues = consolidatedIssues.filter(i => i.severity === 'critical').length;
  const quickWinPotential = quick_wins.length * 3; // Assume 3 points per quick win
  const estimatedTimeline = Math.ceil(consolidatedIssues.length * 0.5); // weeks
  const roiMultiple = calculateROI(overall_score);

  let html = '<div class="executive-dashboard page-break">\n';

  // Company Header
  html += `  <div class="dashboard-header">\n`;
  html += `    <h1>${escapeHtml(company_name)}</h1>\n`;
  html += `    <div class="health-score">\n`;
  html += `      <div class="score-circle grade-${grade.toLowerCase()}">\n`;
  html += `        <span class="grade">${grade}</span>\n`;
  html += `        <span class="score">${overall_score}/100</span>\n`;
  html += `      </div>\n`;
  html += `      <div class="score-bar">\n`;
  html += `        <div class="score-fill" style="width: ${overall_score}%"></div>\n`;
  html += `      </div>\n`;
  html += `      <p class="score-label">${overall_score}% Optimized</p>\n`;
  html += `    </div>\n`;
  html += `  </div>\n\n`;

  // Key Metrics Grid
  html += `  <div class="metrics-grid">\n`;
  html += `    <div class="metric-card priority">\n`;
  html += `      <span class="metric-icon">🎯</span>\n`;
  html += `      <span class="metric-label">Priority</span>\n`;
  html += `      <span class="metric-value">${getPriorityLabel(lead_priority)}</span>\n`;
  html += `    </div>\n`;
  html += `    <div class="metric-card roi">\n`;
  html += `      <span class="metric-icon">💰</span>\n`;
  html += `      <span class="metric-label">ROI Potential</span>\n`;
  html += `      <span class="metric-value">${roiMultiple}x</span>\n`;
  html += `    </div>\n`;
  html += `    <div class="metric-card timeline">\n`;
  html += `      <span class="metric-icon">⏱️</span>\n`;
  html += `      <span class="metric-label">Fix Timeline</span>\n`;
  html += `      <span class="metric-value">${estimatedTimeline} weeks</span>\n`;
  html += `    </div>\n`;
  html += `  </div>\n\n`;

  // Top Critical Issues
  html += `  <div class="critical-issues">\n`;
  html += `    <h2>Top ${Math.min(3, criticalIssues)} Critical Issues</h2>\n`;
  html += `    <ol class="issue-list">\n`;

  consolidatedIssues
    .filter(issue => issue.severity === 'critical')
    .slice(0, 3)
    .forEach(issue => {
      const icon = getIssueIcon(issue.category);
      html += `      <li class="critical-issue">\n`;
      html += `        <span class="issue-icon">${icon}</span>\n`;
      html += `        <span class="issue-title">${escapeHtml(issue.title)}</span>\n`;
      html += `        <span class="issue-impact">${escapeHtml(issue.impact)}</span>\n`;
      html += `      </li>\n`;
    });

  html += `    </ol>\n`;
  html += `  </div>\n\n`;

  // Quick Win Potential
  if (quick_wins.length > 0) {
    html += `  <div class="quick-win-box">\n`;
    html += `    <h3>⚡ Quick Win Potential: <span class="highlight">High</span></h3>\n`;
    html += `    <p>${quick_wins.length} easy improvements = +${quickWinPotential} points</p>\n`;
    html += `    <div class="quick-win-preview">\n`;
    quick_wins.slice(0, 3).forEach(win => {
      html += `      <span class="quick-win-item">✓ ${win}</span>\n`;
    });
    html += `    </div>\n`;
    html += `  </div>\n\n`;
  }

  // Performance Indicators
  html += `  <div class="performance-indicators">\n`;
  html += generatePerformanceIndicators(analysisResult);
  html += `  </div>\n`;

  html += '</div>\n\n';

  return html;
}

/**
 * Generate Strategic Overview Section
 */
export function generateStrategicOverview(analysisResult, synthesisData) {
  const { executiveSummary = {} } = synthesisData;
  const {
    headline,
    overview,
    criticalFindings = [],
    roadmap = {},
    roiStatement
  } = executiveSummary;

  let html = '<div class="strategic-overview section">\n';
  html += '  <h2>Strategic Overview</h2>\n\n';

  // Executive Summary
  html += '  <div class="executive-summary">\n';
  if (headline) {
    html += `    <p class="headline"><strong>${escapeHtml(headline)}</strong></p>\n`;
  }
  if (overview) {
    html += `    <p class="overview">${escapeHtml(overview)}</p>\n`;
  }
  html += '  </div>\n\n';

  // Business Impact Analysis
  html += '  <div class="business-impact">\n';
  html += '    <h3>Business Impact Analysis</h3>\n';
  html += '    <table class="impact-table">\n';
  html += '      <thead>\n';
  html += '        <tr><th>Current State</th><th>→</th><th>After Optimization</th></tr>\n';
  html += '      </thead>\n';
  html += '      <tbody>\n';

  criticalFindings.forEach(finding => {
    if (finding.currentState && finding.futureState) {
      html += '        <tr>\n';
      html += `          <td class="current">${escapeHtml(finding.currentState)}</td>\n`;
      html += '          <td class="arrow">→</td>\n';
      html += `          <td class="future">${escapeHtml(finding.futureState)}</td>\n`;
      html += '        </tr>\n';
    }
  });

  html += '      </tbody>\n';
  html += '    </table>\n';
  html += '  </div>\n\n';

  // ROI Projection
  if (roiStatement) {
    html += '  <div class="roi-projection">\n';
    html += '    <h3>Expected Return on Investment</h3>\n';
    html += `    <p class="roi-statement">${escapeHtml(roiStatement)}</p>\n`;
    html += '  </div>\n\n';
  }

  html += '</div>\n\n';

  return html;
}

/**
 * Generate Priority Actions Section
 */
export function generatePriorityActions(analysisResult, synthesisData) {
  const { consolidatedIssues = [] } = synthesisData;

  // Group issues by severity
  const critical = consolidatedIssues.filter(i => i.severity === 'critical');
  const high = consolidatedIssues.filter(i => i.severity === 'high');
  const medium = consolidatedIssues.filter(i => i.severity === 'medium');

  let html = '<div class="priority-actions section">\n';
  html += '  <h2>Priority Actions</h2>\n\n';

  // Critical Issues
  if (critical.length > 0) {
    html += '  <div class="priority-group critical">\n';
    html += '    <h3>🔴 Critical - Fix Immediately</h3>\n';
    html += '    <p class="group-description">Issues actively hurting your business</p>\n';

    critical.forEach((issue, index) => {
      html += generatePriorityActionCard(issue, index + 1);
    });

    html += '  </div>\n\n';
  }

  // High Priority Issues
  if (high.length > 0) {
    html += '  <div class="priority-group high">\n';
    html += '    <h3>🟡 Important - Fix Soon</h3>\n';
    html += '    <p class="group-description">Issues limiting your growth</p>\n';

    high.forEach((issue, index) => {
      html += generatePriorityActionCard(issue, critical.length + index + 1);
    });

    html += '  </div>\n\n';
  }

  // Quick Wins
  const quickWins = analysisResult.quick_wins || [];
  if (quickWins.length > 0) {
    html += '  <div class="priority-group quick-wins">\n';
    html += '    <h3>🟢 Quick Wins - Easy Fixes</h3>\n';
    html += '    <p class="group-description">Low effort, high impact improvements</p>\n';
    html += '    <div class="quick-wins-grid">\n';

    quickWins.forEach(win => {
      html += `      <div class="quick-win-tile">\n`;
      html += `        <span class="check">✓</span>\n`;
      html += `        <span class="win-text">${escapeHtml(win)}</span>\n`;
      html += `        <span class="effort">~2 hours</span>\n`;
      html += `      </div>\n`;
    });

    html += '    </div>\n';
    html += '  </div>\n\n';
  }

  html += '</div>\n\n';

  return html;
}

/**
 * Generate a priority action card
 */
function generatePriorityActionCard(issue, number) {
  let html = `  <div class="action-card">\n`;
  html += `    <div class="action-number">${number}</div>\n`;
  html += `    <div class="action-content">\n`;
  html += `      <h4>${escapeHtml(issue.title)}</h4>\n`;
  html += `      <div class="action-details">\n`;
  html += `        <div class="impact">💥 Impact: ${escapeHtml(issue.impact)}</div>\n`;
  html += `        <div class="evidence">📸 Evidence: ${generateEvidenceLinks(issue.evidence)}</div>\n`;
  html += `        <div class="fix">🔧 Fix: ${escapeHtml(issue.recommendation)}</div>\n`;
  html += `        <div class="effort">⏰ Effort: ${escapeHtml(issue.effort)}</div>\n`;
  if (issue.roi) {
    html += `        <div class="roi">💰 ROI: ${escapeHtml(issue.roi)}</div>\n`;
  }
  html += `      </div>\n`;
  html += `    </div>\n`;
  html += `  </div>\n`;
  return html;
}

/**
 * Helper Functions
 */

function getPriorityLabel(score) {
  if (score >= 70) return 'High';
  if (score >= 40) return 'Medium';
  return 'Low';
}

function calculateROI(currentScore) {
  const improvementPotential = 100 - currentScore;
  if (improvementPotential > 40) return '5-10';
  if (improvementPotential > 25) return '3-5';
  if (improvementPotential > 15) return '2-3';
  return '1.5-2';
}

function getIssueIcon(category) {
  const icons = {
    'mobile': '📱',
    'seo': '🔍',
    'content': '💬',
    'performance': '🚀',
    'security': '🔒',
    'accessibility': '♿',
    'social': '👥',
    'conversion': '💳'
  };
  return icons[category?.toLowerCase()] || '⚠️';
}

function generatePerformanceIndicators(result) {
  const indicators = [
    { label: 'Mobile Ready', value: result.is_mobile_friendly, icon: '📱' },
    { label: 'Secure (HTTPS)', value: result.has_https, icon: '🔒' },
    { label: 'Fast Loading', value: result.page_load_time < 3000, icon: '🚀' },
    { label: 'SEO Optimized', value: result.seo_score > 70, icon: '🔍' },
    { label: 'Accessible', value: result.accessibility_score > 70, icon: '♿' }
  ];

  let html = '<div class="indicators">\n';
  indicators.forEach(ind => {
    const status = ind.value ? 'pass' : 'fail';
    const symbol = ind.value ? '✅' : '❌';
    html += `  <span class="indicator ${status}">${symbol} ${ind.label}</span>\n`;
  });
  html += '</div>\n';

  return html;
}

function generateEvidenceLinks(evidence = []) {
  if (!evidence.length) return 'See detailed findings';
  return evidence.map(ref => `<a href="#${ref}">Screenshot ${ref}</a>`).join(', ');
}

function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

export default {
  generateExecutiveDashboard,
  generateStrategicOverview,
  generatePriorityActions
};