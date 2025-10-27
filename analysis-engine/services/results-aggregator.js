/**
 * Results Aggregator
 * 
 * Responsible for compiling final analysis results:
 * - Calculating scores and grades
 * - Extracting quick wins
 * - Generating critique
 * - Lead scoring
 * - Saving screenshots
 * 
 * Single Responsibility: Results Compilation & Grading
 */

import { calculateGrade, extractQuickWins as extractQuickWinsFromModules, getTopIssue } from '../grading/grader.js';
import { generateCritique, generateOneLiner } from '../grading/critique-generator.js';
import { scoreLeadPriority } from '../analyzers/lead-scorer.js';
import { saveDualScreenshots } from '../utils/screenshot-storage.js';
import { countCriticalDesktopIssues } from '../analyzers/desktop-visual-analyzer.js';
import { countCriticalMobileIssues } from '../analyzers/mobile-visual-analyzer.js';
import { calculateTotalCost } from '../analyzers/index.js';
import { runReportSynthesis } from '../reports/synthesis/report-synthesis.js';
import { validateReportQuality, generateQAReport } from '../reports/synthesis/qa-validator.js';
import { gradeWithAI } from '../grading/ai-grader.js';

export class ResultsAggregator {
  constructor(options = {}) {
    this.onProgress = options.onProgress || (() => {});
  }

  /**
   * Aggregate all analysis results into final output
   *
   * @param {object} analysisResults - Results from AnalysisCoordinator
   * @param {object} crawlData - Data from CrawlingService
   * @param {object} pageSelection - Selection from PageSelectionService
   * @param {object} discoveryData - Data from DiscoveryService
   * @param {object} context - Business context
   * @param {string} baseUrl - Base website URL
   * @param {number} startTime - Analysis start timestamp
   * @param {object} benchmark - Matched benchmark data (optional)
   * @param {object} benchmarkMatchMetadata - Benchmark match metadata (optional)
   * @returns {Promise<object>} Complete analysis results
   */
  async aggregate(analysisResults, crawlData, pageSelection, discoveryData, context, baseUrl, startTime, benchmark = null, benchmarkMatchMetadata = null) {
    const { pages, homepage, businessIntel } = crawlData;
    const { parsedData, enrichedContext } = analysisResults.metadata;

    // PHASE 1: Calculate Scores
    const scores = this.calculateScores(analysisResults);

    // PHASE 2: Extract Quick Wins
    const quickWins = this.extractQuickWins(analysisResults);

    // PHASE 3: Grading + Lead Scoring (AI or Manual)
    const useAIGrading = process.env.USE_AI_GRADING === 'true';
    let gradeResults, leadScoringData;

    // Initialize gradeMetadata (used in both AI and manual paths, and later for synthesis)
    let gradeMetadata = {
      quickWinCount: quickWins.length,
      isMobileFriendly: !analysisResults.mobileVisual?.issues?.some(i => i.severity === 'critical'),
      hasHTTPS: homepage.fullUrl?.startsWith('https://') || false,
      siteAccessible: true,
      industry: context.industry
    };

    if (useAIGrading) {
      // AI-POWERED GRADING (NEW)
      this.onProgress({ step: 'ai-grading', message: 'AI grading with benchmark comparison...' });
      console.log('\n[AI Grading] Using AI comparative grading...');

      // Extend gradeMetadata with AI-specific fields
      gradeMetadata = {
        ...gradeMetadata,
        quickWinCount: quickWins.length,
        isMobileFriendly: !analysisResults.mobileVisual?.issues?.some(i => i.severity === 'critical'),
        hasHTTPS: homepage.fullUrl?.startsWith('https://') || false,
        siteAccessible: true,
        industry: context.industry,
        company_name: context.company_name,
        url: homepage.fullUrl,
        city: context.city,
        state: context.state,
        business_intelligence: {
          employee_count: businessIntel.companySize?.employeeCount,
          pricing_visible: businessIntel.pricingVisibility?.visible,
          pricing_range: businessIntel.pricingVisibility?.priceRange,
          blog_active: businessIntel.contentFreshness?.blogActive,
          premium_features: businessIntel.premiumFeatures?.detected || [],
          google_rating: context.google_rating,
          review_count: context.google_review_count,
          has_pricing: businessIntel.pricingVisibility?.visible,
          has_blog: businessIntel.contentFreshness?.blogActive
        },
        icp_criteria: context.icp_criteria || null
      };

      const aiGradingResult = await gradeWithAI(
        { ...analysisResults, scores },
        gradeMetadata
      );

      if (aiGradingResult.success) {
        // AI grading successful - use AI results
        gradeResults = {
          grade: aiGradingResult.overall_grade || aiGradingResult.grade,  // Support both field names
          overallScore: aiGradingResult.overall_score,
          weightedScore: aiGradingResult.overall_score,
          bonuses: [],
          penalties: [],
          weights: aiGradingResult.dimension_weights_used,  // Fixed: was dimension_weights
          weight_reasoning: aiGradingResult.weight_reasoning,  // Moved to top level for report display
          _meta: {
            grader: 'ai-comparative-v1',
            timestamp: new Date().toISOString(),
            benchmark_id: aiGradingResult.comparison?.benchmark_id
          }
        };

        leadScoringData = {
          lead_score: aiGradingResult.lead_score,
          lead_priority: aiGradingResult.lead_score,  // Use numeric score (0-100), not string
          priority_tier: aiGradingResult.lead_score >= 75 ? 'hot' :
                         aiGradingResult.lead_score >= 50 ? 'warm' : 'cold',
          budget_likelihood: aiGradingResult.sales_insights?.estimated_project_value,
          receptiveness_score: aiGradingResult.sales_insights?.receptiveness_score,
          key_pain_points: aiGradingResult.sales_insights?.key_pain_points || [],
          value_proposition: aiGradingResult.sales_insights?.value_proposition,
          urgency_factors: aiGradingResult.sales_insights?.urgency_factors || [],
          comparison_summary: aiGradingResult.comparison,
          business_context: aiGradingResult.business_context,
          _meta: {
            scorer: 'ai-comparative-v1',
            timestamp: new Date().toISOString()
          }
        };

        console.log(`[AI Grading] ✅ Grade: ${gradeResults.grade} (${gradeResults.overallScore}/100)`);
        console.log(`[AI Grading] ✅ Lead Score: ${leadScoringData.lead_score}/100 (${leadScoringData.lead_priority} priority)`);
      } else {
        // AI grading failed - fall back to manual
        console.warn('[AI Grading] ⚠️ AI grading failed, falling back to manual grading');
        useAIGrading = false; // Trigger fallback below
      }
    }

    if (!useAIGrading) {
      // MANUAL GRADING (LEGACY)
      this.onProgress({ step: 'grade', message: 'Calculating overall grade...' });
      // gradeMetadata already initialized above

      gradeResults = calculateGrade({
        design: scores.design_score,
        seo: scores.seo_score,
        performance: scores.performance_score,
        content: scores.content_score,
        accessibility: scores.accessibility_score,
        social: scores.social_score
      }, gradeMetadata);

      // Manual lead scoring
      this.onProgress({ step: 'lead-scoring', message: 'Scoring lead priority and qualification...' });

      leadScoringData = await scoreLeadPriority({
        company_name: context.company_name,
        industry: context.industry,
        url: homepage.fullUrl,
        city: context.city,
        state: context.state,
        website_grade: gradeResults.grade,
        overall_score: gradeResults.overallScore,
        design_score: scores.design_score,
        seo_score: scores.seo_score,
        content_score: scores.content_score,
        social_score: scores.social_score,
        tech_stack: homepage.techStack?.cms || 'Unknown',
        page_load_time: homepage.metadata?.loadTime || null,
        is_mobile_friendly: gradeMetadata.isMobileFriendly,
        has_https: gradeMetadata.hasHTTPS,
        design_issues: [...(analysisResults.desktopVisual?.issues || []), ...(analysisResults.mobileVisual?.issues || [])],
        quick_wins: quickWins,
        top_issue: getTopIssue(analysisResults),
        one_liner: generateOneLiner(
          context.company_name || 'This business',
          getTopIssue(analysisResults),
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
        pages_crawled: pages.length,

        // Prospect intelligence data
        google_rating: context.google_rating || null,
        google_review_count: context.google_review_count || null,
        icp_match_score: context.icp_match_score || null,
        most_recent_review_date: context.most_recent_review_date || null,
        website_status: context.website_status || null,
        description: context.description || null,
        services: context.services || null
      });

      console.log(`[ResultsAggregator] Lead scoring complete:`, {
        priority: leadScoringData.lead_priority,
        tier: leadScoringData.priority_tier,
        budget: leadScoringData.budget_likelihood
      });
    }

    // PHASE 4: Generate Critique
    this.onProgress({ step: 'critique', message: 'Generating actionable critique...' });
    const critique = generateCritique(analysisResults, gradeResults, enrichedContext);

    // PHASE 6: Save Screenshots
    const screenshotPaths = await this.saveScreenshots(pages, context, baseUrl);

    // PHASE 7: Run report synthesis pipeline
    this.onProgress({ step: 'synthesis', message: 'Running AI synthesis pipeline...' });
    console.log('\n[Report Synthesis] Starting synthesis pipeline...');

    console.log('[Report Synthesis] Calling runReportSynthesis...');
    const synthesisResults = await runReportSynthesis({
      companyName: context.company_name,
      industry: context.industry,
      grade: gradeResults.grade,
      overallScore: gradeResults.overallScore,
      url: homepage.fullUrl,
      issuesByModule: {
        desktop: analysisResults.desktopVisual?.issues || [],
        mobile: analysisResults.mobileVisual?.issues || [],
        seo: analysisResults.seo?.issues || [],
        content: analysisResults.content?.issues || [],
        social: analysisResults.social?.issues || [],
        accessibility: analysisResults.accessibility?.issues || []
      },
      quickWins,
      leadScoring: leadScoringData,
      topIssue: getTopIssue(analysisResults),
      techStack: homepage.metadata?.techStack || parsedData?.tech?.stack || parsedData?.techStack || 'Unknown',
      hasBlog: parsedData?.content?.hasBlog,
      socialPlatforms: parsedData?.social?.platformsPresent || [],
      isMobileFriendly: gradeMetadata.isMobileFriendly,
      hasHttps: gradeMetadata.hasHTTPS,
      crawlPages: crawlData.pages
    });
    console.log('[Report Synthesis] Synthesis completed successfully');
    console.log(`[Report Synthesis] Generated ${synthesisResults.consolidatedIssues?.length || 0} consolidated issues`);
    console.log(`[Report Synthesis] Executive summary: ${synthesisResults.executiveSummary ? 'YES' : 'NO'}`);

    // PHASE 7.5: QA Validation
    this.onProgress({ step: 'qa', message: 'Running QA validation...' });
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('[QA Validation] Starting QA validation...');
    console.log('═══════════════════════════════════════════════════════════\n');

    const qaValidation = validateReportQuality(synthesisResults);

    // Log QA report
    const qaReport = generateQAReport(qaValidation);
    console.log(qaReport);

    // Warn if quality is low
    if (qaValidation.status === 'FAIL' || qaValidation.status === 'WARN') {
      console.warn(`\n[QA WARNING] Report quality: ${qaValidation.status} (Score: ${qaValidation.qualityScore}/100)`);
      console.warn('[QA WARNING] Recommendations:');
      qaValidation.recommendations.forEach((rec, idx) => {
        console.warn(`  ${idx + 1}. ${rec}`);
      });
    } else {
      console.log(`\n[QA PASS] ✅ Report quality: ${qaValidation.status} (Score: ${qaValidation.qualityScore}/100)`);
    }

    // PHASE 8: Calculate Costs & Timing
    const analysisTime = Date.now() - startTime;
    const analysisCost = calculateTotalCost(analysisResults);

    // PHASE 9: Build Final Results
    return this.buildFinalResults({
      analysisResults,
      scores,
      gradeResults,
      quickWins,
      critique,
      leadScoringData,
      crawlData,
      pageSelection,
      discoveryData,
      screenshotPaths,
      synthesisResults,
      qaValidation,
      parsedData,
      businessIntel,
      context,
      homepage,
      analysisTime,
      analysisCost,
      benchmark,  // NEW: Pass benchmark data
      benchmarkMatchMetadata  // NEW: Pass benchmark match metadata
    });
  }

  /**
   * Calculate aggregated scores
   */
  calculateScores(analysisResults = {}) {
    const designScore = Math.round(
      ((extractScore(analysisResults.desktopVisual, 'visualScore') || 0) +
       (extractScore(analysisResults.mobileVisual, 'visualScore') || 0)) / 2
    );

    // Performance score: Use mobile PageSpeed score (more critical for conversions)
    // Fall back to desktop if mobile unavailable, then default to 50 (neutral)
    const performanceScore =
      analysisResults.performance?.pageSpeed?.mobile?.performanceScore ||
      analysisResults.performance?.pageSpeed?.desktop?.performanceScore ||
      50;

    return {
      design_score: normalizeScore(designScore),
      seo_score: normalizeScore(extractScore(analysisResults.seo, 'seoScore')),
      performance_score: normalizeScore(performanceScore),
      content_score: normalizeScore(extractScore(analysisResults.content, 'contentScore')),
      accessibility_score: normalizeScore(extractScore(analysisResults.accessibility, 'accessibilityScore')),
      social_score: normalizeScore(extractScore(analysisResults.social, 'socialScore'))
    };
  }

  /**
   * Save screenshots to local storage
   */
  async saveScreenshots(pages, context, baseUrl) {
    const baseScreenshotLabel = (() => {
      if (context.company_name) return context.company_name;
      try {
        return new URL(baseUrl).hostname || 'website';
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

    const screenshotPaths = {};

    for (const page of pages) {
      if (!page.screenshots) {
        screenshotPaths[page.url] = { desktop: null, mobile: null };
        continue;
      }

      const pageLabel = slugify(page.url === '/' || page.url === '' ? 'homepage' : page.url);
      const label = `${slugify(baseScreenshotLabel)}-${pageLabel}`;

      const paths = await saveDualScreenshots(
        {
          desktop: ensureBuffer(page.screenshots.desktop),
          mobile: ensureBuffer(page.screenshots.mobile)
        },
        label
      );

      screenshotPaths[page.url] = paths;
      page.screenshot_paths = paths;
    }

    return screenshotPaths;
  }

  /**
   * Build final results object
   */
  buildFinalResults(data) {
    const {
      analysisResults,
      scores,
      gradeResults,
      quickWins,
      critique,
      leadScoringData,
      crawlData,
      pageSelection,
      discoveryData,
      screenshotPaths,
      synthesisResults,
      qaValidation,
      parsedData,
      businessIntel,
      context,
      homepage,
      analysisTime,
      analysisCost,
      benchmark,  // NEW: Benchmark data
      benchmarkMatchMetadata  // NEW: Benchmark match metadata
    } = data;

    return {
      // Core analysis data
      success: true,
      analysis_mode: 'intelligent-multi-page',
      company_name: context.company_name,
      industry: context.industry,
      url: homepage.fullUrl,
      prospect_id: context.prospect_id,
      project_id: context.project_id,
      grade: gradeResults.grade,
      website_grade: gradeResults.grade,
      overall_score: gradeResults.overallScore,
      grade_label: gradeResults.gradeLabel,
      grade_description: gradeResults.gradeDescription,

      // Scores
      design_score: scores.design_score,
      design_score_desktop: analysisResults.desktopVisual?.visualScore,
      design_score_mobile: analysisResults.mobileVisual?.visualScore,
      seo_score: scores.seo_score,
      performance_score: scores.performance_score,
      content_score: scores.content_score,
      accessibility_score: scores.accessibility_score,
      social_score: scores.social_score,

      // Issues
      design_issues: [...(analysisResults.desktopVisual?.issues || []), ...(analysisResults.mobileVisual?.issues || [])],
      design_issues_desktop: analysisResults.desktopVisual?.issues || [],
      design_issues_mobile: analysisResults.mobileVisual?.issues || [],
      mobile_critical_issues: countCriticalMobileIssues(analysisResults.mobileVisual),
      desktop_critical_issues: countCriticalDesktopIssues(analysisResults.desktopVisual),
      seo_issues: analysisResults.seo?.issues || [],
      content_issues: analysisResults.content?.issues || [],
      social_issues: analysisResults.social?.issues || [],
      accessibility_issues: analysisResults.accessibility?.issues || [],
      accessibility_compliance: analysisResults.accessibility?.wcagCompliance || {},

      // Performance analytics
      performance_metrics_pagespeed: analysisResults.performance?.pageSpeed || null,
      performance_metrics_crux: analysisResults.performance?.crux || null,
      performance_issues: analysisResults.performance?.issues || [],
      performance_score_mobile: analysisResults.performance?.pageSpeed?.mobile?.performanceScore || null,
      performance_score_desktop: analysisResults.performance?.pageSpeed?.desktop?.performanceScore || null,
      performance_api_errors: analysisResults.performance?.errors || [],

      // Models used
      seo_analysis_model: analysisResults.seo?.model,
      content_analysis_model: analysisResults.content?.model,
      desktop_visual_model: analysisResults.desktopVisual?.model,
      mobile_visual_model: analysisResults.mobileVisual?.model,
      social_analysis_model: analysisResults.social?.model,
      accessibility_analysis_model: analysisResults.accessibility?.model,

      // Quick wins & critique
      quick_wins: quickWins,
      quick_wins_rebalanced: synthesisResults.quickWinStrategy?.topQuickWins || [],
      analysis_summary: critique.summary,
      top_issue: critique.topIssue,
      one_liner: critique.one_liner,
      call_to_action: critique.callToAction,
      outreach_angle: critique.outreachAngle,

      // Synthesis outputs
      consolidated_issues: synthesisResults.consolidatedIssues || [],
      consolidated_issue_stats: synthesisResults.consolidationStatistics,
      consolidated_issue_merge_log: synthesisResults.mergeLog || [],
      executive_summary: synthesisResults.executiveSummary,
      executive_summary_metadata: synthesisResults.executiveMetadata,
      screenshot_references: synthesisResults.screenshotReferences || [],
      synthesis_stage_metadata: synthesisResults.stageMetadata || {},
      synthesis_errors: synthesisResults.errors || [],

      // QA Validation
      qa_validation: qaValidation || { status: 'NOT_RUN' },

      // Lead scoring
      ...leadScoringData,

      // Technical data
      tech_stack: homepage.techStack?.cms || 'Unknown',
      page_load_time: homepage.metadata?.loadTime,
      is_mobile_friendly: !analysisResults.mobileVisual?.issues?.some(i => i.severity === 'critical'),
      has_https: homepage.fullUrl?.startsWith('https://') || false,
      has_blog: parsedData.content.hasBlog,

      // Screenshots
      screenshot_desktop_url: screenshotPaths['/']?.desktop || screenshotPaths['']?.desktop,
      screenshot_mobile_url: screenshotPaths['/']?.mobile || screenshotPaths['']?.mobile,

      // Social data
      social_profiles: parsedData.social.links,
      social_platforms_present: parsedData.social.platformsPresent,
      social_metadata: analysisResults.social?.socialMetadata,

      // Content insights
      content_insights: analysisResults.content?.contentInsights,
      page_title: parsedData.seo?.title,
      meta_description: parsedData.seo?.description,

      // Business intelligence
      business_intelligence: businessIntel,

      // Benchmark comparison data (if available)
      matched_benchmark: benchmark ? {
        id: benchmark.id,
        company_name: benchmark.company_name,
        website_url: benchmark.website_url,
        industry: benchmark.industry,
        tier: benchmark.benchmark_tier,
        comparison_tier: benchmarkMatchMetadata?.comparison_tier,
        match_score: benchmarkMatchMetadata?.match_score,
        match_reasoning: benchmarkMatchMetadata?.match_reasoning,
        key_similarities: benchmarkMatchMetadata?.key_similarities || [],
        key_differences: benchmarkMatchMetadata?.key_differences || [],
        scores: {
          overall: benchmark.overall_score,
          grade: benchmark.overall_grade,
          design: benchmark.design_score,
          seo: benchmark.seo_score,
          content: benchmark.content_score,
          performance: benchmark.performance_score,
          social: benchmark.social_score,
          accessibility: benchmark.accessibility_score
        },
        design_strengths: benchmark.design_strengths,
        seo_strengths: benchmark.seo_strengths,
        content_strengths: benchmark.content_strengths,
        social_strengths: benchmark.social_strengths,
        accessibility_strengths: benchmark.accessibility_strengths,
        // Screenshot URLs for side-by-side comparison
        screenshot_desktop_url: benchmark.screenshot_desktop_url || null,
        screenshot_mobile_url: benchmark.screenshot_mobile_url || null
      } : null,

      // Multi-page crawl metadata
      crawl_metadata: {
        pages_discovered: discoveryData.totalPages,
        pages_crawled: crawlData.pages.length,
        pages_analyzed: crawlData.pages.length,
        discovery_sources: discoveryData.sources,
        discovery_errors: discoveryData.errors,
        failed_pages: (crawlData.failedPages || []).map(p => ({
          url: p.url,
          fullUrl: p.fullUrl,
          error: p.error || null,
          timestamp: p.timestamp || null
        })),
          pages: crawlData.pages.map(p => {
            const storedPaths = screenshotPaths[p.url] || screenshotPaths[p.fullUrl] || { desktop: null, mobile: null };
            return {
              url: p.url,
              fullUrl: p.fullUrl,
              success: p.success,
              screenshot_paths: storedPaths,
              analyzed_for: p.analyzed_for || {}
            };
          })
      },

      // AI page selection
      ai_page_selection: {
        seo_pages: pageSelection.seo_pages,
        content_pages: pageSelection.content_pages,
        visual_pages: pageSelection.visual_pages,
        social_pages: pageSelection.social_pages,
        reasoning: pageSelection.reasoning
      },

      // Performance metrics
      analyzed_at: new Date().toISOString(),
      analysis_cost: analysisCost,
      analysis_time: analysisTime,

      // Discovery log (complete audit trail)
      discovery_log: {
        sitemap: discoveryData,
        page_selection: pageSelection,
        crawl_results: crawlData.pages.map(p => ({
          url: p.url,
          success: p.success,
          error: p.error,
          screenshot_paths: p.screenshot_paths
        })),
        analysis_results: analysisResults,
        timing: {
          total_ms: analysisTime,
          discovery_ms: discoveryData.discoveryTime,
          crawl_ms: crawlData.crawlTime
        }
      }
    };
  }

  extractQuickWins(analysisResults) {
    const combined = [];

    if (analysisResults && typeof analysisResults === 'object') {
      Object.values(analysisResults).forEach((module) => {
        if (module && Array.isArray(module.quickWins)) {
          combined.push(...module.quickWins);
        }
      });
    }

    if (combined.length > 0) {
      return combined;
    }

    return extractQuickWinsFromModules(analysisResults) || [];
  }

  calculateGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  calculateLeadScore(moduleResults = {}, metadata = {}) {
    const scores = [];

    Object.values(moduleResults).forEach((module) => {
      if (module && typeof module.score === 'number' && !Number.isNaN(module.score)) {
        scores.push(module.score);
      }
    });

    const averageScore = scores.length > 0
      ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length)
      : 0;

    let priorityTier = 'Cold';
    if (averageScore >= 80) {
      priorityTier = 'Hot';
    } else if (averageScore >= 60) {
      priorityTier = 'Warm';
    }

    return {
      lead_priority: averageScore,
      priority_tier: priorityTier,
      priority_reasoning: `Average module score ${averageScore}/100 across ${scores.length || 0} modules.`,
      metadata
    };
  }
}

function normalizeScore(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

function extractScore(moduleResult, primaryKey) {
  if (!moduleResult) return 0;

  if (typeof moduleResult.score === 'number') {
    return moduleResult.score;
  }

  if (typeof moduleResult[primaryKey] === 'number') {
    return moduleResult[primaryKey];
  }

  if (typeof moduleResult.averageScore === 'number') {
    return moduleResult.averageScore;
  }

  return 0;
}

function ensureBuffer(value) {
  if (!value) {
    return null;
  }

  if (Buffer.isBuffer(value)) {
    return value;
  }

  try {
    return Buffer.from(value, 'base64');
  } catch {
    return null;
  }
}
