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

  // Header
  html += '      <div class="hero-header">\n';
  html += `        <h1 class="company-name">${escapeHtml(company_name)}</h1>\n`;
  html += `        <p class="company-meta">${escapeHtml(industry || 'Business')} • ${escapeHtml(city || 'Location')}</p>\n`;
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
 * Generate implementation roadmap section
 */
function generateRoadmap(analysisResult, synthesisData) {
  let html = '    <!-- Implementation Roadmap -->\n';
  html += '    <section class="section" id="roadmap">\n';
  html += '      <div class="section-header">\n';
  html += '        <h2 class="section-title">\n';
  html += '          <span class="section-title-icon">📅</span>\n';
  html += '          Implementation Roadmap\n';
  html += '        </h2>\n';
  html += '        <p class="section-description">A phased approach to website improvement, designed to deliver quick wins while building toward long-term excellence.</p>\n';
  html += '      </div>\n';

  html += '      <div class="roadmap-timeline">\n';
  html += '        <div class="timeline-connector"></div>\n';

  // Phase 1: Quick Fixes (Week 1-2)
  html += '        <div class="roadmap-phase">\n';
  html += '          <div class="phase-marker">1</div>\n';
  html += '          <div class="phase-content">\n';
  html += '            <div class="phase-header">\n';
  html += '              <h3 class="phase-title">Quick Fixes & Foundation</h3>\n';
  html += '              <span class="phase-timeline">📅 Week 1-2</span>\n';
  html += '            </div>\n';
  html += '            <div class="phase-tasks">\n';

  const phase1Tasks = [
    'Fix critical accessibility issues',
    'Optimize images and page load speed',
    'Update meta tags and descriptions',
    'Fix broken links and 404 errors',
    'Add missing alt text to images'
  ];

  phase1Tasks.forEach((task, index) => {
    html += '              <div class="task-item">\n';
    html += `                <input type="checkbox" class="task-checkbox" id="task-1-${index}">\n`;
    html += `                <label class="task-label" for="task-1-${index}">${task}</label>\n`;
    html += '              </div>\n';
  });

  html += '            </div>\n';
  html += '          </div>\n';
  html += '        </div>\n';

  // Phase 2: Core Improvements (Week 3-4)
  html += '        <div class="roadmap-phase">\n';
  html += '          <div class="phase-marker">2</div>\n';
  html += '          <div class="phase-content">\n';
  html += '            <div class="phase-header">\n';
  html += '              <h3 class="phase-title">Core Improvements</h3>\n';
  html += '              <span class="phase-timeline">📅 Week 3-4</span>\n';
  html += '            </div>\n';
  html += '            <div class="phase-tasks">\n';

  const phase2Tasks = [
    'Enhance mobile responsiveness',
    'Improve navigation structure',
    'Optimize conversion paths',
    'Implement structured data',
    'Enhance content quality'
  ];

  phase2Tasks.forEach((task, index) => {
    html += '              <div class="task-item">\n';
    html += `                <input type="checkbox" class="task-checkbox" id="task-2-${index}">\n`;
    html += `                <label class="task-label" for="task-2-${index}">${task}</label>\n`;
    html += '              </div>\n';
  });

  html += '            </div>\n';
  html += '          </div>\n';
  html += '        </div>\n';

  // Phase 3: Strategic Enhancements (Month 2-3)
  html += '        <div class="roadmap-phase">\n';
  html += '          <div class="phase-marker">3</div>\n';
  html += '          <div class="phase-content">\n';
  html += '            <div class="phase-header">\n';
  html += '              <h3 class="phase-title">Strategic Enhancements</h3>\n';
  html += '              <span class="phase-timeline">📅 Month 2-3</span>\n';
  html += '            </div>\n';
  html += '            <div class="phase-tasks">\n';

  const phase3Tasks = [
    'Implement advanced SEO strategies',
    'Develop content marketing plan',
    'Enhance user engagement features',
    'Integrate analytics and tracking',
    'Build social proof elements'
  ];

  phase3Tasks.forEach((task, index) => {
    html += '              <div class="task-item">\n';
    html += `                <input type="checkbox" class="task-checkbox" id="task-3-${index}">\n`;
    html += `                <label class="task-label" for="task-3-${index}">${task}</label>\n`;
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
 * Generate technical appendix
 */
function generateTechnicalAppendix(analysisResult, synthesisData) {
  let html = '    <!-- Technical Appendix -->\n';
  html += '    <section class="section" id="appendix">\n';
  html += '      <div class="section-header">\n';
  html += '        <h2 class="section-title">\n';
  html += '          <span class="section-title-icon">📋</span>\n';
  html += '          Technical Details\n';
  html += '        </h2>\n';
  html += '      </div>\n';

  html += '      <div class="grid gap-6" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px;">\n';

  // Analysis Details
  html += '        <div style="background: var(--bg-secondary); padding: 24px; border-radius: 12px;">\n';
  html += '          <h3 style="margin-bottom: 16px; font-size: 1.125rem;">Analysis Details</h3>\n';
  html += '          <table style="width: 100%;">\n';

  const analyzedDate = new Date(analysisResult.analyzed_at || Date.now());
  html += `            <tr><td style="padding: 8px 0; color: var(--text-tertiary);">Date</td><td style="text-align: right; font-weight: 500;">${analyzedDate.toLocaleDateString()}</td></tr>\n`;
  html += `            <tr><td style="padding: 8px 0; color: var(--text-tertiary);">Pages Analyzed</td><td style="text-align: right; font-weight: 500;">${analysisResult.pages_analyzed || 'Multiple'}</td></tr>\n`;

  if (analysisResult.analysis_time) {
    const minutes = Math.floor(analysisResult.analysis_time / 60);
    const seconds = Math.round(analysisResult.analysis_time % 60);
    html += `            <tr><td style="padding: 8px 0; color: var(--text-tertiary);">Duration</td><td style="text-align: right; font-weight: 500;">${minutes}m ${seconds}s</td></tr>\n`;
  }

  if (synthesisData.consolidatedIssues) {
    html += `            <tr><td style="padding: 8px 0; color: var(--text-tertiary);">AI Synthesis</td><td style="text-align: right; font-weight: 500;">✓ Enabled</td></tr>\n`;
  }

  html += '          </table>\n';
  html += '        </div>\n';

  // Score Breakdown
  html += '        <div style="background: var(--bg-secondary); padding: 24px; border-radius: 12px;">\n';
  html += '          <h3 style="margin-bottom: 16px; font-size: 1.125rem;">Score Breakdown</h3>\n';
  html += '          <table style="width: 100%;">\n';
  html += `            <tr><td style="padding: 8px 0; color: var(--text-tertiary);">Design Score</td><td style="text-align: right; font-weight: 500;">${Math.round(analysisResult.design_score || 0)}/100</td></tr>\n`;
  html += `            <tr><td style="padding: 8px 0; color: var(--text-tertiary);">SEO Score</td><td style="text-align: right; font-weight: 500;">${Math.round(analysisResult.seo_score || 0)}/100</td></tr>\n`;
  html += `            <tr><td style="padding: 8px 0; color: var(--text-tertiary);">Content Score</td><td style="text-align: right; font-weight: 500;">${Math.round(analysisResult.content_score || 0)}/100</td></tr>\n`;
  html += `            <tr><td style="padding: 8px 0; color: var(--text-tertiary);">Social Score</td><td style="text-align: right; font-weight: 500;">${Math.round(analysisResult.social_score || 0)}/100</td></tr>\n`;
  html += '          </table>\n';
  html += '        </div>\n';

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