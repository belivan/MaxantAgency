/**
 * Priority Actions Section
 * ========================
 * Displays consolidated, deduplicated issues organized by priority
 * with clear action items, business impact, and evidence.
 *
 * Features:
 * - Issues grouped by severity (Critical, High, Medium, Quick Wins)
 * - Each issue shows impact, evidence, recommendation, effort, and ROI
 * - Visual priority indicators and effort badges
 * - Screenshot evidence links
 * - Implementation guidance
 */

/**
 * Generate priority actions section
 * @param {Object} analysisResult - Complete analysis data
 * @param {Object} synthesisData - AI synthesis results
 * @param {Object} screenshotRegistry - Registry for screenshot references
 * @returns {string} HTML for priority actions
 */
export function generatePriorityActions(analysisResult, synthesisData = {}, screenshotRegistry = null) {
  const {
    company_name,
    quick_wins = [],
    overall_score
  } = analysisResult;

  const {
    consolidatedIssues = [],
    executiveSummary = {}
  } = synthesisData;

  // If no consolidated issues, fall back to raw issues
  const issues = consolidatedIssues.length > 0 ?
    consolidatedIssues :
    extractRawIssues(analysisResult);

  // Categorize issues by priority/severity
  const criticalIssues = issues.filter(i =>
    i.severity === 'critical' || i.priority === 'critical'
  );
  const highIssues = issues.filter(i =>
    (i.severity === 'high' || i.priority === 'high') &&
    !criticalIssues.includes(i)
  );
  const mediumIssues = issues.filter(i =>
    (i.severity === 'medium' || i.priority === 'medium') &&
    !criticalIssues.includes(i) &&
    !highIssues.includes(i)
  );

  // Calculate total issues and estimated effort
  const totalIssues = criticalIssues.length + highIssues.length + mediumIssues.length;
  const totalEffort = calculateTotalEffort(issues);

  let html = '<div class="priority-actions section">\n';
  html += '  <h2>Priority Actions</h2>\n\n';

  // Section summary
  html += '  <div class="actions-summary">\n';
  html += `    <p class="summary-text">We've identified <strong>${totalIssues} key improvements</strong> `;
  html += `organized by business impact and implementation priority. `;
  html += `Total estimated effort: <strong>${totalEffort}</strong>.</p>\n`;

  // Priority breakdown badges
  html += '    <div class="priority-badges">\n';
  if (criticalIssues.length > 0) {
    html += `      <span class="badge critical">🔴 ${criticalIssues.length} Critical</span>\n`;
  }
  if (highIssues.length > 0) {
    html += `      <span class="badge high">🟡 ${highIssues.length} High Priority</span>\n`;
  }
  if (mediumIssues.length > 0) {
    html += `      <span class="badge medium">🟠 ${mediumIssues.length} Medium Priority</span>\n`;
  }
  if (quick_wins.length > 0) {
    html += `      <span class="badge quick-wins">⚡ ${quick_wins.length} Quick Wins</span>\n`;
  }
  html += '    </div>\n';
  html += '  </div>\n\n';

  // Critical Issues Section
  if (criticalIssues.length > 0) {
    html += '  <div class="priority-group critical-group">\n';
    html += '    <div class="group-header">\n';
    html += '      <h3>🔴 Critical Issues - Fix Immediately</h3>\n';
    html += '      <p class="group-description">These issues are actively harming your business and losing customers</p>\n';
    html += '    </div>\n';
    html += '    <div class="issues-container">\n';

    criticalIssues.forEach((issue, index) => {
      html += generateActionCard(issue, index + 1, 'critical', screenshotRegistry);
    });

    html += '    </div>\n';
    html += '  </div>\n\n';
  }

  // High Priority Issues Section
  if (highIssues.length > 0) {
    html += '  <div class="priority-group high-group">\n';
    html += '    <div class="group-header">\n';
    html += '      <h3>🟡 High Priority - Fix Soon</h3>\n';
    html += '      <p class="group-description">Important issues limiting your growth and conversion potential</p>\n';
    html += '    </div>\n';
    html += '    <div class="issues-container">\n';

    highIssues.forEach((issue, index) => {
      html += generateActionCard(issue, criticalIssues.length + index + 1, 'high', screenshotRegistry);
    });

    html += '    </div>\n';
    html += '  </div>\n\n';
  }

  // Medium Priority Issues Section
  if (mediumIssues.length > 0) {
    html += '  <div class="priority-group medium-group">\n';
    html += '    <div class="group-header">\n';
    html += '      <h3>🟠 Medium Priority - Planned Improvements</h3>\n';
    html += '      <p class="group-description">Enhancements that will improve user experience and performance</p>\n';
    html += '    </div>\n';
    html += '    <div class="issues-container">\n';

    mediumIssues.forEach((issue, index) => {
      html += generateActionCard(
        issue,
        criticalIssues.length + highIssues.length + index + 1,
        'medium',
        screenshotRegistry
      );
    });

    html += '    </div>\n';
    html += '  </div>\n\n';
  }

  // NOTE: Quick Wins section removed - redundant with roadmap
  // Quick wins are already shown in Implementation Roadmap Phase 2
  // and captured in the priority metrics on the dashboard

  // Implementation Strategy
  html += '  <div class="implementation-strategy">\n';
  html += '    <h3>Implementation Strategy</h3>\n';
  html += '    <div class="strategy-content">\n';

  // Phase 1: Stop the bleeding
  if (criticalIssues.length > 0) {
    html += '      <div class="strategy-phase">\n';
    html += '        <h4>Phase 1: Stop the Bleeding (Week 1)</h4>\n';
    html += '        <p>Focus on critical issues that are actively losing customers. ';
    html += `Fix ${criticalIssues.length} critical ${criticalIssues.length === 1 ? 'issue' : 'issues'} `;
    html += 'to stop revenue leakage immediately.</p>\n';
    html += '      </div>\n';
  }

  // Phase 2: Quick improvements
  if (quick_wins.length > 0) {
    html += '      <div class="strategy-phase">\n';
    html += '        <h4>Phase 2: Quick Wins (Week 1-2)</h4>\n';
    html += `        <p>Implement ${quick_wins.length} easy fixes for immediate improvements. `;
    html += 'These require minimal effort but deliver noticeable results.</p>\n';
    html += '      </div>\n';
  }

  // Phase 3: Core improvements
  if (highIssues.length > 0) {
    html += '      <div class="strategy-phase">\n';
    html += '        <h4>Phase 3: Core Improvements (Weeks 2-4)</h4>\n';
    html += `        <p>Address ${highIssues.length} high-priority issues to unlock growth potential. `;
    html += 'These improvements will significantly enhance user experience and conversion rates.</p>\n';
    html += '      </div>\n';
  }

  // Phase 4: Optimization
  if (mediumIssues.length > 0) {
    html += '      <div class="strategy-phase">\n';
    html += '        <h4>Phase 4: Optimization (Month 2-3)</h4>\n';
    html += `        <p>Complete ${mediumIssues.length} medium-priority enhancements for competitive advantage. `;
    html += 'These refinements will polish the experience and maximize performance.</p>\n';
    html += '      </div>\n';
  }

  html += '    </div>\n';
  html += '  </div>\n\n';

  html += '</div>\n\n';

  return html;
}

/**
 * Generate an individual action card
 */
function generateActionCard(issue, number, priority, registry) {
  const {
    title,
    description,
    impact,
    recommendation,
    effort = 'medium',
    evidence = [],
    sources = [],
    category,
    affectedPages = [],
    roi,
    businessValue
  } = issue;

  const effortInfo = getEffortInfo(effort);
  const categoryIcon = getCategoryIcon(category);

  let html = `  <div class="action-card ${priority}-card">\n`;
  html += `    <div class="card-header">\n`;
  html += `      <div class="card-number">${number}</div>\n`;
  html += `      <div class="card-title-section">\n`;
  html += `        <h4 class="issue-title">${escapeHtml(title)}</h4>\n`;
  if (category) {
    html += `        <span class="category-badge">${categoryIcon} ${escapeHtml(category)}</span>\n`;
  }
  html += `      </div>\n`;
  html += `      <div class="effort-badge ${effortInfo.class}">\n`;
  html += `        <span class="effort-icon">${effortInfo.icon}</span>\n`;
  html += `        <span class="effort-text">${effortInfo.label}</span>\n`;
  html += `      </div>\n`;
  html += `    </div>\n`;

  html += `    <div class="card-body">\n`;

  // Description
  if (description) {
    html += `      <p class="issue-description">${escapeHtml(description)}</p>\n`;
  }

  // Impact
  if (impact) {
    html += '      <div class="impact-section">\n';
    html += '        <strong>💥 Business Impact:</strong>\n';
    html += `        <span class="impact-text">${escapeHtml(impact)}</span>\n`;
    html += '      </div>\n';
  }

  // Evidence/Screenshots
  if (evidence && evidence.length > 0) {
    html += '      <div class="evidence-section">\n';
    html += '        <strong>📸 Evidence:</strong>\n';
    html += '        <span class="evidence-links">\n';

    evidence.forEach((ref, index) => {
      if (registry && registry.hasReference(ref)) {
        html += registry.getReference(ref);
      } else {
        html += `<a href="#${ref}">Screenshot ${index + 1}</a>`;
      }
      if (index < evidence.length - 1) html += ', ';
    });

    html += '        </span>\n';
    html += '      </div>\n';
  }

  // Recommendation
  if (recommendation) {
    html += '      <div class="recommendation-section">\n';
    html += '        <strong>🔧 How to Fix:</strong>\n';
    html += `        <span class="recommendation-text">${escapeHtml(recommendation)}</span>\n`;
    html += '      </div>\n';
  }

  // ROI/Value
  if (roi || businessValue) {
    html += '      <div class="value-section">\n';
    html += '        <strong>💰 Expected Value:</strong>\n';
    html += `        <span class="value-text">${escapeHtml(roi || businessValue)}</span>\n`;
    html += '      </div>\n';
  }

  // Affected Pages
  if (affectedPages && affectedPages.length > 0) {
    html += '      <div class="affected-pages">\n';
    html += '        <strong>📄 Affected Pages:</strong>\n';
    html += '        <span class="pages-list">\n';
    html += escapeHtml(affectedPages.slice(0, 3).join(', '));
    if (affectedPages.length > 3) {
      html += ` +${affectedPages.length - 3} more`;
    }
    html += '        </span>\n';
    html += '      </div>\n';
  }

  // NOTE: "Found by" sources section removed for executive report
  // Executives care about WHAT to fix and WHY, not which analyzer found it

  html += `    </div>\n`;
  html += `  </div>\n`;

  return html;
}

/**
 * Generate a quick win card
 */
function generateQuickWinCard(win, number) {
  // Handle both string and object formats
  const title = typeof win === 'string' ? win : win.title || win.description;
  const effort = typeof win === 'object' ? win.effort : 'easy';
  const impact = typeof win === 'object' ? win.impact : null;

  let html = '      <div class="quick-win-card">\n';
  html += `        <div class="win-number">✓</div>\n`;
  html += `        <div class="win-content">\n`;
  html += `          <p class="win-title">${escapeHtml(title)}</p>\n`;

  if (impact) {
    html += `          <p class="win-impact">${escapeHtml(impact)}</p>\n`;
  }

  html += '          <div class="win-meta">\n';
  html += `            <span class="win-effort">~${getQuickWinTime(effort)}</span>\n`;
  html += '            <span class="win-difficulty">Easy</span>\n';
  html += '          </div>\n';
  html += '        </div>\n';
  html += '      </div>\n';

  return html;
}

/**
 * Extract raw issues from analysis result if no synthesis
 */
function extractRawIssues(result) {
  const issues = [];

  // Extract desktop design issues
  if (result.design_issues_desktop) {
    result.design_issues_desktop.forEach(issue => {
      issues.push({
        ...issue,
        category: 'Desktop Design',
        sources: ['desktop-visual-analyzer']
      });
    });
  }

  // Extract mobile design issues
  if (result.design_issues_mobile) {
    result.design_issues_mobile.forEach(issue => {
      issues.push({
        ...issue,
        category: 'Mobile Design',
        sources: ['mobile-visual-analyzer']
      });
    });
  }

  // Extract SEO issues
  if (result.seo_issues) {
    result.seo_issues.forEach(issue => {
      issues.push({
        ...issue,
        category: 'SEO',
        sources: ['seo-analyzer']
      });
    });
  }

  // Extract content issues
  if (result.content_issues) {
    result.content_issues.forEach(issue => {
      issues.push({
        ...issue,
        category: 'Content',
        sources: ['content-analyzer']
      });
    });
  }

  // Extract social issues
  if (result.social_issues) {
    result.social_issues.forEach(issue => {
      issues.push({
        ...issue,
        category: 'Social',
        sources: ['social-analyzer']
      });
    });
  }

  // Extract accessibility issues
  if (result.accessibility_issues) {
    result.accessibility_issues.forEach(issue => {
      issues.push({
        ...issue,
        category: 'Accessibility',
        sources: ['accessibility-analyzer']
      });
    });
  }

  return issues;
}

/**
 * Calculate total effort estimate
 */
function calculateTotalEffort(issues) {
  let totalHours = 0;

  issues.forEach(issue => {
    const effort = issue.effort || issue.fix_effort || 'medium';
    switch (effort.toLowerCase()) {
      case 'easy':
      case 'low':
        totalHours += 2;
        break;
      case 'medium':
        totalHours += 8;
        break;
      case 'hard':
      case 'high':
        totalHours += 20;
        break;
      default:
        totalHours += 8;
    }
  });

  if (totalHours <= 40) {
    return `${totalHours} hours (1 week)`;
  } else if (totalHours <= 80) {
    return `${totalHours} hours (2 weeks)`;
  } else if (totalHours <= 160) {
    const weeks = Math.ceil(totalHours / 40);
    return `${totalHours} hours (${weeks} weeks)`;
  } else {
    const months = Math.ceil(totalHours / 160);
    return `${totalHours} hours (${months} ${months === 1 ? 'month' : 'months'})`;
  }
}

/**
 * Get effort badge info
 */
function getEffortInfo(effort) {
  const effortStr = String(effort).toLowerCase();

  if (effortStr === 'easy' || effortStr === 'low') {
    return {
      label: 'Easy Fix',
      icon: '🟢',
      class: 'effort-easy'
    };
  } else if (effortStr === 'hard' || effortStr === 'high') {
    return {
      label: 'Complex',
      icon: '🔴',
      class: 'effort-hard'
    };
  } else {
    return {
      label: 'Moderate',
      icon: '🟡',
      class: 'effort-medium'
    };
  }
}

/**
 * Get category icon
 */
function getCategoryIcon(category) {
  const icons = {
    'mobile': '📱',
    'mobile design': '📱',
    'desktop': '💻',
    'desktop design': '💻',
    'seo': '🔍',
    'content': '📝',
    'performance': '🚀',
    'security': '🔒',
    'accessibility': '♿',
    'social': '👥',
    'conversion': '💳',
    'navigation': '🧭',
    'design': '🎨',
    'trust': '🛡️'
  };
  return icons[category?.toLowerCase()] || '📌';
}

/**
 * Get quick win time estimate
 */
function getQuickWinTime(effort) {
  const effortStr = String(effort).toLowerCase();
  if (effortStr === 'easy' || effortStr === 'low') {
    return '1-2 hours';
  } else if (effortStr === 'medium') {
    return '2-4 hours';
  } else {
    return '4-8 hours';
  }
}

/**
 * Escape HTML special characters
 */
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

export default generatePriorityActions;