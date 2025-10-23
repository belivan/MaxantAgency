#!/usr/bin/env node
/**
 * Master Test Script for Phase 2
 * 
 * Runs all Phase 2 tests in order:
 * 1. Unit tests for each service
 * 2. Integration test (E2E)
 * 3. Comparison test (old vs new)
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const testsDir = join(__dirname, 'tests');

async function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    console.log(chalk.cyan(`\n▶️  Running: ${command} ${args.join(' ')}\n`));
    
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: true
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function runTests() {
  console.log(chalk.bold.magenta('\n' + '='.repeat(60)));
  console.log(chalk.bold.magenta('  PHASE 2: ORCHESTRATOR REFACTORING - TEST SUITE'));
  console.log(chalk.bold.magenta('='.repeat(60) + '\n'));

  const results = {
    unit: null,
    e2e: null,
    comparison: null
  };

  // 1. Unit Tests
  console.log(chalk.bold.yellow('\n📦 STEP 1: Unit Tests\n'));
  console.log('Testing individual services in isolation...\n');
  
  try {
    await runCommand('node', ['unit/run-all-tests.js'], testsDir);
    results.unit = 'PASSED';
    console.log(chalk.green('\n✅ Unit tests passed!\n'));
  } catch (error) {
    results.unit = 'FAILED';
    console.log(chalk.red('\n❌ Unit tests failed!\n'));
    console.log(chalk.yellow('Fix unit test failures before proceeding.\n'));
    process.exit(1);
  }

  // 2. E2E Integration Test
  console.log(chalk.bold.yellow('\n🔗 STEP 2: End-to-End Integration Test\n'));
  console.log('Testing complete orchestrator flow with real website...\n');
  
  try {
    await runCommand('node', ['integration/test-e2e-orchestrator.js'], testsDir);
    results.e2e = 'PASSED';
    console.log(chalk.green('\n✅ E2E test passed!\n'));
  } catch (error) {
    results.e2e = 'FAILED';
    console.log(chalk.red('\n❌ E2E test failed!\n'));
    console.log(chalk.yellow('Review error logs above. Set TEST_URL in .env for better results.\n'));
    
    const continueAnyway = process.env.CONTINUE_ON_E2E_FAIL === 'true';
    if (!continueAnyway) {
      process.exit(1);
    } else {
      console.log(chalk.yellow('⚠️  Continuing anyway (CONTINUE_ON_E2E_FAIL=true)...\n'));
    }
  }

  // 3. Comparison Test (Optional)
  console.log(chalk.bold.yellow('\n⚖️  STEP 3: Old vs New Comparison Test\n'));
  console.log('Comparing refactored orchestrator against original...\n');
  console.log(chalk.gray('Note: This test requires real API calls and may take several minutes.\n'));
  
  const skipComparison = process.env.SKIP_COMPARISON === 'true';
  
  if (skipComparison) {
    results.comparison = 'SKIPPED';
    console.log(chalk.yellow('⏭️  Skipped (SKIP_COMPARISON=true)\n'));
  } else {
    try {
      await runCommand('node', ['test-orchestrator-comparison.js'], testsDir);
      results.comparison = 'PASSED';
      console.log(chalk.green('\n✅ Comparison test passed!\n'));
    } catch (error) {
      results.comparison = 'FAILED';
      console.log(chalk.red('\n❌ Comparison test failed!\n'));
      console.log(chalk.yellow('Review differences above. This may indicate behavioral changes.\n'));
      
      const continueAnyway = process.env.CONTINUE_ON_COMPARISON_FAIL === 'true';
      if (!continueAnyway) {
        process.exit(1);
      } else {
        console.log(chalk.yellow('⚠️  Continuing anyway (CONTINUE_ON_COMPARISON_FAIL=true)...\n'));
      }
    }
  }

  // Final Summary
  console.log(chalk.bold.magenta('\n' + '='.repeat(60)));
  console.log(chalk.bold.magenta('  TEST SUITE SUMMARY'));
  console.log(chalk.bold.magenta('='.repeat(60) + '\n'));

  console.log(`  Unit Tests:       ${results.unit === 'PASSED' ? chalk.green('✅ PASSED') : chalk.red('❌ FAILED')}`);
  console.log(`  E2E Test:         ${results.e2e === 'PASSED' ? chalk.green('✅ PASSED') : results.e2e === 'FAILED' ? chalk.red('❌ FAILED') : chalk.yellow('⏭️  SKIPPED')}`);
  console.log(`  Comparison Test:  ${results.comparison === 'PASSED' ? chalk.green('✅ PASSED') : results.comparison === 'FAILED' ? chalk.red('❌ FAILED') : chalk.yellow('⏭️  SKIPPED')}`);

  console.log('\n' + '='.repeat(60));

  const allPassed = results.unit === 'PASSED' && 
                    (results.e2e === 'PASSED' || results.e2e === 'SKIPPED') && 
                    (results.comparison === 'PASSED' || results.comparison === 'SKIPPED');

  if (allPassed) {
    console.log(chalk.bold.green('\n🎉 All tests passed! Refactored orchestrator is ready for deployment.\n'));
    console.log(chalk.cyan('Next steps:'));
    console.log(chalk.cyan('  1. Review PHASE-2-SUMMARY.md for deployment instructions'));
    console.log(chalk.cyan('  2. Consider running comparison test with real prospects'));
    console.log(chalk.cyan('  3. Deploy to staging for A/B testing\n'));
    process.exit(0);
  } else {
    console.log(chalk.bold.red('\n⚠️  Some tests failed. Fix issues before deploying.\n'));
    process.exit(1);
  }
}

// Run
runTests().catch(error => {
  console.error(chalk.red('\n❌ Test suite failed:', error.message));
  console.error(error);
  process.exit(1);
});
