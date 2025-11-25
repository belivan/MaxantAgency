/**
 * Benchmark Matcher Service
 *
 * Uses AI (GPT-5 Mini) to find the best industry benchmark for comparison.
 * Considers company profile, business intelligence, and ICP criteria.
 */

import { loadPrompt, substituteVariables } from '../shared/prompt-loader.js';
import { getBenchmarksByIndustry, getBenchmarks } from '../database/supabase-client.js';
import { callAI } from '../../database-tools/shared/ai-client.js';

/**
 * Find the best benchmark match for a target business
 *
 * @param {object} targetBusiness - Business to find benchmark for
 * @param {string} targetBusiness.company_name - Company name
 * @param {string} targetBusiness.industry - Industry category
 * @param {string} targetBusiness.url - Website URL
 * @param {string} targetBusiness.city - City
 * @param {string} targetBusiness.state - State
 * @param {object} targetBusiness.business_intelligence - Extracted business data
 * @param {string} targetBusiness.icp_criteria - ICP search criteria (fallback if BI incomplete)
 * @param {object} options - Matching options
 * @returns {Promise<object>} Best benchmark match with reasoning
 */
export async function findBestBenchmark(targetBusiness, options = {}) {
  const {
    includeTiers = ['national', 'regional', 'local', 'manual'],  // Include 'manual' tier for manually added benchmarks
    maxCandidates = 20
  } = options;

  console.log(`\n🔍 Finding best benchmark for: ${targetBusiness.company_name}`);

  try {
    // Step 1: Get ALL candidate benchmarks from database (let AI do semantic matching)
    console.log(`  └─ Fetching all benchmarks (AI will match based on industry similarity)`);

    let candidateBenchmarks = await getBenchmarks({
      limit: maxCandidates
    });

    // Filter by tiers
    candidateBenchmarks = candidateBenchmarks.filter(b =>
      includeTiers.includes(b.benchmark_tier)
    );

    if (candidateBenchmarks.length === 0) {
      console.warn(`⚠️ No benchmarks available for matching`);
      return {
        success: false,
        error: 'No benchmarks available',
        benchmark: null
      };
    }

    console.log(`  └─ Found ${candidateBenchmarks.length} candidate benchmarks`);

    // Step 2: Prepare data for AI matching
    const matchingData = {
      company_name: targetBusiness.company_name,
      industry: targetBusiness.industry,
      url: targetBusiness.url,
      city: targetBusiness.city || 'Unknown',
      state: targetBusiness.state || 'Unknown',
      business_intelligence: targetBusiness.business_intelligence || null,
      icp_criteria: targetBusiness.icp_criteria || null,
      benchmarks: candidateBenchmarks.map(b => ({
        id: b.id,
        company_name: b.company_name,
        industry: b.industry,
        industry_subcategory: b.industry_subcategory,
        location_city: b.location_city,
        location_state: b.location_state,
        benchmark_tier: b.benchmark_tier,
        google_rating: b.google_rating,
        google_review_count: b.google_review_count,
        overall_score: b.overall_score,
        design_score: b.design_score,
        seo_score: b.seo_score,
        performance_score: b.performance_score,
        awards: b.awards,
        business_intelligence: b.business_intelligence
      }))
    };

    // Step 3: Load prompt and call AI
    console.log(`  └─ Calling AI matcher (GPT-5 Mini)...`);

    const promptConfig = await loadPrompt('benchmark-matching/find-best-comparison');

    const userPrompt = await substituteVariables(
      promptConfig.userPromptTemplate,
      matchingData
    );

    const result = await callAI({
      model: promptConfig.model,
      temperature: promptConfig.temperature,
      systemPrompt: promptConfig.systemPrompt,
      userPrompt: userPrompt,
      responseFormat: 'json'
    });

    // Parse the JSON response from the content field
    let matchResult;
    if (typeof result.content === 'string') {
      // Clean up AI response: remove markdown code blocks, trim whitespace, extract JSON
      let jsonString = result.content.trim();

      // Remove markdown code blocks
      jsonString = jsonString.replace(/^```json\n?/i, '').replace(/^```\n?/,'').replace(/\n?```$/,'');

      // Try to extract JSON if there's extra text
      const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonString = jsonMatch[0];
      }

      try {
        matchResult = JSON.parse(jsonString);
      } catch (parseError) {
        console.error(`❌ Failed to parse benchmark matcher JSON:`, parseError.message);
        console.error(`Raw response:`, result.content.substring(0, 500));
        throw new Error(`Invalid JSON from AI: ${parseError.message}`);
      }
    } else {
      matchResult = result;
    }

    // Step 4: Validate AI response and get full benchmark data

    // Check if AI returned a benchmark_company_name
    if (!matchResult.benchmark_company_name) {
      console.warn(`⚠️ AI did not return a benchmark_company_name, using fallback selection`);
      console.warn(`   AI response:`, JSON.stringify(matchResult, null, 2));

      // Fallback: Select highest-scored benchmark
      const fallbackBenchmark = candidateBenchmarks.reduce((best, current) =>
        current.overall_score > best.overall_score ? current : best
      );

      console.log(`  └─ Fallback selected: ${fallbackBenchmark.company_name} (score: ${fallbackBenchmark.overall_score})`);

      return {
        success: true,
        benchmark: fallbackBenchmark,
        match_metadata: {
          match_score: 0,
          match_reasoning: 'Fallback selection - AI did not return valid benchmark_company_name',
          comparison_tier: fallbackBenchmark.benchmark_tier,
          key_similarities: [],
          key_differences: [],
          candidates_considered: candidateBenchmarks.length,
          fallback_used: true
        }
      };
    }

    // Try exact match first
    let selectedBenchmark = candidateBenchmarks.find(b =>
      b.company_name === matchResult.benchmark_company_name
    );

    // If no exact match, try case-insensitive match
    if (!selectedBenchmark) {
      selectedBenchmark = candidateBenchmarks.find(b =>
        b.company_name.toLowerCase() === matchResult.benchmark_company_name.toLowerCase()
      );

      if (selectedBenchmark) {
        console.log(`  ℹ️ Matched using case-insensitive comparison`);
      }
    }

    // If still no match, try fuzzy matching (contains)
    if (!selectedBenchmark) {
      selectedBenchmark = candidateBenchmarks.find(b =>
        b.company_name.toLowerCase().includes(matchResult.benchmark_company_name.toLowerCase()) ||
        matchResult.benchmark_company_name.toLowerCase().includes(b.company_name.toLowerCase())
      );

      if (selectedBenchmark) {
        console.log(`  ℹ️ Matched using fuzzy matching (contains)`);
      }
    }

    if (!selectedBenchmark) {
      console.error(`❌ AI selected invalid benchmark name: "${matchResult.benchmark_company_name}"`);
      console.error(`   Available companies:`, candidateBenchmarks.map(b => b.company_name));

      // Fallback: Select highest-scored benchmark
      const fallbackBenchmark = candidateBenchmarks.reduce((best, current) =>
        current.overall_score > best.overall_score ? current : best
      );

      console.log(`  └─ Fallback selected: ${fallbackBenchmark.company_name} (score: ${fallbackBenchmark.overall_score})`);

      return {
        success: true,
        benchmark: fallbackBenchmark,
        match_metadata: {
          match_score: 0,
          match_reasoning: 'Fallback selection - AI returned invalid benchmark_company_name',
          comparison_tier: fallbackBenchmark.benchmark_tier,
          key_similarities: [],
          key_differences: [],
          candidates_considered: candidateBenchmarks.length,
          fallback_used: true
        }
      };
    }

    console.log(`  ✅ Matched to: ${selectedBenchmark.company_name} (${matchResult.match_score}% confidence)`);
    console.log(`     Tier: ${matchResult.comparison_tier}`);
    console.log(`     Reasoning: ${matchResult.match_reasoning}`);

    return {
      success: true,
      benchmark: selectedBenchmark,
      match_metadata: {
        match_score: matchResult.match_score,
        match_reasoning: matchResult.match_reasoning,
        comparison_tier: matchResult.comparison_tier,
        key_similarities: matchResult.key_similarities,
        key_differences: matchResult.key_differences,
        candidates_considered: candidateBenchmarks.length
      }
    };

  } catch (error) {
    console.error(`❌ Benchmark matching failed:`, error.message);
    return {
      success: false,
      error: error.message,
      benchmark: null
    };
  }
}

/**
 * Get multiple benchmark recommendations (aspirational, competitive, baseline)
 *
 * @param {object} targetBusiness - Business to find benchmarks for
 * @param {object} options - Options
 * @returns {Promise<object>} Multiple benchmark tiers
 */
export async function getMultipleBenchmarks(targetBusiness, options = {}) {
  console.log(`\n🔍 Finding multi-tier benchmarks for: ${targetBusiness.company_name}`);

  try {
    // Get all approved benchmarks for industry
    const allBenchmarks = await getBenchmarksByIndustry(targetBusiness.industry, {
      limit: 50
    });

    if (allBenchmarks.length < 3) {
      console.warn(`⚠️ Insufficient benchmarks for multi-tier matching`);
      // Fall back to single best match
      const result = await findBestBenchmark(targetBusiness, options);
      return {
        success: result.success,
        aspirational: result.benchmark,
        competitive: null,
        baseline: null
      };
    }

    // Sort by overall score
    allBenchmarks.sort((a, b) => b.overall_score - a.overall_score);

    // Select tiers
    const aspirational = allBenchmarks[0]; // Top performer
    const competitive = allBenchmarks[Math.floor(allBenchmarks.length / 2)]; // Median
    const baseline = allBenchmarks[Math.floor(allBenchmarks.length * 0.75)]; // Lower quartile

    console.log(`  ✅ Multi-tier benchmarks selected:`);
    console.log(`     Aspirational: ${aspirational.company_name} (${aspirational.overall_score})`);
    console.log(`     Competitive: ${competitive.company_name} (${competitive.overall_score})`);
    console.log(`     Baseline: ${baseline.company_name} (${baseline.overall_score})`);

    return {
      success: true,
      aspirational,
      competitive,
      baseline
    };

  } catch (error) {
    console.error(`❌ Multi-tier matching failed:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

export default { findBestBenchmark, getMultipleBenchmarks };
