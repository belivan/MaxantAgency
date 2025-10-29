/**
 * Implementation Roadmap Section
 * ==============================
 * Phased timeline showing what to fix when, with success metrics
 * and measurable milestones.
 *
 * Features:
 * - Weekly/monthly phases with specific tasks
 * - Success metrics and KPIs for each phase
 * - Resource requirements and team assignments
 * - Progress tracking visualization
 * - ROI projections at each milestone
 */

/**
 * Generate implementation roadmap section
 * @param {Object} analysisResult - Complete analysis data
 * @param {Object} synthesisData - AI synthesis results
 * @returns {string} HTML for implementation roadmap
 */
export function generateImplementationRoadmap(analysisResult, synthesisData = {}) {
  const {
    company_name,
    overall_score,
    grade,
    quick_wins = [],
    design_score_desktop,
    design_score_mobile,
    seo_score,
    content_score,
    social_score,
    accessibility_score
  } = analysisResult;

  const {
    consolidatedIssues = [],
    executiveSummary = {}
  } = synthesisData;

  // Categorize issues for phasing
  const criticalIssues = consolidatedIssues.filter(i =>
    i.severity === 'critical' || i.priority === 'critical'
  );
  const highIssues = consolidatedIssues.filter(i =>
    (i.severity === 'high' || i.priority === 'high') &&
    !criticalIssues.includes(i)
  );
  const mediumIssues = consolidatedIssues.filter(i =>
    (i.severity === 'medium' || i.priority === 'medium') &&
    !criticalIssues.includes(i) &&
    !highIssues.includes(i)
  );

  // Calculate projected improvements
  const baselineScore = overall_score;
  const phase1Score = Math.min(100, baselineScore + (quick_wins.length * 2) + (criticalIssues.length * 3));
  const phase2Score = Math.min(100, phase1Score + (highIssues.length * 2));
  const phase3Score = Math.min(100, phase2Score + (mediumIssues.length * 1) + 5);
  const finalScore = Math.min(100, phase3Score + 5);

  let html = '<div class="implementation-roadmap section">\n';
  html += '  <h2>Implementation Roadmap</h2>\n\n';

  // Roadmap Overview
  html += '  <div class="roadmap-overview">\n';
  html += '    <p class="overview-text">Transform your website from ';
  html += `<strong>Grade ${grade} (${baselineScore}/100)</strong> to `;
  html += `<strong>Grade ${getGradeFromScore(finalScore)} (${finalScore}/100)</strong> `;
  html += 'through systematic improvements over the next 90 days.</p>\n';
  html += '  </div>\n\n';

  // Visual Timeline
  html += '  <div class="timeline-visual">\n';
  html += generateTimelineVisualization(baselineScore, phase1Score, phase2Score, phase3Score, finalScore);
  html += '  </div>\n\n';

  // Phase 1: Emergency Response (Week 1)
  html += '  <div class="roadmap-phase phase-1">\n';
  html += '    <div class="phase-header">\n';
  html += '      <div class="phase-icon">🚨</div>\n';
  html += '      <div class="phase-title-block">\n';
  html += '        <h3>Phase 1: Emergency Response</h3>\n';
  html += '        <span class="phase-timeline">Week 1</span>\n';
  html += '      </div>\n';
  html += '      <div class="phase-score">\n';
  html += `        <span class="score-change">+${phase1Score - baselineScore} points</span>\n`;
  html += `        <span class="target-score">Target: ${phase1Score}/100</span>\n`;
  html += '      </div>\n';
  html += '    </div>\n';

  html += '    <div class="phase-content">\n';
  html += '      <div class="phase-objectives">\n';
  html += '        <h4>Objectives</h4>\n';
  html += '        <ul>\n';
  html += '          <li>Stop losing customers due to critical issues</li>\n';
  html += '          <li>Implement quick wins for immediate impact</li>\n';
  html += '          <li>Stabilize core functionality</li>\n';
  html += '        </ul>\n';
  html += '      </div>\n';

  html += '      <div class="phase-tasks">\n';
  html += '        <h4>Key Tasks</h4>\n';
  html += '        <div class="task-list">\n';

  // Critical issues
  if (criticalIssues.length > 0) {
    criticalIssues.slice(0, 3).forEach(issue => {
      html += `          <div class="task-item critical">\n`;
      html += `            <input type="checkbox" class="task-checkbox" id="task-${issue.id || Math.random()}">\n`;
      html += `            <label for="task-${issue.id || Math.random()}">${escapeHtml(issue.title)}</label>\n`;
      html += `            <span class="task-effort">${getEffortLabel(issue.effort)}</span>\n`;
      html += '          </div>\n';
    });
  }

  // Quick wins
  if (quick_wins.length > 0) {
    quick_wins.slice(0, 5).forEach((win, index) => {
      const winTitle = typeof win === 'string' ? win : win.title;
      html += `          <div class="task-item quick-win">\n`;
      html += `            <input type="checkbox" class="task-checkbox" id="qw-${index}">\n`;
      html += `            <label for="qw-${index}">${escapeHtml(winTitle)}</label>\n`;
      html += '            <span class="task-effort">1-2 hrs</span>\n';
      html += '          </div>\n';
    });
  }

  html += '        </div>\n';
  html += '      </div>\n';

  html += '      <div class="phase-metrics">\n';
  html += '        <h4>Success Metrics</h4>\n';
  html += '        <div class="metrics-grid">\n';
  html += generatePhaseMetrics('phase1', analysisResult);
  html += '        </div>\n';
  html += '      </div>\n';

  html += '      <div class="phase-resources">\n';
  html += '        <h4>Resources Needed</h4>\n';
  html += '        <p>1-2 developers for 1 week (40-80 hours)</p>\n';
  html += '      </div>\n';

  html += '    </div>\n';
  html += '  </div>\n\n';

  // Phase 2: Foundation Building (Weeks 2-4)
  html += '  <div class="roadmap-phase phase-2">\n';
  html += '    <div class="phase-header">\n';
  html += '      <div class="phase-icon">🏗️</div>\n';
  html += '      <div class="phase-title-block">\n';
  html += '        <h3>Phase 2: Foundation Building</h3>\n';
  html += '        <span class="phase-timeline">Weeks 2-4</span>\n';
  html += '      </div>\n';
  html += '      <div class="phase-score">\n';
  html += `        <span class="score-change">+${phase2Score - phase1Score} points</span>\n`;
  html += `        <span class="target-score">Target: ${phase2Score}/100</span>\n`;
  html += '      </div>\n';
  html += '    </div>\n';

  html += '    <div class="phase-content">\n';
  html += '      <div class="phase-objectives">\n';
  html += '        <h4>Objectives</h4>\n';
  html += '        <ul>\n';
  html += '          <li>Build solid technical foundation</li>\n';
  html += '          <li>Improve core user experience</li>\n';
  html += '          <li>Enhance mobile responsiveness</li>\n';
  html += '          <li>Boost SEO fundamentals</li>\n';
  html += '        </ul>\n';
  html += '      </div>\n';

  html += '      <div class="phase-tasks">\n';
  html += '        <h4>Key Tasks</h4>\n';
  html += '        <div class="task-list">\n';

  // High priority issues
  if (highIssues.length > 0) {
    highIssues.slice(0, 5).forEach(issue => {
      html += `          <div class="task-item high">\n`;
      html += `            <input type="checkbox" class="task-checkbox" id="task-${issue.id || Math.random()}">\n`;
      html += `            <label for="task-${issue.id || Math.random()}">${escapeHtml(issue.title)}</label>\n`;
      html += `            <span class="task-effort">${getEffortLabel(issue.effort)}</span>\n`;
      html += '          </div>\n';
    });
  }

  // Add specific improvement tasks based on low scores
  if (design_score_mobile < 70) {
    html += '          <div class="task-item">\n';
    html += '            <input type="checkbox" class="task-checkbox" id="mobile-opt">\n';
    html += '            <label for="mobile-opt">Complete mobile optimization</label>\n';
    html += '            <span class="task-effort">2-3 days</span>\n';
    html += '          </div>\n';
  }

  if (seo_score < 70) {
    html += '          <div class="task-item">\n';
    html += '            <input type="checkbox" class="task-checkbox" id="seo-impl">\n';
    html += '            <label for="seo-impl">Implement SEO best practices</label>\n';
    html += '            <span class="task-effort">1-2 days</span>\n';
    html += '          </div>\n';
  }

  html += '        </div>\n';
  html += '      </div>\n';

  html += '      <div class="phase-metrics">\n';
  html += '        <h4>Success Metrics</h4>\n';
  html += '        <div class="metrics-grid">\n';
  html += generatePhaseMetrics('phase2', analysisResult);
  html += '        </div>\n';
  html += '      </div>\n';

  html += '      <div class="phase-resources">\n';
  html += '        <h4>Resources Needed</h4>\n';
  html += '        <p>2-3 developers for 3 weeks (160-240 hours)</p>\n';
  html += '      </div>\n';

  html += '    </div>\n';
  html += '  </div>\n\n';

  // Phase 3: Growth Optimization (Weeks 5-8)
  html += '  <div class="roadmap-phase phase-3">\n';
  html += '    <div class="phase-header">\n';
  html += '      <div class="phase-icon">📈</div>\n';
  html += '      <div class="phase-title-block">\n';
  html += '        <h3>Phase 3: Growth Optimization</h3>\n';
  html += '        <span class="phase-timeline">Weeks 5-8</span>\n';
  html += '      </div>\n';
  html += '      <div class="phase-score">\n';
  html += `        <span class="score-change">+${phase3Score - phase2Score} points</span>\n`;
  html += `        <span class="target-score">Target: ${phase3Score}/100</span>\n`;
  html += '      </div>\n';
  html += '    </div>\n';

  html += '    <div class="phase-content">\n';
  html += '      <div class="phase-objectives">\n';
  html += '        <h4>Objectives</h4>\n';
  html += '        <ul>\n';
  html += '          <li>Optimize conversion paths</li>\n';
  html += '          <li>Enhance content strategy</li>\n';
  html += '          <li>Improve social integration</li>\n';
  html += '          <li>Polish user experience</li>\n';
  html += '        </ul>\n';
  html += '      </div>\n';

  html += '      <div class="phase-tasks">\n';
  html += '        <h4>Key Tasks</h4>\n';
  html += '        <div class="task-list">\n';

  // Medium priority issues
  if (mediumIssues.length > 0) {
    mediumIssues.slice(0, 5).forEach(issue => {
      html += `          <div class="task-item medium">\n`;
      html += `            <input type="checkbox" class="task-checkbox" id="task-${issue.id || Math.random()}">\n`;
      html += `            <label for="task-${issue.id || Math.random()}">${escapeHtml(issue.title)}</label>\n`;
      html += `            <span class="task-effort">${getEffortLabel(issue.effort)}</span>\n`;
      html += '          </div>\n';
    });
  }

  // Add optimization tasks
  html += '          <div class="task-item">\n';
  html += '            <input type="checkbox" class="task-checkbox" id="ab-testing">\n';
  html += '            <label for="ab-testing">Implement A/B testing framework</label>\n';
  html += '            <span class="task-effort">2-3 days</span>\n';
  html += '          </div>\n';

  html += '          <div class="task-item">\n';
  html += '            <input type="checkbox" class="task-checkbox" id="analytics">\n';
  html += '            <label for="analytics">Set up advanced analytics</label>\n';
  html += '            <span class="task-effort">1 day</span>\n';
  html += '          </div>\n';

  html += '        </div>\n';
  html += '      </div>\n';

  html += '      <div class="phase-metrics">\n';
  html += '        <h4>Success Metrics</h4>\n';
  html += '        <div class="metrics-grid">\n';
  html += generatePhaseMetrics('phase3', analysisResult);
  html += '        </div>\n';
  html += '      </div>\n';

  html += '      <div class="phase-resources">\n';
  html += '        <h4>Resources Needed</h4>\n';
  html += '        <p>1-2 developers + 1 designer for 4 weeks (160-320 hours)</p>\n';
  html += '      </div>\n';

  html += '    </div>\n';
  html += '  </div>\n\n';

  // Phase 4: Continuous Improvement (Ongoing)
  html += '  <div class="roadmap-phase phase-4">\n';
  html += '    <div class="phase-header">\n';
  html += '      <div class="phase-icon">🚀</div>\n';
  html += '      <div class="phase-title-block">\n';
  html += '        <h3>Phase 4: Continuous Improvement</h3>\n';
  html += '        <span class="phase-timeline">Month 3+</span>\n';
  html += '      </div>\n';
  html += '      <div class="phase-score">\n';
  html += `        <span class="score-change">+${finalScore - phase3Score} points</span>\n`;
  html += `        <span class="target-score">Target: ${finalScore}/100</span>\n`;
  html += '      </div>\n';
  html += '    </div>\n';

  html += '    <div class="phase-content">\n';
  html += '      <div class="phase-objectives">\n';
  html += '        <h4>Objectives</h4>\n';
  html += '        <ul>\n';
  html += '          <li>Maintain competitive edge</li>\n';
  html += '          <li>Monitor and respond to metrics</li>\n';
  html += '          <li>Iterate based on user feedback</li>\n';
  html += '          <li>Stay current with best practices</li>\n';
  html += '        </ul>\n';
  html += '      </div>\n';

  html += '      <div class="phase-tasks">\n';
  html += '        <h4>Ongoing Activities</h4>\n';
  html += '        <div class="task-list">\n';
  html += '          <div class="task-item ongoing">\n';
  html += '            <span class="task-icon">📊</span>\n';
  html += '            <span>Monthly performance audits</span>\n';
  html += '          </div>\n';
  html += '          <div class="task-item ongoing">\n';
  html += '            <span class="task-icon">🔄</span>\n';
  html += '            <span>Continuous A/B testing</span>\n';
  html += '          </div>\n';
  html += '          <div class="task-item ongoing">\n';
  html += '            <span class="task-icon">📝</span>\n';
  html += '            <span>Content updates and optimization</span>\n';
  html += '          </div>\n';
  html += '          <div class="task-item ongoing">\n';
  html += '            <span class="task-icon">🛡️</span>\n';
  html += '            <span>Security and performance monitoring</span>\n';
  html += '          </div>\n';
  html += '        </div>\n';
  html += '      </div>\n';

  html += '      <div class="phase-metrics">\n';
  html += '        <h4>Success Metrics</h4>\n';
  html += '        <div class="metrics-grid">\n';
  html += generatePhaseMetrics('phase4', analysisResult);
  html += '        </div>\n';
  html += '      </div>\n';

  html += '    </div>\n';
  html += '  </div>\n\n';

  // Success Metrics Summary
  html += '  <div class="success-metrics-summary">\n';
  html += '    <h3>Expected Outcomes</h3>\n';
  html += '    <div class="outcomes-grid">\n';

  html += '      <div class="outcome-card">\n';
  html += '        <div class="outcome-icon">📈</div>\n';
  html += '        <div class="outcome-metric">Traffic</div>\n';
  html += '        <div class="outcome-change">+200-300%</div>\n';
  html += '        <div class="outcome-timeline">by month 3</div>\n';
  html += '      </div>\n';

  html += '      <div class="outcome-card">\n';
  html += '        <div class="outcome-icon">💰</div>\n';
  html += '        <div class="outcome-metric">Conversions</div>\n';
  html += '        <div class="outcome-change">+150-250%</div>\n';
  html += '        <div class="outcome-timeline">by month 3</div>\n';
  html += '      </div>\n';

  html += '      <div class="outcome-card">\n';
  html += '        <div class="outcome-icon">⏱️</div>\n';
  html += '        <div class="outcome-metric">Load Time</div>\n';
  html += '        <div class="outcome-change"><2 seconds</div>\n';
  html += '        <div class="outcome-timeline">by week 4</div>\n';
  html += '      </div>\n';

  html += '      <div class="outcome-card">\n';
  html += '        <div class="outcome-icon">📱</div>\n';
  html += '        <div class="outcome-metric">Mobile Score</div>\n';
  html += '        <div class="outcome-change">90+/100</div>\n';
  html += '        <div class="outcome-timeline">by week 8</div>\n';
  html += '      </div>\n';

  html += '    </div>\n';
  html += '  </div>\n\n';

  html += '</div>\n\n';

  return html;
}

/**
 * Generate visual timeline
 */
function generateTimelineVisualization(baseline, phase1, phase2, phase3, final) {
  let html = '<div class="timeline-chart">\n';

  // Timeline header
  html += '  <div class="timeline-header">\n';
  html += '    <span class="timeline-label">Progress</span>\n';
  html += '    <span class="timeline-label">Week 1</span>\n';
  html += '    <span class="timeline-label">Week 4</span>\n';
  html += '    <span class="timeline-label">Week 8</span>\n';
  html += '    <span class="timeline-label">Month 3+</span>\n';
  html += '  </div>\n';

  // Progress bar
  html += '  <div class="timeline-progress">\n';
  html += `    <div class="progress-segment baseline" style="width: 20%">\n`;
  html += `      <span class="progress-score">${baseline}</span>\n`;
  html += `      <span class="progress-grade">${getGradeFromScore(baseline)}</span>\n`;
  html += '    </div>\n';
  html += `    <div class="progress-segment phase1" style="width: 20%">\n`;
  html += `      <span class="progress-score">${phase1}</span>\n`;
  html += `      <span class="progress-grade">${getGradeFromScore(phase1)}</span>\n`;
  html += '    </div>\n';
  html += `    <div class="progress-segment phase2" style="width: 20%">\n`;
  html += `      <span class="progress-score">${phase2}</span>\n`;
  html += `      <span class="progress-grade">${getGradeFromScore(phase2)}</span>\n`;
  html += '    </div>\n';
  html += `    <div class="progress-segment phase3" style="width: 20%">\n`;
  html += `      <span class="progress-score">${phase3}</span>\n`;
  html += `      <span class="progress-grade">${getGradeFromScore(phase3)}</span>\n`;
  html += '    </div>\n';
  html += `    <div class="progress-segment final" style="width: 20%">\n`;
  html += `      <span class="progress-score">${final}</span>\n`;
  html += `      <span class="progress-grade">${getGradeFromScore(final)}</span>\n`;
  html += '    </div>\n';
  html += '  </div>\n';

  html += '</div>\n';
  return html;
}

/**
 * Generate phase-specific metrics
 */
function generatePhaseMetrics(phase, result) {
  let metrics = '';

  switch (phase) {
    case 'phase1':
      metrics += '<div class="metric">✅ Critical issues resolved</div>\n';
      metrics += '<div class="metric">📉 Bounce rate -20%</div>\n';
      metrics += '<div class="metric">📱 Mobile usable</div>\n';
      break;

    case 'phase2':
      metrics += '<div class="metric">🔍 SEO visibility +50%</div>\n';
      metrics += '<div class="metric">🚀 Page speed <3s</div>\n';
      metrics += '<div class="metric">💻 Desktop score 80+</div>\n';
      break;

    case 'phase3':
      metrics += '<div class="metric">💰 Conversion rate +100%</div>\n';
      metrics += '<div class="metric">📊 Engagement +40%</div>\n';
      metrics += '<div class="metric">♿ Accessibility 85+</div>\n';
      break;

    case 'phase4':
      metrics += '<div class="metric">🏆 Industry leader position</div>\n';
      metrics += '<div class="metric">📈 Continuous growth</div>\n';
      metrics += '<div class="metric">⭐ User satisfaction 90%+</div>\n';
      break;
  }

  return metrics;
}

/**
 * Helper functions
 */

function getGradeFromScore(score) {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

function getEffortLabel(effort) {
  const effortStr = String(effort || 'medium').toLowerCase();

  if (effortStr === 'easy' || effortStr === 'low') {
    return '2-4 hrs';
  } else if (effortStr === 'hard' || effortStr === 'high') {
    return '2-3 days';
  } else {
    return '1 day';
  }
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

export default generateImplementationRoadmap;