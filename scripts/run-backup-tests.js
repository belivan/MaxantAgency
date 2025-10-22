#!/usr/bin/env node

/**
 * Automated Backup System Test Runner
 *
 * Runs all phases of the backup system testing plan in sequence.
 * Use this to validate the entire backup system end-to-end.
 *
 * Usage:
 *   node run-backup-tests.js                    # Run all phases
 *   node run-backup-tests.js --phase=1          # Run specific phase
 *   node run-backup-tests.js --skip-cleanup     # Skip cleanup phase
 *   node run-backup-tests.js --quick            # Run quick tests only (Phase 1 & 2)
 */

import { spawn } from 'child_process';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

// Parse CLI arguments
const args = process.argv.slice(2);
const phaseArg = args.find(arg => arg.startsWith('--phase='));
const targetPhase = phaseArg ? parseInt(phaseArg.split('=')[1]) : null;
const skipCleanup = args.includes('--skip-cleanup');
const quickMode = args.includes('--quick');

// Test results tracking
const results = {
  phases: [],
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  startTime: Date.now()
};

/**
 * Run a command and return exit code
 */
function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    });

    proc.on('close', (code) => {
      resolve(code);
    });

    proc.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Print phase header
 */
function printPhaseHeader(phaseNum, phaseName) {
  console.log('\n' + '═'.repeat(65));
  console.log(`${colors.bright}${colors.cyan}PHASE ${phaseNum}: ${phaseName}${colors.reset}`);
  console.log('═'.repeat(65) + '\n');
}

/**
 * Print test header
 */
function printTestHeader(testNum, testName) {
  console.log(`${colors.yellow}Test ${testNum}: ${testName}${colors.reset}`);
}

/**
 * Record test result
 */
function recordTestResult(phaseName, testName, passed, duration) {
  results.totalTests++;
  if (passed) {
    results.passedTests++;
    console.log(`${colors.green}✅ PASSED${colors.reset} (${duration}ms)\n`);
  } else {
    results.failedTests++;
    console.log(`${colors.red}❌ FAILED${colors.reset} (${duration}ms)\n`);
  }

  // Add to phase results
  let phase = results.phases.find(p => p.name === phaseName);
  if (!phase) {
    phase = { name: phaseName, tests: [] };
    results.phases.push(phase);
  }
  phase.tests.push({ name: testName, passed, duration });
}

/**
 * Print final summary
 */
function printSummary() {
  const totalDuration = Date.now() - results.startTime;

  console.log('\n' + '═'.repeat(65));
  console.log(`${colors.bright}TEST SUMMARY${colors.reset}`);
  console.log('═'.repeat(65));
  console.log(`Total Tests:   ${results.totalTests}`);
  console.log(`${colors.green}✅ Passed:     ${results.passedTests}${colors.reset}`);
  console.log(`${colors.red}❌ Failed:     ${results.failedTests}${colors.reset}`);
  console.log(`Duration:      ${(totalDuration / 1000).toFixed(1)}s`);

  const successRate = results.totalTests > 0
    ? ((results.passedTests / results.totalTests) * 100).toFixed(1)
    : 0;
  console.log(`Success Rate:  ${successRate}%`);
  console.log('═'.repeat(65) + '\n');

  // Print phase breakdown
  console.log('Phase Breakdown:');
  results.phases.forEach(phase => {
    const passed = phase.tests.filter(t => t.passed).length;
    const total = phase.tests.length;
    const rate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;
    console.log(`  ${phase.name}: ${passed}/${total} (${rate}%)`);
  });
  console.log();
}

/**
 * PHASE 1: Local Backup System
 */
async function runPhase1() {
  printPhaseHeader(1, 'Local Backup System (Isolated Testing)');

  // Test 1.1: Backup Creation
  printTestHeader('1.1', 'Backup Creation & Management');
  let startTime = Date.now();
  const code1 = await runCommand('node', ['prospecting-engine/scripts/test-backup-flow.js']);
  recordTestResult('Phase 1', 'Backup Creation & Management', code1 === 0, Date.now() - startTime);

  // Test 1.2: View backup stats
  printTestHeader('1.2', 'Backup Statistics');
  startTime = Date.now();
  const code2 = await runCommand('node', ['prospecting-engine/scripts/backup-stats.js', '--detailed']);
  recordTestResult('Phase 1', 'Backup Statistics', code2 === 0, Date.now() - startTime);

  return results.failedTests === 0;
}

/**
 * PHASE 2: Database Integration Testing
 */
async function runPhase2() {
  printPhaseHeader(2, 'Database Integration Testing');

  // Test 2.1: Database Connection Validation
  printTestHeader('2.1', 'Database Connection Validation');
  let startTime = Date.now();

  console.log('Checking environment variables...');
  const hasUrl = !!process.env.SUPABASE_URL;
  const hasKey = !!process.env.SUPABASE_SERVICE_KEY;

  if (!hasUrl || !hasKey) {
    console.log(`${colors.red}Missing environment variables!${colors.reset}`);
    console.log(`  SUPABASE_URL: ${hasUrl ? 'Set' : 'Missing'}`);
    console.log(`  SUPABASE_SERVICE_KEY: ${hasKey ? 'Set' : 'Missing'}`);
    recordTestResult('Phase 2', 'Database Connection Validation', false, Date.now() - startTime);
    return false;
  }

  console.log(`${colors.green}Environment variables found${colors.reset}`);
  recordTestResult('Phase 2', 'Database Connection Validation', true, Date.now() - startTime);

  // Test 2.2: Database Schema Validation
  printTestHeader('2.2', 'Database Schema Validation');
  startTime = Date.now();
  const code = await runCommand('npm', ['run', 'db:validate'], { cwd: 'database-tools' });
  recordTestResult('Phase 2', 'Database Schema Validation', code === 0, Date.now() - startTime);

  return results.failedTests === 0;
}

/**
 * PHASE 3: Retry Mechanism Testing
 */
async function runPhase3() {
  printPhaseHeader(3, 'Retry Mechanism Testing');

  // Test 3.1: Engine-Specific Retry (Dry Run)
  printTestHeader('3.1', 'Engine-Specific Retry (Dry Run)');
  let startTime = Date.now();
  const code1 = await runCommand('node', ['prospecting-engine/scripts/retry-failed-prospects.js', '--dry-run']);
  recordTestResult('Phase 3', 'Engine-Specific Retry (Dry Run)', code1 === 0, Date.now() - startTime);

  // Test 3.2: Centralized Retry (Dry Run)
  printTestHeader('3.2', 'Centralized Database-Tools Retry (Dry Run)');
  startTime = Date.now();
  const code2 = await runCommand('node', ['database-tools/scripts/retry-failed-uploads.js', '--engine', 'prospecting-engine', '--dry-run']);
  recordTestResult('Phase 3', 'Centralized Retry (Dry Run)', code2 === 0, Date.now() - startTime);

  return true;
}

/**
 * PHASE 4: Cleanup Testing
 */
async function runPhase4() {
  if (skipCleanup) {
    console.log(`${colors.yellow}Skipping Phase 4: Cleanup (--skip-cleanup flag)${colors.reset}\n`);
    return true;
  }

  printPhaseHeader(4, 'Cleanup Testing');

  // Test 4.1: Cleanup Preview
  printTestHeader('4.1', 'Cleanup Preview (Dry Run)');
  let startTime = Date.now();
  const code = await runCommand('node', ['prospecting-engine/scripts/cleanup-backups.js', '--dry-run']);
  recordTestResult('Phase 4', 'Cleanup Preview', code === 0, Date.now() - startTime);

  return true;
}

/**
 * PHASE 5: Cross-Engine Validation
 */
async function runPhase5() {
  printPhaseHeader(5, 'Cross-Engine Validation');

  // Test 5.1: Validate Existing Backups
  printTestHeader('5.1', 'Validate Existing Backups');
  let startTime = Date.now();
  const code = await runCommand('node', ['database-tools/scripts/validate-existing-backups.js']);
  recordTestResult('Phase 5', 'Validate Existing Backups', code === 0, Date.now() - startTime);

  return true;
}

/**
 * Final Cleanup
 */
async function cleanup() {
  if (skipCleanup) {
    console.log(`${colors.yellow}Skipping cleanup (--skip-cleanup flag)${colors.reset}\n`);
    return;
  }

  console.log(`${colors.cyan}Cleaning up test backups...${colors.reset}`);

  const backupDir = 'local-backups/prospecting-engine';
  if (existsSync(backupDir)) {
    rmSync(backupDir, { recursive: true, force: true });
    console.log(`${colors.green}✅ Test backups cleaned up${colors.reset}\n`);
  }
}

/**
 * Main test runner
 */
async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  BACKUP SYSTEM - AUTOMATED TEST RUNNER                        ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');

  if (targetPhase) {
    console.log(`\n${colors.cyan}Running Phase ${targetPhase} only${colors.reset}`);
  } else if (quickMode) {
    console.log(`\n${colors.cyan}Quick Mode: Running Phases 1 & 2 only${colors.reset}`);
  } else {
    console.log(`\n${colors.cyan}Running all test phases${colors.reset}`);
  }

  try {
    // Run phases
    if (!targetPhase || targetPhase === 1) {
      const success = await runPhase1();
      if (!success && !targetPhase) {
        console.log(`${colors.red}Phase 1 failed. Stopping tests.${colors.reset}\n`);
        printSummary();
        process.exit(1);
      }
    }

    if (quickMode) {
      if (!targetPhase || targetPhase === 2) {
        await runPhase2();
      }
    } else {
      if (!targetPhase || targetPhase === 2) {
        await runPhase2();
      }

      if (!targetPhase || targetPhase === 3) {
        await runPhase3();
      }

      if (!targetPhase || targetPhase === 4) {
        await runPhase4();
      }

      if (!targetPhase || targetPhase === 5) {
        await runPhase5();
      }
    }

    // Cleanup
    if (!targetPhase && !skipCleanup) {
      await cleanup();
    }

    // Print summary
    printSummary();

    // Exit with appropriate code
    if (results.failedTests > 0) {
      console.log(`${colors.red}⚠️  Some tests failed. See details above.${colors.reset}\n`);
      process.exit(1);
    } else {
      console.log(`${colors.green}✅ All tests passed!${colors.reset}\n`);
      process.exit(0);
    }

  } catch (error) {
    console.error(`\n${colors.red}❌ Test runner error:${colors.reset}`, error);
    process.exit(1);
  }
}

// Run the test suite
main();
