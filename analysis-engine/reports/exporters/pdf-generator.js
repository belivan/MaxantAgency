/**
 * PDF Report Generator
 * Converts HTML reports to PDF format
 * 
 * Two modes:
 * 1. Automated: Uses Puppeteer (requires `npm install puppeteer`)
 * 2. Manual: Generates instructions for browser/CLI conversion
 */

import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import { pathToFileURL } from 'url';

/**
 * Generate a README with PDF conversion instructions
 */
export async function generatePDFInstructions(htmlPath) {
  const instructions = `
# PDF Report Generation

## Your HTML Report
Location: ${htmlPath}

## How to Convert to PDF

### Method 1: Browser (Easiest)
1. Open the HTML file in Chrome or Edge
2. Press Ctrl+P (or Cmd+P on Mac)
3. Select "Save as PDF" as the destination
4. Click "Save"

**Recommended Settings:**
- Layout: Portrait
- Paper size: A4 or Letter
- Margins: Default
- Background graphics: ON (to show colors/styling)

### Method 2: Command Line (wkhtmltopdf)
Install: https://wkhtmltopdf.org/downloads.html

Then run:
\`\`\`bash
wkhtmltopdf "${htmlPath}" "report.pdf"
\`\`\`

### Method 3: Online Converter
Upload your HTML file to:
- https://www.html2pdf.com/
- https://pdfcrowd.com/
- https://cloudconvert.com/html-to-pdf

## Why Not Automated?
PDF generation requires either:
1. A headless browser (Puppeteer - 300MB+ Chrome download)
2. External CLI tools (wkhtmltopdf - requires installation)
3. Online APIs (costs money per conversion)

For occasional PDF needs, browser printing is fastest and works perfectly!

## Tips for Best PDF Output
- The HTML is already optimized for print
- All images are embedded (base64)
- Styling is print-friendly
- No external dependencies needed
`;

  const readmePath = join(htmlPath, '..', 'HOW-TO-GENERATE-PDF.md');
  await writeFile(readmePath, instructions, 'utf8');
  
  return readmePath;
}

/**
 * Check if wkhtmltopdf is available
 */
export async function checkPDFTools() {
  // This would check for wkhtmltopdf installation
  // For now, return instructions
  return {
    available: false,
    message: 'Use browser Print to PDF for best results. See HOW-TO-GENERATE-PDF.md'
  };
}

/**
 * Generate PDF from HTML using Puppeteer (if available)
 * 
 * @param {string} htmlPath - Path to the HTML file
 * @param {object} options - PDF generation options
 * @returns {Promise<object>} Result with success status and PDF path
 */
export async function generatePDF(htmlPath, options = {}) {
  const {
    outputPath = htmlPath.replace('.html', '.pdf'),
    format = 'A4',
    printBackground = true,
    margin = { top: '20px', right: '20px', bottom: '20px', left: '20px' }
  } = options;

  try {
    // Try to import Puppeteer (lazy loading)
    let puppeteer;
    try {
      puppeteer = await import('puppeteer');
    } catch (error) {
      return {
        success: false,
        method: 'manual',
        message: 'Puppeteer not installed. Use browser Print to PDF instead.',
        instructions_path: await generatePDFInstructions(htmlPath)
      };
    }

    console.log('🚀 Launching headless browser for PDF generation...');
    
    const browser = await puppeteer.default.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // Convert file path to file:// URL
    const fileUrl = pathToFileURL(htmlPath).href;
    console.log(`📄 Loading HTML: ${fileUrl}`);
    
    await page.goto(fileUrl, {
      waitUntil: 'networkidle0'
    });

    console.log('📸 Generating PDF...');
    
    await page.pdf({
      path: outputPath,
      format,
      printBackground,
      margin
    });

    await browser.close();

    console.log(`✅ PDF generated: ${outputPath}`);

    return {
      success: true,
      method: 'automated',
      path: outputPath,
      message: 'PDF generated successfully with embedded images'
    };

  } catch (error) {
    console.error('❌ PDF generation failed:', error.message);
    
    // Fallback to instructions
    return {
      success: false,
      method: 'manual',
      message: `Automated PDF failed: ${error.message}. Use browser Print to PDF instead.`,
      instructions_path: await generatePDFInstructions(htmlPath),
      error: error.message
    };
  }
}

/**
 * Generate PDF from HTML content (not a file)
 * 
 * @param {string} htmlContent - HTML content as string
 * @param {string} outputPath - Where to save the PDF
 * @param {object} options - PDF generation options
 * @returns {Promise<object>} Result with success status and PDF path
 */
export async function generatePDFFromContent(htmlContent, outputPath, options = {}) {
  const {
    format = 'A4',
    printBackground = true,
    margin = { top: '20px', right: '20px', bottom: '20px', left: '20px' }
  } = options;

  try {
    let puppeteer;
    try {
      puppeteer = await import('puppeteer');
    } catch (error) {
      return {
        success: false,
        method: 'manual',
        message: 'Puppeteer not installed. Save HTML first, then use browser Print to PDF.'
      };
    }

    console.log('🚀 Launching headless browser for PDF generation...');
    
    const browser = await puppeteer.default.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    console.log('📄 Setting HTML content...');
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0'
    });

    console.log('📸 Generating PDF...');
    
    await page.pdf({
      path: outputPath,
      format,
      printBackground,
      margin
    });

    await browser.close();

    console.log(`✅ PDF generated: ${outputPath}`);

    return {
      success: true,
      method: 'automated',
      path: outputPath,
      message: 'PDF generated successfully with embedded images'
    };

  } catch (error) {
    console.error('❌ PDF generation failed:', error.message);
    
    return {
      success: false,
      method: 'manual',
      message: `Automated PDF failed: ${error.message}`,
      error: error.message
    };
  }
}
