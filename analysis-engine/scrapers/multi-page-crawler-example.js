/**
 * Multi-Page Crawler - Usage Examples
 *
 * Demonstrates how to use the multi-page crawler in different scenarios
 */

import { crawlWebsite, estimateCrawl } from './multi-page-crawler.js';

/**
 * Example 1: Basic crawl with default settings
 */
async function example1_basicCrawl() {
  console.log('\n=== Example 1: Basic Crawl ===\n');

  const result = await crawlWebsite('https://example.com');

  console.log('Homepage:', result.homepage.url);
  console.log('Pages crawled:', result.metadata.totalPagesCrawled);
  console.log('Links found:', result.metadata.totalLinksFound);
  console.log('Crawl time:', result.metadata.crawlTime + 'ms');

  // Access individual pages
  result.pages.forEach(page => {
    console.log(`  - ${page.url} (depth: ${page.depth}, ${page.loadTime}ms)`);
  });
}

/**
 * Example 2: Estimate before crawling
 */
async function example2_estimateCrawl() {
  console.log('\n=== Example 2: Estimate Crawl ===\n');

  const estimate = await estimateCrawl('https://example.com');

  console.log('Total links found:', estimate.totalLinksFound);
  console.log('Level 1 links:', estimate.linksByDepth.level_1);
  console.log('Level 2+ links:', estimate.linksByDepth.level_2_plus);
  console.log('Estimated pages to crawl:', estimate.estimatedCrawl.total);
  console.log('Sample rates:', estimate.sampleRates);
}

/**
 * Example 3: Custom crawl settings
 */
async function example3_customSettings() {
  console.log('\n=== Example 3: Custom Settings ===\n');

  const result = await crawlWebsite('https://example.com', {
    maxTotalPages: 10,           // Crawl up to 10 pages total
    maxConcurrentPages: 5,       // Crawl 5 pages at a time
    level1SampleRate: 1.0,       // Crawl ALL level-1 pages
    level2PlusSampleRate: 0.3,   // Crawl 30% of level-2+ pages
    pageLoadTimeout: 15000,      // 15 second timeout per page
    maxCrawlTime: 60000          // 1 minute total timeout
  });

  console.log('Pages crawled:', result.metadata.totalPagesCrawled);
  console.log('Sample rates used:', result.metadata.sampleRates);
}

/**
 * Example 4: Fast shallow crawl (homepage + main nav only)
 */
async function example4_shallowCrawl() {
  console.log('\n=== Example 4: Shallow Crawl (Main Nav Only) ===\n');

  const result = await crawlWebsite('https://example.com', {
    maxTotalPages: 20,
    level1SampleRate: 1.0,     // Get all main nav pages
    level2PlusSampleRate: 0.0, // Skip sub-pages entirely
    waitForNetworkIdle: false  // Don't wait for network idle (faster)
  });

  console.log('Homepage + main navigation pages crawled');
  console.log('Total pages:', result.metadata.totalPagesCrawled);

  const level1Pages = result.pages.filter(p => p.depth === 1);
  console.log('Main navigation pages:');
  level1Pages.forEach(page => {
    console.log(`  - ${page.url}`);
  });
}

/**
 * Example 5: Deep crawl with high sampling
 */
async function example5_deepCrawl() {
  console.log('\n=== Example 5: Deep Crawl ===\n');

  const result = await crawlWebsite('https://example.com', {
    maxTotalPages: 50,
    level1SampleRate: 1.0,
    level2PlusSampleRate: 0.8, // Crawl 80% of sub-pages
    maxConcurrentPages: 3
  });

  console.log('Deep crawl completed');
  console.log('Total pages:', result.metadata.totalPagesCrawled);

  // Analyze crawl results
  const byDepth = {};
  result.pages.forEach(page => {
    byDepth[page.depth] = (byDepth[page.depth] || 0) + 1;
  });

  console.log('Pages by depth:');
  console.log('  Level 0 (homepage):', 1);
  Object.keys(byDepth).sort().forEach(depth => {
    console.log(`  Level ${depth}:`, byDepth[depth]);
  });
}

/**
 * Example 6: Error handling
 */
async function example6_errorHandling() {
  console.log('\n=== Example 6: Error Handling ===\n');

  try {
    const result = await crawlWebsite('https://example.com', {
      maxTotalPages: 10
    });

    if (result.metadata.failedPages.length > 0) {
      console.log('Some pages failed to crawl:');
      result.metadata.failedPages.forEach(page => {
        console.log(`  ✗ ${page.url}: ${page.error}`);
      });
    }

    if (result.metadata.timedOut) {
      console.log('⚠ Warning: Crawl timed out');
    }

    console.log('Successfully crawled pages:', result.metadata.totalPagesCrawled);

  } catch (error) {
    console.error('Crawl failed:', error.message);
  }
}

/**
 * Example 7: Extract specific data from crawled pages
 */
async function example7_extractData() {
  console.log('\n=== Example 7: Extract Data from Crawled Pages ===\n');

  const result = await crawlWebsite('https://example.com', {
    maxTotalPages: 10
  });

  // Example: Extract titles from all crawled pages
  const titles = [];

  // Homepage title
  const homepageTitleMatch = result.homepage.html.match(/<title>(.*?)<\/title>/i);
  if (homepageTitleMatch) {
    titles.push({
      url: result.homepage.url,
      title: homepageTitleMatch[1]
    });
  }

  // Other pages
  result.pages.forEach(page => {
    const titleMatch = page.html.match(/<title>(.*?)<\/title>/i);
    if (titleMatch) {
      titles.push({
        url: page.url,
        title: titleMatch[1]
      });
    }
  });

  console.log('Page titles:');
  titles.forEach(item => {
    console.log(`  ${item.title} (${item.url})`);
  });
}

/**
 * Example 8: Use with html-parser
 */
async function example8_withHtmlParser() {
  console.log('\n=== Example 8: Combine with HTML Parser ===\n');

  // Note: This requires the html-parser module
  // import { parseHTML } from './html-parser.js';

  const result = await crawlWebsite('https://example.com', {
    maxTotalPages: 5
  });

  console.log('Crawled pages ready for parsing:');
  console.log(`  Homepage: ${result.homepage.html.length} bytes`);

  result.pages.forEach((page, index) => {
    console.log(`  Page ${index + 1}: ${page.url} - ${page.html.length} bytes`);
  });

  // You can now pass each page's HTML to parseHTML()
  // const parsedHomepage = parseHTML(result.homepage.html, result.homepage.url);
  // console.log('Parsed data:', parsedHomepage);
}

/**
 * Run specific example
 */
async function runExample(exampleNumber) {
  const examples = {
    1: example1_basicCrawl,
    2: example2_estimateCrawl,
    3: example3_customSettings,
    4: example4_shallowCrawl,
    5: example5_deepCrawl,
    6: example6_errorHandling,
    7: example7_extractData,
    8: example8_withHtmlParser
  };

  const exampleFn = examples[exampleNumber];

  if (!exampleFn) {
    console.log('Available examples:');
    console.log('  1. Basic Crawl');
    console.log('  2. Estimate Crawl');
    console.log('  3. Custom Settings');
    console.log('  4. Shallow Crawl (Main Nav Only)');
    console.log('  5. Deep Crawl');
    console.log('  6. Error Handling');
    console.log('  7. Extract Data');
    console.log('  8. Use with HTML Parser');
    console.log('\nUsage: node multi-page-crawler-example.js [example-number]');
    return;
  }

  try {
    await exampleFn();
  } catch (error) {
    console.error('Example failed:', error.message);
    console.error(error.stack);
  }
}

// Run example from command line argument
const exampleNumber = parseInt(process.argv[2] || '1');
runExample(exampleNumber);
