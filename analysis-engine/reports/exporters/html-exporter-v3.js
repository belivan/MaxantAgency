/**
 * HTML Report Exporter V3 - Professional Light Theme
 * ===================================================
 * Generates beautiful, mobile-responsive HTML reports with:
 * - Professional light color scheme
 * - Mobile-first responsive design
 * - Improved typography and spacing
 * - Accessible and print-optimized
 * - Modern card-based layout
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
 * Generate professional HTML report with light theme
 * @param {Object} analysisResult - Complete analysis data
 * @param {Object} synthesisData - AI synthesis results (optional but recommended)
 * @returns {string} Complete HTML report
 */
export async function generateHTMLReportV3(analysisResult, synthesisData = {}) {
  console.log('[HTML Exporter V3] 🎨 Generating professional report with light theme...');

  const {
    company_name,
    grade,
    overall_score,
    industry,
    city,
    analyzed_at,
    url
  } = analysisResult;

  // Load the new professional template
  const templatePath = join(__dirname, '../templates/html-template-v3.html');
  const template = await readFile(templatePath, 'utf-8');

  // Create screenshot registry
  const registry = new ScreenshotRegistry();

  // Process screenshots for embedding
  const screenshotData = await processScreenshots(analysisResult, registry);

  // Generate the complete HTML content
  const htmlContent = await generateReportContent(
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

  console.log('[HTML Exporter V3] ✅ Report generation complete!');
  return html;
}

/**
 * Generate the complete report content
 */
async function generateReportContent(analysisResult, synthesisData, registry, screenshotData) {
  let content = '';

  // 1. Hero Section with Executive Dashboard
  content += generateHeroSection(analysisResult, synthesisData);

  // Start main content wrapper
  content += '<div class="main-content">\n';
  content += '  <div class="container">\n';

  // 2. Executive Summary Section
  content += generateExecutiveSummary(analysisResult, synthesisData);

  // 3. Priority Actions Section
  content += generatePriorityActions(analysisResult, synthesisData);

  // 4. Implementation Roadmap
  content += generateRoadmap(analysisResult, synthesisData);

  // 5. Screenshots Section
  if (screenshotData.screenshots.length > 0) {
    content += generateScreenshotsSection(screenshotData, registry);
  }

  // 6. Technical Details (Appendix)
  content += generateTechnicalAppendix(analysisResult, synthesisData);

  // Close main content wrapper
  content += '  </div>\n';
  content += '</div>\n';

  // 7. Footer
  content += generateFooter(analysisResult);

  return content;
}

/**
 * Generate hero section with score display
 */
function generateHeroSection(analysisResult, synthesisData) {
  const {
    company_name,
    industry,
    city,
    grade,
    overall_score,
    design_score,
    seo_score,
    content_score,
    social_score
  } = analysisResult;

  const gradeClass = `grade-${grade.toLowerCase()}`;

  let html = '<!-- Hero Section -->\n';
  html += '<div class="hero-section">\n';
  html += '  <div class="container">\n';
  html += '    <div class="hero-content">\n';

  // Header with contact info
  html += '      <div class="hero-header">\n';
  html += `        <h1 class="company-name">${escapeHtml(company_name)}</h1>\n`;
  
  // Show industry and city
  const metaParts = [];
  if (industry) metaParts.push(escapeHtml(industry));
  if (city) metaParts.push(escapeHtml(city));
  if (metaParts.length > 0) {
    html += `        <p class="company-meta">${metaParts.join(' • ')}</p>\n`;
  }

  // Add contact information if available - prominent black box
  const { contact_email, contact_phone, url } = analysisResult;
  if (contact_email || contact_phone || url) {
    html += '        <div class="contact-info-box" style="margin-top: 24px; padding: 16px 24px; background: rgba(0, 0, 0, 0.4); border: 2px solid rgba(255, 255, 255, 0.3); border-radius: 12px; backdrop-filter: blur(10px); display: inline-block;">\n';
    html += '          <div style="display: flex; flex-wrap: wrap; gap: 20px; align-items: center; justify-content: center;">\n';

    if (contact_email) {
      html += `            <a href="mailto:${escapeHtml(contact_email)}" style="color: white; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; font-weight: 500; padding: 8px 12px; background: rgba(255, 255, 255, 0.1); border-radius: 8px; transition: all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">`;
      html += `<span style="font-size: 1.2em;">📧</span><span>${escapeHtml(contact_email)}</span></a>\n`;
    }

    if (contact_phone) {
      const cleanPhone = contact_phone.replace(/\D/g, '');
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

  // Score Card
  html += '      <div class="score-card">\n';
  html += '        <div class="score-display-wrapper">\n';

  // Score Circle
  html += '          <div class="score-circle">\n';
  html += `            <div class="grade-letter">${grade}</div>\n`;
  html += `            <div class="score-value">${Math.round(overall_score)}/100</div>\n`;
  html += '          </div>\n';

  // Score Details
  html += '          <div class="score-details">\n';
  html += '            <div class="score-breakdown">\n';

  // Individual Scores
  const scores = [
    { label: 'Design & UX', value: design_score, icon: '🎨' },
    { label: 'SEO & Technical', value: seo_score, icon: '🔍' },
    { label: 'Content Quality', value: content_score, icon: '✍️' },
    { label: 'Social Presence', value: social_score, icon: '📱' }
  ];

  scores.forEach(score => {
    html += '              <div class="metric-row">\n';
    html += '                <div class="metric-label">\n';
    html += `                  <span class="metric-icon">${score.icon}</span>\n`;
    html += `                  <span>${score.label}</span>\n`;
    html += '                </div>\n';
    html += `                <div class="metric-score">${Math.round(score.value || 0)}</div>\n`;
    html += '              </div>\n';
  });

  html += '            </div>\n';
  html += '          </div>\n';
  html += '        </div>\n';

  // Key Metrics Grid
  if (synthesisData.executiveSummary) {
    html += generateKeyMetrics(analysisResult, synthesisData);
  }

  html += '      </div>\n';
  html += '    </div>\n';
  html += '  </div>\n';
  html += '</div>\n\n';

  return html;
}

/**
 * Generate key metrics cards
 */
function generateKeyMetrics(analysisResult, synthesisData) {
  const { quick_wins_count } = analysisResult;

  // Calculate ROI
  const roiData = calculateROI(
    analysisResult.overall_score,
    analysisResult.overall_score + 20, // Projected improvement
    analysisResult.industry
  );

  let html = '        <div class="metrics-grid">\n';

  // Priority Level
  const priorityLevel = analysisResult.grade <= 'C' ? 'High' :
                       analysisResult.grade === 'B' ? 'Medium' : 'Low';
  const priorityColor = priorityLevel === 'High' ? '🔴' :
                       priorityLevel === 'Medium' ? '🟡' : '🟢';

  html += '          <div class="metric-card">\n';
  html += '            <div class="metric-card-header">\n';
  html += `              <div class="metric-card-icon">${priorityColor}</div>\n`;
  html += '              <div class="metric-card-title">Priority Level</div>\n';
  html += '            </div>\n';
  html += `            <div class="metric-card-value">${priorityLevel}</div>\n`;
  html += '            <div class="metric-card-detail">Based on overall assessment</div>\n';
  html += '          </div>\n';

  // ROI Potential
  html += '          <div class="metric-card">\n';
  html += '            <div class="metric-card-header">\n';
  html += '              <div class="metric-card-icon">💰</div>\n';
  html += '              <div class="metric-card-title">ROI Potential</div>\n';
  html += '            </div>\n';
  html += `            <div class="metric-card-value">${roiData.multiplier}x</div>\n`;
  html += `            <div class="metric-card-detail">In ${roiData.timeline}</div>\n`;
  html += '          </div>\n';

  // Quick Wins
  html += '          <div class="metric-card">\n';
  html += '            <div class="metric-card-header">\n';
  html += '              <div class="metric-card-icon">⚡</div>\n';
  html += '              <div class="metric-card-title">Quick Wins</div>\n';
  html += '            </div>\n';
  html += `            <div class="metric-card-value">${quick_wins_count || 0}</div>\n`;
  html += '            <div class="metric-card-detail">Immediate improvements</div>\n';
  html += '          </div>\n';

  html += '        </div>\n';
  return html;
}

/**
 * Generate executive summary section
 */
function generateExecutiveSummary(analysisResult, synthesisData) {
  let html = '    <!-- Executive Summary -->\n';
  html += '    <section class="section" id="executive-summary">\n';
  html += '      <div class="section-header">\n';
  html += '        <h2 class="section-title">\n';
  html += '          <span class="section-title-icon">📊</span>\n';
  html += '          Executive Summary\n';
  html += '        </h2>\n';

  if (synthesisData.executiveSummary) {
    html += `        <p class="section-description">${escapeHtml(synthesisData.executiveSummary.overview)}</p>\n`;
  } else {
    const defaultSummary = getDefaultExecutiveSummary(analysisResult);
    html += `        <p class="section-description">${defaultSummary}</p>\n`;
  }

  html += '      </div>\n';

  // Business Impact Analysis
  if (synthesisData.executiveSummary?.businessImpact) {
    html += '      <div class="data-table-wrapper mt-8">\n';
    html += '        <table class="data-table">\n';
    html += '          <thead>\n';
    html += '            <tr>\n';
    html += '              <th>Impact Area</th>\n';
    html += '              <th>Current State</th>\n';
    html += '              <th>Improvement Potential</th>\n';
    html += '            </tr>\n';
    html += '          </thead>\n';
    html += '          <tbody>\n';

    synthesisData.executiveSummary.businessImpact.forEach(impact => {
      html += '            <tr>\n';
      html += `              <td><strong>${escapeHtml(impact.area)}</strong></td>\n`;
      html += `              <td>${escapeHtml(impact.current)}</td>\n`;
      html += `              <td>${escapeHtml(impact.potential)}</td>\n`;
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
 * Generate priority actions section
 */
function generatePriorityActions(analysisResult, synthesisData) {
  let html = '    <!-- Priority Actions -->\n';
  html += '    <section class="section" id="priority-actions">\n';
  html += '      <div class="section-header">\n';
  html += '        <h2 class="section-title">\n';
  html += '          <span class="section-title-icon">🎯</span>\n';
  html += '          Priority Actions\n';
  html += '        </h2>\n';
  html += '        <p class="section-description">Recommended improvements organized by impact and urgency. Focus on critical issues first for maximum ROI.</p>\n';
  html += '      </div>\n';

  html += '      <div class="actions-grid">\n';

  // Get consolidated issues or fall back to raw issues
  const issues = synthesisData.consolidatedIssues ||
                 generateConsolidatedIssuesFromRaw(analysisResult);

  // Group issues by priority
  const criticalIssues = issues.filter(i => i.severity === 'critical');
  const highIssues = issues.filter(i => i.severity === 'high');
  const mediumIssues = issues.filter(i => i.severity === 'medium');

  let actionNumber = 1;

  // Critical Issues
  if (criticalIssues.length > 0) {
    criticalIssues.forEach(issue => {
      html += generateActionCard(issue, actionNumber++, 'critical');
    });
  }

  // High Priority Issues
  if (highIssues.length > 0) {
    highIssues.forEach(issue => {
      html += generateActionCard(issue, actionNumber++, 'high');
    });
  }

  // Medium Priority Issues
  if (mediumIssues.length > 0) {
    mediumIssues.slice(0, 3).forEach(issue => {
      html += generateActionCard(issue, actionNumber++, 'medium');
    });
  }

  // Quick Wins Section
  const quickWins = analysisResult.quick_wins || [];
  if (quickWins.length > 0) {
    html += '        <div class="action-card low">\n';
    html += '          <div class="action-header">\n';
    html += `            <div class="action-number">⚡</div>\n`;
    html += '            <h3 class="action-title">Quick Wins - Easy Improvements</h3>\n';
    html += '            <span class="action-priority priority-low">Quick</span>\n';
    html += '          </div>\n';
    html += '          <div class="action-content">\n';
    html += '            <ul style="margin: 0; padding-left: 20px;">\n';
    quickWins.slice(0, 5).forEach(win => {
      html += `              <li style="margin-bottom: 8px;">${escapeHtml(win)}</li>\n`;
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
 * Generate individual action card
 */
function generateActionCard(issue, number, priority) {
  let html = `        <div class="action-card ${priority}">\n`;
  html += '          <div class="action-header">\n';
  html += `            <div class="action-number">${number}</div>\n`;
  html += `            <h3 class="action-title">${escapeHtml(issue.title)}</h3>\n`;
  html += `            <span class="action-priority priority-${priority}">${priority}</span>\n`;
  html += '          </div>\n';
  html += '          <div class="action-content">\n';
  html += `            <p class="action-description">${escapeHtml(issue.description)}</p>\n`;

  if (issue.businessImpact) {
    html += '            <div class="action-impact">\n';
    html += '              <div class="impact-label">Business Impact</div>\n';
    html += `              <div class="impact-text">${escapeHtml(issue.businessImpact)}</div>\n`;
    html += '            </div>\n';
  }

  if (issue.recommendation) {
    html += '            <div class="action-recommendation">\n';
    html += '              <span>→</span>\n';
    html += `              <span>${escapeHtml(issue.recommendation)}</span>\n`;
    html += '            </div>\n';
  }

  html += '          </div>\n';
  html += '        </div>\n';
  return html;
}

/**
 * Generate implementation roadmap section with REAL data-driven tasks
 */
function generateRoadmap(analysisResult, synthesisData) {
  const {
    quick_wins = [],
    design_issues_desktop = [],
    design_issues_mobile = [],
    seo_issues = [],
    content_issues = [],
    accessibility_issues = [],
    top_issue,
    industry
  } = analysisResult;

  // Get consolidated issues for better organization
  const issues = synthesisData.consolidatedIssues || generateConsolidatedIssuesFromRaw(analysisResult);
  const criticalIssues = issues.filter(i => i.severity === 'critical');
  const highIssues = issues.filter(i => i.severity === 'high');
  const mediumIssues = issues.filter(i => i.severity === 'medium');

  let html = '    <!-- Implementation Roadmap -->\n';
  html += '    <section class="section" id="roadmap">\n';
  html += '      <div class="section-header">\n';
  html += '        <h2 class="section-title">\n';
  html += '          <span class="section-title-icon">📅</span>\n';
  html += '          Implementation Roadmap\n';
  html += '        </h2>\n';
  html += '        <p class="section-description">A phased approach based on your specific website issues, prioritized for maximum impact.</p>\n';
  html += '      </div>\n';

  html += '      <div class="roadmap-timeline">\n';
  html += '        <div class="timeline-connector"></div>\n';

  // PHASE 1: Week 1-2 - Quick Wins & Critical Issues
  html += '        <div class="roadmap-phase">\n';
  html += '          <div class="phase-marker">1</div>\n';
  html += '          <div class="phase-content">\n';
  html += '            <div class="phase-header">\n';
  html += '              <h3 class="phase-title">Week 1-2: Critical Fixes & Quick Wins</h3>\n';
  html += `              <span class="phase-timeline">📅 ${quick_wins.length + criticalIssues.length} items</span>\n`;
  html += '            </div>\n';
  html += '            <div class="phase-tasks">\n';

  let phase1Tasks = [];
  
  // Add top issue first if it exists
  if (top_issue) {
    phase1Tasks.push(typeof top_issue === 'string' ? top_issue : (top_issue.title || top_issue.description || 'Address critical issue'));
  }
  
  // Add critical issues
  criticalIssues.slice(0, 2).forEach(issue => {
    phase1Tasks.push(issue.title || issue.description);
  });
  
  // Add quick wins
  quick_wins.slice(0, 5).forEach(win => {
    phase1Tasks.push(win);
  });

  // If no real tasks, add generic ones
  if (phase1Tasks.length === 0) {
    phase1Tasks = [
      'Fix critical accessibility issues',
      'Optimize images and page load speed',
      'Update meta tags and descriptions'
    ];
  }

  phase1Tasks.slice(0, 6).forEach((task, index) => {
    html += '              <div class="task-item">\n';
    html += `                <input type="checkbox" class="task-checkbox" id="task-1-${index}">\n`;
    html += `                <label class="task-label" for="task-1-${index}">${escapeHtml(task)}</label>\n`;
    html += '              </div>\n';
  });

  html += '            </div>\n';
  html += '          </div>\n';
  html += '        </div>\n';

  // PHASE 2: Week 3-6 - High Priority Issues
  html += '        <div class="roadmap-phase">\n';
  html += '          <div class="phase-marker">2</div>\n';
  html += '          <div class="phase-content">\n';
  html += '            <div class="phase-header">\n';
  html += '              <h3 class="phase-title">Week 3-6: Core Improvements</h3>\n';
  html += `              <span class="phase-timeline">📅 ${highIssues.length} items</span>\n`;
  html += '            </div>\n';
  html += '            <div class="phase-tasks">\n';

  let phase2Tasks = [];
  
  // Add high-priority issues
  highIssues.slice(0, 4).forEach(issue => {
    phase2Tasks.push(issue.title || issue.description);
  });
  
  // Add specific SEO issues
  seo_issues.slice(0, 2).forEach(issue => {
    if (typeof issue === 'string') {
      phase2Tasks.push(issue);
    } else {
      phase2Tasks.push(issue.title || issue.description || 'Improve SEO');
    }
  });

  // Add specific design issues
  const designIssues = [...(design_issues_desktop || []), ...(design_issues_mobile || [])];
  designIssues.slice(0, 2).forEach(issue => {
    if (typeof issue === 'string' && !phase2Tasks.includes(issue)) {
      phase2Tasks.push(issue);
    }
  });

  if (phase2Tasks.length === 0) {
    phase2Tasks = [
      'Enhance mobile responsiveness',
      'Improve navigation structure',
      'Optimize conversion paths'
    ];
  }

  phase2Tasks.slice(0, 6).forEach((task, index) => {
    html += '              <div class="task-item">\n';
    html += `                <input type="checkbox" class="task-checkbox" id="task-2-${index}">\n`;
    html += `                <label class="task-label" for="task-2-${index}">${escapeHtml(task)}</label>\n`;
    html += '              </div>\n';
  });

  html += '            </div>\n';
  html += '          </div>\n';
  html += '        </div>\n';

  // PHASE 3: Month 2-3 - Medium Priority & Strategic
  html += '        <div class="roadmap-phase">\n';
  html += '          <div class="phase-marker">3</div>\n';
  html += '          <div class="phase-content">\n';
  html += '            <div class="phase-header">\n';
  html += '              <h3 class="phase-title">Month 2-3: Strategic Enhancements</h3>\n';
  html += `              <span class="phase-timeline">📅 ${mediumIssues.length} items</span>\n`;
  html += '            </div>\n';
  html += '            <div class="phase-tasks">\n';

  let phase3Tasks = [];
  
  // Add medium priority issues
  mediumIssues.slice(0, 3).forEach(issue => {
    phase3Tasks.push(issue.title || issue.description);
  });
  
  // Add content issues
  (content_issues || []).slice(0, 2).forEach(issue => {
    if (typeof issue === 'string') {
      phase3Tasks.push(issue);
    } else {
      phase3Tasks.push(issue.title || issue.description || 'Improve content');
    }
  });

  // Add industry-specific strategic improvements
  if (industry) {
    const industryLower = industry.toLowerCase();
    if (industryLower.includes('hvac') || industryLower.includes('plumb') || industryLower.includes('electric')) {
      phase3Tasks.push('Build service area pages for local SEO');
      phase3Tasks.push('Add customer testimonials and reviews');
    } else if (industryLower.includes('dental') || industryLower.includes('medical') || industryLower.includes('health')) {
      phase3Tasks.push('Implement online appointment booking');
      phase3Tasks.push('Add patient portal integration');
    } else if (industryLower.includes('restaurant') || industryLower.includes('food')) {
      phase3Tasks.push('Integrate online ordering system');
      phase3Tasks.push('Set up reservation system');
    } else if (industryLower.includes('retail') || industryLower.includes('ecommerce')) {
      phase3Tasks.push('Enhance product pages with rich media');
      phase3Tasks.push('Implement abandoned cart recovery');
    } else {
      phase3Tasks.push('Develop content marketing strategy');
      phase3Tasks.push('Implement conversion tracking');
    }
  }

  if (phase3Tasks.length === 0) {
    phase3Tasks = [
      'Implement advanced SEO strategies',
      'Develop content marketing plan',
      'Enhance user engagement features'
    ];
  }

  phase3Tasks.slice(0, 6).forEach((task, index) => {
    html += '              <div class="task-item">\n';
    html += `                <input type="checkbox" class="task-checkbox" id="task-3-${index}">\n`;
    html += `                <label class="task-label" for="task-3-${index}">${escapeHtml(task)}</label>\n`;
    html += '              </div>\n';
  });

  html += '            </div>\n';
  html += '          </div>\n';
  html += '        </div>\n';

  html += '      </div>\n';
  html += '    </section>\n\n';
  return html;
}

/**
 * Generate screenshots section
 */
function generateScreenshotsSection(screenshotData, registry) {
  let html = '    <!-- Screenshots -->\n';
  html += '    <section class="section" id="screenshots">\n';
  html += '      <div class="section-header">\n';
  html += '        <h2 class="section-title">\n';
  html += '          <span class="section-title-icon">📸</span>\n';
  html += '          Website Screenshots\n';
  html += '        </h2>\n';
  html += '        <p class="section-description">Current state of your website across different devices and pages.</p>\n';
  html += '      </div>\n';

  html += '      <div class="screenshots-grid">\n';

  screenshotData.screenshots.forEach(screenshot => {
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
 * Generate technical appendix with REAL detailed data
 */
function generateTechnicalAppendix(analysisResult, synthesisData) {
  const {
    tech_stack,
    page_load_time,
    has_https,
    is_mobile_friendly,
    has_blog,
    analysis_cost,
    analysis_time,
    crawl_metadata,
    social_platforms_present,
    seo_analysis_model,
    content_analysis_model,
    desktop_visual_model,
    mobile_visual_model,
    social_analysis_model,
    accessibility_analysis_model,
    years_in_business,
    employee_count,
    pricing_visible,
    budget_indicator,
    premium_features
  } = analysisResult;

  let html = '    <!-- Technical Appendix -->\n';
  html += '    <section class="section" id="appendix">\n';
  html += '      <div class="section-header">\n';
  html += '        <h2 class="section-title">\n';
  html += '          <span class="section-title-icon">📋</span>\n';
  html += '          Technical Details\n';
  html += '        </h2>\n';
  html += '      </div>\n';

  html += '      <div class="grid gap-6" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px;">\n';

  // CARD 1: Analysis Metadata
  html += '        <div style="background: var(--bg-secondary); padding: 24px; border-radius: 12px;">\n';
  html += '          <h3 style="margin-bottom: 16px; font-size: 1.125rem;">📊 Analysis Metadata</h3>\n';
  html += '          <table style="width: 100%;">\n';

  const analyzedDate = new Date(analysisResult.analyzed_at || Date.now());
  html += `            <tr><td style="padding: 8px 0; color: var(--text-tertiary);">Date</td><td style="text-align: right; font-weight: 500;">${analyzedDate.toLocaleDateString()}</td></tr>\n`;
  
  if (crawl_metadata?.pages_crawled) {
    html += `            <tr><td style="padding: 8px 0; color: var(--text-tertiary);">Pages Crawled</td><td style="text-align: right; font-weight: 500;">${crawl_metadata.pages_crawled}</td></tr>\n`;
  }
  
  if (analysis_time) {
    const seconds = Math.floor(analysis_time / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    html += `            <tr><td style="padding: 8px 0; color: var(--text-tertiary);">Duration</td><td style="text-align: right; font-weight: 500;">${minutes > 0 ? minutes + 'm ' : ''}${remainingSeconds}s</td></tr>\n`;
  }
  
  if (analysis_cost) {
    html += `            <tr><td style="padding: 8px 0; color: var(--text-tertiary);">Analysis Cost</td><td style="text-align: right; font-weight: 500;">$${Number(analysis_cost).toFixed(4)}</td></tr>\n`;
  }
  
  if (synthesisData.consolidatedIssues) {
    html += `            <tr><td style="padding: 8px 0; color: var(--text-tertiary);">AI Synthesis</td><td style="text-align: right; font-weight: 500;">✓ Enabled</td></tr>\n`;
    html += `            <tr><td style="padding: 8px 0; color: var(--text-tertiary);">Issues Found</td><td style="text-align: right; font-weight: 500;">${synthesisData.consolidatedIssues.length}</td></tr>\n`;
  }

  html += '          </table>\n';
  html += '        </div>\n';

  // CARD 2: Technology Stack
  html += '        <div style="background: var(--bg-secondary); padding: 24px; border-radius: 12px;">\n';
  html += '          <h3 style="margin-bottom: 16px; font-size: 1.125rem;">⚙️ Technology Stack</h3>\n';
  html += '          <table style="width: 100%;">\n';

  if (tech_stack) {
    html += `            <tr><td style="padding: 8px 0; color: var(--text-tertiary);">Platform</td><td style="text-align: right; font-weight: 500;">${escapeHtml(tech_stack)}</td></tr>\n`;
  }
  
  html += `            <tr><td style="padding: 8px 0; color: var(--text-tertiary);">HTTPS</td><td style="text-align: right; font-weight: 500;">${has_https ? '✓ Yes' : '✗ No'}</td></tr>\n`;
  html += `            <tr><td style="padding: 8px 0; color: var(--text-tertiary);">Mobile Friendly</td><td style="text-align: right; font-weight: 500;">${is_mobile_friendly ? '✓ Yes' : '✗ No'}</td></tr>\n`;
  
  if (page_load_time) {
    html += `            <tr><td style="padding: 8px 0; color: var(--text-tertiary);">Page Load Time</td><td style="text-align: right; font-weight: 500;">${(page_load_time / 1000).toFixed(2)}s</td></tr>\n`;
  }
  
  html += `            <tr><td style="padding: 8px 0; color: var(--text-tertiary);">Blog/News</td><td style="text-align: right; font-weight: 500;">${has_blog ? '✓ Yes' : '✗ No'}</td></tr>\n`;

  if (social_platforms_present && social_platforms_present.length > 0) {
    html += `            <tr><td style="padding: 8px 0; color: var(--text-tertiary);">Social Media</td><td style="text-align: right; font-weight: 500;">${social_platforms_present.join(', ')}</td></tr>\n`;
  }

  html += '          </table>\n';
  html += '        </div>\n';

  // CARD 3: Score Breakdown
  html += '        <div style="background: var(--bg-secondary); padding: 24px; border-radius: 12px;">\n';
  html += '          <h3 style="margin-bottom: 16px; font-size: 1.125rem;">📈 Score Breakdown</h3>\n';
  html += '          <table style="width: 100%;">\n';
  
  const scores = [
    { label: 'Design', value: analysisResult.design_score },
    { label: 'SEO', value: analysisResult.seo_score },
    { label: 'Content', value: analysisResult.content_score },
    { label: 'Social', value: analysisResult.social_score }
  ];

  scores.forEach(({ label, value }) => {
    if (value !== undefined && value !== null) {
      const scoreValue = Math.round(value);
      const color = scoreValue >= 80 ? 'var(--success)' : scoreValue >= 60 ? 'var(--warning)' : 'var(--danger)';
      html += `            <tr><td style="padding: 8px 0; color: var(--text-tertiary);">${label} Score</td><td style="text-align: right; font-weight: 500; color: ${color};">${scoreValue}/100</td></tr>\n`;
    }
  });
  
  html += `            <tr style="border-top: 2px solid var(--border-light);"><td style="padding: 12px 0 8px; color: var(--text-primary); font-weight: 600;">Overall</td><td style="text-align: right; font-weight: 700; padding: 12px 0 8px; font-size: 1.125rem;">${Math.round(analysisResult.overall_score || 0)}/100</td></tr>\n`;

  html += '          </table>\n';
  html += '        </div>\n';

  // CARD 4: Business Intelligence (if available)
  if (years_in_business || employee_count || pricing_visible || premium_features?.length > 0) {
    html += '        <div style="background: var(--bg-secondary); padding: 24px; border-radius: 12px;">\n';
    html += '          <h3 style="margin-bottom: 16px; font-size: 1.125rem;">💼 Business Intelligence</h3>\n';
    html += '          <table style="width: 100%;">\n';

    if (years_in_business) {
      html += `            <tr><td style="padding: 8px 0; color: var(--text-tertiary);">Years in Business</td><td style="text-align: right; font-weight: 500;">${years_in_business} years</td></tr>\n`;
    }
    
    if (employee_count) {
      html += `            <tr><td style="padding: 8px 0; color: var(--text-tertiary);">Company Size</td><td style="text-align: right; font-weight: 500;">${employee_count}</td></tr>\n`;
    }
    
    if (pricing_visible !== undefined) {
      html += `            <tr><td style="padding: 8px 0; color: var(--text-tertiary);">Pricing Visible</td><td style="text-align: right; font-weight: 500;">${pricing_visible ? '✓ Yes' : '✗ No'}</td></tr>\n`;
    }
    
    if (budget_indicator) {
      html += `            <tr><td style="padding: 8px 0; color: var(--text-tertiary);">Budget Indicator</td><td style="text-align: right; font-weight: 500;">${escapeHtml(budget_indicator)}</td></tr>\n`;
    }
    
    if (premium_features && premium_features.length > 0) {
      html += `            <tr><td style="padding: 8px 0; color: var(--text-tertiary);">Premium Features</td><td style="text-align: right; font-weight: 500;">${premium_features.length} detected</td></tr>\n`;
    }

    html += '          </table>\n';
    html += '        </div>\n';
  }

  // CARD 5: AI Models Used
  const models = [];
  if (seo_analysis_model) models.push({ type: 'SEO', model: seo_analysis_model });
  if (content_analysis_model) models.push({ type: 'Content', model: content_analysis_model });
  if (desktop_visual_model) models.push({ type: 'Desktop Visual', model: desktop_visual_model });
  if (mobile_visual_model) models.push({ type: 'Mobile Visual', model: mobile_visual_model });
  if (social_analysis_model) models.push({ type: 'Social', model: social_analysis_model });
  if (accessibility_analysis_model) models.push({ type: 'Accessibility', model: accessibility_analysis_model });

  if (models.length > 0) {
    html += '        <div style="background: var(--bg-secondary); padding: 24px; border-radius: 12px;">\n';
    html += '          <h3 style="margin-bottom: 16px; font-size: 1.125rem;">🤖 AI Models Used</h3>\n';
    html += '          <table style="width: 100%;">\n';

    models.forEach(({ type, model }) => {
      html += `            <tr><td style="padding: 8px 0; color: var(--text-tertiary);">${type}</td><td style="text-align: right; font-weight: 500; font-family: monospace; font-size: 0.875rem;">${escapeHtml(model)}</td></tr>\n`;
    });

    html += '          </table>\n';
    html += '        </div>\n';
  }

  // CARD 6: Crawl Statistics (if available)
  if (crawl_metadata) {
    html += '        <div style="background: var(--bg-secondary); padding: 24px; border-radius: 12px;">\n';
    html += '          <h3 style="margin-bottom: 16px; font-size: 1.125rem;">🕷️ Crawl Statistics</h3>\n';
    html += '          <table style="width: 100%;">\n';

    if (crawl_metadata.pages_crawled) {
      html += `            <tr><td style="padding: 8px 0; color: var(--text-tertiary);">Pages Found</td><td style="text-align: right; font-weight: 500;">${crawl_metadata.pages_crawled}</td></tr>\n`;
    }
    
    if (crawl_metadata.links_found) {
      html += `            <tr><td style="padding: 8px 0; color: var(--text-tertiary);">Links Found</td><td style="text-align: right; font-weight: 500;">${crawl_metadata.links_found}</td></tr>\n`;
    }
    
    if (crawl_metadata.pages_failed) {
      html += `            <tr><td style="padding: 8px 0; color: var(--text-tertiary);">Pages Failed</td><td style="text-align: right; font-weight: 500;">${crawl_metadata.pages_failed}</td></tr>\n`;
    }
    
    if (crawl_metadata.crawl_time) {
      const crawlSeconds = Math.floor(crawl_metadata.crawl_time / 1000);
      html += `            <tr><td style="padding: 8px 0; color: var(--text-tertiary);">Crawl Duration</td><td style="text-align: right; font-weight: 500;">${crawlSeconds}s</td></tr>\n`;
    }

    html += '          </table>\n';
    html += '        </div>\n';
  }

  html += '      </div>\n';
  html += '    </section>\n\n';
  return html;
}

/**
 * Generate footer section
 */
function generateFooter(analysisResult) {
  let html = '    <!-- Footer -->\n';
  html += '    <div class="report-footer">\n';
  html += '      <div class="container">\n';
  html += '        <div class="footer-content">\n';
  html += '          <div class="footer-logo">MaxantAgency</div>\n';
  html += '          <p class="footer-text">\n';
  html += '            This professional website analysis report was generated using AI-powered insights and industry best practices. \n';
  html += '            The recommendations are based on comprehensive analysis of design, SEO, content, and user experience factors.\n';
  html += '          </p>\n';
  html += '          <p class="footer-text mt-4">\n';
  html += `            Report generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}\n`;
  html += '          </p>\n';
  html += '        </div>\n';
  html += '      </div>\n';
  html += '    </div>\n';
  return html;
}

/**
 * Process screenshots for embedding
 */
async function processScreenshots(analysisResult, registry) {
  const screenshots = [];
  const { screenshot_desktop_url, screenshot_mobile_url, crawl_metadata } = analysisResult;

  // Helper to convert to base64
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
        quality: 85  // Changed from 0.85 to integer percentage
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

  // Process additional screenshots from crawl
  if (crawl_metadata?.successful_pages) {
    for (const page of crawl_metadata.successful_pages) {
      if (page.screenshots) {
        for (const [device, screenshotPath] of Object.entries(page.screenshots)) {
          if (screenshotPath) {
            const dataUri = await toBase64(screenshotPath);
            if (dataUri) {
              screenshots.push({
                title: `${page.title || 'Page'} - ${device}`,
                type: device,
                dataUri
              });
            }
          }
        }
      }
    }
  }

  return { screenshots };
}

/**
 * Generate default executive summary when no synthesis data
 */
function getDefaultExecutiveSummary(analysisResult) {
  const { grade, overall_score, company_name } = analysisResult;

  if (grade === 'A') {
    return `${company_name}'s website demonstrates excellent performance across all key metrics. The site follows industry best practices and provides an outstanding user experience. Minor optimizations could further enhance performance.`;
  } else if (grade === 'B') {
    return `${company_name}'s website performs well with a solid foundation. Several opportunities exist to enhance user experience and improve conversion rates. Focus on the priority actions below to achieve excellence.`;
  } else if (grade === 'C') {
    return `${company_name}'s website has a moderate performance with significant room for improvement. Addressing the identified issues will substantially improve user engagement and business outcomes.`;
  } else if (grade === 'D') {
    return `${company_name}'s website requires attention in multiple areas. The priority actions outlined below will help establish a stronger digital presence and improve customer experience.`;
  } else {
    return `${company_name}'s website needs comprehensive improvements across design, content, and technical areas. Following the structured roadmap below will transform your digital presence.`;
  }
}

/**
 * Generate consolidated issues from raw analysis data
 */
function generateConsolidatedIssuesFromRaw(analysisResult) {
  const issues = [];

  // Add critical issues from different sources
  if (analysisResult.design_issues?.length > 0) {
    analysisResult.design_issues.slice(0, 2).forEach(issue => {
      issues.push({
        title: issue,
        description: 'Design and user experience issue that impacts visitor engagement.',
        severity: 'high',
        businessImpact: 'Reduces user engagement and conversion rates',
        recommendation: 'Address this design issue to improve user experience'
      });
    });
  }

  if (analysisResult.seo_issues?.length > 0) {
    analysisResult.seo_issues.slice(0, 2).forEach(issue => {
      issues.push({
        title: issue,
        description: 'SEO issue affecting search engine visibility.',
        severity: 'high',
        businessImpact: 'Limits organic traffic and search rankings',
        recommendation: 'Fix SEO issues to improve discoverability'
      });
    });
  }

  // Add top issue if available
  if (analysisResult.top_issue) {
    issues.unshift({
      title: analysisResult.top_issue,
      description: 'The most critical issue identified in the analysis.',
      severity: 'critical',
      businessImpact: 'Primary barrier to website success',
      recommendation: 'Prioritize fixing this issue immediately'
    });
  }

  return issues;
}

/**
 * Escape HTML characters for safe rendering
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

// Export the function
export default generateHTMLReportV3;
export { generateHTMLReportV3 };