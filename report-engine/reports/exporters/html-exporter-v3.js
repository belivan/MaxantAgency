/**
 * HTML Report Exporter V3 - Modular Edition
 * =========================================
 * Single unified exporter for BOTH preview and full reports
 * Uses modular components for maintainability
 */

import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { ScreenshotRegistry } from '../utils/screenshot-registry.js';
import { compressImageFromFile } from '../utils/image-compressor.js';

// Import CSS
import { generateCSS } from './components/css/base-styles.js';

// Import helpers
import { escapeHtml, formatDate } from './components/utils/helpers.js';

// Import validator
import { validateOrThrow } from './validators/report-data-validator.js';

// Import sections registry for modular rendering
import { getEnabledSections, shouldRenderSection } from './components/sections-registry.js';
import { getReportConfig } from '../../config/report-config.js';
import {
  generateBenchmarkEmptyState,
  generatePerformanceEmptyState,
  generateAccessibilityEmptyState,
  generateBusinessIntelligenceEmptyState,
  generateScreenshotGalleryEmptyState
} from './components/empty-state.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Process screenshots for embedding in report
 * Converts screenshot files to base64 dataURIs
 */
async function processScreenshots(analysisResult, registry) {
  const screenshotData = {
    desktopScreenshot: null,
    mobileScreenshot: null,
    benchmarkDesktopScreenshot: null,
    benchmarkMobileScreenshot: null,
    screenshots: [],
    benchmarkScreenshots: []
  };

  // Homepage screenshots
  if (analysisResult.screenshot_desktop_path && existsSync(analysisResult.screenshot_desktop_path)) {
    try {
      const compressed = await compressImageFromFile(analysisResult.screenshot_desktop_path, { quality: 85 });
      screenshotData.desktopScreenshot = {
        dataUri: compressed.dataUri,
        device: 'desktop'
      };
      screenshotData.screenshots.push(screenshotData.desktopScreenshot);
      registry.register('homepage-desktop', compressed.dataUri);
    } catch (err) {
      console.warn(`⚠️  Failed to process desktop screenshot: ${err.message}`);
    }
  }

  if (analysisResult.screenshot_mobile_path && existsSync(analysisResult.screenshot_mobile_path)) {
    try {
      const compressed = await compressImageFromFile(analysisResult.screenshot_mobile_path, { quality: 85 });
      screenshotData.mobileScreenshot = {
        dataUri: compressed.dataUri,
        device: 'mobile'
      };
      screenshotData.screenshots.push(screenshotData.mobileScreenshot);
      registry.register('homepage-mobile', compressed.dataUri);
    } catch (err) {
      console.warn(`⚠️  Failed to process mobile screenshot: ${err.message}`);
    }
  }

  // Benchmark screenshots
  const benchmark = analysisResult.matched_benchmark;
  if (benchmark) {
    if (benchmark.screenshot_desktop_path && existsSync(benchmark.screenshot_desktop_path)) {
      try {
        const compressed = await compressImageFromFile(benchmark.screenshot_desktop_path, { quality: 85 });
        screenshotData.benchmarkDesktopScreenshot = {
          dataUri: compressed.dataUri,
          device: 'desktop'
        };
        screenshotData.benchmarkScreenshots.push(screenshotData.benchmarkDesktopScreenshot);
        registry.register('benchmark-homepage-desktop', compressed.dataUri);
      } catch (err) {
        console.warn(`⚠️  Failed to process benchmark desktop screenshot: ${err.message}`);
      }
    }

    if (benchmark.screenshot_mobile_path && existsSync(benchmark.screenshot_mobile_path)) {
      try {
        const compressed = await compressImageFromFile(benchmark.screenshot_mobile_path, { quality: 85 });
        screenshotData.benchmarkMobileScreenshot = {
          dataUri: compressed.dataUri,
          device: 'mobile'
        };
        screenshotData.benchmarkScreenshots.push(screenshotData.benchmarkMobileScreenshot);
        registry.register('benchmark-homepage-mobile', compressed.dataUri);
      } catch (err) {
        console.warn(`⚠️  Failed to process benchmark mobile screenshot: ${err.message}`);
      }
    }
  }

  return screenshotData;
}

/**
 * Render appropriate empty state for a section
 * @param {string} sectionId - Section identifier
 * @returns {string} HTML for empty state
 */
function renderEmptyStateForSection(sectionId) {
  const emptyStateMap = {
    'benchmark-comparison-chart': generateBenchmarkEmptyState,
    'performance-metrics': generatePerformanceEmptyState,
    'accessibility-compliance': generateAccessibilityEmptyState,
    'business-intelligence': generateBusinessIntelligenceEmptyState,
    'screenshot-gallery': generateScreenshotGalleryEmptyState
  };

  const generator = emptyStateMap[sectionId];
  return generator ? generator() : '';
}

/**
 * Generate HTML report (preview or full)
 * @param {Object} analysisResult - Complete analysis data
 * @param {Object} synthesisData - AI synthesis results (optional)
 * @param {Object} screenshotData - Pre-processed screenshot data (optional)
 * @param {Object} options - Report options
 * @param {string} options.reportType - 'preview' or 'full' (default: 'full')
 * @returns {Promise<string>} Complete HTML report
 */
export async function generateHTMLReport(analysisResult, synthesisData = {}, screenshotData = null, options = {}) {
  const { reportType = 'full' } = options;

  console.log(`[HTML Exporter V3] 📊 Generating ${reportType} report using modular components...`);

  // VALIDATE DATA BEFORE PROCESSING
  try {
    validateOrThrow(analysisResult);
  } catch (error) {
    console.error('\n❌ Report generation failed - data validation error:');
    console.error(error.message);
    throw error;
  }

  const {
    company_name,
    grade,
    overall_score,
    industry,
    city,
    analyzed_at,
    url
  } = analysisResult;

  // Create screenshot registry
  const registry = new ScreenshotRegistry();

  // Process screenshots if not provided
  if (!screenshotData) {
    screenshotData = await processScreenshots(analysisResult, registry);
  }

  // Load simplified template
  const templatePath = join(__dirname, '../templates/html-template-v3.html');
  let template = await readFile(templatePath, 'utf-8');

  // Inject CSS
  const cssContent = generateCSS();
  template = template.replace('{{STYLES}}', cssContent);

  // Generate report content using modular sections registry
  let htmlContent = '';

  // Start main content wrapper
  htmlContent += '<div class="main-content">\n';
  htmlContent += '  <div class="container">\n';

  // Get enabled sections from config
  const config = getReportConfig();
  const enabledSections = getEnabledSections(config, reportType);

  // Render each section using registry (excluding footer which is rendered separately)
  for (const section of enabledSections) {
    if (section.id === 'footer') continue; // Footer rendered outside container

    // Check if section should render based on data availability
    const shouldRender = shouldRenderSection(section, analysisResult);
    const sectionConfig = config.sections?.[section.id];

    if (!shouldRender && !sectionConfig?.placeholder) {
      // Skip section entirely (no placeholder requested)
      console.log(`[HTML Exporter] Skipping section '${section.id}' - data unavailable, no placeholder`);
      continue;
    }

    if (!shouldRender && sectionConfig?.placeholder) {
      // Show empty state for missing data
      console.log(`[HTML Exporter] Rendering empty state for section '${section.id}'`);
      htmlContent += renderEmptyStateForSection(section.id);
      continue;
    }

    // Render section normally
    try {
      const sectionHtml = section.component(
        analysisResult,
        synthesisData,
        { reportType, screenshotData, registry }
      );

      if (sectionHtml) {
        htmlContent += sectionHtml;
      }
    } catch (error) {
      console.error(`[HTML Exporter] Error rendering section '${section.id}':`, error.message);
      // Optionally show error placeholder
      if (sectionConfig?.placeholder) {
        htmlContent += renderEmptyStateForSection(section.id);
      }
    }
  }

  // Close main content wrapper
  htmlContent += '  </div>\n';
  htmlContent += '</div>\n';

  // Footer (always included, rendered outside container)
  const footerSection = enabledSections.find(s => s.id === 'footer');
  if (footerSection) {
    htmlContent += footerSection.component(analysisResult, synthesisData, { reportType })  ;
  }

  // Replace template placeholders
  const formattedDate = formatDate(analyzed_at);
  let html = template
    .replace(/{{COMPANY_NAME}}/g, escapeHtml(company_name))
    .replace(/{{GRADE}}/g, grade)
    .replace(/{{OVERALL_SCORE}}/g, Math.round(overall_score))
    .replace(/{{INDUSTRY}}/g, escapeHtml(industry || 'Business'))
    .replace(/{{LOCATION}}/g, escapeHtml(city || 'Location'))
    .replace(/{{DATE}}/g, formattedDate)
    .replace(/{{URL}}/g, escapeHtml(url || ''))
    .replace(/{{REPORT_CONTENT}}/g, htmlContent);

  console.log(`[HTML Exporter V3] ✅ ${reportType} report generation complete!`);
  return html;
}

/**
 * Generate preview/concise report
 * @param {Object} analysisResult - Analysis data
 * @param {Object} synthesisData - AI synthesis data
 * @param {Object} screenshotData - Pre-processed screenshots
 * @returns {Promise<string>} HTML report
 */
export async function generateHTMLReportV3(analysisResult, synthesisData = {}, screenshotData = null) {
  return generateHTMLReport(analysisResult, synthesisData, screenshotData, { reportType: 'preview' });
}

/**
 * Generate full/comprehensive report
 * @param {Object} analysisResult - Analysis data
 * @param {Object} synthesisData - AI synthesis data
 * @param {Object} screenshotData - Pre-processed screenshots
 * @returns {Promise<string>} HTML report
 */
export async function generateHTMLReportV3Full(analysisResult, synthesisData = {}, screenshotData = null) {
  return generateHTMLReport(analysisResult, synthesisData, screenshotData, { reportType: 'full' });
}

// Default export
export default generateHTMLReport;
