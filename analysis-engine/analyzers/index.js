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

// DEPRECATED: Old single-viewport design analyzer (kept for backward compatibility)
export { analyzeDesign, countQuickWins } from './design-analyzer.js';

// NEW: Desktop Visual Analyzer (GPT-4o Vision) - ~$0.015 per call
export { analyzeDesktopVisual, countCriticalDesktopIssues } from './desktop-visual-analyzer.js';

// NEW: Mobile Visual Analyzer (GPT-4o Vision) - ~$0.015 per call
export { analyzeMobileVisual, countCriticalMobileIssues } from './mobile-visual-analyzer.js';

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
 * @param {Buffer|string} data.screenshot - Screenshot for legacy design analysis (deprecated)
 * @param {Buffer|string} data.desktopScreenshot - Desktop screenshot (1920x1080)
 * @param {Buffer|string} data.mobileScreenshot - Mobile screenshot (375x812)
 * @param {string} data.html - HTML content
 * @param {object} data.context - Shared context (company_name, industry, etc.)
 * @param {object} data.customPrompts - Custom AI prompts (optional)
 * @param {object} data.socialProfiles - Social profile URLs (optional)
 * @param {object} data.socialMetadata - Social metadata (optional)
 * @returns {Promise<object>} All analysis results
 */
export async function runAllAnalyses(data) {
  const {
    url,
    screenshot, // Legacy - will be deprecated
    desktopScreenshot,
    mobileScreenshot,
    html,
    context = {},
    customPrompts = null,
    socialProfiles = null,
    socialMetadata = null
  } = data;

  // Import analyzers
  const { analyzeDesktopVisual } = await import('./desktop-visual-analyzer.js');
  const { analyzeMobileVisual } = await import('./mobile-visual-analyzer.js');
  const { analyzeSEO } = await import('./seo-analyzer.js');
  const { analyzeContent } = await import('./content-analyzer.js');
  const { analyzeSocial } = await import('./social-analyzer.js');

  // Run all analyses in parallel (NEW: separate desktop and mobile visual analysis)
  const [desktopVisualResults, mobileVisualResults, seoResults, contentResults, socialResults] = await Promise.allSettled([
    desktopScreenshot
      ? analyzeDesktopVisual(url, desktopScreenshot, context, customPrompts?.desktopVisual)
      : Promise.resolve(getDefaultDesktopVisualResults()),
    mobileScreenshot
      ? analyzeMobileVisual(url, mobileScreenshot, context, customPrompts?.mobileVisual)
      : Promise.resolve(getDefaultMobileVisualResults()),
    analyzeSEO(url, html, context, customPrompts?.seo),
    analyzeContent(url, html, context, customPrompts?.content),
    analyzeSocial(url, socialProfiles, socialMetadata, context, customPrompts?.social)
  ]);

  // Extract results (handle failures gracefully)
  return {
    desktopVisual: desktopVisualResults.status === 'fulfilled' ? desktopVisualResults.value : getDefaultDesktopVisualResults(),
    mobileVisual: mobileVisualResults.status === 'fulfilled' ? mobileVisualResults.value : getDefaultMobileVisualResults(),
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

function getDefaultDesktopVisualResults() {
  return {
    visualScore: 50,
    issues: [],
    positives: [],
    quickWinCount: 0,
    _meta: { analyzer: 'desktop-visual', error: 'Analysis failed' }
  };
}

function getDefaultMobileVisualResults() {
  return {
    visualScore: 50,
    issues: [],
    positives: [],
    quickWinCount: 0,
    _meta: { analyzer: 'mobile-visual', error: 'Analysis failed' }
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

  // Legacy design analyzer
  if (results.design?._meta?.cost) total += results.design._meta.cost;

  // NEW: Desktop and mobile visual analyzers
  if (results.desktopVisual?._meta?.cost) total += results.desktopVisual._meta.cost;
  if (results.mobileVisual?._meta?.cost) total += results.mobileVisual._meta.cost;

  if (results.seo?._meta?.cost) total += results.seo._meta.cost;
  if (results.content?._meta?.cost) total += results.content._meta.cost;
  if (results.social?._meta?.cost) total += results.social._meta.cost;

  return total;
}
