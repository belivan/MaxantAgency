/**
 * Stress Test: Screenshot Reliability
 * 
 * Test screenshot functionality with 5 pages sequentially
 * to ensure consistent reliability
 */

import { crawlSelectedPagesWithScreenshots } from '../scrapers/multi-page-crawler.js';

async function stressTestScreenshots() {
  console.log('\n💪 Stress Test: Screenshot Reliability\n');
  console.log('='.repeat(70));
  
  const baseUrl = 'https://maksant.com';
  const pages = ['/', '/about', '/service', '/blog', '/contacts'];
  
  console.log(`Testing ${pages.length} pages sequentially...`);
  console.log(`Base URL: ${baseUrl}\n`);

  try {
    const startTime = Date.now();
    
    const results = await crawlSelectedPagesWithScreenshots(baseUrl, pages, {
      timeout: 30000,
      concurrency: 1,
      onProgress: (progress) => {
        console.log(`Progress: ${progress.crawled}/${progress.total} pages`);
      }
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n' + '='.repeat(70));
    console.log('📊 Results');
    console.log('='.repeat(70) + '\n');

    let successCount = 0;
    let totalDesktopSize = 0;
    let totalMobileSize = 0;

    results.forEach((result, i) => {
      console.log(`${i + 1}. ${result.url}`);
      console.log(`   Success: ${result.success ? '✅' : '❌'}`);
      
      if (result.success) {
        successCount++;
        const desktopSize = (result.screenshots.desktop.length / 1024).toFixed(0);
        const mobileSize = (result.screenshots.mobile.length / 1024).toFixed(0);
        totalDesktopSize += result.screenshots.desktop.length;
        totalMobileSize += result.screenshots.mobile.length;
        
        console.log(`   Desktop: ${desktopSize}KB, Mobile: ${mobileSize}KB`);
        console.log(`   Title: ${result.metadata.title}`);
        console.log(`   Load Time: ${result.metadata.loadTime}ms`);
      } else {
        console.log(`   Error: ${result.error}`);
      }
      console.log('');
    });

    console.log('='.repeat(70));
    console.log('Summary:');
    console.log(`  Success Rate: ${successCount}/${pages.length} (${((successCount/pages.length)*100).toFixed(1)}%)`);
    console.log(`  Total Desktop Screenshots: ${(totalDesktopSize / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  Total Mobile Screenshots: ${(totalMobileSize / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  Total Duration: ${duration}s`);
    console.log(`  Avg Time per Page: ${(duration / pages.length).toFixed(2)}s`);
    console.log('='.repeat(70) + '\n');

    if (successCount === pages.length) {
      console.log('🎉 Perfect! All screenshots captured successfully!\n');
      process.exit(0);
    } else {
      console.log(`⚠️  ${pages.length - successCount} page(s) failed. Review above.\n`);
      process.exit(1);
    }

  } catch (error) {
    console.log('\n❌ Test failed with error:\n');
    console.error(error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

stressTestScreenshots();
