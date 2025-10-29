/**
 * Executive Dashboard Section
 * ===========================
 * One-page visual summary designed for C-suite executives
 * Pure high-level metrics without detailed issue listings
 *
 * Features:
 * - Visual grade display with progress bar
 * - 3 key business metrics (Priority, ROI, Timeline)
 * - Technical health status badges
 * - Analysis coverage indicator
 *
 * Note: Detailed issues are shown in Priority Actions section
 */

/**
 * Generate the executive dashboard HTML
 * @param {Object} analysisResult - Complete analysis data
 * @param {Object} synthesisData - AI synthesis results
 * @returns {string} HTML for executive dashboard
 */
export function generateExecutiveDashboard(analysisResult, synthesisData = {}) {
  const {
    company_name,
    industry,
    grade,
    overall_score,
    quick_wins = [],
    lead_priority,
    design_score_desktop,
    design_score_mobile,
    seo_score,
    content_score,
    social_score,
    accessibility_score,
    is_mobile_friendly,
    has_https,
    page_load_time,
    pages_analyzed
  } = analysisResult;

  const {
    consolidatedIssues = [],
    executiveSummary = {}
  } = synthesisData;

  // Calculate metrics
  const criticalIssues = consolidatedIssues.filter(i =>
    i.severity === 'critical' || i.priority === 'critical'
  );
  const highPriorityIssues = consolidatedIssues.filter(i =>
    i.severity === 'high' || i.priority === 'high'
  );

  const quickWinCount = quick_wins.length;
  const quickWinPoints = Math.round(quickWinCount * 3); // Estimate 3 points per quick win
  const potentialScore = Math.min(100, overall_score + quickWinPoints);

  // Calculate timeline based on issues
  const criticalWeeks = criticalIssues.length * 1;
  const highWeeks = highPriorityIssues.length * 0.5;
  const quickWinWeeks = 1; // All quick wins in first week
  const estimatedWeeks = Math.ceil(criticalWeeks + highWeeks + quickWinWeeks);

  // Calculate ROI multiplier
  const roiMultiple = calculateROIMultiple(overall_score, potentialScore);

  // Determine priority level
  const priorityInfo = getPriorityInfo(lead_priority);

  let html = '<div class="executive-dashboard page-break-after">\n';

  // Header with company name and overall health
  html += '  <div class="dashboard-header">\n';
  html += `    <h1 class="company-title">${escapeHtml(company_name)}</h1>\n`;
  if (industry) {
    html += `    <p class="company-industry">${escapeHtml(industry)} Industry</p>\n`;
  }
  html += '  </div>\n\n';

  // Visual Health Score
  html += '  <div class="health-score-section">\n';
  html += `    <div class="score-display">\n`;
  html += `      <div class="score-circle grade-${grade.toLowerCase()}">\n`;
  html += `        <div class="score-content">\n`;
  html += `          <span class="grade-letter">${grade}</span>\n`;
  html += `          <span class="score-number">${overall_score}/100</span>\n`;
  html += `        </div>\n`;
  html += `      </div>\n`;
  html += `      <div class="score-details">\n`;
  html += `        <h2 class="score-title">Overall Website Health</h2>\n`;
  html += `        <div class="score-bar-container">\n`;
  html += `          <div class="score-bar">\n`;
  html += `            <div class="score-fill" style="width: ${overall_score}%"></div>\n`;
  if (quickWinCount > 0) {
    html += `            <div class="score-potential" style="width: ${potentialScore}%; opacity: 0.3;"></div>\n`;
  }
  html += `          </div>\n`;
  html += `          <div class="score-labels">\n`;
  html += `            <span class="current-score">Current: ${overall_score}%</span>\n`;
  if (quickWinCount > 0) {
    html += `            <span class="potential-score">Potential: ${potentialScore}%</span>\n`;
  }
  html += `          </div>\n`;
  html += `        </div>\n`;
  html += `      </div>\n`;
  html += `    </div>\n`;
  html += '  </div>\n\n';

  // Key Business Metrics
  html += '  <div class="key-metrics">\n';

  // Priority Metric
  html += '    <div class="metric-card priority-metric">\n';
  html += `      <div class="metric-icon">${priorityInfo.icon}</div>\n`;
  html += '      <div class="metric-content">\n';
  html += '        <div class="metric-label">Lead Priority</div>\n';
  html += `        <div class="metric-value ${priorityInfo.class}">${priorityInfo.label}</div>\n`;
  if (lead_priority) {
    html += `        <div class="metric-detail">Score: ${lead_priority}/100</div>\n`;
  }
  html += '      </div>\n';
  html += '    </div>\n';

  // ROI Metric
  html += '    <div class="metric-card roi-metric">\n';
  html += '      <div class="metric-icon">💰</div>\n';
  html += '      <div class="metric-content">\n';
  html += '        <div class="metric-label">ROI Potential</div>\n';
  html += `        <div class="metric-value">${roiMultiple}x</div>\n`;
  html += '        <div class="metric-detail">in 6 months</div>\n';
  html += '      </div>\n';
  html += '    </div>\n';

  // Timeline Metric
  html += '    <div class="metric-card timeline-metric">\n';
  html += '      <div class="metric-icon">⏱️</div>\n';
  html += '      <div class="metric-content">\n';
  html += '        <div class="metric-label">Fix Timeline</div>\n';
  html += `        <div class="metric-value">${estimatedWeeks} ${estimatedWeeks === 1 ? 'week' : 'weeks'}</div>\n`;
  html += '        <div class="metric-detail">full implementation</div>\n';
  html += '      </div>\n';
  html += '    </div>\n';

  html += '  </div>\n\n';

  // NOTE: Critical Issues and Quick Wins detail sections removed
  // to eliminate redundancy with Priority Actions section.
  // Dashboard now focuses on high-level metrics only.
  
  // Performance Status Indicators
  html += '  <div class="performance-indicators">\n';
  html += '    <h3 class="section-title">Technical Health Status</h3>\n';
  html += '    <div class="indicators-grid">\n';

  // Mobile Status
  const mobileStatus = getMobileStatus(is_mobile_friendly, design_score_mobile);
  html += `      <div class="indicator ${mobileStatus.class}">\n`;
  html += `        <span class="indicator-icon">${mobileStatus.icon}</span>\n`;
  html += `        <span class="indicator-label">Mobile Experience</span>\n`;
  html += `        <span class="indicator-value">${mobileStatus.text}</span>\n`;
  html += '      </div>\n';

  // Security Status
  html += `      <div class="indicator ${has_https ? 'status-good' : 'status-bad'}">\n`;
  html += `        <span class="indicator-icon">${has_https ? '✅' : '❌'}</span>\n`;
  html += '        <span class="indicator-label">Security (HTTPS)</span>\n';
  html += `        <span class="indicator-value">${has_https ? 'Secure' : 'Not Secure'}</span>\n`;
  html += '      </div>\n';

  // Speed Status
  const speedStatus = getSpeedStatus(page_load_time);
  html += `      <div class="indicator ${speedStatus.class}">\n`;
  html += `        <span class="indicator-icon">${speedStatus.icon}</span>\n`;
  html += '        <span class="indicator-label">Page Speed</span>\n';
  html += `        <span class="indicator-value">${speedStatus.text}</span>\n`;
  html += '      </div>\n';

  // SEO Status
  const seoStatus = getScoreStatus(seo_score, 'SEO');
  html += `      <div class="indicator ${seoStatus.class}">\n`;
  html += `        <span class="indicator-icon">${seoStatus.icon}</span>\n`;
  html += '        <span class="indicator-label">Search Visibility</span>\n';
  html += `        <span class="indicator-value">${seoStatus.text}</span>\n`;
  html += '      </div>\n';

  // Accessibility Status
  const a11yStatus = getScoreStatus(accessibility_score, 'Accessibility');
  html += `      <div class="indicator ${a11yStatus.class}">\n`;
  html += `        <span class="indicator-icon">${a11yStatus.icon}</span>\n`;
  html += '        <span class="indicator-label">Accessibility</span>\n';
  html += `        <span class="indicator-value">${a11yStatus.text}</span>\n`;
  html += '      </div>\n';

  // Content Quality
  const contentStatus = getScoreStatus(content_score, 'Content');
  html += `      <div class="indicator ${contentStatus.class}">\n`;
  html += `        <span class="indicator-icon">${contentStatus.icon}</span>\n`;
  html += '        <span class="indicator-label">Content Quality</span>\n';
  html += `        <span class="indicator-value">${contentStatus.text}</span>\n`;
  html += '      </div>\n';

  html += '    </div>\n';
  html += '  </div>\n\n';

  // Analysis Coverage Note
  if (pages_analyzed) {
    html += '  <div class="coverage-note">\n';
    html += `    <p>Analysis based on ${pages_analyzed} ${pages_analyzed === 1 ? 'page' : 'pages'}</p>\n`;
    html += '  </div>\n';
  }

  html += '</div>\n\n';

  return html;
}

/**
 * Helper Functions
 */

function calculateROIMultiple(currentScore, potentialScore) {
  const improvement = potentialScore - currentScore;

  if (improvement >= 30) return '5-10';
  if (improvement >= 20) return '3-5';
  if (improvement >= 10) return '2-3';
  if (improvement >= 5) return '1.5-2';
  return '1.2-1.5';
}

function getPriorityInfo(score) {
  if (!score) {
    return { label: 'Not Scored', class: 'priority-unknown', icon: '❓' };
  }
  if (score >= 70) {
    return { label: 'High Priority', class: 'priority-high', icon: '🔥' };
  }
  if (score >= 40) {
    return { label: 'Medium Priority', class: 'priority-medium', icon: '🎯' };
  }
  return { label: 'Low Priority', class: 'priority-low', icon: '💤' };
}

function getCategoryIcon(category) {
  const icons = {
    'mobile': '📱',
    'desktop': '💻',
    'seo': '🔍',
    'content': '📝',
    'performance': '🚀',
    'security': '🔒',
    'accessibility': '♿',
    'social': '👥',
    'conversion': '💳',
    'trust': '🛡️',
    'navigation': '🧭',
    'design': '🎨'
  };
  return icons[category?.toLowerCase()] || '⚠️';
}

function getGradeFromScore(score) {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

function getMobileStatus(isMobileFriendly, mobileScore) {
  if (isMobileFriendly === false || (mobileScore && mobileScore < 50)) {
    return {
      icon: '❌',
      text: 'Critical Issues',
      class: 'status-bad'
    };
  }
  if (mobileScore && mobileScore < 70) {
    return {
      icon: '⚠️',
      text: 'Needs Work',
      class: 'status-warning'
    };
  }
  if (isMobileFriendly || (mobileScore && mobileScore >= 70)) {
    return {
      icon: '✅',
      text: 'Optimized',
      class: 'status-good'
    };
  }
  return {
    icon: '❓',
    text: 'Unknown',
    class: 'status-unknown'
  };
}

function getSpeedStatus(loadTime) {
  if (!loadTime) {
    return { icon: '❓', text: 'Not Measured', class: 'status-unknown' };
  }

  const seconds = loadTime / 1000;
  if (loadTime <= 2000) {
    return { icon: '✅', text: `Fast (${seconds.toFixed(1)}s)`, class: 'status-good' };
  }
  if (loadTime <= 3000) {
    return { icon: '⚠️', text: `OK (${seconds.toFixed(1)}s)`, class: 'status-warning' };
  }
  return { icon: '❌', text: `Slow (${seconds.toFixed(1)}s)`, class: 'status-bad' };
}

function getScoreStatus(score, type) {
  if (score === null || score === undefined) {
    return { icon: '❓', text: 'Not Analyzed', class: 'status-unknown' };
  }

  if (score >= 80) {
    return { icon: '✅', text: 'Excellent', class: 'status-good' };
  }
  if (score >= 60) {
    return { icon: '⚠️', text: 'Fair', class: 'status-warning' };
  }
  return { icon: '❌', text: 'Poor', class: 'status-bad' };
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

export default generateExecutiveDashboard;