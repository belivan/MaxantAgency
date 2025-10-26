/**
 * Test Benchmark Data Flow Fix
 *
 * Verifies that matched benchmark data appears in final analysis results
 */

import { analyzeWebsiteIntelligent } from '../orchestrator-refactored.js';

// Enable benchmark context
process.env.USE_BENCHMARK_CONTEXT = 'true';
process.env.USE_AI_GRADING = 'true';

console.log('🧪 TESTING BENCHMARK DATA FLOW FIX\n');
console.log('===================================================================');

async function runTest() {
  try {
    const result = await analyzeWebsiteIntelligent('https://www.sweetgreen.com', {
      company_name: 'Test Restaurant',
      industry: 'restaurant'
    });

    console.log('\n📊 BENCHMARK DATA CHECK:\n');

    if (result.matched_benchmark) {
      console.log('✅ matched_benchmark EXISTS!');
      console.log(`   Name: ${result.matched_benchmark.company_name}`);
      console.log(`   URL: ${result.matched_benchmark.website_url}`);
      console.log(`   Industry: ${result.matched_benchmark.industry}`);
      console.log(`   Tier: ${result.matched_benchmark.tier}`);
      console.log(`   Match Score: ${result.matched_benchmark.match_score}%`);
      console.log(`   Overall Score: ${result.matched_benchmark.scores.overall}/100`);
      console.log(`   Grade: ${result.matched_benchmark.scores.grade}`);
      console.log(`   Has design_strengths: ${result.matched_benchmark.design_strengths ? 'YES' : 'NO'}`);
      console.log(`   Has seo_strengths: ${result.matched_benchmark.seo_strengths ? 'YES' : 'NO'}`);
      console.log(`   Has content_strengths: ${result.matched_benchmark.content_strengths ? 'YES' : 'NO'}`);
      console.log('\n✅ FIX VERIFIED - Benchmark data flows to final result!');
    } else {
      console.log('❌ matched_benchmark is null or undefined');
      console.log('❌ FIX FAILED - Benchmark data still not flowing through');
    }

    console.log('\n===================================================================');
    console.log('✅ TEST COMPLETE\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runTest();
