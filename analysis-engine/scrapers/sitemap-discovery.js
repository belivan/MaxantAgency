/**
 * Sitemap Discovery - Fast discovery of all website pages without visiting them
 *
 * Strategies:
 * 1. Check /sitemap.xml
 * 2. Check /robots.txt for sitemap references
 * 3. Quick homepage scan for navigation links
 * 4. Combine and deduplicate
 *
 * Returns structured sitemap for AI page selection
 */

import axios from 'axios';
import { parseString } from 'xml2js';
import { JSDOM } from 'jsdom';
import { promisify } from 'util';

const parseXml = promisify(parseString);

/**
 * Discover all pages on a website
 *
 * @param {string} baseUrl - Website base URL
 * @param {object} options - Discovery options
 * @returns {Promise<object>} Discovered sitemap
 */
export async function discoverAllPages(baseUrl, options = {}) {
  const { timeout = 10000 } = options;

  console.log(`[Sitemap Discovery] Discovering pages for ${baseUrl}...`);

  const startTime = Date.now();
  const discovered = {
    totalPages: 0,
    pages: [],
    sources: {
      sitemap: 0,
      robots: 0,
      navigation: 0
    }
  };

  // Strategy 1: Check sitemap.xml
  try {
    const sitemapPages = await discoverFromSitemap(baseUrl, timeout);
    discovered.pages.push(...sitemapPages);
    discovered.sources.sitemap = sitemapPages.length;
    console.log(`[Sitemap Discovery] Found ${sitemapPages.length} pages from sitemap.xml`);
  } catch (error) {
    console.log(`[Sitemap Discovery] No sitemap.xml found: ${error.message}`);
  }

  // Strategy 2: Check robots.txt
  try {
    const robotsPages = await discoverFromRobots(baseUrl, timeout);
    discovered.pages.push(...robotsPages);
    discovered.sources.robots = robotsPages.length;
    console.log(`[Sitemap Discovery] Found ${robotsPages.length} pages from robots.txt`);
  } catch (error) {
    console.log(`[Sitemap Discovery] No robots.txt sitemaps found: ${error.message}`);
  }

  // Strategy 3: Quick homepage navigation scan
  try {
    const navPages = await discoverFromNavigation(baseUrl, timeout);
    discovered.pages.push(...navPages);
    discovered.sources.navigation = navPages.length;
    console.log(`[Sitemap Discovery] Found ${navPages.length} pages from navigation`);
  } catch (error) {
    console.log(`[Sitemap Discovery] Navigation scan failed: ${error.message}`);
  }

  // Deduplicate and structure
  const uniquePages = deduplicatePages(discovered.pages, baseUrl);
  discovered.pages = uniquePages;
  discovered.totalPages = uniquePages.length;

  const discoveryTime = Date.now() - startTime;
  console.log(`[Sitemap Discovery] Discovered ${discovered.totalPages} unique pages in ${discoveryTime}ms`);

  return discovered;
}

/**
 * Discover pages from sitemap.xml
 */
async function discoverFromSitemap(baseUrl, timeout) {
  const sitemapUrl = new URL('/sitemap.xml', baseUrl).href;

  const response = await axios.get(sitemapUrl, {
    timeout,
    headers: { 'User-Agent': 'MaxantAgency-AnalysisBot/2.0' },
    validateStatus: (status) => status === 200
  });

  const parsed = await parseXml(response.data);

  const pages = [];

  // Handle sitemap index (multiple sitemaps)
  if (parsed.sitemapindex?.sitemap) {
    const sitemaps = parsed.sitemapindex.sitemap;
    for (const sitemap of sitemaps) {
      const sitemapLoc = sitemap.loc?.[0];
      if (sitemapLoc) {
        try {
          const subPages = await discoverFromSitemapUrl(sitemapLoc, timeout);
          pages.push(...subPages);
        } catch (error) {
          console.log(`[Sitemap Discovery] Failed to fetch sub-sitemap ${sitemapLoc}: ${error.message}`);
        }
      }
    }
  }

  // Handle regular sitemap (URL list)
  if (parsed.urlset?.url) {
    const urls = parsed.urlset.url;
    for (const url of urls) {
      const loc = url.loc?.[0];
      const lastmod = url.lastmod?.[0];
      const priority = url.priority?.[0];

      if (loc) {
        pages.push({
          url: loc,
          source: 'sitemap',
          lastModified: lastmod || null,
          priority: priority ? parseFloat(priority) : null
        });
      }
    }
  }

  return pages;
}

/**
 * Discover pages from a specific sitemap URL
 */
async function discoverFromSitemapUrl(sitemapUrl, timeout) {
  const response = await axios.get(sitemapUrl, {
    timeout,
    headers: { 'User-Agent': 'MaxantAgency-AnalysisBot/2.0' },
    validateStatus: (status) => status === 200
  });

  const parsed = await parseXml(response.data);
  const pages = [];

  if (parsed.urlset?.url) {
    const urls = parsed.urlset.url;
    for (const url of urls) {
      const loc = url.loc?.[0];
      if (loc) {
        pages.push({
          url: loc,
          source: 'sitemap',
          lastModified: url.lastmod?.[0] || null,
          priority: url.priority?.[0] ? parseFloat(url.priority[0]) : null
        });
      }
    }
  }

  return pages;
}

/**
 * Discover sitemaps from robots.txt
 */
async function discoverFromRobots(baseUrl, timeout) {
  const robotsUrl = new URL('/robots.txt', baseUrl).href;

  const response = await axios.get(robotsUrl, {
    timeout,
    headers: { 'User-Agent': 'MaxantAgency-AnalysisBot/2.0' },
    validateStatus: (status) => status === 200
  });

  const robotsText = response.data;
  const lines = robotsText.split('\n');

  const sitemapUrls = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.toLowerCase().startsWith('sitemap:')) {
      const sitemapUrl = trimmed.substring(8).trim();
      sitemapUrls.push(sitemapUrl);
    }
  }

  // Fetch all sitemaps found in robots.txt
  const pages = [];
  for (const sitemapUrl of sitemapUrls) {
    try {
      const sitemapPages = await discoverFromSitemapUrl(sitemapUrl, timeout);
      pages.push(...sitemapPages);
    } catch (error) {
      console.log(`[Sitemap Discovery] Failed to fetch sitemap from robots.txt: ${sitemapUrl}`);
    }
  }

  return pages;
}

/**
 * Discover pages from homepage navigation
 */
async function discoverFromNavigation(baseUrl, timeout) {
  const response = await axios.get(baseUrl, {
    timeout,
    headers: { 'User-Agent': 'MaxantAgency-AnalysisBot/2.0' },
    validateStatus: (status) => status === 200
  });

  const dom = new JSDOM(response.data);
  const document = dom.window.document;

  const links = document.querySelectorAll('a[href]');
  const pages = [];

  const baseUrlObj = new URL(baseUrl);

  for (const link of links) {
    const href = link.getAttribute('href');
    if (!href) continue;

    try {
      // Resolve relative URLs
      const absoluteUrl = new URL(href, baseUrl).href;
      const urlObj = new URL(absoluteUrl);

      // Only include same-domain links
      if (urlObj.hostname === baseUrlObj.hostname) {
        // Get link text for better context
        const linkText = link.textContent?.trim() || '';

        pages.push({
          url: absoluteUrl,
          source: 'navigation',
          linkText,
          lastModified: null,
          priority: null
        });
      }
    } catch (error) {
      // Skip invalid URLs
      continue;
    }
  }

  return pages;
}

/**
 * Deduplicate pages and convert to relative paths
 */
function deduplicatePages(pages, baseUrl) {
  const baseUrlObj = new URL(baseUrl);
  const seen = new Set();
  const unique = [];

  for (const page of pages) {
    try {
      const urlObj = new URL(page.url);

      // Normalize: remove hash, trailing slash
      const pathname = urlObj.pathname.replace(/\/$/, '') || '/';
      const normalizedUrl = pathname + urlObj.search;

      if (!seen.has(normalizedUrl)) {
        seen.add(normalizedUrl);

        // Classify page type based on URL
        const pageType = classifyPageType(normalizedUrl);
        const level = calculatePageLevel(normalizedUrl);

        unique.push({
          url: normalizedUrl,
          fullUrl: page.url,
          type: pageType,
          level,
          source: page.source,
          linkText: page.linkText || null,
          lastModified: page.lastModified,
          priority: page.priority
        });
      }
    } catch (error) {
      // Skip invalid URLs
      continue;
    }
  }

  // Sort by priority (sitemap priority, then by level)
  unique.sort((a, b) => {
    if (a.priority !== null && b.priority !== null) {
      return b.priority - a.priority;
    }
    if (a.priority !== null) return -1;
    if (b.priority !== null) return 1;
    return a.level - b.level;
  });

  return unique;
}

/**
 * Classify page type based on URL patterns
 */
function classifyPageType(url) {
  const lowercaseUrl = url.toLowerCase();

  // Homepage
  if (url === '/' || url === '') return 'homepage';

  // Common page types
  if (lowercaseUrl.includes('/about')) return 'about';
  if (lowercaseUrl.includes('/contact')) return 'contact';
  if (lowercaseUrl.includes('/pricing')) return 'pricing';
  if (lowercaseUrl.includes('/services') || lowercaseUrl.includes('/service/')) return 'services';
  if (lowercaseUrl.includes('/products') || lowercaseUrl.includes('/product/')) return 'products';
  if (lowercaseUrl.includes('/blog')) return 'blog';
  if (lowercaseUrl.includes('/case-stud') || lowercaseUrl.includes('/portfolio')) return 'case-studies';
  if (lowercaseUrl.includes('/team')) return 'team';
  if (lowercaseUrl.includes('/testimonial') || lowercaseUrl.includes('/review')) return 'testimonials';
  if (lowercaseUrl.includes('/faq')) return 'faq';
  if (lowercaseUrl.includes('/menu')) return 'menu';
  if (lowercaseUrl.includes('/location')) return 'locations';
  if (lowercaseUrl.includes('/career') || lowercaseUrl.includes('/job')) return 'careers';
  if (lowercaseUrl.includes('/privacy')) return 'legal';
  if (lowercaseUrl.includes('/terms')) return 'legal';
  if (lowercaseUrl.includes('/cookie')) return 'legal';

  // Default
  return 'other';
}

/**
 * Calculate page depth/level
 */
function calculatePageLevel(url) {
  const parts = url.split('/').filter(p => p.length > 0);
  return parts.length;
}

/**
 * Default export
 */
export default {
  discoverAllPages
};