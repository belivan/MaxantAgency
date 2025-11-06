/**
 * Unified Technical Analyzer - Combines SEO + Content analysis in ONE AI call
 *
 * Cost: ~$0.010 per analysis (down from $0.012 for separate calls)
 * Time: ~25s (down from ~30s for separate calls)
 *
 * Analyzes:
 * - SEO: meta tags, headings, images, URLs, schema, page speed
 * - Content: copy quality, blog posts, messaging, CTAs, engagement hooks
 * - Cross-cutting: heading hierarchy (affects both SEO and readability)
 */

import { loadPrompt } from '../shared/prompt-loader.js';
import { callAI, parseJSONResponse } from '../../database-tools/shared/ai-client.js';
import * as cheerio from 'cheerio';

/**
 * Analyze technical SEO + content in ONE AI call (Multi-page version)
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
 * @returns {Promise<object>} Unified technical analysis (SEO + Content)
 */
export async function analyzeUnifiedTechnical(pages, context = {}, customPrompt = null) {
  try {
    console.log(`[Unified Technical Analyzer] Analyzing ${pages.length} pages (SEO + Content in one call)...`);

    // Extract BOTH SEO and Content data from all pages
    const pagesData = pages.map(page => {
      const $ = cheerio.load(page.html);
      const seoData = extractSEOData($, page.fullUrl || page.url);
      const contentData = extractContentData($, page.fullUrl || page.url);
      const truncatedHTML = truncateHTML(page.html);

      return {
        url: page.url,
        fullUrl: page.fullUrl || page.url,
        title: page.metadata?.title || seoData.title,
        loadTime: page.metadata?.loadTime || null,
        seoData,
        contentData,
        truncatedHTML
      };
    });

    // Detect site-wide issues (SEO and Content patterns)
    const siteWideSEOIssues = detectSiteWideSEOIssues(pagesData, context);
    const siteWideContentPatterns = detectSiteWideContentPatterns(pagesData);

    // Build multi-page summary combining SEO and Content insights
    const pagesSummary = pagesData.map(p => ({
      url: p.url,
      // SEO data
      title: p.seoData.title,
      metaDescription: p.seoData.metaDescription,
      headingStructure: p.seoData.headingStructure,
      h1Count: p.seoData.h1Count,
      imageCount: p.seoData.imageCount,
      imagesWithoutAlt: p.seoData.imagesWithoutAlt,
      hasSchema: p.seoData.hasSchema,
      hasOG: p.seoData.hasOG,
      hasCanonical: p.seoData.hasCanonical,
      // Content data
      headline: p.contentData.headline,
      valueProposition: p.contentData.valueProposition,
      ctaCount: p.contentData.ctaCount,
      wordCount: p.contentData.wordCount,
      hasTestimonials: p.contentData.hasTestimonials,
      testimonialCount: p.contentData.testimonialCount
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

    // Include first 2 pages' full HTML for detailed analysis
    const detailedPages = pagesData.slice(0, 2).map(p => ({
      url: p.url,
      html: p.truncatedHTML
    }));

    // Variables for prompt substitution
    const variables = {
      company_name: context.company_name || 'this business',
      industry: context.industry || 'unknown industry',
      baseUrl: context.baseUrl || pages[0]?.fullUrl || 'unknown',
      tech_stack: context.tech_stack || 'unknown',
      pageCount: String(pages.length),
      pagesSummary: JSON.stringify(pagesSummary, null, 2),
      detailedPages: JSON.stringify(detailedPages, null, 2),
      blogPosts: formatBlogPosts(uniqueBlogPosts),
      siteWideSEOIssues: JSON.stringify(siteWideSEOIssues, null, 2),
      siteWideContentPatterns: JSON.stringify(siteWideContentPatterns, null, 2),
      totalWordCount: String(pagesData.reduce((sum, p) => sum + p.contentData.wordCount, 0)),
      totalCTAs: String(pagesData.reduce((sum, p) => sum + p.contentData.ctaCount, 0))
    };

    // Use custom prompt if provided, otherwise load default
    let prompt;
    if (customPrompt) {
      console.log('[Unified Technical Analyzer] Using custom prompt configuration');
      const { substituteVariables } = await import('../shared/prompt-loader.js');
      prompt = {
        name: customPrompt.name,
        model: customPrompt.model,
        temperature: customPrompt.temperature,
        systemPrompt: customPrompt.systemPrompt,
        userPrompt: await substituteVariables(customPrompt.userPromptTemplate, variables, customPrompt.variables),
        outputFormat: customPrompt.outputFormat
      };
    } else {
      prompt = await loadPrompt('web-design/unified-technical-analysis', variables);
    }

    // Call AI with unified technical analysis prompt
    const startTime = Date.now();
    const response = await callAI({
      model: prompt.model,
      systemPrompt: prompt.systemPrompt,
      userPrompt: prompt.userPrompt,
      temperature: prompt.temperature,
      jsonMode: true
    });

    const duration = Date.now() - startTime;
    console.log(`[Unified Technical Analyzer] AI response (${duration}ms, ${response.usage?.total_tokens || 0} tokens, $${response.cost?.toFixed(4) || '0.0000'})`);

    // Parse JSON response
    const result = await parseJSONResponse(response.content);
    validateUnifiedTechnicalResponse(result);

    // Return unified results
    return {
      model: response.model || prompt.model,

      // Unified scores
      overallTechnicalScore: result.overallTechnicalScore,
      seoScore: result.seoScore,
      contentScore: result.contentScore,

      // SEO-specific data
      seoIssues: result.seoIssues,
      seoOpportunities: result.seoOpportunities || [],
      seoStrengths: result.seoStrengths || [],

      // Content-specific data
      contentIssues: result.contentIssues,
      engagementHooks: result.engagementHooks || [],
      hasBlog: result.hasBlog || false,
      blogFrequency: result.blogFrequency || 'none',
      contentStrengths: result.contentStrengths || [],

      // Cross-cutting issues (affect both SEO and Content)
      crossCuttingIssues: result.crossCuttingIssues || [],

      // Legacy compatibility (combine all issues)
      issues: [
        ...result.seoIssues,
        ...result.contentIssues,
        ...(result.crossCuttingIssues || [])
      ],

      _meta: {
        analyzer: 'unified-technical',
        model: response.model || prompt.model,
        cost: response.cost || 0,
        timestamp: new Date().toISOString(),
        pagesAnalyzed: pages.length,
        blogPostsFound: uniqueBlogPosts.length
      }
    };

  } catch (error) {
    console.error('Unified technical analysis failed:', error);

    // Return graceful degradation
    const fallbackModel = customPrompt?.model || 'gpt-5-mini';
    return {
      model: fallbackModel,
      overallTechnicalScore: 40,
      seoScore: 40,
      contentScore: 40,
      seoIssues: [{
        category: 'error',
        title: 'Technical analysis failed',
        description: `Unable to analyze: ${error.message}`,
        priority: 'high',
      source: 'unified-technical-analyzer',
      source_type: 'technical'
      }],
      contentIssues: [],
      crossCuttingIssues: [],
      seoOpportunities: [],
      engagementHooks: [],
      hasBlog: false,
      blogFrequency: 'none',
      issues: [],
      _meta: {
        analyzer: 'unified-technical',
        model: fallbackModel,
        error: error.message,
        timestamp: new Date().toISOString()
      }
    };
  }
}

/**
 * Backward compatibility: Split unified results into SEO-only results
 */
export function getSEOResults(unifiedResults) {
  return {
    model: unifiedResults.model,
    seoScore: unifiedResults.seoScore,
    issues: unifiedResults.seoIssues,
    opportunities: unifiedResults.seoOpportunities,
    strengths: unifiedResults.seoStrengths,
    _meta: {
      ...unifiedResults._meta,
      analyzer: 'seo'
    }
  };
}

/**
 * Backward compatibility: Split unified results into Content-only results
 */
export function getContentResults(unifiedResults) {
  return {
    model: unifiedResults.model,
    contentScore: unifiedResults.contentScore,
    issues: unifiedResults.contentIssues,
    engagementHooks: unifiedResults.engagementHooks,
    hasBlog: unifiedResults.hasBlog,
    blogFrequency: unifiedResults.blogFrequency,
    strengths: unifiedResults.contentStrengths,
    _meta: {
      ...unifiedResults._meta,
      analyzer: 'content'
    }
  };
}

/**
 * Validate unified technical analysis response
 */
function validateUnifiedTechnicalResponse(result) {
  const required = ['overallTechnicalScore', 'seoScore', 'contentScore', 'seoIssues', 'contentIssues'];

  for (const field of required) {
    if (!(field in result)) {
      throw new Error(`Unified technical response missing required field: ${field}`);
    }
  }

  // Validate scores
  const scores = [result.overallTechnicalScore, result.seoScore, result.contentScore];
  scores.forEach((score, index) => {
    const fieldName = ['overallTechnicalScore', 'seoScore', 'contentScore'][index];
    if (typeof score !== 'number' || score < 0 || score > 100) {
      throw new Error(`${fieldName} must be number between 0-100`);
    }
  });

  // Validate issue arrays
  if (!Array.isArray(result.seoIssues)) {
    throw new Error('seoIssues must be an array');
  }
  if (!Array.isArray(result.contentIssues)) {
    throw new Error('contentIssues must be an array');
  }
}

// Import helper functions from existing analyzers
// (These are duplicated from seo-analyzer.js and content-analyzer.js)

function extractSEOData($, url) {
  // Same implementation as seo-analyzer.js
  return {
    title: $('title').text() || '',
    metaDescription: $('meta[name="description"]').attr('content') || '',
    h1Count: $('h1').length,
    headingStructure: `H1:${$('h1').length}, H2:${$('h2').length}, H3:${$('h3').length}`,
    imageCount: $('img').length,
    imagesWithoutAlt: $('img:not([alt])').length,
    hasSchema: $('[itemscope], script[type="application/ld+json"]').length > 0,
    hasOG: $('meta[property^="og:"]').length > 0,
    hasCanonical: $('link[rel="canonical"]').length > 0,
    hasViewport: $('meta[name="viewport"]').length > 0,
    urlStructure: url.length <= 75 ? 'good' : 'long'
  };
}

function extractContentData($, url) {
  // Same implementation as content-analyzer.js
  const bodyText = $('body').text().trim();
  const wordCount = bodyText.split(/\s+/).length;

  return {
    headline: $('h1').first().text() || $('title').text() || '',
    valueProposition: $('h2, .subtitle, .tagline').first().text() || '',
    wordCount,
    ctaCount: $('a:contains("Contact"), a:contains("Get Started"), a:contains("Sign Up"), button').length,
    hasTestimonials: $('[class*="testimonial"], [class*="review"]').length > 0,
    testimonialCount: $('[class*="testimonial"], [class*="review"]').length,
    hasAboutSection: $('a[href*="about"], [id*="about"]').length > 0,
    hasServicesSection: $('a[href*="services"], [id*="services"]').length > 0,
    blogPosts: extractBlogPosts($)
  };
}

function extractBlogPosts($) {
  const posts = [];
  $('article, [class*="post"], [class*="blog"]').slice(0, 10).each((i, elem) => {
    const title = $(elem).find('h1, h2, h3, .title, [class*="title"]').first().text().trim();
    const date = $(elem).find('time, .date, [class*="date"]').first().text().trim();
    if (title) {
      posts.push({ title, date: date || 'unknown' });
    }
  });
  return posts;
}

function detectSiteWideSEOIssues(pagesData, context) {
  const issues = [];

  // Check for duplicate titles
  const titles = pagesData.map(p => p.seoData.title);
  const uniqueTitles = new Set(titles);
  if (uniqueTitles.size < titles.length) {
    issues.push({
      type: 'duplicate_titles',
      message: 'Multiple pages share the same title tag',
      affectedPages: pagesData.length - uniqueTitles.size
    });
  }

  // Check for missing H1s
  const missingH1 = pagesData.filter(p => p.seoData.h1Count === 0);
  if (missingH1.length > 0) {
    issues.push({
      type: 'missing_h1',
      message: `${missingH1.length} pages missing H1 headings`,
      affectedPages: missingH1.map(p => p.url)
    });
  }

  return issues;
}

function detectSiteWideContentPatterns(pagesData) {
  const patterns = {};

  // Calculate average word count
  const avgWordCount = pagesData.reduce((sum, p) => sum + p.contentData.wordCount, 0) / pagesData.length;
  patterns.avgWordCount = Math.round(avgWordCount);

  // Count pages with CTAs
  const pagesWithCTAs = pagesData.filter(p => p.contentData.ctaCount > 0).length;
  patterns.ctaCoverage = `${pagesWithCTAs}/${pagesData.length} pages have CTAs`;

  return patterns;
}

function truncateHTML(html) {
  // Keep first 20KB of HTML (enough for analysis, not too much for token limits)
  return html.substring(0, 20000);
}

function formatBlogPosts(posts) {
  if (!posts || posts.length === 0) return 'No blog posts found';
  return posts.slice(0, 5).map(p => `- ${p.title} (${p.date})`).join('\n');
}

export default {
  analyzeUnifiedTechnical,
  getSEOResults,
  getContentResults
};
