import { chromium } from 'playwright';
import { logInfo, logError, logWarn, logDebug } from '../shared/logger.js';

/**
 * Social Media Profile Scraper
 *
 * Scrapes public metadata from social media profiles:
 * - Username
 * - Display name
 * - Bio/description
 * - Follower count (if publicly visible)
 * - Profile picture URL
 *
 * Note: This only scrapes PUBLIC information visible without login.
 */

let browser = null;

/**
 * Initialize browser
 */
async function initBrowser() {
  if (!browser) {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }
  return browser;
}

/**
 * Close browser
 */
export async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

/**
 * Scrape metadata from social media profiles
 *
 * @param {object} profiles - Social profiles object
 * @returns {Promise<object>} Scraped metadata for each platform
 */
export async function scrapeSocialMetadata(profiles) {
  if (!profiles || Object.keys(profiles).every(k => !profiles[k])) {
    logDebug('No social profiles to scrape');
    return {};
  }

  logInfo('Starting social media scraping', {
    platforms: Object.keys(profiles).filter(k => profiles[k])
  });

  const metadata = {};

  // Scrape each platform
  if (profiles.instagram) {
    metadata.instagram = await scrapeInstagram(profiles.instagram);
  }

  if (profiles.facebook) {
    metadata.facebook = await scrapeFacebook(profiles.facebook);
  }

  if (profiles.linkedin) {
    metadata.linkedin = await scrapeLinkedIn(profiles.linkedin);
  }

  const scrapedCount = Object.keys(metadata).length;
  logInfo('Social scraping complete', { scraped: scrapedCount });

  return metadata;
}

/**
 * Scrape Instagram profile (public data only)
 *
 * @param {string} url - Instagram profile URL
 * @returns {Promise<object>} Instagram metadata
 */
async function scrapeInstagram(url) {
  logDebug('Scraping Instagram profile', { url });

  let page = null;

  try {
    const browserInstance = await initBrowser();
    page = await browserInstance.newPage();

    await page.goto(url, {
      timeout: 30000,
      waitUntil: 'domcontentloaded'
    });

    // Wait for content to load
    await page.waitForTimeout(2000);

    // Extract data from page
    const data = await page.evaluate(() => {
      // Try to find meta tags first (more reliable)
      const getMetaContent = (property) => {
        const meta = document.querySelector(`meta[property="${property}"]`);
        return meta ? meta.getAttribute('content') : null;
      };

      // Extract username from URL
      const username = window.location.pathname.split('/').filter(Boolean)[0];

      return {
        username,
        name: getMetaContent('og:title') || username,
        description: getMetaContent('og:description'),
        image: getMetaContent('og:image'),
        platform: 'instagram'
      };
    });

    await page.close();

    logDebug('Instagram profile scraped', { username: data.username });

    return data;

  } catch (error) {
    logError('Instagram scraping failed', error, { url });

    if (page) {
      await page.close().catch(() => {});
    }

    return {
      platform: 'instagram',
      error: error.message,
      url
    };
  }
}

/**
 * Scrape Facebook page (public data only)
 *
 * @param {string} url - Facebook page URL
 * @returns {Promise<object>} Facebook metadata
 */
async function scrapeFacebook(url) {
  logDebug('Scraping Facebook page', { url });

  let page = null;

  try {
    const browserInstance = await initBrowser();
    page = await browserInstance.newPage();

    await page.goto(url, {
      timeout: 30000,
      waitUntil: 'domcontentloaded'
    });

    await page.waitForTimeout(2000);

    const data = await page.evaluate(() => {
      const getMetaContent = (property) => {
        const meta = document.querySelector(`meta[property="${property}"]`);
        return meta ? meta.getAttribute('content') : null;
      };

      return {
        name: getMetaContent('og:title'),
        description: getMetaContent('og:description'),
        image: getMetaContent('og:image'),
        platform: 'facebook'
      };
    });

    await page.close();

    logDebug('Facebook page scraped', { name: data.name });

    return data;

  } catch (error) {
    logError('Facebook scraping failed', error, { url });

    if (page) {
      await page.close().catch(() => {});
    }

    return {
      platform: 'facebook',
      error: error.message,
      url
    };
  }
}

/**
 * Scrape LinkedIn company page (public data only)
 *
 * @param {string} url - LinkedIn company page URL
 * @returns {Promise<object>} LinkedIn metadata
 */
async function scrapeLinkedIn(url) {
  logDebug('Scraping LinkedIn page', { url });

  let page = null;

  try {
    const browserInstance = await initBrowser();
    page = await browserInstance.newPage();

    // Set user agent
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
    });

    await page.goto(url, {
      timeout: 30000,
      waitUntil: 'domcontentloaded'
    });

    await page.waitForTimeout(2000);

    const data = await page.evaluate(() => {
      const getMetaContent = (property) => {
        const meta = document.querySelector(`meta[property="${property}"]`);
        return meta ? meta.getAttribute('content') : null;
      };

      return {
        name: getMetaContent('og:title'),
        description: getMetaContent('og:description'),
        image: getMetaContent('og:image'),
        platform: 'linkedin'
      };
    });

    await page.close();

    logDebug('LinkedIn page scraped', { name: data.name });

    return data;

  } catch (error) {
    logError('LinkedIn scraping failed', error, { url });

    if (page) {
      await page.close().catch(() => {});
    }

    return {
      platform: 'linkedin',
      error: error.message,
      url
    };
  }
}

/**
 * Scrape multiple social profiles in batch
 *
 * @param {Array<object>} profilesList - Array of profile objects
 * @returns {Promise<Array>} Scraped metadata for each
 */
export async function scrapeBatch(profilesList) {
  logInfo('Starting batch social scraping', { count: profilesList.length });

  const results = [];

  for (const profiles of profilesList) {
    const metadata = await scrapeSocialMetadata(profiles);
    results.push(metadata);

    // Small delay between profiles
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Close browser after batch
  await closeBrowser();

  logInfo('Batch social scraping complete', { count: results.length });

  return results;
}

export default { scrapeSocialMetadata, scrapeBatch, closeBrowser };
