/**
 * Content Analyzer - Uses Grok-4-fast to analyze content quality and completeness
 *
 * Cost: ~$0.006 per analysis
 * Analyzes: copy quality, blog posts, testimonials, CTAs, engagement hooks
 */

import { loadPrompt } from '../shared/prompt-loader.js';
import { callAI, parseJSONResponse } from '../shared/ai-client.js';
import * as cheerio from 'cheerio';

/**
 * Analyze content using Grok-4-fast (Multi-page version)
 *
 * @param {array} pages - Array of page objects
 * @param {string} pages[].url - Page URL (relative path)
 * @param {string} pages[].fullUrl - Full URL
 * @param {string} pages[].html - Full HTML content
 * @param {object} pages[].metadata - Page metadata
 * @param {object} context - Additional context
 * @param {string} context.company_name - Company name
 * @param {string} context.industry - Industry type
 * @param {string} context.baseUrl - Base website URL
 * @param {object} customPrompt - Custom prompt configuration (optional)
 * @returns {Promise<object>} Content analysis results (aggregated from all pages)
 */
export async function analyzeContent(pages, context = {}, customPrompt = null) {
  try {
    console.log(`[Content Analyzer] Analyzing content across ${pages.length} pages...`);

    // Extract content data from all pages
    const pagesData = pages.map(page => {
      const $ = cheerio.load(page.html);
      const contentData = extractContentData($, page.fullUrl || page.url);

      return {
        url: page.url,
        fullUrl: page.fullUrl || page.url,
        title: page.metadata?.title || contentData.headline,
        contentData
      };
    });

    // Detect site-wide content patterns
    const siteWidePatterns = detectSiteWideContentPatterns(pagesData);

    // Build multi-page summary for AI
    const pagesSummary = pagesData.map(p => ({
      url: p.url,
      headline: p.contentData.headline,
      valueProposition: p.contentData.valueProposition,
      ctaCount: p.contentData.ctaCount,
      wordCount: p.contentData.wordCount,
      hasTestimonials: p.contentData.hasTestimonials,
      testimonialCount: p.contentData.testimonialCount,
      hasAboutSection: p.contentData.hasAboutSection,
      hasServicesSection: p.contentData.hasServicesSection
    }));

    // Aggregate blog posts from all pages
    const allBlogPosts = [];
    pagesData.forEach(p => {
      if (p.contentData.blogPosts && p.contentData.blogPosts.length > 0) {
        allBlogPosts.push(...p.contentData.blogPosts);
      }
    });

    // Deduplicate blog posts by title
    const uniqueBlogPosts = Array.from(
      new Map(allBlogPosts.map(post => [post.title, post])).values()
    );

    // Variables for prompt substitution
    const variables = {
      company_name: context.company_name || 'this business',
      industry: context.industry || 'unknown industry',
      baseUrl: context.baseUrl || pages[0]?.fullUrl || 'unknown',
      pageCount: String(pages.length),
      pagesSummary: JSON.stringify(pagesSummary, null, 2),
      blogPosts: formatBlogPosts(uniqueBlogPosts),
      siteWidePatterns: JSON.stringify(siteWidePatterns, null, 2),
      totalWordCount: String(pagesData.reduce((sum, p) => sum + p.contentData.wordCount, 0)),
      totalCTAs: String(pagesData.reduce((sum, p) => sum + p.contentData.ctaCount, 0)),
      totalTestimonials: String(pagesData.reduce((sum, p) => sum + p.contentData.testimonialCount, 0))
    };

    // Use custom prompt if provided, otherwise load default
    let prompt;
    if (customPrompt) {
      console.log('[Content Analyzer] Using custom prompt configuration');
      const { substituteVariables } = await import('../shared/prompt-loader.js');
      prompt = {
        name: customPrompt.name,
        model: customPrompt.model,
        temperature: customPrompt.temperature,
        systemPrompt: customPrompt.systemPrompt,
        userPrompt: substituteVariables(customPrompt.userPromptTemplate, variables, customPrompt.variables),
        outputFormat: customPrompt.outputFormat
      };
    } else {
      prompt = await loadPrompt('web-design/content-analysis', variables);
    }

    // Call Grok-4-fast API
    const response = await callAI({
      model: prompt.model,
      systemPrompt: prompt.systemPrompt,
      userPrompt: prompt.userPrompt,
      temperature: prompt.temperature,
      jsonMode: true
    });

    // Parse JSON response
    const result = parseJSONResponse(response.content);

    // Validate response
    validateContentResponse(result);

    // Add site-wide patterns to the results
    if (siteWidePatterns.issues && siteWidePatterns.issues.length > 0) {
      result.issues = [...siteWidePatterns.issues, ...(result.issues || [])];
    }

    // Add metadata
    return {
      ...result,
      _meta: {
        analyzer: 'content',
        model: prompt.model,
        cost: response.cost,
        timestamp: new Date().toISOString(),
        pagesAnalyzed: pages.length,
        pagesData: pagesSummary  // Include summary for debugging
      }
    };

  } catch (error) {
    console.error('Content analysis failed:', error);

    // Return graceful degradation
    return {
      contentScore: 50,
      issues: [{
        category: 'error',
        severity: 'high',
        title: 'Content analysis failed',
        description: `Unable to analyze content: ${error.message}`,
        impact: 'Cannot provide content recommendations',
        recommendation: 'Manual content audit recommended',
        priority: 'high'
      }],
      engagementHooks: [],
      _meta: {
        analyzer: 'content',
        error: error.message,
        timestamp: new Date().toISOString()
      }
    };
  }
}

/**
 * LEGACY: Analyze single page content (backward compatibility)
 * Use analyzeContent() with array for new implementations
 */
export async function analyzeContentSinglePage(url, html, context = {}, customPrompt = null) {
  const pages = [{
    url: url,
    fullUrl: url,
    html: html,
    metadata: {
      title: null
    }
  }];

  return analyzeContent(pages, { ...context, baseUrl: url }, customPrompt);
}

/**
 * Extract content data from HTML
 */
function extractContentData($, url) {
  // Homepage headline (H1)
  const headline = $('h1').first().text().trim() || 'No headline found';

  // Value proposition (first paragraph or tagline)
  const firstP = $('p').first().text().trim();
  const valueProposition = firstP.length > 20 && firstP.length < 200
    ? firstP
    : 'Not found';

  // Count CTAs (buttons, links with action words)
  const ctaSelectors = [
    'button',
    'a[href*="contact"]',
    'a[href*="book"]',
    'a[href*="schedule"]',
    'a[href*="quote"]',
    'a.cta',
    'a.btn',
    '.call-to-action'
  ];
  const ctaCount = ctaSelectors.reduce((count, selector) => {
    return count + $(selector).length;
  }, 0);

  // Word count (approximate)
  const bodyText = $('body').text();
  const wordCount = bodyText.split(/\s+/).filter(Boolean).length;

  // Testimonials
  const testimonialSelectors = [
    '.testimonial',
    '.review',
    '[class*="testimonial"]',
    '[class*="review"]',
    'blockquote'
  ];
  let testimonialCount = 0;
  testimonialSelectors.forEach(selector => {
    testimonialCount += $(selector).length;
  });
  const hasTestimonials = testimonialCount > 0;

  // Blog posts (look for blog/news links)
  const blogPosts = extractBlogPosts($);

  // About us section
  const hasAboutSection = $('section:contains("About")').length > 0 ||
                         $('[id*="about"]').length > 0 ||
                         $('[class*="about"]').length > 0;

  // Services/Products section
  const hasServicesSection = $('section:contains("Service")').length > 0 ||
                             $('[id*="service"]').length > 0 ||
                             $('[class*="service"]').length > 0;

  return {
    headline,
    valueProposition,
    ctaCount,
    wordCount,
    hasTestimonials,
    testimonialCount,
    blogPosts,
    hasAboutSection,
    hasServicesSection
  };
}

/**
 * Extract blog posts from page
 */
function extractBlogPosts($) {
  const posts = [];

  // Look for blog post links
  const blogLinks = $('a[href*="blog"], a[href*="news"], a[href*="article"], .post, .blog-post');

  blogLinks.slice(0, 5).each((_, elem) => {
    const $elem = $(elem);
    const title = $elem.text().trim();
    const href = $elem.attr('href');

    if (title && title.length > 10 && title.length < 200) {
      posts.push({
        title,
        url: href || 'unknown'
      });
    }
  });

  return posts;
}

/**
 * Format blog posts for prompt
 */
function formatBlogPosts(posts) {
  if (!posts || posts.length === 0) {
    return 'No blog posts found';
  }

  return posts.map((post, idx) => {
    return `${idx + 1}. ${post.title}`;
  }).join('\n');
}

/**
 * Format content summary for prompt
 */
function formatContentSummary(contentData) {
  const parts = [];

  if (contentData.headline) {
    parts.push(`Homepage Headline: "${contentData.headline}"`);
  }

  if (contentData.valueProposition && contentData.valueProposition !== 'Not found') {
    parts.push(`Value Proposition: "${contentData.valueProposition}"`);
  }

  parts.push(`Word Count: ~${contentData.wordCount} words`);
  parts.push(`CTAs Found: ${contentData.ctaCount}`);
  parts.push(`Testimonials: ${contentData.testimonialCount > 0 ? `Yes (${contentData.testimonialCount})` : 'No'}`);

  return parts.join('\n');
}

/**
 * Format key pages summary for prompt
 */
function formatKeyPages(contentData) {
  const pages = [];

  if (contentData.hasAboutSection) {
    pages.push('- About section: Present');
  } else {
    pages.push('- About section: Missing');
  }

  if (contentData.hasServicesSection) {
    pages.push('- Services section: Present');
  } else {
    pages.push('- Services section: Missing');
  }

  if (pages.length === 0) {
    return 'No key pages detected';
  }

  return pages.join('\n');
}

/**
 * Detect site-wide content patterns across multiple pages
 */
function detectSiteWideContentPatterns(pagesData) {
  const issues = [];
  const strengths = [];

  // Check for consistent messaging
  const headlines = pagesData.map(p => p.contentData.headline).filter(h => h && h !== 'No headline found');

  // Check for pages with weak/missing value propositions
  const weakValueProps = pagesData.filter(p =>
    p.contentData.valueProposition === 'Not found' || !p.contentData.valueProposition
  );

  if (weakValueProps.length > 0) {
    issues.push({
      category: 'messaging',
      severity: 'medium',
      title: `${weakValueProps.length} page(s) missing clear value proposition`,
      description: 'Value proposition should be visible above the fold on key pages',
      impact: 'Visitors may not understand what you offer',
      recommendation: 'Add compelling value propositions to each key landing page',
      priority: 'medium',
      affectedPages: weakValueProps.map(p => p.url)
    });
  }

  // Check for pages with low word count (thin content)
  const thinContent = pagesData.filter(p => p.contentData.wordCount < 200);
  if (thinContent.length > 0) {
    issues.push({
      category: 'content-quality',
      severity: 'medium',
      title: `${thinContent.length} page(s) have thin content (<200 words)`,
      description: 'Pages with little content may not rank well in search engines',
      impact: 'Lower SEO rankings, less engagement',
      recommendation: 'Expand content with valuable information for visitors',
      priority: 'medium',
      affectedPages: thinContent.map(p => ({ url: p.url, wordCount: p.contentData.wordCount }))
    });
  }

  // Check for pages missing CTAs
  const noCTAs = pagesData.filter(p => p.contentData.ctaCount === 0);
  if (noCTAs.length > 0) {
    issues.push({
      category: 'conversion',
      severity: 'high',
      title: `${noCTAs.length} page(s) missing calls-to-action`,
      description: 'Every page should guide visitors toward the next step',
      impact: 'Missed conversion opportunities',
      recommendation: 'Add clear CTAs (contact, quote, book, etc.) to all key pages',
      priority: 'high',
      affectedPages: noCTAs.map(p => p.url)
    });
  }

  // Check if ANY page has testimonials (strength)
  const hasTestimonials = pagesData.some(p => p.contentData.hasTestimonials);
  if (hasTestimonials) {
    const totalTestimonials = pagesData.reduce((sum, p) => sum + p.contentData.testimonialCount, 0);
    strengths.push({
      category: 'social-proof',
      title: `${totalTestimonials} testimonials/reviews found`,
      description: 'Social proof helps build trust with potential customers'
    });
  } else {
    issues.push({
      category: 'social-proof',
      severity: 'medium',
      title: 'No testimonials or reviews found on any page',
      description: 'Testimonials build trust and credibility',
      impact: 'Missed opportunity to leverage social proof',
      recommendation: 'Add customer testimonials, reviews, or case studies',
      priority: 'medium'
    });
  }

  // Check for About section
  const hasAbout = pagesData.some(p => p.contentData.hasAboutSection);
  if (!hasAbout) {
    issues.push({
      category: 'trust-building',
      severity: 'medium',
      title: 'No About page or section found',
      description: 'About pages help visitors understand who you are',
      impact: 'Lower trust, harder to connect with potential customers',
      recommendation: 'Create an About page with your story, team, and mission',
      priority: 'medium'
    });
  }

  // Check for Services section
  const hasServices = pagesData.some(p => p.contentData.hasServicesSection);
  if (!hasServices) {
    issues.push({
      category: 'clarity',
      severity: 'high',
      title: 'No Services/Products section clearly identified',
      description: 'Visitors need to quickly understand what you offer',
      impact: 'Confusion about offerings, lost conversions',
      recommendation: 'Create clear Services or Products page/section',
      priority: 'high'
    });
  }

  // Calculate total content metrics
  const totalWords = pagesData.reduce((sum, p) => sum + p.contentData.wordCount, 0);
  const avgWordsPerPage = Math.round(totalWords / pagesData.length);

  return {
    issues,
    strengths,
    metrics: {
      totalWords,
      avgWordsPerPage,
      totalPages: pagesData.length,
      pagesWithTestimonials: pagesData.filter(p => p.contentData.hasTestimonials).length,
      pagesWithCTAs: pagesData.filter(p => p.contentData.ctaCount > 0).length
    }
  };
}

/**
 * Validate content analysis response
 */
function validateContentResponse(result) {
  const required = ['contentScore', 'issues', 'engagementHooks'];

  for (const field of required) {
    if (!(field in result)) {
      throw new Error(`Content response missing required field: ${field}`);
    }
  }

  if (typeof result.contentScore !== 'number' ||
      result.contentScore < 0 ||
      result.contentScore > 100) {
    throw new Error('contentScore must be number between 0-100');
  }

  if (!Array.isArray(result.issues)) {
    throw new Error('issues must be an array');
  }

  if (!Array.isArray(result.engagementHooks)) {
    throw new Error('engagementHooks must be an array');
  }
}

/**
 * Find best engagement hook for outreach
 */
export function getBestEngagementHook(contentResults) {
  if (!contentResults || !contentResults.engagementHooks || contentResults.engagementHooks.length === 0) {
    return null;
  }

  // Prioritize hooks with specific details
  const hooks = contentResults.engagementHooks;

  // Look for hooks mentioning recent blog posts or specific content
  const specificHooks = hooks.filter(hook =>
    hook.type === 'blog_mention' ||
    hook.type === 'recent_content' ||
    hook.specificity === 'high'
  );

  if (specificHooks.length > 0) {
    return specificHooks[0];
  }

  // Otherwise return first hook
  return hooks[0];
}

export default {
  analyzeContent,
  getBestEngagementHook
};
