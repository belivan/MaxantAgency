/**
 * Page Discovery for Prospecting Engine
 *
 * Lightweight page discovery for business intelligence extraction
 * Discovers pages from sitemap.xml, robots.txt, and navigation
 */

import axios from 'axios';
import { parseString } from 'xml2js';
import { JSDOM } from 'jsdom';
import { promisify } from 'util';

const parseXml = promisify(parseString);

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Discover all pages on a website
 */
export async function discoverPages(baseUrl, options = {}) {
  const { timeout = 10000 } = options;

  console.log(`[Page Discovery] Discovering pages for ${baseUrl}...`);

  const discovered = {
    totalPages: 0,
    pages: [],
    sources: {
      sitemap: 0,
      robots: 0,
      navigation: 0
    }
  };

  // Try sitemap.xml
  try {
    const sitemapPages = await discoverFromSitemap(baseUrl, timeout);
    discovered.pages.push(...sitemapPages);
    discovered.sources.sitemap = sitemapPages.length;
    console.log(`[Page Discovery] Found ${sitemapPages.length} pages from sitemap.xml`);
  } catch (error) {
    console.log(`[Page Discovery] No sitemap.xml: ${error.message}`);
  }

  // Try robots.txt
  try {
    const robotsPages = await discoverFromRobots(baseUrl, timeout);
    discovered.pages.push(...robotsPages);
    discovered.sources.robots = robotsPages.length;
    console.log(`[Page Discovery] Found ${robotsPages.length} pages from robots.txt`);
  } catch (error) {
    console.log(`[Page Discovery] No robots.txt sitemaps: ${error.message}`);
  }

  // Try homepage navigation
  try {
    const navPages = await discoverFromNavigation(baseUrl, timeout);
    discovered.pages.push(...navPages);
    discovered.sources.navigation = navPages.length;
    console.log(`[Page Discovery] Found ${navPages.length} pages from navigation`);
  } catch (error) {
    console.log(`[Page Discovery] Navigation scan failed: ${error.message}`);
  }

  // Deduplicate and structure
  const uniquePages = deduplicatePages(discovered.pages, baseUrl);
  discovered.pages = uniquePages;
  discovered.totalPages = uniquePages.length;

  console.log(`[Page Discovery] Discovered ${discovered.totalPages} unique pages`);

  return discovered;
}

/**
 * Discover pages from sitemap.xml
 */
async function discoverFromSitemap(baseUrl, timeout) {
  const sitemapUrl = new URL('/sitemap.xml', baseUrl).href;

  const response = await axios.get(sitemapUrl, {
    timeout,
    headers: { 'User-Agent': USER_AGENT },
    validateStatus: (status) => status === 200
  });

  const parsed = await parseXml(response.data);
  const pages = [];

  // Handle sitemap index
  if (parsed.sitemapindex?.sitemap) {
    for (const sitemap of parsed.sitemapindex.sitemap) {
      const sitemapLoc = sitemap.loc?.[0];
      if (sitemapLoc) {
        try {
          const subPages = await discoverFromSitemapUrl(sitemapLoc, timeout);
          pages.push(...subPages);
        } catch (error) {
          // Skip failed sub-sitemaps
        }
      }
    }
  }

  // Handle regular sitemap
  if (parsed.urlset?.url) {
    for (const url of parsed.urlset.url) {
      const loc = url.loc?.[0];
      if (loc) {
        pages.push({
          url: loc,
          source: 'sitemap'
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
    headers: { 'User-Agent': USER_AGENT },
    validateStatus: (status) => status === 200
  });

  const parsed = await parseXml(response.data);
  const pages = [];

  if (parsed.urlset?.url) {
    for (const url of parsed.urlset.url) {
      const loc = url.loc?.[0];
      if (loc) {
        pages.push({
          url: loc,
          source: 'sitemap'
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
    headers: { 'User-Agent': USER_AGENT },
    validateStatus: (status) => status === 200
  });

  const lines = response.data.split('\n');
  const sitemapUrls = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.toLowerCase().startsWith('sitemap:')) {
      const sitemapUrl = trimmed.substring(8).trim();
      sitemapUrls.push(sitemapUrl);
    }
  }

  const pages = [];
  for (const sitemapUrl of sitemapUrls) {
    try {
      const sitemapPages = await discoverFromSitemapUrl(sitemapUrl, timeout);
      pages.push(...sitemapPages);
    } catch (error) {
      // Skip failed sitemaps
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
    headers: { 'User-Agent': USER_AGENT },
    validateStatus: (status) => status === 200
  });

  const dom = new JSDOM(response.data);
  const links = dom.window.document.querySelectorAll('a[href]');
  const pages = [];
  const baseUrlObj = new URL(baseUrl);

  for (const link of links) {
    const href = link.getAttribute('href');
    if (!href) continue;

    try {
      const absoluteUrl = new URL(href, baseUrl).href;
      const urlObj = new URL(absoluteUrl);

      // Only same-domain links
      if (urlObj.hostname === baseUrlObj.hostname) {
        const linkText = link.textContent?.trim() || '';
        pages.push({
          url: absoluteUrl,
          source: 'navigation',
          linkText
        });
      }
    } catch (error) {
      continue;
    }
  }

  return pages;
}

/**
 * Deduplicate pages and classify by type
 */
function deduplicatePages(pages, baseUrl) {
  const seen = new Set();
  const unique = [];

  for (const page of pages) {
    try {
      const urlObj = new URL(page.url);

      // Normalize: remove hash, trailing slash
      const pathname = urlObj.pathname.replace(/\/$/, '') || '/';
      const normalizedUrl = pathname + urlObj.search;

      // Skip downloadable files
      if (isDownloadableFile(normalizedUrl)) continue;

      if (!seen.has(normalizedUrl)) {
        seen.add(normalizedUrl);

        unique.push({
          url: normalizedUrl,
          type: classifyPageType(normalizedUrl),
          source: page.source,
          linkText: page.linkText || null
        });
      }
    } catch (error) {
      continue;
    }
  }

  return unique;
}

/**
 * Check if URL is a downloadable file
 */
function isDownloadableFile(url) {
  const downloadableExtensions = [
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.zip', '.rar', '.tar', '.gz', '.jpg', '.jpeg', '.png', '.gif',
    '.mp3', '.mp4', '.avi', '.mov', '.wav', '.exe', '.dmg'
  ];

  const lowercaseUrl = url.toLowerCase();
  return downloadableExtensions.some(ext => lowercaseUrl.endsWith(ext));
}

/**
 * Classify page type based on URL patterns (BI-focused)
 */
function classifyPageType(url) {
  const lowercaseUrl = url.toLowerCase();

  // Homepage
  if (url === '/' || url === '') return 'homepage';

  // BI-critical pages
  if (lowercaseUrl.includes('/about')) return 'about';
  if (lowercaseUrl.includes('/team')) return 'team';
  if (lowercaseUrl.includes('/career') || lowercaseUrl.includes('/job')) return 'careers';
  if (lowercaseUrl.includes('/pricing')) return 'pricing';
  if (lowercaseUrl.includes('/contact')) return 'contact';
  if (lowercaseUrl.includes('/services') || lowercaseUrl.includes('/service/')) return 'services';
  if (lowercaseUrl.includes('/portfolio') || lowercaseUrl.includes('/work')) return 'portfolio';
  if (lowercaseUrl.includes('/case-stud')) return 'case-studies';
  if (lowercaseUrl.includes('/blog')) return 'blog';
  if (lowercaseUrl.includes('/location')) return 'locations';
  if (lowercaseUrl.includes('/menu')) return 'menu';
  if (lowercaseUrl.includes('/products') || lowercaseUrl.includes('/product/')) return 'products';

  return 'other';
}

export default {
  discoverPages
};
