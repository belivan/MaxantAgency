/**
 * Test Base64 Image Embedding in HTML Reports
 */

import { generateReport, generateReportFilename } from '../analysis-engine/reports/report-generator.js';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testBase64Embedding() {
  console.log('🧪 Testing Base64 Image Embedding in HTML Reports\n');
  console.log('═'.repeat(60));

  // Create a simple test screenshot (1x1 pixel PNG)
  const screenshotDir = join(__dirname, 'screenshots', 'test');
  await mkdir(screenshotDir, { recursive: true });
  
  // Create a tiny 1x1 red pixel PNG (base64 encoded)
  const redPixelPNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
    'base64'
  );
  
  const desktopScreenshotPath = join(screenshotDir, 'test-desktop.png');
  const mobileScreenshotPath = join(screenshotDir, 'test-mobile.png');
  
  await writeFile(desktopScreenshotPath, redPixelPNG);
  await writeFile(mobileScreenshotPath, redPixelPNG);
  
  console.log('✓ Created test screenshot files\n');

  const mockAnalysisResult = {
    company_name: 'Base64 Test Restaurant',
    url: 'https://base64-test-restaurant.com',
    industry: 'restaurant',
    grade: 'B',
    overall_score: 75.5,
    design_score: 80,
    design_score_desktop: 82,
    design_score_mobile: 78,
    seo_score: 70,
    content_score: 75,
    social_score: 77,
    accessibility_score: 68,
    
    design_issues: ['Navigation needs improvement'],
    design_issues_desktop: ['Hero image loads slowly'],
    design_issues_mobile: ['Font size too small on mobile'],
    seo_issues: ['Missing meta descriptions'],
    content_issues: ['CTA not clear'],
    social_issues: ['Broken Instagram link'],
    
    one_liner: 'Good foundation, needs SEO work',
    analysis_summary: 'The website shows promise but needs technical improvements',
    
    // Use the test screenshot paths
    screenshot_desktop_url: desktopScreenshotPath,
    screenshot_mobile_url: mobileScreenshotPath,
    
    analyzed_at: new Date().toISOString()
  };

  try {
    const reportsDir = join(__dirname, 'reports', 'local-test');
    await mkdir(reportsDir, { recursive: true });

    console.log('📝 Generating HTML report with embedded images...\n');

    const htmlReport = await generateReport(mockAnalysisResult, {
      format: 'html',
      sections: ['all']
    });

    const htmlFilename = 'base64-embedded-test.html';
    const htmlPath = join(reportsDir, htmlFilename);
    await writeFile(htmlPath, htmlReport.content, 'utf8');

    console.log('✅ HTML report generated successfully!');
    console.log(`   File: ${htmlFilename}`);
    console.log(`   Size: ${htmlReport.metadata.content_length} bytes`);
    console.log(`   Path: ${htmlPath}\n`);

    // Verify base64 embedding by checking the content
    const htmlContent = await readFile(htmlPath, 'utf8');
    
    const hasDataURI = htmlContent.includes('data:image/png;base64,');
    const hasBase64Data = htmlContent.includes('iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB');
    
    console.log('🔍 Verification:');
    console.log(`   ✓ Contains data URI: ${hasDataURI ? '✅ YES' : '❌ NO'}`);
    console.log(`   ✓ Contains base64 image data: ${hasBase64Data ? '✅ YES' : '❌ NO'}`);
    
    if (hasDataURI && hasBase64Data) {
      console.log('\n✅ Images are embedded as base64 data URIs!');
      console.log('   The HTML report is now fully portable.');
      console.log('   It can be opened on any device without external files.');
    } else {
      console.log('\n⚠️  Images may not be embedded properly.');
    }

    console.log('\n' + '═'.repeat(60));
    console.log('✅ Test complete!\n');
    console.log('You can open the HTML file in a browser to verify:');
    console.log(htmlPath);

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testBase64Embedding().catch(console.error);
