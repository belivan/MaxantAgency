/**
 * HTML Parser - Parse HTML content for SEO and content analysis
 *
 * Uses Cheerio to extract structured data from HTML
 * Provides helpers for SEO, content, and social media analysis
 */

import * as cheerio from 'cheerio';

/**
 * Parse HTML and extract all relevant data
 *
 * @param {string} html - Raw HTML content
 * @param {string} url - Website URL (for context)
 * @returns {object} Parsed data
 */
export function parseHTML(html, url = '') {
  const $ = cheerio.load(html);

  return {
    seo: extractSEOData($, url),
    content: extractContentData($),
    social: extractSocialData($),
    structure: analyzeStructure($),
    images: analyzeImages($),
    links: analyzeLinks($, url)
  };
}

/**
 * Extract SEO-related data
 */
export function extractSEOData($, url) {
  const getMetaContent = (selector) => {
    return $(selector).attr('content') || null;
  };

  // Title tag
  const title = $('title').text() || null;
  const titleLength = title ? title.length : 0;

  // Meta description
  const description = getMetaContent('meta[name="description"]') ||
                     getMetaContent('meta[property="og:description"]');
  const descriptionLength = description ? description.length : 0;

  // Meta keywords (legacy but still worth checking)
  const keywords = getMetaContent('meta[name="keywords"]');

  // Canonical URL
  const canonical = $('link[rel="canonical"]').attr('href') || null;

  // Robots directives
  const robots = getMetaContent('meta[name="robots"]');

  // Open Graph tags
  const ogTitle = getMetaContent('meta[property="og:title"]');
  const ogDescription = getMetaContent('meta[property="og:description"]');
  const ogImage = getMetaContent('meta[property="og:image"]');
  const ogType = getMetaContent('meta[property="og:type"]');

  // Twitter Card tags
  const twitterCard = getMetaContent('meta[name="twitter:card"]');
  const twitterTitle = getMetaContent('meta[name="twitter:title"]');
  const twitterDescription = getMetaContent('meta[name="twitter:description"]');
  const twitterImage = getMetaContent('meta[name="twitter:image"]');

  // Headings
  const h1Tags = $('h1').map((i, el) => $(el).text().trim()).get();
  const h2Tags = $('h2').map((i, el) => $(el).text().trim()).get();

  // Schema.org structured data
  const schemaScripts = $('script[type="application/ld+json"]')
    .map((i, el) => {
      try {
        return JSON.parse($(el).html());
      } catch (e) {
        return null;
      }
    })
    .get()
    .filter(Boolean);

  return {
    title,
    titleLength,
    titleOptimal: titleLength >= 30 && titleLength <= 60,

    description,
    descriptionLength,
    descriptionOptimal: descriptionLength >= 120 && descriptionLength <= 160,

    keywords,
    canonical,
    robots,

    openGraph: {
      title: ogTitle,
      description: ogDescription,
      image: ogImage,
      type: ogType,
      complete: !!(ogTitle && ogDescription && ogImage)
    },

    twitterCard: {
      card: twitterCard,
      title: twitterTitle,
      description: twitterDescription,
      image: twitterImage,
      complete: !!(twitterCard && twitterTitle && twitterImage)
    },

    headings: {
      h1: h1Tags,
      h1Count: h1Tags.length,
      h2: h2Tags,
      h2Count: h2Tags.length,
      h1Optimal: h1Tags.length === 1
    },

    structuredData: schemaScripts,
    hasStructuredData: schemaScripts.length > 0
  };
}

/**
 * Extract content-related data
 */
export function extractContentData($) {
  // Get all text content
  const bodyText = $('body').text();
  const wordCount = countWords(bodyText);

  // Extract main headline
  const mainHeadline = $('h1').first().text().trim() || null;

  // Check for blog
  const hasBlog = !!(
    $('a[href*="/blog"]').length > 0 ||
    $('a[href*="/news"]').length > 0 ||
    $('article').length > 0
  );

  // Extract blog posts (if present)
  const blogPosts = extractBlogPosts($);

  // Key sections
  const sections = {
    hasAbout: !!(
      $('section#about, section.about, div#about, div.about').length > 0 ||
      $('a[href*="/about"]').length > 0
    ),
    hasServices: !!(
      $('section#services, section.services, div#services, div.services').length > 0 ||
      $('a[href*="/services"]').length > 0
    ),
    hasContact: !!(
      $('section#contact, section.contact, div#contact, div.contact').length > 0 ||
      $('a[href*="/contact"]').length > 0
    ),
    hasTestimonials: !!(
      $('section.testimonials, div.testimonials, .testimonial, .review').length > 0
    ),
    hasPortfolio: !!(
      $('a[href*="/portfolio"], a[href*="/work"], a[href*="/projects"]').length > 0
    )
  };

  // Call to action elements
  const ctaButtons = $('a.btn, button, a.cta, .button, [class*="button"]')
    .map((i, el) => $(el).text().trim())
    .get()
    .filter(text => text.length > 0 && text.length < 50);

  // Contact information
  const contactInfo = extractContactInfo($);

  return {
    wordCount,
    wordCountAdequate: wordCount >= 300,
    mainHeadline,

    hasBlog,
    blogPosts,
    blogPostCount: blogPosts.length,

    sections,
    completeness: Object.values(sections).filter(Boolean).length / Object.keys(sections).length,

    ctaButtons,
    ctaCount: ctaButtons.length,
    hasCTA: ctaButtons.length > 0,

    contactInfo
  };
}

/**
 * Extract social media data
 */
export function extractSocialData($) {
  const socialLinks = {
    facebook: null,
    instagram: null,
    twitter: null,
    linkedin: null,
    youtube: null,
    tiktok: null,
    pinterest: null
  };

  // Find social media links
  $('a[href]').each((i, el) => {
    const href = $(el).attr('href') || '';

    if (href.includes('facebook.com')) {
      socialLinks.facebook = href;
    } else if (href.includes('instagram.com')) {
      socialLinks.instagram = href;
    } else if (href.includes('twitter.com') || href.includes('x.com')) {
      socialLinks.twitter = href;
    } else if (href.includes('linkedin.com')) {
      socialLinks.linkedin = href;
    } else if (href.includes('youtube.com')) {
      socialLinks.youtube = href;
    } else if (href.includes('tiktok.com')) {
      socialLinks.tiktok = href;
    } else if (href.includes('pinterest.com')) {
      socialLinks.pinterest = href;
    }
  });

  // Count how many platforms are present
  const platformsPresent = Object.entries(socialLinks)
    .filter(([_, url]) => url !== null)
    .map(([platform, _]) => platform);

  return {
    links: socialLinks,
    platformsPresent,
    platformCount: platformsPresent.length,
    hasSocialPresence: platformsPresent.length > 0
  };
}

/**
 * Analyze page structure
 */
function analyzeStructure($) {
  return {
    hasNav: $('nav, header nav, .navbar, .navigation').length > 0,
    hasHeader: $('header').length > 0,
    hasFooter: $('footer').length > 0,
    hasSidebar: $('aside, .sidebar').length > 0,

    sectionCount: $('section').length,
    articleCount: $('article').length,
    formCount: $('form').length,

    // Semantic HTML usage
    usesSemanticHTML: !!(
      $('header').length > 0 &&
      $('footer').length > 0 &&
      $('nav').length > 0
    )
  };
}

/**
 * Analyze images
 */
function analyzeImages($) {
  const images = $('img');
  const totalImages = images.length;

  let imagesWithAlt = 0;
  let imagesWithoutAlt = 0;

  images.each((i, el) => {
    const alt = $(el).attr('alt');
    if (alt && alt.trim().length > 0) {
      imagesWithAlt++;
    } else {
      imagesWithoutAlt++;
    }
  });

  return {
    totalImages,
    imagesWithAlt,
    imagesWithoutAlt,
    altTextCoverage: totalImages > 0 ? (imagesWithAlt / totalImages) * 100 : 100,
    allImagesHaveAlt: imagesWithoutAlt === 0
  };
}

/**
 * Analyze links
 */
function analyzeLinks($, baseUrl) {
  const links = $('a[href]');
  const totalLinks = links.length;

  let internalLinks = 0;
  let externalLinks = 0;
  let brokenLinks = 0;

  const domain = baseUrl ? new URL(baseUrl).hostname : '';

  links.each((i, el) => {
    const href = $(el).attr('href') || '';

    // Skip empty, anchor, and javascript links
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) {
      return;
    }

    // Check if external
    if (href.startsWith('http')) {
      try {
        const linkDomain = new URL(href).hostname;
        if (linkDomain === domain) {
          internalLinks++;
        } else {
          externalLinks++;
        }
      } catch (e) {
        brokenLinks++;
      }
    } else {
      internalLinks++;
    }
  });

  return {
    totalLinks,
    internalLinks,
    externalLinks,
    brokenLinks
  };
}

/**
 * Extract blog posts from page
 */
function extractBlogPosts($) {
  const posts = [];

  // Try multiple selectors for blog posts
  const postSelectors = [
    'article',
    '.blog-post',
    '.post',
    '.entry',
    '[class*="blog-item"]'
  ];

  for (const selector of postSelectors) {
    $(selector).slice(0, 10).each((i, el) => {
      const $post = $(el);

      const title = $post.find('h1, h2, h3, .title, .post-title').first().text().trim();
      const excerpt = $post.find('p, .excerpt, .description').first().text().trim().slice(0, 200);
      const link = $post.find('a').first().attr('href');

      if (title) {
        posts.push({ title, excerpt, link });
      }
    });

    if (posts.length > 0) break;
  }

  return posts;
}

/**
 * Extract contact information
 */
function extractContactInfo($) {
  const contactInfo = {
    emails: [],
    phones: [],
    addresses: []
  };

  const bodyText = $('body').text();

  // Extract emails (simple regex)
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
  const emails = bodyText.match(emailRegex) || [];
  contactInfo.emails = [...new Set(emails)].slice(0, 5);

  // Extract phone numbers (US format)
  const phoneRegex = /(\+?1?\s*\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/g;
  const phones = bodyText.match(phoneRegex) || [];
  contactInfo.phones = [...new Set(phones)].slice(0, 3);

  return contactInfo;
}

/**
 * Count words in text
 */
function countWords(text) {
  return text.split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Get content summary for analysis
 */
export function getContentSummary(parsedData) {
  const { content, seo } = parsedData;

  const summary = [];

  summary.push(`Homepage Headline: "${content.mainHeadline || 'None'}"`);
  summary.push(`Word Count: ${content.wordCount}`);

  if (content.hasBlog) {
    summary.push(`Blog: ${content.blogPostCount} posts found`);
  } else {
    summary.push('Blog: Not found');
  }

  summary.push(`Sections: ${Object.entries(content.sections).filter(([_, v]) => v).map(([k, _]) => k).join(', ')}`);
  summary.push(`CTAs: ${content.ctaCount} call-to-action buttons`);

  return summary.join('\n');
}
