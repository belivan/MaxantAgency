/**
 * BI-Focused Page Selector for Prospecting Engine
 *
 * Uses AI (Grok-4-fast) to select pages that maximize business intelligence extraction:
 * - Contact information (email, phone, location)
 * - Business maturity (years in business, company size)
 * - Budget indicators (pricing visibility, service tiers)
 * - Decision maker accessibility (leadership bios, direct contact)
 * - Tech sophistication (premium features, modern stack)
 *
 * Cost: ~$0.001 per selection
 * Time: 2-3 seconds
 */

import { callAI } from '../../database-tools/shared/ai-client.js';

/**
 * Select pages for business intelligence extraction
 *
 * @param {object} sitemap - Discovered sitemap from page-discovery.js
 * @param {object} context - Business context (industry, company_name)
 * @param {object} options - Selection options
 * @returns {Promise<object>} Selected pages for BI extraction
 */
export async function selectPagesForBI(sitemap, context = {}, options = {}) {
  const {
    maxPages = 7,
    model = 'grok-4-fast',
    temperature = 0.3
  } = options;

  console.log(`[BI Page Selector] Analyzing ${sitemap.totalPages} pages for ${context.industry || 'unknown'} industry...`);

  const startTime = Date.now();

  // Build AI prompt for BI-focused page selection
  const prompt = buildBISelectionPrompt(sitemap, context, maxPages);

  try {
    // Call AI for intelligent page selection
    const result = await callAI({
      model,
      temperature,
      systemPrompt: 'You are a lead qualification strategist. Select pages that reveal the most business intelligence signals for prospecting and lead scoring.',
      userPrompt: prompt,
      jsonMode: true,
      maxTokens: 1500
    });

    // Parse AI response
    const selection = JSON.parse(result.content);

    // Validate and normalize selection
    const normalizedSelection = normalizeSelection(selection, sitemap);

    const selectionTime = Date.now() - startTime;
    console.log(`[BI Page Selector] AI selected ${normalizedSelection.selected_pages.length} pages in ${selectionTime}ms`);

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
    console.error('[BI Page Selector] AI selection failed:', error.message);
    // Fallback to rule-based selection
    return fallbackBISelection(sitemap, maxPages);
  }
}

/**
 * Build AI prompt for BI-focused page selection
 */
function buildBISelectionPrompt(sitemap, context, maxPages) {
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

  return `You are analyzing a ${industry} website (${company_name}) for LEAD QUALIFICATION.

DISCOVERED PAGES (${sitemap.totalPages} total):
${pagesList}

YOUR TASK: Select up to ${maxPages} pages that reveal the MOST business intelligence signals.

BUSINESS INTELLIGENCE SIGNALS:

1. **Contact Information** (email, phone, location, decision makers)
   - Pages: Contact, About, Team, Leadership

2. **Business Maturity** (years in business, company size, growth stage)
   - Pages: About, Team, Careers, Locations, Press

3. **Budget Indicators** (pricing visibility, service tiers, transparency)
   - Pages: Pricing, Services, Products, Plans

4. **Decision Maker Accessibility** (leadership bios, org structure)
   - Pages: Team, Leadership, About, Contact

5. **Tech Sophistication** (premium features, modern stack, innovation)
   - Pages: Features, Technology, Products, Integrations

6. **Client Sophistication** (portfolio quality, case studies, testimonials)
   - Pages: Portfolio, Work, Case Studies, Clients, Testimonials

INDUSTRY PRIORITIES: ${getIndustryBIPriorities(industry)}

RULES:
- Homepage (/) is MANDATORY
- Max ${maxPages} pages total (including homepage)
- Prioritize pages that reveal multiple BI signals
- Avoid: Privacy policy, terms, legal, blog posts (unless directly relevant)
- Focus on STATIC business info pages (not dynamic content)

RETURN JSON:
{
  "selected_pages": ["/", "/about", "/pricing", ...],
  "reasoning": "Why these pages maximize BI extraction for lead qualification..."
}`;
}

/**
 * Get industry-specific BI priorities
 */
function getIndustryBIPriorities(industry) {
  const priorities = {
    'saas': 'Pricing (budget), Team (size), Customers (portfolio), Integrations (tech sophistication)',
    'restaurant': 'Menu (pricing), Locations (scale), About (years in business), Private Events (services)',
    'ecommerce': 'Products (offerings), About (company story), Shipping (ops sophistication), Returns (customer service)',
    'agency': 'Portfolio (client sophistication), Team (company size), Services (offerings), Pricing (budget)',
    'healthcare': 'Services (offerings), Providers (team size), Insurance (pricing), Locations (scale)',
    'legal': 'Practice Areas (offerings), Attorneys (team size), About (firm history)',
    'retail': 'About (company story), Locations (scale), Products (offerings)',
    'consulting': 'Services (offerings), Team (expertise), Clients (portfolio), About (firm history)'
  };

  return priorities[industry.toLowerCase()] || 'About, Services, Contact, Team, Pricing';
}

/**
 * Normalize and validate AI selection
 */
function normalizeSelection(selection, sitemap) {
  const validUrls = new Set(sitemap.pages.map(p => p.url));

  let selectedPages = selection.selected_pages || [];

  // Validate URLs
  if (!Array.isArray(selectedPages)) {
    selectedPages = ['/'];
  }

  // Filter to only valid URLs from sitemap
  selectedPages = selectedPages.filter(url => validUrls.has(url));

  // Ensure homepage is included
  if (!selectedPages.includes('/')) {
    selectedPages.unshift('/');
  }

  return {
    selected_pages: selectedPages,
    reasoning: selection.reasoning || 'AI-powered page selection for BI extraction'
  };
}

/**
 * Fallback rule-based selection if AI fails
 */
function fallbackBISelection(sitemap, maxPages) {
  console.log('[BI Page Selector] Using rule-based fallback selection');

  const priorityTypes = [
    'homepage',    // Always include
    'about',       // Company story, years in business
    'pricing',     // Budget indicator
    'team',        // Company size
    'careers',     // Hiring signals
    'services',    // Offerings
    'portfolio',   // Client sophistication
    'contact',     // Contact info
    'locations',   // Scale
    'products'     // Offerings
  ];

  const selected = [];

  // Add homepage first
  const homepage = sitemap.pages.find(p => p.url === '/');
  if (homepage) selected.push(homepage.url);

  // Add pages by priority type
  for (const type of priorityTypes) {
    if (selected.length >= maxPages) break;

    const page = sitemap.pages.find(p => p.type === type && !selected.includes(p.url));
    if (page) selected.push(page.url);
  }

  // Fill remaining slots with top-level pages
  if (selected.length < maxPages) {
    const topLevelPages = sitemap.pages
      .filter(p => !selected.includes(p.url) && (p.url.match(/\//g) || []).length <= 1)
      .slice(0, maxPages - selected.length);

    selected.push(...topLevelPages.map(p => p.url));
  }

  return {
    selected_pages: selected,
    reasoning: 'Rule-based fallback: prioritized BI-critical page types',
    meta: {
      totalPagesDiscovered: sitemap.totalPages,
      selectionTime: 0,
      model: 'fallback',
      cost: 0
    }
  };
}

export default {
  selectPagesForBI
};
