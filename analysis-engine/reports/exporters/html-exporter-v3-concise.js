/**
 * HTML Report Exporter V3 - Concise Professional Edition
 * ========================================================
 * Generates streamlined, mobile-responsive HTML reports that:
 * - Eliminate redundancy between sections
 * - Focus on actionable insights over raw data
 * - Present information in a clear hierarchy
 * - Optimize for both desktop and mobile viewing
 * - Use a professional light color scheme
 */

import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join, isAbsolute } from 'path';
import { existsSync } from 'fs';
import { ScreenshotRegistry } from '../utils/screenshot-registry.js';
import { compressImageFromFile } from '../utils/image-compressor.js';
import { calculateROI } from '../utils/roi-calculator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Generate concise professional HTML report
 * @param {Object} analysisResult - Complete analysis data
 * @param {Object} synthesisData - AI synthesis results (optional but recommended)
 * @returns {string} Complete HTML report
 */
export async function generateHTMLReportV3(analysisResult, synthesisData = {}) {
  console.log('[HTML Exporter V3] 🎨 Generating concise professional report...');

  const {
    company_name,
    grade,
    overall_score,
    industry,
    city,
    analyzed_at,
    url
  } = analysisResult;

  // Load the professional template
  const templatePath = join(__dirname, '../templates/html-template-v3.html');
  const template = await readFile(templatePath, 'utf-8');

  // Create screenshot registry
  const registry = new ScreenshotRegistry();

  // Process screenshots
  const screenshotData = await processScreenshots(analysisResult, registry);

  // Generate concise content
  const htmlContent = await generateConciseContent(
    analysisResult,
    synthesisData,
    registry,
    screenshotData
  );

  // Format dates
  const analyzedDate = new Date(analyzed_at || Date.now());
  const formattedDate = analyzedDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Replace template variables
  let html = template
    .replace(/{{COMPANY_NAME}}/g, escapeHtml(company_name))
    .replace(/{{GRADE}}/g, grade)
    .replace(/{{OVERALL_SCORE}}/g, Math.round(overall_score))
    .replace(/{{INDUSTRY}}/g, escapeHtml(industry || 'Business'))
    .replace(/{{LOCATION}}/g, escapeHtml(city || 'Location'))
    .replace(/{{DATE}}/g, formattedDate)
    .replace(/{{URL}}/g, escapeHtml(url || ''))
    .replace(/{{REPORT_CONTENT}}/g, htmlContent);

  console.log('[HTML Exporter V3] ✅ Concise report generation complete!');
  return html;
}

/**
 * Generate concise report content without repetition
 */
async function generateConciseContent(analysisResult, synthesisData, registry, screenshotData) {
  let content = '';

  // 1. Executive Dashboard (Hero Section with Key Metrics Only)
  content += generateExecutiveDashboard(analysisResult, synthesisData);

  // Start main content
  content += '<div class="main-content">\n';
  content += '  <div class="container">\n';

  // 2. Strategic Assessment (Combined Summary & Business Impact)
  content += generateStrategicAssessment(analysisResult, synthesisData);

  // 3. Implementation Timeline (90-Day Action Plan)
  content += generateTimeline(analysisResult, synthesisData);

  // 5. Visual Evidence (Screenshots if Available)
  if (screenshotData.screenshots.length > 0) {
    content += generateVisualEvidence(screenshotData, registry);
  }

  // Close main content
  content += '  </div>\n';
  content += '</div>\n';

  // 6. Footer
  content += generateFooter(analysisResult);

  return content;
}

/**
 * Generate executive dashboard with key metrics only
 */
function generateExecutiveDashboard(analysisResult, synthesisData) {
  const {
    company_name,
    industry,
    city,
    grade,
    overall_score,
    design_score,
    seo_score,
    content_score,
    social_score,
    quick_wins_count = 0,
    // Add contact information fields
    contact_email,
    contact_phone,
    contact_name,
    url,
    // Benchmark data
    matched_benchmark
  } = analysisResult;

  // Calculate ROI potential
  const projectedScore = Math.min(100, overall_score + 20);
  const roiData = calculateROI(overall_score, projectedScore, industry);

  // Determine priority level based on grade
  const priorityLevel = grade <= 'C' ? 'High' : grade === 'B' ? 'Medium' : 'Low';
  const priorityIcon = priorityLevel === 'High' ? '🔴' : priorityLevel === 'Medium' ? '🟡' : '🟢';

  let html = '<!-- Executive Dashboard -->\n';
  html += '<div class="hero-section">\n';
  html += '  <div class="container">\n';
  html += '    <div class="hero-content">\n';

  // Header with contact info
  html += '      <div class="hero-header">\n';
  html += `        <h1 class="company-name">${escapeHtml(company_name)}</h1>\n`;

  // Show industry and city if available
  const metaParts = [];
  if (industry) metaParts.push(escapeHtml(industry));
  if (city) metaParts.push(escapeHtml(city));
  if (metaParts.length > 0) {
    html += `        <p class="company-meta">${metaParts.join(' • ')}</p>\n`;
  } else {
    html += `        <p class="company-meta">Website Performance Analysis</p>\n`;
  }

  // Add contact information if available - prominent black box
  if (contact_email || contact_phone || url) {
    html += '        <div class="contact-info-box" style="margin-top: 24px; padding: 16px 24px; background: rgba(0, 0, 0, 0.4); border: 2px solid rgba(255, 255, 255, 0.3); border-radius: 12px; backdrop-filter: blur(10px); display: inline-block;">\n';
    html += '          <div style="display: flex; flex-wrap: wrap; gap: 20px; align-items: center; justify-content: center;">\n';

    if (contact_email) {
      html += `            <a href="mailto:${escapeHtml(contact_email)}" style="color: white; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; font-weight: 500; padding: 8px 12px; background: rgba(255, 255, 255, 0.1); border-radius: 8px; transition: all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">`;
      html += `<span style="font-size: 1.2em;">📧</span><span>${escapeHtml(contact_email)}</span></a>\n`;
    }

    if (contact_phone) {
      const cleanPhone = contact_phone.replace(/\D/g, ''); // Remove non-digits
      html += `            <a href="tel:${cleanPhone}" style="color: white; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; font-weight: 500; padding: 8px 12px; background: rgba(255, 255, 255, 0.1); border-radius: 8px; transition: all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">`;
      html += `<span style="font-size: 1.2em;">📞</span><span>${escapeHtml(contact_phone)}</span></a>\n`;
    }

    if (url) {
      const displayUrl = url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
      html += `            <a href="${escapeHtml(url)}" target="_blank" style="color: white; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; font-weight: 500; padding: 8px 12px; background: rgba(255, 255, 255, 0.1); border-radius: 8px; transition: all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">`;
      html += `<span style="font-size: 1.2em;">🌐</span><span>${escapeHtml(displayUrl)}</span></a>\n`;
    }

    html += '          </div>\n';
    html += '        </div>\n';
  }

  html += '      </div>\n';

  // Score Display
  html += '      <div class="score-card">\n';
  html += '        <div class="score-display-wrapper">\n';

  // Score Circle
  html += '          <div class="score-circle">\n';
  html += `            <div class="grade-letter">${grade}</div>\n`;
  html += `            <div class="score-value">${Math.round(overall_score)}/100</div>\n`;
  html += '          </div>\n';

  // Score Breakdown (No redundant labels)
  html += '          <div class="score-details">\n';
  html += '            <div class="score-breakdown">\n';

  const scores = [
    { label: 'Design', value: design_score, icon: '🎨' },
    { label: 'SEO', value: seo_score, icon: '🔍' },
    { label: 'Content', value: content_score, icon: '✍️' },
    { label: 'Social', value: social_score, icon: '📱' }
  ];

  scores.forEach(score => {
    if (score.value !== undefined && score.value !== null) {
      html += '              <div class="metric-row">\n';
      html += '                <div class="metric-label">\n';
      html += `                  <span class="metric-icon">${score.icon}</span>\n`;
      html += `                  <span>${score.label}</span>\n`;
      html += '                </div>\n';
      html += `                <div class="metric-score">${Math.round(score.value || 0)}</div>\n`;
      html += '              </div>\n';
    }
  });

  html += '            </div>\n';
  html += '          </div>\n';
  html += '        </div>\n';

  // Benchmark Comparison (if available)
  if (matched_benchmark) {
    html += '        <div class="benchmark-comparison-card" style="margin-top: 24px; padding: 20px; background: rgba(255, 255, 255, 0.05); border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1);">\n';
    html += '          <h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.7; margin-bottom: 16px;">vs. Industry Leader</h3>\n';
    html += '          <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 16px; align-items: center;">\n';

    // Your side
    html += '            <div style="text-align: center;">\n';
    html += `              <div style="font-size: 12px; opacity: 0.7; margin-bottom: 4px;">Your Website</div>\n`;
    html += `              <div style="font-size: 24px; font-weight: bold;">${grade} (${Math.round(overall_score)})</div>\n`;
    html += '            </div>\n';

    // VS separator
    html += '            <div style="font-size: 16px; opacity: 0.5; font-weight: 300;">vs</div>\n';

    // Benchmark side
    html += '            <div style="text-align: center;">\n';
    html += `              <div style="font-size: 12px; opacity: 0.7; margin-bottom: 4px;">${escapeHtml(matched_benchmark.company_name)}</div>\n`;
    html += `              <div style="font-size: 24px; font-weight: bold;">${matched_benchmark.scores.grade} (${Math.round(matched_benchmark.scores.overall)})</div>\n`;
    html += '            </div>\n';

    html += '          </div>\n';

    // Gap indicator
    const gap = matched_benchmark.scores.overall - overall_score;
    const gapText = gap > 0 ? `${Math.round(gap)} points to close` : gap < 0 ? `${Math.round(Math.abs(gap))} points ahead!` : 'Matched!';
    const gapColor = gap > 0 ? 'rgba(251, 191, 36, 0.8)' : gap < 0 ? 'rgba(34, 197, 94, 0.8)' : 'rgba(34, 197, 94, 0.8)';

    html += `          <div style="text-align: center; margin-top: 12px; font-size: 13px; color: ${gapColor};">\n`;
    html += `            ${gap > 0 ? '↑' : gap < 0 ? '✓' : '✓'} ${gapText}\n`;
    html += '          </div>\n';

    // Match info
    html += `          <div style="text-align: center; margin-top: 8px; font-size: 11px; opacity: 0.6;">\n`;
    html += `            ${Math.round(matched_benchmark.match_score)}% match • ${matched_benchmark.comparison_tier}\n`;
    html += '          </div>\n';

    html += '        </div>\n';
  }

  // Three Key Metrics Only
  html += '        <div class="metrics-grid">\n';

  // Priority
  html += '          <div class="metric-card">\n';
  html += '            <div class="metric-card-header">\n';
  html += `              <div class="metric-card-icon">${priorityIcon}</div>\n`;
  html += '              <div class="metric-card-title">Priority</div>\n';
  html += '            </div>\n';
  html += `            <div class="metric-card-value">${priorityLevel}</div>\n`;
  html += '          </div>\n';

  // ROI
  html += '          <div class="metric-card">\n';
  html += '            <div class="metric-card-header">\n';
  html += '              <div class="metric-card-icon">💰</div>\n';
  html += '              <div class="metric-card-title">ROI Potential</div>\n';
  html += '            </div>\n';
  html += `            <div class="metric-card-value">${roiData.multiplier}x</div>\n`;
  html += '          </div>\n';

  // Quick Wins
  html += '          <div class="metric-card">\n';
  html += '            <div class="metric-card-header">\n';
  html += '              <div class="metric-card-icon">⚡</div>\n';
  html += '              <div class="metric-card-title">Quick Wins</div>\n';
  html += '            </div>\n';
  html += `            <div class="metric-card-value">${quick_wins_count}</div>\n`;
  html += '          </div>\n';

  html += '        </div>\n';
  html += '      </div>\n';
  html += '    </div>\n';
  html += '  </div>\n';
  html += '</div>\n\n';

  return html;
}

/**
 * Generate strategic assessment (combines summary and business impact)
 */
function generateStrategicAssessment(analysisResult, synthesisData) {
  const { grade, overall_score, company_name, top_issue, one_liner } = analysisResult;

  let html = '    <!-- Strategic Assessment -->\n';
  html += '    <section class="section" id="assessment">\n';
  html += '      <div class="section-header">\n';
  html += '        <h2 class="section-title">\n';
  html += '          <span class="section-title-icon">🎯</span>\n';
  html += '          Strategic Assessment\n';
  html += '        </h2>\n';
  html += '      </div>\n';

  // Executive Summary Paragraph
  let summary = '';
  if (synthesisData.executiveSummary?.overview) {
    summary = synthesisData.executiveSummary.overview;
  } else if (one_liner) {
    summary = one_liner;
  } else {
    summary = getDefaultSummary(grade, overall_score, company_name);
  }

  html += `      <p class="section-description">${escapeHtml(summary)}</p>\n`;

  // Top Priority Issue (if available)
  if (top_issue || synthesisData.executiveSummary?.topPriority) {
    let priority = top_issue || synthesisData.executiveSummary.topPriority;

    // Handle if priority is an object (from synthesis)
    if (typeof priority === 'object' && priority !== null) {
      priority = priority.title || priority.description || priority.text || JSON.stringify(priority);
    }

    html += '      <div class="alert-box mt-8" style="background: var(--warning-lightest); border-left: 4px solid var(--warning); padding: 20px; border-radius: 8px; margin-top: 32px;">\n';
    html += '        <strong style="display: block; margin-bottom: 8px;">🎯 Top Priority:</strong>\n';
    html += `        ${escapeHtml(priority)}\n`;
    html += '      </div>\n';
  }

  // Business Impact Table (only if synthesis data available)
  if (synthesisData.executiveSummary?.businessImpact && synthesisData.executiveSummary.businessImpact.length > 0) {
    html += '      <div class="mt-8" style="margin-top: 32px;">\n';
    html += '        <h3 style="font-size: 1.25rem; margin-bottom: 16px;">Business Impact Analysis</h3>\n';
    html += '        <table class="data-table">\n';
    html += '          <thead>\n';
    html += '            <tr>\n';
    html += '              <th>Area</th>\n';
    html += '              <th>Current Impact</th>\n';
    html += '              <th>Opportunity</th>\n';
    html += '            </tr>\n';
    html += '          </thead>\n';
    html += '          <tbody>\n';

    synthesisData.executiveSummary.businessImpact.slice(0, 3).forEach(impact => {
      html += '            <tr>\n';
      html += `              <td><strong>${escapeHtml(impact.area)}</strong></td>\n`;
      html += `              <td>${escapeHtml(impact.current)}</td>\n`;
      html += `              <td style="color: var(--success);">${escapeHtml(impact.potential)}</td>\n`;
      html += '            </tr>\n';
    });

    html += '          </tbody>\n';
    html += '        </table>\n';
    html += '      </div>\n';
  }

  html += '    </section>\n\n';
  return html;
}

/**
 * Generate action plan (consolidated issues without repetition)
 */
function generateActionPlan(analysisResult, synthesisData) {
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
    html += `        <div class="action-card ${priority}">\n`;
    html += '          <div class="action-header">\n';
    html += `            <div class="action-number">${actionNumber++}</div>\n`;
    html += `            <h3 class="action-title">${escapeHtml(issue.title || issue.description)}</h3>\n`;
    html += '          </div>\n';
    html += '          <div class="action-content">\n';

    if (issue.businessImpact) {
      html += `            <p class="action-description">${escapeHtml(issue.businessImpact)}</p>\n`;
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

/**
 * Generate SPECIFIC timeline based on actual issues
 */
function generateTimeline(analysisResult, synthesisData) {
  const {
    industry,
    grade,
    quick_wins = [],
    design_issues_desktop = [],
    design_issues_mobile = [],
    seo_issues = [],
    content_issues = [],
    top_issue
  } = analysisResult;

  // Combine design issues
  const design_issues = [...(design_issues_desktop || []), ...(design_issues_mobile || [])];

  // Get consolidated issues for better planning
  const issues = synthesisData.consolidatedIssues || extractTopIssues(analysisResult);
  const criticalIssues = issues.filter(i => i.severity === 'critical' || i.priority === 'critical');
  const highIssues = issues.filter(i => i.severity === 'high' || i.priority === 'high');

  let html = '    <!-- Implementation Timeline -->\n';
  html += '    <section class="section" id="timeline">\n';
  html += '      <div class="section-header">\n';
  html += '        <h2 class="section-title">\n';
  html += '          <span class="section-title-icon">📅</span>\n';
  html += '          30-60-90 Day Implementation Plan\n';
  html += '        </h2>\n';
  html += '        <p class="section-description">Phased approach to prioritize quick wins and high-impact improvements</p>\n';
  html += '      </div>\n';

  html += '      <div class="roadmap-timeline">\n';
  html += '        <div class="timeline-connector"></div>\n';

  // Get consolidated issues if available
  const consolidatedIssues = synthesisData?.consolidatedIssues || [];

  // 30 Days - Quick Wins & Critical Fixes
  html += '        <div class="roadmap-phase">\n';
  html += '          <div class="phase-marker">30</div>\n';
  html += '          <div class="phase-content">\n';
  html += '            <h3 class="phase-title">First 30 Days: Quick Wins & Critical Fixes</h3>\n';

  // Show quick wins and top critical items by title only
  const phase1Items = [];
  
  // Add top issue first
  if (top_issue) {
    const topIssueText = typeof top_issue === 'string' ? top_issue : (top_issue.title || top_issue.description || '');
    if (topIssueText) {
      phase1Items.push(topIssueText);
    }
  }
  
  // Add quick wins (concise references)
  if (quick_wins.length > 0) {
    quick_wins.slice(0, 4).forEach(win => {
      if (win && !phase1Items.includes(win)) {
        phase1Items.push(win);
      }
    });
  }

  if (phase1Items.length > 0) {
    html += '            <ul style="margin: 8px 0; padding-left: 20px; color: var(--text-secondary);">\n';
    phase1Items.slice(0, 5).forEach(item => {
      html += `              <li style="margin-bottom: 4px;">${escapeHtml(item)}</li>\n`;
    });
    html += '            </ul>\n';
  } else {
    html += '            <p style="color: var(--text-secondary); margin: 8px 0;">Implement immediate fixes and low-hanging fruit improvements</p>\n';
  }

  html += '          </div>\n';
  html += '        </div>\n';

  // 60 Days - High-Impact Improvements
  html += '        <div class="roadmap-phase">\n';
  html += '          <div class="phase-marker">60</div>\n';
  html += '          <div class="phase-content">\n';
  html += '            <h3 class="phase-title">Days 31-60: High-Impact Improvements</h3>\n';

  // Reference consolidated issues by title only (no descriptions)
  const phase2Items = [];
  
  if (consolidatedIssues.length > 0) {
    // Get issues marked as high priority
    consolidatedIssues
      .filter(i => i.severity === 'high' || i.priority === 'high')
      .slice(0, 3)
      .forEach(issue => {
        phase2Items.push(issue.title);
      });
  }
  
  // Fallback to design/content issues if no consolidated issues
  if (phase2Items.length === 0) {
    if (design_issues.length > 0) {
      design_issues.slice(0, 2).forEach(issue => {
        const text = typeof issue === 'string' ? issue : (issue.title || issue.description || '');
        if (text && !phase2Items.includes(text)) {
          phase2Items.push(text);
        }
      });
    }
  }
  
  // Add a few SEO issues if phase2 needs more items
  if (phase2Items.length < 3 && seo_issues.length > 0) {
    seo_issues.slice(0, 2).forEach(issue => {
      const text = typeof issue === 'string' ? issue : (issue.title || issue.description || '');
      if (text && !phase2Items.includes(text)) {
        phase2Items.push(text);
      }
    });
  }

  if (phase2Items.length > 0) {
    html += '            <ul style="margin: 8px 0; padding-left: 20px; color: var(--text-secondary);">\n';
    phase2Items.slice(0, 4).forEach(item => {
      html += `              <li style="margin-bottom: 4px;">${escapeHtml(item)}</li>\n`;
    });
    html += '            </ul>\n';
  } else {
    html += '            <p style="color: var(--text-secondary); margin: 8px 0;">Enhance user experience and SEO foundations</p>\n';
  }

  html += '          </div>\n';
  html += '        </div>\n';

  // 90 Days - Strategic Enhancements  
  html += '        <div class="roadmap-phase">\n';
  html += '          <div class="phase-marker">90</div>\n';
  html += '          <div class="phase-content">\n';
  html += '            <h3 class="phase-title">Days 61-90: Strategic Enhancements</h3>\n';

  // Industry-specific strategic recommendations (not repeating issues)
  const phase3Items = [];
  
  // Add industry-specific growth initiatives based on business type
  if (industry) {
    const industryLower = industry.toLowerCase();
    if (industryLower.includes('hvac') || industryLower.includes('plumb') || industryLower.includes('electric')) {
      phase3Items.push('Build service area pages for local SEO');
      phase3Items.push('Add customer review integration');
      phase3Items.push('Create seasonal service campaigns');
    } else if (industryLower.includes('dental') || industryLower.includes('medical') || industryLower.includes('health')) {
      phase3Items.push('Implement online appointment booking');
      phase3Items.push('Add patient portal integration');
      phase3Items.push('Create procedure-specific landing pages');
    } else if (industryLower.includes('restaurant') || industryLower.includes('food')) {
      phase3Items.push('Integrate online ordering system');
      phase3Items.push('Set up reservation system');
      phase3Items.push('Add menu with pricing and photos');
    } else if (industryLower.includes('retail') || industryLower.includes('ecommerce') || industryLower.includes('shop')) {
      phase3Items.push('Enhance product pages with rich media');
      phase3Items.push('Implement abandoned cart recovery');
      phase3Items.push('Add product recommendations');
    } else if (industryLower.includes('legal') || industryLower.includes('law')) {
      phase3Items.push('Add case studies and testimonials');
      phase3Items.push('Implement live chat for consultations');
      phase3Items.push('Create practice area landing pages');
    } else {
      phase3Items.push('Implement conversion tracking & analytics');
      phase3Items.push('Develop content marketing strategy');
      phase3Items.push('Set up A/B testing framework');
    }
  }

  if (phase3Items.length === 0) {
    phase3Items.push('Implement advanced SEO strategies');
    phase3Items.push('Enhance user engagement features');
    phase3Items.push('Build social proof elements');
  }

  html += '            <ul style="margin: 8px 0; padding-left: 20px; color: var(--text-secondary);">\n';
  phase3Items.slice(0, 5).forEach(item => {
    html += `              <li style="margin-bottom: 4px;">${escapeHtml(item)}</li>\n`;
  });
  html += '            </ul>\n';

  html += '          </div>\n';
  html += '        </div>\n';

  html += '      </div>\n';
  html += '    </section>\n\n';
  return html;
}

/**
 * Generate visual evidence section
 */
function generateVisualEvidence(screenshotData, registry) {
  let html = '    <!-- Visual Evidence -->\n';
  html += '    <section class="section" id="screenshots">\n';
  html += '      <div class="section-header">\n';
  html += '        <h2 class="section-title">\n';
  html += '          <span class="section-title-icon">📸</span>\n';
  html += '          Current State\n';
  html += '        </h2>\n';
  html += '      </div>\n';

  html += '      <div class="screenshots-grid">\n';

  // Show only desktop and mobile views (not every page)
  const mainScreenshots = screenshotData.screenshots.filter(s =>
    s.title === 'Desktop View' || s.title === 'Mobile View'
  ).slice(0, 2);

  mainScreenshots.forEach(screenshot => {
    html += '        <div class="screenshot-card">\n';
    html += `          <img src="${screenshot.dataUri}" alt="${escapeHtml(screenshot.title)}" class="screenshot-image">\n`;
    html += `          <div class="screenshot-caption">${escapeHtml(screenshot.title)}</div>\n`;
    html += '        </div>\n';
  });

  html += '      </div>\n';
  html += '    </section>\n\n';
  return html;
}

/**
 * Generate footer with optional business intel summary
 */
function generateFooter(analysisResult) {
  const {
    years_in_business,
    employee_count,
    pricing_visible,
    budget_indicator,
    premium_features,
    tech_stack,
    analysis_cost,
    analysis_time
  } = analysisResult;

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  let html = '';

  // Add business intelligence summary if we have meaningful data
  const hasBizIntel = years_in_business || employee_count || premium_features?.length > 0 || 
                      tech_stack || pricing_visible !== undefined;

  if (hasBizIntel) {
    html += '    <section class="section" style="margin-top: 48px;">\n';
    html += '      <div class="section-header">\n';
    html += '        <h2 class="section-title">\n';
    html += '          <span class="section-title-icon">💡</span>\n';
    html += '          Additional Insights\n';
    html += '        </h2>\n';
    html += '      </div>\n';

    html += '      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">\n';

    // Business maturity card
    if (years_in_business || employee_count) {
      html += '        <div style="background: var(--bg-secondary); padding: 20px; border-radius: 12px;">\n';
      html += '          <h3 style="margin-bottom: 12px; font-size: 1rem; color: var(--text-primary);">Business Maturity</h3>\n';
      if (years_in_business) {
        html += `          <p style="margin: 8px 0; color: var(--text-secondary);"><strong>${years_in_business} years</strong> in business</p>\n`;
      }
      if (employee_count) {
        html += `          <p style="margin: 8px 0; color: var(--text-secondary);">Team size: <strong>${employee_count}</strong></p>\n`;
      }
      html += '        </div>\n';
    }

    // Technology & Features card
    if (tech_stack || premium_features?.length > 0) {
      html += '        <div style="background: var(--bg-secondary); padding: 20px; border-radius: 12px;">\n';
      html += '          <h3 style="margin-bottom: 12px; font-size: 1rem; color: var(--text-primary);">Technology</h3>\n';
      if (tech_stack) {
        html += `          <p style="margin: 8px 0; color: var(--text-secondary);">Platform: <strong>${escapeHtml(tech_stack)}</strong></p>\n`;
      }
      if (premium_features && premium_features.length > 0) {
        html += `          <p style="margin: 8px 0; color: var(--text-secondary);"><strong>${premium_features.length}</strong> premium features detected</p>\n`;
      }
      html += '        </div>\n';
    }

    // Investment indicators card
    if (pricing_visible !== undefined || budget_indicator) {
      html += '        <div style="background: var(--bg-secondary); padding: 20px; border-radius: 12px;">\n';
      html += '          <h3 style="margin-bottom: 12px; font-size: 1rem; color: var(--text-primary);">Investment Profile</h3>\n';
      if (pricing_visible !== undefined) {
        html += `          <p style="margin: 8px 0; color: var(--text-secondary);">Pricing visible: <strong>${pricing_visible ? 'Yes' : 'No'}</strong></p>\n`;
      }
      if (budget_indicator) {
        const budgetLabel = budget_indicator === 'premium' ? '💎 Premium' : 
                           budget_indicator === 'mid-tier' ? '💼 Mid-tier' : '💰 Budget-conscious';
        html += `          <p style="margin: 8px 0; color: var(--text-secondary);">${budgetLabel}</p>\n`;
      }
      html += '        </div>\n';
    }

    // Analysis metadata card
    if (analysis_cost || analysis_time) {
      html += '        <div style="background: var(--bg-secondary); padding: 20px; border-radius: 12px;">\n';
      html += '          <h3 style="margin-bottom: 12px; font-size: 1rem; color: var(--text-primary);">Analysis Details</h3>\n';
      if (analysis_time) {
        const seconds = Math.floor(analysis_time / 1000);
        const minutes = Math.floor(seconds / 60);
        html += `          <p style="margin: 8px 0; color: var(--text-secondary);">Duration: <strong>${minutes > 0 ? minutes + 'm ' : ''}${seconds % 60}s</strong></p>\n`;
      }
      if (analysis_cost) {
        html += `          <p style="margin: 8px 0; color: var(--text-secondary);">AI Analysis Cost: <strong>$${Number(analysis_cost).toFixed(4)}</strong></p>\n`;
      }
      html += '        </div>\n';
    }

    html += '      </div>\n';
    html += '    </section>\n\n';
  }

  html += '    <div class="report-footer">\n';
  html += '      <div class="container">\n';
  html += '        <div class="footer-content">\n';
  html += '          <div class="footer-logo">MaxantAgency</div>\n';
  html += '          <p class="footer-text">\n';
  html += '            Professional website analysis powered by AI-driven insights.\n';
  html += `            Report generated on ${today}.\n`;
  html += '          </p>\n';
  html += '        </div>\n';
  html += '      </div>\n';
  html += '    </div>\n';
  return html;
}

/**
 * Helper Functions
 */

function getDefaultSummary(grade, score, companyName) {
  if (grade === 'A') {
    return `${companyName}'s website demonstrates excellent performance. Minor optimizations can further enhance results.`;
  } else if (grade === 'B') {
    return `${companyName}'s website performs well with opportunities to enhance user experience and conversion rates.`;
  } else if (grade === 'C') {
    return `${companyName}'s website has significant improvement opportunities that will enhance user engagement.`;
  } else {
    return `${companyName}'s website requires comprehensive improvements to establish a stronger digital presence.`;
  }
}

function extractTopIssues(analysisResult) {
  const issues = [];

  // Add top issue if available
  if (analysisResult.top_issue) {
    issues.push({
      title: analysisResult.top_issue,
      severity: 'critical',
      businessImpact: 'Primary barrier to website success'
    });
  }

  // Add top design issues
  if (analysisResult.design_issues?.length > 0) {
    analysisResult.design_issues.slice(0, 2).forEach(issue => {
      issues.push({
        title: issue,
        severity: 'high',
        businessImpact: 'Impacts user experience and conversions'
      });
    });
  }

  // Add top SEO issues
  if (analysisResult.seo_issues?.length > 0) {
    analysisResult.seo_issues.slice(0, 2).forEach(issue => {
      issues.push({
        title: issue,
        severity: 'high',
        businessImpact: 'Limits search visibility and traffic'
      });
    });
  }

  return issues;
}

async function processScreenshots(analysisResult, registry) {
  const screenshots = [];
  const { screenshot_desktop_url, screenshot_mobile_url } = analysisResult;

  const toBase64 = async (path) => {
    if (!path || typeof path !== 'string') return null;

    const trimmed = path.trim();
    if (trimmed.startsWith('data:')) return trimmed;

    const filePath = trimmed.startsWith('file://') ?
      trimmed.replace('file://', '') : trimmed;

    const absolutePath = isAbsolute(filePath) ?
      filePath : join(process.cwd(), filePath);

    if (!existsSync(absolutePath)) {
      console.warn(`[HTML Exporter V3] Screenshot not found: ${absolutePath}`);
      return null;
    }

    try {
      const dataUri = await compressImageFromFile(absolutePath, {
        maxWidth: 1200,
        quality: 85  // Changed from 0.85 to 85 (integer percentage)
      });
      return dataUri;
    } catch (error) {
      console.error('[HTML Exporter V3] Failed to process screenshot:', error);
      return null;
    }
  };

  // Process desktop screenshot
  if (screenshot_desktop_url) {
    const dataUri = await toBase64(screenshot_desktop_url);
    if (dataUri) {
      screenshots.push({
        title: 'Desktop View',
        type: 'desktop',
        dataUri
      });
    }
  }

  // Process mobile screenshot
  if (screenshot_mobile_url) {
    const dataUri = await toBase64(screenshot_mobile_url);
    if (dataUri) {
      screenshots.push({
        title: 'Mobile View',
        type: 'mobile',
        dataUri
      });
    }
  }

  return { screenshots };
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

// Export as default (already exported as named on line 29)
export default generateHTMLReportV3;