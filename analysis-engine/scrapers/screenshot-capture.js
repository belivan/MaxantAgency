/**
 * Screenshot Capture - Uses Playwright to capture website screenshots
 *
 * Captures full-page screenshots for design analysis
 * Handles viewport configuration, timeouts, and error cases
 */

import { chromium } from 'playwright';

/**
 * Capture screenshot and HTML of a website
 *
 * @param {string} url - Website URL to capture
 * @param {object} options - Capture options
 * @param {number} options.timeout - Page load timeout in ms (default: 30000)
 * @param {boolean} options.fullPage - Capture full page or just viewport (default: true)
 * @param {object} options.viewport - Viewport size (default: 1920x1080)
 * @param {boolean} options.waitForNetworkIdle - Wait for network idle (default: true)
 * @returns {Promise<object>} Screenshot data and metadata
 */
export async function captureWebsite(url, options = {}) {
  const {
    timeout = 30000,
    fullPage = true,
    viewport = { width: 1920, height: 1080 },
    waitForNetworkIdle = true
  } = options;

  let browser = null;
  let startTime = Date.now();

  try {
    // Normalize URL
    const normalizedUrl = normalizeUrl(url);

    // Launch browser
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    // Create context and page
    const context = await browser.newContext({
      viewport,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();

    // Set timeout
    page.setDefaultTimeout(timeout);

    // Navigate to page
    const response = await page.goto(normalizedUrl, {
      waitUntil: waitForNetworkIdle ? 'networkidle' : 'domcontentloaded',
      timeout
    });

    // Check if page loaded successfully
    if (!response || !response.ok()) {
      throw new Error(`Page failed to load: ${response?.status()} ${response?.statusText()}`);
    }

    // Get page load time
    const pageLoadTime = Date.now() - startTime;

    // Wait a moment for animations/dynamic content
    await page.waitForTimeout(1000);

    // Capture screenshot
    const screenshot = await page.screenshot({
      fullPage,
      type: 'png'
    });

    // Get HTML content
    const html = await page.content();

    // Get page metadata
    const metadata = await extractPageMetadata(page);

    // Get tech stack hints
    const techStack = await detectTechStack(page);

    // Check mobile-friendliness
    const isMobileFriendly = await checkMobileFriendly(page);

    // Get final URL (in case of redirects)
    const finalUrl = page.url();

    await browser.close();

    return {
      success: true,
      url: finalUrl,
      screenshot,
      html,
      metadata,
      techStack,
      isMobileFriendly,
      pageLoadTime,
      capturedAt: new Date().toISOString(),
      viewport,

      _meta: {
        screenshotSize: screenshot.length,
        htmlSize: html.length,
        redirected: finalUrl !== normalizedUrl
      }
    };

  } catch (error) {
    console.error('Screenshot capture failed:', error.message);

    return {
      success: false,
      url,
      error: error.message,
      screenshot: null,
      html: null,
      metadata: null,
      techStack: null,
      isMobileFriendly: false,
      pageLoadTime: Date.now() - startTime,
      capturedAt: new Date().toISOString()
    };

  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        // Ignore close errors
      }
    }
  }
}

/**
 * Extract page metadata (title, description, etc.)
 */
async function extractPageMetadata(page) {
  try {
    const metadata = await page.evaluate(() => {
      const getMetaContent = (name) => {
        const meta = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
        return meta ? meta.getAttribute('content') : null;
      };

      return {
        title: document.title || null,
        description: getMetaContent('description') || getMetaContent('og:description'),
        keywords: getMetaContent('keywords'),
        ogTitle: getMetaContent('og:title'),
        ogImage: getMetaContent('og:image'),
        canonical: document.querySelector('link[rel="canonical"]')?.href || null,
        hasHTTPS: window.location.protocol === 'https:',
        lang: document.documentElement.lang || null
      };
    });

    return metadata;
  } catch (error) {
    console.error('Failed to extract metadata:', error.message);
    return null;
  }
}

/**
 * Detect technology stack from page source
 */
async function detectTechStack(page) {
  try {
    const tech = await page.evaluate(() => {
      const hints = {
        cms: null,
        frameworks: [],
        analytics: []
      };

      const html = document.documentElement.outerHTML;

      // CMS detection
      if (html.includes('wp-content') || html.includes('wordpress')) {
        hints.cms = 'WordPress';
      } else if (html.includes('shopify')) {
        hints.cms = 'Shopify';
      } else if (html.includes('squarespace')) {
        hints.cms = 'Squarespace';
      } else if (html.includes('wix.com')) {
        hints.cms = 'Wix';
      } else if (html.includes('webflow')) {
        hints.cms = 'Webflow';
      }

      // Framework detection
      if (window.React || html.includes('react')) {
        hints.frameworks.push('React');
      }
      if (window.Vue || html.includes('vue')) {
        hints.frameworks.push('Vue');
      }
      if (window.angular || html.includes('ng-')) {
        hints.frameworks.push('Angular');
      }
      if (html.includes('next')) {
        hints.frameworks.push('Next.js');
      }

      // Analytics detection
      if (html.includes('google-analytics') || html.includes('gtag')) {
        hints.analytics.push('Google Analytics');
      }
      if (html.includes('facebook') && html.includes('pixel')) {
        hints.analytics.push('Facebook Pixel');
      }

      return hints;
    });

    return tech;
  } catch (error) {
    console.error('Failed to detect tech stack:', error.message);
    return null;
  }
}

/**
 * Check if site is mobile-friendly
 */
async function checkMobileFriendly(page) {
  try {
    const isMobileFriendly = await page.evaluate(() => {
      // Check viewport meta tag
      const viewportMeta = document.querySelector('meta[name="viewport"]');
      if (!viewportMeta) return false;

      const content = viewportMeta.getAttribute('content') || '';

      // Check for mobile-friendly viewport settings
      const hasWidthDevice = content.includes('width=device-width');
      const hasInitialScale = content.includes('initial-scale=1');

      return hasWidthDevice && hasInitialScale;
    });

    return isMobileFriendly;
  } catch (error) {
    console.error('Failed to check mobile-friendliness:', error.message);
    return false;
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

  return normalized;
}

/**
 * Capture website in both mobile and desktop viewports
 *
 * @param {string} url - Website URL to capture
 * @param {object} options - Capture options
 * @returns {Promise<object>} Desktop and mobile screenshot data
 */
export async function captureDualViewports(url, options = {}) {
  const { timeout = 30000 } = options;

  try {
    console.log(`[Dual Capture] Capturing ${url} in both mobile and desktop viewports...`);

    // Capture desktop (1920x1080)
    const desktopResult = await captureWebsite(url, {
      ...options,
      viewport: { width: 1920, height: 1080 },
      fullPage: true
    });

    // Capture mobile (375x812 - iPhone 13/14 size)
    const mobileResult = await captureWebsite(url, {
      ...options,
      viewport: { width: 375, height: 812 },
      fullPage: true
    });

    return {
      success: desktopResult.success && mobileResult.success,
      url,
      desktop: {
        screenshot: desktopResult.screenshot,
        viewport: { width: 1920, height: 1080 },
        pageLoadTime: desktopResult.pageLoadTime,
        screenshotSize: desktopResult.screenshot?.length || 0
      },
      mobile: {
        screenshot: mobileResult.screenshot,
        viewport: { width: 375, height: 812 },
        pageLoadTime: mobileResult.pageLoadTime,
        screenshotSize: mobileResult.screenshot?.length || 0
      },
      // Shared data (same for both)
      html: desktopResult.html,
      metadata: desktopResult.metadata,
      techStack: desktopResult.techStack,
      isMobileFriendly: desktopResult.isMobileFriendly,
      capturedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('[Dual Capture] Failed:', error.message);
    return {
      success: false,
      url,
      error: error.message,
      desktop: { screenshot: null },
      mobile: { screenshot: null }
    };
  }
}

/**
 * Capture multiple URLs in parallel
 *
 * @param {array} urls - Array of URLs to capture
 * @param {object} options - Capture options
 * @param {number} options.concurrency - Max parallel captures (default: 3)
 * @returns {Promise<array>} Array of capture results
 */
export async function captureMultiple(urls, options = {}) {
  const { concurrency = 3, ...captureOptions } = options;

  const results = [];
  const chunks = chunkArray(urls, concurrency);

  for (const chunk of chunks) {
    const chunkResults = await Promise.allSettled(
      chunk.map(url => captureWebsite(url, captureOptions))
    );

    for (const result of chunkResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          success: false,
          error: result.reason.message
        });
      }
    }
  }

  return results;
}

/**
 * Split array into chunks
 */
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
