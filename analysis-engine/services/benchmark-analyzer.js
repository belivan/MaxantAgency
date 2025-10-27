/**
 * Benchmark Analysis Service
 *
 * Reusable service for analyzing websites as benchmarks.
 * Used by both the API endpoint and populate-benchmarks.js script.
 *
 * Key Differences from Regular Analysis:
 * - AI Grading DISABLED (avoids circular dependency - benchmarks can't grade against themselves)
 * - Runs 4 "strength extractor" prompts that document SUCCESS PATTERNS
 * - Saves to benchmarks table (not leads table)
 * - Focuses on WHAT WORKS, not problems
 */

import { analyzeWebsiteIntelligent } from '../orchestrator-refactored.js';
import { saveBenchmark, getBenchmarkByUrl, updateBenchmark } from '../database/supabase-client.js';
import { loadPrompt } from '../shared/prompt-loader.js';
import { callAI, parseJSONResponse } from '../shared/ai-client.js';

/**

/**
 * Analyze a website as a benchmark
 *
 * @param {object} benchmarkData - Benchmark metadata
 * @param {string} benchmarkData.company_name - Company name
 * @param {string} benchmarkData.website_url - Website URL
 * @param {string} benchmarkData.industry - Industry classification
 * @param {string} [benchmarkData.industry_subcategory] - Industry subcategory
 * @param {string} [benchmarkData.location_city] - City
 * @param {string} [benchmarkData.location_state] - State
 * @param {string} [benchmarkData.benchmark_tier] - Tier (national/regional/local)
 * @param {number} [benchmarkData.google_rating] - Google rating
 * @param {number} [benchmarkData.google_review_count] - Review count
 * @param {array} [benchmarkData.awards] - Awards
 * @param {string} [benchmarkData.notes] - Notes
 * @param {boolean} [options.force] - Force re-analysis if exists
 * @returns {Promise<{success: boolean, benchmark?: object, error?: string}>}
 */
export async function analyzeBenchmark(benchmarkData, options = {}) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📊 ANALYZING BENCHMARK: ${benchmarkData.company_name}`);
  console.log(`   URL: ${benchmarkData.website_url}`);
  console.log(`   Industry: ${benchmarkData.industry}`);
  console.log(`${'='.repeat(80)}\n`);

  try {
    // Check if already analyzed
    const existing = await getBenchmarkByUrl(benchmarkData.website_url);
    if (existing && !options.force) {
      console.log(`⚠️  Benchmark already exists (ID: ${existing.id})`);
      console.log(`   Analyzed: ${existing.analyzed_at}`);
      console.log(`   Score: ${existing.overall_score}/100 (Grade ${existing.overall_grade})`);
      console.log(`   To re-analyze, use { force: true } option`);
      return { success: false, error: 'Already exists', benchmark: existing };
    }

    // === PHASE 1: FULL ANALYSIS ===
    console.log(`\n🔬 Phase 1: Running full analysis...`);

    // DISABLE AI grading to avoid circular dependency
    // (Benchmarks can't grade against themselves!)
    const originalGradingFlag = process.env.USE_AI_GRADING;
    process.env.USE_AI_GRADING = 'false';

    const analysisResult = await analyzeWebsiteIntelligent(benchmarkData.website_url, {
      company_name: benchmarkData.company_name,
      industry: benchmarkData.industry,
      city: benchmarkData.location_city,
      state: benchmarkData.location_state
    });

    process.env.USE_AI_GRADING = originalGradingFlag; // Restore
    console.log(`✅ Analysis complete`);

    // === PHASE 2: STRENGTH EXTRACTION ===
    console.log(`\n🔍 Phase 2: Extracting benchmark strengths...`);
    console.log(`   (Using special "success pattern" prompts)`);

    const strengths = await extractBenchmarkStrengths(
      analysisResult,
      benchmarkData
    );

    // === PHASE 3: SAVE BENCHMARK ===
    const benchmarkRecord = {
      company_name: benchmarkData.company_name,
      website_url: benchmarkData.website_url,
      industry: benchmarkData.industry,
      industry_subcategory: benchmarkData.industry_subcategory || null,
      location_city: benchmarkData.location_city || null,
      location_state: benchmarkData.location_state || null,
      benchmark_tier: benchmarkData.benchmark_tier || 'regional',
      source: benchmarkData.source || 'manual',
      google_rating: benchmarkData.google_rating || null,
      google_review_count: benchmarkData.google_review_count || null,
      awards: benchmarkData.awards || null,

      // Analysis results (store complete analysis data)
      analysis_results: analysisResult,

      // Scores (round to integers for database storage)
      design_score: Math.round(analysisResult.design_score),
      seo_score: Math.round(analysisResult.seo_score),
      performance_score: Math.round(analysisResult.performance_score),
      content_score: Math.round(analysisResult.content_score),
      accessibility_score: Math.round(analysisResult.accessibility_score),
      social_score: Math.round(analysisResult.social_score),
      overall_grade: analysisResult.grade || analysisResult.website_grade,
      overall_score: Math.round(analysisResult.overall_score),

      // Screenshots
      desktop_screenshot_url: analysisResult.screenshot_desktop_url || null,
      mobile_screenshot_url: analysisResult.screenshot_mobile_url || null,

      // Business intelligence
      business_intelligence: analysisResult.business_intelligence || null,

      // Extracted strengths (from benchmark-specific prompts)
      design_strengths: strengths.design,
      seo_strengths: strengths.seo,
      content_strengths: strengths.content,
      social_strengths: strengths.social,
      accessibility_strengths: strengths.accessibility,

      // Metadata
      analyzed_at: new Date().toISOString(),
      is_active: true,
      quality_flag: 'approved',
      notes: benchmarkData.notes || null,
      tags: [
        benchmarkData.industry,
        benchmarkData.benchmark_tier || 'regional',
        benchmarkData.location_state
      ].filter(Boolean)
    };

    let savedBenchmark;
    if (existing && options.force) {
      // Update existing
      savedBenchmark = await updateBenchmark(existing.id, benchmarkRecord);
      console.log(`\n✅ BENCHMARK UPDATED`);
    } else {
      // Create new
      savedBenchmark = await saveBenchmark(benchmarkRecord);
      console.log(`\n✅ BENCHMARK SAVED`);
    }

    console.log(`   ID: ${savedBenchmark.id}`);
    console.log(`   Overall Score: ${savedBenchmark.overall_score}/100 (Grade ${savedBenchmark.overall_grade})`);
    console.log(`   Design: ${savedBenchmark.design_score} | SEO: ${savedBenchmark.seo_score} | Performance: ${savedBenchmark.performance_score}`);
    console.log(`   Content: ${savedBenchmark.content_score} | Accessibility: ${savedBenchmark.accessibility_score} | Social: ${savedBenchmark.social_score}`);
    console.log(`   Strengths: ${strengths.design ? '✅ Design' : '❌'} | ${strengths.seo ? '✅ SEO' : '❌'} | ${strengths.social ? '✅ Social' : '❌'} | ${strengths.accessibility ? '✅ Accessibility' : '❌'}`);

    return { success: true, benchmark: savedBenchmark };

  } catch (error) {
    console.error(`\n❌ ERROR analyzing benchmark:`, error.message);
    console.error(error.stack);
    return { success: false, error: error.message };
  }
}

/**
 * Extract benchmark strengths using specialized prompts
 *
 * These prompts focus on SUCCESS PATTERNS, not problems.
 * All use Claude Haiku 4.5.
 *
 * @param {object} analysisResult - Full analysis result
 * @param {object} benchmarkData - Benchmark metadata
 * @returns {Promise<object>} Strengths by category
 */
async function extractBenchmarkStrengths(analysisResult, benchmarkData) {
  const strengths = {
    design: null,
    seo: null,
    content: null,
    social: null,
    accessibility: null
  };

  // Helper to parse AI JSON responses (uses enhanced parser from ai-client)
  function parseAIResponse(aiResult) {
    const jsonContent = aiResult.content || aiResult;
    if (typeof jsonContent === 'string') {
      return parseJSONResponse(jsonContent);
    }
    return jsonContent;
  }

  try {
    // 1. Visual Strengths (Design/UI)
    console.log(`   - Running visual-strengths-extractor...`);
    const visualPrompt = await loadPrompt('benchmarking/visual-strengths-extractor', {
      company_name: benchmarkData.company_name,
      industry: benchmarkData.industry,
      url: benchmarkData.website_url,
      google_rating: benchmarkData.google_rating || 'N/A',
      google_review_count: benchmarkData.google_review_count || 'N/A',
      awards: benchmarkData.awards || []
    });

    // Pass screenshot URLs directly - ai-client.js will fetch and compress them

    const visualResult = await callAI({
      model: visualPrompt.model,
      temperature: visualPrompt.temperature,
      systemPrompt: visualPrompt.systemPrompt,
      userPrompt: visualPrompt.userPrompt,
      images: [analysisResult.screenshot_desktop_url, analysisResult.screenshot_mobile_url].filter(Boolean),
      jsonMode: true
    });

    strengths.design = parseAIResponse(visualResult);
    console.log(`     ✅ Design strengths extracted`);

  } catch (error) {
    console.error(`     ⚠️  Visual strengths failed:`, error.message);
  }

  try {
    // 2. Technical Strengths (SEO + Content)
    console.log(`   - Running technical-strengths-extractor...`);
    const technicalPrompt = await loadPrompt('benchmarking/technical-strengths-extractor', {
      company_name: benchmarkData.company_name,
      industry: benchmarkData.industry,
      url: benchmarkData.website_url,
      google_rating: benchmarkData.google_rating,
      google_review_count: benchmarkData.google_review_count,
      html_content: 'N/A',
      meta_title: analysisResult.page_title || '',
      meta_description: analysisResult.meta_description || '',
      sitemap_urls: 'N/A'
    });

    const technicalResult = await callAI({
      model: technicalPrompt.model,
      temperature: technicalPrompt.temperature,
      systemPrompt: technicalPrompt.systemPrompt,
      userPrompt: technicalPrompt.userPrompt,
      jsonMode: true
    });

    const technicalData = parseAIResponse(technicalResult);
    strengths.seo = technicalData.seoStrengths || technicalData.seo_strengths || null;
    strengths.content = technicalData.contentStrengths || technicalData.content_strengths || null;
    console.log(`     ✅ SEO + Content strengths extracted`);

  } catch (error) {
    console.error(`     ⚠️  Technical strengths failed:`, error.message);
  }

  try {
    // 3. Social Strengths
    console.log(`   - Running social-strengths-extractor...`);
    const socialPrompt = await loadPrompt('benchmarking/social-strengths-extractor', {
      company_name: benchmarkData.company_name,
      industry: benchmarkData.industry,
      url: benchmarkData.website_url,
      social_profiles: analysisResult.social_profiles || {},
      google_rating: benchmarkData.google_rating,
      google_review_count: benchmarkData.google_review_count
    });

    const socialResult = await callAI({
      model: socialPrompt.model,
      temperature: socialPrompt.temperature,
      systemPrompt: socialPrompt.systemPrompt,
      userPrompt: socialPrompt.userPrompt,
      jsonMode: true
    });

    strengths.social = parseAIResponse(socialResult);
    console.log(`     ✅ Social strengths extracted`);

  } catch (error) {
    console.error(`     ⚠️  Social strengths failed:`, error.message);
  }

  try {
    // 4. Accessibility Strengths
    console.log(`   - Running accessibility-strengths-extractor...`);
    const accessibilityPrompt = await loadPrompt('benchmarking/accessibility-strengths-extractor', {
      company_name: benchmarkData.company_name,
      industry: benchmarkData.industry,
      url: benchmarkData.website_url,
      html_content: 'N/A',
      aria_attributes: 'N/A',
      color_palette: 'N/A'
    });

    const accessibilityResult = await callAI({
      model: accessibilityPrompt.model,
      temperature: accessibilityPrompt.temperature,
      systemPrompt: accessibilityPrompt.systemPrompt,
      userPrompt: accessibilityPrompt.userPrompt,
      jsonMode: true
    });

    strengths.accessibility = parseAIResponse(accessibilityResult);
    console.log(`     ✅ Accessibility strengths extracted`);

  } catch (error) {
    console.error(`     ⚠️  Accessibility strengths failed:`, error.message);
  }

  console.log(`✅ Strength extraction complete`);
  return strengths;
}

export default { analyzeBenchmark };
