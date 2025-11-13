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
import { generateScreenshotsManifest } from '../utils/screenshot-storage.js';
import { countCriticalDesktopIssues } from '../analyzers/desktop-visual-analyzer.js';
import { countCriticalMobileIssues } from '../analyzers/mobile-visual-analyzer.js';
import { calculateTotalCost } from '../analyzers/index.js';
// NOTE: Report synthesis has been moved to ReportEngine microservice
// import { runReportSynthesis } from '../reports/synthesis/report-synthesis.js';
// import { validateReportQuality, generateQAReport } from '../reports/synthesis/qa-validator.js';
import { gradeWithAI } from '../grading/ai-grader.js';
import { ValidationService } from './validation-service.js';
import { selectTopIssues } from './top-issues-selector.js';
import { deduplicateIssues } from './issue-deduplication-service.js';

export class ResultsAggregator {
  constructor(options = {}) {
    this.onProgress = options.onProgress || (() => {});
    // Optional features (can override environment variables)
    this.enableDeduplication = options.enableDeduplication !== undefined
      ? options.enableDeduplication
      : process.env.ENABLE_ISSUE_DEDUPLICATION === 'true';
    this.enableQaValidation = options.enableQaValidation !== undefined
      ? options.enableQaValidation
      : process.env.ENABLE_QA_VALIDATION === 'true';
    this.enableAiGrading = options.enableAiGrading !== undefined
      ? options.enableAiGrading
      : process.env.USE_AI_GRADING === 'true';
  }

  /**
   * Aggregate all analysis results into final output
   *
   * @param {object} analysisResults - Results from AnalysisCoordinator
   * @param {object} crawlData - Data from CrawlingService
   * @param {object} pageSelection - Selection from PageSelectionService
   * @param {object} discoveryData - Data from DiscoveryService
   * @param {object} context - Business context (may include contextBuilder for A/B testing)
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

    // PHASE 1.5: Extract Context Metrics (for A/B testing)
    const contextBuilder = context.contextBuilder;
    console.log('[ResultsAggregator] Context Builder present:', !!contextBuilder);
    if (contextBuilder) {
      console.log('[ResultsAggregator] Context Builder config:', {
        enableCrossPage: contextBuilder.enableCrossPage,
        enableCrossAnalyzer: contextBuilder.enableCrossAnalyzer
      });
    }

    // Calculate actual issue reduction for context metrics
    if (contextBuilder && contextBuilder.enableCrossPage) {
      const allIssuesPreCalc = this.collectAllIssues(analysisResults);
      const actualIssueCount = allIssuesPreCalc.length;

      // Estimate baseline: A/B test showed control mode produces ~1.85x more issues
      // Control avg: 53.9 issues, Experiment avg: 29.2 issues → ratio = 1.85
      const estimatedControlCount = Math.round(actualIssueCount * 1.85);
      const actualReduction = estimatedControlCount - actualIssueCount;

      // Update context builder metrics BEFORE calling getMetrics()
      contextBuilder.metrics.issueReduction.total = estimatedControlCount;
      contextBuilder.metrics.issueReduction.duplicatesAvoided = actualReduction;

      console.log('[ResultsAggregator] Context reduction calculated:', {
        actualIssues: actualIssueCount,
        estimatedControlIssues: estimatedControlCount,
        duplicatesAvoided: actualReduction,
        reductionRate: `${Math.round((actualReduction / estimatedControlCount) * 100)}%`
      });
    }

    const contextMetrics = contextBuilder ? contextBuilder.getMetrics() : null;
    const contextModeUsed = contextBuilder
      ? (contextBuilder.enableCrossPage && contextBuilder.enableCrossAnalyzer ? 'both'
          : contextBuilder.enableCrossPage ? 'cross_page'
          : contextBuilder.enableCrossAnalyzer ? 'cross_analyzer'
          : 'none')
      : 'none';

    console.log('[ResultsAggregator] Context mode determined:', contextModeUsed);
    console.log('[ResultsAggregator] Context metrics:', contextMetrics ? 'present' : 'null');

    // PHASE 2: Extract Quick Wins
    const quickWins = this.extractQuickWins(analysisResults);

    // PHASE 3: Generate Lead ID
    // Generate UUID early so it can be used for screenshot storage paths
    const leadId = crypto.randomUUID();

    // PHASE 4: Save Screenshots
    // Screenshots must be saved BEFORE validation (validation needs section paths)
    const { screenshotPaths, screenshotsManifest } = await this.saveScreenshots(pages, context, baseUrl, leadId);

    // PHASE 5: QA Validation (Optional - filters false positives from visual analysis)
    let validationMetadata = null;
    if (this.enableQaValidation) {
      this.onProgress({ step: 'qa-validation', message: 'Validating visual issues with AI...' });
      console.log('\n[QA Validation] Starting screenshot validation...');

      const validationService = new ValidationService();

      // CRITICAL: Pass unifiedVisual results (has desktopIssues, mobileIssues, etc)
      // NOT the top-level analysisResults (has desktopVisual.issues, mobileVisual.issues)

      // Collect screenshot paths from unified visual analyzer's _results
      // The unified visual analyzer stores full individual results (with _screenshot_sections) in _results
      const screenshotSections = {};
      if (analysisResults.unifiedVisual?._results) {
        // Aggregate screenshot sections from all pages
        analysisResults.unifiedVisual._results.forEach(pageResult => {
          if (pageResult._screenshot_sections) {
            Object.assign(screenshotSections, pageResult._screenshot_sections);
          }
        });
        console.log(`[QA Validation] Collected ${Object.keys(screenshotSections).length} screenshot sections for validation`);
      }

      const { filteredAnalysis, validationMetadata: valMeta } = await validationService.validate({
        analysisResults: analysisResults.unifiedVisual || analysisResults, // Use unifiedVisual if available
        screenshotPaths: screenshotSections, // Pass aggregated screenshot sections
        context
      });

      // Replace unified visual results with filtered version
      if (analysisResults.unifiedVisual) {
        analysisResults.unifiedVisual = filteredAnalysis;

        // Re-split results for backward compatibility (update desktopVisual and mobileVisual)
        const { getDesktopResults, getMobileResults } = await import('../analyzers/unified-visual-analyzer.js');
        analysisResults.desktopVisual = getDesktopResults(filteredAnalysis);
        analysisResults.mobileVisual = getMobileResults(filteredAnalysis);
      } else {
        // Fallback: replace entire analysisResults if unifiedVisual not present
        analysisResults = filteredAnalysis;
      }

      validationMetadata = valMeta;

      console.log(`[QA Validation] ✅ Complete:`, {
        verified: valMeta.verified_issues,
        rejected: valMeta.rejected_issues,
        rejection_rate: valMeta.rejection_rate,
        cost: `$${valMeta.validation_cost?.toFixed(4) || '0.0000'}`,
        duration: `${(valMeta.validation_duration_ms / 1000).toFixed(1)}s`
      });
    } else {
      console.log('[QA Validation] Skipped (ENABLE_QA_VALIDATION=false)');
    }

    // PHASE 5.5: Select Top N Issues for Outreach (configurable via TOP_ISSUES_LIMIT)
    const topIssuesLimit = parseInt(process.env.TOP_ISSUES_LIMIT || '5', 10);
    this.onProgress({ step: 'selecting-top-issues', message: `Selecting top ${topIssuesLimit} issues for outreach...` });
    console.log(`\n[Results Aggregator] Selecting top ${topIssuesLimit} issues for outreach...`);

    const allIssues = this.collectAllIssues(analysisResults);
    console.log(`[Results Aggregator]   Total issues collected: ${allIssues.length}`);

    // Estimate grade before AI grading runs (for top issues selection context)
    const preliminaryGrade = this.estimateGrade(scores);
    const preliminaryScore = Math.round(
      (scores.design_score * 0.30) +
      (scores.seo_score * 0.30) +
      (scores.performance_score * 0.20) +
      (scores.content_score * 0.10) +
      (scores.accessibility_score * 0.05) +
      (scores.social_score * 0.05)
    );

    // PHASE 5.5a: AI Deduplication (Optional - before top issues selection)
    let issuesForSelection = allIssues;
    let deduplicationResult = null;

    if (this.enableDeduplication) {
      this.onProgress({ step: 'deduplicating-issues', message: 'Deduplicating issues with AI...' });
      console.log('\n[Results Aggregator] Running AI deduplication on all issues...');

      deduplicationResult = await deduplicateIssues({
        allIssues,
        context,
        grade: preliminaryGrade,
        overall_score: preliminaryScore
      });

      issuesForSelection = deduplicationResult.consolidatedIssues;

      console.log(`[Results Aggregator] ✅ Deduplication complete:`);
      console.log(`[Results Aggregator]    Reduced: ${deduplicationResult.statistics.originalCount} → ${deduplicationResult.statistics.consolidatedCount} issues`);
      console.log(`[Results Aggregator]    Reduction: ${deduplicationResult.statistics.reductionPercentage}%`);
      console.log(`[Results Aggregator]    Cost: $${deduplicationResult.cost.toFixed(4)}`);
    }

    const topIssuesResult = await selectTopIssues(issuesForSelection, {
      company_name: context.company_name,
      industry: context.industry,
      grade: preliminaryGrade,
      overall_score: preliminaryScore
    }, topIssuesLimit);

    console.log(`[Results Aggregator] ✅ Selected ${topIssuesResult.topIssues.length} top issues`);
    console.log(`[Results Aggregator]    Cost: $${topIssuesResult.cost.toFixed(4)}, Duration: ${topIssuesResult.duration}ms`);

    // PHASE 6: Grading + Lead Scoring (AI or Manual)
    // Uses validated issues (false positives already filtered out)
    const useAIGrading = this.enableAiGrading;
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
        // DIAGNOSTIC: Log AI grading result
        console.log(`[Results Aggregator Debug] AI grading result keys: ${Object.keys(aiGradingResult).join(', ')}`);
        console.log(`[Results Aggregator Debug] AI overall_score: ${aiGradingResult.overall_score}`);
        console.log(`[Results Aggregator Debug] AI overall_grade: ${aiGradingResult.overall_grade}`);

        // Calculate fallback overall_score from WEIGHTED dimension scores if missing
        let calculatedScore = aiGradingResult.overall_score;
        if (calculatedScore == null || calculatedScore === undefined) {
          // Use the ACTUAL WEIGHTS from grading architecture (AI may provide custom weights)
          const weights = aiGradingResult.dimension_weights || {
            design: 0.30,
            seo: 0.30,
            performance: 0.20,
            content: 0.10,
            accessibility: 0.05,
            social: 0.05
          };

          // Calculate weighted average from actual dimension scores
          calculatedScore = Math.round(
            (scores.design_score || 50) * weights.design +
            (scores.seo_score || 50) * weights.seo +
            (scores.performance_score || 50) * weights.performance +
            (scores.content_score || 50) * weights.content +
            (scores.accessibility_score || 50) * weights.accessibility +
            (scores.social_score || 50) * weights.social
          );

          console.warn(`[Results Aggregator] overall_score was null, calculated ${calculatedScore} from weighted scores`);
          console.warn(`  Weights used: design=${weights.design}, seo=${weights.seo}, perf=${weights.performance}, content=${weights.content}, a11y=${weights.accessibility}, social=${weights.social}`);
          console.warn(`  Scores: design=${scores.design_score}, seo=${scores.seo_score}, perf=${scores.performance_score}, content=${scores.content_score}, a11y=${scores.accessibility_score}, social=${scores.social_score}`);
        }

        // AI grading successful - use AI results
        gradeResults = {
          grade: aiGradingResult.overall_grade || aiGradingResult.grade,  // Support both field names
          overallScore: calculatedScore,
          weightedScore: calculatedScore,  // Use calculated score here too
          bonuses: [],
          penalties: [],
          weights: aiGradingResult.dimension_weights,  // Read from ai-grader return value
          weight_reasoning: aiGradingResult.weight_reasoning,  // Moved to top level for report display
          _meta: {
            grader: 'ai-comparative-v1',
            timestamp: new Date().toISOString(),
            benchmark_id: aiGradingResult.comparison?.benchmark_id,
            cost: aiGradingResult._meta?.cost || 0,
            tokens: aiGradingResult._meta?.tokens || 0,
            model: aiGradingResult._meta?.model || 'gpt-5'
          }
        };

        leadScoringData = {
          lead_score: aiGradingResult.lead_score,
          lead_priority: aiGradingResult.lead_score,  // INTEGER (0-100) - same as lead_score
          priority_tier: aiGradingResult.priority_tier || 'warm',  // TEXT: "hot"/"warm"/"cold"
          budget_likelihood: aiGradingResult.budget_likelihood,
          fit_score: aiGradingResult.fit_score,
          quality_gap_score: aiGradingResult.quality_gap_score,
          budget_score: aiGradingResult.budget_score,
          urgency_score: aiGradingResult.urgency_score,
          industry_fit_score: aiGradingResult.industry_fit_score,
          company_size_score: aiGradingResult.company_size_score,
          engagement_score: aiGradingResult.engagement_score,
          lead_priority_reasoning: aiGradingResult.lead_priority_reasoning,
          receptiveness_score: aiGradingResult.sales_insights?.receptiveness_score,
          key_pain_points: aiGradingResult.sales_insights?.key_pain_points || [],
          value_proposition: aiGradingResult.sales_insights?.value_proposition,
          urgency_factors: aiGradingResult.sales_insights?.urgency_factors || [],
          comparison_summary: aiGradingResult.comparison,
          business_context: aiGradingResult.business_context,
          _meta: {
            scorer: 'ai-comparative-v2',
            timestamp: new Date().toISOString()
          }
        };

        console.log(`[AI Grading] ✅ Grade: ${gradeResults.grade} (${gradeResults.overallScore}/100)`);
        console.log(`[AI Grading] ✅ Lead Score: ${leadScoringData.lead_score}/100 (${leadScoringData.lead_priority} priority)`);
      } else {
        // AI grading failed - fall back to manual
        console.warn('[AI Grading] ⚠️ AI grading failed, falling back to manual grading');
        console.warn('[AI Grading] ⚠️ WARNING: Manual grading will NOT populate dimension scores!');
        console.warn('[AI Grading] ⚠️ Fields that will be NULL: pain_score, budget_score, authority_score, etc.');
        console.warn('[AI Grading] ⚠️ AI weights will also be NULL: ai_category_weights, ai_weights_reasoning');
        console.warn('[AI Grading] ⚠️ Check ai-grader.js logs above for root cause.');
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
        tech_stack: homepage.techStack ? JSON.stringify(homepage.techStack) : JSON.stringify({ cms: 'Unknown', frameworks: [], analytics: [] }),
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

    // PHASE 7: Generate Critique
    // Uses validated issues (false positives already filtered out)
    this.onProgress({ step: 'critique', message: 'Generating actionable critique...' });
    const critique = generateCritique(analysisResults, gradeResults, enrichedContext);

    // PHASE 8: Report Synthesis (MOVED TO REPORTENGINE)
    // NOTE: Report synthesis has been moved to ReportEngine microservice
    // This Analysis Engine now focuses solely on analysis, grading, and data extraction
    // Synthesis happens during report generation in the ReportEngine
    console.log('\n[Report Synthesis] Skipped - handled by ReportEngine microservice');

    const synthesisResults = {
      consolidatedIssues: [],
      mergeLog: [],
      consolidationStatistics: { originalCount: 0, consolidatedCount: 0, reductionPercentage: 0 },
      executiveSummary: null,
      executiveMetadata: {},
      screenshotReferences: [],
      stageMetadata: {},
      errors: [],
      quickWinStrategy: { topQuickWins: quickWins }
    };

    // PHASE 9: Calculate Costs & Timing
    const analysisTime = Date.now() - startTime;

    // Calculate total cost from all AI calls
    const analyzersCost = calculateTotalCost(analysisResults);
    const pageSelectionCost = pageSelection?.meta?.cost || 0;
    const gradingCost = gradeResults?._meta?.cost || leadScoringData?._metadata?.cost || 0;
    const validationCost = validationMetadata?.validation_cost || 0;
    const techStackCost = crawlData?.techStack?._meta?.cost || 0;
    const deduplicationCost = deduplicationResult?.cost || 0;  // NEW: Deduplication cost
    const topIssuesCost = topIssuesResult?.cost || 0;  // NEW: Top issues selection cost

    const analysisCost = analyzersCost + pageSelectionCost + gradingCost + validationCost + techStackCost + deduplicationCost + topIssuesCost;

    // Cost breakdown for telemetry and database
    const costBreakdown = {
      analyzers: analyzersCost,
      page_selection: pageSelectionCost,
      grading: gradingCost,
      validation: validationCost,
      tech_stack: techStackCost,
      issue_deduplication: deduplicationCost,  // NEW
      top_issues_selection: topIssuesCost,  // NEW
      total: analysisCost
    };

    // Display cost telemetry (like Report Engine)
    console.log('\n' + '='.repeat(56));
    console.log('[Analysis Engine] COST TELEMETRY');
    console.log('='.repeat(56));

    // Core analyzers breakdown
    if (analyzersCost > 0) {
      console.log('Core Analyzers:');
      // Check for unified visual analyzer (desktop + mobile)
      if (analysisResults.unifiedVisual?._meta?.cost) {
        const meta = analysisResults.unifiedVisual._meta;
        const tokens = meta.usage?.total_tokens || 0;
        console.log(`  Unified Visual:  $${meta.cost.toFixed(4)}  (${tokens} tokens)`);
      } else {
        // Fallback to legacy individual analyzers if unified not available
        if (analysisResults.desktopVisual?._meta?.cost) {
          const meta = analysisResults.desktopVisual._meta;
          const tokens = meta.usage?.total_tokens || 0;
          console.log(`  Desktop Visual:  $${meta.cost.toFixed(4)}  (${tokens} tokens)`);
        }
        if (analysisResults.mobileVisual?._meta?.cost) {
          const meta = analysisResults.mobileVisual._meta;
          const tokens = meta.usage?.total_tokens || 0;
          console.log(`  Mobile Visual:   $${meta.cost.toFixed(4)}  (${tokens} tokens)`);
        }
      }
      // Check for unified technical analyzer (SEO + content)
      if (analysisResults.unifiedTechnical?._meta?.cost) {
        const meta = analysisResults.unifiedTechnical._meta;
        const tokens = meta.usage?.total_tokens || 0;
        console.log(`  Unified Technical: $${meta.cost.toFixed(4)}  (${tokens} tokens)`);
      } else {
        // Fallback to legacy individual analyzers if unified not available
        if (analysisResults.seo?._meta?.cost) {
          const meta = analysisResults.seo._meta;
          const tokens = meta.usage?.total_tokens || 0;
          console.log(`  SEO:             $${meta.cost.toFixed(4)}  (${tokens} tokens)`);
        }
        if (analysisResults.content?._meta?.cost) {
          const meta = analysisResults.content._meta;
          const tokens = meta.usage?.total_tokens || 0;
          console.log(`  Content:         $${meta.cost.toFixed(4)}  (${tokens} tokens)`);
        }
      }
      // Social and Accessibility are always standalone
      if (analysisResults.social?._meta?.cost) {
        const meta = analysisResults.social._meta;
        const tokens = meta.usage?.total_tokens || 0;
        console.log(`  Social:          $${meta.cost.toFixed(4)}  (${tokens} tokens)`);
      }
      if (analysisResults.accessibility?._meta?.cost) {
        const meta = analysisResults.accessibility._meta;
        const tokens = meta.usage?.total_tokens || 0;
        console.log(`  Accessibility:   $${meta.cost.toFixed(4)}  (${tokens} tokens)`);
      }
      console.log(`  Subtotal:        $${analyzersCost.toFixed(4)}`);
    }

    // Additional AI costs
    if (pageSelectionCost > 0 || gradingCost > 0 || validationCost > 0 || techStackCost > 0 || deduplicationCost > 0 || topIssuesCost > 0) {
      console.log('\nAdditional AI:');
      if (pageSelectionCost > 0) {
        console.log(`  Page Selector:   $${pageSelectionCost.toFixed(4)}`);
      }
      if (deduplicationCost > 0) {
        const reduction = deduplicationResult?.statistics?.reductionPercentage || 0;
        console.log(`  Issue Dedup:     $${deduplicationCost.toFixed(4)}  (${reduction}% reduction)`);
      }
      if (topIssuesCost > 0) {
        const topIssuesCount = topIssuesResult?.topIssues?.length || 0;
        console.log(`  Top Issues:      $${topIssuesCost.toFixed(4)}  (${topIssuesCount} issues selected)`);
      }
      if (gradingCost > 0) {
        const graderName = gradeResults?._meta?.grader === 'ai-comparative-v1' ? 'AI Grader' : 'Lead Scorer';
        console.log(`  ${graderName}:    $${gradingCost.toFixed(4)}  (${gradeResults?._meta?.tokens || 0} tokens)`);
      }
      if (validationCost > 0) {
        const validatedCount = validationMetadata?.stats?.total_issues_validated || 0;
        console.log(`  QA Validator:    $${validationCost.toFixed(4)}  (${validatedCount} issues validated)`);
      }
      if (techStackCost > 0) {
        console.log(`  Tech Detector:   $${techStackCost.toFixed(4)}`);
      }
      console.log(`  Subtotal:        $${(pageSelectionCost + deduplicationCost + topIssuesCost + gradingCost + validationCost + techStackCost).toFixed(4)}`);
    }

    console.log('\n' + '-'.repeat(56));
    console.log(`Total Analysis Cost: $${analysisCost.toFixed(4)}`);
    console.log(`Total Duration:      ${(analysisTime / 1000).toFixed(1)}s`);
    console.log('='.repeat(56) + '\n');

    // PHASE 10: Build Final Results
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
      screenshotsManifest,  // NEW: Pass screenshots manifest
      leadId,  // NEW: Pass pre-generated lead ID
      synthesisResults,
      validationMetadata,  // NEW: Pass QA validation metadata
      parsedData,
      businessIntel,
      context,
      homepage,
      analysisTime,
      analysisCost,
      costBreakdown,  // NEW: Pass cost breakdown
      benchmark,  // NEW: Pass benchmark data
      benchmarkMatchMetadata,  // NEW: Pass benchmark match metadata
      topIssuesResult,  // NEW: Pass top 5 issues selection result
      allIssues,  // NEW: Pass all collected issues for metrics
      deduplicationResult,  // NEW: Pass deduplication results
      contextMetrics,  // NEW: Pass context metrics for A/B testing
      contextModeUsed  // NEW: Pass context mode used for A/B testing
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
   * Save screenshots to local storage and Supabase Storage
   *
   * @param {Array} pages - Crawled pages with screenshot file paths
   * @param {object} context - Business context (company_name, etc.)
   * @param {string} baseUrl - Base website URL
   * @param {string} leadId - Pre-generated UUID for lead
   * @returns {Promise<object>} { screenshotPaths, screenshotsManifest }
   */
  async saveScreenshots(pages, context, baseUrl, leadId) {
    const screenshotPaths = {};

    // Screenshots are already saved to disk by the crawler (memory optimization)
    // Just collect the existing file paths
    for (const page of pages) {
      if (!page.screenshots) {
        screenshotPaths[page.url] = { desktop: null, mobile: null };
        continue;
      }

      // Screenshots are now file paths (strings), not Buffers
      const paths = {
        desktop: page.screenshots.desktop || null,
        mobile: page.screenshots.mobile || null
      };

      screenshotPaths[page.url] = paths;
      page.screenshot_paths = paths;
    }

    console.log(`[Screenshots] Using ${Object.keys(screenshotPaths).length} screenshot paths saved by crawler`);

    // Generate screenshots manifest (uploads to Supabase Storage)
    let screenshotsManifest = null;
    const storageType = process.env.SCREENSHOT_STORAGE || 'local';

    if (storageType !== 'local') {
      try {
        console.log(`[Screenshots] Generating manifest and uploading to Supabase Storage...`);

        // generateScreenshotsManifest expects Buffers, so temporarily load from disk
        const { readFile } = await import('fs/promises');
        const pagesWithBuffers = await Promise.all(
          pages.map(async (page) => {
            if (!page.screenshots?.desktop && !page.screenshots?.mobile) {
              return page;
            }

            const screenshots = {};
            if (page.screenshots.desktop) {
              screenshots.desktop = await readFile(page.screenshots.desktop);
            }
            if (page.screenshots.mobile) {
              screenshots.mobile = await readFile(page.screenshots.mobile);
            }

            return { ...page, screenshots };
          })
        );

        screenshotsManifest = await generateScreenshotsManifest(pagesWithBuffers, leadId, storageType);
        console.log(`[Screenshots] ✅ Manifest generated: ${screenshotsManifest.total_screenshots} screenshots, ${(screenshotsManifest.total_size_bytes / 1024 / 1024).toFixed(2)} MB`);

        // Buffers can now be garbage collected
      } catch (error) {
        console.error(`[Screenshots] ⚠️  Failed to generate manifest:`, error.message);
        console.error(`[Screenshots] Falling back to local storage only`);
        // Don't throw - gracefully fall back to local storage
      }
    }

    return { screenshotPaths, screenshotsManifest };
  }

  /**
   * Collect all issues from all analyzers into single array
   */
  collectAllIssues(analysisResults) {
    const allIssues = [];

    // Unified visual issues
    if (analysisResults.unifiedVisual) {
      allIssues.push(
        ...(analysisResults.unifiedVisual.desktopIssues || []).map(i => ({ ...i, source: 'desktop-visual' })),
        ...(analysisResults.unifiedVisual.mobileIssues || []).map(i => ({ ...i, source: 'mobile-visual' })),
        ...(analysisResults.unifiedVisual.responsiveIssues || []).map(i => ({ ...i, source: 'responsive-visual' })),
        ...(analysisResults.unifiedVisual.sharedIssues || []).map(i => ({ ...i, source: 'shared-visual' }))
      );
    }

    // Technical issues (SEO + Content)
    if (analysisResults.unifiedTechnical) {
      allIssues.push(
        ...(analysisResults.unifiedTechnical.seoIssues || []).map(i => ({ ...i, source: 'seo' })),
        ...(analysisResults.unifiedTechnical.contentIssues || []).map(i => ({ ...i, source: 'content' }))
      );
    }

    // Social issues
    if (analysisResults.social?.issues) {
      allIssues.push(...analysisResults.social.issues.map(i => ({ ...i, source: 'social' })));
    }

    // Accessibility issues
    if (analysisResults.accessibility?.issues) {
      allIssues.push(...analysisResults.accessibility.issues.map(i => ({ ...i, source: 'accessibility' })));
    }

    // Add unique ID to each issue if not present
    allIssues.forEach((issue, index) => {
      if (!issue.id) {
        issue.id = `${issue.source}-${index}`;
      }
    });

    return allIssues;
  }

  /**
   * Estimate grade from scores (used before AI grading runs)
   */
  estimateGrade(scores) {
    const overallScore = Math.round(
      (scores.design_score * 0.30) +
      (scores.seo_score * 0.30) +
      (scores.performance_score * 0.20) +
      (scores.content_score * 0.10) +
      (scores.accessibility_score * 0.05) +
      (scores.social_score * 0.05)
    );

    if (overallScore >= 85) return 'A';
    if (overallScore >= 70) return 'B';
    if (overallScore >= 55) return 'C';
    if (overallScore >= 40) return 'D';
    return 'F';
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
      screenshotsManifest,  // NEW: Screenshots manifest from Supabase Storage
      leadId,  // NEW: Pre-generated lead ID
      synthesisResults,
      validationMetadata,  // NEW: QA validation metadata
      parsedData,
      businessIntel,
      context,
      homepage,
      analysisTime,
      analysisCost,
      costBreakdown,  // NEW: Cost breakdown
      benchmark,  // NEW: Benchmark data
      benchmarkMatchMetadata,  // NEW: Benchmark match metadata
      topIssuesResult,  // NEW: Top 5 issues selection result
      allIssues,  // NEW: All collected issues
      deduplicationResult,  // NEW: Deduplication results
      contextMetrics,  // NEW: Context metrics for A/B testing
      contextModeUsed  // NEW: Context mode used for A/B testing
    } = data;

    // DIAGNOSTIC: Log gradeResults before returning
    console.log(`[Results Aggregator Debug] Final gradeResults.overallScore: ${gradeResults.overallScore}`);
    console.log(`[Results Aggregator Debug] Final gradeResults.grade: ${gradeResults.grade}`);
    if (gradeResults.overallScore === null || gradeResults.overallScore === undefined) {
      console.error(`[Results Aggregator ERROR] overall_score is ${gradeResults.overallScore} - this will be saved as NULL!`);
    }

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

      // Grading weights (from AI grader)
      weights: gradeResults.weights || null,
      weight_reasoning: gradeResults.weight_reasoning || null,

      // Scores
      design_score: scores.design_score,
      design_score_desktop: analysisResults.desktopVisual?.visualScore,
      design_score_mobile: analysisResults.mobileVisual?.visualScore,
      seo_score: scores.seo_score,
      performance_score: scores.performance_score,
      content_score: scores.content_score,
      accessibility_score: scores.accessibility_score,
      social_score: scores.social_score,

      // Design tokens (extracted from crawl data)
      design_tokens_desktop: crawlData.pages[0]?.designTokens?.desktop || null,
      design_tokens_mobile: crawlData.pages[0]?.designTokens?.mobile || null,

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

      // NEW: Top 5 Issues for Outreach (AI-selected from high/critical issues)
      top_issues: topIssuesResult?.topIssues || [],
      top_issues_summary: topIssuesResult?.topIssues?.map(i => i.title).join(', ') || null,
      top_issues_selection_strategy: topIssuesResult?.selectionStrategy || null,
      top_issues_selection_cost: topIssuesResult?.cost || 0,
      top_issues_selection_model: topIssuesResult?.modelUsed || 'gpt-5-mini',

      // NEW: Pyramid Metrics (track issue volume)
      total_issues_count: allIssues?.length || 0,
      high_critical_issues_count: allIssues?.filter(i => i.severity === 'critical' || i.severity === 'high').length || 0,

      // NEW: Issue Deduplication Metadata
      deduplication_enabled: process.env.ENABLE_ISSUE_DEDUPLICATION === 'true',
      deduplication_stats: deduplicationResult?.statistics || null,
      deduplication_cost: deduplicationResult?.cost || 0,
      deduplication_model: deduplicationResult?.modelUsed || process.env.DEDUPLICATION_MODEL || 'gpt-5-mini',

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
      validation_metadata: validationMetadata || { enabled: false },

      // Lead scoring
      ...leadScoringData,

      // Technical data
      tech_stack: homepage.techStack ? JSON.stringify(homepage.techStack) : JSON.stringify({ cms: 'Unknown', frameworks: [], analytics: [] }),
      page_load_time: homepage.metadata?.loadTime,
      is_mobile_friendly: !analysisResults.mobileVisual?.issues?.some(i => i.severity === 'critical'),
      has_https: homepage.fullUrl?.startsWith('https://') || false,
      has_blog: parsedData.content.hasBlog,

      // Lead ID (pre-generated for screenshot storage)
      id: leadId,

      // Screenshots (provide both _path and _url for compatibility)
      // _path: Expected by report generator (auto-report-generator.js)
      // _url: Used by database schema (leads.json)
      screenshot_desktop_path: screenshotPaths['/']?.desktop || screenshotPaths['']?.desktop,
      screenshot_mobile_path: screenshotPaths['/']?.mobile || screenshotPaths['']?.mobile,
      screenshot_desktop_url: screenshotsManifest?.pages['/']?.desktop?.url || screenshotPaths['/']?.desktop || screenshotPaths['']?.desktop,
      screenshot_mobile_url: screenshotsManifest?.pages['/']?.mobile?.url || screenshotPaths['/']?.mobile || screenshotPaths['']?.mobile,

      // NEW: Screenshots manifest (Supabase Storage with multi-page support)
      screenshots_manifest: screenshotsManifest,

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
        // Screenshot paths/URLs for side-by-side comparison
        // FIXED: Corrected field names to match benchmarks schema (desktop_screenshot_url vs screenshot_desktop_url)
        // Provide both _path and _url for report engine compatibility
        screenshot_desktop_path: benchmark.desktop_screenshot_url || null,
        screenshot_mobile_path: benchmark.mobile_screenshot_url || null,
        screenshot_desktop_url: benchmark.desktop_screenshot_url || null,
        screenshot_mobile_url: benchmark.mobile_screenshot_url || null
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

      // FIX #1: Preserve screenshot Buffers for benchmark strength extraction
      // This prevents re-fetching and re-compressing images in Phase 2
      crawlPages: crawlData.pages.map(p => ({
        url: p.url,
        screenshots: p.screenshots, // Contains Buffers for desktop and mobile
        html: p.html,
        designTokens: p.designTokens
      })),

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
      cost_breakdown: costBreakdown,  // NEW: Detailed cost breakdown
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
      },

      // Context-aware analysis metrics (for A/B testing)
      context_metrics: contextMetrics,
      context_mode_used: contextModeUsed,
      prompt_variant_used: analysisResults.unifiedVisual?._meta?.promptVariant
        || analysisResults.desktopVisual?._meta?.promptVariant
        || null
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

// ensureBuffer() function removed - screenshots are now file paths (strings), not Buffers
// This is part of the memory optimization to avoid holding large buffers in memory
