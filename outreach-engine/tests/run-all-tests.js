#!/usr/bin/env node
/**
 * OUTREACH ENGINE - Master Test Runner
 *
 * Runs all test suites in sequence and reports results.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test suites in recommended order
const TEST_SUITES = [
  {
    name: 'Phase 1: Config System',
    file: 'test-prompt-loading.js',
    description: 'Prompt loading and template filling'
  },
  {
    name: 'Phase 1: Integration',
    file: 'test-phase1-integration.js',
    description: 'Full config system integration'
  },
  {
    name: 'Phase 2: Generators & Validators',
    file: 'test-phase2-integration.js',
    description: 'Email/social generation and validation'
  },
  {
    name: 'Phase 3: Database & Integrations',
    file: 'test-phase3-integration.js',
    description: 'Database, Notion, SMTP integration'
  },
  {
    name: 'API Endpoints',
    file: 'test-api-endpoints.js',
    description: 'Server API endpoints'
  }
];

// Quick tests (optional)
const QUICK_TESTS = [
  'test-batch-generation.js',
  'test-notion-sync.js',
  'test-validator.js'
];

async function runTest(testFile) {
  const testPath = join(__dirname, testFile);

  try {
    const { stdout, stderr } = await execAsync(`node "${testPath}"`, {
      cwd: join(__dirname, '..'),
      timeout: 60000 // 60 second timeout per test
    });

    return {
      success: true,
      output: stdout + stderr
    };
  } catch (error) {
    return {
      success: false,
      output: error.stdout + error.stderr,
      error: error.message
    };
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  OUTREACH ENGINE - MASTER TEST RUNNER');
  console.log('═══════════════════════════════════════════════════════\n');

  const startTime = Date.now();
  const results = [];

  // Run main test suites
  console.log('📋 Running Main Test Suites...\n');

  for (const suite of TEST_SUITES) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`🧪 ${suite.name}`);
    console.log(`   ${suite.description}`);
    console.log(`   File: ${suite.file}`);
    console.log(`${'─'.repeat(60)}\n`);

    const result = await runTest(suite.file);
    results.push({ ...suite, ...result });

    if (result.success) {
      console.log(result.output);
      console.log(`\n✅ ${suite.name} - PASSED\n`);
    } else {
      console.log(result.output);
      console.log(`\n❌ ${suite.name} - FAILED`);
      if (result.error) {
        console.log(`   Error: ${result.error}\n`);
      }
    }
  }

  // Summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════\n');

  results.forEach(result => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${status}  ${result.name}`);
  });

  console.log('\n' + '─'.repeat(60));
  console.log(`  Total: ${results.length} test suites`);
  console.log(`  Passed: ${passed} suites`);
  console.log(`  Failed: ${failed} suites`);
  console.log(`  Duration: ${duration}s`);
  console.log('─'.repeat(60));

  if (failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! 🎉\n');
    process.exit(0);
  } else {
    console.log(`\n⚠️  ${failed} test suite(s) failed\n`);
    console.log('Quick tests available:');
    QUICK_TESTS.forEach(test => console.log(`  - node tests/${test}`));
    console.log();
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Test runner failed:', error.message);
  process.exit(1);
});