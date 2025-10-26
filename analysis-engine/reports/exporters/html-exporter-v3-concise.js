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
    grade: rawGrade,
    website_grade,
    overall_score,
    industry,
    city,
    analyzed_at,
    url
  } = analysisResult;

  // Use website_grade from database if grade is not provided
  const grade = rawGrade || website_grade;

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

  // 2. Executive Summary (with benchmark context)
  content += generateStrategicAssessment(analysisResult, synthesisData);

  // 3. Current State Screenshots (Visual Evidence - MOVED UP)
  if (screenshotData.screenshots.length > 0) {
    content += generateVisualEvidence(screenshotData, registry);
  }

  // 4. Benchmark Comparison Chart (if benchmark available)
  if (analysisResult.matched_benchmark) {
    content += generateBenchmarkComparisonChart(analysisResult, synthesisData);

    // 4.5 Side-by-Side Screenshot Comparison (if screenshots available)
    if (analysisResult.matched_benchmark.screenshot_desktop_url && analysisResult.screenshot_desktop_url) {
      content += generateSideBySideComparison(analysisResult, screenshotData);
    }
  }

  // 5. Implementation Timeline (90-Day Action Plan)
  content += generateTimeline(analysisResult, synthesisData);

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
    grade: rawGrade,
    website_grade,
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
    // Social media profiles
    social_profiles,
    // Benchmark data
    matched_benchmark
  } = analysisResult;

  // Use website_grade from database if grade is not provided
  const grade = rawGrade || website_grade;

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

  // Add social media links if available
  if (social_profiles && Object.keys(social_profiles).length > 0) {
    const socialIcons = {
      facebook: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
      instagram: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>',
      twitter: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
      linkedin: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>',
      youtube: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
      tiktok: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>',
      pinterest: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z"/></svg>',
    };

    const socialLinks = [];
    for (const [platform, url] of Object.entries(social_profiles)) {
      if (url) {
        socialLinks.push({ platform, url, icon: socialIcons[platform] || '' });
      }
    }

    if (socialLinks.length > 0) {
      html += '        <div class="social-links-box" style="margin-top: 16px; display: flex; gap: 12px; justify-content: center; align-items: center; flex-wrap: wrap;">\n';

      socialLinks.forEach(({ platform, url, icon }) => {
        const capitalizedPlatform = platform.charAt(0).toUpperCase() + platform.slice(1);
        html += `          <a href="${escapeHtml(url)}" target="_blank" title="${capitalizedPlatform}" style="color: var(--text-secondary); text-decoration: none; display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; background: var(--bg-secondary); border: 1px solid var(--border-light); border-radius: 50%; transition: all 0.2s;" onmouseover="this.style.background='var(--primary-lightest)'; this.style.borderColor='var(--primary-light)'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'" onmouseout="this.style.background='var(--bg-secondary)'; this.style.borderColor='var(--border-light)'; this.style.transform='translateY(0)'; this.style.boxShadow='none'">\n`;
        html += `            ${icon}\n`;
        html += '          </a>\n';
      });

      html += '        </div>\n';
    }
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
    html += `              <div style="font-size: 24px; font-weight: bold;">${matched_benchmark.grade || matched_benchmark.scores?.grade || 'N/A'} (${Math.round(matched_benchmark.overall_score || matched_benchmark.scores?.overall || 0)})</div>\n`;
    html += '            </div>\n';

    html += '          </div>\n';

    // Gap indicator
    const gap = (matched_benchmark.overall_score || matched_benchmark.scores?.overall || 0) - overall_score;
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

  // Show desktop and mobile homepage views
  const mainScreenshots = screenshotData.screenshots.filter(s =>
    s.device === 'desktop' || s.device === 'mobile'
  ).slice(0, 2);

  mainScreenshots.forEach(screenshot => {
    const deviceClass = screenshot.device === 'mobile' ? 'screenshot-card-mobile' : 'screenshot-card-desktop';
    html += `        <div class="screenshot-card ${deviceClass}">\n`;
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

  // Additional Insights section removed - redundant for concise preview report

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