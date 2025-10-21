/**
 * SEO Analyzer - Uses Grok-4-fast to analyze technical SEO
 *
 * Cost: ~$0.006 per analysis
 * Analyzes: meta tags, headings, URLs, images, page speed, schema
 */

import { loadPrompt } from '../shared/prompt-loader.js';
import { callAI, parseJSONResponse } from '../shared/ai-client.js';
import * as cheerio from 'cheerio';

/**
 * Analyze SEO using Grok-4-fast
 *
 * @param {string} url - Website URL
 * @param {string} html - Full HTML content
 * @param {object} context - Additional context
 * @param {string} context.company_name - Company name
 * @param {string} context.industry - Industry type
 * @param {number} context.load_time - Page load time in seconds
 * @param {object} context.meta_info - Meta information from page
 * @param {object} customPrompt - Custom prompt configuration (optional)
 * @returns {Promise<object>} SEO analysis results
 */
export async function analyzeSEO(url, html, context = {}, customPrompt = null) {
  try {
    // Extract SEO-relevant data from HTML (for metadata storage)
    const $ = cheerio.load(html);
    const seoData = extractSEOData($, url);

    // Truncate HTML to ~10KB to avoid excessive tokens
    // Focus on <head> + first ~8KB of <body>
    const truncatedHTML = truncateHTML(html);

    // Variables for prompt substitution
    const variables = {
      url: url,
      industry: context.industry || 'unknown industry',
      load_time: context.load_time ? String(context.load_time) : 'unknown',
      tech_stack: context.tech_stack || 'unknown',
      html: truncatedHTML
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
        userPrompt: substituteVariables(customPrompt.userPromptTemplate, variables, customPrompt.variables),
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

    // Add metadata
    return {
      ...result,
      _meta: {
        analyzer: 'seo',
        model: prompt.model,
        cost: response.cost,
        timestamp: new Date().toISOString(),
        seoData: seoData  // Include raw SEO data for debugging
      }
    };

  } catch (error) {
    console.error('SEO analysis failed:', error);

    // Return graceful degradation
    return {
      seoScore: 50,
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
        error: error.message,
        timestamp: new Date().toISOString()
      }
    };
  }
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
