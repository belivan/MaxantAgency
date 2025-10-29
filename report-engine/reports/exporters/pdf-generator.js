/**
 * PDF Report Generator using Playwright
 * Converts HTML reports to professional PDF format with headers, footers, and page numbers
 *
 * Features:
 * - Custom headers with branding
 * - Footers with page numbers (Page X of Y)
 * - Optimized for US Letter, Portrait
 * - Preserves colors, shadows, and backgrounds
 * - Supports both Preview and Full report types
 */

import { chromium } from 'playwright';
import { writeFile } from 'fs/promises';

/**
 * Generate PDF from HTML content using Playwright
 *
 * @param {string} htmlContent - Complete HTML content as string
 * @param {string} outputPath - Where to save the PDF file
 * @param {object} options - PDF generation options
 * @returns {Promise<object>} Result with success status, path, and metadata
 */
export async function generatePDFFromContent(htmlContent, outputPath, options = {}) {
  const {
    format = 'Letter',  // US Letter size
    landscape = false,  // Portrait orientation
    printBackground = true,  // Preserve colors and shadows
    displayHeaderFooter = true,  // Show headers and footers
    reportType = 'preview',  // 'preview' or 'full'
    companyName = 'Unknown Company',
    margin = {
      top: '0.8in',     // Space for header
      bottom: '0.8in',  // Space for footer
      left: '0.4in',
      right: '0.4in'
    }
  } = options;

  const startTime = Date.now();
  let browser;

  try {
    console.log('🚀 Launching Chromium browser for PDF generation...');

    browser = await chromium.launch({
      headless: true
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('📄 Setting HTML content...');
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle'
    });

    // Emulate screen media to ensure proper CSS rendering
    await page.emulateMedia({ media: 'print' });

    console.log('📸 Generating PDF with headers and footers...');

    // Generate current date string
    const now = new Date();
    const dateString = now.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    // Header template with branding
    const headerTemplate = `
      <html>
        <head>
          <style>
            .pdf-header {
              width: 100%;
              font-size: 9pt;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              color: #6B7280;
              padding: 8px 24px;
              border-bottom: 1px solid #E5E7EB;
              display: flex;
              justify-content: space-between;
              align-items: center;
              -webkit-print-color-adjust: exact;
            }
            .pdf-header-brand {
              font-weight: 600;
              color: #111827;
            }
            .pdf-header-type {
              font-style: italic;
              color: #9CA3AF;
            }
          </style>
        </head>
        <body>
          <div class="pdf-header">
            <span class="pdf-header-brand">MaxantAgency</span>
            <span class="pdf-header-type">Website Analysis Report</span>
          </div>
        </body>
      </html>
    `;

    // Footer template with page numbers and generation date
    const footerTemplate = `
      <html>
        <head>
          <style>
            .pdf-footer {
              width: 100%;
              font-size: 8pt;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              color: #9CA3AF;
              padding: 8px 24px;
              border-top: 1px solid #E5E7EB;
              display: flex;
              justify-content: space-between;
              align-items: center;
              -webkit-print-color-adjust: exact;
            }
            .pdf-footer-left {
              text-align: left;
            }
            .pdf-footer-right {
              text-align: right;
            }
            .pdf-footer-company {
              font-weight: 500;
              color: #6B7280;
            }
          </style>
        </head>
        <body>
          <div class="pdf-footer">
            <div class="pdf-footer-left">
              <span class="pdf-footer-company">${companyName}</span> • Generated: ${dateString}
            </div>
            <div class="pdf-footer-right">
              Page <span class="pageNumber"></span> of <span class="totalPages"></span>
            </div>
          </div>
        </body>
      </html>
    `;

    await page.pdf({
      path: outputPath,
      format,
      landscape,
      printBackground,
      displayHeaderFooter,
      headerTemplate,
      footerTemplate,
      margin,
      preferCSSPageSize: false
    });

    const generationTime = Date.now() - startTime;

    await browser.close();

    console.log(`✅ PDF generated successfully: ${outputPath}`);
    console.log(`⏱️  Generation time: ${generationTime}ms`);

    return {
      success: true,
      method: 'playwright',
      path: outputPath,
      metadata: {
        format,
        landscape,
        reportType,
        companyName,
        generationTime,
        generatedAt: now.toISOString(),
        fileSize: null  // Could add fs.stat to get file size
      },
      message: `PDF generated successfully in ${generationTime}ms`
    };

  } catch (error) {
    console.error('❌ PDF generation failed:', error.message);

    if (browser) {
      await browser.close();
    }

    return {
      success: false,
      method: 'playwright',
      message: `PDF generation failed: ${error.message}`,
      error: error.message,
      stack: error.stack
    };
  }
}

/**
 * Generate PDF from an HTML file (reads file first)
 *
 * @param {string} htmlPath - Path to HTML file
 * @param {object} options - PDF generation options
 * @returns {Promise<object>} Result with success status and path
 */
export async function generatePDF(htmlPath, options = {}) {
  try {
    const { readFile } = await import('fs/promises');
    const htmlContent = await readFile(htmlPath, 'utf-8');

    const outputPath = options.outputPath || htmlPath.replace('.html', '.pdf');

    return await generatePDFFromContent(htmlContent, outputPath, options);

  } catch (error) {
    console.error('❌ Failed to read HTML file:', error.message);

    return {
      success: false,
      method: 'playwright',
      message: `Failed to read HTML file: ${error.message}`,
      error: error.message
    };
  }
}

/**
 * Quick PDF generation with defaults
 *
 * @param {string} htmlContent - HTML content
 * @param {string} companyName - Company name for footer
 * @param {string} reportType - 'preview' or 'full'
 * @returns {Promise<object>} Result with success and path
 */
export async function quickPDF(htmlContent, companyName, reportType = 'preview') {
  const timestamp = Date.now();
  const outputPath = `report-${companyName.replace(/\s+/g, '-').toLowerCase()}-${reportType}-${timestamp}.pdf`;

  return await generatePDFFromContent(htmlContent, outputPath, {
    companyName,
    reportType
  });
}
