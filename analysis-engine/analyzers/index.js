/**
 * Analyzers - Barrel export for all analyzer modules
 *
 * Usage:
 *   import { analyzeDesign, analyzeSEO, analyzeContent, analyzeSocial } from './analyzers/index.js';
 *
 * Each analyzer:
 *   - Loads its corresponding prompt configuration
 *   - Calls appropriate AI model (GPT-4o Vision or Grok-4-fast)
 *   - Returns structured analysis with score + issues + recommendations
 *   - Handles errors gracefully (returns default scores on failure)
 */

// Design Analyzer (GPT-4o Vision) - ~$0.015 per call
export { analyzeDesign, countQuickWins } from './design-analyzer.js';

// SEO Analyzer (Grok-4-fast) - ~$0.006 per call
export { analyzeSEO, countCriticalSEOIssues } from './seo-analyzer.js';

// Content Analyzer (Grok-4-fast) - ~$0.006 per call
export { analyzeContent, getBestEngagementHook } from './content-analyzer.js';

// Social Media Analyzer (Grok-4-fast) - ~$0.006 per call
export { analyzeSocial, hasSocialPresence, countInactivePlatforms } from './social-analyzer.js';

/**
 * Run all analyses in parallel
 *
 * @param {object} data - Analysis data
 * @param {string} data.url - Website URL
 * @param {Buffer|string} data.screenshot - Screenshot for design analysis
 * @param {string} data.html - HTML content
 * @param {object} data.context - Shared context (company_name, industry, etc.)
 * @param {object} data.socialProfiles - Social profile URLs (optional)
 * @param {object} data.socialMetadata - Social metadata (optional)
 * @returns {Promise<object>} All analysis results
 */
export async function runAllAnalyses(data) {
  const {
    url,
    screenshot,
    html,
    context = {},
    socialProfiles = null,
    socialMetadata = null
  } = data;

  // Import analyzers (already imported above, but being explicit)
  const { analyzeDesign } = await import('./design-analyzer.js');
  const { analyzeSEO } = await import('./seo-analyzer.js');
  const { analyzeContent } = await import('./content-analyzer.js');
  const { analyzeSocial } = await import('./social-analyzer.js');

  // Run all analyses in parallel
  const [designResults, seoResults, contentResults, socialResults] = await Promise.allSettled([
    analyzeDesign(url, screenshot, context),
    analyzeSEO(url, html, context),
    analyzeContent(url, html, context),
    analyzeSocial(url, socialProfiles, socialMetadata, context)
  ]);

  // Extract results (handle failures gracefully)
  return {
    design: designResults.status === 'fulfilled' ? designResults.value : getDefaultDesignResults(),
    seo: seoResults.status === 'fulfilled' ? seoResults.value : getDefaultSEOResults(),
    content: contentResults.status === 'fulfilled' ? contentResults.value : getDefaultContentResults(),
    social: socialResults.status === 'fulfilled' ? socialResults.value : getDefaultSocialResults()
  };
}

/**
 * Default results in case of complete failure
 */
function getDefaultDesignResults() {
  return {
    overallDesignScore: 50,
    issues: [],
    positives: [],
    quickWinCount: 0,
    _meta: { analyzer: 'design', error: 'Analysis failed' }
  };
}

function getDefaultSEOResults() {
  return {
    seoScore: 50,
    issues: [],
    opportunities: [],
    quickWins: [],
    _meta: { analyzer: 'seo', error: 'Analysis failed' }
  };
}

function getDefaultContentResults() {
  return {
    contentScore: 50,
    issues: [],
    engagementHooks: [],
    _meta: { analyzer: 'content', error: 'Analysis failed' }
  };
}

function getDefaultSocialResults() {
  return {
    socialScore: 50,
    platformsPresent: [],
    mostActivePlatform: 'unknown',
    issues: [],
    quickWins: [],
    strengths: [],
    _meta: { analyzer: 'social', error: 'Analysis failed' }
  };
}

/**
 * Calculate total cost of all analyses
 */
export function calculateTotalCost(results) {
  let total = 0;

  if (results.design?._meta?.cost) total += results.design._meta.cost;
  if (results.seo?._meta?.cost) total += results.seo._meta.cost;
  if (results.content?._meta?.cost) total += results.content._meta.cost;
  if (results.social?._meta?.cost) total += results.social._meta.cost;

  return total;
}
