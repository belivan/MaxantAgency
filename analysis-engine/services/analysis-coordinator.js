/**
 * Analysis Coordinator
 * 
 * Responsible for coordinating all 6 analyzers (SEO, content, visual desktop/mobile, social, accessibility).
 * Runs analyzers in parallel on appropriate pages.
 * 
 * Single Responsibility: Analyzer Coordination
 */

import { parseHTML } from '../scrapers/html-parser.js';

export class AnalysisCoordinator {
  constructor(options = {}) {
    this.onProgress = options.onProgress || (() => {});
  }

  /**
   * Run all 6 analyzers in parallel
   * 
   * @param {object} crawlData - Data from CrawlingService
   * @param {object} pageSelection - Selection from PageSelectionService
   * @param {object} discoveryData - Data from DiscoveryService
   * @param {object} context - Business context
   * @param {string} baseUrl - Base website URL
   * @param {object} customPrompts - Custom AI prompts (optional)
   * @returns {Promise<object>} Analysis results
   */
  async runAnalysis(crawlData, pageSelection, discoveryData, context, baseUrl, customPrompts = {}) {
    this.onProgress({ 
      step: 'analyze', 
      message: 'Running multi-page SEO, content, and visual analysis...' 
    });

    const { pages, homepage } = crawlData;

    // Prepare pages for each analyzer
    const seoPages = pages.filter(p => pageSelection.seo_pages.includes(p.url));
    const contentPages = pages.filter(p => pageSelection.content_pages.includes(p.url));
    const visualPages = pages.filter(p => pageSelection.visual_pages.includes(p.url));
    const socialPages = pages.filter(p => pageSelection.social_pages.includes(p.url));
    const accessibilityPages = pages; // Analyze all for most comprehensive results

    // Extract metadata from homepage
    const parsedData = parseHTML(homepage.html, baseUrl);

    // Enhanced context (include discovery status for SEO analysis)
    const enrichedContext = this.enrichContext(
      {
        ...context,
        baseUrl,
        tech_stack: homepage.metadata?.techStack || 'Unknown',
        has_blog: parsedData.content.hasBlog
      },
      discoveryData
    );

    // Import analyzers (lazy loading)
    const { analyzeSEO } = await import('../analyzers/seo-analyzer.js');
    const { analyzeContent } = await import('../analyzers/content-analyzer.js');
    const { analyzeDesktopVisual } = await import('../analyzers/desktop-visual-analyzer.js');
    const { analyzeMobileVisual } = await import('../analyzers/mobile-visual-analyzer.js');
    const { analyzeSocial } = await import('../analyzers/social-analyzer.js');
    const { analyzeAccessibility } = await import('../analyzers/accessibility-analyzer.js');

    // Run all analyzers in parallel
    const [seoResults, contentResults, desktopVisualResults, mobileVisualResults, socialResults, accessibilityResults] = await Promise.all([
      analyzeSEO(seoPages, enrichedContext, customPrompts?.seo),
      analyzeContent(contentPages, enrichedContext, customPrompts?.content),
      analyzeDesktopVisual(visualPages, enrichedContext, customPrompts?.desktopVisual),
      analyzeMobileVisual(visualPages, enrichedContext, customPrompts?.mobileVisual),
      analyzeSocial(socialPages, parsedData.social.links, {
        platformCount: parsedData.social.platformCount,
        platformsPresent: parsedData.social.platformsPresent,
        // Prospect social data from Google Maps/Discovery
        profilesFromProspect: context.social_profiles_from_prospect || null,
        metadataFromProspect: context.social_metadata_from_prospect || null
      }, enrichedContext, customPrompts?.social),
      analyzeAccessibility(accessibilityPages, enrichedContext, customPrompts?.accessibility)
    ]);

    return {
      seo: seoResults,
      content: contentResults,
      desktopVisual: desktopVisualResults,
      mobileVisual: mobileVisualResults,
      social: socialResults,
      accessibility: accessibilityResults,
      metadata: {
        parsedData,
        enrichedContext
      }
    };
  }

  /**
   * Get analysis statistics
   * 
   * @param {object} results - Results from runAnalysis()
   * @returns {object} Statistics
   */
  getStatistics(results = {}) {
    const moduleKeys = ['seo', 'content', 'desktopVisual', 'mobileVisual', 'social', 'accessibility'];
    let modulesRun = 0;
    let modulesFailed = 0;
    let aggregateScore = 0;
    let scoreCount = 0;

    moduleKeys.forEach((key) => {
      const moduleResult = results[key];
      if (!moduleResult) {
        return;
      }

      modulesRun += 1;

      const score = extractModuleScore(key, moduleResult);
      if (typeof score === 'number' && !Number.isNaN(score)) {
        aggregateScore += score;
        scoreCount += 1;
      }

      if (moduleResult.error || moduleResult.success === false || moduleResult._meta?.error) {
        modulesFailed += 1;
      }
    });

    const averageBase = scoreCount ? aggregateScore / scoreCount : 0;
    const averageScore = scoreCount ? Math.round(averageBase / 10) * 10 : 0;

    return {
      modulesRun,
      modulesFailed,
      averageScore
    };
  }

  enrichContext(context = {}, discoveryData = {}) {
    const {
      totalPages = 0,
      sources = [],
      errors = {}
    } = discoveryData || {};

    const usedFallback = Array.isArray(sources) && sources.includes('fallback');

    return {
      ...context,
      discovery_status: {
        has_sitemap: !errors?.sitemap,
        has_robots: !errors?.robots,
        sitemap_error: errors?.sitemap || null,
        robots_error: errors?.robots || null,
        pages_discovered: totalPages,
        sources,
        used_fallback: usedFallback
      },
      discoveryStatus: {
        totalPages,
        sources,
        sitemap: {
          has: !errors?.sitemap,
          error: errors?.sitemap || null
        },
        robots: {
          has: !errors?.robots,
          error: errors?.robots || null
        },
        usedFallback
      }
    };
  }
}

function extractModuleScore(moduleName, moduleResult) {
  if (!moduleResult) {
    return 0;
  }

  if (typeof moduleResult.score === 'number') {
    return moduleResult.score;
  }

  const scoreMap = {
    seo: moduleResult.seoScore,
    content: moduleResult.contentScore,
    desktopVisual: moduleResult.visualScore,
    mobileVisual: moduleResult.visualScore,
    social: moduleResult.socialScore,
    accessibility: moduleResult.accessibilityScore
  };

  const fallback = scoreMap[moduleName];
  if (typeof fallback === 'number') {
    return fallback;
  }

  if (typeof moduleResult.averageScore === 'number') {
    return moduleResult.averageScore;
  }

  return 0;
}
