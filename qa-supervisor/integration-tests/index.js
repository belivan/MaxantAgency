/**
 * Integration Tests Runner
 *
 * Runs all cross-agent integration tests
 */

import { testProspectToLead } from './test-prospect-to-lead.js';
import { testLeadToEmail } from './test-lead-to-email.js';
import { testFullPipeline } from './test-full-pipeline.js';
import logger from '../shared/logger.js';

/**
 * Run all integration tests
 */
export async function runIntegrationTests() {
  logger.header('🔗 INTEGRATION TESTS');

  const results = {
    tests: [],
    passed: 0,
    failed: 0,
    skipped: 0
  };

  // Test 1: Agent 1 → Agent 2
  logger.section('Test 1: Agent 1 → Agent 2');
  const test1 = await testProspectToLead();
  results.tests.push({ name: 'Agent 1 → Agent 2', ...test1 });

  if (test1.skipped) {
    results.skipped++;
  } else if (test1.passed) {
    results.passed++;
  } else {
    results.failed++;
  }

  logger.separator();

  // Test 2: Agent 2 → Agent 3
  logger.section('Test 2: Agent 2 → Agent 3');
  const test2 = await testLeadToEmail();
  results.tests.push({ name: 'Agent 2 → Agent 3', ...test2 });

  if (test2.skipped) {
    results.skipped++;
  } else if (test2.passed) {
    results.passed++;
  } else {
    results.failed++;
  }

  logger.separator();

  // Test 3: Full pipeline
  logger.section('Test 3: Full Pipeline');
  const test3 = await testFullPipeline();
  results.tests.push({ name: 'Full Pipeline', ...test3 });

  if (test3.fatal) {
    results.failed++;
  } else {
    // Count pipeline test results
    const pipelinePassed = test3.tests?.filter(t => t.passed).length || 0;
    const pipelineFailed = test3.tests?.filter(t => !t.passed && !t.skipped).length || 0;

    // Already counted in individual tests, so don't double count
  }

  // Final summary
  console.log('\n' + '═'.repeat(67));
  logger.section('INTEGRATION TEST SUMMARY');

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
        console.log(`  ❌ ${test.name}: ${test.error}`);
      }
    }
  }

  if (results.skipped > 0) {
    console.log('\nSkipped Tests:');
    for (const test of results.tests) {
      if (test.skipped) {
        console.log(`  ⚠️  ${test.name}: ${test.error}`);
      }
    }
  }

  logger.separator();

  return results;
}

export default {
  runIntegrationTests
};
