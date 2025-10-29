/**
 * HTML Report Exporter V2 - Business-First Design
 * ================================================
 * Generates executive-focused HTML reports with the new structure:
 * 1. Executive Dashboard (one-page summary)
 * 2. Strategic Overview (business narrative)
 * 3. Priority Actions (consolidated issues)
 * 4. Implementation Roadmap (phased timeline)
 * 5. Technical Appendix (metadata only)
 *
 * Features synthesis-first design with AI-powered insights.
 * For detailed technical findings, use V1 exporter (html-exporter.js)
 */

import { readFile } from 'fs/promises';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join, isAbsolute } from 'path';
import { existsSync } from 'fs';
import { ScreenshotRegistry } from '../utils/screenshot-registry.js';
import { compressImageFromFile, compressImageFromDataUri } from '../utils/image-compressor.js';

// Import new section generators
import { generateExecutiveDashboard } from '../templates/sections/executive-dashboard.js';
import { generateStrategicOverview } from '../templates/sections/strategic-overview.js';
import { generatePriorityActions } from '../templates/sections/priority-actions.js';
import { generateImplementationRoadmap } from '../templates/sections/implementation-roadmap.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Generate HTML report with new business-first structure
 * @param {Object} analysisResult - Complete analysis data
 * @param {Object} synthesisData - AI synthesis results (REQUIRED)
 * @returns {string} Complete HTML report
 */
export async function generateHTMLReportV2(analysisResult, synthesisData) {
  // Validate synthesis data
  if (!synthesisData || !synthesisData.consolidatedIssues) {
    console.warn('[HTML Exporter V2] ⚠️ Synthesis data is required for new report format');
    console.log('[HTML Exporter V2] Falling back to synthesis-less mode with reduced functionality');
  }

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

  // Load HTML template
  const templatePath = join(__dirname, '../templates/html-template-v2.html');
  const template = await readFile(templatePath, 'utf-8');

  // Create screenshot registry for evidence linking
  const registry = new ScreenshotRegistry();

  // Process screenshots
  const screenshotData = await processScreenshots(
    analysisResult,
    registry
  );

  // Generate HTML content with new structure
  const htmlContent = await generateHTMLContent(
    analysisResult,
    synthesisData,
    registry,
    screenshotData
  );

  // Format date
  const date = new Date(analyzed_at || Date.now());
  const formattedDate = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Replace template variables
  let html = template
    .replace(/{{COMPANY_NAME}}/g, escapeHtml(company_name))
    .replace(/{{GRADE}}/g, grade)
    .replace(/{{OVERALL_SCORE}}/g, overall_score)
    .replace(/{{INDUSTRY}}/g, escapeHtml(industry || 'Not specified'))
    .replace(/{{LOCATION}}/g, escapeHtml(city || 'Not specified'))
    .replace(/{{DATE}}/g, formattedDate)
    .replace(/{{GENERATED_DATE}}/g, date.toLocaleString('en-US'))
    .replace(/{{REPORT_CONTENT}}/g, htmlContent);

  return html;
}

/**
 * Generate HTML content with new section structure
 */
async function generateHTMLContent(analysisResult, synthesisData, registry, screenshotData) {
  let content = '';

  // ==========================================
  // 1. EXECUTIVE DASHBOARD (Page 1)
  // ==========================================
  console.log('[HTML Exporter V2] 📊 Generating Executive Dashboard...');
  content += generateExecutiveDashboard(analysisResult, synthesisData);

  // ==========================================
  // 2. STRATEGIC OVERVIEW
  // ==========================================
  console.log('[HTML Exporter V2] 🎯 Generating Strategic Overview...');
  content += generateStrategicOverview(analysisResult, synthesisData);

  // ==========================================
  // 3. PRIORITY ACTIONS
  // ==========================================
  console.log('[HTML Exporter V2] 🔴 Generating Priority Actions...');
  content += generatePriorityActions(analysisResult, synthesisData, registry);

  // ==========================================
  // 4. IMPLEMENTATION ROADMAP
  // ==========================================
  console.log('[HTML Exporter V2] 📅 Generating Implementation Roadmap...');
  content += generateImplementationRoadmap(analysisResult, synthesisData);

  // ==========================================
  // NOTE: Detailed Findings section removed
  // ==========================================
  // The executive report focuses on business impact and prioritized actions.
  // Technical details are consolidated in the Priority Actions section above.
  // For technical deep-dive reports, use the V1 exporter (html-exporter.js)

  // ==========================================
  // 5. SCREENSHOTS APPENDIX
  // ==========================================
  if (registry && registry.getCount() > 0) {
    console.log('[HTML Exporter V2] 📸 Adding Screenshots Appendix...');
    content += registry.generateAppendixHTML();
  }

  // ==========================================
  // 6. TECHNICAL APPENDIX (Simplified)
  // ==========================================
  console.log('[HTML Exporter V2] 📎 Adding Technical Appendix...');
  content += generateSimplifiedAppendix(analysisResult, synthesisData);

  return content;
}

/**
 * Generate simplified technical appendix for executive reports
 */
function generateSimplifiedAppendix(analysisResult, synthesisData) {
  const {
    analyzed_at,
    pages_analyzed,
    analysis_time,
    crawl_metadata
  } = analysisResult;

  let html = '<div class="section appendix" id="technical-appendix">\n';
  html += '  <h2>📎 Technical Appendix</h2>\n';
  html += '  <p class="section-intro">Analysis metadata and report generation details.</p>\n\n';

  // Analysis Details
  html += '  <div class="appendix-grid">\n';
  
  // Report Generation
  html += '    <div class="appendix-card">\n';
  html += '      <h3>📄 Report Information</h3>\n';
  html += '      <table class="appendix-table">\n';
  html += '        <tr><td>Report Type</td><td>Executive Website Audit</td></tr>\n';
  html += '        <tr><td>Report Version</td><td>V2 - Business-First</td></tr>\n';
  html += '        <tr><td>Generated</td><td>' + new Date().toLocaleString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true 
  }) + '</td></tr>\n';
  
  if (synthesisData && synthesisData.consolidatedIssues) {
    html += '        <tr><td>AI Synthesis</td><td>✓ Enabled (' + synthesisData.consolidatedIssues.length + ' consolidated issues)</td></tr>\n';
  } else {
    html += '        <tr><td>AI Synthesis</td><td>Fallback Mode</td></tr>\n';
  }
  
  html += '      </table>\n';
  html += '    </div>\n';

  // Analysis Scope
  html += '    <div class="appendix-card">\n';
  html += '      <h3>🔍 Analysis Scope</h3>\n';
  html += '      <table class="appendix-table">\n';
  
  if (analyzed_at) {
    const analyzeDate = new Date(analyzed_at);
    if (!isNaN(analyzeDate.getTime())) {
      html += '        <tr><td>Analyzed On</td><td>' + analyzeDate.toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      }) + '</td></tr>\n';
    }
  }
  
  const pagesCount = pages_analyzed || crawl_metadata?.pages_analyzed || crawl_metadata?.pages_crawled || 'Multiple';
  html += '        <tr><td>Pages Analyzed</td><td>' + pagesCount + '</td></tr>\n';
  
  if (analysis_time && !isNaN(analysis_time)) {
    const minutes = Math.floor(analysis_time / 60);
    const seconds = Math.round(analysis_time % 60);
    html += '        <tr><td>Analysis Duration</td><td>' + (minutes > 0 ? minutes + 'm ' : '') + seconds + 's</td></tr>\n';
  }
  
  html += '        <tr><td>Analysis Modules</td><td>Design, SEO, Content, Social, Accessibility</td></tr>\n';
  html += '      </table>\n';
  html += '    </div>\n';
  html += '  </div>\n\n';

  // Footer
  html += '  <div class="report-footer">\n';
  html += '    <p><strong>MaxantAgency Analysis Engine</strong> • Powered by AI-driven insights</p>\n';
  html += '    <p class="text-secondary">This report provides strategic recommendations based on industry best practices and proven conversion optimization techniques.</p>\n';
  html += '  </div>\n';

  html += '</div>\n\n';

  return html;
}

/**
 * Process and embed screenshots
 */
async function processScreenshots(analysisResult, registry) {
  const {
    screenshot_desktop_url,
    screenshot_mobile_url,
    crawl_metadata
  } = analysisResult;

  let desktopScreenshotSrc = null;
  let mobileScreenshotSrc = null;
  let desktopScreenshotId = null;
  let mobileScreenshotId = null;

  // Convert screenshot paths to base64
  const toBase64DataURI = async (value) => {
    if (!value || typeof value !== 'string') return null;
    const trimmed = value.trim();

    if (trimmed.startsWith('data:')) {
      return trimmed;
    }

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }

    const filePath = trimmed.startsWith('file://') ?
      trimmed.replace('file://', '') : trimmed;

    const absolutePath = isAbsolute(filePath) ?
      filePath : join(process.cwd(), filePath);

    if (!existsSync(absolutePath)) {
      console.warn(`[HTML Exporter V2] Screenshot file not found: ${absolutePath}`);
      return null;
    }

    try {
      console.log(`[HTML Exporter V2] Compressing screenshot: ${absolutePath}`);
      const compressedDataUri = await compressImageFromFile(absolutePath, {
        maxWidth: 1200,
        quality: 85  // Changed from 0.85 to integer percentage
      });

      const sizeKB = Math.round(compressedDataUri.length / 1024);
      console.log(`[HTML Exporter V2] ✓ Compressed to ${sizeKB}KB`);

      return compressedDataUri;
    } catch (error) {
      console.error('[HTML Exporter V2] Failed to compress screenshot:', error);
      return null;
    }
  };

  // Process desktop screenshot
  if (screenshot_desktop_url) {
    desktopScreenshotSrc = await toBase64DataURI(screenshot_desktop_url);
    if (desktopScreenshotSrc) {
      desktopScreenshotId = registry.addScreenshot({
        id: 'desktop-main',
        url: '/',
        title: 'Desktop Homepage',
        type: 'desktop',
        dataUri: desktopScreenshotSrc
      });
    }
  }

  // Process mobile screenshot
  if (screenshot_mobile_url) {
    mobileScreenshotSrc = await toBase64DataURI(screenshot_mobile_url);
    if (mobileScreenshotSrc) {
      mobileScreenshotId = registry.addScreenshot({
        id: 'mobile-main',
        url: '/',
        title: 'Mobile Homepage',
        type: 'mobile',
        dataUri: mobileScreenshotSrc
      });
    }
  }

  // Process additional screenshots from crawl
  if (crawl_metadata && crawl_metadata.successful_pages) {
    for (const page of crawl_metadata.successful_pages) {
      if (page.screenshots) {
        for (const [device, screenshotPath] of Object.entries(page.screenshots)) {
          if (screenshotPath && typeof screenshotPath === 'string') {
            const dataUri = await toBase64DataURI(screenshotPath);
            if (dataUri) {
              registry.addScreenshot({
                id: `${device}-${page.path || 'page'}`,
                url: page.url,
                title: page.title || 'Page',
                type: device,
                dataUri: dataUri
              });
            }
          }
        }
      }
    }
  }

  return {
    desktopScreenshotSrc,
    mobileScreenshotSrc,
    desktopScreenshotId,
    mobileScreenshotId
  };
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

// Also export original function name for backward compatibility
export { generateHTMLReportV2 as generateHTMLReport };

export default generateHTMLReportV2;