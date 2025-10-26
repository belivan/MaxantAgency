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
   * @param {object} benchmark - Industry benchmark for comparison (optional)
   * @param {object} benchmarkMatchMetadata - Benchmark match metadata (optional)
   * @returns {Promise<object>} Analysis results
   */
  async runAnalysis(crawlData, pageSelection, discoveryData, context, baseUrl, customPrompts = {}, benchmark = null, benchmarkMatchMetadata = null) {
    this.onProgress({
      step: 'analyze',
      message: benchmark
        ? `Running benchmark-driven analysis (comparing to ${benchmark.company_name})...`
        : 'Running multi-page SEO, content, and visual analysis...'
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

    // Enhanced context (include discovery status for SEO analysis + BENCHMARK)
    const enrichedContext = this.enrichContext(
      {
        ...context,
        baseUrl,
        tech_stack: homepage.metadata?.techStack || 'Unknown',
        has_blog: parsedData.content.hasBlog,

        // NEW: Benchmark context for all analyzers
        benchmark: benchmark ? {
          company_name: benchmark.company_name,
          website_url: benchmark.website_url,
          industry: benchmark.industry,
          tier: benchmark.benchmark_tier,
          scores: {
            design: benchmark.design_score,
            seo: benchmark.seo_score,
            performance: benchmark.performance_score,
            content: benchmark.content_score,
            accessibility: benchmark.accessibility_score,
            social: benchmark.social_score,
            overall: benchmark.overall_score,
            grade: benchmark.overall_grade
          },
          match_score: benchmarkMatchMetadata?.match_score,
          comparison_tier: benchmarkMatchMetadata?.comparison_tier,
          match_reasoning: benchmarkMatchMetadata?.match_reasoning,
          key_similarities: benchmarkMatchMetadata?.key_similarities,
          key_differences: benchmarkMatchMetadata?.key_differences,
          // NEW: Include strength data for concrete comparisons
          design_strengths: benchmark.design_strengths || null,
          seo_strengths: benchmark.seo_strengths || null,
          content_strengths: benchmark.content_strengths || null,
          social_strengths: benchmark.social_strengths || null,
          accessibility_strengths: benchmark.accessibility_strengths || null
        } : null
      },
      discoveryData
    );

    // Check which analyzers are enabled via environment variables
    const enableSEO = process.env.ENABLE_SEO_ANALYZER !== 'false';
    const enableContent = process.env.ENABLE_CONTENT_ANALYZER !== 'false';
    const enableDesktopVisual = process.env.ENABLE_DESKTOP_VISUAL_ANALYZER !== 'false';
    const enableMobileVisual = process.env.ENABLE_MOBILE_VISUAL_ANALYZER !== 'false';
    const enableSocial = process.env.ENABLE_SOCIAL_ANALYZER !== 'false';
    const enableAccessibility = process.env.ENABLE_ACCESSIBILITY_ANALYZER !== 'false';

    // Check if unified visual analyzer is enabled (analyzes desktop + mobile in one call)
    const useUnifiedVisual = process.env.USE_UNIFIED_VISUAL_ANALYZER === 'true';

    // Check if unified technical analyzer is enabled (analyzes SEO + Content in one call)
    const useUnifiedTechnical = process.env.USE_UNIFIED_TECHNICAL_ANALYZER === 'true';

    // Log which analyzers are disabled
    const disabledAnalyzers = [];
    if (!enableSEO) disabledAnalyzers.push('SEO');
    if (!enableContent) disabledAnalyzers.push('Content');
    if (!enableDesktopVisual) disabledAnalyzers.push('Desktop Visual');
    if (!enableMobileVisual) disabledAnalyzers.push('Mobile Visual');
    if (!enableSocial) disabledAnalyzers.push('Social');
    if (!enableAccessibility) disabledAnalyzers.push('Accessibility');

    if (disabledAnalyzers.length > 0) {
      console.log(`[Analysis Coordinator] Skipping disabled analyzers: ${disabledAnalyzers.join(', ')}`);
    }

    // Import analyzers (lazy loading) - only import what's enabled
    const analyzers = {};

    // Technical analyzers: Use unified (SEO + Content in one call) or separate
    if (useUnifiedTechnical && (enableSEO || enableContent)) {
      console.log('[Analysis Coordinator] Using unified technical analyzer (SEO + Content in one call)');
      const { analyzeUnifiedTechnical, getSEOResults, getContentResults } = await import('../analyzers/unified-technical-analyzer.js');
      analyzers.analyzeUnifiedTechnical = analyzeUnifiedTechnical;
      analyzers.getSEOResults = getSEOResults;
      analyzers.getContentResults = getContentResults;
    } else {
      // Legacy: separate SEO and Content analyzers
      if (enableSEO) {
        const { analyzeSEO } = await import('../analyzers/seo-analyzer.js');
        analyzers.analyzeSEO = analyzeSEO;
      }
      if (enableContent) {
        const { analyzeContent } = await import('../analyzers/content-analyzer.js');
        analyzers.analyzeContent = analyzeContent;
      }
    }

    // Visual analyzers: Use unified (both viewports in one call) or separate
    if (useUnifiedVisual && (enableDesktopVisual || enableMobileVisual)) {
      console.log('[Analysis Coordinator] Using unified visual analyzer (desktop + mobile in one call)');
      const { analyzeUnifiedVisual, getDesktopResults, getMobileResults } = await import('../analyzers/unified-visual-analyzer.js');
      analyzers.analyzeUnifiedVisual = analyzeUnifiedVisual;
      analyzers.getDesktopResults = getDesktopResults;
      analyzers.getMobileResults = getMobileResults;
    } else {
      // Legacy: separate desktop and mobile analyzers
      if (enableDesktopVisual) {
        const { analyzeDesktopVisual } = await import('../analyzers/desktop-visual-analyzer.js');
        analyzers.analyzeDesktopVisual = analyzeDesktopVisual;
      }
      if (enableMobileVisual) {
        const { analyzeMobileVisual } = await import('../analyzers/mobile-visual-analyzer.js');
        analyzers.analyzeMobileVisual = analyzeMobileVisual;
      }
    }

    if (enableSocial) {
      const { analyzeSocial } = await import('../analyzers/social-analyzer.js');
      analyzers.analyzeSocial = analyzeSocial;
    }
    if (enableAccessibility) {
      const { analyzeAccessibility } = await import('../analyzers/accessibility-analyzer.js');
      analyzers.analyzeAccessibility = analyzeAccessibility;
    }

    // Run enabled analyzers in parallel
    let unifiedTechnicalResults = null;
    let unifiedVisualResults = null;
    let seoResults, contentResults, desktopVisualResults, mobileVisualResults;

    // Determine which technical analyzer to run (unified or separate)
    const technicalPromise = useUnifiedTechnical && analyzers.analyzeUnifiedTechnical
      ? analyzers.analyzeUnifiedTechnical(seoPages.length > 0 ? seoPages : contentPages, enrichedContext, customPrompts?.unifiedTechnical)
      : null;

    // Determine which visual analyzer to run (unified or separate)
    const visualPromise = useUnifiedVisual && analyzers.analyzeUnifiedVisual
      ? analyzers.analyzeUnifiedVisual(visualPages, enrichedContext, customPrompts?.unifiedVisual || customPrompts?.desktopVisual)
      : null;

    if (useUnifiedVisual && analyzers.analyzeUnifiedVisual) {
      // NEW: Unified visual analysis (both viewports in ONE AI call)
      if (useUnifiedTechnical && analyzers.analyzeUnifiedTechnical) {
        // NEWEST: Both unified technical AND unified visual (maximum optimization)
        const [unifiedTech, unifiedVis, socialResults, accessibilityResults] = await Promise.all([
          technicalPromise,
          visualPromise,
          enableSocial && analyzers.analyzeSocial
            ? analyzers.analyzeSocial(socialPages, parsedData.social.links, {
                platformCount: parsedData.social.platformCount,
                platformsPresent: parsedData.social.platformsPresent,
                profilesFromProspect: context.social_profiles_from_prospect || null,
                metadataFromProspect: context.social_metadata_from_prospect || null
              }, enrichedContext, customPrompts?.social)
            : Promise.resolve(getDefaultSocialResults()),
          enableAccessibility && analyzers.analyzeAccessibility
            ? analyzers.analyzeAccessibility(accessibilityPages, enrichedContext, customPrompts?.accessibility)
            : Promise.resolve(getDefaultAccessibilityResults())
        ]);

        // Split unified technical results for backward compatibility
        unifiedTechnicalResults = unifiedTech;
        seoResults = enableSEO ? analyzers.getSEOResults(unifiedTech) : getDefaultSEOResults();
        contentResults = enableContent ? analyzers.getContentResults(unifiedTech) : getDefaultContentResults();

        // Split unified visual results for backward compatibility
        unifiedVisualResults = unifiedVis;
        if (unifiedVis) {
          desktopVisualResults = enableDesktopVisual ? analyzers.getDesktopResults(unifiedVis) : getDefaultVisualResults('desktop');
          mobileVisualResults = enableMobileVisual ? analyzers.getMobileResults(unifiedVis) : getDefaultVisualResults('mobile');
        } else {
          desktopVisualResults = getDefaultVisualResults('desktop');
          mobileVisualResults = getDefaultVisualResults('mobile');
        }

        return {
          seo: seoResults,
          content: contentResults,
          desktopVisual: desktopVisualResults,
          mobileVisual: mobileVisualResults,
          unifiedTechnical: unifiedTechnicalResults, // NEW: Full unified technical results with cross-cutting issues
          unifiedVisual: unifiedVisualResults, // NEW: Full unified visual results with responsive design insights
          social: socialResults,
          accessibility: accessibilityResults,
          metadata: {
            parsedData,
            enrichedContext,
            analyzersDisabled: disabledAnalyzers,
            usedUnifiedTechnical: true,
            usedUnifiedVisual: true
          }
        };

      } else {
        // Unified visual only (legacy technical analyzers)
        const [seo, content, unifiedVis, socialResults, accessibilityResults] = await Promise.all([
          enableSEO && analyzers.analyzeSEO
            ? analyzers.analyzeSEO(seoPages, enrichedContext, customPrompts?.seo)
            : Promise.resolve(getDefaultSEOResults()),
          enableContent && analyzers.analyzeContent
            ? analyzers.analyzeContent(contentPages, enrichedContext, customPrompts?.content)
            : Promise.resolve(getDefaultContentResults()),
          visualPromise,
          enableSocial && analyzers.analyzeSocial
            ? analyzers.analyzeSocial(socialPages, parsedData.social.links, {
                platformCount: parsedData.social.platformCount,
                platformsPresent: parsedData.social.platformsPresent,
                profilesFromProspect: context.social_profiles_from_prospect || null,
                metadataFromProspect: context.social_metadata_from_prospect || null
              }, enrichedContext, customPrompts?.social)
            : Promise.resolve(getDefaultSocialResults()),
          enableAccessibility && analyzers.analyzeAccessibility
            ? analyzers.analyzeAccessibility(accessibilityPages, enrichedContext, customPrompts?.accessibility)
            : Promise.resolve(getDefaultAccessibilityResults())
        ]);

        seoResults = seo;
        contentResults = content;

        // Split unified visual results for backward compatibility
        unifiedVisualResults = unifiedVis;
        if (unifiedVis) {
          desktopVisualResults = enableDesktopVisual ? analyzers.getDesktopResults(unifiedVis) : getDefaultVisualResults('desktop');
          mobileVisualResults = enableMobileVisual ? analyzers.getMobileResults(unifiedVis) : getDefaultVisualResults('mobile');
        } else {
          desktopVisualResults = getDefaultVisualResults('desktop');
          mobileVisualResults = getDefaultVisualResults('mobile');
        }

        return {
          seo: seoResults,
          content: contentResults,
          desktopVisual: desktopVisualResults,
          mobileVisual: mobileVisualResults,
          unifiedVisual: unifiedVisualResults, // NEW: Full unified results with responsive design insights
          social: socialResults,
          accessibility: accessibilityResults,
          metadata: {
            parsedData,
            enrichedContext,
            analyzersDisabled: disabledAnalyzers,
            usedUnifiedTechnical: false,
            usedUnifiedVisual: true
          }
        };
      }

    } else {
      // LEGACY: Separate desktop and mobile visual analysis (TWO AI calls)
      if (useUnifiedTechnical && analyzers.analyzeUnifiedTechnical) {
        // Unified technical only (legacy visual analyzers)
        const [unifiedTech, desktopResults, mobileResults, socialResults, accessibilityResults] = await Promise.all([
          technicalPromise,
          enableDesktopVisual && analyzers.analyzeDesktopVisual
            ? analyzers.analyzeDesktopVisual(visualPages, enrichedContext, customPrompts?.desktopVisual)
            : Promise.resolve(getDefaultVisualResults('desktop')),
          enableMobileVisual && analyzers.analyzeMobileVisual
            ? analyzers.analyzeMobileVisual(visualPages, enrichedContext, customPrompts?.mobileVisual)
            : Promise.resolve(getDefaultVisualResults('mobile')),
          enableSocial && analyzers.analyzeSocial
            ? analyzers.analyzeSocial(socialPages, parsedData.social.links, {
                platformCount: parsedData.social.platformCount,
                platformsPresent: parsedData.social.platformsPresent,
                profilesFromProspect: context.social_profiles_from_prospect || null,
                metadataFromProspect: context.social_metadata_from_prospect || null
              }, enrichedContext, customPrompts?.social)
            : Promise.resolve(getDefaultSocialResults()),
          enableAccessibility && analyzers.analyzeAccessibility
            ? analyzers.analyzeAccessibility(accessibilityPages, enrichedContext, customPrompts?.accessibility)
            : Promise.resolve(getDefaultAccessibilityResults())
        ]);

        // Split unified technical results for backward compatibility
        unifiedTechnicalResults = unifiedTech;
        seoResults = enableSEO ? analyzers.getSEOResults(unifiedTech) : getDefaultSEOResults();
        contentResults = enableContent ? analyzers.getContentResults(unifiedTech) : getDefaultContentResults();

        desktopVisualResults = desktopResults;
        mobileVisualResults = mobileResults;

        return {
          seo: seoResults,
          content: contentResults,
          desktopVisual: desktopVisualResults,
          mobileVisual: mobileVisualResults,
          unifiedTechnical: unifiedTechnicalResults, // NEW: Full unified technical results with cross-cutting issues
          social: socialResults,
          accessibility: accessibilityResults,
          metadata: {
            parsedData,
            enrichedContext,
            analyzersDisabled: disabledAnalyzers,
            usedUnifiedTechnical: true,
            usedUnifiedVisual: false
          }
        };

      } else {
        // FULL LEGACY: All separate analyzers (no unified)
        const [seo, content, desktopResults, mobileResults, socialResults, accessibilityResults] = await Promise.all([
          enableSEO && analyzers.analyzeSEO
            ? analyzers.analyzeSEO(seoPages, enrichedContext, customPrompts?.seo)
            : Promise.resolve(getDefaultSEOResults()),
          enableContent && analyzers.analyzeContent
            ? analyzers.analyzeContent(contentPages, enrichedContext, customPrompts?.content)
            : Promise.resolve(getDefaultContentResults()),
          enableDesktopVisual && analyzers.analyzeDesktopVisual
            ? analyzers.analyzeDesktopVisual(visualPages, enrichedContext, customPrompts?.desktopVisual)
            : Promise.resolve(getDefaultVisualResults('desktop')),
          enableMobileVisual && analyzers.analyzeMobileVisual
            ? analyzers.analyzeMobileVisual(visualPages, enrichedContext, customPrompts?.mobileVisual)
            : Promise.resolve(getDefaultVisualResults('mobile')),
          enableSocial && analyzers.analyzeSocial
            ? analyzers.analyzeSocial(socialPages, parsedData.social.links, {
                platformCount: parsedData.social.platformCount,
                platformsPresent: parsedData.social.platformsPresent,
                profilesFromProspect: context.social_profiles_from_prospect || null,
                metadataFromProspect: context.social_metadata_from_prospect || null
              }, enrichedContext, customPrompts?.social)
            : Promise.resolve(getDefaultSocialResults()),
          enableAccessibility && analyzers.analyzeAccessibility
            ? analyzers.analyzeAccessibility(accessibilityPages, enrichedContext, customPrompts?.accessibility)
            : Promise.resolve(getDefaultAccessibilityResults())
        ]);

        seoResults = seo;
        contentResults = content;
        desktopVisualResults = desktopResults;
        mobileVisualResults = mobileResults;

        return {
          seo: seoResults,
          content: contentResults,
          desktopVisual: desktopVisualResults,
          mobileVisual: mobileVisualResults,
          social: socialResults,
          accessibility: accessibilityResults,
          metadata: {
            parsedData,
            enrichedContext,
            analyzersDisabled: disabledAnalyzers,
            usedUnifiedTechnical: false,
            usedUnifiedVisual: false
          }
        };
      }
    }
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

/**
 * Default results for disabled analyzers
 * These provide neutral scores so the grading system still works
 */
function getDefaultSEOResults() {
  return {
    model: 'disabled',
    seoScore: 50,
    issues: [],
    opportunities: [],
    quickWins: [],
    _meta: { analyzer: 'seo', disabled: true, message: 'Analyzer disabled via ENABLE_SEO_ANALYZER=false' }
  };
}

function getDefaultContentResults() {
  return {
    model: 'disabled',
    contentScore: 50,
    issues: [],
    engagementHooks: [],
    _meta: { analyzer: 'content', disabled: true, message: 'Analyzer disabled via ENABLE_CONTENT_ANALYZER=false' }
  };
}

function getDefaultVisualResults(type = 'desktop') {
  return {
    model: 'disabled',
    visualScore: 50,
    issues: [],
    positives: [],
    quickWinCount: 0,
    _meta: {
      analyzer: `${type}-visual`,
      disabled: true,
      message: `Analyzer disabled via ENABLE_${type.toUpperCase()}_VISUAL_ANALYZER=false`
    }
  };
}

function getDefaultSocialResults() {
  return {
    model: 'disabled',
    socialScore: 50,
    platformsPresent: [],
    mostActivePlatform: 'unknown',
    issues: [],
    quickWins: [],
    strengths: [],
    _meta: { analyzer: 'social', disabled: true, message: 'Analyzer disabled via ENABLE_SOCIAL_ANALYZER=false' }
  };
}

function getDefaultAccessibilityResults() {
  return {
    model: 'disabled',
    accessibilityScore: 50,
    issues: [],
    compliance: {},
    wcagLevel: 'AA',
    _meta: { analyzer: 'accessibility', disabled: true, message: 'Analyzer disabled via ENABLE_ACCESSIBILITY_ANALYZER=false' }
  };
}
