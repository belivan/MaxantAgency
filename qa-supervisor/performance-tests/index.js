/**
 * Performance Tests Runner
 *
 * Runs all performance and benchmark tests
 */

import { testProspectingSpeed } from './test-prospecting-speed.js';
import { testAnalysisSpeed } from './test-analysis-speed.js';
import { testCostTracking } from './test-cost-tracking.js';
import { testLoad } from './test-load.js';
import logger from '../shared/logger.js';

/**
 * Run all performance tests
 */
export async function runPerformanceTests() {
  logger.header('⚡ PERFORMANCE TESTS');

  const results = {
    tests: [],
    passed: 0,
    failed: 0,
    skipped: 0
  };

  // Test 1: Prospecting Speed
  logger.section('Test 1: Prospecting Speed');
  const test1 = await testProspectingSpeed();
  results.tests.push({ name: 'Prospecting Speed (20 in <3min)', ...test1 });

  if (test1.skipped) {
    results.skipped++;
  } else if (test1.passed) {
    results.passed++;
  } else {
    results.failed++;
  }

  logger.separator();

  // Test 2: Analysis Speed
  logger.section('Test 2: Analysis Speed');
  const test2 = await testAnalysisSpeed();
  results.tests.push({ name: 'Analysis Speed (10 in <5min)', ...test2 });

  if (test2.skipped) {
    results.skipped++;
  } else if (test2.passed) {
    results.passed++;
  } else {
    results.failed++;
  }

  logger.separator();

  // Test 3: Cost Tracking
  logger.section('Test 3: Cost Tracking');
  const test3 = await testCostTracking();
  results.tests.push({ name: 'Cost Tracking', ...test3 });

  if (test3.passed) {
    results.passed++;
  } else {
    results.failed++;
  }

  logger.separator();

  // Test 4: Load Test
  logger.section('Test 4: Load Test');
  const test4 = await testLoad();
  results.tests.push({ name: 'Load Test (100 leads)', ...test4 });

  if (test4.skipped) {
    results.skipped++;
  } else if (test4.passed) {
    results.passed++;
  } else {
    results.failed++;
  }

  // Final summary
  console.log('\n' + '═'.repeat(67));
  logger.section('PERFORMANCE TEST SUMMARY');

  const total = results.passed + results.failed + results.skipped;

  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⚠️  Skipped: ${results.skipped}`);

  console.log('═'.repeat(67));

  // Detailed results
  if (results.failed > 0) {
    console.log('\nFailed Tests:');
    for (const test of results.tests) {
      if (!test.passed && !test.skipped) {
        console.log(`  ❌ ${test.name}: ${test.error || 'Performance below target'}`);
      }
    }
  }

  if (results.skipped > 0) {
    console.log('\nSkipped Tests:');
    for (const test of results.tests) {
      if (test.skipped) {
        console.log(`  ⚠️  ${test.name}: ${test.error || test.message}`);
      }
    }
  }

  logger.separator();

  return results;
}

export default {
  runPerformanceTests
};
