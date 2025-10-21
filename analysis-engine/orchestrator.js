/**
 * Orchestrator - Coordinates the full website analysis pipeline
 *
 * PIPELINE:
 * 1. Multi-page crawling (homepage + all level-1 + 50% level-2+)
 * 2. Extract business intelligence from all crawled pages
 * 3. Parse HTML for structured data
 * 4. Run all analyzers in parallel (design, SEO, content, social)
 * 5. Calculate grade and extract insights
 * 6. Generate critique for outreach
 * 7. Score lead priority (with business intelligence + website quality)
 * 8. Calculate costs
 * 9. Return complete analysis with business intelligence
 */

import { captureDualViewports } from './scrapers/screenshot-capture.js';
import { parseHTML } from './scrapers/html-parser.js';
import { runAllAnalyses, calculateTotalCost } from './analyzers/index.js';
import { calculateGrade, extractQuickWins, getTopIssue } from './grading/grader.js';
import { generateCritique, generateOneLiner } from './grading/critique-generator.js';
import { scoreLeadPriority } from './analyzers/lead-scorer.js';
import { saveDualScreenshots } from './utils/screenshot-storage.js';
import { crawlWebsite, crawlSelectedPagesWithScreenshots } from './scrapers/multi-page-crawler.js';
import { extractBusinessIntelligence } from './scrapers/business-intelligence-extractor.js';
import { discoverAllPages } from './scrapers/sitemap-discovery.js';
import { selectPagesForAnalysis, getUniquePagesToCrawl } from './scrapers/intelligent-page-selector.js';

/**
 * Run complete analysis pipeline for a single URL
 *
 * @param {string} url - Website URL to analyze
 * @param {object} context - Business context
 * @param {string} context.company_name - Company name
 * @param {string} context.industry - Industry type
 * @param {string} context.prospect_id - Prospect ID (for database)
 * @param {object} options - Analysis options
 * @param {object} options.customPrompts - Custom AI prompts (optional)
 * @param {function} options.onProgress - Progress callback (optional)
 * @returns {Promise<object>} Complete analysis results
 */
export async function analyzeWebsite(url, context = {}, options = {}) {
  const { customPrompts, onProgress } = options;

  const startTime = Date.now();
  const progress = (step, message) => {
    if (onProgress) {
      onProgress({ step, message, timestamp: new Date().toISOString() });
    }
  };

  try {
    // STEP 1: Multi-page crawling
    progress('crawl', `Crawling website: ${url}...`);
    const crawlResult = await crawlWebsite(url, {
      maxTotalPages: 30,
      maxCrawlTime: 120000, // 2 minutes
      captureScreenshots: true, // Capture homepage screenshot for design analysis
      onProgress: (crawlProgress) => {
        progress('crawl', `Crawled ${crawlProgress.crawled}/${crawlProgress.total} pages...`);
      }
    });

    if (!crawlResult || !crawlResult.homepage) {
      throw new Error('Failed to crawl website: No homepage data returned');
    }

    // Extract data from homepage
    const {
      screenshot,
      html,
      metadata: pageMetadata,
      techStack,
      isMobileFriendly,
      pageLoadTime
    } = crawlResult.homepage;

    // NEW: Capture both desktop and mobile screenshots for visual analysis
    progress('screenshots', 'Capturing desktop and mobile screenshots...');
    const dualScreenshots = await captureDualViewports(crawlResult.homepage.url);

    // Save screenshots to local disk
    progress('screenshots', 'Saving screenshots to disk...');
    const screenshotPaths = await saveDualScreenshots(
      {
        desktop: dualScreenshots.desktop.screenshot,
        mobile: dualScreenshots.mobile.screenshot
      },
      context.company_name || 'website'
    );

    console.log(`📸 Screenshots saved:\n   Desktop: ${screenshotPaths.desktop}\n   Mobile: ${screenshotPaths.mobile}`);

    // STEP 2: Extract business intelligence from all crawled pages
    progress('business-intelligence', 'Extracting business intelligence...');
    const allPages = [crawlResult.homepage, ...crawlResult.pages].filter(p => p && p.html);
    const businessIntel = extractBusinessIntelligence(allPages);

    // STEP 3: Parse HTML
    progress('parse', 'Parsing HTML and extracting data...');
    const parsedData = parseHTML(html, url);

    // Enhance context with parsed data
    const enrichedContext = {
      ...context,
      tech_stack: techStack?.cms || 'Unknown',
      load_time: (pageLoadTime / 1000).toFixed(2), // Convert to seconds
      has_blog: parsedData.content.hasBlog
    };

    // STEP 4: Run all analyzers in parallel (NEW: separate desktop and mobile visual analysis)
    progress('analyze', 'Running desktop, mobile, SEO, content, and social analysis...');
    const analysisResults = await runAllAnalyses({
      url,
      screenshot, // Legacy - for backward compatibility
      desktopScreenshot: dualScreenshots.desktop.screenshot,
      mobileScreenshot: dualScreenshots.mobile.screenshot,
      html,
      context: enrichedContext,
      customPrompts, // Pass custom prompts to analyzers
      socialProfiles: parsedData.social.links,
      socialMetadata: {
        platformCount: parsedData.social.platformCount,
        platformsPresent: parsedData.social.platformsPresent
      }
    });

    // Add parsed data to analysis results
    analysisResults.seo.parsedData = parsedData.seo;
    analysisResults.content.parsedData = parsedData.content;
    analysisResults.social.parsedData = parsedData.social;

    // STEP 5: Calculate grade
    progress('grade', 'Calculating overall grade...');

    const scores = {
      // NEW: Average desktop and mobile visual scores for overall grade
      design: Math.round(
        ((analysisResults.desktopVisual?.visualScore || 50) +
         (analysisResults.mobileVisual?.visualScore || 50)) / 2
      ),
      seo: analysisResults.seo?.seoScore || 50,
      content: analysisResults.content?.contentScore || 50,
      social: analysisResults.social?.socialScore || 50
    };

    const quickWins = extractQuickWins(analysisResults);

    const gradeMetadata = {
      quickWinCount: quickWins.length,
      isMobileFriendly,
      hasHTTPS: pageMetadata?.hasHTTPS || false,
      siteAccessible: true,
      industry: context.industry
    };

    const gradeResults = calculateGrade(scores, gradeMetadata);

    // STEP 6: Generate critique
    progress('critique', 'Generating actionable critique...');
    const critique = generateCritique(analysisResults, gradeResults, enrichedContext);

    // STEP 7: Score lead priority (with business intelligence)
    progress('lead-scoring', 'Evaluating lead quality and priority...');
    const leadPriorityData = await scoreLeadPriority({
      company_name: context.company_name,
      industry: context.industry,
      url: crawlResult.homepage.url,
      city: context.city,
      state: context.state,
      website_grade: gradeResults.grade,
      overall_score: gradeResults.overallScore,
      design_score: scores.design,
      seo_score: scores.seo,
      content_score: scores.content,
      social_score: scores.social,
      tech_stack: techStack?.cms || 'Unknown',
      page_load_time: pageLoadTime,
      is_mobile_friendly: isMobileFriendly,
      has_https: pageMetadata?.hasHTTPS || false,
      design_issues: analysisResults.design?.issues || [],
      quick_wins: quickWins,
      top_issue: getTopIssue(analysisResults),
      one_liner: generateOneLiner(
        context.company_name || 'This business',
        critique.topIssue,
        gradeResults.grade,
        quickWins.length
      ),
      social_platforms_present: parsedData.social.platformsPresent,
      contact_email: parsedData.content.contactInfo.emails[0] || null,

      // Business intelligence from multi-page crawl
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
      pages_crawled: crawlResult.metadata.totalPagesCrawled
    });

    // STEP 8: Calculate costs
    const analysisCost = calculateTotalCost(analysisResults);

    // STEP 9: Compile final results
    const totalTime = Date.now() - startTime;
    progress('complete', 'Analysis complete!');

    return {
      success: true,

      // Core results
      url: crawlResult.homepage.url,
      company_name: context.company_name,
      industry: context.industry,
      city: context.city,
      prospect_id: context.prospect_id,
      project_id: context.project_id,

      // Grading
      grade: gradeResults.grade,
      overall_score: gradeResults.overallScore,
      grade_label: gradeResults.gradeLabel,
      grade_description: gradeResults.gradeDescription,
      outreach_angle: gradeResults.outreachAngle,

      // Lead Priority (AI-scored)
      lead_priority: leadPriorityData.lead_priority,
      lead_priority_reasoning: leadPriorityData.lead_priority_reasoning,
      priority_tier: leadPriorityData.priority_tier,
      budget_likelihood: leadPriorityData.budget_likelihood,
      fit_score: leadPriorityData.fit_score,

      // Lead Priority Dimension Scores
      quality_gap_score: leadPriorityData.quality_gap_score,
      budget_score: leadPriorityData.budget_score,
      urgency_score: leadPriorityData.urgency_score,
      industry_fit_score: leadPriorityData.industry_fit_score,
      company_size_score: leadPriorityData.company_size_score,
      engagement_score: leadPriorityData.engagement_score,

      // Scores breakdown
      design_score: scores.design, // Legacy: Average of desktop + mobile
      design_score_desktop: Math.round(analysisResults.desktopVisual?.visualScore || 50),
      design_score_mobile: Math.round(analysisResults.mobileVisual?.visualScore || 50),
      seo_score: scores.seo,
      content_score: scores.content,
      social_score: scores.social,

      // Detailed analysis results
      design_issues: analysisResults.design?.issues || [], // Legacy
      design_issues_desktop: analysisResults.desktopVisual?.issues || [],
      design_issues_mobile: analysisResults.mobileVisual?.issues || [],
      desktop_critical_issues: analysisResults.desktopVisual?.issues?.filter(i => i.priority === 'high').length || 0,
      mobile_critical_issues: analysisResults.mobileVisual?.issues?.filter(i => i.priority === 'high').length || 0,
      visual_analysis_model: analysisResults.desktopVisual?._meta?.model || 'gpt-4o',
      seo_issues: analysisResults.seo?.issues || [],
      content_issues: analysisResults.content?.issues || [],
      social_issues: analysisResults.social?.issues || [],

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
      tech_stack: techStack?.cms || 'Unknown',
      page_load_time: pageLoadTime,
      is_mobile_friendly: isMobileFriendly,
      has_https: pageMetadata?.hasHTTPS || false,
      has_blog: parsedData.content.hasBlog,

      // Screenshot paths (local file paths)
      screenshot_desktop_url: screenshotPaths.desktop,
      screenshot_mobile_url: screenshotPaths.mobile,

      // Social
      social_profiles: parsedData.social.links,
      social_platforms_present: parsedData.social.platformsPresent,
      social_metadata: {
        platformCount: parsedData.social.platformCount,
        hasSocialPresence: parsedData.social.hasSocialPresence
      },

      // Content insights
      content_insights: {
        wordCount: parsedData.content.wordCount,
        hasBlog: parsedData.content.hasBlog,
        blogPostCount: parsedData.content.blogPostCount,
        completeness: parsedData.content.completeness,
        ctaCount: parsedData.content.ctaCount
      },

      // Contact info (if found)
      contact_email: parsedData.content.contactInfo.emails[0] || null,
      contact_phone: parsedData.content.contactInfo.phones[0] || null,

      // SEO metadata
      page_title: parsedData.seo.title,
      meta_description: parsedData.seo.description,

      // Performance metadata
      analysis_cost: analysisCost,
      analysis_time: totalTime,
      analyzed_at: new Date().toISOString(),

      // Business Intelligence (from multi-page crawl)
      business_intelligence: {
        years_in_business: businessIntel.yearsInBusiness?.estimatedYears,
        founded_year: businessIntel.yearsInBusiness?.foundedYear,
        employee_count: businessIntel.companySize?.employeeCount,
        location_count: businessIntel.companySize?.locationCount,
        pricing_visible: businessIntel.pricingVisibility?.visible,
        pricing_range: businessIntel.pricingVisibility?.priceRange,
        blog_active: businessIntel.contentFreshness?.blogActive,
        content_last_update: businessIntel.contentFreshness?.lastUpdate,
        decision_maker_accessible: businessIntel.decisionMakerAccessibility?.hasDirectEmail || businessIntel.decisionMakerAccessibility?.hasDirectPhone,
        owner_name: businessIntel.decisionMakerAccessibility?.ownerName,
        premium_features: businessIntel.premiumFeatures?.detected || [],
        budget_indicator: businessIntel.premiumFeatures?.budgetIndicator
      },

      // Crawl metadata
      crawl_metadata: {
        pages_crawled: crawlResult.metadata.totalPagesCrawled,
        links_found: crawlResult.metadata.totalLinksFound,
        crawl_time: crawlResult.metadata.crawlTime,
        failed_pages: crawlResult.metadata.failedPages?.length || 0
      },

      // Raw data (for debugging/detailed view)
      _raw: {
        analysisResults,
        gradeResults,
        parsedData,
        techStack,
        businessIntelligence: businessIntel,
        crawlResult: {
          homepage: crawlResult.homepage,
          pagesDiscovered: crawlResult.pages.length,
          metadata: crawlResult.metadata
        }
      }
    };

  } catch (error) {
    console.error('Analysis failed:', error);

    return {
      success: false,
      url,
      company_name: context.company_name,
      industry: context.industry,
      city: context.city,
      prospect_id: context.prospect_id,
      project_id: context.project_id,
      error: error.message,
      analyzed_at: new Date().toISOString(),
      analysis_time: Date.now() - startTime
    };
  }
}

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
 * @returns {Promise<object>} Complete analysis results
 */
export async function analyzeWebsiteIntelligent(url, context = {}, options = {}) {
  const { customPrompts, onProgress, maxPagesPerModule = 5 } = options;

  const startTime = Date.now();
  const progress = (step, message) => {
    if (onProgress) {
      onProgress({ step, message, timestamp: new Date().toISOString() });
    }
  };

  try {
    // PHASE 1: DISCOVERY - Find all pages without visiting them
    progress('discovery', `Discovering all pages on ${url}...`);
    const sitemap = await discoverAllPages(url, { timeout: 30000 });

    console.log(`[Intelligent Analysis] Discovered ${sitemap.totalPages} pages`);
    progress('discovery', `Found ${sitemap.totalPages} pages via sitemap/robots/navigation`);

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

    // Enhanced context
    const enrichedContext = {
      ...context,
      baseUrl: url,
      tech_stack: homepage.metadata?.techStack || 'Unknown',
      has_blog: parsedData.content.hasBlog
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
      design_issues_desktop: desktopVisualResults?.issues || [],
      design_issues_mobile: mobileVisualResults?.issues || [],
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

      // Social
      social_profiles: parsedData.social.links,
      social_platforms_present: parsedData.social.platformsPresent,

      // Page title and meta
      page_title: parsedData.seo.title,
      meta_description: parsedData.seo.description,

      // Screenshots (homepage only - local file paths)
      screenshot_desktop_url: homepage.screenshots?.desktop || null,
      screenshot_mobile_url: homepage.screenshots?.mobile || null,

      // Performance metadata
      analysis_cost: analysisCost,
      analysis_time: totalTime,
      analyzed_at: new Date().toISOString(),

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
        // All page screenshot URLs (just file paths, not binary data)
        pages_analyzed: successfulPages.map(p => ({
          url: p.url,
          fullUrl: p.fullUrl,
          screenshot_desktop_url: p.screenshots?.desktop || null,
          screenshot_mobile_url: p.screenshots?.mobile || null,
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

/**
 * Analyze multiple websites in parallel
 *
 * @param {array} targets - Array of {url, context} objects
 * @param {object} options - Analysis options
 * @param {number} options.concurrency - Max parallel analyses (default: 2)
 * @param {object} options.customPrompts - Custom AI prompts to use instead of defaults
 * @param {function} options.onProgress - Progress callback
 * @param {function} options.onComplete - Completion callback per analysis
 * @returns {Promise<array>} Array of analysis results
 */
export async function analyzeMultiple(targets, options = {}) {
  const { concurrency = 2, customPrompts, onProgress, onComplete } = options;

  const results = [];
  const chunks = chunkArray(targets, concurrency);

  let completed = 0;
  const total = targets.length;

  for (const chunk of chunks) {
    const chunkResults = await Promise.allSettled(
      chunk.map(({ url, context }) =>
        analyzeWebsite(url, context, {
          customPrompts, // Pass custom prompts through
          onProgress: onProgress ? (progress) => {
            onProgress({
              ...progress,
              url,
              completed,
              total
            });
          } : undefined
        })
      )
    );

    for (const result of chunkResults) {
      completed++;

      const analysisResult = result.status === 'fulfilled'
        ? result.value
        : {
            success: false,
            error: result.reason.message,
            analyzed_at: new Date().toISOString()
          };

      results.push(analysisResult);

      if (onComplete) {
        onComplete(analysisResult, completed, total);
      }
    }
  }

  return results;
}

/**
 * Get analysis summary for a batch
 */
export function getBatchSummary(results) {
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  const gradeDistribution = {
    A: successful.filter(r => r.grade === 'A').length,
    B: successful.filter(r => r.grade === 'B').length,
    C: successful.filter(r => r.grade === 'C').length,
    D: successful.filter(r => r.grade === 'D').length,
    F: successful.filter(r => r.grade === 'F').length
  };

  const avgScore = successful.length > 0
    ? successful.reduce((sum, r) => sum + r.overall_score, 0) / successful.length
    : 0;

  const totalCost = successful.reduce((sum, r) => sum + (r.analysis_cost || 0), 0);
  const totalTime = successful.reduce((sum, r) => sum + (r.analysis_time || 0), 0);

  return {
    total: results.length,
    successful: successful.length,
    failed: failed.length,
    gradeDistribution,
    averageScore: Math.round(avgScore * 10) / 10,
    totalCost: Math.round(totalCost * 1000) / 1000,
    totalTime,
    avgTimePerAnalysis: successful.length > 0 ? Math.round(totalTime / successful.length) : 0
  };
}

/**
 * Split array into chunks
 */
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
