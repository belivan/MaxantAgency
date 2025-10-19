/**
 * Content & Blog Scraper
 * Extracts recent blog posts, news, and published content for conversation hooks
 */

/**
 * Common URL patterns for blog/news pages
 */
const CONTENT_PAGE_PATTERNS = [
  /\/blog/i,
  /\/news/i,
  /\/articles/i,
  /\/insights/i,
  /\/resources/i,
  /\/posts/i,
  /\/updates/i,
  /\/press/i,
  /\/media/i,
  /\/announcements/i
];

/**
 * Detect if current page is likely a blog/news page
 * @param {string} url - Page URL
 * @returns {boolean}
 */
export function isContentPage(url) {
  return CONTENT_PAGE_PATTERNS.some(pattern => pattern.test(url));
}

/**
 * Find blog/news page URLs from a list of discovered pages
 * @param {Array<string>} pageUrls - List of page URLs
 * @returns {Array<string>} Content page URLs sorted by priority
 */
export function findContentPages(pageUrls) {
  const contentPages = pageUrls.filter(url => isContentPage(url));

  // Sort by priority (blog > news > articles, etc.)
  const priority = {
    blog: 1,
    news: 2,
    articles: 3,
    insights: 4,
    updates: 5,
    press: 6
  };

  return contentPages.sort((a, b) => {
    const aScore = Math.min(...Object.entries(priority)
      .filter(([key]) => a.toLowerCase().includes(key))
      .map(([, value]) => value));
    const bScore = Math.min(...Object.entries(priority)
      .filter(([key]) => b.toLowerCase().includes(key))
      .map(([, value]) => value));
    return aScore - bScore;
  });
}

/**
 * Extract content/blog information from a page
 * @param {Page} page - Playwright page instance
 * @param {string} url - Current page URL
 * @returns {Object} Content information found
 */
export async function extractContentInfo(page, url) {
  try {
    const result = await page.evaluate(() => {
      const content = {
        recentPosts: [],
        hasContentSection: false,
        contentType: null, // 'blog', 'news', 'articles'
        lastUpdate: null
      };

      const bodyText = document.body.innerText || '';
      const currentUrl = window.location.href;

      // Detect content type from URL
      if (currentUrl.includes('/blog')) content.contentType = 'blog';
      else if (currentUrl.includes('/news')) content.contentType = 'news';
      else if (currentUrl.includes('/articles')) content.contentType = 'articles';
      else if (currentUrl.includes('/insights')) content.contentType = 'insights';

      // === METHOD 1: Look for article/post cards ===

      const articleSelectors = [
        'article',
        '.post',
        '.blog-post',
        '.article',
        '.news-item',
        '[class*="post-"]',
        '[class*="article-"]',
        '[class*="blog-"]',
        '[class*="news-"]'
      ];

      const articles = [];
      articleSelectors.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => articles.push(el));
        } catch (e) {
          // Selector might not work
        }
      });

      // Extract post info from each article element
      articles.forEach((article, index) => {
        if (content.recentPosts.length >= 10) return; // Limit to 10 posts

        const articleText = article.innerText || '';

        // Find title
        const titleEl = article.querySelector('h1, h2, h3, h4, .title, [class*="title"]');
        const title = titleEl ? titleEl.innerText.trim() : null;

        // Find link
        const linkEl = article.querySelector('a[href]') || article.querySelector('[href]');
        const link = linkEl ? linkEl.getAttribute('href') : null;

        // Find date
        let date = null;
        const dateEl = article.querySelector('time, .date, [class*="date"], [class*="published"]');
        if (dateEl) {
          const datetime = dateEl.getAttribute('datetime');
          date = datetime || dateEl.innerText.trim();
        } else {
          // Try to find date in text with regex
          const dateMatch = articleText.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}/i);
          if (dateMatch) {
            date = dateMatch[0];
          }
        }

        // Find excerpt/summary
        let summary = null;
        const summaryEl = article.querySelector('.excerpt, .summary, .description, [class*="excerpt"], [class*="summary"]');
        if (summaryEl) {
          summary = summaryEl.innerText.trim().substring(0, 200);
        } else {
          // Use first paragraph as summary
          const firstP = article.querySelector('p');
          if (firstP) {
            summary = firstP.innerText.trim().substring(0, 200);
          }
        }

        if (title) {
          content.recentPosts.push({
            title,
            url: link ? (link.startsWith('http') ? link : new URL(link, window.location.href).href) : null,
            date,
            summary,
            source: 'article element'
          });
        }
      });

      // === METHOD 2: Look for links that look like blog posts ===

      if (content.recentPosts.length < 3) {
        const allLinks = document.querySelectorAll('a[href]');
        const blogLinkPatterns = [
          /\/blog\/[^\/]+$/,
          /\/news\/[^\/]+$/,
          /\/articles\/[^\/]+$/,
          /\/posts\/\d{4}\/\d{2}/,
          /\/\d{4}\/\d{2}\/\d{2}/
        ];

        allLinks.forEach(link => {
          if (content.recentPosts.length >= 10) return;

          const href = link.getAttribute('href');
          const text = link.innerText.trim();

          // Check if link looks like a blog post
          const looksLikeBlogPost = blogLinkPatterns.some(pattern => pattern.test(href));

          if (looksLikeBlogPost && text.length > 10 && text.length < 150) {
            // Try to find date near this link
            let dateNearby = null;
            const parent = link.closest('div, li, article, section');
            if (parent) {
              const parentText = parent.innerText;
              const dateMatch = parentText.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}/i);
              if (dateMatch) dateNearby = dateMatch[0];
            }

            content.recentPosts.push({
              title: text,
              url: href.startsWith('http') ? href : new URL(href, window.location.href).href,
              date: dateNearby,
              summary: null,
              source: 'blog link'
            });
          }
        });
      }

      // === METHOD 3: Look for "Recent Posts" or "Latest News" sections ===

      const recentSectionKeywords = ['recent', 'latest', 'new', 'featured'];
      const headings = document.querySelectorAll('h1, h2, h3, h4');

      headings.forEach(heading => {
        if (content.recentPosts.length >= 10) return;

        const headingText = heading.innerText.toLowerCase();
        const isRecentSection = recentSectionKeywords.some(kw =>
          headingText.includes(kw) &&
          (headingText.includes('post') || headingText.includes('article') || headingText.includes('news'))
        );

        if (isRecentSection) {
          // Get next sibling elements (likely contains the post list)
          let sibling = heading.nextElementSibling;
          let depth = 0;

          while (sibling && depth < 5) {
            const links = sibling.querySelectorAll('a[href]');
            links.forEach(link => {
              if (content.recentPosts.length >= 10) return;

              const href = link.getAttribute('href');
              const text = link.innerText.trim();

              if (text.length > 10 && text.length < 150) {
                content.recentPosts.push({
                  title: text,
                  url: href.startsWith('http') ? href : new URL(href, window.location.href).href,
                  date: null,
                  summary: null,
                  source: 'recent section'
                });
              }
            });

            sibling = sibling.nextElementSibling;
            depth++;
          }
        }
      });

      // Set hasContentSection flag
      content.hasContentSection = content.recentPosts.length > 0;

      // Deduplicate posts by title
      const seen = new Set();
      content.recentPosts = content.recentPosts.filter(post => {
        const key = post.title.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // Sort by date if available (most recent first)
      content.recentPosts.sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(b.date) - new Date(a.date);
      });

      // Determine last update date
      if (content.recentPosts.length > 0 && content.recentPosts[0].date) {
        content.lastUpdate = content.recentPosts[0].date;
      }

      return content;
    });

    // Add metadata
    result.url = url;
    result.isContentPage = isContentPage(url);
    result.extractedAt = new Date().toISOString();

    // Calculate content freshness score
    let freshness = 0;
    if (result.recentPosts.length > 0) {
      freshness = 30;

      // Bonus points for recent content
      if (result.lastUpdate) {
        try {
          const lastUpdate = new Date(result.lastUpdate);
          const monthsAgo = (Date.now() - lastUpdate) / (1000 * 60 * 60 * 24 * 30);

          if (monthsAgo < 1) freshness += 40; // Within last month
          else if (monthsAgo < 3) freshness += 30; // Within 3 months
          else if (monthsAgo < 6) freshness += 20; // Within 6 months
          else if (monthsAgo < 12) freshness += 10; // Within a year
        } catch (e) {
          // Invalid date, skip scoring
        }
      }

      // Bonus for having multiple posts
      if (result.recentPosts.length >= 5) freshness += 20;
      else if (result.recentPosts.length >= 3) freshness += 10;
    }

    result.freshness = Math.min(100, freshness);

    return result;

  } catch (error) {
    console.error('Content extraction error:', error);
    return {
      url,
      recentPosts: [],
      hasContentSection: false,
      contentType: null,
      lastUpdate: null,
      isContentPage: false,
      freshness: 0,
      extractedAt: new Date().toISOString(),
      error: error.message
    };
  }
}

/**
 * Aggregate content info from multiple pages
 * @param {Array<Object>} contentResults - Array of results from extractContentInfo
 * @returns {Object} Best aggregated content info
 */
export function aggregateContentInfo(contentResults) {
  if (!contentResults || contentResults.length === 0) {
    return {
      recentPosts: [],
      hasContent: false,
      contentType: null,
      lastUpdate: null,
      sources: [],
      freshness: 0
    };
  }

  // Collect all posts from all pages
  const allPosts = [];
  const seenTitles = new Set();

  contentResults.forEach(result => {
    if (result.recentPosts) {
      result.recentPosts.forEach(post => {
        const key = post.title.toLowerCase();
        if (!seenTitles.has(key)) {
          allPosts.push(post);
          seenTitles.add(key);
        }
      });
    }
  });

  // Sort by date (most recent first)
  allPosts.sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    try {
      return new Date(b.date) - new Date(a.date);
    } catch (e) {
      return 0;
    }
  });

  // Get most common content type
  const contentTypes = contentResults
    .map(r => r.contentType)
    .filter(Boolean);
  const contentType = contentTypes.length > 0 ? contentTypes[0] : null;

  // Get most recent update
  const lastUpdate = allPosts.length > 0 && allPosts[0].date ? allPosts[0].date : null;

  // Calculate overall freshness
  const avgFreshness = contentResults.reduce((sum, r) => sum + (r.freshness || 0), 0) / contentResults.length;

  return {
    recentPosts: allPosts.slice(0, 10), // Top 10 most recent
    hasContent: allPosts.length > 0,
    contentType,
    lastUpdate,
    sources: contentResults.map(r => r.url),
    freshness: Math.round(avgFreshness)
  };
}

/**
 * Get most recent post for conversation hook
 * @param {Object} contentInfo - Aggregated content info
 * @returns {Object|null} Most recent post
 */
export function getMostRecentPost(contentInfo) {
  if (!contentInfo || !contentInfo.recentPosts || contentInfo.recentPosts.length === 0) {
    return null;
  }

  return contentInfo.recentPosts[0];
}

/**
 * Format content info for display
 * @param {Object} contentInfo - Aggregated content info
 * @returns {string} Formatted string
 */
export function formatContentInfo(contentInfo) {
  if (!contentInfo || !contentInfo.hasContent) {
    return 'No blog/news content found';
  }

  const lines = [];

  lines.push(`Content Type: ${contentInfo.contentType || 'blog/news'}`);
  if (contentInfo.lastUpdate) {
    lines.push(`Last Update: ${contentInfo.lastUpdate}`);
  }

  lines.push(`\nRecent Posts (${contentInfo.recentPosts.length}):`);

  contentInfo.recentPosts.slice(0, 5).forEach((post, i) => {
    const date = post.date ? ` (${post.date})` : '';
    lines.push(`${i + 1}. ${post.title}${date}`);
    if (post.summary) {
      lines.push(`   ${post.summary.substring(0, 100)}...`);
    }
  });

  return lines.join('\n');
}

/**
 * Check if content is actively maintained
 * @param {Object} contentInfo - Aggregated content info
 * @returns {boolean} True if last post within 6 months
 */
export function hasActiveContent(contentInfo) {
  if (!contentInfo || !contentInfo.lastUpdate) return false;

  try {
    const lastUpdate = new Date(contentInfo.lastUpdate);
    const monthsAgo = (Date.now() - lastUpdate) / (1000 * 60 * 60 * 24 * 30);
    return monthsAgo < 6;
  } catch (e) {
    return false;
  }
}
