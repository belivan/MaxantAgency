/**
 * AI-Powered Grading Service
 *
 * Replaces manual weight-based grading with context-aware AI grading.
 * Compares target website to industry benchmark and adapts scoring based on:
 * - Industry priorities
 * - Business size
 * - Budget indicators
 * - Competitive positioning
 *
 * Also performs lead scoring in the same AI call for efficiency.
 */

import { loadPrompt, substituteVariables } from '../shared/prompt-loader.js';
import { callAI, parseJSONResponse } from '../../database-tools/shared/ai-client.js';
import { findBestBenchmark } from '../services/benchmark-matcher.js';
import { calculateGrade } from './grader.js';

/**
 * Grade a website using AI comparative analysis
 *
 * @param {object} analysisResults - Full analysis results from orchestrator
 * @param {object} metadata - Business metadata
 * @returns {Promise<object>} Grade, lead score, and insights
 */
export async function gradeWithAI(analysisResults, metadata) {
  console.log(`\n🎓 AI Grading: ${metadata.company_name}`);

  try {
    // Step 1: Find best benchmark match
    console.log(`  ├─ Finding industry benchmark...`);

    const benchmarkResult = await findBestBenchmark({
      company_name: metadata.company_name,
      industry: metadata.industry || 'general',
      url: metadata.url,
      city: metadata.city,
      state: metadata.state,
      business_intelligence: metadata.business_intelligence,
      icp_criteria: metadata.icp_criteria
    });

    if (!benchmarkResult.success || !benchmarkResult.benchmark) {
      console.warn(`  ⚠️ No benchmark found, falling back to absolute grading`);
      return fallbackGrading(analysisResults, metadata);
    }

    const benchmark = benchmarkResult.benchmark;
    const matchMetadata = benchmarkResult.match_metadata;

    console.log(`  ├─ Benchmark: ${benchmark.company_name} (${benchmark.overall_score}/100)`);

    // Step 2: Prepare grading data
    const gradingData = {
      // Target data
      company_name: metadata.company_name,
      industry: metadata.industry || 'general',
      url: metadata.url,
      city: metadata.city || 'Unknown',
      state: metadata.state || 'Unknown',

      // Scores
      design_score: analysisResults.scores?.design_score || 50,
      seo_score: analysisResults.scores?.seo_score || 50,
      performance_score: analysisResults.scores?.performance_score || 50,
      content_score: analysisResults.scores?.content_score || 50,
      accessibility_score: analysisResults.scores?.accessibility_score || 50,
      social_score: analysisResults.scores?.social_score || 50,

      // Issues
      design_issues: extractIssues(analysisResults.desktopVisual, analysisResults.mobileVisual),
      seo_issues: extractIssues(analysisResults.seo),
      performance_metrics: analysisResults.performance?.pageSpeed || null,

      // Business intelligence
      business_intelligence: metadata.business_intelligence,
      icp_criteria: metadata.icp_criteria,

      // Benchmark data
      benchmark: {
        company_name: benchmark.company_name,
        benchmark_tier: benchmark.benchmark_tier,
        google_rating: benchmark.google_rating,
        google_review_count: benchmark.google_review_count,
        website_url: benchmark.website_url,
        design_score: benchmark.design_score,
        seo_score: benchmark.seo_score,
        performance_score: benchmark.performance_score,
        content_score: benchmark.content_score,
        accessibility_score: benchmark.accessibility_score,
        social_score: benchmark.social_score,
        overall_score: benchmark.overall_score,
        overall_grade: benchmark.overall_grade,
        awards: benchmark.awards
      },

      // Match metadata
      match_metadata: matchMetadata
    };

    // Step 3: Load prompt and call AI
    console.log(`  ├─ Calling AI grader (GPT-5)...`);

    const promptConfig = await loadPrompt('grading/ai-comparative-grader');

    const userPrompt = await substituteVariables(
      promptConfig.userPromptTemplate,
      gradingData
    );

    const gradingResult = await callAI({
      model: promptConfig.model,
      temperature: promptConfig.temperature,
      systemPrompt: promptConfig.systemPrompt,
      userPrompt: userPrompt,
      responseFormat: 'json'
    });

    // Parse JSON response from content field (handles markdown/prose wrapping)
    const parsedGrading = await parseJSONResponse(gradingResult.content);

    // DIAGNOSTIC: Log what AI returned
    console.log(`[AI Grader Debug] Raw AI response keys: ${Object.keys(parsedGrading).join(', ')}`);
    console.log(`[AI Grader Debug] overall_score from AI: ${parsedGrading.overall_score}`);
    console.log(`[AI Grader Debug] overall_grade from AI: ${parsedGrading.overall_grade}`);

    // Calculate fallback overall_score if AI didn't provide it
    let overallScore = parsedGrading.overall_score;
    if (overallScore == null || isNaN(overallScore)) {
      console.warn(`  ⚠️ AI did not return overall_score (value: ${parsedGrading.overall_score}), calculating from dimension scores...`);
      // Fallback: calculate weighted average of dimension scores
      const weights = parsedGrading.dimension_weights_used || { design: 0.30, seo: 0.30, performance: 0.20, content: 0.10, accessibility: 0.05, social: 0.05 };
      overallScore = (
        ((gradingData.design_score || 50) * weights.design) +
        ((gradingData.seo_score || 50) * weights.seo) +
        ((gradingData.performance_score || 50) * (weights.performance || 0.20)) +
        ((gradingData.content_score || 50) * (weights.content || 0.10)) +
        ((gradingData.accessibility_score || 50) * (weights.accessibility || 0.05)) +
        ((gradingData.social_score || 50) * (weights.social || 0.05))
      );

      // Final safety check: if still NaN, use 50 as absolute fallback
      if (isNaN(overallScore)) {
        console.error(`  ❌ CRITICAL: Calculated overall_score is NaN, using 50 as absolute fallback`);
        overallScore = 50;
      }
    }

    // Calculate fallback lead_score if AI didn't provide it
    let leadScore = parsedGrading.lead_score;
    if (leadScore == null || isNaN(leadScore)) {
      console.warn(`  ⚠️ AI did not return lead_score, using overall_score as fallback...`);
      leadScore = Math.round(overallScore); // Simple fallback: use overall score
    }

    // Calculate fallback priority_tier (hot/warm/cold) if AI didn't provide it
    let priorityTier = parsedGrading.priority_tier;
    if (!priorityTier || typeof priorityTier !== 'string') {
      console.warn(`  ⚠️ AI did not return priority_tier, calculating from lead_score...`);
      // Map lead_score to tier
      if (leadScore >= 80) {
        priorityTier = 'hot';
      } else if (leadScore >= 55) {
        priorityTier = 'warm';
      } else {
        priorityTier = 'cold';
      }
    }

    // Calculate fallback budget_likelihood if AI didn't provide it
    let budgetLikelihood = parsedGrading.budget_likelihood;
    if (!budgetLikelihood || typeof budgetLikelihood !== 'string') {
      console.warn(`  ⚠️ AI did not return budget_likelihood, using default...`);
      // Simple fallback based on business signals
      const hasPremiumFeatures = metadata.business_intelligence?.premiumFeatures > 0;
      const hasPricingPage = metadata.business_intelligence?.pricingVisibility === true;
      if (hasPremiumFeatures && hasPricingPage) {
        budgetLikelihood = 'high';
      } else if (hasPremiumFeatures || hasPricingPage) {
        budgetLikelihood = 'medium';
      } else {
        budgetLikelihood = 'low';
      }
    }

    console.log(`  ├─ Grade: ${parsedGrading.overall_grade} (${Math.round(overallScore)}/100)`);
    console.log(`  ├─ Lead Score: ${leadScore}/100 (${priorityTier} tier)`);
    console.log(`  ├─ Gap vs Benchmark: ${parsedGrading.comparison_summary?.gap || 'N/A'} points`);
    console.log(`  └─ Weights Used: Design ${(parsedGrading.dimension_weights_used?.design || 0.30) * 100}%, SEO ${(parsedGrading.dimension_weights_used?.seo || 0.30) * 100}%, Perf ${(parsedGrading.dimension_weights_used?.performance || 0.20) * 100}%`);

    // Step 4: Return comprehensive grading result (NOW WITH ALL DIMENSION SCORES!)
    return {
      success: true,

      // Core grading
      grade: parsedGrading.overall_grade,
      overall_score: Math.round(overallScore),

      // Lead scoring - overall (use fallback values)
      lead_score: Math.round(leadScore),
      // NOTE: lead_priority field removed - results-aggregator maps lead_score to lead_priority (integer)
      priority_tier: priorityTier,  // TEXT: "hot"/"warm"/"cold"
      budget_likelihood: budgetLikelihood,  // TEXT: "high"/"medium"/"low"

      // Lead scoring - 6 dimension breakdown (NEW!)
      fit_score: Math.round(parsedGrading.fit_score || 50),  // Overall fit (0-100)
      quality_gap_score: Math.round(parsedGrading.quality_gap_score || 0),  // 0-25
      budget_score: Math.round(parsedGrading.budget_score || 0),  // 0-25
      urgency_score: Math.round(parsedGrading.urgency_score || 0),  // 0-20
      industry_fit_score: Math.round(parsedGrading.industry_fit_score || 0),  // 0-15
      company_size_score: Math.round(parsedGrading.company_size_score || 0),  // 0-10
      engagement_score: Math.round(parsedGrading.engagement_score || 0),  // 0-5

      // Lead scoring reasoning
      lead_priority_reasoning: parsedGrading.lead_scoring_reasoning || 'AI-generated lead score based on 6-dimension framework',

      // Weights used (for transparency/debugging)
      dimension_weights: parsedGrading.dimension_weights_used,
      weight_reasoning: parsedGrading.weight_reasoning,

      // Comparison insights
      comparison: {
        benchmark_id: benchmark.id,
        benchmark_name: parsedGrading.comparison_summary.benchmark_name,
        benchmark_score: parsedGrading.comparison_summary.benchmark_score,
        gap: parsedGrading.comparison_summary.gap,
        gap_assessment: parsedGrading.comparison_summary.gap_assessment,
        strongest_areas: parsedGrading.comparison_summary.strongest_areas,
        weakest_areas: parsedGrading.comparison_summary.weakest_areas,
        quick_wins: parsedGrading.comparison_summary.quick_wins
      },

      // Business context
      business_context: parsedGrading.business_context,

      // Sales insights
      sales_insights: parsedGrading.sales_insights,

      // Rationale
      grading_rationale: parsedGrading.grading_rationale,

      // Metadata
      graded_at: new Date().toISOString(),
      grading_method: 'ai-comparative',

      // Cost tracking
      _meta: {
        cost: gradingResult.cost || 0,
        tokens: gradingResult.total_tokens || gradingResult.tokens || 0,
        prompt_tokens: gradingResult.prompt_tokens || 0,
        completion_tokens: gradingResult.completion_tokens || 0,
        model: gradingResult.model || promptConfig.model,
        provider: gradingResult.provider || 'openai'
      }
    };

  } catch (error) {
    console.error(`  ❌ AI grading failed:`, error.message);
    console.error(`     Error details:`, error);
    console.error(`     Stack trace:`, error.stack);
    console.log(`  └─ Falling back to manual grading (dimension scores will be NULL)...`);

    // Return error details for debugging
    console.warn(`  ⚠️  WARNING: Manual grading does NOT populate dimension scores (pain_score, budget_score, etc.)`);
    console.warn(`  ⚠️  Check logs above to fix AI grading and get full lead scoring data.`);

    return fallbackGrading(analysisResults, metadata);
  }
}

/**
 * Fallback to manual grading if AI grading fails
 *
 * @param {object} analysisResults - Analysis results
 * @param {object} metadata - Metadata
 * @returns {object} Manual grade
 */
function fallbackGrading(analysisResults, metadata) {
  // Use manual grader (imported at top of file)
  const scores = {
    design: analysisResults.scores?.design_score || 50,
    seo: analysisResults.scores?.seo_score || 50,
    performance: analysisResults.scores?.performance_score || 50,
    content: analysisResults.scores?.content_score || 50,
    accessibility: analysisResults.scores?.accessibility_score || 50,
    social: analysisResults.scores?.social_score || 50
  };

  const manualResult = calculateGrade(scores, metadata);

  return {
    success: true,
    grade: manualResult.grade,
    overall_score: manualResult.weightedScore,
    lead_score: 50, // Default medium priority
    lead_priority: 'medium',
    grading_method: 'manual-fallback',
    graded_at: new Date().toISOString()
  };
}

/**
 * Extract issues from analysis results
 *
 * @param {...object} results - Analysis results to extract from
 * @returns {Array} Issues array
 */
function extractIssues(...results) {
  const issues = [];

  for (const result of results) {
    if (!result) continue;

    if (result.issues) {
      issues.push(...result.issues.map(i => ({
        issue: i.issue || i.description || i,
        severity: i.severity || 'medium'
      })));
    }

    if (result.desktopIssues) {
      issues.push(...result.desktopIssues.map(i => ({
        issue: `[Desktop] ${i.issue || i}`,
        severity: i.severity || 'medium'
      })));
    }

    if (result.mobileIssues) {
      issues.push(...result.mobileIssues.map(i => ({
        issue: `[Mobile] ${i.issue || i}`,
        severity: i.severity || 'medium'
      })));
    }
  }

  return issues.slice(0, 15); // Limit to top 15 for prompt size
}

/**
 * Quick grade without benchmark comparison (for testing/preview)
 *
 * @param {object} scores - Dimension scores
 * @param {object} metadata - Metadata
 * @returns {string} Letter grade
 */
export function quickGrade(scores, metadata = {}) {
  // Simple average for quick preview
  const avgScore = Object.values(scores).reduce((sum, s) => sum + s, 0) / Object.keys(scores).length;

  if (avgScore >= 85) return 'A';
  if (avgScore >= 70) return 'B';
  if (avgScore >= 55) return 'C';
  if (avgScore >= 40) return 'D';
  return 'F';
}

export default { gradeWithAI, quickGrade };
