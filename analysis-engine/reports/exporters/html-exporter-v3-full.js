/**
 * HTML Report Exporter V3 - Full Comprehensive Edition
 * ======================================================
 * Generates comprehensive, mobile-responsive HTML reports that:
 * - Include ALL collected data and analysis results
 * - Show complete issue breakdowns (not just top 5-7)
 * - Display multi-page screenshot galleries
 * - Present business intelligence and lead scoring
 * - Include technical deep dives (PageSpeed, WCAG, tech stack)
 * - Provide appendix with methodology and QA validation
 * - Optimize for internal analysis and development handoff
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
 * Generate comprehensive full HTML report
 * @param {Object} analysisResult - Complete analysis data
 * @param {Object} synthesisData - AI synthesis results (optional but recommended)
 * @returns {string} Complete HTML report
 */
export async function generateHTMLReportV3Full(analysisResult, synthesisData = {}) {
  console.log('[HTML Exporter V3 Full] 📊 Generating comprehensive full report...');

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

  // Generate comprehensive full content
  const htmlContent = await generateFullContent(
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

  console.log('[HTML Exporter V3 Full] ✅ Comprehensive full report generation complete!');
  return html;
}

/**
 * Generate comprehensive full report content with ALL data
 */
async function generateFullContent(analysisResult, synthesisData, registry, screenshotData) {
  let content = '';

  // 1. Executive Dashboard (Hero Section with Key Metrics Only)
  content += generateExecutiveDashboard(analysisResult, synthesisData);

  // Start main content
  content += '<div class="main-content">\n';
  content += '  <div class="container">\n';

  // 2. Executive Summary (with benchmark context)
  content += generateStrategicAssessment(analysisResult, synthesisData);

  // 3. Benchmark Comparison Chart (if benchmark available)
  if (analysisResult.matched_benchmark) {
    content += generateBenchmarkComparisonChart(analysisResult, synthesisData);

    // 3.5 Side-by-Side Screenshot Comparison (if screenshots available)
    if (analysisResult.matched_benchmark.screenshot_desktop_url && analysisResult.screenshot_desktop_url) {
      content += generateSideBySideComparison(analysisResult, screenshotData);
    }
  }

  // 4. Implementation Timeline (90-Day Action Plan)
  content += generateTimeline(analysisResult, synthesisData);

  // 5. Business Intelligence Section (NEW - Full Report Only)
  if (analysisResult.business_intelligence) {
    content += generateBusinessIntelligenceSection(analysisResult);
  }

  // 6. Technical Deep Dive (NEW - Full Report Only)
  content += generateTechnicalDeepDive(analysisResult);

  // 7. Complete Issue Breakdown (NEW - Full Report Only)
  content += generateCompleteIssueBreakdown(analysisResult);

  // 8. WCAG Accessibility Compliance (NEW - Full Report Only)
  if (analysisResult.accessibility_compliance) {
    content += generateAccessibilityComplianceSection(analysisResult);
  }

  // 9. Multi-Page Screenshot Gallery (NEW - Enhanced Visual Evidence)
  if (screenshotData.screenshots.length > 0 || analysisResult.crawl_metadata?.pages) {
    content += generateMultiPageScreenshotGallery(analysisResult, screenshotData, registry);
  }

  // 10. Lead Scoring & Sales Intelligence (COMMENTED OUT - Not for client-facing reports)
  // content += generateLeadScoringSection(analysisResult);

  // 11. Appendix - Methodology & QA Validation (COMMENTED OUT - Internal technical info)
  // content += generateAppendix(analysisResult, synthesisData);

  // Close main content
  content += '  </div>\n';
  content += '</div>\n';

  // 12. Footer
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

  // Show location and industry if available - City, STATE • Industry format
  const metaParts = [];
  const {state} = analysisResult; // Get state from analysisResult

  // Build location string: "City, STATE"
  if (city && state) {
    metaParts.push(`${escapeHtml(city)}, ${escapeHtml(state.toUpperCase())}`);
  } else if (city) {
    metaParts.push(escapeHtml(city));
  }

  // Add industry (capitalized)
  if (industry) {
    const capitalizedIndustry = industry.charAt(0).toUpperCase() + industry.slice(1);
    metaParts.push(escapeHtml(capitalizedIndustry));
  }

  if (metaParts.length > 0) {
    html += `        <p class="company-meta">${metaParts.join(' • ')}</p>\n`;
  } else {
    html += `        <p class="company-meta">Website Performance Analysis</p>\n`;
  }

  // Add contact information if available - minimal light styling
  if (contact_email || contact_phone || url) {
    html += '        <div class="contact-info-box" style="margin-top: 24px; padding: 12px 20px; background: var(--bg-secondary); border: 1px solid var(--border-light); border-radius: 12px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04); display: inline-block;">\n';
    html += '          <div style="display: flex; flex-wrap: wrap; gap: 16px; align-items: center; justify-content: center;">\n';

    if (contact_email) {
      html += `            <a href="mailto:${escapeHtml(contact_email)}" style="color: var(--text-primary); text-decoration: none; display: inline-flex; align-items: center; gap: 8px; font-weight: 500; padding: 6px 12px; background: transparent; border-radius: 8px; transition: all 0.2s;" onmouseover="this.style.background='rgba(0,0,0,0.05)'" onmouseout="this.style.background='transparent'">`;
      html += `<span style="font-size: 1.1em; opacity: 0.7;">📧</span><span>${escapeHtml(contact_email)}</span></a>\n`;
    }

    if (contact_phone) {
      const cleanPhone = contact_phone.replace(/\D/g, ''); // Remove non-digits
      html += `            <a href="tel:${cleanPhone}" style="color: var(--text-primary); text-decoration: none; display: inline-flex; align-items: center; gap: 8px; font-weight: 500; padding: 6px 12px; background: transparent; border-radius: 8px; transition: all 0.2s;" onmouseover="this.style.background='rgba(0,0,0,0.05)'" onmouseout="this.style.background='transparent'">`;
      html += `<span style="font-size: 1.1em; opacity: 0.7;">📞</span><span>${escapeHtml(contact_phone)}</span></a>\n`;
    }

    if (url) {
      const displayUrl = url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
      html += `            <a href="${escapeHtml(url)}" target="_blank" style="color: var(--text-primary); text-decoration: none; display: inline-flex; align-items: center; gap: 8px; font-weight: 500; padding: 6px 12px; background: transparent; border-radius: 8px; transition: all 0.2s;" onmouseover="this.style.background='rgba(0,0,0,0.05)'" onmouseout="this.style.background='transparent'">`;
      html += `<span style="font-size: 1.1em; opacity: 0.7;">🌐</span><span>${escapeHtml(displayUrl)}</span></a>\n`;
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

  // Score Breakdown with Bar Graphs
  html += '          <div class="score-details">\n';
  html += '            <div class="score-breakdown" style="display: grid; gap: 12px;">\n';

  const scores = [
    { label: 'Design', value: design_score, icon: '🎨' },
    { label: 'SEO', value: seo_score, icon: '🔍' },
    { label: 'Content', value: content_score, icon: '✍️' },
    { label: 'Social', value: social_score, icon: '📱' }
  ];

  scores.forEach(score => {
    if (score.value !== undefined && score.value !== null) {
      const scoreValue = Math.round(score.value || 0);
      // Lighter, more transparent colors
      const barColor = scoreValue >= 80 ? 'rgba(16, 185, 129, 0.7)' : scoreValue >= 60 ? 'rgba(245, 158, 11, 0.7)' : 'rgba(239, 68, 68, 0.7)';

      html += '              <div style="display: grid; grid-template-columns: 100px 1fr 50px; gap: 12px; align-items: center;">\n';

      // Label
      html += '                <div style="display: flex; align-items: center; gap: 6px; font-size: 14px;">\n';
      html += `                  <span style="font-size: 16px;">${score.icon}</span>\n`;
      html += `                  <span style="font-weight: 500;">${score.label}</span>\n`;
      html += '                </div>\n';

      // Bar graph with lighter background
      html += '                <div style="background: var(--bg-tertiary); border-radius: 8px; height: 20px; position: relative; overflow: hidden; border: 1px solid var(--border-light);">\n';
      html += `                  <div style="background: ${barColor}; height: 100%; width: ${scoreValue}%; border-radius: 6px; transition: width 0.3s;"></div>\n`;
      html += '                </div>\n';

      // Score number with /100
      html += `                <div style="text-align: right; font-weight: 600; font-size: 16px;">${scoreValue}<span style="opacity: 0.5; font-weight: 400; font-size: 14px;">/100</span></div>\n`;

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

  // Metrics removed - let the analysis speak for itself
  // (Priority, ROI Potential, Quick Wins were too sales-focused)

  html += '      </div>\n';
  html += '    </div>\n';
  html += '  </div>\n';
  html += '</div>\n\n';

  return html;
}

/**
 * Generate executive summary with benchmark context
 */
function generateStrategicAssessment(analysisResult, synthesisData) {
  const {
    grade,
    overall_score,
    company_name,
    top_issue,
    one_liner,
    matched_benchmark,
    design_score,
    seo_score,
    content_score,
    social_score
  } = analysisResult;

  let html = '    <!-- Executive Summary -->\n';
  html += '    <section class="section" id="assessment">\n';
  html += '      <div class="section-header">\n';
  html += '        <h2 class="section-title">\n';
  html += '          <span class="section-title-icon">📋</span>\n';
  html += '          Executive Summary\n';
  html += '        </h2>\n';
  html += '      </div>\n';

  // Generate benchmark-aware summary (2-3 paragraphs)
  let summary = '';

  if (synthesisData.executiveSummary?.overview) {
    // Use AI synthesis if available
    summary = synthesisData.executiveSummary.overview;
  } else {
    // Generate benchmark-aware summary
    summary = generateBenchmarkAwareSummary({
      company_name,
      grade,
      overall_score,
      matched_benchmark,
      design_score,
      seo_score,
      content_score,
      social_score,
      one_liner
    });
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
 * Generate benchmark comparison chart
 */
function generateBenchmarkComparisonChart(analysisResult, synthesisData) {
  const {
    matched_benchmark,
    design_score,
    seo_score,
    content_score,
    performance_score,
    accessibility_score,
    social_score
  } = analysisResult;

  if (!matched_benchmark) return '';

  let html = '    <!-- Benchmark Comparison -->\n';
  html += '    <section class="section" id="benchmark">\n';
  html += '      <div class="section-header">\n';
  html += '        <h2 class="section-title">\n';
  html += '          <span class="section-title-icon">📊</span>\n';
  html += '          How You Compare to Industry Leaders\n';
  html += '        </h2>\n';
  html += '      </div>\n';

  // Match info box
  html += '      <div style="background: var(--bg-secondary); padding: 20px; border-radius: 8px; margin-bottom: 24px;">\n';
  html += `        <div style="font-weight: 600; margin-bottom: 8px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">`;
  html += `          <span>Matched to: ${escapeHtml(matched_benchmark.company_name)}</span>\n`;

  // Add website link if available
  if (matched_benchmark.website_url) {
    html += `          <a href="${escapeHtml(matched_benchmark.website_url)}" target="_blank" rel="noopener noreferrer" style="font-size: 13px; color: var(--primary); text-decoration: none; display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; background: rgba(37, 99, 235, 0.1); border-radius: 6px; transition: all 0.2s;" onmouseover="this.style.background='rgba(37,99,235,0.2)'" onmouseout="this.style.background='rgba(37,99,235,0.1)'">\n`;
    html += `            <span>🌐</span>\n`;
    html += `            <span>Visit Website</span>\n`;
    html += `          </a>\n`;
  }

  html += `        </div>\n`;
  html += `        <div style="font-size: 14px; opacity: 0.8; line-height: 1.6;">${escapeHtml(matched_benchmark.match_reasoning || `${Math.round(matched_benchmark.match_score)}% match based on industry, business model, and digital capabilities.`)}</div>\n`;
  html += `        <div style="margin-top: 12px; font-size: 13px;"><strong>Comparison Tier:</strong> ${matched_benchmark.comparison_tier}</div>\n`;
  html += '      </div>\n';

  // Score comparison bars
  html += '      <div style="margin-bottom: 32px;">\n';
  html += '        <h3 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 20px;">Score Breakdown</h3>\n';

  const dimensions = [
    { label: 'Design', yourScore: design_score, benchmarkScore: matched_benchmark.scores.design },
    { label: 'SEO', yourScore: seo_score, benchmarkScore: matched_benchmark.scores.seo },
    { label: 'Performance', yourScore: performance_score, benchmarkScore: matched_benchmark.scores.performance },
    { label: 'Content', yourScore: content_score, benchmarkScore: matched_benchmark.scores.content },
    { label: 'Accessibility', yourScore: accessibility_score, benchmarkScore: matched_benchmark.scores.accessibility },
    { label: 'Social', yourScore: social_score, benchmarkScore: matched_benchmark.scores.social }
  ];

  dimensions.forEach(dim => {
    if (dim.yourScore === undefined || dim.benchmarkScore === undefined) return;

    const gap = dim.benchmarkScore - dim.yourScore;
    const gapText = gap > 0 ? `+${Math.round(gap)}` : gap < 0 ? `${Math.round(gap)}` : '✓';
    const gapColor = gap > 0 ? 'var(--warning)' : gap < 0 ? 'var(--success)' : 'var(--success)';

    html += '        <div style="margin-bottom: 16px;">\n';
    html += '          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">\n';
    html += `            <span style="font-weight: 500;">${dim.label}</span>\n`;
    html += `            <span style="font-size: 14px; color: ${gapColor};">${gapText}</span>\n`;
    html += '          </div>\n';
    html += '          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">\n';

    // Your score bar
    html += '            <div>\n';
    html += '              <div style="font-size: 12px; opacity: 0.7; margin-bottom: 4px;">You: ' + Math.round(dim.yourScore) + '</div>\n';
    html += '              <div style="background: var(--bg-secondary); border-radius: 4px; height: 24px; position: relative; overflow: hidden;">\n';
    html += `                <div style="background: var(--primary); height: 100%; width: ${dim.yourScore}%; border-radius: 4px; transition: width 0.3s;"></div>\n`;
    html += '              </div>\n';
    html += '            </div>\n';

    // Benchmark score bar
    html += '            <div>\n';
    html += `              <div style="font-size: 12px; opacity: 0.7; margin-bottom: 4px;">${escapeHtml(matched_benchmark.company_name)}: ` + Math.round(dim.benchmarkScore) + '</div>\n';
    html += '              <div style="background: var(--bg-secondary); border-radius: 4px; height: 24px; position: relative; overflow: hidden;">\n';
    html += `                <div style="background: var(--success); height: 100%; width: ${dim.benchmarkScore}%; border-radius: 4px; transition: width 0.3s;"></div>\n`;
    html += '              </div>\n';
    html += '            </div>\n';

    html += '          </div>\n';
    html += '        </div>\n';
  });

  html += '      </div>\n';

  // "What they do well" section - Grid layout
  html += '      <div>\n';
  html += `        <h3 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 16px;">What ${escapeHtml(matched_benchmark.company_name)} Does Well</h3>\n`;
  html += '        <p style="opacity: 0.8; margin-bottom: 20px; font-size: 14px;">Learn from their approach to these areas:</p>\n';

  const strengthCategories = [
    { label: 'Design', strengths: matched_benchmark.design_strengths, icon: '🎨' },
    { label: 'SEO', strengths: matched_benchmark.seo_strengths, icon: '🔍' },
    { label: 'Content', strengths: matched_benchmark.content_strengths, icon: '✍️' },
    { label: 'Social', strengths: matched_benchmark.social_strengths, icon: '📱' },
    { label: 'Accessibility', strengths: matched_benchmark.accessibility_strengths, icon: '♿' }
  ];

  // Filter categories with strengths
  const categoriesWithStrengths = strengthCategories.filter(c => c.strengths && c.strengths.length > 0);

  if (categoriesWithStrengths.length > 0) {
    // Grid layout - 2 columns on desktop, 1 on mobile
    html += '        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">\n';

    categoriesWithStrengths.forEach(category => {
      html += '          <div style="background: var(--bg-secondary); padding: 20px; border-radius: 8px; border-left: 4px solid var(--primary);">\n';
      html += `            <div style="font-weight: 600; font-size: 1.1rem; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">\n`;
      html += `              <span>${category.icon}</span>\n`;
      html += `              <span>${category.label}</span>\n`;
      html += '            </div>\n';
      html += '            <ul style="margin: 0; padding-left: 20px; opacity: 0.9; line-height: 1.6;">\n';
      category.strengths.slice(0, 4).forEach(strength => {
        html += `              <li style="margin-bottom: 6px; font-size: 14px;">${escapeHtml(strength)}</li>\n`;
      });
      html += '            </ul>\n';
      html += '          </div>\n';
    });

    html += '        </div>\n';
  } else {
    html += '        <p style="opacity: 0.7; font-style: italic;">Benchmark strengths data not available.</p>\n';
  }

  html += '      </div>\n';

  html += '    </section>\n\n';
  return html;
}

/**
 * Generate side-by-side screenshot comparison (Your Website vs. Benchmark)
 */
function generateSideBySideComparison(analysisResult, screenshotData) {
  const { matched_benchmark, screenshot_desktop_url, screenshot_mobile_url } = analysisResult;

  if (!matched_benchmark) {
    return '';
  }

  let html = '';
  html += '    <!-- Side-by-Side Screenshot Comparison -->\n';
  html += '    <section class="section" id="screenshot-comparison">\n';
  html += '      <div class="section-header">\n';
  html += '        <h2 class="section-title" style="font-size: 1.5rem; font-weight: bold;">\n';
  html += '          <span class="section-title-icon">📸</span>\n';
  html += '          Visual Comparison\n';
  html += '        </h2>\n';
  html += `        <p class="section-description">Side-by-side comparison with ${escapeHtml(matched_benchmark.company_name)} showing design differences and opportunities.</p>\n`;
  html += '      </div>\n\n';

  // Desktop Comparison
  if (matched_benchmark.screenshot_desktop_url && screenshot_desktop_url) {
    html += '      <div style="margin-bottom: 48px;">\n';
    html += '        <h3 style="font-size: 1.3rem; font-weight: 600; margin-bottom: 20px; color: var(--text-primary);">Desktop View</h3>\n';
    html += '        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 24px;">\n';

    // Your Website
    html += '          <div style="background: var(--bg-secondary); border-radius: 12px; overflow: hidden; border: 2px solid rgba(255, 255, 255, 0.1);">\n';
    html += '            <div style="padding: 16px; background: rgba(255, 255, 255, 0.05); border-bottom: 2px solid rgba(255, 255, 255, 0.1);">\n';
    html += '              <div style="font-weight: 600; font-size: 1rem; color: var(--text-primary);">Your Website</div>\n';
    html += '            </div>\n';
    html += '            <div style="padding: 0;">\n';

    // Find the processed desktop screenshot from screenshotData
    const yourDesktopScreenshot = screenshotData.screenshots.find(s => s.device === 'desktop');
    if (yourDesktopScreenshot?.dataUri) {
      html += `              <img src="${yourDesktopScreenshot.dataUri}" alt="Your Website - Desktop" style="width: 100%; height: auto; display: block;" />\n`;
    } else {
      // Fallback to path-based loading
      html += '              <div style="padding: 60px 20px; text-align: center; background: rgba(255, 255, 255, 0.05); opacity: 0.5;">Screenshot not available</div>\n';
    }

    html += '            </div>\n';
    html += '          </div>\n';

    // Benchmark Website
    html += '          <div style="background: var(--bg-secondary); border-radius: 12px; overflow: hidden; border: 2px solid var(--primary);">\n';
    html += '            <div style="padding: 16px; background: rgba(99, 102, 241, 0.1); border-bottom: 2px solid var(--primary);">\n';
    html += `              <div style="font-weight: 600; font-size: 1rem; color: var(--primary);">${escapeHtml(matched_benchmark.company_name)} (Benchmark)</div>\n`;
    html += '            </div>\n';
    html += '            <div style="padding: 0;">\n';

    // Find the processed benchmark desktop screenshot
    const benchmarkDesktopScreenshot = screenshotData.benchmarkScreenshots?.find(s => s.device === 'desktop');
    if (benchmarkDesktopScreenshot?.dataUri) {
      html += `              <img src="${benchmarkDesktopScreenshot.dataUri}" alt="${escapeHtml(matched_benchmark.company_name)} - Desktop" style="width: 100%; height: auto; display: block;" />\n`;
    } else {
      html += '              <div style="padding: 60px 20px; text-align: center; background: rgba(255, 255, 255, 0.05); opacity: 0.5; font-style: italic;">Benchmark screenshot not available</div>\n';
    }

    html += '            </div>\n';
    html += '          </div>\n';

    html += '        </div>\n';
    html += '      </div>\n';
  }

  // Mobile Comparison
  if (matched_benchmark.screenshot_mobile_url && screenshot_mobile_url) {
    html += '      <div>\n';
    html += '        <h3 style="font-size: 1.3rem; font-weight: 600; margin-bottom: 20px; color: var(--text-primary);">Mobile View</h3>\n';
    html += '        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 24px; max-width: 800px;">\n';

    // Your Website
    html += '          <div style="background: var(--bg-secondary); border-radius: 12px; overflow: hidden; border: 2px solid rgba(255, 255, 255, 0.1);">\n';
    html += '            <div style="padding: 16px; background: rgba(255, 255, 255, 0.05); border-bottom: 2px solid rgba(255, 255, 255, 0.1);">\n';
    html += '              <div style="font-weight: 600; font-size: 1rem; color: var(--text-primary);">Your Website</div>\n';
    html += '            </div>\n';
    html += '            <div style="padding: 0;">\n';

    // Find the processed mobile screenshot from screenshotData
    const yourMobileScreenshot = screenshotData.screenshots.find(s => s.device === 'mobile');
    if (yourMobileScreenshot?.dataUri) {
      html += `              <img src="${yourMobileScreenshot.dataUri}" alt="Your Website - Mobile" style="width: 100%; height: auto; display: block;" />\n`;
    } else {
      // Fallback
      html += '              <div style="padding: 60px 20px; text-align: center; background: rgba(255, 255, 255, 0.05); opacity: 0.5;">Screenshot not available</div>\n';
    }

    html += '            </div>\n';
    html += '          </div>\n';

    // Benchmark Website
    html += '          <div style="background: var(--bg-secondary); border-radius: 12px; overflow: hidden; border: 2px solid var(--primary);">\n';
    html += '            <div style="padding: 16px; background: rgba(99, 102, 241, 0.1); border-bottom: 2px solid var(--primary);">\n';
    html += `              <div style="font-weight: 600; font-size: 1rem; color: var(--primary);">${escapeHtml(matched_benchmark.company_name)} (Benchmark)</div>\n`;
    html += '            </div>\n';
    html += '            <div style="padding: 0;">\n';

    // Find the processed benchmark mobile screenshot
    const benchmarkMobileScreenshot = screenshotData.benchmarkScreenshots?.find(s => s.device === 'mobile');
    if (benchmarkMobileScreenshot?.dataUri) {
      html += `              <img src="${benchmarkMobileScreenshot.dataUri}" alt="${escapeHtml(matched_benchmark.company_name)} - Mobile" style="width: 100%; height: auto; display: block;" />\n`;
    } else {
      html += '              <div style="padding: 60px 20px; text-align: center; background: rgba(255, 255, 255, 0.05); opacity: 0.5; font-style: italic;">Benchmark screenshot not available</div>\n';
    }

    html += '            </div>\n';
    html += '          </div>\n';

    html += '        </div>\n';
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

  // Full report has dedicated sections for all this data, so skip "Additional Insights"
  // (kept in preview report for quick summary)

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

/**
 * Generate benchmark-aware summary (2-3 paragraphs)
 */
function generateBenchmarkAwareSummary(data) {
  const {
    company_name,
    grade,
    overall_score,
    matched_benchmark,
    design_score,
    seo_score,
    content_score,
    social_score,
    one_liner
  } = data;

  let paragraphs = [];

  // Paragraph 1: Overall performance with benchmark context
  if (matched_benchmark) {
    const gap = matched_benchmark.scores.overall - overall_score;
    const percentOfBenchmark = Math.round((overall_score / matched_benchmark.scores.overall) * 100);

    if (gap > 0) {
      paragraphs.push(
        `Your website scores ${Math.round(overall_score)}/100 (Grade ${grade}), performing at ${percentOfBenchmark}% of ${matched_benchmark.company_name}'s level—a leading ${matched_benchmark.industry || 'industry'} business with exceptional digital presence.`
      );
    } else {
      paragraphs.push(
        `Your website scores ${Math.round(overall_score)}/100 (Grade ${grade}), matching or exceeding ${matched_benchmark.company_name}—a leading ${matched_benchmark.industry || 'industry'} business recognized for digital excellence.`
      );
    }
  } else {
    // Fallback without benchmark
    paragraphs.push(
      `Your website scores ${Math.round(overall_score)}/100 (Grade ${grade}). ${one_liner || getDefaultSummary(grade, overall_score, company_name)}`
    );
  }

  // Paragraph 2: Strengths and opportunities
  if (matched_benchmark) {
    const matchedDimensions = [];
    const gapDimensions = [];

    // Check which dimensions match or lag
    if (Math.abs(content_score - matched_benchmark.scores.content) <= 5) {
      matchedDimensions.push('content quality');
    }
    if (Math.abs(design_score - matched_benchmark.scores.design) <= 5) {
      matchedDimensions.push('design');
    }
    if (Math.abs(seo_score - matched_benchmark.scores.seo) <= 5) {
      matchedDimensions.push('SEO');
    }

    if (design_score < matched_benchmark.scores.design - 5) {
      gapDimensions.push('design');
    }
    if (seo_score < matched_benchmark.scores.seo - 5) {
      gapDimensions.push('SEO');
    }
    if (content_score < matched_benchmark.scores.content - 5) {
      gapDimensions.push('content');
    }
    if (social_score < matched_benchmark.scores.social - 5) {
      gapDimensions.push('social presence');
    }

    if (matchedDimensions.length > 0 && gapDimensions.length > 0) {
      const matchedText = matchedDimensions.length === 1
        ? matchedDimensions[0]
        : matchedDimensions.slice(0, -1).join(', ') + ' and ' + matchedDimensions[matchedDimensions.length - 1];

      const gapText = gapDimensions.length === 1
        ? gapDimensions[0]
        : gapDimensions.slice(0, -1).join(', ') + ' and ' + gapDimensions[gapDimensions.length - 1];

      paragraphs.push(
        `While your ${matchedText} matches theirs, there are clear opportunities to learn from their approach to ${gapText}.`
      );
    } else if (gapDimensions.length > 0) {
      const gapText = gapDimensions.length === 1
        ? gapDimensions[0]
        : gapDimensions.join(', ');

      paragraphs.push(
        `There are opportunities to learn from ${matched_benchmark.company_name}'s approach to ${gapText}.`
      );
    } else {
      paragraphs.push(
        `Your website performs strongly across all key dimensions.`
      );
    }
  } else {
    // Fallback: mention top opportunities without benchmark
    const weakAreas = [];
    if (design_score < 70) weakAreas.push('design');
    if (seo_score < 70) weakAreas.push('SEO');
    if (content_score < 70) weakAreas.push('content');

    if (weakAreas.length > 0) {
      paragraphs.push(
        `Key improvement opportunities exist in ${weakAreas.join(', ')}.`
      );
    }
  }

  // Paragraph 3: Actionable next steps
  if (matched_benchmark) {
    const gap = matched_benchmark.scores.overall - overall_score;

    if (gap > 20) {
      // Large gap - milestone approach
      paragraphs.push(
        `The analysis below identifies priority actions, backed by concrete measurements and benchmark comparisons, that can help you progress toward industry leader performance through phased milestones.`
      );
    } else if (gap > 0) {
      // Small gap - achievable
      paragraphs.push(
        `The analysis below identifies priority actions, backed by concrete measurements and benchmark comparisons, that could help you match or exceed industry leader performance within 90 days.`
      );
    } else {
      // At or above benchmark
      paragraphs.push(
        `The analysis below identifies opportunities to maintain your competitive edge and continue leading in digital excellence.`
      );
    }
  } else {
    paragraphs.push(
      `The analysis below identifies priority actions that will enhance your digital presence and user experience.`
    );
  }

  return paragraphs.join(' ');
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
  const benchmarkScreenshots = [];
  const { screenshot_desktop_url, screenshot_mobile_url, matched_benchmark } = analysisResult;

  const toBase64 = async (path, options = {}) => {
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
      const dataUri = await compressImageFromFile(absolutePath, options);
      return dataUri;
    } catch (error) {
      console.error('[HTML Exporter V3] Failed to process screenshot:', error);
      return null;
    }
  };

  // Process desktop screenshot with viewport cropping
  if (screenshot_desktop_url) {
    const dataUri = await toBase64(screenshot_desktop_url, {
      maxWidth: 1200,
      maxHeight: 900,  // Typical desktop viewport height
      cropToViewport: true,
      quality: 85
    });
    if (dataUri) {
      screenshots.push({
        title: 'Desktop View (Homepage)',
        type: 'desktop',
        device: 'desktop',
        dataUri
      });
    }
  }

  // Process mobile screenshot with viewport cropping
  if (screenshot_mobile_url) {
    const dataUri = await toBase64(screenshot_mobile_url, {
      maxWidth: 500,  // Mobile width
      maxHeight: 800, // Typical mobile viewport height
      cropToViewport: true,
      quality: 85
    });
    if (dataUri) {
      screenshots.push({
        title: 'Mobile View (Homepage)',
        type: 'mobile',
        device: 'mobile',
        dataUri
      });
    }
  }

  // Process benchmark screenshots (if available)
  if (matched_benchmark) {
    // Benchmark desktop screenshot
    if (matched_benchmark.screenshot_desktop_url) {
      const dataUri = await toBase64(matched_benchmark.screenshot_desktop_url, {
        maxWidth: 1200,
        maxHeight: 900,
        cropToViewport: true,
        quality: 85
      });
      if (dataUri) {
        benchmarkScreenshots.push({
          title: `${matched_benchmark.company_name} - Desktop View`,
          type: 'desktop',
          device: 'desktop',
          dataUri
        });
      }
    }

    // Benchmark mobile screenshot
    if (matched_benchmark.screenshot_mobile_url) {
      const dataUri = await toBase64(matched_benchmark.screenshot_mobile_url, {
        maxWidth: 500,
        maxHeight: 800,
        cropToViewport: true,
        quality: 85
      });
      if (dataUri) {
        benchmarkScreenshots.push({
          title: `${matched_benchmark.company_name} - Mobile View`,
          type: 'mobile',
          device: 'mobile',
          dataUri
        });
      }
    }
  }

  return { screenshots, benchmarkScreenshots };
}

/**
 * Generate Business Intelligence Section
 */
function generateBusinessIntelligenceSection(analysisResult) {
  const { business_intelligence } = analysisResult;
  if (!business_intelligence) return '';

  let html = '';
  html += '    <!-- Business Intelligence -->\n';
  html += '    <section class="section" id="business-intelligence">\n';
  html += '      <div class="section-header">\n';
  html += '        <h2 class="section-title" style="font-size: 1.5rem; font-weight: bold;">\n';
  html += '          <span class="section-title-icon">🏢</span>\n';
  html += '          Business Intelligence\n';
  html += '        </h2>\n';
  html += '        <p class="section-description">Insights about company size, operations, and digital presence.</p>\n';
  html += '      </div>\n\n';

  html += '      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px;">\n';

  // Company Size
  if (business_intelligence.companySize) {
    html += '        <div style="background: var(--bg-secondary); padding: 24px; border-radius: 12px; border-left: 4px solid var(--primary);">\n';
    html += '          <h3 style="font-size: 1.2rem; font-weight: 600; margin-bottom: 16px; color: var(--primary);">📊 Company Size</h3>\n';
    if (business_intelligence.companySize.employeeCount) {
      html += `          <p style="margin-bottom: 8px;"><strong>Estimated Employees:</strong> ${escapeHtml(business_intelligence.companySize.employeeCount)}</p>\n`;
    }
    if (business_intelligence.companySize.locationCount) {
      html += `          <p style="margin-bottom: 8px;"><strong>Locations:</strong> ${escapeHtml(business_intelligence.companySize.locationCount)}</p>\n`;
    }
    html += '        </div>\n';
  }

  // Years in Business
  if (business_intelligence.yearsInBusiness) {
    html += '        <div style="background: var(--bg-secondary); padding: 24px; border-radius: 12px; border-left: 4px solid var(--success);">\n';
    html += '          <h3 style="font-size: 1.2rem; font-weight: 600; margin-bottom: 16px; color: var(--success);">📅 Company History</h3>\n';
    if (business_intelligence.yearsInBusiness.foundedYear) {
      html += `          <p style="margin-bottom: 8px;"><strong>Founded:</strong> ${escapeHtml(business_intelligence.yearsInBusiness.foundedYear)}</p>\n`;
    }
    if (business_intelligence.yearsInBusiness.estimatedYears) {
      html += `          <p style="margin-bottom: 8px;"><strong>Years in Business:</strong> ~${escapeHtml(business_intelligence.yearsInBusiness.estimatedYears)} years</p>\n`;
    }
    html += '        </div>\n';
  }

  // Pricing Visibility
  if (business_intelligence.pricingVisibility) {
    html += '        <div style="background: var(--bg-secondary); padding: 24px; border-radius: 12px; border-left: 4px solid #f59e0b;">\n';
    html += '          <h3 style="font-size: 1.2rem; font-weight: 600; margin-bottom: 16px; color: #f59e0b;">💰 Pricing Information</h3>\n';
    html += `          <p style="margin-bottom: 8px;"><strong>Pricing Visible:</strong> ${business_intelligence.pricingVisibility.visible ? 'Yes' : 'No'}</p>\n`;
    if (business_intelligence.pricingVisibility.priceRange) {
      html += `          <p style="margin-bottom: 8px;"><strong>Price Range:</strong> ${escapeHtml(business_intelligence.pricingVisibility.priceRange)}</p>\n`;
    }
    html += '        </div>\n';
  }

  // Content Freshness
  if (business_intelligence.contentFreshness) {
    html += '        <div style="background: var(--bg-secondary); padding: 24px; border-radius: 12px; border-left: 4px solid #8b5cf6;">\n';
    html += '          <h3 style="font-size: 1.2rem; font-weight: 600; margin-bottom: 16px; color: #8b5cf6;">✍️ Content Activity</h3>\n';
    html += `          <p style="margin-bottom: 8px;"><strong>Blog Active:</strong> ${business_intelligence.contentFreshness.blogActive ? 'Yes' : 'No'}</p>\n`;
    if (business_intelligence.contentFreshness.lastUpdate) {
      html += `          <p style="margin-bottom: 8px;"><strong>Last Update:</strong> ${escapeHtml(business_intelligence.contentFreshness.lastUpdate)}</p>\n`;
    }
    html += '        </div>\n';
  }

  // Decision Maker Accessibility
  if (business_intelligence.decisionMakerAccessibility) {
    html += '        <div style="background: var(--bg-secondary); padding: 24px; border-radius: 12px; border-left: 4px solid #ef4444;">\n';
    html += '          <h3 style="font-size: 1.2rem; font-weight: 600; margin-bottom: 16px; color: #ef4444;">👤 Decision Maker Access</h3>\n';
    html += `          <p style="margin-bottom: 8px;"><strong>Direct Email:</strong> ${business_intelligence.decisionMakerAccessibility.hasDirectEmail ? 'Found' : 'Not Found'}</p>\n`;
    html += `          <p style="margin-bottom: 8px;"><strong>Direct Phone:</strong> ${business_intelligence.decisionMakerAccessibility.hasDirectPhone ? 'Found' : 'Not Found'}</p>\n`;
    if (business_intelligence.decisionMakerAccessibility.ownerName) {
      html += `          <p style="margin-bottom: 8px;"><strong>Owner Name:</strong> ${escapeHtml(business_intelligence.decisionMakerAccessibility.ownerName)}</p>\n`;
    }
    html += '        </div>\n';
  }

  // Premium Features
  if (business_intelligence.premiumFeatures && business_intelligence.premiumFeatures.detected && business_intelligence.premiumFeatures.detected.length > 0) {
    html += '        <div style="background: var(--bg-secondary); padding: 24px; border-radius: 12px; border-left: 4px solid #10b981;">\n';
    html += '          <h3 style="font-size: 1.2rem; font-weight: 600; margin-bottom: 16px; color: #10b981;">⭐ Premium Features Detected</h3>\n';
    html += '          <ul style="margin: 0; padding-left: 20px; line-height: 1.8;">\n';
    business_intelligence.premiumFeatures.detected.forEach(feature => {
      html += `            <li>${escapeHtml(feature)}</li>\n`;
    });
    html += '          </ul>\n';
    if (business_intelligence.premiumFeatures.budgetIndicator) {
      html += `          <p style="margin-top: 12px; font-style: italic; opacity: 0.8;"><strong>Budget Indicator:</strong> ${escapeHtml(business_intelligence.premiumFeatures.budgetIndicator)}</p>\n`;
    }
    html += '        </div>\n';
  }

  html += '      </div>\n';
  html += '    </section>\n\n';
  return html;
}

/**
 * Generate Technical Deep Dive Section
 */
function generateTechnicalDeepDive(analysisResult) {
  const {
    performance_metrics_pagespeed,
    performance_metrics_crux,
    tech_stack,
    accessibility_compliance,
    has_https,
    is_mobile_friendly,
    page_load_time
  } = analysisResult;

  let html = '';
  html += '    <!-- Technical Deep Dive -->\n';
  html += '    <section class="section" id="technical-deep-dive">\n';
  html += '      <div class="section-header">\n';
  html += '        <h2 class="section-title" style="font-size: 1.5rem; font-weight: bold;">\n';
  html += '          <span class="section-title-icon">⚙️</span>\n';
  html += '          Technical Deep Dive\n';
  html += '        </h2>\n';
  html += '        <p class="section-description">Performance metrics, tech stack, and technical infrastructure analysis.</p>\n';
  html += '      </div>\n\n';

  // Tech Stack
  html += '      <div style="background: var(--bg-secondary); padding: 24px; border-radius: 12px; margin-bottom: 24px;">\n';
  html += '        <h3 style="font-size: 1.3rem; font-weight: 600; margin-bottom: 16px;">🛠️ Technology Stack</h3>\n';
  html += '        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">\n';
  html += `          <div><strong>Platform:</strong> ${escapeHtml(tech_stack || 'Unknown')}</div>\n`;
  html += `          <div><strong>HTTPS:</strong> ${has_https ? '✅ Enabled' : '❌ Not Enabled'}</div>\n`;
  html += `          <div><strong>Mobile Friendly:</strong> ${is_mobile_friendly ? '✅ Yes' : '❌ No'}</div>\n`;
  if (page_load_time) {
    html += `          <div><strong>Page Load Time:</strong> ${page_load_time}ms</div>\n`;
  }
  html += '        </div>\n';
  html += '      </div>\n';

  // PageSpeed Insights
  if (performance_metrics_pagespeed) {
    html += '      <div style="background: var(--bg-secondary); padding: 24px; border-radius: 12px; margin-bottom: 24px;">\n';
    html += '        <h3 style="font-size: 1.3rem; font-weight: 600; margin-bottom: 8px;">📊 PageSpeed Insights</h3>\n';
    html += '        <p style="opacity: 0.7; margin-bottom: 16px; font-size: 0.95rem;">Lab data from simulated tests in controlled environments.</p>\n';

    // Helper function to generate visual metric card with bar
    const generateMetricCard = (label, value, unit, thresholds) => {
      const numValue = parseFloat(value);
      let status = 'poor';
      let color = 'rgba(239, 68, 68, 0.8)'; // Red
      let percentage = 100;

      if (numValue <= thresholds.good) {
        status = 'good';
        color = 'rgba(16, 185, 129, 0.8)'; // Green
        percentage = (numValue / thresholds.good) * 50; // First half is good range
      } else if (numValue <= thresholds.needsImprovement) {
        status = 'needs-improvement';
        color = 'rgba(245, 158, 11, 0.8)'; // Orange
        const range = thresholds.needsImprovement - thresholds.good;
        const position = numValue - thresholds.good;
        percentage = 50 + (position / range) * 30; // Middle 30% is needs improvement
      } else {
        percentage = Math.min(80 + (numValue / thresholds.needsImprovement) * 20, 100);
      }

      return `
        <div style="margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 0.9rem; font-weight: 600; color: var(--text-primary);">${label}</span>
            <span style="font-size: 0.9rem; font-weight: 600; color: ${color};">${numValue.toFixed(label === 'CLS' ? 3 : 2)}${unit}</span>
          </div>
          <div style="position: relative; width: 100%; height: 24px; background: var(--bg-tertiary); border-radius: 6px; overflow: hidden; border: 1px solid var(--border-light);">
            <div style="position: absolute; width: ${percentage}%; height: 100%; background: ${color}; transition: width 0.3s;"></div>
            <div style="position: absolute; left: 50%; width: 2px; height: 100%; background: rgba(0,0,0,0.2);"></div>
            <div style="position: absolute; left: 80%; width: 2px; height: 100%; background: rgba(0,0,0,0.2);"></div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-secondary); margin-top: 4px;">
            <span>Good: &lt;${thresholds.good}${unit}</span>
            <span>Needs Improvement: ${thresholds.good}-${thresholds.needsImprovement}${unit}</span>
            <span>Poor: &gt;${thresholds.needsImprovement}${unit}</span>
          </div>
        </div>
      `;
    };

    // Helper function to generate performance score gauge
    const generateScoreGauge = (score, label, icon) => {
      const numScore = parseInt(score) || 0;
      let color = 'rgba(239, 68, 68, 0.8)'; // Red
      let status = 'Poor';

      if (numScore >= 90) {
        color = 'rgba(16, 185, 129, 0.8)'; // Green
        status = 'Good';
      } else if (numScore >= 50) {
        color = 'rgba(245, 158, 11, 0.8)'; // Orange
        status = 'Needs Improvement';
      }

      const circumference = 2 * Math.PI * 45; // radius = 45
      const offset = circumference - (numScore / 100) * circumference;

      return `
        <div style="text-align: center; padding: 20px; background: var(--bg-primary); border-radius: 12px; border: 1px solid var(--border-light);">
          <svg width="120" height="120" viewBox="0 0 120 120" style="margin: 0 auto 16px;">
            <circle cx="60" cy="60" r="45" fill="none" stroke="#E5E7EB" stroke-width="10"/>
            <circle
              cx="60" cy="60" r="45" fill="none"
              stroke="${color}"
              stroke-width="10"
              stroke-dasharray="${circumference}"
              stroke-dashoffset="${offset}"
              stroke-linecap="round"
              transform="rotate(-90 60 60)"
              style="transition: stroke-dashoffset 0.5s;"
            />
            <text x="60" y="60" text-anchor="middle" dominant-baseline="middle" font-size="32" font-weight="bold" fill="${color}">${numScore}</text>
          </svg>
          <h4 style="font-size: 1.1rem; margin-bottom: 4px; color: var(--text-primary); font-weight: 600;">${icon} ${label}</h4>
          <p style="font-size: 0.9rem; color: ${color}; font-weight: 500; margin: 0;">${status}</p>
        </div>
      `;
    };

    html += '        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; margin-bottom: 24px;">\n';

    // Mobile Performance Score
    if (performance_metrics_pagespeed.mobile) {
      html += generateScoreGauge(performance_metrics_pagespeed.mobile.performanceScore, 'Mobile', '📱');
    }

    // Desktop Performance Score
    if (performance_metrics_pagespeed.desktop) {
      html += generateScoreGauge(performance_metrics_pagespeed.desktop.performanceScore, 'Desktop', '💻');
    }

    html += '        </div>\n';

    // Core Web Vitals thresholds
    const thresholds = {
      fcp: { good: 1.8, needsImprovement: 3.0 },
      lcp: { good: 2.5, needsImprovement: 4.0 },
      tbt: { good: 200, needsImprovement: 600 },
      cls: { good: 0.1, needsImprovement: 0.25 }
    };

    // Mobile Metrics
    if (performance_metrics_pagespeed.mobile?.metrics) {
      html += '        <div style="background: var(--bg-primary); padding: 20px; border-radius: 12px; margin-bottom: 16px; border: 1px solid var(--border-light);">\n';
      html += '          <h4 style="font-size: 1rem; font-weight: 600; margin-bottom: 16px; color: var(--text-primary);">📱 Mobile Metrics</h4>\n';

      const m = performance_metrics_pagespeed.mobile.metrics;
      if (m.firstContentfulPaint) {
        html += generateMetricCard('First Contentful Paint (FCP)', m.firstContentfulPaint, 's', thresholds.fcp);
      }
      if (m.largestContentfulPaint) {
        html += generateMetricCard('Largest Contentful Paint (LCP)', m.largestContentfulPaint, 's', thresholds.lcp);
      }
      if (m.totalBlockingTime) {
        html += generateMetricCard('Total Blocking Time (TBT)', m.totalBlockingTime, 'ms', thresholds.tbt);
      }
      if (m.cumulativeLayoutShift) {
        html += generateMetricCard('Cumulative Layout Shift (CLS)', m.cumulativeLayoutShift, '', thresholds.cls);
      }

      html += '        </div>\n';
    }

    // Desktop Metrics
    if (performance_metrics_pagespeed.desktop?.metrics) {
      html += '        <div style="background: var(--bg-primary); padding: 20px; border-radius: 12px; border: 1px solid var(--border-light);">\n';
      html += '          <h4 style="font-size: 1rem; font-weight: 600; margin-bottom: 16px; color: var(--text-primary);">💻 Desktop Metrics</h4>\n';

      const d = performance_metrics_pagespeed.desktop.metrics;
      if (d.firstContentfulPaint) {
        html += generateMetricCard('First Contentful Paint (FCP)', d.firstContentfulPaint, 's', thresholds.fcp);
      }
      if (d.largestContentfulPaint) {
        html += generateMetricCard('Largest Contentful Paint (LCP)', d.largestContentfulPaint, 's', thresholds.lcp);
      }
      if (d.totalBlockingTime) {
        html += generateMetricCard('Total Blocking Time (TBT)', d.totalBlockingTime, 'ms', thresholds.tbt);
      }
      if (d.cumulativeLayoutShift) {
        html += generateMetricCard('Cumulative Layout Shift (CLS)', d.cumulativeLayoutShift, '', thresholds.cls);
      }

      html += '        </div>\n';
    }

    html += '      </div>\n';
  }

  // CrUX Data - Real User Performance Metrics
  if (performance_metrics_crux) {
    html += '      <div style="background: var(--bg-secondary); padding: 24px; border-radius: 12px; margin-top: 16px;">\n';
    html += '        <h3 style="font-size: 1.3rem; font-weight: 600; margin-bottom: 8px;">🌐 Chrome User Experience (CrUX) - Real User Data</h3>\n';
    html += '        <p style="opacity: 0.7; margin-bottom: 16px; font-size: 0.95rem;">Performance data from actual Chrome users visiting your website over the past 28 days.</p>\n';

    const metrics = performance_metrics_crux.metrics || {};

    // Helper function to get metric display name
    const getMetricName = (key) => {
      const names = {
        'largestContentfulPaint': 'Largest Contentful Paint (LCP)',
        'firstInputDelay': 'First Input Delay (FID)',
        'cumulativeLayoutShift': 'Cumulative Layout Shift (CLS)',
        'firstContentfulPaint': 'First Contentful Paint (FCP)',
        'interactionToNextPaint': 'Interaction to Next Paint (INP)'
      };
      return names[key] || key;
    };

    // Helper function to format metric value
    const formatMetricValue = (key, value) => {
      if (key.includes('Shift')) return value.toFixed(3); // CLS
      if (value > 1000) return (value / 1000).toFixed(2) + 's'; // Convert ms to seconds
      return value + 'ms';
    };

    // Display each metric
    Object.entries(metrics).forEach(([metricKey, metricData]) => {
      const good = Math.round((metricData.good || 0) * 100);
      const needsImprovement = Math.round((metricData.needsImprovement || 0) * 100);
      const poor = Math.round((metricData.poor || 0) * 100);
      const p75Value = metricData.percentiles?.p75;

      html += '        <div style="margin-bottom: 20px; padding: 16px; background: var(--bg-primary); border-radius: 8px; border: 1px solid var(--border-light);">\n';
      html += `          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">\n`;
      html += `            <h4 style="font-size: 1rem; font-weight: 600; color: var(--text-primary); margin: 0;">${getMetricName(metricKey)}</h4>\n`;
      if (p75Value !== undefined) {
        html += `            <span style="font-size: 0.9rem; font-weight: 600; color: var(--text-secondary); background: var(--bg-tertiary); padding: 4px 12px; border-radius: 6px;">75th: ${formatMetricValue(metricKey, p75Value)}</span>\n`;
      }
      html += `          </div>\n`;

      // Stacked bar chart showing good/needs improvement/poor distribution
      html += '          <div style="display: flex; width: 100%; height: 32px; border-radius: 6px; overflow: hidden; margin-bottom: 8px; border: 1px solid var(--border-light);">\n';

      if (good > 0) {
        html += `            <div style="width: ${good}%; background: rgba(16, 185, 129, 0.8); display: flex; align-items: center; justify-content: center; color: white; font-size: 0.85rem; font-weight: 600;">${good > 10 ? good + '%' : ''}</div>\n`;
      }
      if (needsImprovement > 0) {
        html += `            <div style="width: ${needsImprovement}%; background: rgba(245, 158, 11, 0.8); display: flex; align-items: center; justify-content: center; color: white; font-size: 0.85rem; font-weight: 600;">${needsImprovement > 10 ? needsImprovement + '%' : ''}</div>\n`;
      }
      if (poor > 0) {
        html += `            <div style="width: ${poor}%; background: rgba(239, 68, 68, 0.8); display: flex; align-items: center; justify-content: center; color: white; font-size: 0.85rem; font-weight: 600;">${poor > 10 ? poor + '%' : ''}</div>\n`;
      }

      html += '          </div>\n';

      // Legend
      html += '          <div style="display: flex; gap: 16px; font-size: 0.85rem;">\n';
      html += `            <div style="display: flex; align-items: center; gap: 6px;"><div style="width: 12px; height: 12px; background: rgba(16, 185, 129, 0.8); border-radius: 2px;"></div><span style="color: var(--text-secondary);">Good: ${good}%</span></div>\n`;
      html += `            <div style="display: flex; align-items: center; gap: 6px;"><div style="width: 12px; height: 12px; background: rgba(245, 158, 11, 0.8); border-radius: 2px;"></div><span style="color: var(--text-secondary);">Needs Improvement: ${needsImprovement}%</span></div>\n`;
      html += `            <div style="display: flex; align-items: center; gap: 6px;"><div style="width: 12px; height: 12px; background: rgba(239, 68, 68, 0.8); border-radius: 2px;"></div><span style="color: var(--text-secondary);">Poor: ${poor}%</span></div>\n`;
      html += '          </div>\n';

      html += '        </div>\n';
    });

    // Data source info
    if (performance_metrics_crux.origin) {
      html += `        <p style="font-size: 0.85rem; color: var(--text-secondary); opacity: 0.7; margin-top: 12px;">Data source: ${escapeHtml(performance_metrics_crux.origin)} • Form factor: ${performance_metrics_crux.formFactor || 'All devices'}</p>\n`;
    }

    html += '      </div>\n';
  }

  html += '    </section>\n\n';
  return html;
}

/**
 * Generate Complete Issue Breakdown Section
 */
function generateCompleteIssueBreakdown(analysisResult) {
  const {
    design_issues_desktop = [],
    design_issues_mobile = [],
    seo_issues = [],
    content_issues = [],
    social_issues = [],
    accessibility_issues = [],
    performance_issues = []
  } = analysisResult;

  let html = '';
  html += '    <!-- Complete Issue Breakdown -->\n';
  html += '    <section class="section" id="complete-issues">\n';
  html += '      <div class="section-header">\n';
  html += '        <h2 class="section-title" style="font-size: 1.5rem; font-weight: bold;">\n';
  html += '          <span class="section-title-icon">🔍</span>\n';
  html += '          Complete Issue Breakdown\n';
  html += '        </h2>\n';
  html += '        <p class="section-description">All identified issues across all analysis modules (not just top priorities).</p>\n';
  html += '      </div>\n\n';

  const issueCategories = [
    { title: 'Desktop Design Issues', icon: '🖥️', issues: design_issues_desktop },
    { title: 'Mobile Design Issues', icon: '📱', issues: design_issues_mobile },
    { title: 'SEO Issues', icon: '🔍', issues: seo_issues },
    { title: 'Content Issues', icon: '📝', issues: content_issues },
    { title: 'Accessibility Issues', icon: '♿', issues: accessibility_issues },
    { title: 'Social Media Issues', icon: '👥', issues: social_issues },
    { title: 'Performance Issues', icon: '⚡', issues: performance_issues }
  ];

  issueCategories.forEach(category => {
    if (category.issues && category.issues.length > 0) {
      // Minimal styling - subtle gray border
      html += `      <div style="background: var(--bg-secondary); padding: 24px; border-radius: 12px; margin-bottom: 24px; border: 1px solid var(--border-light);">\n`;
      html += `        <h3 style="font-size: 1.2rem; font-weight: 600; margin-bottom: 16px; color: var(--text-primary);">\n`;
      html += `          ${category.icon} ${escapeHtml(category.title)} (${category.issues.length})\n`;
      html += '        </h3>\n';

      html += '        <div style="display: grid; gap: 12px;">\n';
      category.issues.forEach((issue, idx) => {
        const severity = issue.severity || issue.priority || 'medium';

        // Only show colored badge for high/critical severity
        const showColoredBadge = (severity === 'high' || severity === 'critical');
        const severityColor = severity === 'critical' ? '#ef4444' : '#f59e0b';

        // Clean minimal card with subtle gray border
        html += '          <div style="background: var(--bg-primary); padding: 16px; border-radius: 8px; border: 1px solid var(--border-light);">\n';
        html += '            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">\n';
        html += `              <h4 style="font-weight: 600; margin: 0; flex: 1; color: var(--text-primary);">${idx + 1}. ${escapeHtml(issue.title || issue.description || 'Issue')}</h4>\n`;

        // Only show badge for high/critical issues
        if (showColoredBadge) {
          html += `              <span style="background: ${severityColor}; color: white; padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; margin-left: 12px;">${severity}</span>\n`;
        }

        html += '            </div>\n';

        if (issue.description && issue.title) {
          html += `            <p style="opacity: 0.7; margin: 8px 0; font-size: 0.95rem; color: var(--text-secondary);">${escapeHtml(issue.description)}</p>\n`;
        }

        if (issue.recommendation) {
          // Minimal recommendation styling - just subtle background, no colored border
          html += `            <p style="margin-top: 12px; padding: 12px; background: var(--bg-tertiary); border-radius: 6px; font-size: 0.95rem; color: var(--text-secondary);"><strong style="color: var(--text-primary);">💡 Recommendation:</strong> ${escapeHtml(issue.recommendation)}</p>\n`;
        }

        html += '          </div>\n';
      });
      html += '        </div>\n';
      html += '      </div>\n';
    }
  });

  html += '    </section>\n\n';
  return html;
}

/**
 * Generate WCAG Accessibility Compliance Section
 */
function generateAccessibilityComplianceSection(analysisResult) {
  const { accessibility_compliance } = analysisResult;
  if (!accessibility_compliance) return '';

  let html = '';
  html += '    <!-- WCAG Accessibility Compliance -->\n';
  html += '    <section class="section" id="wcag-compliance">\n';
  html += '      <div class="section-header">\n';
  html += '        <h2 class="section-title" style="font-size: 1.5rem; font-weight: bold;">\n';
  html += '          <span class="section-title-icon">♿</span>\n';
  html += '          WCAG Accessibility Compliance\n';
  html += '        </h2>\n';
  html += '        <p class="section-description">Web Content Accessibility Guidelines (WCAG) compliance breakdown by level.</p>\n';
  html += '      </div>\n\n';

  html += '      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 24px;">\n';

  // Level A
  if (accessibility_compliance.levelA) {
    const passRate = accessibility_compliance.levelA.passRate || 0;
    const color = passRate >= 80 ? '#10b981' : passRate >= 60 ? '#f59e0b' : '#ef4444';
    html += '        <div style="background: var(--bg-secondary); padding: 24px; border-radius: 12px; border-left: 4px solid ' + color + ';">\n';
    html += '          <h3 style="font-size: 1.2rem; font-weight: 600; margin-bottom: 12px; color: ' + color + ';">Level A (Basic)</h3>\n';
    html += `          <p style="font-size: 2rem; font-weight: bold; margin-bottom: 8px;">${Math.round(passRate)}%</p>\n`;
    html += `          <p style="opacity: 0.8;">Passed: ${accessibility_compliance.levelA.passed || 0} / Failed: ${accessibility_compliance.levelA.failed || 0}</p>\n`;
    html += '        </div>\n';
  }

  // Level AA
  if (accessibility_compliance.levelAA) {
    const passRate = accessibility_compliance.levelAA.passRate || 0;
    const color = passRate >= 80 ? '#10b981' : passRate >= 60 ? '#f59e0b' : '#ef4444';
    html += '        <div style="background: var(--bg-secondary); padding: 24px; border-radius: 12px; border-left: 4px solid ' + color + ';">\n';
    html += '          <h3 style="font-size: 1.2rem; font-weight: 600; margin-bottom: 12px; color: ' + color + ';">Level AA (Standard)</h3>\n';
    html += `          <p style="font-size: 2rem; font-weight: bold; margin-bottom: 8px;">${Math.round(passRate)}%</p>\n`;
    html += `          <p style="opacity: 0.8;">Passed: ${accessibility_compliance.levelAA.passed || 0} / Failed: ${accessibility_compliance.levelAA.failed || 0}</p>\n`;
    html += '        </div>\n';
  }

  // Level AAA
  if (accessibility_compliance.levelAAA) {
    const passRate = accessibility_compliance.levelAAA.passRate || 0;
    const color = passRate >= 80 ? '#10b981' : passRate >= 60 ? '#f59e0b' : '#ef4444';
    html += '        <div style="background: var(--bg-secondary); padding: 24px; border-radius: 12px; border-left: 4px solid ' + color + ';">\n';
    html += '          <h3 style="font-size: 1.2rem; font-weight: 600; margin-bottom: 12px; color: ' + color + ';">Level AAA (Enhanced)</h3>\n';
    html += `          <p style="font-size: 2rem; font-weight: bold; margin-bottom: 8px;">${Math.round(passRate)}%</p>\n`;
    html += `          <p style="opacity: 0.8;">Passed: ${accessibility_compliance.levelAAA.passed || 0} / Failed: ${accessibility_compliance.levelAAA.failed || 0}</p>\n`;
    html += '        </div>\n';
  }

  html += '      </div>\n';
  html += '    </section>\n\n';
  return html;
}

/**
 * Generate Multi-Page Screenshot Gallery
 */
function generateMultiPageScreenshotGallery(analysisResult, screenshotData, registry) {
  const { crawl_metadata } = analysisResult;
  if (!crawl_metadata || !crawl_metadata.pages || crawl_metadata.pages.length === 0) {
    return '';
  }

  let html = '';
  html += '    <!-- Multi-Page Screenshot Gallery -->\n';
  html += '    <section class="section" id="screenshot-gallery">\n';
  html += '      <div class="section-header">\n';
  html += '        <h2 class="section-title" style="font-size: 1.5rem; font-weight: bold;">\n';
  html += '          <span class="section-title-icon">📸</span>\n';
  html += '          Multi-Page Screenshot Gallery\n';
  html += '        </h2>\n';
  html += `        <p class="section-description">Screenshots from all ${crawl_metadata.pages.length} crawled pages (desktop & mobile).</p>\n`;
  html += '      </div>\n\n';

  crawl_metadata.pages.forEach((page, idx) => {
    if (!page.screenshot_paths || (!page.screenshot_paths.desktop && !page.screenshot_paths.mobile)) {
      return;
    }

    const pageTitle = page.url === '/' || page.url === '' ? 'Homepage' : page.url;

    html += `      <div style="background: var(--bg-secondary); padding: 24px; border-radius: 12px; margin-bottom: 24px;">\n`;
    html += `        <h3 style="font-size: 1.2rem; font-weight: 600; margin-bottom: 16px;">${idx + 1}. ${escapeHtml(pageTitle)}</h3>\n`;
    html += '        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 24px;">\n';

    // Desktop screenshot
    if (page.screenshot_paths.desktop) {
      html += '          <div>\n';
      html += '            <h4 style="font-size: 1rem; margin-bottom: 12px; opacity: 0.8;">🖥️ Desktop View</h4>\n';
      html += '            <div style="border: 2px solid rgba(255,255,255,0.1); border-radius: 8px; overflow: hidden;">\n';
      html += '              <div style="padding: 60px 20px; text-align: center; background: rgba(255,255,255,0.05); opacity: 0.5;">Screenshot available in full report</div>\n';
      html += '            </div>\n';
      html += '          </div>\n';
    }

    // Mobile screenshot
    if (page.screenshot_paths.mobile) {
      html += '          <div>\n';
      html += '            <h4 style="font-size: 1rem; margin-bottom: 12px; opacity: 0.8;">📱 Mobile View</h4>\n';
      html += '            <div style="border: 2px solid rgba(255,255,255,0.1); border-radius: 8px; overflow: hidden;">\n';
      html += '              <div style="padding: 60px 20px; text-align: center; background: rgba(255,255,255,0.05); opacity: 0.5;">Screenshot available in full report</div>\n';
      html += '            </div>\n';
      html += '          </div>\n';
    }

    html += '        </div>\n';
    html += '      </div>\n';
  });

  html += '    </section>\n\n';
  return html;
}

/**
 * Generate Lead Scoring & Sales Intelligence Section
 */
function generateLeadScoringSection(analysisResult) {
  const {
    lead_score,
    lead_priority,
    priority_tier,
    budget_likelihood,
    receptiveness_score,
    key_pain_points = [],
    value_proposition,
    urgency_factors = []
  } = analysisResult;

  let html = '';
  html += '    <!-- Lead Scoring & Sales Intelligence -->\n';
  html += '    <section class="section" id="lead-scoring">\n';
  html += '      <div class="section-header">\n';
  html += '        <h2 class="section-title" style="font-size: 1.5rem; font-weight: bold;">\n';
  html += '          <span class="section-title-icon">🎯</span>\n';
  html += '          Lead Scoring & Sales Intelligence\n';
  html += '        </h2>\n';
  html += '        <p class="section-description">AI-generated sales insights and lead qualification data.</p>\n';
  html += '      </div>\n\n';

  // Lead Score Overview
  html += '      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 24px; margin-bottom: 32px;">\n';

  if (lead_score !== undefined) {
    const scoreColor = lead_score >= 70 ? '#10b981' : lead_score >= 50 ? '#f59e0b' : '#ef4444';
    html += '        <div style="background: var(--bg-secondary); padding: 24px; border-radius: 12px; text-align: center; border: 3px solid ' + scoreColor + ';">\n';
    html += '          <h3 style="font-size: 0.9rem; text-transform: uppercase; opacity: 0.7; margin-bottom: 8px;">Lead Score</h3>\n';
    html += `          <p style="font-size: 3rem; font-weight: bold; color: ${scoreColor}; margin: 0;">${lead_score}</p>\n`;
    html += '        </div>\n';
  }

  if (lead_priority) {
    html += '        <div style="background: var(--bg-secondary); padding: 24px; border-radius: 12px; text-align: center;">\n';
    html += '          <h3 style="font-size: 0.9rem; text-transform: uppercase; opacity: 0.7; margin-bottom: 8px;">Priority</h3>\n';
    html += `          <p style="font-size: 2rem; font-weight: bold; margin: 0;">${escapeHtml(lead_priority).toUpperCase()}</p>\n`;
    html += '        </div>\n';
  }

  if (priority_tier) {
    html += '        <div style="background: var(--bg-secondary); padding: 24px; border-radius: 12px; text-align: center;">\n';
    html += '          <h3 style="font-size: 0.9rem; text-transform: uppercase; opacity: 0.7; margin-bottom: 8px;">Tier</h3>\n';
    html += `          <p style="font-size: 2rem; font-weight: bold; margin: 0;">${escapeHtml(priority_tier)}</p>\n`;
    html += '        </div>\n';
  }

  if (receptiveness_score !== undefined) {
    html += '        <div style="background: var(--bg-secondary); padding: 24px; border-radius: 12px; text-align: center;">\n';
    html += '          <h3 style="font-size: 0.9rem; text-transform: uppercase; opacity: 0.7; margin-bottom: 8px;">Receptiveness</h3>\n';
    html += `          <p style="font-size: 2rem; font-weight: bold; margin: 0;">${receptiveness_score}%</p>\n`;
    html += '        </div>\n';
  }

  html += '      </div>\n';

  // Budget Likelihood & Value Prop
  if (budget_likelihood || value_proposition) {
    html += '      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; margin-bottom: 24px;">\n';

    if (budget_likelihood) {
      html += '        <div style="background: var(--bg-secondary); padding: 24px; border-radius: 12px; border-left: 4px solid #10b981;">\n';
      html += '          <h3 style="font-size: 1.2rem; font-weight: 600; margin-bottom: 12px; color: #10b981;">💰 Budget Likelihood</h3>\n';
      html += `          <p style="opacity: 0.9;">${escapeHtml(budget_likelihood)}</p>\n`;
      html += '        </div>\n';
    }

    if (value_proposition) {
      html += '        <div style="background: var(--bg-secondary); padding: 24px; border-radius: 12px; border-left: 4px solid var(--primary);">\n';
      html += '          <h3 style="font-size: 1.2rem; font-weight: 600; margin-bottom: 12px; color: var(--primary);">💡 Value Proposition</h3>\n';
      html += `          <p style="opacity: 0.9;">${escapeHtml(value_proposition)}</p>\n`;
      html += '        </div>\n';
    }

    html += '      </div>\n';
  }

  // Key Pain Points
  if (key_pain_points.length > 0) {
    html += '      <div style="background: var(--bg-secondary); padding: 24px; border-radius: 12px; margin-bottom: 24px; border-left: 4px solid #ef4444;">\n';
    html += '        <h3 style="font-size: 1.2rem; font-weight: 600; margin-bottom: 16px; color: #ef4444;">🎯 Key Pain Points</h3>\n';
    html += '        <ul style="margin: 0; padding-left: 20px; line-height: 1.8;">\n';
    key_pain_points.forEach(point => {
      html += `          <li>${escapeHtml(point)}</li>\n`;
    });
    html += '        </ul>\n';
    html += '      </div>\n';
  }

  // Urgency Factors
  if (urgency_factors.length > 0) {
    html += '      <div style="background: var(--bg-secondary); padding: 24px; border-radius: 12px; border-left: 4px solid #f59e0b;">\n';
    html += '        <h3 style="font-size: 1.2rem; font-weight: 600; margin-bottom: 16px; color: #f59e0b;">⚡ Urgency Factors</h3>\n';
    html += '        <ul style="margin: 0; padding-left: 20px; line-height: 1.8;">\n';
    urgency_factors.forEach(factor => {
      html += `          <li>${escapeHtml(factor)}</li>\n`;
    });
    html += '        </ul>\n';
    html += '      </div>\n';
  }

  html += '    </section>\n\n';
  return html;
}

/**
 * Generate Appendix Section
 */
function generateAppendix(analysisResult, synthesisData) {
  const {
    qa_validation,
    synthesis_errors = [],
    synthesis_stage_metadata = {},
    crawl_metadata
  } = analysisResult;

  let html = '';
  html += '    <!-- Appendix -->\n';
  html += '    <section class="section" id="appendix" style="background: rgba(255,255,255,0.02); border-top: 2px solid rgba(255,255,255,0.1);">\n';
  html += '      <div class="section-header">\n';
  html += '        <h2 class="section-title" style="font-size: 1.5rem; font-weight: bold;">\n';
  html += '          <span class="section-title-icon">📚</span>\n';
  html += '          Appendix\n';
  html += '        </h2>\n';
  html += '        <p class="section-description">Methodology, quality validation, and technical metadata.</p>\n';
  html += '      </div>\n\n';

  // QA Validation
  if (qa_validation && qa_validation.status) {
    const statusColors = {
      PASS: '#10b981',
      WARN: '#f59e0b',
      FAIL: '#ef4444',
      NOT_RUN: '#6b7280'
    };
    const statusColor = statusColors[qa_validation.status] || '#6b7280';

    html += '      <div style="background: var(--bg-secondary); padding: 24px; border-radius: 12px; margin-bottom: 24px; border-left: 4px solid ' + statusColor + ';">\n';
    html += '        <h3 style="font-size: 1.3rem; font-weight: 600; margin-bottom: 16px; color: ' + statusColor + ';">✅ QA Validation Report</h3>\n';
    html += `        <p style="font-size: 1.5rem; font-weight: bold; margin-bottom: 12px;">Status: ${qa_validation.status}</p>\n`;
    if (qa_validation.qualityScore !== undefined) {
      html += `        <p style="margin-bottom: 16px;">Quality Score: ${qa_validation.qualityScore}/100</p>\n`;
    }

    if (qa_validation.recommendations && qa_validation.recommendations.length > 0) {
      html += '        <div style="margin-top: 16px;">\n';
      html += '          <h4 style="font-weight: 600; margin-bottom: 12px;">Recommendations:</h4>\n';
      html += '          <ul style="margin: 0; padding-left: 20px; line-height: 1.8;">\n';
      qa_validation.recommendations.forEach(rec => {
        html += `            <li>${escapeHtml(rec)}</li>\n`;
      });
      html += '          </ul>\n';
      html += '        </div>\n';
    }
    html += '      </div>\n';
  }

  // Synthesis Metadata
  if (Object.keys(synthesis_stage_metadata).length > 0) {
    html += '      <div style="background: var(--bg-secondary); padding: 24px; border-radius: 12px; margin-bottom: 24px;">\n';
    html += '        <h3 style="font-size: 1.3rem; font-weight: 600; margin-bottom: 16px;">🤖 AI Synthesis Metadata</h3>\n';
    html += '        <div style="font-family: monospace; background: rgba(0,0,0,0.5); padding: 16px; border-radius: 8px; overflow-x: auto; font-size: 0.85rem;">\n';
    html += `          <pre>${JSON.stringify(synthesis_stage_metadata, null, 2)}</pre>\n`;
    html += '        </div>\n';
    html += '      </div>\n';
  }

  // Crawl Metadata
  if (crawl_metadata) {
    html += '      <div style="background: var(--bg-secondary); padding: 24px; border-radius: 12px;">\n';
    html += '        <h3 style="font-size: 1.3rem; font-weight: 600; margin-bottom: 16px;">🕷️ Crawl Metadata</h3>\n';
    html += '        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 16px;">\n';
    html += `          <div><strong>Pages Discovered:</strong> ${crawl_metadata.pages_discovered || 0}</div>\n`;
    html += `          <div><strong>Pages Crawled:</strong> ${crawl_metadata.pages_crawled || 0}</div>\n`;
    html += `          <div><strong>Pages Analyzed:</strong> ${crawl_metadata.pages_analyzed || 0}</div>\n`;
    if (crawl_metadata.failed_pages && crawl_metadata.failed_pages.length > 0) {
      html += `          <div><strong>Failed Pages:</strong> ${crawl_metadata.failed_pages.length}</div>\n`;
    }
    html += '        </div>\n';
    html += '      </div>\n';
  }

  html += '    </section>\n\n';
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

// Export as default
export default generateHTMLReportV3Full;