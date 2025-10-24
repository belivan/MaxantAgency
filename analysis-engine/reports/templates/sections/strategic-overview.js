/**
 * Strategic Overview Section
 * ==========================
 * Business-focused narrative that translates technical findings
 * into strategic insights and opportunities.
 *
 * Features:
 * - Executive summary with headline and overview
 * - Business impact analysis with before/after scenarios
 * - Competitive positioning assessment
 * - ROI projections and value proposition
 * - Strategic recommendations
 */

/**
 * Generate strategic overview section
 * @param {Object} analysisResult - Complete analysis data
 * @param {Object} synthesisData - AI synthesis results
 * @returns {string} HTML for strategic overview
 */
export function generateStrategicOverview(analysisResult, synthesisData = {}) {
  const {
    company_name,
    industry,
    overall_score,
    grade,
    quick_wins = [],
    design_score_desktop,
    design_score_mobile,
    seo_score,
    content_score,
    social_score,
    business_intelligence = {}
  } = analysisResult;

  const {
    consolidatedIssues = [],
    executiveSummary = {}
  } = synthesisData;

  // Extract executive summary components
  const {
    headline,
    overview,
    criticalFindings = [],
    roadmap = {},
    roiStatement,
    callToAction,
    competitivePosition,
    marketOpportunity
  } = executiveSummary;

  // Calculate improvement metrics
  const improvementPotential = 100 - overall_score;
  const quickWinImpact = Math.min(15, quick_wins.length * 3);
  const projectedScore = Math.min(100, overall_score + quickWinImpact + 10); // +10 for other fixes

  let html = '<div class="strategic-overview section">\n';
  html += '  <h2>Strategic Overview</h2>\n\n';

  // Executive Summary
  html += '  <div class="executive-summary-block">\n';

  if (headline) {
    html += `    <h3 class="summary-headline">${escapeHtml(headline)}</h3>\n`;
  } else {
    // Fallback headline if synthesis didn't provide one
    html += `    <h3 class="summary-headline">${company_name} has ${getOpportunityLevel(overall_score)} improvement opportunity</h3>\n`;
  }

  if (overview) {
    html += `    <p class="summary-overview">${escapeHtml(overview)}</p>\n`;
  } else {
    // Generate fallback overview
    html += `    <p class="summary-overview">Your website currently scores ${overall_score}/100 (Grade ${grade}), `;
    html += `with ${improvementPotential} points of improvement potential. `;
    html += `Key issues are impacting your ${getImpactedAreas(analysisResult)}. `;
    html += `With targeted optimization, you can significantly improve conversion rates and user engagement.</p>\n`;
  }

  html += '  </div>\n\n';

  // Business Impact Analysis
  html += '  <div class="business-impact-analysis">\n';
  html += '    <h3>Business Impact Analysis</h3>\n';
  html += '    <div class="impact-comparison">\n';
  html += '      <table class="impact-table">\n';
  html += '        <thead>\n';
  html += '          <tr>\n';
  html += '            <th>Metric</th>\n';
  html += '            <th class="current">Current State</th>\n';
  html += '            <th class="arrow">→</th>\n';
  html += '            <th class="future">After Optimization</th>\n';
  html += '            <th class="impact">Impact</th>\n';
  html += '          </tr>\n';
  html += '        </thead>\n';
  html += '        <tbody>\n';

  // Generate impact rows based on actual issues or use defaults
  const impactMetrics = generateImpactMetrics(analysisResult, consolidatedIssues, criticalFindings);

  impactMetrics.forEach(metric => {
    html += '          <tr>\n';
    html += `            <td class="metric-name">${escapeHtml(metric.name)}</td>\n`;
    html += `            <td class="current-value">${escapeHtml(metric.current)}</td>\n`;
    html += '            <td class="arrow">→</td>\n';
    html += `            <td class="future-value">${escapeHtml(metric.future)}</td>\n`;
    html += `            <td class="impact-value ${metric.impactClass}">${escapeHtml(metric.impact)}</td>\n`;
    html += '          </tr>\n';
  });

  html += '        </tbody>\n';
  html += '      </table>\n';
  html += '    </div>\n';
  html += '  </div>\n\n';

  // Competitive Positioning
  html += '  <div class="competitive-positioning">\n';
  html += '    <h3>Competitive Position</h3>\n';

  if (competitivePosition) {
    html += `    <p>${escapeHtml(competitivePosition)}</p>\n`;
  } else {
    // Generate competitive position based on scores
    html += '    <div class="position-analysis">\n';
    html += generateCompetitiveAnalysis(analysisResult);
    html += '    </div>\n';
  }

  html += '  </div>\n\n';

  // ROI Projection
  html += '  <div class="roi-projection">\n';
  html += '    <h3>Return on Investment</h3>\n';

  if (roiStatement) {
    html += `    <p class="roi-statement">${escapeHtml(roiStatement)}</p>\n`;
  } else {
    // Generate ROI projection
    const roiData = calculateROI(analysisResult, consolidatedIssues);
    html += '    <div class="roi-breakdown">\n';
    html += `      <div class="roi-highlight">\n`;
    html += `        <span class="roi-label">Expected ROI:</span>\n`;
    html += `        <span class="roi-value">${roiData.multiplier}x</span>\n`;
    html += `        <span class="roi-timeline">within ${roiData.timeline}</span>\n`;
    html += `      </div>\n`;
    html += `      <div class="roi-details">\n`;
    html += `        <p><strong>Investment Required:</strong> ${roiData.investment}</p>\n`;
    html += `        <p><strong>Expected Returns:</strong> ${roiData.returns}</p>\n`;
    html += `        <p><strong>Key Value Drivers:</strong></p>\n`;
    html += '        <ul>\n';
    roiData.drivers.forEach(driver => {
      html += `          <li>${escapeHtml(driver)}</li>\n`;
    });
    html += '        </ul>\n';
    html += '      </div>\n';
    html += '    </div>\n';
  }

  html += '  </div>\n\n';

  // NOTE: Strategic Recommendations section removed to avoid redundancy
  // Recommendations are covered in detail in:
  // - Priority Actions section (what to fix)
  // - Implementation Roadmap section (when to fix)

  // Market Opportunity
  if (marketOpportunity || industry) {
    html += '  <div class="market-opportunity">\n';
    html += '    <h3>Market Opportunity</h3>\n';

    if (marketOpportunity) {
      html += `    <p>${escapeHtml(marketOpportunity)}</p>\n`;
    } else if (industry) {
      html += `    <p>In the ${escapeHtml(industry)} industry, `;
      html += 'a well-optimized website can be a significant competitive advantage. ';
      html += `With your current score of ${overall_score}/100, there's substantial room for improvement `;
      html += 'that can translate directly into increased market share and revenue.</p>\n';
    }

    html += '  </div>\n\n';
  }

  // Call to Action
  if (callToAction) {
    html += '  <div class="strategic-cta">\n';
    html += `    <p class="cta-text">${escapeHtml(callToAction)}</p>\n`;
    html += '  </div>\n\n';
  }

  html += '</div>\n\n';

  return html;
}

/**
 * Helper Functions
 */

function getOpportunityLevel(score) {
  if (score >= 85) return 'minor';
  if (score >= 70) return 'moderate';
  if (score >= 55) return 'significant';
  if (score >= 40) return 'substantial';
  return 'critical';
}

function getImpactedAreas(result) {
  const areas = [];
  if (result.design_score_mobile < 60) areas.push('mobile experience');
  if (result.seo_score < 60) areas.push('search visibility');
  if (result.content_score < 60) areas.push('content effectiveness');
  if (result.social_score < 60) areas.push('social engagement');

  if (areas.length === 0) return 'overall performance';
  if (areas.length === 1) return areas[0];
  if (areas.length === 2) return `${areas[0]} and ${areas[1]}`;
  return areas.slice(0, -1).join(', ') + ', and ' + areas[areas.length - 1];
}

function generateImpactMetrics(result, consolidatedIssues, criticalFindings) {
  const metrics = [];

  // Website Score
  const currentScore = result.overall_score;
  const projectedScore = Math.min(100, currentScore + 25);
  metrics.push({
    name: 'Website Score',
    current: `${currentScore}/100`,
    future: `${projectedScore}/100`,
    impact: `+${projectedScore - currentScore} points`,
    impactClass: 'positive'
  });

  // Mobile Traffic
  if (!result.is_mobile_friendly || result.design_score_mobile < 60) {
    metrics.push({
      name: 'Mobile Conversion',
      current: 'Losing 60% of mobile visitors',
      future: 'Full mobile optimization',
      impact: '2.5x mobile conversions',
      impactClass: 'high-impact'
    });
  }

  // Search Traffic
  if (result.seo_score < 70) {
    const currentVisibility = result.seo_score < 40 ? 'Very Low' : result.seo_score < 60 ? 'Low' : 'Moderate';
    metrics.push({
      name: 'Search Traffic',
      current: `${currentVisibility} visibility`,
      future: 'Page 1 rankings',
      impact: '3-5x organic traffic',
      impactClass: 'high-impact'
    });
  }

  // Page Load Speed
  if (result.page_load_time && result.page_load_time > 3000) {
    const currentSpeed = (result.page_load_time / 1000).toFixed(1);
    metrics.push({
      name: 'Page Load Time',
      current: `${currentSpeed}s average`,
      future: '<2s target',
      impact: '40% bounce rate reduction',
      impactClass: 'positive'
    });
  }

  // Conversion Rate (estimate based on overall health)
  const currentConversion = result.overall_score < 50 ? '1-2%' : result.overall_score < 70 ? '2-3%' : '3-4%';
  const futureConversion = result.overall_score < 50 ? '4-6%' : result.overall_score < 70 ? '5-7%' : '6-8%';
  metrics.push({
    name: 'Conversion Rate',
    current: currentConversion,
    future: futureConversion,
    impact: '2-3x improvement',
    impactClass: 'high-impact'
  });

  // User Engagement
  if (result.content_score < 70) {
    metrics.push({
      name: 'User Engagement',
      current: 'High bounce rate',
      future: 'Increased time on site',
      impact: '+50% engagement',
      impactClass: 'positive'
    });
  }

  return metrics;
}

function generateCompetitiveAnalysis(result) {
  const score = result.overall_score;
  let html = '';

  html += '<div class="competitive-chart">\n';
  html += '  <div class="competitor-comparison">\n';

  // Your position
  html += '    <div class="competitor-row your-position">\n';
  html += `      <span class="competitor-name">Your Website</span>\n`;
  html += '      <div class="score-bar-container">\n';
  html += `        <div class="score-bar" style="width: ${score}%"></div>\n`;
  html += '      </div>\n';
  html += `      <span class="competitor-score">${score}/100</span>\n`;
  html += '    </div>\n';

  // Industry average (estimated)
  const industryAvg = 65;
  html += '    <div class="competitor-row industry-average">\n';
  html += '      <span class="competitor-name">Industry Average</span>\n';
  html += '      <div class="score-bar-container">\n';
  html += `        <div class="score-bar" style="width: ${industryAvg}%"></div>\n`;
  html += '      </div>\n';
  html += `      <span class="competitor-score">${industryAvg}/100</span>\n`;
  html += '    </div>\n';

  // Top performer (benchmark)
  const topPerformer = 85;
  html += '    <div class="competitor-row top-performer">\n';
  html += '      <span class="competitor-name">Top Performers</span>\n';
  html += '      <div class="score-bar-container">\n';
  html += `        <div class="score-bar" style="width: ${topPerformer}%"></div>\n`;
  html += '      </div>\n';
  html += `      <span class="competitor-score">${topPerformer}/100</span>\n`;
  html += '    </div>\n';

  html += '  </div>\n';

  // Position analysis
  if (score < industryAvg) {
    const gap = industryAvg - score;
    html += `  <p class="position-analysis">Currently ${gap} points below industry average. `;
    html += 'Reaching average performance would provide immediate competitive advantage.</p>\n';
  } else if (score < topPerformer) {
    const gap = topPerformer - score;
    html += `  <p class="position-analysis">Performing above average but ${gap} points from industry leaders. `;
    html += 'Closing this gap would establish market leadership position.</p>\n';
  } else {
    html += '  <p class="position-analysis">Excellent position among industry leaders. ';
    html += 'Focus on maintaining advantage and continuous innovation.</p>\n';
  }

  html += '</div>\n';

  return html;
}

function calculateROI(result, issues) {
  const score = result.overall_score;
  const improvementPotential = 100 - score;

  // Estimate investment based on number and severity of issues
  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const highCount = issues.filter(i => i.severity === 'high').length;

  const weekEstimate = criticalCount * 2 + highCount * 1 + 2; // +2 for other work
  const investment = weekEstimate <= 4 ? '$5,000 - $10,000' :
                     weekEstimate <= 8 ? '$10,000 - $20,000' :
                     '$20,000 - $40,000';

  // Calculate ROI multiplier
  const multiplier = improvementPotential > 40 ? '5-10' :
                     improvementPotential > 25 ? '3-5' :
                     improvementPotential > 15 ? '2-3' :
                     '1.5-2';

  // Timeline
  const timeline = weekEstimate <= 4 ? '3 months' :
                   weekEstimate <= 8 ? '6 months' :
                   '12 months';

  // Value drivers
  const drivers = [];
  if (result.design_score_mobile < 70) {
    drivers.push('Mobile optimization capturing lost traffic');
  }
  if (result.seo_score < 70) {
    drivers.push('SEO improvements driving organic growth');
  }
  if (result.content_score < 70) {
    drivers.push('Content optimization improving conversions');
  }
  if (result.page_load_time > 3000) {
    drivers.push('Speed improvements reducing bounce rate');
  }
  if (drivers.length === 0) {
    drivers.push('General optimization and user experience improvements');
  }

  return {
    multiplier,
    timeline,
    investment,
    returns: `${multiplier}x return on ${investment} investment`,
    drivers
  };
}

function generateDefaultRecommendations(result, issues) {
  let html = '<div class="default-recommendations">\n';

  // Immediate actions (based on critical issues)
  const criticalIssues = issues.filter(i => i.severity === 'critical');
  if (criticalIssues.length > 0) {
    html += '  <div class="recommendation-phase">\n';
    html += '    <h4>🎯 Immediate Priority (Week 1)</h4>\n';
    html += '    <ul>\n';
    criticalIssues.slice(0, 3).forEach(issue => {
      html += `      <li>${escapeHtml(issue.title)}</li>\n`;
    });
    html += '    </ul>\n';
    html += '  </div>\n';
  }

  // Short-term (quick wins)
  if (result.quick_wins && result.quick_wins.length > 0) {
    html += '  <div class="recommendation-phase">\n';
    html += '    <h4>⚡ Quick Wins (Weeks 2-3)</h4>\n';
    html += '    <ul>\n';
    result.quick_wins.slice(0, 5).forEach(win => {
      html += `      <li>${escapeHtml(win)}</li>\n`;
    });
    html += '    </ul>\n';
    html += '  </div>\n';
  }

  // Medium-term (other improvements)
  html += '  <div class="recommendation-phase">\n';
  html += '    <h4>📈 Growth Optimization (Month 2-3)</h4>\n';
  html += '    <ul>\n';
  if (result.seo_score < 70) {
    html += '      <li>Comprehensive SEO optimization</li>\n';
  }
  if (result.content_score < 70) {
    html += '      <li>Content strategy and messaging refinement</li>\n';
  }
  if (result.social_score < 70) {
    html += '      <li>Social media integration and engagement</li>\n';
  }
  html += '      <li>Conversion rate optimization testing</li>\n';
  html += '    </ul>\n';
  html += '  </div>\n';

  html += '</div>\n';

  return html;
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

export default generateStrategicOverview;