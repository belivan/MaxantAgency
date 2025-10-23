/**
 * HTML Report Exporter
 *
 * Converts analysis results into styled HTML reports using the dark theme template
 * Images are embedded as base64 data URIs for portability
 */

import { readFile } from 'fs/promises';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join, isAbsolute } from 'path';
import { existsSync } from 'fs';
import { generateAllScreenshotsSection } from './enhanced-screenshots.js';
import { ScreenshotRegistry } from '../utils/screenshot-registry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Generate HTML report from analysis result
 */
export async function generateHTMLReport(analysisResult, synthesisData = null) {
  const {
    company_name,
    grade,
    overall_score,
    industry,
    city,
    analyzed_at,
    screenshot_desktop_url,
    screenshot_mobile_url
  } = analysisResult;

  const templatePath = join(__dirname, '../templates/html-template.html');
  const template = await readFile(templatePath, 'utf-8');

  // Create screenshot registry
  const registry = new ScreenshotRegistry();

  // Convert screenshot paths to base64 data URIs for portability
  const toBase64DataURI = async (value) => {
    if (!value || typeof value !== 'string') return null;
    const trimmed = value.trim();

    // If already a data URI, return as-is
    if (trimmed.startsWith('data:')) {
      return trimmed;
    }

    // If it's a URL, we can't embed it (would need to fetch)
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      console.warn(`[HTML Exporter] Cannot embed remote URL: ${trimmed}`);
      return trimmed; // Return URL as-is, won't be portable but won't break
    }

    // Handle file:// URLs
    let filePath = trimmed;
    if (trimmed.startsWith('file://')) {
      filePath = fileURLToPath(trimmed);
    }

    // Check if file exists
    if (!existsSync(filePath)) {
      console.warn(`[HTML Exporter] Screenshot file not found: ${filePath}`);
      return null;
    }

    try {
      // Read the image file as base64
      const imageBuffer = await readFile(filePath);
      const base64Image = imageBuffer.toString('base64');
      
      // Determine MIME type from file extension
      const ext = filePath.toLowerCase().split('.').pop();
      const mimeTypes = {
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'svg': 'image/svg+xml'
      };
      const mimeType = mimeTypes[ext] || 'image/png';
      
      return `data:${mimeType};base64,${base64Image}`;
    } catch (err) {
      console.error(`[HTML Exporter] Failed to embed screenshot (${filePath}): ${err.message}`);
      return null;
    }
  };

  const desktopScreenshotSrc = await toBase64DataURI(screenshot_desktop_url);
  const mobileScreenshotSrc = await toBase64DataURI(screenshot_mobile_url);

  // Register main screenshots in registry
  let desktopScreenshotId = null;
  let mobileScreenshotId = null;

  if (desktopScreenshotSrc) {
    desktopScreenshotId = registry.register({
      title: `${company_name} - Homepage Desktop View`,
      viewport: 'desktop',
      page: analysisResult.url || 'Homepage',
      src: desktopScreenshotSrc,
      description: 'Desktop homepage screenshot captured during analysis'
    });
  }

  if (mobileScreenshotSrc) {
    mobileScreenshotId = registry.register({
      title: `${company_name} - Homepage Mobile View`,
      viewport: 'mobile',
      page: analysisResult.url || 'Homepage',
      src: mobileScreenshotSrc,
      description: 'Mobile homepage screenshot captured during analysis'
    });
  }

  // Register all screenshots from crawl metadata
  if (analysisResult.crawl_metadata && analysisResult.crawl_metadata.pages_analyzed) {
    analysisResult.crawl_metadata.pages_analyzed.forEach(page => {
      if (page.screenshot_paths) {
        // Register desktop screenshot
        if (page.screenshot_paths.desktop) {
          toBase64DataURI(page.screenshot_paths.desktop).then(src => {
            if (src) {
              registry.register({
                title: `${page.title || page.url} - Desktop`,
                viewport: 'desktop',
                page: page.fullUrl || page.url,
                src: src,
                description: `Desktop screenshot of ${page.title || page.url}`
              });
            }
          });
        }

        // Register mobile screenshot
        if (page.screenshot_paths.mobile) {
          toBase64DataURI(page.screenshot_paths.mobile).then(src => {
            if (src) {
              registry.register({
                title: `${page.title || page.url} - Mobile`,
                viewport: 'mobile',
                page: page.fullUrl || page.url,
                src: src,
                description: `Mobile screenshot of ${page.title || page.url}`
              });
            }
          });
        }
      }
    });
  }

  const htmlContent = await generateHTMLContent(analysisResult, {
    desktopScreenshot: desktopScreenshotSrc,
    mobileScreenshot: mobileScreenshotSrc,
    desktopScreenshotId,
    mobileScreenshotId,
    registry,
    synthesisData
  });

  const date = new Date(analyzed_at || Date.now());
  const formattedDate = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  let html = template
    .replace(/{{COMPANY_NAME}}/g, escapeHtml(company_name))
    .replace(/{{GRADE}}/g, grade)
    .replace(/{{OVERALL_SCORE}}/g, overall_score)
    .replace(/{{INDUSTRY}}/g, escapeHtml(industry || 'Not specified'))
    .replace(/{{LOCATION}}/g, escapeHtml(city || 'Not specified'))
    .replace(/{{DATE}}/g, formattedDate)
    .replace(/{{GENERATED_DATE}}/g, date.toLocaleString('en-US'))
    .replace(/{{CONTENT}}/g, htmlContent);

  return html;
}


/**
 * Generate HTML content for all report sections
 */
async function generateHTMLContent(analysisResult, options = {}) {
  const {
    desktopScreenshot,
    mobileScreenshot,
    desktopScreenshotId,
    mobileScreenshotId,
    registry,
    synthesisData
  } = options;

  let content = '';
  
  // Extract consolidated issues from synthesis data for use in sections
  const consolidatedIssues = synthesisData?.consolidatedIssues || null;

  // Executive Summary (AI-generated if synthesis available)
  if (synthesisData && synthesisData.executiveSummary) {
    content += generateExecutiveSummaryHTML(synthesisData.executiveSummary, analysisResult, registry);
  }

  // Score cards grid
  content += generateScoreCardsHTML(analysisResult);

  // Quick wins section
  if (analysisResult.quick_wins && analysisResult.quick_wins.length > 0) {
    content += generateQuickWinsHTML(analysisResult.quick_wins);
  }

  // Desktop analysis
  if (analysisResult.design_score_desktop) {
    content += generateDesktopHTML(analysisResult, desktopScreenshotId, registry, consolidatedIssues);
  }

  // Mobile analysis
  if (analysisResult.design_score_mobile) {
    content += generateMobileHTML(analysisResult, mobileScreenshotId, registry, consolidatedIssues);
  }

  // SEO section
  if (analysisResult.seo_score) {
    content += generateSEOHTML(analysisResult, consolidatedIssues, registry);
  }

  // Content section
  if (analysisResult.content_score) {
    content += generateContentHTML(analysisResult, consolidatedIssues, registry);
  }

  // Social section
  if (analysisResult.social_score) {
    content += generateSocialHTML(analysisResult, consolidatedIssues, registry);
  }

  // Accessibility section
  if (analysisResult.accessibility_score) {
    content += generateAccessibilityHTML(analysisResult, consolidatedIssues, registry);
  }

  // ALL SCREENSHOTS SECTION - REMOVED: Screenshots now in appendix with references
  // if (analysisResult.crawl_metadata && (analysisResult.crawl_metadata.successful_pages || analysisResult.crawl_metadata.pages_analyzed)) {
  //   const allScreenshotsSection = await generateAllScreenshotsSection(analysisResult.crawl_metadata, analysisResult);
  //   content += allScreenshotsSection;
  // }

  // Business intelligence
  if (analysisResult.business_intelligence) {
    content += generateBusinessIntelHTML(analysisResult);
  }

  // Lead priority
  if (analysisResult.lead_priority) {
    content += generateLeadPriorityHTML(analysisResult);
  }

  // Action plan
  content += generateActionPlanHTML(analysisResult, consolidatedIssues, registry);

  // Screenshots Appendix (NEW - all screenshots with references)
  if (registry && registry.getCount() > 0) {
    content += registry.generateAppendixHTML();
  }

  // Appendix (Technical details)
  content += generateAppendixHTML(analysisResult);

  return content;
}

/**
 * Generate executive summary section (AI-generated)
 */
function generateExecutiveSummaryHTML(executiveSummary, analysisResult, registry) {
  const { headline, criticalFindings = [], strategicRoadmap } = executiveSummary;

  let html = '<div class="section executive-summary">\n';
  html += '  <h2>📋 Executive Summary</h2>\n';

  // Headline
  if (headline) {
    html += `  <p class="executive-headline"><strong>${escapeHtml(headline)}</strong></p>\n\n`;
  }

  // Critical Findings
  if (criticalFindings.length > 0) {
    html += '  <h3>🔴 Critical Findings</h3>\n';
    html += '  <div class="critical-findings">\n';

    criticalFindings.forEach((finding, index) => {
      html += '    <div class="finding-item">\n';
      html += `      <div class="finding-rank">${finding.rank || index + 1}</div>\n`;
      html += '      <div class="finding-content">\n';
      html += `        <h4>${escapeHtml(finding.issue)}</h4>\n`;
      html += `        <p><strong>Impact:</strong> ${escapeHtml(finding.impact)}</p>\n`;

      // Screenshot references
      if (finding.evidence && finding.evidence.length > 0 && registry) {
        const references = finding.evidence.map(ref => registry.getReference(ref)).join(' ');
        html += `        <p><strong>Evidence:</strong> ${references}</p>\n`;
      }

      html += `        <p><strong>Recommendation:</strong> ${escapeHtml(finding.recommendation)}</p>\n`;

      if (finding.estimatedValue) {
        html += `        <p class="finding-value"><strong>Expected Value:</strong> ${escapeHtml(finding.estimatedValue)}</p>\n`;
      }

      html += '      </div>\n';
      html += '    </div>\n';
    });

    html += '  </div>\n\n';
  }

  // Strategic Roadmap (30/60/90)
  if (strategicRoadmap) {
    html += '  <h3>🗓️ Strategic Roadmap</h3>\n';
    html += '  <div class="strategic-roadmap">\n';

    // Month 1
    if (strategicRoadmap.month1) {
      html += '    <div class="roadmap-phase">\n';
      html += `      <h4><span class="phase-badge">Month 1</span> ${escapeHtml(strategicRoadmap.month1.title || strategicRoadmap.month1.focus || 'Quick Wins')}</h4>\n`;
      if (strategicRoadmap.month1.description) {
        html += `      <p class="text-secondary">${escapeHtml(strategicRoadmap.month1.description)}</p>\n`;
      }
      
      // Priorities or initiatives
      const items = strategicRoadmap.month1.priorities || strategicRoadmap.month1.initiatives || [];
      if (items.length > 0) {
        html += '      <ul class="roadmap-priorities">\n';
        items.forEach(item => {
          html += `        <li>${escapeHtml(item)}</li>\n`;
        });
        html += '      </ul>\n';
      }
      
      // Metrics
      if (strategicRoadmap.month1.keyMetrics || strategicRoadmap.month1.estimatedCost || strategicRoadmap.month1.expectedROI) {
        html += '      <div class="roadmap-metrics">\n';
        if (strategicRoadmap.month1.estimatedCost) {
          html += '        <div class="roadmap-metric">\n';
          html += '          <strong>Estimated Cost</strong>\n';
          html += `          <span>${escapeHtml(strategicRoadmap.month1.estimatedCost)}</span>\n`;
          html += '        </div>\n';
        }
        if (strategicRoadmap.month1.expectedROI) {
          html += '        <div class="roadmap-metric">\n';
          html += '          <strong>Expected ROI</strong>\n';
          html += `          <span>${escapeHtml(strategicRoadmap.month1.expectedROI)}</span>\n`;
          html += '        </div>\n';
        }
        if (strategicRoadmap.month1.keyMetrics && Array.isArray(strategicRoadmap.month1.keyMetrics)) {
          strategicRoadmap.month1.keyMetrics.forEach(metric => {
            html += '        <div class="roadmap-metric">\n';
            html += `          <span>${escapeHtml(metric)}</span>\n`;
            html += '        </div>\n';
          });
        }
        html += '      </div>\n';
      }
      
      if (strategicRoadmap.month1.expectedOutcome) {
        html += `      <p class="mt-2"><strong>Expected Outcome:</strong> ${escapeHtml(strategicRoadmap.month1.expectedOutcome)}</p>\n`;
      }
      html += '    </div>\n';
    }

    // Month 2
    if (strategicRoadmap.month2) {
      html += '    <div class="roadmap-phase">\n';
      html += `      <h4><span class="phase-badge">Month 2</span> ${escapeHtml(strategicRoadmap.month2.title || strategicRoadmap.month2.focus || 'Core Improvements')}</h4>\n`;
      if (strategicRoadmap.month2.description) {
        html += `      <p class="text-secondary">${escapeHtml(strategicRoadmap.month2.description)}</p>\n`;
      }
      
      // Priorities or initiatives
      const items = strategicRoadmap.month2.priorities || strategicRoadmap.month2.initiatives || [];
      if (items.length > 0) {
        html += '      <ul class="roadmap-priorities">\n';
        items.forEach(item => {
          html += `        <li>${escapeHtml(item)}</li>\n`;
        });
        html += '      </ul>\n';
      }
      
      // Metrics
      if (strategicRoadmap.month2.keyMetrics || strategicRoadmap.month2.estimatedCost || strategicRoadmap.month2.expectedROI) {
        html += '      <div class="roadmap-metrics">\n';
        if (strategicRoadmap.month2.estimatedCost) {
          html += '        <div class="roadmap-metric">\n';
          html += '          <strong>Estimated Cost</strong>\n';
          html += `          <span>${escapeHtml(strategicRoadmap.month2.estimatedCost)}</span>\n`;
          html += '        </div>\n';
        }
        if (strategicRoadmap.month2.expectedROI) {
          html += '        <div class="roadmap-metric">\n';
          html += '          <strong>Expected ROI</strong>\n';
          html += `          <span>${escapeHtml(strategicRoadmap.month2.expectedROI)}</span>\n`;
          html += '        </div>\n';
        }
        if (strategicRoadmap.month2.keyMetrics && Array.isArray(strategicRoadmap.month2.keyMetrics)) {
          strategicRoadmap.month2.keyMetrics.forEach(metric => {
            html += '        <div class="roadmap-metric">\n';
            html += `          <span>${escapeHtml(metric)}</span>\n`;
            html += '        </div>\n';
          });
        }
        html += '      </div>\n';
      }
      
      if (strategicRoadmap.month2.expectedOutcome) {
        html += `      <p class="mt-2"><strong>Expected Outcome:</strong> ${escapeHtml(strategicRoadmap.month2.expectedOutcome)}</p>\n`;
      }
      html += '    </div>\n';
    }

    // Month 3
    if (strategicRoadmap.month3) {
      html += '    <div class="roadmap-phase">\n';
      html += `      <h4><span class="phase-badge">Month 3</span> ${escapeHtml(strategicRoadmap.month3.title || strategicRoadmap.month3.focus || 'Advanced Optimization')}</h4>\n`;
      if (strategicRoadmap.month3.description) {
        html += `      <p class="text-secondary">${escapeHtml(strategicRoadmap.month3.description)}</p>\n`;
      }
      
      // Priorities or initiatives
      const items = strategicRoadmap.month3.priorities || strategicRoadmap.month3.initiatives || [];
      if (items.length > 0) {
        html += '      <ul class="roadmap-priorities">\n';
        items.forEach(item => {
          html += `        <li>${escapeHtml(item)}</li>\n`;
        });
        html += '      </ul>\n';
      }
      
      // Metrics
      if (strategicRoadmap.month3.keyMetrics || strategicRoadmap.month3.estimatedCost || strategicRoadmap.month3.expectedROI) {
        html += '      <div class="roadmap-metrics">\n';
        if (strategicRoadmap.month3.estimatedCost) {
          html += '        <div class="roadmap-metric">\n';
          html += '          <strong>Estimated Cost</strong>\n';
          html += `          <span>${escapeHtml(strategicRoadmap.month3.estimatedCost)}</span>\n`;
          html += '        </div>\n';
        }
        if (strategicRoadmap.month3.expectedROI) {
          html += '        <div class="roadmap-metric">\n';
          html += '          <strong>Expected ROI</strong>\n';
          html += `          <span>${escapeHtml(strategicRoadmap.month3.expectedROI)}</span>\n`;
          html += '        </div>\n';
        }
        if (strategicRoadmap.month3.keyMetrics && Array.isArray(strategicRoadmap.month3.keyMetrics)) {
          strategicRoadmap.month3.keyMetrics.forEach(metric => {
            html += '        <div class="roadmap-metric">\n';
            html += `          <span>${escapeHtml(metric)}</span>\n`;
            html += '        </div>\n';
          });
        }
        html += '      </div>\n';
      }
      
      if (strategicRoadmap.month3.expectedOutcome) {
        html += `      <p class="mt-2"><strong>Expected Outcome:</strong> ${escapeHtml(strategicRoadmap.month3.expectedOutcome)}</p>\n`;
      }
      html += '    </div>\n';
    }

    html += '  </div>\n';
  }

  html += '</div>\n\n';
  return html;
}

/**
 * Generate score cards grid
 */
function generateScoreCardsHTML(analysisResult) {
  const scores = [
    { title: 'Desktop Design', score: analysisResult.design_score_desktop, key: 'desktop' },
    { title: 'Mobile Design', score: analysisResult.design_score_mobile, key: 'mobile' },
    { title: 'SEO', score: analysisResult.seo_score, key: 'seo' },
    { title: 'Content', score: analysisResult.content_score, key: 'content' },
    { title: 'Social Media', score: analysisResult.social_score, key: 'social' },
    { title: 'Accessibility', score: analysisResult.accessibility_score, key: 'accessibility' }
  ].filter(s => s.score !== undefined);

  let html = '<div class="score-grid">\n';

  scores.forEach(({ title, score }) => {
    const scoreClass = getScoreClass(score);
    html += `
  <div class="score-card">
    <div class="score-card-header">
      <div class="score-card-title">${title}</div>
      <div class="score-value">${score}</div>
    </div>
    <div class="score-bar">
      <div class="score-bar-fill ${scoreClass}" style="width: ${score}%"></div>
    </div>
  </div>\n`;
  });

  html += '</div>\n\n';
  return html;
}

/**
 * Generate quick wins section
 */
function generateQuickWinsHTML(quickWins) {
  if (!quickWins || quickWins.length === 0) return '';

  let html = '<div class="quick-wins">\n';
  html += '  <h3>Quick Wins</h3>\n';
  html += '  <p class="text-secondary mb-2">High-impact improvements you can implement today:</p>\n';

  quickWins.slice(0, 5).forEach(win => {
    html += '  <div class="quick-win-item">\n';
    html += '    <div class="quick-win-icon"></div>\n';
    html += '    <div>\n';
    html += `      <strong>${escapeHtml(win.title)}</strong>\n`;
    if (win.estimatedTime || win.impact) {
      html += '      <div class="text-muted mt-1">\n';
      if (win.estimatedTime) html += `        <span>${escapeHtml(win.estimatedTime)}</span>\n`;
      if (win.impact) html += `        <span>  ${escapeHtml(win.impact)}</span>\n`;
      html += '      </div>\n';
    }
    html += '    </div>\n';
    html += '  </div>\n';
  });

  html += '</div>\n\n';
  return html;
}

/**
 * Generate desktop analysis section
 */
function generateDesktopHTML(analysisResult, screenshotId, registry, synthesisData) {
  const { design_score_desktop } = analysisResult;

  // Use consolidated issues if available, otherwise use original issues
  const desktopIssues = synthesisData?.consolidatedIssues?.filter(i =>
    i.sources?.includes('desktop')
  ) || analysisResult.design_issues_desktop || [];

  let html = '<div class="section">\n';
  html += '  <h2>🖥️ Desktop Experience Analysis</h2>\n';
  html += `  <p><strong>Score:</strong> ${formatScoreBadge(design_score_desktop)}</p>\n`;

  // Screenshot reference (links to appendix)
  if (screenshotId && registry) {
    html += `  <p><strong>Screenshot:</strong> ${registry.getReference(screenshotId)}</p>\n`;
    registry.addReference(screenshotId, 'Desktop Experience Analysis');
  }

  html += '\n';

  if (desktopIssues.length === 0) {
    html += '  <p class="text-secondary">✓ No significant desktop UX issues detected. Your desktop experience is well-optimized.</p>\n';
  } else {
    html += generateIssuesHTML(desktopIssues);
  }

  html += '</div>\n\n';
  return html;
}

/**
 * Generate mobile analysis section
 */
function generateMobileHTML(analysisResult, screenshotId, registry, synthesisData) {
  const { design_score_mobile, is_mobile_friendly } = analysisResult;

  // Use consolidated issues if available, otherwise use original issues
  const mobileIssues = synthesisData?.consolidatedIssues?.filter(i =>
    i.sources?.includes('mobile')
  ) || analysisResult.design_issues_mobile || [];

  let html = '<div class="section">\n';
  html += '  <h2>📱 Mobile Experience Analysis</h2>\n';
  html += `  <p><strong>Score:</strong> ${formatScoreBadge(design_score_mobile)}</p>\n`;

  if (is_mobile_friendly !== undefined) {
    const status = is_mobile_friendly ? '✓ Mobile-Friendly' : '✗ Not Mobile-Friendly';
    html += `  <p><strong>Mobile-Friendly Test:</strong> ${status}</p>\n`;
  }

  // Screenshot reference (links to appendix)
  if (screenshotId && registry) {
    html += `  <p><strong>Screenshot:</strong> ${registry.getReference(screenshotId)}</p>\n`;
    registry.addReference(screenshotId, 'Mobile Experience Analysis');
  }

  html += '\n';

  if (mobileIssues.length === 0) {
    html += '  <p class="text-secondary">✓ No significant mobile UX issues detected. Your mobile experience is well-optimized.</p>\n';
  } else {
    html += generateIssuesHTML(mobileIssues);
  }

  html += '</div>\n\n';
  return html;
}

/**
 * Generate SEO section
 */
function generateSEOHTML(analysisResult, synthesisData) {
  const { seo_score, page_title, meta_description, page_load_time, has_https } = analysisResult;

  // Use consolidated issues if available, otherwise use original issues
  const seoIssues = synthesisData?.consolidatedIssues?.filter(i =>
    i.sources?.includes('seo')
  ) || analysisResult.seo_issues || [];

  let html = '<div class="section">\n';
  html += '  <h2>🔍 SEO & Technical Analysis</h2>\n';
  html += `  <p><strong>Score:</strong> ${formatScoreBadge(seo_score)}</p>\n\n`;

  // Technical snapshot table
  html += '  <h3>Technical Snapshot</h3>\n';
  html += '  <table>\n';
  html += '    <tr><th>Metric</th><th>Value</th></tr>\n';
  if (page_title) html += `    <tr><td>Page Title</td><td>${escapeHtml(page_title)}</td></tr>\n`;
  if (meta_description !== undefined) {
    html += `    <tr><td>Meta Description</td><td>${meta_description ? escapeHtml(meta_description) : '✗ Missing'}</td></tr>\n`;
  }
  if (page_load_time) html += `    <tr><td>Page Load Time</td><td>${page_load_time}ms</td></tr>\n`;
  if (has_https !== undefined) html += `    <tr><td>HTTPS</td><td>${has_https ? '✓ Yes' : '✗ No'}</td></tr>\n`;
  html += '  </table>\n\n';

  if (seoIssues.length > 0) {
    html += '  <h3>SEO Issues</h3>\n';
    html += generateIssuesHTML(seoIssues);
  }

  html += '</div>\n\n';
  return html;
}

/**
 * Generate content section
 */
function generateContentHTML(analysisResult) {
  const { content_score, content_issues = [], content_insights = {} } = analysisResult;

  let html = '<div class="section">\n';
  html += '  <h2>Content Quality Analysis</h2>\n';
  html += `  <p><strong>Score:</strong> ${formatScoreBadge(content_score)}</p>\n\n`;

  // Content insights
  if (Object.keys(content_insights).length > 0) {
    html += '  <h3>Content Inventory</h3>\n';
    html += '  <table>\n';
    html += '    <tr><th>Metric</th><th>Value</th></tr>\n';
    if (content_insights.wordCount) html += `    <tr><td>Word Count</td><td>${content_insights.wordCount}</td></tr>\n`;
    if (content_insights.hasBlog !== undefined) html += `    <tr><td>Blog</td><td>${content_insights.hasBlog ? ' Yes' : ' No'}</td></tr>\n`;
    if (content_insights.blogPostCount) html += `    <tr><td>Blog Posts</td><td>${content_insights.blogPostCount}</td></tr>\n`;
    if (content_insights.ctaCount) html += `    <tr><td>CTAs</td><td>${content_insights.ctaCount}</td></tr>\n`;
    html += '  </table>\n\n';
  }

  if (content_issues.length > 0) {
    html += '  <h3>Content Issues</h3>\n';
    html += generateIssuesHTML(content_issues);
  }

  html += '</div>\n\n';
  return html;
}

/**
 * Generate social section
 */
function generateSocialHTML(analysisResult, consolidatedIssues = null, registry = null) {
  // Use consolidated issues if available, otherwise use original issues
  const socialIssues = consolidatedIssues?.filter(i =>
    i.sources?.includes('social')
  ) || analysisResult.social_issues || [];
  
  const { social_score, social_platforms_present = [], social_profiles = {} } = analysisResult;

  let html = '<div class="section">\n';
  html += '  <h2>Social Media Presence</h2>\n';
  html += `  <p><strong>Score:</strong> ${formatScoreBadge(social_score)}</p>\n\n`;

  // Platform presence
  if (social_platforms_present.length > 0) {
    html += '  <h3>Platform Presence</h3>\n';
    html += '  <p>';
    social_platforms_present.forEach(platform => {
      html += ` ${escapeHtml(platform)} &nbsp; `;
    });
    html += '</p>\n\n';
  }

  if (socialIssues.length > 0) {
    html += '  <h3>Social Media Issues</h3>\n';
    html += generateIssuesHTML(socialIssues, registry);
  }

  html += '</div>\n\n';
  return html;
}

/**
 * Generate accessibility section
 */
function generateAccessibilityHTML(analysisResult, consolidatedIssues = null, registry = null) {
  // Use consolidated issues if available, otherwise use original issues
  const accessibilityIssues = consolidatedIssues?.filter(i =>
    i.sources?.includes('accessibility')
  ) || analysisResult.accessibility_issues || [];
  
  const { accessibility_score } = analysisResult;

  let html = '<div class="section">\n';
  html += '  <h2>Accessibility (WCAG 2.1 AA)</h2>\n';
  html += `  <p><strong>Score:</strong> ${formatScoreBadge(accessibility_score)}</p>\n\n`;

  if (accessibilityIssues.length === 0) {
    html += '  <p class="text-secondary"> No significant accessibility issues detected. Your site meets WCAG 2.1 AA standards.</p>\n';
  } else {
    html += generateIssuesHTML(accessibilityIssues, registry);
  }

  html += '</div>\n\n';
  return html;
}

/**
 * Generate business intelligence section
 */
function generateBusinessIntelHTML(analysisResult) {
  const { business_intelligence = {} } = analysisResult;

  if (Object.keys(business_intelligence).length === 0) return '';

  let html = '<div class="section">\n';
  html += '  <h2>Business Intelligence</h2>\n';
  html += '  <table>\n';
  html += '    <tr><th>Attribute</th><th>Value</th></tr>\n';

  if (business_intelligence.yearsInBusiness) {
    html += `    <tr><td>Years in Business</td><td>${business_intelligence.yearsInBusiness}</td></tr>\n`;
  }
  if (business_intelligence.employeeCount) {
    html += `    <tr><td>Employee Count</td><td>${escapeHtml(business_intelligence.employeeCount)}</td></tr>\n`;
  }
  if (business_intelligence.priceRange) {
    html += `    <tr><td>Price Range</td><td>${escapeHtml(business_intelligence.priceRange)}</td></tr>\n`;
  }
  if (business_intelligence.budgetIndicator) {
    html += `    <tr><td>Budget Indicator</td><td>${escapeHtml(business_intelligence.budgetIndicator)}</td></tr>\n`;
  }

  html += '  </table>\n';
  html += '</div>\n\n';
  return html;
}

/**
 * Generate lead priority section
 */
function generateLeadPriorityHTML(analysisResult) {
  const {
    lead_priority,
    lead_priority_reasoning,
    priority_tier,
    quality_gap_score,
    budget_score,
    urgency_score,
    industry_fit_score
  } = analysisResult;

  if (!lead_priority) return '';

  let html = '<div class="section">\n';
  html += '  <h2>Lead Priority Assessment</h2>\n';
  html += `  <p><strong>Priority Score:</strong> ${lead_priority}/100</p>\n`;
  if (priority_tier) html += `  <p><strong>Priority Tier:</strong> ${escapeHtml(priority_tier)}</p>\n\n`;

  if (lead_priority_reasoning) {
    html += `  <p class="text-secondary">${escapeHtml(lead_priority_reasoning)}</p>\n\n`;
  }

  // Priority dimensions
  html += '  <h3>Priority Dimensions</h3>\n';
  html += '  <div class="score-grid">\n';

  const dimensions = [
    { title: 'Quality Gap', score: quality_gap_score },
    { title: 'Budget', score: budget_score },
    { title: 'Urgency', score: urgency_score },
    { title: 'Industry Fit', score: industry_fit_score }
  ].filter(d => d.score !== undefined);

  dimensions.forEach(({ title, score }) => {
    const normalizedScore = score * 10; // Convert 0-10 to 0-100 for progress bar
    const scoreClass = getScoreClass(normalizedScore);
    html += `
    <div class="score-card">
      <div class="score-card-header">
        <div class="score-card-title">${title}</div>
        <div class="score-value">${score}/10</div>
      </div>
      <div class="score-bar">
        <div class="score-bar-fill ${scoreClass}" style="width: ${normalizedScore}%"></div>
      </div>
    </div>\n`;
  });

  html += '  </div>\n';
  html += '</div>\n\n';
  return html;
}

/**
 * Generate action plan section
 */
function generateActionPlanHTML(analysisResult, consolidatedIssues = null, registry = null) {
  // Use consolidated issues if available, otherwise combine all original issues
  const allIssues = consolidatedIssues || [
    ...(analysisResult.design_issues_desktop || []),
    ...(analysisResult.design_issues_mobile || []),
    ...(analysisResult.seo_issues || []),
    ...(analysisResult.content_issues || []),
    ...(analysisResult.social_issues || []),
    ...(analysisResult.accessibility_issues || [])
  ];
  
  const { quick_wins = [] } = analysisResult;

  let html = '<div class="section">\n';
  html += '  <h2>Recommended Action Plan</h2>\n\n';

  // Phase 1: Quick Wins
  if (quick_wins.length > 0) {
    html += '  <div class="action-phase">\n';
    html += '    <h3>Phase 1: Quick Wins (Week 1)</h3>\n';
    html += '    <div class="action-phase-meta">\n';
    html += '      <div><strong>Timeline:</strong> 1 week</div>\n';
    html += '      <div><strong>Estimated Time:</strong> ~4 hours</div>\n';
    html += '      <div><strong>Estimated Cost:</strong> $400-600</div>\n';
    html += '    </div>\n';
    html += '    <ul>\n';
    quick_wins.slice(0, 5).forEach(win => {
      html += `      <li><strong>${escapeHtml(win.title)}</strong> - ${escapeHtml(win.impact || '')}</li>\n`;
    });
    html += '    </ul>\n';
    html += '  </div>\n\n';
  }

  // Phase 2: High-Impact Fixes
  const highPriorityIssues = allIssues
    .filter(i => i.priority === 'high' || i.severity === 'critical')
    .slice(0, 5);

  if (highPriorityIssues.length > 0) {
    html += '  <div class="action-phase">\n';
    html += '    <h3>Phase 2: High-Impact Fixes (Month 1)</h3>\n';
    html += '    <div class="action-phase-meta">\n';
    html += '      <div><strong>Timeline:</strong> 1 month</div>\n';
    html += '      <div><strong>Estimated Time:</strong> ~20 hours</div>\n';
    html += '      <div><strong>Estimated Cost:</strong> $2,000-3,000</div>\n';
    html += '    </div>\n';
    html += '    <ul>\n';
    highPriorityIssues.forEach(issue => {
      html += `      <li><strong>${escapeHtml(issue.title)}</strong> - ${escapeHtml(issue.impact || '')}</li>\n`;
    });
    html += '    </ul>\n';
    html += '  </div>\n\n';
  }

  html += '</div>\n\n';
  return html;
}

/**
 * Generate appendix section
 */
function generateAppendixHTML(analysisResult) {
  const {
    seo_analysis_model,
    content_analysis_model,
    desktop_visual_model,
    mobile_visual_model,
    social_analysis_model,
    accessibility_analysis_model,
    analyzed_at,
    analysis_time,
    crawl_metadata = {}
  } = analysisResult;

  let html = '<div class="section">\n';
  html += '  <h2>Appendix</h2>\n\n';

  // AI models used
  html += '  <h3>Analysis Configuration</h3>\n';
  html += '  <table>\n';
  html += '    <tr><th>Module</th><th>Model Used</th></tr>\n';

  const models = {
    'Desktop Visual Analysis': desktop_visual_model,
    'Mobile Visual Analysis': mobile_visual_model,
    'SEO Analysis': seo_analysis_model,
    'Content Analysis': content_analysis_model,
    'Social Media Analysis': social_analysis_model,
    'Accessibility Analysis': accessibility_analysis_model
  };

  Object.entries(models).forEach(([module, model]) => {
    if (model) {
      html += `    <tr><td>${module}</td><td>${escapeHtml(model)}</td></tr>\n`;
    }
  });

  html += '  </table>\n\n';

  // Analysis metadata
  html += '  <h3>Analysis Metadata</h3>\n';
  html += '  <table>\n';
  html += '    <tr><th>Metric</th><th>Value</th></tr>\n';
  if (analyzed_at) {
    const date = new Date(analyzed_at).toLocaleString('en-US');
    html += `    <tr><td>Analyzed At</td><td>${date}</td></tr>\n`;
  }
  if (analysis_time) html += `    <tr><td>Analysis Time</td><td>${(analysis_time / 1000).toFixed(1)}s</td></tr>\n`;
  if (crawl_metadata.pages_crawled) html += `    <tr><td>Pages Crawled</td><td>${crawl_metadata.pages_crawled}</td></tr>\n`;
  if (crawl_metadata.links_found) html += `    <tr><td>Links Found</td><td>${crawl_metadata.links_found}</td></tr>\n`;
  html += '  </table>\n';

  html += '</div>\n\n';
  return html;
}

/**
 * Generate issues HTML
 */
function generateIssuesHTML(issues, registry = null) {
  if (!issues || issues.length === 0) return '';

  // Group by priority (support both priority and severity fields)
  const critical = issues.filter(i => i.priority === 'critical' || i.severity === 'critical');
  const high = issues.filter(i => i.priority === 'high' || i.severity === 'high');
  const medium = issues.filter(i => i.priority === 'medium' || i.severity === 'medium');
  const low = issues.filter(i => i.priority === 'low' || i.severity === 'low');

  let html = '';

  [
    { title: 'Critical Issues', list: critical, severity: 'critical' },
    { title: 'High Priority', list: high, severity: 'high' },
    { title: 'Medium Priority', list: medium, severity: 'medium' },
    { title: 'Low Priority', list: low, severity: 'low' }
  ].forEach(({ title, list, severity }) => {
    if (list.length > 0) {
      html += `  <h3>${title}</h3>\n`;
      list.forEach(issue => {
        html += `  <div class="issue issue-${severity}">\n`;
        html += '    <div class="issue-header">\n';
        html += `      <div class="issue-title">${escapeHtml(issue.title)}</div>\n`;
        html += `      <div class="issue-badge badge-${severity}">${severity.toUpperCase()}</div>\n`;
        html += '    </div>\n';
        if (issue.description) {
          html += `    <div class="issue-content">${escapeHtml(issue.description)}</div>\n`;
        }
        
        // Show consolidated sources if available
        if (issue.sources && issue.sources.length > 0) {
          html += '    <div class="issue-sources">\n';
          html += `      <span class="text-muted">Found in: ${issue.sources.map(s => escapeHtml(s)).join(', ')}</span>\n`;
          html += '    </div>\n';
        }
        
        // Show screenshot references if available
        if (issue.screenshotRefs && issue.screenshotRefs.length > 0 && registry) {
          html += '    <div class="issue-screenshots">\n';
          html += '      <span class="text-muted">Screenshots: ';
          html += issue.screenshotRefs.map(ref => registry.getReference(ref)).join(' ');
          html += '</span>\n';
          html += '    </div>\n';
        }
        
        if (issue.impact || issue.fix) {
          html += '    <div class="issue-meta">\n';
          if (issue.impact) html += `      <div><strong>Impact:</strong> ${escapeHtml(issue.impact)}</div>\n`;
          if (issue.fix) html += `      <div><strong>Fix:</strong> ${escapeHtml(issue.fix)}</div>\n`;
          html += '    </div>\n';
        }
        html += '  </div>\n';
      });
    }
  });

  return html;
}

/**
 * Get score class for styling
 */
function getScoreClass(score) {
  if (score >= 85) return 'score-excellent';
  if (score >= 70) return 'score-good';
  if (score >= 55) return 'score-warning';
  return 'score-poor';
}

/**
 * Format score with badge
 */
function formatScoreBadge(score) {
  const scoreClass = getScoreClass(score);
  const label = score >= 85 ? 'Excellent' : score >= 70 ? 'Good' : score >= 55 ? 'Needs Work' : 'Poor';
  return `<span class="${scoreClass}">${score}/100</span> <span class="text-muted">(${label})</span>`;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  if (typeof text !== 'string') return text;
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

