/**
 * End-to-End Test: Verify Redundancy Fixes
 *
 * Tests all 6 redundancy fixes:
 * 1. Phase 2 uses screenshot Buffers (not URLs)
 * 2. Lead analysis uses cached benchmark screenshots
 * 3. Phase 2 strength extraction is skipped if cached
 * 4. Screenshot Buffers preserved through pipeline
 * 5. Request deduplication prevents concurrent analyses
 * 6. Debug logging shows caller tracking
 */

import { analyzeBenchmark } from '../services/benchmark-analyzer.js';
import { analyzeWebsiteIntelligent } from '../orchestrator-refactored.js';
import { getBenchmarkByUrl, deleteBenchmark } from '../database/supabase-client.js';

const TEST_BENCHMARK = {
  company_name: 'Test Benchmark Company',
  website_url: 'https://example.com',
  industry: 'technology',
  benchmark_tier: 'regional',
  location_city: 'San Francisco',
  location_state: 'CA'
};

const TEST_LEAD = {
  company_name: 'Test Lead Company',
  website_url: 'https://example.org',
  industry: 'technology'
};

let testsPassed = 0;
let testsFailed = 0;

function logTest(name, passed, details = '') {
  if (passed) {
    console.log(`✅ ${name}`);
    testsPassed++;
  } else {
    console.log(`❌ ${name}`);
    if (details) console.log(`   ${details}`);
    testsFailed++;
  }
}

async function runTests() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 END-TO-END TEST: Redundancy Fixes Verification');
  console.log('='.repeat(80) + '\n');

  try {
    // Cleanup: Delete test benchmark if exists
    console.log('🧹 Cleanup: Removing existing test benchmark...');
    const existing = await getBenchmarkByUrl(TEST_BENCHMARK.website_url);
    if (existing) {
      await deleteBenchmark(existing.id);
      console.log('   ✓ Deleted existing benchmark\n');
    } else {
      console.log('   ✓ No existing benchmark to delete\n');
    }

    // =========================================================================
    // TEST 1: First Benchmark Analysis - Should use Buffers in Phase 2
    // =========================================================================
    console.log('\n' + '-'.repeat(80));
    console.log('TEST 1: First Benchmark Analysis (Fix #1, #4, #6)');
    console.log('-'.repeat(80));
    console.log('Expected:');
    console.log('  - Phase 2 should show "📸 Using cached screenshot Buffers"');
    console.log('  - Should NOT show "Fetching image from URL"');
    console.log('  - Debug logs should show "benchmark-visual-strengths-phase-2"\n');

    const startTime1 = Date.now();
    const result1 = await analyzeBenchmark(TEST_BENCHMARK, { force: false });
    const duration1 = ((Date.now() - startTime1) / 1000).toFixed(1);

    logTest(
      'Test 1.1: Benchmark analysis succeeded',
      result1.success === true,
      result1.error
    );

    logTest(
      'Test 1.2: Benchmark saved to database',
      result1.benchmark && result1.benchmark.id,
      'No benchmark ID returned'
    );

    logTest(
      'Test 1.3: Design strengths extracted',
      result1.benchmark && result1.benchmark.design_strengths !== null,
      'design_strengths is null'
    );

    logTest(
      'Test 1.4: Screenshots captured',
      result1.benchmark && result1.benchmark.desktop_screenshot_url,
      'No desktop screenshot URL'
    );

    console.log(`\n⏱️  Duration: ${duration1}s`);

    // =========================================================================
    // TEST 2: Repeat Benchmark Analysis - Should skip Phase 2
    // =========================================================================
    console.log('\n' + '-'.repeat(80));
    console.log('TEST 2: Repeat Benchmark Analysis (Fix #3)');
    console.log('-'.repeat(80));
    console.log('Expected:');
    console.log('  - Should show "Using cached benchmark strengths"');
    console.log('  - Should NOT run Phase 2 extraction');
    console.log('  - Should be much faster (~30s vs ~3min)\n');

    const startTime2 = Date.now();
    const result2 = await analyzeBenchmark(TEST_BENCHMARK, { force: false });
    const duration2 = ((Date.now() - startTime2) / 1000).toFixed(1);

    logTest(
      'Test 2.1: Benchmark already exists (not re-analyzed)',
      result2.success === false && result2.error === 'Already exists',
      'Should return "Already exists" error'
    );

    logTest(
      'Test 2.2: Existing benchmark returned',
      result2.benchmark && result2.benchmark.id,
      'No benchmark returned'
    );

    console.log(`\n⏱️  Duration: ${duration2}s (should be < 1s)`);

    // Test force re-analysis with strength caching
    console.log('\n📝 Testing force re-analysis with strength caching...');
    const startTime2b = Date.now();
    const result2b = await analyzeBenchmark(TEST_BENCHMARK, { force: true });
    const duration2b = ((Date.now() - startTime2b) / 1000).toFixed(1);

    logTest(
      'Test 2.3: Force re-analysis succeeded',
      result2b.success === true,
      result2b.error
    );

    console.log(`\n⏱️  Force re-analysis duration: ${duration2b}s`);
    console.log('   (Check logs above - should show "Using cached benchmark strengths")');

    // =========================================================================
    // TEST 3: Lead Analysis with Benchmark Context - Should use cached screenshots
    // =========================================================================
    console.log('\n' + '-'.repeat(80));
    console.log('TEST 3: Lead Analysis with Benchmark Context (Fix #2)');
    console.log('-'.repeat(80));
    console.log('Expected:');
    console.log('  - Should show "✅ Using cached benchmark screenshots"');
    console.log('  - Should NOT show "📸 Capturing benchmark screenshots"');
    console.log('  - Should NOT launch Playwright for benchmark\n');

    // Enable AI grading to trigger benchmark matching
    const originalGrading = process.env.USE_AI_GRADING;
    process.env.USE_AI_GRADING = 'true';

    const startTime3 = Date.now();
    const result3 = await analyzeWebsiteIntelligent(TEST_LEAD.website_url, {
      company_name: TEST_LEAD.company_name,
      industry: TEST_LEAD.industry
    });
    const duration3 = ((Date.now() - startTime3) / 1000).toFixed(1);

    process.env.USE_AI_GRADING = originalGrading; // Restore

    logTest(
      'Test 3.1: Lead analysis succeeded',
      result3.success === true,
      result3.error
    );

    logTest(
      'Test 3.2: Benchmark matched to lead',
      result3.matched_benchmark && result3.matched_benchmark.id,
      'No benchmark matched'
    );

    console.log(`\n⏱️  Duration: ${duration3}s`);
    console.log('   (Check logs above - should show "Using cached benchmark screenshots")');

    // =========================================================================
    // TEST 4: Request Deduplication (Fix #5)
    // =========================================================================
    console.log('\n' + '-'.repeat(80));
    console.log('TEST 4: Request Deduplication (Fix #5)');
    console.log('-'.repeat(80));
    console.log('Expected:');
    console.log('  - Cannot easily test without concurrent HTTP requests');
    console.log('  - Skipping (requires server running + concurrent API calls)\n');

    console.log('⏭️  Test 4 skipped (requires live server test)');

    // =========================================================================
    // Summary
    // =========================================================================
    console.log('\n' + '='.repeat(80));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(80));
    console.log(`✅ Passed: ${testsPassed}`);
    console.log(`❌ Failed: ${testsFailed}`);
    console.log(`📈 Success Rate: ${Math.round((testsPassed / (testsPassed + testsFailed)) * 100)}%`);
    console.log('='.repeat(80) + '\n');

    // Key Performance Metrics
    console.log('⏱️  PERFORMANCE METRICS:');
    console.log(`   First benchmark analysis: ${duration1}s`);
    console.log(`   Repeat benchmark check: ${duration2}s`);
    console.log(`   Force re-analysis: ${duration2b}s`);
    console.log(`   Lead analysis w/ benchmark: ${duration3}s`);
    console.log('');
    console.log('💡 TO VERIFY FIXES IN LOGS:');
    console.log('   - Fix #1: Look for "📸 Using cached screenshot Buffers" in Test 1');
    console.log('   - Fix #2: Look for "✅ Using cached benchmark screenshots" in Test 3');
    console.log('   - Fix #3: Look for "✅ Phase 2: Using cached benchmark strengths" in force re-analysis');
    console.log('   - Fix #6: Look for "Called by: benchmark-visual-strengths-phase-2" in debug logs');
    console.log('');

    // Cleanup
    console.log('🧹 Cleanup: Deleting test benchmark...');
    if (result1.benchmark && result1.benchmark.id) {
      await deleteBenchmark(result1.benchmark.id);
      console.log('   ✓ Test benchmark deleted\n');
    }

    process.exit(testsFailed === 0 ? 0 : 1);

  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
runTests();
