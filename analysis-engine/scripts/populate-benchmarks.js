/**
 * Benchmark Population Script
 *
 * Analyzes top-performing businesses and populates the benchmarks table.
 * Uses the full analysis pipeline to generate scores for benchmark websites.
 *
 * Usage:
 *   node scripts/populate-benchmarks.js
 *   node scripts/populate-benchmarks.js --batch=dentists
 *   node scripts/populate-benchmarks.js --single https://example.com --industry dentistry
 */

import { analyzeWebsiteIntelligent } from '../orchestrator-refactored.js';
import { saveBenchmark, getBenchmarkByUrl } from '../database/supabase-client.js';
import { loadPrompt } from '../shared/prompt-loader.js';
import { callAI } from '../../database-tools/shared/ai-client.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../../.env') });

// Top-performing businesses to analyze as benchmarks
const BENCHMARKS = [
  // DENTISTRY
  {
    company_name: 'Rubin Family Dentistry & Associates',
    website_url: 'https://rubindentistry.com/',
    industry: 'dentistry',
    industry_subcategory: 'family-dentistry',
    location_city: 'South Windsor',
    location_state: 'CT',
    benchmark_tier: 'regional',
    source: 'manual',
    google_rating: 4.9,
    google_review_count: 111,
    notes: 'Top-rated on Expertise.com Hartford dentist rankings'
  },
  {
    company_name: 'Dolan Dental',
    website_url: 'https://www.dolandental.com/',
    industry: 'dentistry',
    industry_subcategory: 'comprehensive-dentistry',
    location_city: 'Wethersfield',
    location_state: 'CT',
    benchmark_tier: 'regional',
    source: 'manual',
    google_rating: 5.0,
    google_review_count: 232,
    notes: 'Perfect 5-star rating with high review volume'
  },
  {
    company_name: 'Brightside Family Dentistry',
    website_url: 'https://www.brightsidefamilydental.com/',
    industry: 'dentistry',
    industry_subcategory: 'cosmetic-family-dentistry',
    location_city: 'East Hartford',
    location_state: 'CT',
    benchmark_tier: 'regional',
    source: 'manual',
    google_rating: 4.8,
    google_review_count: 150,
    notes: 'Established 2010, offers Invisalign and cosmetic services'
  },
  {
    company_name: 'Dental Partners of Boston',
    website_url: 'https://www.dentalpartnersofboston.com/',
    industry: 'dentistry',
    industry_subcategory: 'multi-location-dental-group',
    location_city: 'Boston',
    location_state: 'MA',
    benchmark_tier: 'regional',
    source: 'manual',
    google_rating: 4.7,
    google_review_count: 500,
    awards: [{ award: 'Boston Magazine Top Dentists 2024', url: 'https://www.bostonmagazine.com/health/top-dentists/' }],
    notes: 'Multi-location practice, Boston Magazine Top Dentists every year since 2017'
  },

  // RESTAURANTS
  {
    company_name: 'The Charles',
    website_url: 'https://www.thecharlesct.com/',
    industry: 'restaurant',
    industry_subcategory: 'fine-dining-american',
    location_city: 'Wethersfield',
    location_state: 'CT',
    benchmark_tier: 'regional',
    source: 'manual',
    google_rating: 4.8,
    google_review_count: 300,
    awards: [
      { award: 'Connecticut Magazine 2024 Overall Excellence New American' },
      { award: 'Hartford Magazine 2024 Best Appetizers, Cocktails, Restaurant' },
      { award: 'CT Restaurant Association 2022 Northern Region Restaurant of the Year' }
    ],
    notes: 'Multi-year award winner, premium dining segment'
  },
  {
    company_name: 'Gather55',
    website_url: 'https://gather55.com/',
    industry: 'restaurant',
    industry_subcategory: 'social-enterprise-dining',
    location_city: 'Hartford',
    location_state: 'CT',
    benchmark_tier: 'regional',
    source: 'manual',
    google_rating: 4.6,
    google_review_count: 200,
    awards: [{ award: 'Connecticut Magazine Top New Restaurant 2024' }],
    notes: 'Innovative pay-what-you-can model, Chef Tyler Anderson (Millwright\'s owner)'
  },
  {
    company_name: 'Vietnam Restaurant',
    website_url: 'https://eatatvietnam.com/',
    industry: 'restaurant',
    industry_subcategory: 'vietnamese',
    location_city: 'Philadelphia',
    location_state: 'PA',
    benchmark_tier: 'national',
    source: 'manual',
    google_rating: 4.5,
    google_review_count: 800,
    awards: [{ award: 'James Beard Award 2024 America\'s Classics Award (Mid-Atlantic)' }],
    notes: 'James Beard Award winner, founded 1984, 40-year legacy'
  },
  {
    company_name: 'Alta Calidad',
    website_url: 'https://altacalidadbk.com/',
    industry: 'restaurant',
    industry_subcategory: 'mexican',
    location_city: 'Brooklyn',
    location_state: 'NY',
    benchmark_tier: 'national',
    source: 'manual',
    google_rating: 4.6,
    google_review_count: 600,
    awards: [{ award: 'Michelin Bib Gourmand Award' }],
    notes: 'Michelin recognition, Chef Akhtar Nawab, Certified Minority Owned Business'
  },

  // COFFEE SHOPS
  {
    company_name: 'Story and Soil Coffee',
    website_url: 'https://www.storyandsoilcoffee.com/',
    industry: 'coffee-shop',
    industry_subcategory: 'specialty-coffee',
    location_city: 'Hartford',
    location_state: 'CT',
    benchmark_tier: 'national',
    source: 'manual',
    google_rating: 4.7,
    google_review_count: 250,
    awards: [{ award: 'World\'s 100 Best Coffee Shops' }],
    notes: 'Featured in World\'s 100 Best, opened 2017, Frog Hollow neighborhood'
  },
  {
    company_name: 'Dave\'s Coffee',
    website_url: 'https://www.davescoffee.com/',
    industry: 'coffee-shop',
    industry_subcategory: 'coffee-roaster-cafe',
    location_city: 'Providence',
    location_state: 'RI',
    benchmark_tier: 'regional',
    source: 'manual',
    google_rating: 4.6,
    google_review_count: 400,
    notes: 'Established 2005, family-run RI roaster, multiple cafe locations'
  },

  // HAIR SALONS
  {
    company_name: 'Looks by Lena',
    website_url: 'https://www.looksbylena.com/',
    industry: 'hair-salon',
    industry_subcategory: 'full-service-salon',
    location_city: 'West Hartford',
    location_state: 'CT',
    benchmark_tier: 'regional',
    source: 'manual',
    google_rating: 4.9,
    google_review_count: 180,
    awards: [
      { award: 'Hartford Advocate Best Salon West Hartford - 15 times' },
      { award: 'Hartford Magazine Best of Hartford - 4 times' },
      { award: 'WeHa Best Hair Salon - 6 times' }
    ],
    notes: 'Multi-year award winner, owner won Golden Shears award'
  },
  {
    company_name: 'Mane Loft Salon',
    website_url: 'https://www.mane-loft.com/',
    industry: 'hair-salon',
    industry_subcategory: 'color-extension-specialists',
    location_city: 'West Hartford',
    location_state: 'CT',
    benchmark_tier: 'regional',
    source: 'manual',
    google_rating: 4.8,
    google_review_count: 120,
    notes: 'Award-winning color and extension specialists, modern boutique salon'
  },

  // FITNESS & WELLNESS
  {
    company_name: 'Hartford Sweat',
    website_url: 'https://www.hartfordsweat.net/',
    industry: 'fitness',
    industry_subcategory: 'yoga-studio',
    location_city: 'Hartford',
    location_state: 'CT',
    benchmark_tier: 'regional',
    source: 'manual',
    google_rating: 4.8,
    google_review_count: 200,
    notes: 'Premier fitness studio, hot yoga, Bikram, barre, Pilates, downtown location'
  },
  {
    company_name: 'BURN Fitness Studios',
    website_url: 'https://www.burnfitboston.com/',
    industry: 'fitness',
    industry_subcategory: 'boutique-fitness',
    location_city: 'Boston',
    location_state: 'MA',
    benchmark_tier: 'regional',
    source: 'manual',
    google_rating: 4.7,
    google_review_count: 300,
    notes: 'Recognized as one of Boston\'s best boutique fitness studios'
  },
  {
    company_name: 'ELITE GYM',
    website_url: 'https://elitegym.fitness/',
    industry: 'fitness',
    industry_subcategory: 'personal-training',
    location_city: 'Providence',
    location_state: 'RI',
    benchmark_tier: 'regional',
    source: 'manual',
    google_rating: 4.9,
    google_review_count: 150,
    notes: 'Rhode Island\'s top group fitness and personal training studio'
  }
];

// Batch definitions
const BATCHES = {
  dentists: BENCHMARKS.filter(b => b.industry === 'dentistry'),
  restaurants: BENCHMARKS.filter(b => b.industry === 'restaurant'),
  coffee: BENCHMARKS.filter(b => b.industry === 'coffee-shop'),
  salons: BENCHMARKS.filter(b => b.industry === 'hair-salon'),
  fitness: BENCHMARKS.filter(b => b.industry === 'fitness'),
  all: BENCHMARKS
};

/**
 * Analyze a website and save as benchmark
 */
async function analyzeBenchmark(benchmarkData) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📊 ANALYZING BENCHMARK: ${benchmarkData.company_name}`);
  console.log(`   URL: ${benchmarkData.website_url}`);
  console.log(`   Industry: ${benchmarkData.industry}`);
  console.log(`${'='.repeat(80)}\n`);

  try {
    // Check if already analyzed
    const existing = await getBenchmarkByUrl(benchmarkData.website_url);
    if (existing) {
      console.log(`⚠️  Benchmark already exists (ID: ${existing.id})`);
      console.log(`   Analyzed: ${existing.analyzed_at}`);
      console.log(`   Score: ${existing.overall_score}/100 (Grade ${existing.overall_grade})`);
      console.log(`   To re-analyze, delete existing record first`);
      return { success: false, error: 'Already exists', benchmark: existing };
    }

    // Run full analysis (DISABLE AI grading to avoid circular dependency)
    const originalGradingFlag = process.env.USE_AI_GRADING;
    process.env.USE_AI_GRADING = 'false'; // Force manual grading for benchmarks

    const analysisResult = await analyzeWebsiteIntelligent(benchmarkData.website_url, {
      company_name: benchmarkData.company_name,
      industry: benchmarkData.industry,
      city: benchmarkData.location_city,
      state: benchmarkData.location_state
    });

    process.env.USE_AI_GRADING = originalGradingFlag; // Restore original flag

    // analysisResult is the final result object directly (not wrapped in .result)
    const result = analysisResult;

    // === BENCHMARK-SPECIFIC STRENGTH EXTRACTION ===
    console.log(`\n🔍 Extracting strengths using benchmark-specific prompts...`);

    let designStrengths = null;
    let seoStrengths = null;
    let contentStrengths = null;
    let socialStrengths = null;
    let accessibilityStrengths = null;

    // Helper function to parse AI JSON responses
    function parseAIResponse(aiResult) {
      let jsonContent = aiResult.content || aiResult;
      if (typeof jsonContent === 'string') {
        // Remove markdown code blocks if present
        jsonContent = jsonContent.replace(/^```json\s*\n?/i, '').replace(/\n?```\s*$/i, '');
        return JSON.parse(jsonContent);
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
        awards: [] // Will be populated if we have awards data
      });

      const visualResult = await callAI({
        model: visualPrompt.model,
        temperature: visualPrompt.temperature,
        systemPrompt: visualPrompt.systemPrompt,
        userPrompt: visualPrompt.userPrompt,
        images: [
          result.screenshot_desktop_url,
          result.screenshot_mobile_url
        ].filter(Boolean),
        responseFormat: 'json'
      });

      designStrengths = parseAIResponse(visualResult);

      // 2. Technical Strengths (SEO + Content)
      console.log(`   - Running technical-strengths-extractor...`);
      const technicalPrompt = await loadPrompt('benchmarking/technical-strengths-extractor', {
        company_name: benchmarkData.company_name,
        industry: benchmarkData.industry,
        url: benchmarkData.website_url,
        google_rating: benchmarkData.google_rating,
        google_review_count: benchmarkData.google_review_count,
        html_content: 'N/A', // Raw HTML not available in final results
        meta_title: result.page_title || '',
        meta_description: result.meta_description || '',
        sitemap_urls: 'N/A' // Sitemap data not in final results
      });

      const technicalRawResult = await callAI({
        model: technicalPrompt.model,
        temperature: technicalPrompt.temperature,
        systemPrompt: technicalPrompt.systemPrompt,
        userPrompt: technicalPrompt.userPrompt,
        responseFormat: 'json'
      });

      const technicalResult = parseAIResponse(technicalRawResult);

      // Split technical strengths into SEO and Content
      seoStrengths = {
        seoScore: technicalResult.seoScore,
        overallTechnicalScore: technicalResult.overallTechnicalScore,
        seoStrengths: technicalResult.seoStrengths,
        metaTagPatterns: technicalResult.metaTagPatterns,
        schemaMarkup: technicalResult.schemaMarkup,
        keywordStrategy: technicalResult.keywordStrategy,
        internalLinking: technicalResult.internalLinking,
        technicalWins: technicalResult.technicalWins
      };

      contentStrengths = {
        contentScore: technicalResult.contentScore,
        contentStrengths: technicalResult.contentStrengths,
        contentStructure: technicalResult.contentStructure
      };

      // 3. Social Strengths
      console.log(`   - Running social-strengths-extractor...`);
      const socialPrompt = await loadPrompt('benchmarking/social-strengths-extractor', {
        company_name: benchmarkData.company_name,
        industry: benchmarkData.industry,
        url: benchmarkData.website_url,
        google_rating: benchmarkData.google_rating,
        google_review_count: benchmarkData.google_review_count,
        html_content: 'N/A', // Raw HTML not available
        social_links: result.social_platforms_present?.join(', ') || 'N/A'
      });

      const socialRawResult = await callAI({
        model: socialPrompt.model,
        temperature: socialPrompt.temperature,
        systemPrompt: socialPrompt.systemPrompt,
        userPrompt: socialPrompt.userPrompt,
        responseFormat: 'json'
      });
      socialStrengths = parseAIResponse(socialRawResult);

      // 4. Accessibility Strengths
      console.log(`   - Running accessibility-strengths-extractor...`);
      const accessibilityPrompt = await loadPrompt('benchmarking/accessibility-strengths-extractor', {
        company_name: benchmarkData.company_name,
        industry: benchmarkData.industry,
        url: benchmarkData.website_url,
        html_content: 'N/A', // Raw HTML not available
        aria_attributes: 'N/A', // Detailed ARIA not in final results
        color_palette: 'N/A' // Color palette not in final results
      });

      const accessibilityRawResult = await callAI({
        model: accessibilityPrompt.model,
        temperature: accessibilityPrompt.temperature,
        systemPrompt: accessibilityPrompt.systemPrompt,
        userPrompt: accessibilityPrompt.userPrompt,
        responseFormat: 'json'
      });
      accessibilityStrengths = parseAIResponse(accessibilityRawResult);

      console.log(`✅ Strength extraction complete`);

    } catch (strengthError) {
      console.error(`⚠️  Warning: Strength extraction failed (non-fatal):`, strengthError.message);
      console.log(`   Benchmark will be saved with null strength values`);
    }

    // Build benchmark record
    const benchmarkRecord = {
      company_name: benchmarkData.company_name,
      website_url: benchmarkData.website_url,
      industry: benchmarkData.industry,
      industry_subcategory: benchmarkData.industry_subcategory,
      location_city: benchmarkData.location_city,
      location_state: benchmarkData.location_state,
      benchmark_tier: benchmarkData.benchmark_tier,
      source: benchmarkData.source,
      google_rating: benchmarkData.google_rating,
      google_review_count: benchmarkData.google_review_count,
      awards: benchmarkData.awards || null,

      // Analysis results (store complete analysis data)
      analysis_results: result,

      // Scores (round to integers for database storage)
      design_score: Math.round(result.design_score),
      seo_score: Math.round(result.seo_score),
      performance_score: Math.round(result.performance_score),
      content_score: Math.round(result.content_score),
      accessibility_score: Math.round(result.accessibility_score),
      social_score: Math.round(result.social_score),
      overall_grade: result.grade || result.website_grade,
      overall_score: Math.round(result.overall_score),

      // Screenshots
      desktop_screenshot_url: result.screenshot_desktop_url || null,
      mobile_screenshot_url: result.screenshot_mobile_url || null,

      // Business intelligence
      business_intelligence: result.business_intelligence || null,

      // Extracted strengths (from benchmark-specific prompts)
      design_strengths: designStrengths,
      seo_strengths: seoStrengths,
      content_strengths: contentStrengths,
      social_strengths: socialStrengths,
      accessibility_strengths: accessibilityStrengths,

      // Metadata
      analyzed_at: new Date().toISOString(),
      is_active: true,
      quality_flag: 'approved', // Auto-approve since these are manually curated
      notes: benchmarkData.notes,
      tags: [benchmarkData.industry, benchmarkData.benchmark_tier, benchmarkData.location_state]
    };

    // Save to database
    const savedBenchmark = await saveBenchmark(benchmarkRecord);

    console.log(`\n✅ BENCHMARK SAVED SUCCESSFULLY`);
    console.log(`   ID: ${savedBenchmark.id}`);
    console.log(`   Overall Score: ${savedBenchmark.overall_score}/100 (Grade ${savedBenchmark.overall_grade})`);
    console.log(`   Design: ${savedBenchmark.design_score} | SEO: ${savedBenchmark.seo_score} | Performance: ${savedBenchmark.performance_score}`);
    console.log(`   Content: ${savedBenchmark.content_score} | Accessibility: ${savedBenchmark.accessibility_score} | Social: ${savedBenchmark.social_score}`);

    return { success: true, benchmark: savedBenchmark };

  } catch (error) {
    console.error(`\n❌ ERROR analyzing benchmark:`, error.message);
    console.error(error.stack);
    return { success: false, error: error.message };
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  let batch = 'all';
  let singleUrl = null;
  let singleIndustry = null;

  for (const arg of args) {
    if (arg.startsWith('--batch=')) {
      batch = arg.split('=')[1];
    } else if (arg.startsWith('--single=')) {
      singleUrl = arg.split('=')[1];
    } else if (arg.startsWith('--industry=')) {
      singleIndustry = arg.split('=')[1];
    }
  }

  console.log('\n🚀 BENCHMARK POPULATION SCRIPT\n');
  console.log('═'.repeat(80));

  // Single URL mode
  if (singleUrl) {
    console.log(`Mode: Single URL`);
    console.log(`URL: ${singleUrl}`);
    console.log(`Industry: ${singleIndustry || 'general'}`);
    console.log('═'.repeat(80));

    const result = await analyzeBenchmark({
      company_name: new URL(singleUrl).hostname,
      website_url: singleUrl,
      industry: singleIndustry || 'general',
      location_city: 'Unknown',
      location_state: 'Unknown',
      benchmark_tier: 'manual',
      source: 'manual',
      notes: 'Manually added benchmark'
    });

    console.log('\n' + '═'.repeat(80));
    console.log(result.success ? '✅ COMPLETE' : '❌ FAILED');
    process.exit(result.success ? 0 : 1);
  }

  // Batch mode
  const benchmarksToAnalyze = BATCHES[batch] || BATCHES.all;

  console.log(`Mode: Batch`);
  console.log(`Batch: ${batch}`);
  console.log(`Benchmarks to analyze: ${benchmarksToAnalyze.length}`);
  console.log('═'.repeat(80));

  const results = {
    success: 0,
    failed: 0,
    skipped: 0,
    total: benchmarksToAnalyze.length
  };

  for (let i = 0; i < benchmarksToAnalyze.length; i++) {
    const benchmark = benchmarksToAnalyze[i];

    console.log(`\n[${i + 1}/${benchmarksToAnalyze.length}]`);

    const result = await analyzeBenchmark(benchmark);

    if (result.success) {
      results.success++;
    } else if (result.error === 'Already exists') {
      results.skipped++;
    } else {
      results.failed++;
    }

    // Delay between analyses to avoid rate limits
    if (i < benchmarksToAnalyze.length - 1) {
      console.log('\n⏳ Waiting 10 seconds before next analysis...');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }

  // Summary
  console.log('\n' + '═'.repeat(80));
  console.log('📊 FINAL SUMMARY');
  console.log('═'.repeat(80));
  console.log(`Total: ${results.total}`);
  console.log(`✅ Success: ${results.success}`);
  console.log(`⚠️  Skipped (already exists): ${results.skipped}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log('═'.repeat(80));

  process.exit(results.failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('\n❌ FATAL ERROR:', error);
  process.exit(1);
});
