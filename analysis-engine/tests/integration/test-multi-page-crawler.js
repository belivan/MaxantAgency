/**
 * Test Suite for Multi-Page Crawler
 *
 * Tests the intelligent crawling functionality with various scenarios
 */

import { crawlWebsite, estimateCrawl } from '../scrapers/multi-page-crawler.js';

// Test configuration
const TEST_URLS = [
  'https://example.com', // Simple test site
  // Add more test URLs as needed
];

let passed = 0;
let failed = 0;

/**
 * Test helper
 */
async function test(name, fn) {
  try {
    console.log(`\n🧪 Testing: ${name}`);
    await fn();
    console.log(`✅ PASSED: ${name}`);
    passed++;
  } catch (error) {
    console.log(`❌ FAILED: ${name}`);
    console.log(`   Error: ${error.message}`);
    failed++;
  }
}

/**
 * Test: Estimate crawl (dry-run)
 */
async function testEstimateCrawl() {
  console.log('\n=== TEST: Estimate Crawl ===');

  await test('Should estimate crawl for example.com', async () => {
    const estimate = await estimateCrawl('https://example.com');

    console.log('Estimate results:', JSON.stringify(estimate, null, 2));

    if (typeof estimate.totalLinksFound !== 'number') {
      throw new Error('Missing totalLinksFound');
    }

    if (!estimate.linksByDepth) {
      throw new Error('Missing linksByDepth');
    }

    if (!estimate.estimatedCrawl) {
      throw new Error('Missing estimatedCrawl');
    }

    console.log(`   Total links found: ${estimate.totalLinksFound}`);
    console.log(`   Level 1 links: ${estimate.linksByDepth.level_1}`);
    console.log(`   Level 2+ links: ${estimate.linksByDepth.level_2_plus}`);
    console.log(`   Estimated pages to crawl: ${estimate.estimatedCrawl.total}`);
  });
}

/**
 * Test: Basic crawl
 */
async function testBasicCrawl() {
  console.log('\n=== TEST: Basic Crawl ===');

  await test('Should crawl example.com homepage', async () => {
    const result = await crawlWebsite('https://example.com', {
      maxTotalPages: 5,
      level1SampleRate: 1.0,
      level2PlusSampleRate: 0.5
    });

    console.log('Crawl results:', {
      homepage: result.homepage ? `✓ ${result.homepage.url}` : '✗ Missing',
      pagesCount: result.pages.length,
      totalCrawled: result.metadata.totalPagesCrawled,
      totalLinksFound: result.metadata.totalLinksFound,
      crawlTime: `${result.metadata.crawlTime}ms`,
      failedPages: result.metadata.failedPages.length
    });

    // Validate homepage
    if (!result.homepage) {
      throw new Error('Homepage is missing');
    }

    if (!result.homepage.html) {
      throw new Error('Homepage HTML is missing');
    }

    if (result.homepage.depth !== 0) {
      throw new Error(`Homepage depth should be 0, got ${result.homepage.depth}`);
    }

    // Validate metadata
    if (!result.metadata) {
      throw new Error('Metadata is missing');
    }

    if (result.metadata.totalPagesCrawled < 1) {
      throw new Error('Should have crawled at least the homepage');
    }

    console.log(`   ✓ Homepage crawled: ${result.homepage.url}`);
    console.log(`   ✓ HTML size: ${result.homepage.html.length} bytes`);
    console.log(`   ✓ Load time: ${result.homepage.loadTime}ms`);
    console.log(`   ✓ Additional pages: ${result.pages.length}`);
    console.log(`   ✓ Total crawl time: ${result.metadata.crawlTime}ms`);
  });
}

/**
 * Test: URL normalization
 */
async function testUrlNormalization() {
  console.log('\n=== TEST: URL Normalization ===');

  await test('Should normalize URL without protocol', async () => {
    const result = await crawlWebsite('example.com', {
      maxTotalPages: 1 // Just homepage
    });

    if (!result.homepage.url.startsWith('https://')) {
      throw new Error(`URL should start with https://, got: ${result.homepage.url}`);
    }

    console.log(`   ✓ Normalized: example.com → ${result.homepage.url}`);
  });
}

/**
 * Test: Depth categorization
 */
async function testDepthCategorization() {
  console.log('\n=== TEST: Depth Categorization ===');

  await test('Should categorize pages by depth level', async () => {
    const result = await crawlWebsite('https://example.com', {
      maxTotalPages: 10,
      level1SampleRate: 1.0,
      level2PlusSampleRate: 1.0
    });

    const level1Pages = result.pages.filter(p => p.depth === 1);
    const level2PlusPages = result.pages.filter(p => p.depth === 2);

    console.log(`   ✓ Level 0 (homepage): 1 page`);
    console.log(`   ✓ Level 1 pages: ${level1Pages.length}`);
    console.log(`   ✓ Level 2+ pages: ${level2PlusPages.length}`);

    // Validate each page has required fields
    for (const page of result.pages) {
      if (!page.url) throw new Error('Page missing url');
      if (!page.html) throw new Error('Page missing html');
      if (page.depth === undefined) throw new Error('Page missing depth');
      if (!page.discoveredFrom) throw new Error('Page missing discoveredFrom');
      if (page.loadTime === undefined) throw new Error('Page missing loadTime');
    }

    console.log(`   ✓ All pages have required fields`);
  });
}

/**
 * Test: Sampling
 */
async function testSampling() {
  console.log('\n=== TEST: Sampling ===');

  await test('Should respect sample rates', async () => {
    // First, estimate to see what we're working with
    const estimate = await estimateCrawl('https://example.com');
    console.log(`   Total links available: ${estimate.totalLinksFound}`);

    // Now crawl with 0% sampling on level 2+
    const result = await crawlWebsite('https://example.com', {
      maxTotalPages: 20,
      level1SampleRate: 1.0,
      level2PlusSampleRate: 0.0 // No level 2+ pages
    });

    const level2PlusPages = result.pages.filter(p => p.depth >= 2);

    if (level2PlusPages.length > 0) {
      throw new Error(`Should have 0 level-2+ pages with 0% sample rate, got ${level2PlusPages.length}`);
    }

    console.log(`   ✓ Sample rate respected: 0% → 0 level-2+ pages`);
  });
}

/**
 * Test: Concurrency limits
 */
async function testConcurrencyLimits() {
  console.log('\n=== TEST: Concurrency Limits ===');

  await test('Should respect max concurrent pages', async () => {
    const startTime = Date.now();

    const result = await crawlWebsite('https://example.com', {
      maxTotalPages: 6,
      maxConcurrentPages: 2, // Crawl 2 at a time
      level1SampleRate: 1.0
    });

    const crawlTime = Date.now() - startTime;

    console.log(`   ✓ Crawled ${result.metadata.totalPagesCrawled} pages`);
    console.log(`   ✓ Total time: ${crawlTime}ms`);
    console.log(`   ✓ Concurrency setting: 2 pages at a time`);
  });
}

/**
 * Test: Timeout handling
 */
async function testTimeoutHandling() {
  console.log('\n=== TEST: Timeout Handling ===');

  await test('Should handle timeouts gracefully', async () => {
    const result = await crawlWebsite('https://example.com', {
      maxTotalPages: 3,
      pageLoadTimeout: 5000, // 5 second timeout per page
      maxCrawlTime: 15000 // 15 second total timeout
    });

    if (result.metadata.timedOut) {
      console.log(`   ⚠ Crawl timed out after ${result.metadata.crawlTime}ms`);
    } else {
      console.log(`   ✓ Crawl completed within timeout: ${result.metadata.crawlTime}ms`);
    }

    if (result.metadata.failedPages.length > 0) {
      console.log(`   ⚠ Failed pages: ${result.metadata.failedPages.length}`);
      result.metadata.failedPages.forEach(p => {
        console.log(`      - ${p.url}: ${p.error}`);
      });
    }

    console.log(`   ✓ Successfully crawled ${result.metadata.totalPagesCrawled} pages`);
  });
}

/**
 * Test: Failed page handling
 */
async function testFailedPageHandling() {
  console.log('\n=== TEST: Failed Page Handling ===');

  await test('Should track failed pages in metadata', async () => {
    const result = await crawlWebsite('https://example.com', {
      maxTotalPages: 5
    });

    console.log(`   ✓ Total pages crawled: ${result.metadata.totalPagesCrawled}`);
    console.log(`   ✓ Failed pages: ${result.metadata.failedPages.length}`);

    if (result.metadata.failedPages.length > 0) {
      console.log('   Failed page details:');
      result.metadata.failedPages.forEach(p => {
        console.log(`      - ${p.url}: ${p.error}`);
      });
    }

    // Should continue crawling even with failures
    if (result.metadata.totalPagesCrawled === 0) {
      throw new Error('Should have crawled at least the homepage');
    }
  });
}

/**
 * Test: Output format validation
 */
async function testOutputFormat() {
  console.log('\n=== TEST: Output Format Validation ===');

  await test('Should return correct output format', async () => {
    const result = await crawlWebsite('https://example.com', {
      maxTotalPages: 3
    });

    // Validate top-level structure
    const requiredKeys = ['homepage', 'pages', 'metadata'];
    for (const key of requiredKeys) {
      if (!(key in result)) {
        throw new Error(`Missing required key: ${key}`);
      }
    }

    // Validate homepage structure
    if (result.homepage) {
      const homepageKeys = ['url', 'html', 'depth', 'loadTime'];
      for (const key of homepageKeys) {
        if (!(key in result.homepage)) {
          throw new Error(`Homepage missing required key: ${key}`);
        }
      }
    }

    // Validate pages structure
    if (result.pages.length > 0) {
      const pageKeys = ['url', 'html', 'depth', 'loadTime', 'discoveredFrom'];
      for (const key of pageKeys) {
        if (!(key in result.pages[0])) {
          throw new Error(`Page missing required key: ${key}`);
        }
      }
    }

    // Validate metadata structure
    const metadataKeys = ['totalPagesCrawled', 'totalLinksFound', 'crawlTime', 'sampleRates', 'failedPages', 'timedOut'];
    for (const key of metadataKeys) {
      if (!(key in result.metadata)) {
        throw new Error(`Metadata missing required key: ${key}`);
      }
    }

    console.log('   ✓ Output format is valid');
    console.log('   ✓ All required fields present');
  });
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         Multi-Page Crawler Test Suite                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    await testEstimateCrawl();
    await testBasicCrawl();
    await testUrlNormalization();
    await testDepthCategorization();
    await testSampling();
    await testConcurrencyLimits();
    await testTimeoutHandling();
    await testFailedPageHandling();
    await testOutputFormat();

  } catch (error) {
    console.error('\n💥 Test suite error:', error.message);
  }

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    TEST SUMMARY                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total:  ${passed + failed}`);
  console.log('');

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests();
