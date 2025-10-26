/**
 * Test Benchmark Context Integration
 *
 * Tests that target analysis receives benchmark data and uses it for comparisons
 */

import { analyzeWebsiteIntelligent } from '../orchestrator-refactored.js';

// Enable benchmark context for this test
process.env.USE_BENCHMARK_CONTEXT = 'true';
process.env.USE_AI_GRADING = 'true';

console.log('🧪 BENCHMARK CONTEXT INTEGRATION TEST\n');
console.log('═══════════════════════════════════════════════════════════');
console.log('Testing benchmark-driven analysis with USE_BENCHMARK_CONTEXT=true\n');

const TEST_URL = 'https://httpbin.org'; // Simple test site
const TEST_COMPANY = 'Test Company';
const TEST_INDUSTRY = 'test';

async function runTest() {
  try {
    console.log(`📊 Analyzing target: ${TEST_URL}`);
    console.log(`   Company: ${TEST_COMPANY}`);
    console.log(`   Industry: ${TEST_INDUSTRY}`);
    console.log(`   USE_BENCHMARK_CONTEXT: ${process.env.USE_BENCHMARK_CONTEXT}`);
    console.log(`   USE_AI_GRADING: ${process.env.USE_AI_GRADING}\n`);

    const startTime = Date.now();

    const result = await analyzeWebsiteIntelligent(TEST_URL, {
      company_name: TEST_COMPANY,
      industry: TEST_INDUSTRY
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`\n✅ Analysis complete in ${duration}s\n`);
    console.log('═══════════════════════════════════════════════════════════');
    console.log('BENCHMARK CONTEXT VERIFICATION\n');

    // Check if benchmark was matched
    if (result.matched_benchmark) {
      console.log(`✅ Benchmark matched: ${result.matched_benchmark.company_name}`);
      console.log(`   URL: ${result.matched_benchmark.website_url}`);
      console.log(`   Tier: ${result.matched_benchmark.tier}`);
      console.log(`   Match reasoning: ${result.matched_benchmark.match_reasoning?.substring(0, 100)}...`);

      // Check if benchmark strengths exist
      const strengthFields = [
        'design_strengths',
        'seo_strengths',
        'content_strengths',
        'social_strengths',
        'accessibility_strengths'
      ];

      console.log('\n📐 Benchmark Strength Data:');
      strengthFields.forEach(field => {
        const data = result.matched_benchmark[field];
        const status = data && Object.keys(data).length > 0 ? '✅' : '❌';
        console.log(`   ${status} ${field}: ${data ? Object.keys(data).length + ' keys' : 'null'}`);
      });

    } else {
      console.log(`❌ No benchmark matched (expected for test industry)`);
      console.log(`   This is normal - no benchmarks exist for "${TEST_INDUSTRY}" industry`);
    }

    // Check grades and scores
    console.log('\n📊 Analysis Results:');
    console.log(`   Overall Grade: ${result.grade || result.website_grade}`);
    console.log(`   Overall Score: ${result.overall_score}`);
    console.log(`   Design Score: ${result.design_score}`);
    console.log(`   SEO Score: ${result.seo_score}`);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ TEST COMPLETE');
    console.log('\nNext Steps:');
    console.log('1. Add real benchmarks for common industries (restaurant, plumber, etc.)');
    console.log('2. Test with target in same industry as benchmark');
    console.log('3. Verify concrete comparisons appear in analysis issues');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runTest();
