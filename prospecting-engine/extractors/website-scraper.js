import { chromium } from 'playwright';
import { logInfo, logError, logWarn, logDebug } from '../shared/logger.js';
import fs from 'fs';
import path from 'path';

/**
 * Website Scraper using Playwright
 *
 * Loads websites in a headless browser, takes screenshots,
 * and extracts HTML for AI analysis.
 */

let browser = null;

/**
 * Initialize the browser instance
 */
async function initBrowser() {
  if (!browser) {
    logInfo('Initializing Playwright browser');
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }
  return browser;
}

/**
 * Close the browser instance
 */
export async function closeBrowser() {
  if (browser) {
    logInfo('Closing Playwright browser');
    await browser.close();
    browser = null;
  }
}

/**
 * Scrape a website - take screenshot and extract HTML
 *
 * @param {string} url - Website URL
 * @param {object} options - Scraping options
 * @returns {Promise<object>} Scraped data
 */
export async function scrapeWebsite(url, options = {}) {
  const {
    timeout = 30000,
    waitForSelector = null,
    fullPage = false,
    screenshotDir = './screenshots'
  } = options;

  logInfo('Scraping website', { url });

  let page = null;

  try {
    // Initialize browser
    const browserInstance = await initBrowser();

    // Create new page
    page = await browserInstance.newPage();

    // Set viewport
    await page.setViewportSize({ width: 1280, height: 720 });

    // Set user agent (appear as normal browser)
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
    });

    logDebug('Navigating to URL', { url });

    // Navigate to URL
    const response = await page.goto(url, {
      timeout,
      waitUntil: 'domcontentloaded'
    });

    if (!response) {
      throw new Error('No response from page');
    }

    const status = response.status();
    if (status >= 400) {
      throw new Error(`HTTP ${status}`);
    }

    logDebug('Page loaded successfully', { url, status });

    // Wait for specific selector if provided
    if (waitForSelector) {
      try {
        await page.waitForSelector(waitForSelector, { timeout: 5000 });
      } catch (e) {
        logWarn('Selector not found, continuing anyway', { selector: waitForSelector });
      }
    }

    // Wait a bit for JavaScript to render
    await page.waitForTimeout(2000);

    // Take screenshot
    const screenshotBuffer = await page.screenshot({
      fullPage,
      type: 'png'
    });

    logInfo('Screenshot captured', { url, size: screenshotBuffer.length });

    // Save screenshot to file (optional, for debugging)
    if (screenshotDir) {
      try {
        if (!fs.existsSync(screenshotDir)) {
          fs.mkdirSync(screenshotDir, { recursive: true });
        }

        const filename = sanitizeFilename(url);
        const filepath = path.join(screenshotDir, `${filename}.png`);
        fs.writeFileSync(filepath, screenshotBuffer);

        logDebug('Screenshot saved', { filepath });
      } catch (e) {
        logWarn('Failed to save screenshot', { error: e.message });
      }
    }

    // Extract page content
    const html = await page.content();
    const title = await page.title();

    // Extract text content
    const textContent = await page.evaluate(() => {
      // Remove script and style tags
      const clone = document.cloneNode(true);
      clone.querySelectorAll('script, style, noscript').forEach(el => el.remove());
      return clone.body?.innerText || '';
    });

    // Extract meta tags
    const metaTags = await page.evaluate(() => {
      const metas = {};
      document.querySelectorAll('meta').forEach(meta => {
        const name = meta.getAttribute('name') || meta.getAttribute('property');
        const content = meta.getAttribute('content');
        if (name && content) {
          metas[name] = content;
        }
      });
      return metas;
    });

    // Extract social links (we'll do more advanced extraction later)
    const socialLinks = await extractSocialLinks(page);

    // DON'T close page yet - return it for DOM scraper to use
    // It will be closed later by the orchestrator

    logInfo('Website scraped successfully', {
      url,
      title,
      textLength: textContent.length,
      socialLinks: Object.keys(socialLinks).filter(k => socialLinks[k]).length
    });

    return {
      url,
      title,
      html,
      textContent: textContent.slice(0, 10000), // Limit to 10k chars
      screenshot: screenshotBuffer,
      screenshotBase64: screenshotBuffer.toString('base64'),
      metaTags,
      socialLinks,
      page, // ← Return page object for DOM scraper
      status: 'success'
    };

  } catch (error) {
    logError('Website scraping failed', error, { url });

    if (page) {
      await page.close().catch(() => {});
    }

    return {
      url,
      error: error.message,
      status: 'failed'
    };
  }
}

/**
 * Extract social media links from page
 *
 * @param {Page} page - Playwright page instance
 * @returns {Promise<object>} Social links
 */
async function extractSocialLinks(page) {
  return await page.evaluate(() => {
    const links = {
      instagram: null,
      facebook: null,
      twitter: null,
      linkedin: null,
      youtube: null,
      tiktok: null
    };

    // Find all links on page
    const allLinks = Array.from(document.querySelectorAll('a[href]'));

    allLinks.forEach(link => {
      const href = link.href.toLowerCase();

      // Instagram
      if (href.includes('instagram.com/') && !links.instagram) {
        links.instagram = link.href;
      }
      // Facebook
      else if ((href.includes('facebook.com/') || href.includes('fb.com/')) && !links.facebook) {
        links.facebook = link.href;
      }
      // Twitter/X
      else if ((href.includes('twitter.com/') || href.includes('x.com/')) && !links.twitter) {
        links.twitter = link.href;
      }
      // LinkedIn
      else if (href.includes('linkedin.com/') && !links.linkedin) {
        links.linkedin = link.href;
      }
      // YouTube
      else if (href.includes('youtube.com/') && !links.youtube) {
        links.youtube = link.href;
      }
      // TikTok
      else if (href.includes('tiktok.com/') && !links.tiktok) {
        links.tiktok = link.href;
      }
    });

    return links;
  });
}

/**
 * Scrape multiple websites in batch
 *
 * @param {Array<string>} urls - URLs to scrape
 * @param {object} options - Scraping options
 * @returns {Promise<Array>} Scraped data for each URL
 */
export async function scrapeBatch(urls, options = {}) {
  const { maxConcurrent = 3 } = options;

  logInfo('Starting batch scraping', { count: urls.length, maxConcurrent });

  const results = [];

  // Process in batches to avoid overwhelming the system
  for (let i = 0; i < urls.length; i += maxConcurrent) {
    const batch = urls.slice(i, i + maxConcurrent);

    logInfo(`Processing batch ${Math.floor(i / maxConcurrent) + 1}`, {
      start: i + 1,
      end: Math.min(i + maxConcurrent, urls.length),
      total: urls.length
    });

    const batchResults = await Promise.all(
      batch.map(url => scrapeWebsite(url, options))
    );

    results.push(...batchResults);
  }

  // Close browser after batch
  await closeBrowser();

  const successful = results.filter(r => r.status === 'success').length;
  logInfo('Batch scraping complete', {
    total: urls.length,
    successful,
    failed: urls.length - successful
  });

  return results;
}

/**
 * Sanitize filename for saving screenshots
 *
 * @param {string} url - URL to sanitize
 * @returns {string} Safe filename
 */
function sanitizeFilename(url) {
  // Remove protocol and special characters
  let filename = url
    .replace(/^https?:\/\//, '')
    .replace(/[^a-z0-9]/gi, '_')
    .toLowerCase();

  // Limit length
  if (filename.length > 100) {
    filename = filename.slice(0, 100);
  }

  // Add timestamp
  const timestamp = Date.now();
  return `${filename}_${timestamp}`;
}

export default { scrapeWebsite, scrapeBatch, closeBrowser };
