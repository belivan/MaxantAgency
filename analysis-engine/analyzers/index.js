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

// DEPRECATED: Old single-viewport design analyzer has been REMOVED
// Use desktop-visual-analyzer.js and mobile-visual-analyzer.js instead

// Desktop Visual Analyzer (GPT-4o Vision) - ~$0.015 per call
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
 * @param {array} pages - Array of page objects for multi-page analysis (optional)
 * @returns {Promise<object>} All analysis results
 */
export async function runAllAnalyses(data, pages = []) {
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

  // Build pages array for multi-page analyzers
  let pagesForAnalysis = pages;

  // If no pages provided, create single-page array from legacy params
  if (!pages || pages.length === 0) {
    pagesForAnalysis = [{
      url: '/',
      fullUrl: url,
      html: html,
      metadata: {
        title: null,
        loadTime: null
      }
    }];
  }

  // Build pages array for visual analyzers (need screenshots attached)
  let visualPages = [];

  // Use pages from parameter if they have screenshots
  if (pages.length > 0 && pages[0]?.screenshots?.desktop && pages[0]?.screenshots?.mobile) {
    // Pages already have screenshots attached (from intelligent analyzer or multi-page crawler)
    visualPages = pages.filter(p => p.screenshots?.desktop && p.screenshots?.mobile);
  }
  // Fallback: create from legacy screenshot parameters (basic analyzer)
  else if (desktopScreenshot && mobileScreenshot) {
    visualPages = [{
      url: '/',
      fullUrl: url,
      screenshots: {
        desktop: desktopScreenshot,
        mobile: mobileScreenshot
      }
    }];
  }

  // Run all analyses in parallel (NEW: separate desktop and mobile visual analysis)
  const [desktopVisualResults, mobileVisualResults, seoResults, contentResults, socialResults] = await Promise.allSettled([
    visualPages.length > 0
      ? analyzeDesktopVisual(visualPages, context, customPrompts?.desktopVisual)
      : Promise.resolve(getDefaultDesktopVisualResults()),
    visualPages.length > 0
      ? analyzeMobileVisual(visualPages, context, customPrompts?.mobileVisual)
      : Promise.resolve(getDefaultMobileVisualResults()),
    analyzeSEO(pagesForAnalysis, context, customPrompts?.seo),
    analyzeContent(pagesForAnalysis, context, customPrompts?.content),
    analyzeSocial(pagesForAnalysis, context, customPrompts?.social)
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
    model: 'unavailable',
    overallDesignScore: 30,
    issues: [],
    positives: [],
    quickWinCount: 0,
    _meta: { analyzer: 'design', error: 'Analysis failed' }
  };
}

function getDefaultDesktopVisualResults() {
  return {
    model: 'unavailable',
    visualScore: 30,
    issues: [],
    positives: [],
    quickWinCount: 0,
    _meta: { analyzer: 'desktop-visual', error: 'Analysis failed' }
  };
}

function getDefaultMobileVisualResults() {
  return {
    model: 'unavailable',
    visualScore: 30,
    issues: [],
    positives: [],
    quickWinCount: 0,
    _meta: { analyzer: 'mobile-visual', error: 'Analysis failed' }
  };
}

function getDefaultSEOResults() {
  return {
    model: 'unavailable',
    seoScore: 30,
    issues: [],
    opportunities: [],
    quickWins: [],
    _meta: { analyzer: 'seo', error: 'Analysis failed' }
  };
}

function getDefaultContentResults() {
  return {
    model: 'unavailable',
    contentScore: 30,
    issues: [],
    engagementHooks: [],
    _meta: { analyzer: 'content', error: 'Analysis failed' }
  };
}

function getDefaultSocialResults() {
  return {
    model: 'unavailable',
    socialScore: 30,
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
