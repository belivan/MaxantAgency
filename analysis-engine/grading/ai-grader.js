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

import { loadPrompt } from '../shared/prompt-loader.js';
import { callAI } from '../shared/ai-client.js';
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

    const promptConfig = await loadPrompt('grading/ai-comparative-grader', gradingData);

    const gradingResult = await callAI({
      model: promptConfig.model,
      temperature: promptConfig.temperature,
      systemPrompt: promptConfig.systemPrompt,
      userPrompt: promptConfig.userPrompt,
      responseFormat: 'json'
    });

    // Parse JSON response from content field
    const parsedGrading = typeof gradingResult.content === 'string'
      ? JSON.parse(gradingResult.content)
      : gradingResult;

    console.log(`  ├─ Grade: ${parsedGrading.overall_grade} (${parsedGrading.overall_score}/100)`);
    console.log(`  ├─ Lead Score: ${parsedGrading.lead_score}/100 (${parsedGrading.lead_priority} priority)`);
    console.log(`  ├─ Gap vs Benchmark: ${parsedGrading.comparison_summary.gap} points`);
    console.log(`  └─ Weights Used: Design ${parsedGrading.dimension_weights_used.design * 100}%, SEO ${parsedGrading.dimension_weights_used.seo * 100}%, Perf ${parsedGrading.dimension_weights_used.performance * 100}%`);

    // Step 4: Return comprehensive grading result
    return {
      success: true,

      // Core grading
      grade: parsedGrading.overall_grade,
      overall_score: Math.round(parsedGrading.overall_score),

      // Lead scoring
      lead_score: Math.round(parsedGrading.lead_score),
      lead_priority: parsedGrading.lead_priority,

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
      grading_method: 'ai-comparative'
    };

  } catch (error) {
    console.error(`  ❌ AI grading failed:`, error.message);
    console.log(`  └─ Falling back to manual grading...`);

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
