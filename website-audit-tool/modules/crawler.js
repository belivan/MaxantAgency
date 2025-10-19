/**
 * Multi-Page Crawler Module
 * Discovers and ranks internal pages for Tier II & III analysis
 */

/**
 * Discover pages to analyze based on depth tier
 */
export async function discoverPages(homepageUrl, tier, page, sendProgress) {
  const pages = [homepageUrl]; // Always include homepage

  if (tier === 'tier1') {
    // Tier I: Homepage only
    return pages;
  }

  sendProgress({
    type: 'step',
    step: 'discovering_pages',
    message: `⏳ Discovering internal pages...`,
    url: homepageUrl
  });

  try {
    // Crawl homepage to find all internal links
    const internalLinks = await crawlForInternalLinks(homepageUrl, page);

    sendProgress({
      type: 'step',
      step: 'pages_discovered',
      message: `✓ Found ${internalLinks.length} internal pages`,
      url: homepageUrl
    });

    if (tier === 'tier2') {
      // Tier II: Homepage + 2 best pages (3 total)
      const selectedPages = selectBestPages(internalLinks, 2);
      pages.push(...selectedPages);

      sendProgress({
        type: 'step',
        step: 'pages_selected',
        message: `✓ Selected top 3 pages: ${getPageNames(pages)}`,
        url: homepageUrl
      });

      return pages;
    }

    if (tier === 'tier3') {
      // Tier III: Homepage + up to 9 best pages (up to 10 total)
      const selectedPages = selectBestPages(internalLinks, 9);
      pages.push(...selectedPages);

      sendProgress({
        type: 'step',
        step: 'pages_selected',
        message: `✓ Selected ${pages.length} pages for comprehensive audit`,
        url: homepageUrl
      });

      return pages;
    }

    return pages;

  } catch (error) {
    console.error('Page discovery error:', error);

    sendProgress({
      type: 'step',
      step: 'discovery_failed',
      message: `⚠️ Page discovery failed, analyzing homepage only`,
      url: homepageUrl
    });

    return pages; // Fall back to homepage only
  }
}

/**
 * Crawl page for internal links
 */
async function crawlForInternalLinks(url, page) {
  const baseUrl = new URL(url);
  const baseHostname = baseUrl.hostname;

  // Extract all links from the page
  const links = await page.evaluate((hostname) => {
    const allLinks = Array.from(document.querySelectorAll('a[href]'));
    const urls = new Set();

    allLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (!href) return;

      try {
        // Handle relative URLs
        const absoluteUrl = new URL(href, window.location.href);

        // Only include links from same domain
        if (absoluteUrl.hostname === hostname) {
          // Remove fragments and query params for deduplication
          const cleanUrl = `${absoluteUrl.origin}${absoluteUrl.pathname}`;
          urls.add(cleanUrl);
        }
      } catch (e) {
        // Skip invalid URLs
      }
    });

    return Array.from(urls);
  }, baseHostname);

  // Filter out homepage itself
  return links.filter(link => {
    const linkUrl = new URL(link);
    return linkUrl.pathname !== '/' && linkUrl.pathname !== '';
  });
}

/**
 * Select best pages using smart ranking algorithm
 */
function selectBestPages(links, count) {
  if (links.length === 0) return [];

  // Rank each page by importance
  const rankedPages = links.map(url => {
    const score = calculatePageScore(url);
    return { url, score };
  });

  // Sort by score (highest first)
  rankedPages.sort((a, b) => b.score - a.score);

  // Return top N pages
  return rankedPages.slice(0, count).map(page => page.url);
}

/**
 * Calculate importance score for a page
 */
function calculatePageScore(url) {
  let score = 0;
  const urlLower = url.toLowerCase();
  const pathname = new URL(url).pathname.toLowerCase();
  const pathDepth = pathname.split('/').filter(p => p.length > 0).length;

  // CRITICAL PRIORITY - Most important pages for outreach
  const criticalKeywords = [
    'contact', 'get-started', 'get-in-touch', 'reach-us', 'contact-us'
  ];

  // HIGH PRIORITY - Core business pages
  const highPriorityKeywords = [
    'service', 'services', 'what-we-do', 'solutions', 'offerings',
    'about', 'about-us', 'who-we-are', 'our-story', 'company',
    'pricing', 'plans', 'packages', 'rates'
  ];

  // MEDIUM PRIORITY - Portfolio/work pages (but only parent pages, not individual items)
  const portfolioKeywords = [
    'portfolio', 'work', 'projects', 'case-studies'
  ];

  // MEDIUM PRIORITY - Other useful pages
  const mediumPriorityKeywords = [
    'products', 'product', 'features',
    'team', 'people', 'careers',
    'resources', 'blog', 'news',
    'faq', 'help', 'support'
  ];

  // LOW PRIORITY / NEGATIVE - Skip these
  const lowPriorityKeywords = [
    'privacy', 'terms', 'legal', 'policy',
    'sitemap', 'feed', 'rss',
    'login', 'signin', 'signup', 'register',
    'cart', 'checkout', 'account',
    'search', 'category', 'tag', 'author'
  ];

  // CRITICAL: Contact pages get highest priority
  criticalKeywords.forEach(keyword => {
    if (pathname.includes(keyword)) {
      score += 200; // Highest priority
    }
  });

  // HIGH: Core business pages
  highPriorityKeywords.forEach(keyword => {
    if (pathname.includes(keyword)) {
      score += 150;
    }
  });

  // MEDIUM: Portfolio/work pages - but penalize if they're deep (individual projects)
  portfolioKeywords.forEach(keyword => {
    if (pathname.includes(keyword)) {
      if (pathDepth === 1) {
        // Parent portfolio page (e.g., /portfolio)
        score += 100;
      } else {
        // Individual project page (e.g., /portfolio/project-name)
        score += 30; // Much lower priority
      }
    }
  });

  // MEDIUM: Other useful pages
  mediumPriorityKeywords.forEach(keyword => {
    if (pathname.includes(keyword)) {
      score += 80;
    }
  });

  // NEGATIVE: Skip unwanted pages
  lowPriorityKeywords.forEach(keyword => {
    if (pathname.includes(keyword)) {
      score -= 100;
    }
  });

  // Prefer shallower URLs (but less aggressive than before)
  if (pathDepth === 1) {
    score += 40; // /services
  } else if (pathDepth === 2) {
    score += 20; // /services/web-design
  } else if (pathDepth === 3) {
    score += 5; // /services/web-design/packages
  } else {
    score -= 10; // /blog/2024/03/15/article-title (too deep)
  }

  // Penalize URLs with query parameters or fragments
  if (url.includes('?')) score -= 30;
  if (url.includes('#')) score -= 30;
  if (url.includes('&')) score -= 20;

  return Math.max(0, score); // Never return negative scores
}

/**
 * Get friendly page names for display
 */
function getPageNames(urls) {
  return urls.map(url => {
    try {
      const pathname = new URL(url).pathname;
      const parts = pathname.split('/').filter(p => p.length > 0);

      if (parts.length === 0) return 'Homepage';

      // Capitalize and clean up
      const pageName = parts[parts.length - 1]
        .replace(/-/g, ' ')
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      return pageName;
    } catch (e) {
      return 'Page';
    }
  }).join(', ');
}

/**
 * Find specific page type (services, contact, etc.)
 */
export function findBestMatch(links, keywords) {
  for (const keyword of keywords) {
    const match = links.find(url =>
      url.toLowerCase().includes(keyword.toLowerCase())
    );
    if (match) return match;
  }
  // Return first link if no match found
  return links[0] || null;
}
