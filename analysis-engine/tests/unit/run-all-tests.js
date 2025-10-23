/**
 * Test Runner: All Service Unit Tests
 * 
 * Runs all Phase 2 service unit tests and reports results.
 */

import { strict as assert } from 'assert';
import chalk from 'chalk';

// Import all test modules
const testFiles = [
  './test-discovery-service.js',
  './test-page-selection-service.js',
  './test-crawling-service.js',
  './test-analysis-coordinator.js',
  './test-results-aggregator.js'
];

async function runAllTests() {
  console.log(chalk.bold.cyan('\n🧪 PHASE 2 SERVICE UNIT TESTS\n'));
  console.log('='.repeat(60));

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    suites: []
  };

  for (const testFile of testFiles) {
    const suiteName = testFile.replace('./', '').replace('.js', '');
    console.log(chalk.bold(`\n📦 ${suiteName}\n`));

    try {
      // Dynamic import each test file
      const testModule = await import(testFile);
      
      // If the module exports a runTests function, call it
      if (typeof testModule.runTests === 'function') {
        const suiteResult = await testModule.runTests();
        results.suites.push({
          name: suiteName,
          ...suiteResult
        });
        results.total += suiteResult.total;
        results.passed += suiteResult.passed;
        results.failed += suiteResult.failed;
      } else {
        // Otherwise, just import it (tests will auto-run)
        console.log(chalk.yellow(`  ⚠️  Module doesn't export runTests function`));
      }
    } catch (error) {
      console.log(chalk.red(`  ❌ Failed to run test suite: ${error.message}`));
      results.failed++;
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log(chalk.bold.cyan('\n📊 TEST SUMMARY\n'));
  console.log('='.repeat(60));

  console.log(`Total tests: ${results.total}`);
  console.log(chalk.green(`Passed: ${results.passed} ✅`));
  if (results.failed > 0) {
    console.log(chalk.red(`Failed: ${results.failed} ❌`));
  } else {
    console.log(`Failed: ${results.failed}`);
  }

  const passRate = results.total > 0 
    ? ((results.passed / results.total) * 100).toFixed(1)
    : 0;

  console.log(`Pass rate: ${passRate}%`);

  console.log('\n' + '='.repeat(60));

  if (results.failed === 0) {
    console.log(chalk.bold.green('\n🎉 All tests passed! Services are ready for integration.\n'));
  } else {
    console.log(chalk.bold.red('\n⚠️  Some tests failed. Fix issues before deploying.\n'));
  }

  process.exit(results.failed > 0 ? 1 : 0);
}

// Run
runAllTests().catch(error => {
  console.error(chalk.red('\n❌ Test runner failed:', error.message));
  console.error(error);
  process.exit(1);
});
