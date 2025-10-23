/**
 * Orchestrator - Coordinates the INTELLIGENT multi-page website analysis pipeline
 *
 * INTELLIGENT PIPELINE:
 * 1. Discovery - Find all pages via sitemap/robots/navigation
 * 2. AI Page Selection - Let AI choose optimal pages per analyzer module
 * 3. Targeted Crawling - Only crawl AI-selected pages with screenshots
 * 4. Multi-page Analysis - Run analyzers on appropriate pages
 * 5. Grading & Insights - Calculate grades and generate critique
 * 6. Return complete analysis results
 */

import { parseHTML } from './scrapers/html-parser.js';
import { calculateTotalCost } from './analyzers/index.js';
import { calculateGrade, extractQuickWins, getTopIssue } from './grading/grader.js';
import { generateCritique, generateOneLiner } from './grading/critique-generator.js';
import { crawlSelectedPagesWithScreenshots } from './scrapers/multi-page-crawler.js';
import { discoverAllPages } from './scrapers/sitemap-discovery.js';
import { selectPagesForAnalysis, getUniquePagesToCrawl } from './scrapers/intelligent-page-selector.js';
import { scoreLeadPriority } from './analyzers/lead-scorer.js';
import { extractBusinessIntelligence } from './scrapers/business-intelligence-extractor.js';
import { countCriticalDesktopIssues } from './analyzers/desktop-visual-analyzer.js';
import { countCriticalMobileIssues } from './analyzers/mobile-visual-analyzer.js';
import { saveDualScreenshots } from './utils/screenshot-storage.js';
import { autoGenerateReport } from './reports/auto-report-generator.js';

/**
 * Run INTELLIGENT multi-page analysis pipeline (NEW!)
 * Uses AI to select optimal pages per module
 *
 * @param {string} url - Website URL to analyze
 * @param {object} context - Business context
 * @param {string} context.company_name - Company name
 * @param {string} context.industry - Industry type
 * @param {string} context.prospect_id - Prospect ID (for database)
 * @param {object} options - Analysis options
 * @param {object} options.customPrompts - Custom AI prompts (optional)
 * @param {function} options.onProgress - Progress callback (optional)
 * @param {number} options.maxPagesPerModule - Max pages to analyze per module (default: 5)
 * @param {boolean} options.generate_report - Generate HTML/PDF report (default: false)
 * @param {string} options.report_format - Report format: 'html', 'pdf', 'markdown' (default: 'html')
 * @param {boolean} options.save_to_database - Save report to database (default: false)
 * @returns {Promise<object>} Complete analysis results
 */
export async function analyzeWebsiteIntelligent(url, context = {}, options = {}) {
  const { 
    customPrompts, 
    onProgress, 
    maxPagesPerModule = 5,
    generate_report = false,
    report_format = 'html',
    save_to_database = false
  } = options;

  const startTime = Date.now();
  const progress = (step, message) => {
    if (onProgress) {
      onProgress({ step, message, timestamp: new Date().toISOString() });
    }
  };

  try {
    // PHASE 1: DISCOVERY - Find all pages without visiting them
    progress('discovery', `Discovering all pages on ${url}...`);
    let sitemap = await discoverAllPages(url, { timeout: 30000 });

    console.log(`[Intelligent Analysis] Discovered ${sitemap.totalPages} pages`);
    progress('discovery', `Found ${sitemap.totalPages} pages via sitemap/robots/navigation`);

    // FALLBACK: If no pages discovered, use common website pages
    if (sitemap.totalPages === 0) {
      console.log(`[Intelligent Analysis] No pages discovered via sitemap/robots. Using fallback pages...`);
      sitemap = {
        totalPages: 5,
        pages: ['/', '/about', '/services', '/contact', '/blog'],
        sources: ['fallback'],
        errors: sitemap.errors || {},
        discoveryTime: sitemap.discoveryTime || 0
      };
      progress('discovery', `Using fallback pages: homepage + common pages`);
    }

    // PHASE 2: AI PAGE SELECTION - Let AI choose which pages to analyze
    progress('selection', 'AI selecting optimal pages for each analysis module...');
    const pageSelection = await selectPagesForAnalysis(sitemap, {
      industry: context.industry,
      companyName: context.company_name,
      maxPagesPerModule
    });

    console.log(`[Intelligent Analysis] AI selected pages:`, {
      seo: pageSelection.seo_pages.length,
      content: pageSelection.content_pages.length,
      visual: pageSelection.visual_pages.length,
      social: pageSelection.social_pages.length
    });

    // Get unique pages to crawl (union of all selections)
    const uniquePages = getUniquePagesToCrawl(pageSelection);
    progress('selection', `AI selected ${uniquePages.length} unique pages to analyze`);

    // PHASE 3: TARGETED CRAWLING - Only crawl AI-selected pages with screenshots
    progress('crawl', `Crawling ${uniquePages.length} selected pages with desktop + mobile screenshots...`);
    const crawledPages = await crawlSelectedPagesWithScreenshots(url, uniquePages, {
      timeout: 30000,
      concurrency: 3,
      onProgress: (crawlProgress) => {
        progress('crawl', `Crawled ${crawlProgress.completed}/${uniquePages.length} pages...`);
      }
    });

    console.log(`[Intelligent Analysis] Successfully crawled ${crawledPages.filter(p => p.success).length}/${uniquePages.length} pages`);

    // Filter successful crawls
    const successfulPages = crawledPages.filter(p => p.success);
    if (successfulPages.length === 0) {
      throw new Error('Failed to crawl any selected pages');
    }

    // Find homepage in crawled pages
    const homepage = successfulPages.find(p => p.url === '/' || p.url === '') || successfulPages[0];

    // PHASE 3.5: BUSINESS INTELLIGENCE EXTRACTION
    progress('business-intelligence', 'Extracting business intelligence from crawled pages...');
    const businessIntel = extractBusinessIntelligence(successfulPages);
    console.log(`[Intelligent Analysis] Extracted business intelligence:`, {
      companySize: businessIntel.companySize,
      yearsInBusiness: businessIntel.yearsInBusiness?.estimatedYears,
      pricingVisibility: businessIntel.pricingVisibility?.visible,
      premiumFeatures: businessIntel.premiumFeatures?.detected?.length || 0
    });

    // PHASE 4: MULTI-PAGE ANALYSIS - Run analyzers on appropriate pages
    progress('analyze', 'Running multi-page SEO, content, and visual analysis...');

    // Prepare pages for each analyzer
    const seoPages = successfulPages.filter(p =>
      pageSelection.seo_pages.includes(p.url)
    );

    const contentPages = successfulPages.filter(p =>
      pageSelection.content_pages.includes(p.url)
    );

    const visualPages = successfulPages.filter(p =>
      pageSelection.visual_pages.includes(p.url)
    );

    const socialPages = successfulPages.filter(p =>
      pageSelection.social_pages.includes(p.url)
    );

    // Extract metadata from homepage
    const parsedData = parseHTML(homepage.html, url);

    // Enhanced context (include discovery status for SEO analysis)
    const enrichedContext = {
      ...context,
      baseUrl: url,
      tech_stack: homepage.metadata?.techStack || 'Unknown',
      has_blog: parsedData.content.hasBlog,
      // Discovery status for SEO analysis
      discovery_status: {
        has_sitemap: !sitemap.errors?.sitemap,
        has_robots: !sitemap.errors?.robots,
        sitemap_error: sitemap.errors?.sitemap || null,
        robots_error: sitemap.errors?.robots || null,
        pages_discovered: sitemap.totalPages,
        used_fallback: sitemap.sources?.fallback ? true : false
      }
    };

    // Import analyzers
    const { analyzeSEO } = await import('./analyzers/seo-analyzer.js');
    const { analyzeContent } = await import('./analyzers/content-analyzer.js');
    const { analyzeDesktopVisual } = await import('./analyzers/desktop-visual-analyzer.js');
    const { analyzeMobileVisual } = await import('./analyzers/mobile-visual-analyzer.js');
    const { analyzeSocial } = await import('./analyzers/social-analyzer.js');
    const { analyzeAccessibility } = await import('./analyzers/accessibility-analyzer.js');

    // For accessibility, analyze all unique pages (most comprehensive)
    const accessibilityPages = successfulPages;

    // Run all analyzers in parallel (including accessibility)
    const [seoResults, contentResults, desktopVisualResults, mobileVisualResults, socialResults, accessibilityResults] = await Promise.all([
      analyzeSEO(seoPages, enrichedContext, customPrompts?.seo),
      analyzeContent(contentPages, enrichedContext, customPrompts?.content),
      analyzeDesktopVisual(visualPages, enrichedContext, customPrompts?.desktopVisual),
      analyzeMobileVisual(visualPages, enrichedContext, customPrompts?.mobileVisual),
      analyzeSocial(socialPages, parsedData.social.links, {
        platformCount: parsedData.social.platformCount,
        platformsPresent: parsedData.social.platformsPresent
      }, enrichedContext, customPrompts?.social),
      analyzeAccessibility(accessibilityPages, enrichedContext, customPrompts?.accessibility)
    ]);

    const analysisResults = {
      seo: seoResults,
      content: contentResults,
      desktopVisual: desktopVisualResults,
      mobileVisual: mobileVisualResults,
      social: socialResults,
      accessibility: accessibilityResults
    };

    // PHASE 5: GRADING & INSIGHTS
    progress('grade', 'Calculating overall grade...');

    const scores = {
      design: Math.round(
        ((desktopVisualResults?.visualScore || 50) +
         (mobileVisualResults?.visualScore || 50)) / 2
      ),
      seo: seoResults?.seoScore || 50,
      content: contentResults?.contentScore || 50,
      social: socialResults?.socialScore || 50
    };

    const quickWins = extractQuickWins(analysisResults);

    const gradeMetadata = {
      quickWinCount: quickWins.length,
      isMobileFriendly: true, // Visual analyzer checks this now
      hasHTTPS: homepage.fullUrl?.startsWith('https://') || false,
      siteAccessible: true,
      industry: context.industry
    };

    const gradeResults = calculateGrade(scores, gradeMetadata);

    // Generate critique
    progress('critique', 'Generating actionable critique...');
    const critique = generateCritique(analysisResults, gradeResults, enrichedContext);

    // PHASE 5.5: LEAD SCORING - AI-driven lead qualification
    progress('lead-scoring', 'Scoring lead priority and qualification...');
    const leadScoringData = await scoreLeadPriority({
      company_name: context.company_name,
      industry: context.industry,
      url: homepage.fullUrl,
      city: context.city,
      state: context.state,
      website_grade: gradeResults.grade,
      overall_score: gradeResults.overallScore,
      design_score: scores.design,
      seo_score: scores.seo,
      content_score: scores.content,
      social_score: scores.social,
      tech_stack: homepage.metadata?.techStack || 'Unknown',
      page_load_time: homepage.metadata?.loadTime || null,
      is_mobile_friendly: !mobileVisualResults?.issues?.some(i => i.severity === 'critical'),
      has_https: homepage.fullUrl?.startsWith('https://') || false,
      design_issues: [...(desktopVisualResults?.issues || []), ...(mobileVisualResults?.issues || [])],
      quick_wins: quickWins,
      top_issue: getTopIssue(analysisResults),
      one_liner: generateOneLiner(
        context.company_name || 'This business',
        critique.topIssue,
        gradeResults.grade,
        quickWins.length
      ),
      social_platforms_present: parsedData.social.platformsPresent,
      contact_email: parsedData.content?.contactInfo?.emails?.[0] || context.contact_email || null,

      // Business intelligence data
      years_in_business: businessIntel.yearsInBusiness?.estimatedYears,
      founded_year: businessIntel.yearsInBusiness?.foundedYear,
      employee_count: businessIntel.companySize?.employeeCount,
      location_count: businessIntel.companySize?.locationCount,
      pricing_visible: businessIntel.pricingVisibility?.visible,
      pricing_range: businessIntel.pricingVisibility?.priceRange,
      blog_active: businessIntel.contentFreshness?.blogActive,
      content_last_update: businessIntel.contentFreshness?.lastUpdate,
      decision_maker_email: businessIntel.decisionMakerAccessibility?.hasDirectEmail,
      decision_maker_phone: businessIntel.decisionMakerAccessibility?.hasDirectPhone,
      owner_name: businessIntel.decisionMakerAccessibility?.ownerName,
      premium_features: businessIntel.premiumFeatures?.detected || [],
      budget_indicator: businessIntel.premiumFeatures?.budgetIndicator,
      pages_crawled: successfulPages.length
    });

    console.log(`[Intelligent Analysis] Lead scoring complete:`, {
      priority: leadScoringData.lead_priority,
      tier: leadScoringData.priority_tier,
      budget: leadScoringData.budget_likelihood
    });

    // Persist screenshots to local storage now that analysis is complete
    const baseScreenshotLabel = (() => {
      if (context.company_name) return context.company_name;
      try {
        return new URL(url).hostname || 'website';
      } catch {
        return 'website';
      }
    })();

    const slugify = (value) => {
      if (!value) return 'page';
      return value
        .toString()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'page';
    };

    for (const page of successfulPages) {
      if (!page.screenshots) {
        page.screenshot_paths = { desktop: null, mobile: null };
        continue;
      }

      const hasDesktopBuffer = Buffer.isBuffer(page.screenshots.desktop);
      const hasMobileBuffer = Buffer.isBuffer(page.screenshots.mobile);
      const existingDesktop = typeof page.screenshots.desktop === 'string' ? page.screenshots.desktop : null;
      const existingMobile = typeof page.screenshots.mobile === 'string' ? page.screenshots.mobile : null;

      let savedPaths = { desktop: existingDesktop, mobile: existingMobile };

      if (hasDesktopBuffer || hasMobileBuffer) {
        const pageLabel = page.url && page.url !== '/' ? slugify(page.url) : 'homepage';
        const screenshotLabel = `${baseScreenshotLabel}-${pageLabel}`;

        try {
          savedPaths = await saveDualScreenshots(page.screenshots, screenshotLabel);
        } catch (screenshotError) {
          console.warn(`[Intelligent Analysis] Failed to persist screenshots for ${page.fullUrl || page.url}:`, screenshotError.message);
          savedPaths = { desktop: null, mobile: null };
        }
      }

      page.screenshot_paths = savedPaths;

      // Remove heavy buffers now that they are persisted
      if (hasDesktopBuffer) {
        page.screenshots.desktop = null;
      }
      if (hasMobileBuffer) {
        page.screenshots.mobile = null;
      }
    }

    // Calculate costs
    const analysisCost = calculateTotalCost(analysisResults);

    // Compile final results
    const totalTime = Date.now() - startTime;
    progress('complete', 'Intelligent multi-page analysis complete!');

    return {
      success: true,
      analysis_mode: 'intelligent-multi-page',

      // Core results
      url: homepage.fullUrl,
      company_name: context.company_name,
      industry: context.industry,
      prospect_id: context.prospect_id,
      project_id: context.project_id,

      // Grading
      grade: gradeResults.grade,
      overall_score: gradeResults.overallScore,
      grade_label: gradeResults.gradeLabel,
      grade_description: gradeResults.gradeDescription,
      outreach_angle: gradeResults.outreachAngle,

      // Lead Scoring (AI-driven qualification) - NEW
      lead_priority: leadScoringData.lead_priority,
      lead_priority_reasoning: leadScoringData.lead_priority_reasoning,
      priority_tier: leadScoringData.priority_tier,
      budget_likelihood: leadScoringData.budget_likelihood,
      fit_score: leadScoringData.fit_score,

      // Lead Priority Dimension Scores - NEW
      quality_gap_score: leadScoringData.quality_gap_score,
      budget_score: leadScoringData.budget_score,
      urgency_score: leadScoringData.urgency_score,
      industry_fit_score: leadScoringData.industry_fit_score,
      company_size_score: leadScoringData.company_size_score,
      engagement_score: leadScoringData.engagement_score,

      // Scores breakdown
      design_score: scores.design,
      design_score_desktop: Math.round(desktopVisualResults?.visualScore || 50),
      design_score_mobile: Math.round(mobileVisualResults?.visualScore || 50),
      seo_score: scores.seo,
      content_score: scores.content,
      social_score: scores.social,
      accessibility_score: Math.round(accessibilityResults?.accessibilityScore || 50),

      // Model tracking (which AI models were used)
      seo_analysis_model: seoResults?._meta?.model || null,
      content_analysis_model: contentResults?._meta?.model || null,
      desktop_visual_model: desktopVisualResults?._meta?.model || null,
      mobile_visual_model: mobileVisualResults?._meta?.model || null,
      social_analysis_model: socialResults?._meta?.model || null,
      accessibility_analysis_model: accessibilityResults?._meta?.model || null,

      // Detailed analysis results
      design_issues: [...(desktopVisualResults?.issues || []), ...(mobileVisualResults?.issues || [])], // Legacy field
      design_issues_desktop: desktopVisualResults?.issues || [],
      design_issues_mobile: mobileVisualResults?.issues || [],
      desktop_critical_issues: desktopVisualResults?.issues?.filter(i => i.severity === 'critical').length || 0,
      mobile_critical_issues: mobileVisualResults?.issues?.filter(i => i.severity === 'critical').length || 0,
      seo_issues: seoResults?.issues || [],
      content_issues: contentResults?.issues || [],
      social_issues: socialResults?.issues || [],
      accessibility_issues: accessibilityResults?.issues || [],
      accessibility_wcag_level: accessibilityResults?.wcagLevel || 'AA',
      accessibility_compliance: accessibilityResults?.compliance || 'unknown',

      // Quick wins and top issue
      quick_wins: quickWins,
      top_issue: getTopIssue(analysisResults),

      // Critique
      analysis_summary: critique.summary,
      critique_sections: critique.sections,
      recommendations: critique.recommendations,
      call_to_action: critique.callToAction,
      one_liner: generateOneLiner(
        context.company_name || 'This business',
        critique.topIssue,
        gradeResults.grade,
        quickWins.length
      ),

      // Metadata
      tech_stack: homepage.metadata?.techStack || 'Unknown',
      has_blog: parsedData.content.hasBlog,
      has_https: homepage.fullUrl?.startsWith('https://') || false,
      is_mobile_friendly: !mobileVisualResults?.issues?.some(i => i.severity === 'critical'),
      page_load_time: homepage.metadata?.loadTime || null,
      city: context.city || null,
      state: context.state || null,
      address: context.address || null,

      // Contact Information
      contact_email: parsedData.content?.contactInfo?.emails?.[0] || context.contact_email || null,
      contact_phone: parsedData.content?.contactInfo?.phones?.[0] || context.contact_phone || null,
      contact_name: businessIntel.decisionMakerAccessibility?.ownerName || context.contact_name || null,

      // Content Insights - NEW
      content_insights: {
        wordCount: parsedData.content.wordCount,
        hasBlog: parsedData.content.hasBlog,
        blogPostCount: parsedData.content.blogPostCount,
        completeness: parsedData.content.completeness,
        ctaCount: parsedData.content.ctaCount,
        engagementHooks: contentResults?.engagementHooks || [],
        testimonialCount: contentResults?.pagesData?.reduce((sum, p) => sum + (p.testimonialCount || 0), 0) || 0
      },

      // Social
      social_profiles: parsedData.social.links,
      social_platforms_present: parsedData.social.platformsPresent,

      // Social Metadata - NEW
      social_metadata: {
        platformCount: parsedData.social.platformCount,
        hasSocialPresence: parsedData.social.hasSocialPresence,
        mostActivePlatform: socialResults?.mostActivePlatform || 'none',
        strengths: socialResults?.strengths || [],
        integrationData: {
          hasWidgets: parsedData.social.hasWidgets,
          hasShareButtons: parsedData.social.hasShareButtons
        }
      },

      // Page title and meta
      page_title: parsedData.seo.title,
      meta_description: parsedData.seo.description,

      // Screenshots (homepage only - local file paths)
      screenshot_desktop_url: homepage.screenshot_paths?.desktop || homepage.screenshots?.desktop || null,
      screenshot_mobile_url: homepage.screenshot_paths?.mobile || homepage.screenshots?.mobile || null,

      // Project-specific metadata
      project_status: context.project_status || null,
      project_notes: context.project_notes || null,
      project_custom_score: context.custom_score || null,
      project_discovery_query: context.discovery_query || null,

      // Performance metadata
      analysis_cost: analysisCost,
      analysis_time: totalTime,
      analyzed_at: new Date().toISOString(),

      // COMPREHENSIVE DISCOVERY LOG - Captures all critical analysis data
      discovery_log: {
        // Discovery Summary
        summary: {
          total_discovered: sitemap.totalPages,
          sitemap_pages: sitemap.sources?.sitemap || 0,
          robots_pages: sitemap.sources?.robots || 0,
          navigation_pages: sitemap.sources?.navigation || 0,
          discovery_time_ms: sitemap.discoveryTime || 0,
          used_fallback: sitemap.sources?.fallback ? true : false,
          discovery_method: Object.keys(sitemap.sources || {}).filter(k => sitemap.sources[k] > 0).join(', ') || 'unknown'
        },

        // All Discovered Pages (limit to 10000 to prevent bloat)
        all_pages: sitemap.pages?.slice(0, 10000) || [],
        total_pages_count: sitemap.pages?.length || 0,

        // AI Page Selection Details
        ai_selection: {
          reasoning: pageSelection.reasoning || 'No reasoning provided',
          selected_pages: {
            seo: pageSelection.seo_pages || [],
            content: pageSelection.content_pages || [],
            visual: pageSelection.visual_pages || [],
            social: pageSelection.social_pages || []
          },
          selection_criteria: pageSelection.criteria || 'Standard selection',
          pages_analyzed: successfulPages.map(p => ({
            url: p.url,
            fullUrl: p.fullUrl,
            screenshots: {
              desktop: p.screenshot_paths?.desktop || null,
              mobile: p.screenshot_paths?.mobile || null
            },
            analyzed_for: {
              seo: seoPages.some(sp => sp.url === p.url),
              content: contentPages.some(cp => cp.url === p.url),
              visual: visualPages.some(vp => vp.url === p.url),
              social: socialPages.some(sp => sp.url === p.url)
            }
          }))
        },

        // Discovery Errors and Issues
        discovery_issues: {
          sitemap_missing: !enrichedContext.discovery_status.has_sitemap,
          sitemap_error: sitemap.errors?.sitemap || null,
          robots_missing: !enrichedContext.discovery_status.has_robots,
          robots_error: sitemap.errors?.robots || null,
          navigation_error: sitemap.errors?.navigation || null,
          crawl_failures: crawledPages.filter(p => !p.success).map(p => ({
            url: p.url,
            error: p.error?.message || p.error || 'Unknown error',
            fullUrl: p.fullUrl
          }))
        },

        // Critical Analysis Findings
        critical_findings: {
          grade: gradeResults.grade,
          overall_score: gradeResults.overallScore,
          lead_priority: leadScoringData.lead_priority,
          priority_tier: leadScoringData.priority_tier,
          budget_likelihood: leadScoringData.budget_likelihood,

          // Critical issues by category
          critical_seo_issues: seoResults?.issues?.filter(i => i.severity === 'critical' || i.severity === 'high')?.slice(0, 5) || [],
          critical_design_issues: [...(desktopVisualResults?.issues || []), ...(mobileVisualResults?.issues || [])]
            .filter(i => i.severity === 'critical')
            .slice(0, 5),
          critical_accessibility_issues: accessibilityResults?.issues?.filter(i => i.severity === 'critical')?.slice(0, 5) || [],

          // Top findings
          top_issue: getTopIssue(analysisResults),
          quick_wins_count: quickWins.length,
          quick_wins_preview: quickWins.slice(0, 3).map(w => w.title || w.description),

          // Key insights
          analysis_summary: critique.summary,
          one_liner: generateOneLiner(context.company_name || 'This business', critique.topIssue, gradeResults.grade, quickWins.length)
        },

        // Technical Metadata
        technical_details: {
          tech_stack: homepage.metadata?.techStack || 'Unknown',
          page_load_time: homepage.metadata?.loadTime || null,
          is_mobile_friendly: !mobileVisualResults?.issues?.some(i => i.severity === 'critical'),
          has_https: homepage.fullUrl?.startsWith('https://') || false,
          has_blog: parsedData.content.hasBlog,
          social_platforms: parsedData.social.platformsPresent || [],

          // Business intelligence
          years_in_business: businessIntel.yearsInBusiness?.estimatedYears,
          company_size: businessIntel.companySize,
          pricing_visible: businessIntel.pricingVisibility?.visible,
          premium_features_count: businessIntel.premiumFeatures?.detected?.length || 0
        },

        // Analysis Performance
        analysis_metrics: {
          total_time_ms: totalTime,
          pages_crawled: successfulPages.length,
          pages_failed: crawledPages.filter(p => !p.success).length,
          analysis_cost: analysisCost,
          ai_models_used: {
            seo: seoResults?._meta?.model || 'unknown',
            content: contentResults?._meta?.model || 'unknown',
            desktop_visual: desktopVisualResults?._meta?.model || 'unknown',
            mobile_visual: mobileVisualResults?._meta?.model || 'unknown',
            social: socialResults?._meta?.model || 'unknown',
            accessibility: accessibilityResults?._meta?.model || 'unknown'
          }
        },

        // Timestamp for this log
        logged_at: new Date().toISOString()
      },

      // Business Intelligence - NEW
      business_intelligence: {
        companySize: businessIntel.companySize,
        yearsInBusiness: businessIntel.yearsInBusiness?.estimatedYears,
        foundedYear: businessIntel.yearsInBusiness?.foundedYear,
        employeeCount: businessIntel.companySize?.employeeCount,
        locationCount: businessIntel.companySize?.locationCount,
        pricingVisibility: businessIntel.pricingVisibility,
        contentFreshness: businessIntel.contentFreshness,
        decisionMakerAccessibility: businessIntel.decisionMakerAccessibility,
        premiumFeatures: businessIntel.premiumFeatures,
        pageTypes: businessIntel.pageTypes,
        budgetIndicator: businessIntel.premiumFeatures?.budgetIndicator
      },

      // Intelligent analysis metadata
      intelligent_analysis: {
        pages_discovered: sitemap.totalPages,
        pages_crawled: successfulPages.length,
        pages_analyzed_seo: seoPages.length,
        pages_analyzed_content: contentPages.length,
        pages_analyzed_visual: visualPages.length,
        pages_analyzed_social: socialPages.length,
        ai_page_selection: pageSelection.reasoning,
        discovery_sources: sitemap.sources
      },

      // Crawl metadata with detailed error logging
      crawl_metadata: {
        pages_discovered: sitemap.totalPages,
        pages_crawled: successfulPages.length,
        total_pages_attempted: crawledPages.length,
        discovery_time_ms: sitemap.discoveryTime || 0,
        crawl_time_ms: totalTime,
        discovery_errors: sitemap.errors || {
          sitemap: null,
          robots: null,
          navigation: null
        },
        failed_pages: crawledPages
          .filter(p => !p.success)
          .map(p => ({
            url: p.url,
            error: p.error,
            fullUrl: p.fullUrl
        })),
        // Pages analyzed (metadata only - screenshots are NOT stored to avoid database bloat)
        pages_analyzed: successfulPages.map(p => ({
          url: p.url,
          fullUrl: p.fullUrl,
          has_screenshots: Boolean(p.screenshots?.desktop || p.screenshots?.mobile),
          screenshot_paths: {
            desktop: p.screenshot_paths?.desktop || null,
            mobile: p.screenshot_paths?.mobile || null
          },
          analyzed_for: {
            seo: seoPages.some(sp => sp.url === p.url),
            content: contentPages.some(cp => cp.url === p.url),
            visual: visualPages.some(vp => vp.url === p.url),
            social: socialPages.some(sp => sp.url === p.url)
          }
        }))
      },

      // Raw data (for debugging)
      _raw: {
        analysisResults,
        gradeResults,
        parsedData,
        pageSelection,
        sitemap: {
          totalPages: sitemap.totalPages,
          sources: sitemap.sources
        }
      }
    };

    // PHASE 6: REPORT GENERATION (if requested)
    if (generate_report) {
      console.log(`\n[Report Generation] Starting ${report_format.toUpperCase()} report generation...`);
      progress('report', `Generating ${report_format} report...`);
      
      try {
        const reportResult = await autoGenerateReport(finalResult, {
          format: report_format,
          sections: ['all'],
          saveToDatabase: save_to_database,
          project_id: context.project_id
        });

        if (reportResult.success) {
          console.log(`[Report Generation] ✅ Report generated successfully`);
          console.log(`[Report Generation] 📄 Local path: ${reportResult.local_path}`);
          
          // Add report paths to the result
          finalResult.report_html_path = reportResult.local_path;
          finalResult.report_markdown_path = null; // Only HTML in this case
          finalResult.report_storage_path = reportResult.storage_path;
          finalResult.report_format = report_format;
          
          // Add synthesis metadata if available
          if (reportResult.synthesis?.used) {
            finalResult.synthesis_metadata = {
              success: true,
              original_issue_count: Object.values(finalResult).filter(k => k.includes('_issues')).reduce((sum, key) => {
                return sum + (Array.isArray(finalResult[key]) ? finalResult[key].length : 0);
              }, 0),
              consolidated_issue_count: reportResult.synthesis.consolidatedIssuesCount,
              reduction_percentage: Math.round((1 - reportResult.synthesis.consolidatedIssuesCount / 
                Object.values(finalResult).filter(k => k.includes('_issues')).reduce((sum, key) => {
                  return sum + (Array.isArray(finalResult[key]) ? finalResult[key].length : 0);
                }, 0)) * 100),
              total_duration_seconds: reportResult.metadata?.generation_time_ms ? 
                (reportResult.metadata.generation_time_ms / 1000).toFixed(1) : 'N/A',
              total_tokens_used: reportResult.metadata?.total_tokens || 0,
              total_cost: reportResult.metadata?.total_cost || 0,
              errors: reportResult.synthesis.errors
            };
          }
          
          progress('report', `Report saved to ${reportResult.local_path}`);
        } else {
          console.warn(`[Report Generation] ⚠️  Report generation failed: ${reportResult.error}`);
          finalResult.report_error = reportResult.error;
        }
      } catch (reportError) {
        console.error(`[Report Generation] ❌ Report generation failed:`, reportError);
        finalResult.report_error = reportError.message;
      }
    }

    return finalResult;

  } catch (error) {
    console.error('Intelligent analysis failed:', error);

    return {
      success: false,
      analysis_mode: 'intelligent-multi-page',
      url,
      company_name: context.company_name,
      industry: context.industry,
      prospect_id: context.prospect_id,
      project_id: context.project_id,
      error: error.message,
      analyzed_at: new Date().toISOString(),
      analysis_time: Date.now() - startTime
    };
  }
}

