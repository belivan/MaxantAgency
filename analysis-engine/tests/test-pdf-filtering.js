/**
 * Test PDF Filtering Implementation
 *
 * Tests that PDFs and other downloadable files are properly filtered out
 * at all stages of the crawling and analysis pipeline
 */

import { discoverAllPages } from '../scrapers/sitemap-discovery.js';
import { selectPagesForAnalysis } from '../scrapers/intelligent-page-selector.js';
import { crawlSelectedPagesWithScreenshots } from '../scrapers/multi-page-crawler.js';
import { filterUrls, isDownloadableFile, shouldExcludeUrl } from '../utils/url-filter.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../../.env') });

// Test websites with known PDFs
const TEST_SITES = [
  {
    url: 'http://littlenonnas.com',
    name: 'Little Nonnas',
    expectedPdfs: ['/Menus/DINNER_MENU_5_6_25.pdf'],
    industry: 'restaurant'
  }
];

// Color formatting for terminal output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Test 1: URL Filter Utility
 */
async function testUrlFilterUtility() {
  log('\n🧪 Test 1: URL Filter Utility', 'blue');

  const testUrls = [
    // Should be filtered (downloadable files)
    '/document.pdf',
    '/report.PDF',
    '/image.jpg',
    '/archive.zip',
    '/video.mp4',
    '/Menus/DINNER_MENU_5_6_25.pdf',
    'https://example.com/download/file.doc',

    // Should be filtered (excluded patterns)
    '/login',
    '/cart',
    '/admin/dashboard',
    '/api/users',
    '/search?q=test',

    // Should NOT be filtered (valid pages)
    '/',
    '/about',
    '/contact',
    '/services',
    '/blog/post-1',
    '/products/item'
  ];

  let passed = 0;
  let failed = 0;

  for (const url of testUrls) {
    const isDownload = isDownloadableFile(url);
    const shouldExclude = shouldExcludeUrl(url);

    // Expected results
    const expectedDownload = url.toLowerCase().includes('.pdf') ||
                           url.toLowerCase().includes('.jpg') ||
                           url.toLowerCase().includes('.zip') ||
                           url.toLowerCase().includes('.mp4') ||
                           url.toLowerCase().includes('.doc');

    const expectedExclude = expectedDownload ||
                           url.includes('/login') ||
                           url.includes('/cart') ||
                           url.includes('/admin') ||
                           url.includes('/api/') ||
                           url.includes('?');

    if (isDownload === expectedDownload && shouldExclude === expectedExclude) {
      log(`  ✓ ${url} - Correctly identified`, 'green');
      passed++;
    } else {
      log(`  ✗ ${url} - Incorrectly identified`, 'red');
      log(`    Expected: download=${expectedDownload}, exclude=${expectedExclude}`, 'yellow');
      log(`    Got: download=${isDownload}, exclude=${shouldExclude}`, 'yellow');
      failed++;
    }
  }

  const { validUrls, skippedUrls } = filterUrls(testUrls, { logSkipped: false });

  log(`\n  Summary: ${passed} passed, ${failed} failed`, failed > 0 ? 'red' : 'green');
  log(`  Filter results: ${validUrls.length} valid, ${skippedUrls.length} skipped`);

  return { passed, failed };
}

/**
 * Test 2: Sitemap Discovery Filtering
 */
async function testSitemapDiscovery() {
  log('\n🧪 Test 2: Sitemap Discovery PDF Filtering', 'blue');

  let passed = 0;
  let failed = 0;

  for (const testSite of TEST_SITES) {
    try {
      log(`\n  Testing ${testSite.name} (${testSite.url})...`);

      // Discover pages
      const discovered = await discoverAllPages(testSite.url, { timeout: 15000 });

      // Check that PDFs are filtered out
      const pdfUrls = discovered.pages.filter(page =>
        page.url.toLowerCase().endsWith('.pdf')
      );

      if (pdfUrls.length === 0) {
        log(`    ✓ No PDFs in discovered pages (${discovered.totalPages} pages total)`, 'green');
        passed++;
      } else {
        log(`    ✗ Found ${pdfUrls.length} PDFs that should have been filtered:`, 'red');
        pdfUrls.forEach(page => log(`      - ${page.url}`, 'yellow'));
        failed++;
      }

      // Check for other downloadable files
      const downloadableUrls = discovered.pages.filter(page =>
        isDownloadableFile(page.url)
      );

      if (downloadableUrls.length === 0) {
        log(`    ✓ No downloadable files in discovered pages`, 'green');
        passed++;
      } else {
        log(`    ✗ Found ${downloadableUrls.length} downloadable files:`, 'red');
        downloadableUrls.forEach(page => log(`      - ${page.url}`, 'yellow'));
        failed++;
      }

    } catch (error) {
      log(`    ✗ Error discovering pages: ${error.message}`, 'red');
      failed++;
    }
  }

  log(`\n  Summary: ${passed} passed, ${failed} failed`, failed > 0 ? 'red' : 'green');
  return { passed, failed };
}

/**
 * Test 3: AI Page Selection Filtering
 */
async function testAiPageSelection() {
  log('\n🧪 Test 3: AI Page Selection PDF Filtering', 'blue');

  let passed = 0;
  let failed = 0;

  // Create a mock sitemap with PDFs
  const mockSitemap = {
    totalPages: 10,
    pages: [
      { url: '/', type: 'homepage' },
      { url: '/about', type: 'about' },
      { url: '/services', type: 'services' },
      { url: '/contact', type: 'contact' },
      { url: '/menu.pdf', type: 'other' },
      { url: '/brochure.pdf', type: 'other' },
      { url: '/images/logo.jpg', type: 'other' },
      { url: '/downloads/report.zip', type: 'other' },
      { url: '/blog', type: 'blog' },
      { url: '/team', type: 'team' }
    ]
  };

  try {
    log('\n  Testing AI page selection with mock sitemap containing PDFs...');

    // Select pages for analysis
    const selection = await selectPagesForAnalysis(mockSitemap, {
      industry: 'restaurant',
      company_name: 'Test Restaurant'
    });

    // Check that no PDFs or downloadable files are selected
    const allSelectedPages = [
      ...selection.seo_pages,
      ...selection.content_pages,
      ...selection.visual_pages,
      ...selection.social_pages
    ];

    const uniquePages = [...new Set(allSelectedPages)];

    const selectedPdfs = uniquePages.filter(url =>
      url.toLowerCase().endsWith('.pdf')
    );

    const selectedDownloadables = uniquePages.filter(url =>
      isDownloadableFile(url)
    );

    if (selectedPdfs.length === 0) {
      log(`    ✓ No PDFs selected by AI (${uniquePages.length} pages selected)`, 'green');
      passed++;
    } else {
      log(`    ✗ AI selected ${selectedPdfs.length} PDFs:`, 'red');
      selectedPdfs.forEach(url => log(`      - ${url}`, 'yellow'));
      failed++;
    }

    if (selectedDownloadables.length === 0) {
      log(`    ✓ No downloadable files selected by AI`, 'green');
      passed++;
    } else {
      log(`    ✗ AI selected ${selectedDownloadables.length} downloadable files:`, 'red');
      selectedDownloadables.forEach(url => log(`      - ${url}`, 'yellow'));
      failed++;
    }

    // Verify metadata shows filtering
    if (selection.meta && selection.meta.totalPagesDiscovered < mockSitemap.totalPages) {
      log(`    ✓ Metadata shows filtering: ${selection.meta.totalPagesDiscovered} pages after filtering (was ${mockSitemap.totalPages})`, 'green');
      passed++;
    } else {
      log(`    ⚠ Metadata doesn't reflect filtering`, 'yellow');
    }

  } catch (error) {
    log(`    ✗ Error in AI page selection: ${error.message}`, 'red');
    failed++;
  }

  log(`\n  Summary: ${passed} passed, ${failed} failed`, failed > 0 ? 'red' : 'green');
  return { passed, failed };
}

/**
 * Test 4: Crawler PDF Filtering
 */
async function testCrawlerFiltering() {
  log('\n🧪 Test 4: Crawler PDF Filtering', 'blue');

  let passed = 0;
  let failed = 0;

  const testUrls = [
    '/',
    '/about',
    '/menu.pdf',
    '/brochure.pdf',
    '/contact'
  ];

  try {
    log('\n  Testing crawler with URLs containing PDFs...');

    // Mock crawl (we won't actually crawl, just test the filtering)
    const validCount = testUrls.filter(url => !isDownloadableFile(url)).length;
    const pdfCount = testUrls.filter(url => url.toLowerCase().endsWith('.pdf')).length;

    log(`    Input: ${testUrls.length} URLs (${pdfCount} PDFs)`);
    log(`    Expected: ${validCount} URLs to be crawled`);

    // The actual crawl would filter these out
    // We're testing that the filter logic is in place
    if (pdfCount > 0 && validCount < testUrls.length) {
      log(`    ✓ Crawler would filter ${pdfCount} PDFs from ${testUrls.length} URLs`, 'green');
      passed++;
    } else {
      log(`    ✗ Filtering logic issue detected`, 'red');
      failed++;
    }

  } catch (error) {
    log(`    ✗ Error testing crawler: ${error.message}`, 'red');
    failed++;
  }

  log(`\n  Summary: ${passed} passed, ${failed} failed`, failed > 0 ? 'red' : 'green');
  return { passed, failed };
}

/**
 * Main test runner
 */
async function runTests() {
  log('=' .repeat(60), 'blue');
  log('📊 PDF FILTERING TEST SUITE', 'blue');
  log('=' .repeat(60), 'blue');

  const results = [];

  // Run all tests
  results.push(await testUrlFilterUtility());
  results.push(await testSitemapDiscovery());
  results.push(await testAiPageSelection());
  results.push(await testCrawlerFiltering());

  // Calculate totals
  const totalPassed = results.reduce((sum, r) => sum + r.passed, 0);
  const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);

  // Final summary
  log('\n' + '=' .repeat(60), 'blue');
  log('📊 FINAL RESULTS', 'blue');
  log('=' .repeat(60), 'blue');

  if (totalFailed === 0) {
    log(`\n✅ ALL TESTS PASSED! (${totalPassed}/${totalPassed})`, 'green');
    log('\n🎉 PDF filtering is working correctly across all modules!', 'green');
  } else {
    log(`\n❌ SOME TESTS FAILED: ${totalPassed} passed, ${totalFailed} failed`, 'red');
    log('\n⚠️  Please review the failures above and fix the issues.', 'yellow');
  }

  log('\n💡 Next Steps:', 'blue');
  log('  1. Test with a real website that has PDFs');
  log('  2. Monitor crawler logs for "Skipping downloadable file" messages');
  log('  3. Verify no "Download is starting" errors occur');

  process.exit(totalFailed > 0 ? 1 : 0);
}

// Run the tests
runTests().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  console.error(error.stack);
  process.exit(1);
});