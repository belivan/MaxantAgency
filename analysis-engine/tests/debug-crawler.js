/**
 * Debug Crawler Test
 * 
 * Test the crawlSelectedPagesWithScreenshots function directly
 */

import { crawlSelectedPagesWithScreenshots } from '../scrapers/multi-page-crawler.js';

async function testCrawler() {
  console.log('\n🔍 Testing crawlSelectedPagesWithScreenshots...\n');
  
  const baseUrl = 'https://maksant.com';
  const pageUrls = ['/', '/about'];
  
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Pages to crawl: ${JSON.stringify(pageUrls)}\n`);
  
  try {
    const results = await crawlSelectedPagesWithScreenshots(baseUrl, pageUrls, {
      timeout: 30000,
      concurrency: 1  // Test with sequential execution
    });
    
    console.log('\n📊 Results:\n');
    for (const result of results) {
      console.log(`\nPage: ${result.url}`);
      console.log(`  Full URL: ${result.fullUrl}`);
      console.log(`  Success: ${result.success}`);
      console.log(`  Error: ${result.error || 'none'}`);
      console.log(`  Desktop screenshot: ${result.screenshots?.desktop ? result.screenshots.desktop.length + ' bytes' : 'NULL'}`);
      console.log(`  Mobile screenshot: ${result.screenshots?.mobile ? result.screenshots.mobile.length + ' bytes' : 'NULL'}`);
      console.log(`  HTML length: ${result.html?.length || 0}`);
      console.log(`  Title: ${result.metadata?.title || 'none'}`);
    }
    
    const successCount = results.filter(r => r.success).length;
    console.log(`\n${successCount}/${results.length} pages crawled successfully\n`);
    
    if (successCount === 0) {
      console.log('❌ All pages failed!\n');
      process.exit(1);
    } else {
      console.log('✅ Test passed!\n');
      process.exit(0);
    }
    
  } catch (error) {
    console.log('\n❌ TEST FAILED\n');
    console.error('Error:', error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

testCrawler();
