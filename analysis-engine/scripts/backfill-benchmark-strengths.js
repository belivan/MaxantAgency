/**
 * Backfill Benchmark Strengths Script
 *
 * Extracts missing strength data for existing benchmarks that have NULL strength fields.
 * Uses the existing extractBenchmarkStrengths() function from benchmark-analyzer.js.
 *
 * Usage:
 *   node scripts/backfill-benchmark-strengths.js
 *   node scripts/backfill-benchmark-strengths.js --dry-run  (preview only, no updates)
 *   node scripts/backfill-benchmark-strengths.js --benchmark-id=<uuid>  (single benchmark)
 */

import { getBenchmarks, updateBenchmark, getBenchmarkById, supabase } from '../database/supabase-client.js';

// Import the strength extraction function (not exported by default, so we need to import the module)
async function extractBenchmarkStrengths(analysisResult, benchmarkData) {
  // Import dependencies
  const { loadPrompt } = await import('../shared/prompt-loader.js');
  const { callAI, parseJSONResponse } = await import('../../database-tools/shared/ai-client.js');

  const strengths = {
    design: null,
    seo: null,
    content: null,
    social: null,
    accessibility: null
  };

  // Helper to parse AI JSON responses
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
    // 3. Social Strengths (v2 - uses analysis data)
    console.log(`   - Running social-strengths-extractor-v2...`);
    const socialPrompt = await loadPrompt('benchmarking/social-strengths-extractor-v2', {
      company_name: benchmarkData.company_name,
      industry: benchmarkData.industry,
      url: benchmarkData.website_url,
      google_rating: benchmarkData.google_rating || 0,
      google_review_count: benchmarkData.google_review_count || 0,
      social_score: analysisResult.social_score || 0,
      social_issues: analysisResult.social_issues || [],
      social_platforms_present: analysisResult.social_platforms_present || [],
      social_profiles: analysisResult.social_profiles || {},
      screenshot_desktop_url: analysisResult.screenshot_desktop_url || '',
      screenshot_mobile_url: analysisResult.screenshot_mobile_url || ''
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
    // 4. Accessibility Strengths (v2 - uses analysis data)
    console.log(`   - Running accessibility-strengths-extractor-v2...`);
    const accessibilityPrompt = await loadPrompt('benchmarking/accessibility-strengths-extractor-v2', {
      company_name: benchmarkData.company_name,
      industry: benchmarkData.industry,
      url: benchmarkData.website_url,
      accessibility_score: analysisResult.accessibility_score || 0,
      accessibility_compliance: analysisResult.accessibility_compliance || 'Unknown',
      accessibility_issues: analysisResult.accessibility_issues || [],
      design_tokens_desktop: analysisResult.design_tokens_desktop || {},
      design_tokens_mobile: analysisResult.design_tokens_mobile || {},
      screenshot_desktop_url: analysisResult.screenshot_desktop_url || '',
      screenshot_mobile_url: analysisResult.screenshot_mobile_url || ''
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

  console.log(`   ✅ Strength extraction complete`);
  return strengths;
}

/**
 * Process a single benchmark
 */
async function processBenchmark(benchmark, options = {}) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 Processing: ${benchmark.company_name}`);
  console.log(`   URL: ${benchmark.website_url}`);
  console.log(`   ID: ${benchmark.id}`);
  console.log(`${'='.repeat(60)}\n`);

  // Check if already has strengths
  const hasDesign = benchmark.design_strengths !== null;
  const hasSeo = benchmark.seo_strengths !== null;
  const hasContent = benchmark.content_strengths !== null;
  const hasSocial = benchmark.social_strengths !== null;
  const hasAccessibility = benchmark.accessibility_strengths !== null;

  console.log(`Current strength status:`);
  console.log(`   Design: ${hasDesign ? '✅ Present' : '❌ NULL'}`);
  console.log(`   SEO: ${hasSeo ? '✅ Present' : '❌ NULL'}`);
  console.log(`   Content: ${hasContent ? '✅ Present' : '❌ NULL'}`);
  console.log(`   Social: ${hasSocial ? '✅ Present' : '❌ NULL'}`);
  console.log(`   Accessibility: ${hasAccessibility ? '✅ Present' : '❌ NULL'}`);

  if (hasDesign && hasSeo && hasContent && hasSocial && hasAccessibility) {
    console.log(`\n✅ All strengths already present - skipping\n`);
    return { skipped: true, reason: 'already_complete' };
  }

  // Check if analysis_results exists
  if (!benchmark.analysis_results) {
    console.error(`\n❌ ERROR: No analysis_results found in benchmark`);
    console.error(`   Cannot extract strengths without analysis data`);
    console.error(`   This benchmark needs to be re-analyzed\n`);
    return { error: true, reason: 'no_analysis_results' };
  }

  // Extract strengths
  console.log(`\n🔍 Extracting missing strengths...`);

  try {
    const strengths = await extractBenchmarkStrengths(
      benchmark.analysis_results,
      benchmark
    );

    // Validate that at least some strengths were extracted
    const extractedCount = Object.values(strengths).filter(v => v !== null).length;
    console.log(`\n📊 Extraction results:`);
    console.log(`   Extracted ${extractedCount}/5 strength categories`);

    if (extractedCount === 0) {
      console.error(`\n❌ ERROR: All extractors failed`);
      console.error(`   No strengths were extracted - check AI API connectivity\n`);
      return { error: true, reason: 'all_extractors_failed' };
    }

    // Prepare update object (only update NULL fields)
    const updates = {};
    if (!hasDesign && strengths.design) updates.design_strengths = strengths.design;
    if (!hasSeo && strengths.seo) updates.seo_strengths = strengths.seo;
    if (!hasContent && strengths.content) updates.content_strengths = strengths.content;
    if (!hasSocial && strengths.social) updates.social_strengths = strengths.social;
    if (!hasAccessibility && strengths.accessibility) updates.accessibility_strengths = strengths.accessibility;

    console.log(`\n📝 Prepared updates for ${Object.keys(updates).length} fields`);

    if (options.dryRun) {
      console.log(`\n🔍 DRY RUN - Would update:`);
      Object.keys(updates).forEach(key => {
        console.log(`   - ${key}`);
      });
      console.log(`\n✅ Dry run complete (no changes made)\n`);
      return { dryRun: true, wouldUpdate: Object.keys(updates) };
    }

    // Update database
    console.log(`\n💾 Updating benchmark in database...`);
    await updateBenchmark(benchmark.id, updates);

    console.log(`\n✅ Successfully updated benchmark!`);
    console.log(`   Updated fields: ${Object.keys(updates).join(', ')}\n`);

    return { success: true, updated: Object.keys(updates) };

  } catch (error) {
    console.error(`\n❌ ERROR during extraction:`);
    console.error(`   ${error.message}`);
    console.error(`   Stack: ${error.stack}\n`);
    return { error: true, reason: error.message };
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const benchmarkIdArg = args.find(arg => arg.startsWith('--benchmark-id='));
  const benchmarkId = benchmarkIdArg ? benchmarkIdArg.split('=')[1] : null;

  console.log(`\n${'#'.repeat(70)}`);
  console.log(`#  BACKFILL BENCHMARK STRENGTHS`);
  console.log(`#  ${new Date().toISOString()}`);
  if (dryRun) console.log(`#  MODE: DRY RUN (no changes will be made)`);
  if (benchmarkId) console.log(`#  TARGET: Single benchmark ${benchmarkId}`);
  console.log(`${'#'.repeat(70)}\n`);

  let benchmarks = [];

  if (benchmarkId) {
    // Process single benchmark
    const benchmark = await getBenchmarkById(benchmarkId);
    if (!benchmark) {
      console.error(`❌ ERROR: Benchmark not found: ${benchmarkId}`);
      process.exit(1);
    }
    benchmarks = [benchmark];
  } else {
    // Query all benchmarks with NULL strength fields
    console.log(`🔍 Querying benchmarks with missing strength data...\n`);

    const { data, error } = await supabase
      .from('benchmarks')
      .select('*')
      .or('design_strengths.is.null,seo_strengths.is.null,content_strengths.is.null,social_strengths.is.null,accessibility_strengths.is.null')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`❌ Database query failed:`, error.message);
      process.exit(1);
    }

    benchmarks = data || [];
  }

  console.log(`📊 Found ${benchmarks.length} benchmark(s) needing strength extraction\n`);

  if (benchmarks.length === 0) {
    console.log(`✅ All benchmarks already have strength data!`);
    console.log(`   Nothing to do.\n`);
    process.exit(0);
  }

  // Display summary
  benchmarks.forEach((b, idx) => {
    console.log(`${idx + 1}. ${b.company_name} (${b.website_url})`);
  });
  console.log('');

  // Process each benchmark
  const results = {
    success: 0,
    skipped: 0,
    errors: 0,
    dryRun: 0
  };

  for (let i = 0; i < benchmarks.length; i++) {
    const result = await processBenchmark(benchmarks[i], { dryRun });

    if (result.success) results.success++;
    else if (result.skipped) results.skipped++;
    else if (result.dryRun) results.dryRun++;
    else if (result.error) results.errors++;
  }

  // Final summary
  console.log(`\n${'='.repeat(70)}`);
  console.log(`📊 BACKFILL COMPLETE`);
  console.log(`${'='.repeat(70)}\n`);
  console.log(`Results:`);
  console.log(`   ✅ Successfully updated: ${results.success}`);
  console.log(`   ⏭️  Skipped (already complete): ${results.skipped}`);
  console.log(`   ❌ Errors: ${results.errors}`);
  if (dryRun) console.log(`   🔍 Dry run (no changes): ${results.dryRun}`);
  console.log('');

  if (results.errors > 0) {
    console.log(`⚠️  WARNING: ${results.errors} benchmark(s) failed`);
    console.log(`   Review errors above and retry failed benchmarks\n`);
    process.exit(1);
  }

  console.log(`✅ All benchmarks processed successfully!\n`);
  process.exit(0);
}

// Run
main().catch(error => {
  console.error(`\n❌ FATAL ERROR:`);
  console.error(error);
  console.error('');
  process.exit(1);
});
