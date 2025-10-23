/**
 * Debug Screenshot Test
 * 
 * Test Playwright screenshot functionality to see what's failing
 */

import { chromium } from 'playwright';

async function testScreenshot() {
  console.log('\n🔍 Testing Playwright Screenshot...\n');
  
  let browser = null;
  
  try {
    console.log('1. Launching browser...');
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    console.log('✓ Browser launched');

    console.log('\n2. Creating context...');
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    console.log('✓ Context created');

    console.log('\n3. Creating page...');
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    console.log('✓ Page created');

    console.log('\n4. Navigating to https://maksant.com...');
    await page.goto('https://maksant.com', {
      waitUntil: 'load',
      timeout: 30000
    });
    console.log('✓ Navigation complete');

    console.log('\n5. Waiting 5 seconds...');
    await page.waitForTimeout(5000);
    console.log('✓ Wait complete');

    console.log('\n6. Taking screenshot...');
    const screenshot = await page.screenshot({
      fullPage: true,
      type: 'png'
    });
    console.log(`✓ Screenshot captured (${screenshot.length} bytes)`);

    console.log('\n7. Getting HTML content...');
    const html = await page.content();
    console.log(`✓ HTML content length: ${html.length} characters`);

    console.log('\n8. Getting title...');
    const title = await page.title();
    console.log(`✓ Page title: "${title}"`);

    await browser.close();
    console.log('\n✅ All tests passed! Screenshots are working.\n');

  } catch (error) {
    console.log('\n❌ TEST FAILED\n');
    console.error('Error:', error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
    
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        // Ignore
      }
    }
    
    process.exit(1);
  }
}

testScreenshot();
