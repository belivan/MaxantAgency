/**
 * Multi-Page Crawler - Intelligently crawls websites with configurable depth
 *
 * Crawls websites following a depth-based strategy:
 * - Level 0: Homepage (always crawled)
 * - Level 1: Main navigation pages (crawl all)
 * - Level 2+: Sub-pages (sampled based on config)
 *
 * Uses Playwright for page loading and Cheerio for link extraction
 * Respects timeouts, concurrency limits, and sampling rates
 */

import { chromium } from 'playwright';
import * as cheerio from 'cheerio';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SCREENSHOT_DELAY_MS = Number(process.env.SCREENSHOT_DELAY_MS || 5000);

// Load scraper configuration
let config;
try {
  const configPath = join(__dirname, '../config/scraper-config.json');
  config = JSON.parse(readFileSync(configPath, 'utf8'));
} catch (error) {
  console.error('Failed to load scraper-config.json:', error.message);
  // Fallback to default config
  config = {
    crawling: {
      depth: {
        level_1: { sample_rate: 1.0, max_pages: 20 },
        level_2_plus: { sample_rate: 0.5, max_pages: 10 }
      },
      timeouts: {
        page_load_timeout: 30000,
        wait_for_network_idle: true,
        network_idle_timeout: 2000,
        max_crawl_time: 120000
      },
      limits: {
        max_total_pages: 30,
        max_concurrent_pages: 3
      },
      filters: {
        same_domain_only: true,
        exclude_patterns: ['/cart', '/checkout', '/login', '/register', '/account', '/admin', '/wp-admin', '/wp-login', '?add-to-cart=', '?s=', '?p=', '#'],
        exclude_file_types: ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.zip', '.rar', '.mp4', '.mp3', '.doc', '.docx', '.xls', '.xlsx']
      }
    }
  };
}

/**
 * Crawl a website with intelligent depth-based sampling
 *
 * @param {string} baseUrl - Website URL to crawl
 * @param {object} options - Crawl options (overrides config)
 * @returns {Promise<object>} Crawl results with homepage, pages, and metadata
 */
export async function crawlWebsite(baseUrl, options = {}) {
  const startTime = Date.now();
  const normalizedBaseUrl = normalizeUrl(baseUrl);

  const crawlConfig = {
    maxTotalPages: options.maxTotalPages || config.crawling.limits.max_total_pages,
    maxConcurrentPages: options.maxConcurrentPages || config.crawling.limits.max_concurrent_pages,
    maxCrawlTime: options.maxCrawlTime || config.crawling.timeouts.max_crawl_time,
    pageLoadTimeout: options.pageLoadTimeout || config.crawling.timeouts.page_load_timeout,
    waitForNetworkIdle: options.waitForNetworkIdle !== undefined ? options.waitForNetworkIdle : config.crawling.timeouts.wait_for_network_idle,
    level1SampleRate: options.level1SampleRate !== undefined ? options.level1SampleRate : config.crawling.depth.level_1.sample_rate,
    level1MaxPages: options.level1MaxPages || config.crawling.depth.level_1.max_pages,
    level2PlusSampleRate: options.level2PlusSampleRate !== undefined ? options.level2PlusSampleRate : config.crawling.depth.level_2_plus.sample_rate,
    level2PlusMaxPages: options.level2PlusMaxPages || config.crawling.depth.level_2_plus.max_pages
  };

  const results = {
    homepage: null,
    pages: [],
    metadata: {
      totalPagesCrawled: 0,
      totalLinksFound: 0,
      crawlTime: 0,
      sampleRates: {
        level_1: crawlConfig.level1SampleRate,
        level_2_plus: crawlConfig.level2PlusSampleRate
      },
      failedPages: [],
      timedOut: false
    }
  };

  let browser = null;

  try {
    // Launch browser
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    // Step 1: Crawl homepage (Level 0)
    console.log(`Crawling homepage: ${normalizedBaseUrl}`);
    const homepageResult = await crawlPage(browser, normalizedBaseUrl, 0, normalizedBaseUrl, crawlConfig);

    if (!homepageResult.success) {
      throw new Error(`Failed to crawl homepage: ${homepageResult.error}`);
    }

    results.homepage = {
      url: homepageResult.url,
      html: homepageResult.html,
      depth: 0,
      loadTime: homepageResult.loadTime
    };
    results.metadata.totalPagesCrawled = 1;

    // Extract all links from homepage
    const homepageLinks = extractLinks(homepageResult.html, normalizedBaseUrl);
    results.metadata.totalLinksFound = homepageLinks.length;

    // Step 2: Categorize links by depth level
    const linksByDepth = categorizeLinks(homepageLinks, normalizedBaseUrl);

    console.log(`Found ${linksByDepth.level_1.length} level-1 links, ${linksByDepth.level_2_plus.length} level-2+ links`);

    // Step 3: Prepare crawl queue
    const crawlQueue = prepareCrawlQueue(linksByDepth, crawlConfig, normalizedBaseUrl);

    console.log(`Prepared crawl queue: ${crawlQueue.length} pages to crawl`);

    // Step 4: Crawl pages in parallel batches
    const crawledPages = await crawlInBatches(
      browser,
      crawlQueue,
      crawlConfig,
      startTime
    );

    // Add crawled pages to results
    results.pages = crawledPages.filter(p => p.success).map(p => ({
      url: p.url,
      html: p.html,
      depth: p.depth,
      loadTime: p.loadTime,
      discoveredFrom: p.discoveredFrom
    }));

    // Track failed pages
    results.metadata.failedPages = crawledPages
      .filter(p => !p.success)
      .map(p => ({ url: p.url, error: p.error }));

    results.metadata.totalPagesCrawled += results.pages.length;
    results.metadata.crawlTime = Date.now() - startTime;
    results.metadata.timedOut = results.metadata.crawlTime >= crawlConfig.maxCrawlTime;

    console.log(`Crawl complete: ${results.metadata.totalPagesCrawled} pages in ${results.metadata.crawlTime}ms`);

  } catch (error) {
    console.error('Crawl failed:', error.message);
    throw error;

  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        // Ignore close errors
      }
    }
  }

  return results;
}

/**
 * Crawl a single page and return HTML + metadata
 */
async function crawlPage(browser, url, depth, discoveredFrom, crawlConfig) {
  const startTime = Date.now();

  try {
    // Create new context for this page
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();
    page.setDefaultTimeout(crawlConfig.pageLoadTimeout);

    // Navigate to page
    const response = await page.goto(url, {
      waitUntil: crawlConfig.waitForNetworkIdle ? 'networkidle' : 'domcontentloaded',
      timeout: crawlConfig.pageLoadTimeout
    });

    if (!response || !response.ok()) {
      await context.close();
      return {
        success: false,
        url,
        error: `HTTP ${response?.status()} ${response?.statusText()}`,
        depth,
        discoveredFrom
      };
    }

    // Get HTML content
    const html = await page.content();
    const finalUrl = page.url();

    await context.close();

    return {
      success: true,
      url: finalUrl,
      html,
      depth,
      discoveredFrom,
      loadTime: Date.now() - startTime
    };

  } catch (error) {
    return {
      success: false,
      url,
      error: error.message,
      depth,
      discoveredFrom,
      loadTime: Date.now() - startTime
    };
  }
}

/**
 * Extract all links from HTML
 */
function extractLinks(html, baseUrl) {
  const $ = cheerio.load(html);
  const links = new Set();
  const baseDomain = getDomain(baseUrl);

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;

    // Convert relative URLs to absolute
    let absoluteUrl;
    try {
      absoluteUrl = new URL(href, baseUrl).href;
    } catch (e) {
      return; // Invalid URL
    }

    // Apply filters
    if (!shouldCrawlUrl(absoluteUrl, baseDomain)) {
      return;
    }

    // Remove fragment identifiers and trailing slashes
    absoluteUrl = absoluteUrl.split('#')[0].replace(/\/$/, '');

    if (absoluteUrl && absoluteUrl !== baseUrl.replace(/\/$/, '')) {
      links.add(absoluteUrl);
    }
  });

  return Array.from(links);
}

/**
 * Check if URL should be crawled based on filters
 */
function shouldCrawlUrl(url, baseDomain) {
  try {
    const urlObj = new URL(url);

    // Same domain only
    if (config.crawling.filters.same_domain_only) {
      if (getDomain(url) !== baseDomain) {
        return false;
      }
    }

    const pathname = urlObj.pathname.toLowerCase();
    const fullUrl = url.toLowerCase();

    // Exclude patterns
    for (const pattern of config.crawling.filters.exclude_patterns) {
      if (fullUrl.includes(pattern.toLowerCase())) {
        return false;
      }
    }

    // Exclude file types
    for (const fileType of config.crawling.filters.exclude_file_types) {
      if (pathname.endsWith(fileType.toLowerCase())) {
        return false;
      }
    }

    return true;

  } catch (e) {
    return false;
  }
}

/**
 * Categorize links by depth level
 */
function categorizeLinks(links, baseUrl) {
  const basePath = new URL(baseUrl).pathname.replace(/\/$/, '');

  const categorized = {
    level_1: [],
    level_2_plus: []
  };

  for (const link of links) {
    try {
      const linkPath = new URL(link).pathname.replace(/\/$/, '');

      // Calculate depth based on path segments
      const baseSegments = basePath.split('/').filter(Boolean);
      const linkSegments = linkPath.split('/').filter(Boolean);

      // Level 1: One segment deeper than base (or base is /, link has 1 segment)
      const depth = linkSegments.length - baseSegments.length;

      if (depth === 1 || (baseSegments.length === 0 && linkSegments.length === 1)) {
        categorized.level_1.push(link);
      } else {
        categorized.level_2_plus.push(link);
      }

    } catch (e) {
      // Invalid URL, skip
    }
  }

  return categorized;
}

/**
 * Prepare crawl queue with sampling applied
 */
function prepareCrawlQueue(linksByDepth, crawlConfig, baseUrl) {
  const queue = [];

  // Level 1: Apply sample rate and max pages
  const level1Links = sampleLinks(
    linksByDepth.level_1,
    crawlConfig.level1SampleRate,
    crawlConfig.level1MaxPages
  );

  for (const url of level1Links) {
    queue.push({
      url,
      depth: 1,
      discoveredFrom: baseUrl
    });
  }

  // Level 2+: Apply sample rate and max pages
  const level2PlusLinks = sampleLinks(
    linksByDepth.level_2_plus,
    crawlConfig.level2PlusSampleRate,
    crawlConfig.level2PlusMaxPages
  );

  for (const url of level2PlusLinks) {
    queue.push({
      url,
      depth: 2,
      discoveredFrom: baseUrl
    });
  }

  // Respect max total pages limit (subtract 1 for homepage already crawled)
  const maxPages = crawlConfig.maxTotalPages - 1;
  return queue.slice(0, maxPages);
}

/**
 * Sample links based on sample rate and max pages
 */
function sampleLinks(links, sampleRate, maxPages) {
  if (links.length === 0) return [];

  // Apply sample rate
  let sampled;
  if (sampleRate >= 1.0) {
    sampled = [...links];
  } else {
    sampled = links.filter(() => Math.random() < sampleRate);
  }

  // Apply max pages limit
  if (sampled.length > maxPages) {
    // Shuffle and take first N
    sampled = shuffleArray(sampled).slice(0, maxPages);
  }

  return sampled;
}

/**
 * Crawl pages in parallel batches
 */
async function crawlInBatches(browser, queue, crawlConfig, startTime) {
  const results = [];
  const concurrency = crawlConfig.maxConcurrentPages;

  // Split queue into batches
  for (let i = 0; i < queue.length; i += concurrency) {
    // Check if we've exceeded max crawl time
    if (Date.now() - startTime >= crawlConfig.maxCrawlTime) {
      console.log('Max crawl time reached, stopping...');
      break;
    }

    const batch = queue.slice(i, i + concurrency);

    console.log(`Crawling batch ${Math.floor(i / concurrency) + 1}: ${batch.length} pages`);

    // Crawl batch in parallel
    const batchResults = await Promise.allSettled(
      batch.map(item => crawlPage(browser, item.url, item.depth, item.discoveredFrom, crawlConfig))
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
        if (result.value.success) {
          console.log(`✓ Crawled: ${result.value.url} (${result.value.loadTime}ms)`);
        } else {
          console.log(`✗ Failed: ${result.value.url} - ${result.value.error}`);
        }
      } else {
        console.log(`✗ Promise rejected: ${result.reason.message}`);
      }
    }
  }

  return results;
}

/**
 * Get domain from URL
 */
function getDomain(url) {
  try {
    return new URL(url).hostname;
  } catch (e) {
    return null;
  }
}

/**
 * Normalize URL (add protocol if missing)
 */
function normalizeUrl(url) {
  if (!url) throw new Error('URL is required');

  let normalized = url.trim();

  // Add protocol if missing
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'https://' + normalized;
  }

  // Remove trailing slash
  normalized = normalized.replace(/\/$/, '');

  return normalized;
}

/**
 * Shuffle array (Fisher-Yates algorithm)
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Get crawl statistics for a given URL (dry-run analysis)
 *
 * @param {string} url - Website URL to analyze
 * @returns {Promise<object>} Crawl statistics without actually crawling
 */
export async function estimateCrawl(url) {
  const normalizedUrl = normalizeUrl(url);
  let browser = null;

  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });

    const page = await context.newPage();
    page.setDefaultTimeout(config.crawling.timeouts.page_load_timeout);

    await page.goto(normalizedUrl, {
      waitUntil: config.crawling.timeouts.wait_for_network_idle ? 'networkidle' : 'domcontentloaded',
      timeout: config.crawling.timeouts.page_load_timeout
    });

    const html = await page.content();
    await browser.close();

    // Extract and categorize links
    const links = extractLinks(html, normalizedUrl);
    const linksByDepth = categorizeLinks(links, normalizedUrl);

    // Calculate what would be crawled
    const level1Count = Math.min(
      Math.ceil(linksByDepth.level_1.length * config.crawling.depth.level_1.sample_rate),
      config.crawling.depth.level_1.max_pages
    );

    const level2PlusCount = Math.min(
      Math.ceil(linksByDepth.level_2_plus.length * config.crawling.depth.level_2_plus.sample_rate),
      config.crawling.depth.level_2_plus.max_pages
    );

    const totalPages = Math.min(
      1 + level1Count + level2PlusCount,
      config.crawling.limits.max_total_pages
    );

    return {
      totalLinksFound: links.length,
      linksByDepth: {
        level_1: linksByDepth.level_1.length,
        level_2_plus: linksByDepth.level_2_plus.length
      },
      estimatedCrawl: {
        homepage: 1,
        level_1: level1Count,
        level_2_plus: level2PlusCount,
        total: totalPages
      },
      sampleRates: {
        level_1: config.crawling.depth.level_1.sample_rate,
        level_2_plus: config.crawling.depth.level_2_plus.sample_rate
      }
    };

  } catch (error) {
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        // Ignore
      }
    }
    throw error;
  }
}

/**
 * Crawl selected pages with both desktop and mobile screenshots
 * Used by intelligent analysis system for targeted page analysis
 *
 * @param {string} baseUrl - Website base URL
 * @param {array} pageUrls - Array of page URLs to crawl (from AI selection)
 * @param {object} options - Crawl options
 * @returns {Promise<array>} Array of page data with screenshots
 */
export async function crawlSelectedPagesWithScreenshots(baseUrl, pageUrls, options = {}) {
  const {
    timeout = 60000,  // Increased from 30s to 60s for slow websites
    concurrency = 3,  // Parallel contexts within shared browser
    onProgress = null
  } = options;

  console.log(`[Targeted Crawler] Crawling ${pageUrls.length} selected pages for ${baseUrl}...`);

  const startTime = Date.now();
  const results = [];
  let browser = null;

  try {
    // Launch SHARED browser instance for all pages
    // This prevents resource exhaustion from creating browser per page
    console.log('[Targeted Crawler] Launching shared browser...');
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer'
      ]
    });
    
    console.log('[Targeted Crawler] Browser launched successfully');

    // Crawl pages in batches (concurrency control)
    // Each page uses a separate context within the shared browser
    for (let i = 0; i < pageUrls.length; i += concurrency) {
      const batch = pageUrls.slice(i, i + concurrency);

      if (onProgress) {
        onProgress({
          crawled: i,
          total: pageUrls.length,
          message: `Crawling pages ${i + 1}-${Math.min(i + concurrency, pageUrls.length)} of ${pageUrls.length}`
        });
      }

      // Crawl batch in parallel using shared browser with separate contexts
      const batchResults = await Promise.allSettled(
        batch.map(pageUrl => crawlPageWithScreenshots(browser, baseUrl, pageUrl, timeout))
      );

      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        const pageUrl = batch[j];

        if (result.status === 'fulfilled') {
          results.push(result.value);
          console.log(`[Targeted Crawler] ✓ ${result.value.url} (Desktop: ${result.value.screenshots.desktop ? 'captured' : 'failed'}, Mobile: ${result.value.screenshots.mobile ? 'captured' : 'failed'})`);
        } else {
          console.log(`[Targeted Crawler] ✗ Failed ${pageUrl}: ${result.reason.message}`);
          results.push({
            url: normalizeRelativeUrl(pageUrl),
            fullUrl: new URL(pageUrl, baseUrl).href,
            success: false,
            error: result.reason.message,
            html: null,
            screenshots: { desktop: null, mobile: null },
            metadata: {
              timestamp: new Date().toISOString()
            }
          });
        }
      }

      // Small delay between batches to allow browser cleanup
      if (i + concurrency < pageUrls.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

  } catch (error) {
    console.error('[Targeted Crawler] Crawl failed:', error.message);
    throw error;
  } finally {
    // Clean up shared browser
    if (browser) {
      console.log('[Targeted Crawler] Closing shared browser...');
      await browser.close();
    }
  }

  const crawlTime = Date.now() - startTime;
  console.log(`[Targeted Crawler] Complete: ${results.length} pages in ${crawlTime}ms`);

  return results;
}

/**
 * Crawl a single page with both desktop and mobile screenshots
 * Uses shared browser with dedicated contexts to avoid resource exhaustion
 */
async function crawlPageWithScreenshots(sharedBrowser, baseUrl, pageUrl, timeout) {
  const fullUrl = new URL(pageUrl, baseUrl).href;
  const startTime = Date.now();

  // Use shared browser with separate contexts for isolation
  let desktopContext = null;
  let mobileContext = null;

  try {
    // Create desktop context from shared browser
    desktopContext = await sharedBrowser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    const desktopPage = await desktopContext.newPage();
    desktopPage.setDefaultTimeout(timeout);

    // Navigate and screenshot desktop
    const desktopWaitStrategy = await navigateWithFallback(desktopPage, fullUrl, timeout);

    if (SCREENSHOT_DELAY_MS > 0) {
      await desktopPage.waitForTimeout(SCREENSHOT_DELAY_MS);
    }

    // Extract content first (before screenshot to ensure page is ready)
    const htmlContent = await desktopPage.content();
    
    // Capture desktop screenshot
    const desktopScreenshot = await desktopPage.screenshot({
      fullPage: true,
      type: 'png'
    });

    // Clean up desktop context before creating mobile
    await desktopContext.close();
    desktopContext = null;

    // Create mobile context from shared browser
    mobileContext = await sharedBrowser.newContext({
      viewport: { width: 375, height: 812 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
      isMobile: true,
      hasTouch: true
    });

    const mobilePage = await mobileContext.newPage();
    mobilePage.setDefaultTimeout(timeout);

    // Navigate mobile page
    const mobileWaitStrategy = await navigateWithFallback(mobilePage, fullUrl, timeout);

    if (SCREENSHOT_DELAY_MS > 0) {
      await mobilePage.waitForTimeout(SCREENSHOT_DELAY_MS);
    }

    // Capture mobile screenshot
    const mobileScreenshot = await mobilePage.screenshot({
      fullPage: true,
      type: 'png'
    });

    // Clean up mobile context
    await mobileContext.close();
    mobileContext = null;

    const crawlTime = Date.now() - startTime;

    return {
      url: normalizeRelativeUrl(pageUrl),
      fullUrl,
      success: true,
      html: htmlContent,
      htmlContent,
      screenshots: {
        desktop: desktopScreenshot || null,
        mobile: mobileScreenshot || null
      },
      metadata: {
        crawlTime,
        timestamp: new Date().toISOString(),
        strategies: {
          desktop: {
            waitUntil: desktopWaitStrategy,
            postNavigationDelayMs: SCREENSHOT_DELAY_MS
          },
          mobile: {
            waitUntil: mobileWaitStrategy,
            postNavigationDelayMs: SCREENSHOT_DELAY_MS
          }
        }
      }
    };

  } catch (error) {
    // Clean up contexts on error
    if (desktopContext) await desktopContext.close().catch(() => {});
    if (mobileContext) await mobileContext.close().catch(() => {});

    throw new Error(`Failed to crawl ${fullUrl}: ${error.message}`);
  }
}

async function navigateWithFallback(page, url, timeout) {
  const strategies = ['load', 'networkidle', 'domcontentloaded'];

  for (let i = 0; i < strategies.length; i++) {
    const strategy = strategies[i];
    try {
      await page.goto(url, { waitUntil: strategy, timeout });
      if (strategy !== 'load') {
        console.warn(`[Targeted Crawler] ${url} required fallback waitUntil=\"${strategy}\"`);
      }
      return strategy;
    } catch (error) {
      const isLastAttempt = i === strategies.length - 1;
      const isTimeout = error && typeof error.message === 'string' && error.message.includes('Timeout');

      if (!isTimeout || isLastAttempt) {
        throw error;
      }

      console.warn(`[Targeted Crawler] ${url} timed out waiting for \"${strategy}\". Retrying with fallback...`);
    }
  }

  return 'load';
}

function normalizeRelativeUrl(pageUrl) {
  if (!pageUrl) {
    return '/';
  }

  try {
    const urlObject = new URL(pageUrl, 'http://placeholder');
    return urlObject.pathname || '/';
  } catch {
    return pageUrl.startsWith('/') ? pageUrl : `/${pageUrl}`;
  }
}
