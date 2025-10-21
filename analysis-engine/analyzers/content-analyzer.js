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
 * Analyze content using Grok-4-fast
 *
 * @param {string} url - Website URL
 * @param {string} html - Full HTML content
 * @param {object} context - Additional context
 * @param {string} context.company_name - Company name
 * @param {string} context.industry - Industry type
 * @param {object} context.blog_info - Blog information
 * @param {object} context.social_profiles - Social profile URLs
 * @param {object} customPrompt - Custom prompt configuration (optional)
 * @returns {Promise<object>} Content analysis results
 */
export async function analyzeContent(url, html, context = {}, customPrompt = null) {
  try {
    // Extract content data from HTML
    const $ = cheerio.load(html);
    const contentData = extractContentData($, url);

    // Format summaries for prompt
    const contentSummary = formatContentSummary(contentData);
    const blogPostsSummary = formatBlogPosts(contentData.blogPosts);
    const keyPagesSummary = formatKeyPages(contentData);

    // Variables for prompt substitution
    const variables = {
      company_name: context.company_name || 'this business',
      industry: context.industry || 'unknown industry',
      url: url,
      content_summary: contentSummary,
      blog_posts: blogPostsSummary,
      key_pages: keyPagesSummary
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

    // Add metadata
    return {
      ...result,
      _meta: {
        analyzer: 'content',
        model: prompt.model,
        cost: response.cost,
        timestamp: new Date().toISOString(),
        contentData: contentData  // Include raw content data
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
