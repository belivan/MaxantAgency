/**
 * Intelligent Page Selector - AI-powered selection of pages for analysis
 *
 * Uses Grok-4-fast to strategically select which pages to analyze for each module:
 * - SEO: Pages with diverse templates (homepage, product, blog, contact)
 * - Content: Pages with substantial copy (about, services, case studies)
 * - Visual: Pages showcasing design system (homepage, key landing pages)
 * - Social: Pages with social proof (about, team, testimonials)
 *
 * Cost: ~$0.001 per selection (negligible)
 * Time: 2-3 seconds
 */

import { callAI } from '../../database-tools/shared/ai-client.js';

/**
 * Select pages for analysis using AI
 *
 * @param {object} sitemap - Discovered sitemap from sitemap-discovery.js
 * @param {object} context - Business context (industry, company_name)
 * @param {object} options - Selection options
 * @returns {Promise<object>} Selected pages for each module
 */
export async function selectPagesForAnalysis(sitemap, context = {}, options = {}) {
  const {
    maxPagesPerModule = 5,
    model = 'grok-4-fast',
    temperature = 0.3
  } = options;

  console.log(`[Page Selector] Analyzing ${sitemap.totalPages} pages for ${context.industry || 'unknown'} industry...`);

  const startTime = Date.now();

  // Build the AI prompt
  const prompt = buildSelectionPrompt(sitemap, context, maxPagesPerModule);

  try {
    // Call AI for intelligent page selection
    const result = await callAI({
      model,
      temperature,
      systemPrompt: 'You are a web analysis strategist. Select the most valuable pages for each analysis type based on business context and page URLs.',
      userPrompt: prompt,
      jsonMode: true,
      maxTokens: 2000
    });

    // Parse AI response
    const selection = JSON.parse(result.content);

    // Validate and normalize selection
    const normalizedSelection = normalizeSelection(selection, sitemap);

    const selectionTime = Date.now() - startTime;
    console.log(`[Page Selector] AI selected pages in ${selectionTime}ms`);
    console.log(`[Page Selector] SEO: ${normalizedSelection.seo_pages.length} pages`);
    console.log(`[Page Selector] Content: ${normalizedSelection.content_pages.length} pages`);
    console.log(`[Page Selector] Visual: ${normalizedSelection.visual_pages.length} pages`);
    console.log(`[Page Selector] Social: ${normalizedSelection.social_pages.length} pages`);

    return {
      ...normalizedSelection,
      meta: {
        totalPagesDiscovered: sitemap.totalPages,
        selectionTime,
        model,
        cost: result.cost || 0.001
      }
    };

  } catch (error) {
    console.error('[Page Selector] AI selection failed:', error.message);
    // Fallback to rule-based selection
    return fallbackSelection(sitemap, maxPagesPerModule);
  }
}

/**
 * Build AI prompt for page selection
 */
function buildSelectionPrompt(sitemap, context, maxPagesPerModule) {
  const { industry = 'general', company_name = 'this business' } = context;

  // Format pages for AI
  const pagesList = sitemap.pages
    .slice(0, 100) // Limit to first 100 pages to avoid token limits
    .map((p, idx) => {
      const linkInfo = p.linkText ? ` | Link: "${p.linkText}"` : '';
      const typeInfo = p.type !== 'other' ? ` | Type: ${p.type}` : '';
      return `${idx + 1}. ${p.url}${typeInfo}${linkInfo}`;
    })
    .join('\n');

  return `You are analyzing a ${industry} website (${company_name}) for lead generation.

DISCOVERED PAGES (${sitemap.totalPages} total):
${pagesList}

YOUR TASK: Select up to ${maxPagesPerModule} pages for each analysis module.

ANALYSIS MODULES:

1. SEO Analysis - Technical SEO audit across diverse page types
   MUST include: Homepage (/)
   Priority: Different templates (product, blog, contact)

2. Content Analysis - Copywriting quality and messaging
   MUST include: Homepage (/)
   Priority: Pages with substantial copy

3. Visual Analysis - Design and UX evaluation
   MUST include: Homepage (/)
   Priority: Key landing pages, conversion pages

4. Social Proof - Trust signals and testimonials
   MUST include: Homepage (/)
   Priority: Pages with social proof

INDUSTRY PRIORITIES: ${getIndustryPriorities(industry)}

RULES:
- Homepage (/) MUST be in ALL modules
- Max ${maxPagesPerModule} pages per module
- Prioritize business-critical pages
- Avoid: Privacy policy, terms, archives

RETURN JSON:
{
  "seo_pages": ["/", "/pricing", ...],
  "content_pages": ["/", "/about", ...],
  "visual_pages": ["/", "/pricing", ...],
  "social_pages": ["/", "/about", ...],
  "reasoning": {
    "seo": "Why...",
    "content": "Why...",
    "visual": "Why...",
    "social": "Why..."
  }
}`;
}

/**
 * Get industry-specific page priorities
 */
function getIndustryPriorities(industry) {
  const priorities = {
    'saas': 'Pricing, Features, Integrations',
    'restaurant': 'Menu, Locations, Reservations',
    'ecommerce': 'Products, Checkout, Shipping',
    'agency': 'Portfolio, Services, Case Studies',
    'healthcare': 'Services, Providers, Appointments',
    'legal': 'Practice Areas, Attorneys',
    'realestate': 'Listings, Agents',
    'retail': 'Products, Store Locations'
  };

  return priorities[industry.toLowerCase()] || 'Core business pages';
}

/**
 * Normalize AI selection and validate URLs
 */
function normalizeSelection(selection, sitemap) {
  const validUrls = new Set(sitemap.pages.map(p => p.url));

  const normalize = (pages) => {
    if (!Array.isArray(pages)) return ['/'];
    const filtered = pages.filter(url => validUrls.has(url));
    if (!filtered.includes('/')) {
      filtered.unshift('/');
    }
    return filtered;
  };

  return {
    seo_pages: normalize(selection.seo_pages),
    content_pages: normalize(selection.content_pages),
    visual_pages: normalize(selection.visual_pages),
    social_pages: normalize(selection.social_pages),
    reasoning: selection.reasoning || {}
  };
}

/**
 * Fallback rule-based selection if AI fails
 */
function fallbackSelection(sitemap, maxPagesPerModule) {
  console.log('[Page Selector] Using fallback rule-based selection');

  const pagesByType = {};
  for (const page of sitemap.pages) {
    if (!pagesByType[page.type]) {
      pagesByType[page.type] = [];
    }
    pagesByType[page.type].push(page.url);
  }

  return {
    seo_pages: [
      '/',
      ...(pagesByType.pricing || []).slice(0, 1),
      ...(pagesByType.blog || []).slice(0, 1),
      ...(pagesByType.contact || []).slice(0, 1)
    ].slice(0, maxPagesPerModule),

    content_pages: [
      '/',
      ...(pagesByType.about || []).slice(0, 1),
      ...(pagesByType.services || []).slice(0, 1),
      ...(pagesByType['case-studies'] || []).slice(0, 1)
    ].slice(0, maxPagesPerModule),

    visual_pages: [
      '/',
      ...(pagesByType.pricing || []).slice(0, 1),
      ...(pagesByType.products || []).slice(0, 1)
    ].slice(0, maxPagesPerModule),

    social_pages: [
      '/',
      ...(pagesByType.about || []).slice(0, 1),
      ...(pagesByType.testimonials || []).slice(0, 1)
    ].slice(0, maxPagesPerModule),

    reasoning: {
      seo: 'Fallback rule-based selection',
      content: 'Fallback rule-based selection',
      visual: 'Fallback rule-based selection',
      social: 'Fallback rule-based selection'
    }
  };
}

/**
 * Get all unique pages to crawl
 */
export function getUniquePagesToCrawl(selection) {
  const allPages = new Set([
    ...selection.seo_pages,
    ...selection.content_pages,
    ...selection.visual_pages,
    ...selection.social_pages
  ]);

  return Array.from(allPages);
}

export default {
  selectPagesForAnalysis,
  getUniquePagesToCrawl
};