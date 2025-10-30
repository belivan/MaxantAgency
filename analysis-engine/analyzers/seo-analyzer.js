/**
 * SEO Analyzer - Uses gpt-5-mini to analyze technical SEO
 *
 * Cost: ~$0.006 per analysis
 * Analyzes: meta tags, headings, URLs, images, page speed, schema
 */

import { loadPrompt } from '../shared/prompt-loader.js';
import { callAI, parseJSONResponse } from '../../database-tools/shared/ai-client.js';
import * as cheerio from 'cheerio';

/**
 * Analyze SEO using Grok-4-fast (Multi-page version)
 *
 * @param {array} pages - Array of page objects
 * @param {string} pages[].url - Page URL (relative path)
 * @param {string} pages[].fullUrl - Full URL
 * @param {string} pages[].html - Full HTML content
 * @param {object} pages[].metadata - Page metadata (title, loadTime, etc.)
 * @param {object} context - Additional context
 * @param {string} context.company_name - Company name
 * @param {string} context.industry - Industry type
 * @param {string} context.baseUrl - Base website URL
 * @param {object} customPrompt - Custom prompt configuration (optional)
 * @returns {Promise<object>} SEO analysis results (aggregated from all pages)
 */
export async function analyzeSEO(pages, context = {}, customPrompt = null) {
  try {
    console.log(`[SEO Analyzer] Analyzing ${pages.length} pages for SEO issues...`);

    // Extract SEO data from all pages
    const pagesData = pages.map(page => {
      const $ = cheerio.load(page.html);
      const seoData = extractSEOData($, page.fullUrl || page.url);
      const truncatedHTML = truncateHTML(page.html);

      return {
        url: page.url,
        fullUrl: page.fullUrl || page.url,
        title: page.metadata?.title || seoData.title,
        loadTime: page.metadata?.loadTime || null,
        seoData,
        truncatedHTML
      };
    });

    // Detect site-wide issues (including discovery issues)
    const siteWideIssues = detectSiteWideIssues(pagesData, context);

    // Build multi-page summary for AI
    const pagesSummary = pagesData.map(p => ({
      url: p.url,
      title: p.seoData.title,
      metaDescription: p.seoData.metaDescription,
      headingStructure: p.seoData.headingStructure,
      h1Count: p.seoData.h1Count,
      imageCount: p.seoData.imageCount,
      imagesWithoutAlt: p.seoData.imagesWithoutAlt,
      hasSchema: p.seoData.hasSchema,
      hasOG: p.seoData.hasOG,
      hasCanonical: p.seoData.hasCanonical,
      hasViewport: p.seoData.hasViewport,
      urlStructure: p.seoData.urlStructure
    }));

    // Include first 2 pages' full HTML for detailed analysis
    const detailedPages = pagesData.slice(0, 2).map(p => ({
      url: p.url,
      html: p.truncatedHTML
    }));

    // Variables for prompt substitution
    const variables = {
      // Old prompt compatibility (single-page format)
      url: context.baseUrl || pages[0]?.fullUrl || 'unknown',
      industry: context.industry || 'unknown industry',
      load_time: 'multi-page-analysis',
      tech_stack: context.tech_stack || 'unknown',
      html: detailedPages.length > 0 ? detailedPages[0].html : '',
      // New multi-page variables
      baseUrl: context.baseUrl || pages[0]?.fullUrl || 'unknown',
      pageCount: String(pages.length),
      pagesSummary: JSON.stringify(pagesSummary, null, 2),
      detailedPages: JSON.stringify(detailedPages, null, 2),
      siteWideIssues: JSON.stringify(siteWideIssues, null, 2)
    };

    // Use custom prompt if provided, otherwise load default
    let prompt;
    if (customPrompt) {
      console.log('[SEO Analyzer] Using custom prompt configuration');
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
      prompt = await loadPrompt('web-design/seo-analysis', variables);
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
    validateSEOResponse(result);
    const modelUsed = response.model || prompt.model;

    // Add site-wide issues to the results
    if (siteWideIssues.length > 0) {
      result.issues = [...siteWideIssues, ...(result.issues || [])];
    }

    // Add metadata
    return {
      ...result,
      model: prompt.model,
      _meta: {
        analyzer: 'seo',
        model: modelUsed,
        cost: response.cost,
        usage: response.usage || null,
        timestamp: new Date().toISOString(),
        pagesAnalyzed: pages.length,
        pagesData: pagesSummary  // Include summary for debugging
      }
    };

  } catch (error) {
    console.error('SEO analysis failed:', error);

    // Return graceful degradation
    const fallbackModel = customPrompt?.model || 'gpt-5-mini';
    return {
      model: fallbackModel,
      seoScore: 30,
      issues: [{
        category: 'error',
        severity: 'high',
        title: 'SEO analysis failed',
        description: `Unable to analyze SEO: ${error.message}`,
        impact: 'Cannot provide SEO recommendations',
        recommendation: 'Manual SEO audit recommended',
        priority: 'high'
      }],
      opportunities: [],
      quickWins: [],
      _meta: {
        analyzer: 'seo',
        model: fallbackModel,
        error: error.message,
        timestamp: new Date().toISOString()
      }
    };
  }
}

/**
 * LEGACY: Analyze single page SEO (backward compatibility)
 * Use analyzeSEO() with array for new implementations
 */
export async function analyzeSEOSinglePage(url, html, context = {}, customPrompt = null) {
  const pages = [{
    url: url,
    fullUrl: url,
    html: html,
    metadata: {
      title: null,
      loadTime: context.load_time || null
    }
  }];

  return analyzeSEO(pages, { ...context, baseUrl: url }, customPrompt);
}

/**
 * Extract SEO-relevant data from HTML
 */
function extractSEOData($, url) {
  // Title tag
  const title = $('title').text().trim() || 'No title';

  // Meta description
  const metaDescription = $('meta[name="description"]').attr('content') || 'Missing';

  // Heading structure
  const h1Count = $('h1').length;
  const h2Count = $('h2').length;
  const h3Count = $('h3').length;
  const headingStructure = `H1: ${h1Count}, H2: ${h2Count}, H3: ${h3Count}`;

  // Images
  const images = $('img');
  const imageCount = images.length;
  const imagesWithoutAlt = images.filter((_, img) => !$(img).attr('alt')).length;

  // Schema markup
  const hasSchema = $('script[type="application/ld+json"]').length > 0;

  // URL structure
  const urlStructure = analyzeURLStructure(url);

  // Open Graph tags
  const hasOG = $('meta[property^="og:"]').length > 0;

  // Canonical tag
  const hasCanonical = $('link[rel="canonical"]').length > 0;

  // Viewport tag (mobile-friendly)
  const hasViewport = $('meta[name="viewport"]').length > 0;

  return {
    title,
    metaDescription,
    headingStructure,
    h1Count,
    h2Count,
    h3Count,
    imageCount,
    imagesWithoutAlt,
    hasSchema,
    urlStructure,
    hasOG,
    hasCanonical,
    hasViewport
  };
}

/**
 * Truncate HTML to reasonable size for AI analysis
 * Keep <head> in full, truncate <body> to ~8KB
 */
function truncateHTML(html) {
  const maxLength = 10000; // ~10KB

  if (html.length <= maxLength) {
    return html;
  }

  // Try to extract full <head> and partial <body>
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);

  if (headMatch && bodyMatch) {
    const head = headMatch[0];
    const bodyContent = bodyMatch[1];

    // Calculate remaining space for body
    const remainingSpace = maxLength - head.length - 100; // Reserve 100 chars for tags

    if (remainingSpace > 1000) {
      const truncatedBody = bodyContent.substring(0, remainingSpace);
      return `<html>${head}<body>${truncatedBody}\n... [truncated]</body></html>`;
    }
  }

  // Fallback: just truncate everything
  return html.substring(0, maxLength) + '\n... [truncated]';
}

/**
 * Analyze URL structure
 */
function analyzeURLStructure(url) {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;

    // Check for SEO-friendly patterns
    const hasDashes = path.includes('-');
    const hasUnderscores = path.includes('_');
    const depth = path.split('/').filter(Boolean).length;

    let assessment = 'Clean';
    if (hasUnderscores) assessment = 'Uses underscores (hyphens preferred)';
    if (depth > 4) assessment = 'Deep URL structure (4+ levels)';
    if (path.includes('?')) assessment = 'Query parameters in URL';

    return assessment;
  } catch {
    return 'Invalid URL';
  }
}

/**
 * Detect site-wide SEO issues across multiple pages
 */
function detectSiteWideIssues(pagesData, context = {}) {
  const issues = [];

  // Check for missing sitemap.xml (CRITICAL SEO ISSUE)
  if (context.discovery_status && !context.discovery_status.has_sitemap) {
    issues.push({
      category: 'site-wide',
      severity: 'critical',
      title: 'No sitemap.xml found',
      description: 'The website is missing a sitemap.xml file, which is essential for search engine crawling and indexing',
      impact: 'Search engines may not discover all pages, leading to poor indexing and lost organic traffic',
      recommendation: 'Create and submit a sitemap.xml file listing all important pages. Submit it to Google Search Console and Bing Webmaster Tools',
      priority: 'critical',
      technical_details: context.discovery_status.sitemap_error || 'File not found at standard locations (/sitemap.xml, /sitemap_index.xml)'
    });
  }

  // Check for missing robots.txt (HIGH SEO ISSUE)
  if (context.discovery_status && !context.discovery_status.has_robots) {
    issues.push({
      category: 'site-wide',
      severity: 'high',
      title: 'No robots.txt file found',
      description: 'The website is missing a robots.txt file, which helps control search engine crawling behavior',
      impact: 'Cannot provide crawl directives to search engines, may result in crawling of unintended pages or missed important pages',
      recommendation: 'Create a robots.txt file with appropriate crawl directives and sitemap location',
      priority: 'high',
      technical_details: context.discovery_status.robots_error || 'File not found at /robots.txt'
    });
  }

  // Check for duplicate titles
  const titles = {};
  pagesData.forEach(page => {
    const title = page.seoData.title;
    if (title && title !== 'No title') {
      if (titles[title]) {
        titles[title].push(page.url);
      } else {
        titles[title] = [page.url];
      }
    }
  });

  const duplicateTitles = Object.entries(titles).filter(([_, urls]) => urls.length > 1);
  if (duplicateTitles.length > 0) {
    issues.push({
      category: 'site-wide',
      severity: 'high',
      title: 'Duplicate page titles detected',
      description: `${duplicateTitles.length} title(s) are used on multiple pages, which hurts SEO`,
      impact: 'Search engines may have difficulty distinguishing between pages',
      recommendation: 'Make each page title unique and descriptive',
      priority: 'high',
      affectedPages: duplicateTitles.map(([title, urls]) => ({ title, urls }))
    });
  }

  // Check for missing meta descriptions
  const missingDescriptions = pagesData.filter(p =>
    p.seoData.metaDescription === 'Missing' || !p.seoData.metaDescription
  );

  if (missingDescriptions.length > 0) {
    issues.push({
      category: 'site-wide',
      severity: 'medium',
      title: `Missing meta descriptions on ${missingDescriptions.length} page(s)`,
      description: 'Meta descriptions improve click-through rates from search results',
      impact: 'Lower CTR from search results, missed opportunity for conversions',
      recommendation: 'Add unique, compelling meta descriptions to all pages',
      priority: 'medium',
      affectedPages: missingDescriptions.map(p => p.url)
    });
  }

  // Check for missing schema markup
  const missingSchema = pagesData.filter(p => !p.seoData.hasSchema);
  if (missingSchema.length === pagesData.length) {
    issues.push({
      category: 'site-wide',
      severity: 'medium',
      title: 'No structured data (schema.org) found on any page',
      description: 'Schema markup helps search engines understand your content better',
      impact: 'Missing rich snippets in search results (reviews, ratings, prices)',
      recommendation: 'Add JSON-LD structured data appropriate for your business type',
      priority: 'medium'
    });
  }

  // Check for missing Open Graph tags
  const missingOG = pagesData.filter(p => !p.seoData.hasOG);
  if (missingOG.length === pagesData.length) {
    issues.push({
      category: 'site-wide',
      severity: 'low',
      title: 'No Open Graph meta tags found',
      description: 'OG tags control how your pages appear when shared on social media',
      impact: 'Poor social media previews when pages are shared',
      recommendation: 'Add og:title, og:description, and og:image tags',
      priority: 'medium'
    });
  }

  // Check for missing viewport tags (mobile-friendliness)
  const missingViewport = pagesData.filter(p => !p.seoData.hasViewport);
  if (missingViewport.length === pagesData.length) {
    issues.push({
      category: 'site-wide',
      severity: 'critical',
      title: 'Website is not mobile-friendly',
      description: 'No viewport meta tag found on any page',
      impact: 'Poor mobile experience, lower rankings in mobile search',
      recommendation: 'Add <meta name="viewport" content="width=device-width, initial-scale=1.0">',
      priority: 'critical'
    });
  }

  // Check for pages with multiple H1 tags
  const multipleH1 = pagesData.filter(p => p.seoData.h1Count > 1);
  if (multipleH1.length > 0) {
    issues.push({
      category: 'site-wide',
      severity: 'medium',
      title: `${multipleH1.length} page(s) have multiple H1 tags`,
      description: 'Each page should have exactly one H1 tag for best SEO',
      impact: 'Diluted page topic signal to search engines',
      recommendation: 'Use only one H1 per page, use H2-H6 for subheadings',
      priority: 'medium',
      affectedPages: multipleH1.map(p => ({ url: p.url, h1Count: p.seoData.h1Count }))
    });
  }

  // Check for pages with no H1 tag
  const noH1 = pagesData.filter(p => p.seoData.h1Count === 0);
  if (noH1.length > 0) {
    issues.push({
      category: 'site-wide',
      severity: 'high',
      title: `${noH1.length} page(s) missing H1 tag`,
      description: 'Every page should have an H1 tag describing the main topic',
      impact: 'Search engines may have difficulty understanding page content',
      recommendation: 'Add descriptive H1 tag to each page',
      priority: 'high',
      affectedPages: noH1.map(p => p.url)
    });
  }

  // Check for images without alt text
  const totalImages = pagesData.reduce((sum, p) => sum + p.seoData.imageCount, 0);
  const totalMissingAlt = pagesData.reduce((sum, p) => sum + p.seoData.imagesWithoutAlt, 0);

  if (totalMissingAlt > 0) {
    const percentageMissing = Math.round((totalMissingAlt / totalImages) * 100);
    issues.push({
      category: 'site-wide',
      severity: percentageMissing > 50 ? 'high' : 'medium',
      title: `${totalMissingAlt} of ${totalImages} images missing alt text (${percentageMissing}%)`,
      description: 'Alt text improves accessibility and helps images rank in search',
      impact: 'Poor accessibility, missed image SEO opportunities',
      recommendation: 'Add descriptive alt text to all images',
      priority: 'medium'
    });
  }

  return issues;
}

/**
 * Validate SEO analysis response
 */
function validateSEOResponse(result) {
  const required = ['seoScore', 'issues', 'opportunities'];

  for (const field of required) {
    if (!(field in result)) {
      throw new Error(`SEO response missing required field: ${field}`);
    }
  }

  if (typeof result.seoScore !== 'number' ||
      result.seoScore < 0 ||
      result.seoScore > 100) {
    throw new Error('seoScore must be number between 0-100');
  }

  if (!Array.isArray(result.issues)) {
    throw new Error('issues must be an array');
  }

  if (!Array.isArray(result.opportunities)) {
    throw new Error('opportunities must be an array');
  }
}

/**
 * Count high-priority SEO issues
 */
export function countCriticalSEOIssues(seoResults) {
  if (!seoResults || !seoResults.issues) return 0;

  return seoResults.issues.filter(issue =>
    issue.severity === 'critical' || issue.priority === 'high'
  ).length;
}

export default {
  analyzeSEO,
  countCriticalSEOIssues
};
