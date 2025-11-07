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
import { writeFile, stat, readFile } from 'fs/promises';
import { existsSync } from 'fs';

/**
 * Validate that a PDF file is valid and not corrupted
 * @param {string} pdfPath - Path to PDF file
 * @returns {Promise<{valid: boolean, error?: string, size?: number}>}
 */
async function validatePDF(pdfPath) {
  try {
    // Check file exists
    if (!existsSync(pdfPath)) {
      return { valid: false, error: 'PDF file does not exist' };
    }

    // Check file size
    const stats = await stat(pdfPath);
    if (stats.size === 0) {
      return { valid: false, error: 'PDF file is empty (0 bytes)', size: 0 };
    }

    // Check PDF magic bytes (should start with %PDF)
    const buffer = await readFile(pdfPath);
    const header = buffer.slice(0, 4).toString('utf-8');
    if (!header.startsWith('%PDF')) {
      return {
        valid: false,
        error: `Invalid PDF header: expected "%PDF", got "${header}"`,
        size: stats.size
      };
    }

    return { valid: true, size: stats.size };
  } catch (error) {
    return { valid: false, error: `PDF validation error: ${error.message}` };
  }
}

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

    try {
      browser = await chromium.launch({
        headless: true,
        timeout: 30000  // 30 second timeout for browser launch
      });
    } catch (launchError) {
      throw new Error(
        `Failed to launch Chromium browser: ${launchError.message}. ` +
        `This may be due to missing browser installation or insufficient system resources. ` +
        `Try running: npx playwright install chromium`
      );
    }

    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('📄 Setting HTML content...');
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle',  // Wait for network to be idle (better for base64 images)
      timeout: 60000  // Increased timeout for large reports with many images
    });

    // Count total images
    const imageCount = await page.evaluate(() => document.images.length);
    console.log(`📊 Total images in HTML: ${imageCount}`);

    // Wait for all images to be loaded (including base64)
    console.log('⏳ Waiting for all images to load...');
    const imageLoadResults = await page.evaluate(() => {
      return Promise.all(
        Array.from(document.images).map((img, index) => {
          if (img.complete && img.naturalWidth > 0) {
            return Promise.resolve({ index, loaded: true, width: img.naturalWidth, height: img.naturalHeight });
          }
          return new Promise((resolve) => {
            img.addEventListener('load', () => {
              resolve({ index, loaded: true, width: img.naturalWidth, height: img.naturalHeight });
            });
            img.addEventListener('error', () => {
              resolve({ index, loaded: false, error: 'Failed to load image' });
            });
            // Timeout individual images after 10 seconds
            setTimeout(() => {
              resolve({ index, loaded: false, error: 'Image load timeout' });
            }, 10000);
          });
        })
      );
    });

    // Count and report failed images
    const failedImages = imageLoadResults.filter(r => !r.loaded);
    if (failedImages.length > 0) {
      console.warn(`⚠️  ${failedImages.length}/${imageCount} images failed to load`);
    } else {
      console.log(`✅ All ${imageCount} images loaded successfully`);
    }

    // Scroll through page to trigger any remaining lazy-loaded content
    console.log('📜 Scrolling through page to ensure all content loads...');
    await page.evaluate(() => {
      return new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 200; // Increased scroll distance for faster coverage
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            window.scrollTo(0, 0); // Scroll back to top
            setTimeout(resolve, 1000); // Wait 1 second after scrolling
          }
        }, 150); // Slower scrolling for better rendering
      });
    });

    // Additional wait for base64 images to fully decode and render
    // For reports with many images (>10), wait longer
    const waitTime = imageCount > 10 ? 8000 : 4000;
    console.log(`⏳ Waiting ${waitTime}ms for ${imageCount} images to render...`);
    await page.waitForTimeout(waitTime);

    // Verify images are visible in screenshot gallery
    const galleryImageCount = await page.evaluate(() => {
      const gallerySection = document.getElementById('screenshot-gallery');
      return gallerySection ? gallerySection.querySelectorAll('img').length : 0;
    });
    console.log(`✅ Screenshot gallery has ${galleryImageCount} images visible`);

    // Emulate print media to ensure proper CSS rendering
    await page.emulateMedia({ media: 'print' });

    console.log('📸 Generating PDF with headers and footers...');

    // Generate current date string
    const now = new Date();
    const dateString = now.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    // Header template with Minty Design Co branding
    const headerTemplate = `
      <html>
        <head>
          <style>
            body { margin: 0; padding: 0; }
            .pdf-header {
              width: 100%;
              font-size: 9pt;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
              color: #6B7280;
              padding: 10px 24px;
              border-bottom: 2px solid #10B981;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .pdf-header-brand {
              font-weight: 700;
              color: #10B981;
              font-size: 10pt;
              float: left;
            }
            .pdf-header-type {
              font-weight: 500;
              color: #6B7280;
              float: right;
            }
          </style>
        </head>
        <body>
          <div class="pdf-header">
            <span class="pdf-header-brand">Minty Design Co</span>
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
            body { margin: 0; padding: 0; }
            .pdf-footer {
              width: 100%;
              font-size: 8pt;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
              color: #6B7280;
              padding: 10px 24px;
              border-top: 2px solid #10B981;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .pdf-footer-left {
              float: left;
            }
            .pdf-footer-right {
              float: right;
            }
            .pdf-footer-company {
              font-weight: 600;
              color: #18181B;
            }
            .pdf-footer-divider {
              color: #10B981;
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          <div class="pdf-footer">
            <div class="pdf-footer-left">
              <span class="pdf-footer-company">${companyName}</span> <span class="pdf-footer-divider">•</span> Generated: ${dateString}
            </div>
            <div class="pdf-footer-right">
              Page <span class="pageNumber"></span> of <span class="totalPages"></span>
            </div>
          </div>
        </body>
      </html>
    `;

    // Add timeout to PDF generation to prevent hanging
    const pdfPromise = page.pdf({
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

    // Race against timeout (60 seconds for large documents)
    await Promise.race([
      pdfPromise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(
          `PDF generation timeout after 60 seconds. ` +
          `Report may be too large or complex. Consider reducing image sizes or page count.`
        )), 60000)
      )
    ]);

    const generationTime = Date.now() - startTime;

    await browser.close();

    // Validate PDF file was created correctly
    console.log('🔍 Validating generated PDF...');
    const validation = await validatePDF(outputPath);

    if (!validation.valid) {
      console.error(`❌ PDF validation failed: ${validation.error}`);
      return {
        success: false,
        method: 'playwright',
        path: outputPath,
        message: `PDF generation appeared successful but validation failed: ${validation.error}`,
        error: validation.error
      };
    }

    console.log(`✅ PDF generated successfully: ${outputPath}`);
    console.log(`📄 File size: ${(validation.size / 1024 / 1024).toFixed(2)} MB`);
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
        fileSize: validation.size
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
