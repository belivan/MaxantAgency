#!/usr/bin/env node

/**
 * Test Backup System
 *
 * This script tests the centralized BackupManager integration
 * in the Analysis Engine by running through a complete workflow.
 *
 * Tests:
 * 1. Save a test backup
 * 2. Mark as uploaded
 * 3. Get backup stats
 * 4. Get pending uploads
 * 5. Simulate failed upload
 * 6. Get failed uploads
 * 7. Cleanup test files
 */

import {
  saveLocalBackup,
  markAsUploaded,
  markAsFailed,
  getBackupStats,
  getPendingUploads,
  getFailedUploads,
  getBackupDir,
  getFailedDir,
  validateBackup,
  getConfig
} from '../utils/local-backup.js';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';

// Test data
const testAnalysisResult = {
  success: true,
  url: 'https://test-company.com',
  company_name: 'Test Company',
  industry: 'technology',
  grade: 'B',
  overall_score: 75,
  design_score: 70,
  seo_score: 80,
  content_score: 75,
  social_score: 70,
  design_issues: [
    { category: 'warning', title: 'Mobile responsiveness', description: 'Site could be more mobile-friendly' }
  ],
  seo_issues: [],
  content_issues: [],
  social_issues: [],
  quick_wins: [
    { title: 'Add meta description', impact: 'medium' }
  ],
  top_issue: 'Mobile responsiveness needs improvement',
  one_liner: 'Good foundation with room for mobile optimization',
  intelligent_analysis: {
    pages_discovered: 5,
    pages_crawled: 3
  }
};

const testLeadData = {
  url: 'https://test-company.com',
  company_name: 'Test Company',
  industry: 'technology',
  website_grade: 'B',
  overall_score: 75,
  design_score: 70,
  seo_score: 80,
  content_score: 75,
  social_score: 70,
  design_issues: testAnalysisResult.design_issues,
  seo_issues: [],
  content_issues: [],
  social_issues: [],
  quick_wins: testAnalysisResult.quick_wins,
  top_issue: testAnalysisResult.top_issue,
  one_liner: testAnalysisResult.one_liner,
  has_https: true,
  is_mobile_friendly: false,
  has_blog: true,
  project_id: null,
  prospect_id: null,
  city: null,
  desktop_visual_model: 'gpt-4o',
  mobile_visual_model: 'gpt-4o',
  seo_analysis_model: 'grok-beta',
  content_analysis_model: 'grok-beta',
  social_analysis_model: 'grok-beta',
  analysis_cost: 0.05,
  analysis_time: 12.5,
  analyzed_at: new Date().toISOString()
};

// Test results
const tests = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

// Test files to cleanup
const filesToCleanup = [];

/**
 * Run a test
 */
async function runTest(name, testFn) {
  tests.total++;
  console.log(`\n${tests.total}. Testing: ${name}`);

  try {
    await testFn();
    tests.passed++;
    console.log(`   ✅ PASSED`);
    tests.details.push({ name, passed: true });
  } catch (error) {
    tests.failed++;
    console.error(`   ❌ FAILED: ${error.message}`);
    tests.details.push({ name, passed: false, error: error.message });
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  BACKUP SYSTEM TEST SUITE                                      ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  let testBackupPath;
  let testFailedBackupPath;

  // TEST 1: Get configuration
  await runTest('Get BackupManager configuration', async () => {
    const config = getConfig();

    if (!config.engineName || config.engineName !== 'analysis-engine') {
      throw new Error('Invalid engine name in config');
    }

    if (!config.primaryDir || !config.primaryDir.includes('leads')) {
      throw new Error('Invalid primary directory in config');
    }

    console.log(`   Engine: ${config.engineName}`);
    console.log(`   Primary dir: ${config.primaryDir}`);
  });

  // TEST 2: Save local backup
  await runTest('Save local backup', async () => {
    testBackupPath = await saveLocalBackup(testAnalysisResult, testLeadData);

    if (!testBackupPath) {
      throw new Error('Backup path is null');
    }

    if (!existsSync(testBackupPath)) {
      throw new Error('Backup file was not created');
    }

    filesToCleanup.push(testBackupPath);
    console.log(`   Saved to: ${testBackupPath}`);
  });

  // TEST 3: Validate backup
  await runTest('Validate backup file', async () => {
    const validation = await validateBackup(testBackupPath);

    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.error}`);
    }

    if (!validation.backup) {
      throw new Error('Validation did not return backup data');
    }

    if (validation.backup.upload_status !== 'pending') {
      throw new Error(`Expected upload_status 'pending', got '${validation.backup.upload_status}'`);
    }

    console.log(`   Upload status: ${validation.backup.upload_status}`);
  });

  // TEST 4: Get backup stats
  await runTest('Get backup statistics', async () => {
    const stats = await getBackupStats();

    if (!stats) {
      throw new Error('Stats returned null');
    }

    if (stats.total_backups < 1) {
      throw new Error('Total backups should be at least 1');
    }

    console.log(`   Total backups: ${stats.total_backups}`);
    console.log(`   Pending: ${stats.pending_upload}`);
  });

  // TEST 5: Get pending uploads
  await runTest('Get pending uploads', async () => {
    const pending = await getPendingUploads();

    if (!Array.isArray(pending)) {
      throw new Error('Expected array of pending uploads');
    }

    const ourBackup = pending.find(p => p.company_name === 'Test Company');

    if (!ourBackup) {
      throw new Error('Could not find our test backup in pending uploads');
    }

    console.log(`   Found ${pending.length} pending upload(s)`);
  });

  // TEST 6: Mark as uploaded
  await runTest('Mark backup as uploaded', async () => {
    const fakeDbId = 'test-uuid-12345';
    await markAsUploaded(testBackupPath, fakeDbId);

    const validation = await validateBackup(testBackupPath);

    if (validation.backup.upload_status !== 'uploaded') {
      throw new Error(`Expected upload_status 'uploaded', got '${validation.backup.upload_status}'`);
    }

    if (validation.backup.database_id !== fakeDbId) {
      throw new Error('Database ID was not saved correctly');
    }

    console.log(`   Upload status: ${validation.backup.upload_status}`);
    console.log(`   Database ID: ${validation.backup.database_id}`);
  });

  // TEST 7: Save another backup for failed test
  await runTest('Save backup for failed upload test', async () => {
    testFailedBackupPath = await saveLocalBackup(testAnalysisResult, testLeadData);

    if (!testFailedBackupPath) {
      throw new Error('Backup path is null');
    }

    filesToCleanup.push(testFailedBackupPath);
    console.log(`   Saved to: ${testFailedBackupPath}`);
  });

  // TEST 8: Mark as failed
  await runTest('Mark backup as failed', async () => {
    const testError = 'Test database connection error';
    const failedPath = await markAsFailed(testFailedBackupPath, testError);

    if (!failedPath) {
      throw new Error('Failed path is null');
    }

    if (!existsSync(failedPath)) {
      throw new Error('Failed backup file was not created');
    }

    // Update cleanup path
    filesToCleanup.push(failedPath);
    const failedIndex = filesToCleanup.indexOf(testFailedBackupPath);
    if (failedIndex !== -1) {
      filesToCleanup.splice(failedIndex, 1);
    }

    const validation = await validateBackup(failedPath);

    if (validation.backup.upload_status !== 'failed') {
      throw new Error(`Expected upload_status 'failed', got '${validation.backup.upload_status}'`);
    }

    if (!validation.backup.upload_error || !validation.backup.upload_error.includes(testError)) {
      throw new Error('Error message was not saved correctly');
    }

    console.log(`   Upload status: ${validation.backup.upload_status}`);
    console.log(`   Error saved: ${validation.backup.upload_error}`);
  });

  // TEST 9: Get failed uploads
  await runTest('Get failed uploads', async () => {
    const failed = await getFailedUploads();

    if (!Array.isArray(failed)) {
      throw new Error('Expected array of failed uploads');
    }

    const ourBackup = failed.find(f => f.company_name === 'Test Company');

    if (!ourBackup) {
      throw new Error('Could not find our test backup in failed uploads');
    }

    console.log(`   Found ${failed.length} failed upload(s)`);
  });

  // TEST 10: Get directory paths
  await runTest('Get backup directory paths', async () => {
    const backupDir = getBackupDir();
    const failedDir = getFailedDir();

    if (!backupDir || !backupDir.includes('leads')) {
      throw new Error('Invalid backup directory path');
    }

    if (!failedDir || !failedDir.includes('failed-uploads')) {
      throw new Error('Invalid failed directory path');
    }

    console.log(`   Backup dir: ${backupDir}`);
    console.log(`   Failed dir: ${failedDir}`);
  });

  // CLEANUP: Remove test files
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('Cleaning up test files...\n');

  for (const filepath of filesToCleanup) {
    if (existsSync(filepath)) {
      try {
        await unlink(filepath);
        console.log(`   ✅ Deleted: ${filepath.split(/[\\/]/).pop()}`);
      } catch (error) {
        console.error(`   ❌ Failed to delete: ${filepath.split(/[\\/]/).pop()}`);
      }
    }
  }

  // SUMMARY
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log(`Total tests:  ${tests.total}`);
  console.log(`✅ Passed:    ${tests.passed}`);
  console.log(`❌ Failed:    ${tests.failed}`);

  const successRate = tests.total > 0
    ? ((tests.passed / tests.total) * 100).toFixed(1)
    : '0.0';
  console.log(`\nSuccess rate: ${successRate}%`);

  console.log('═══════════════════════════════════════════════════════════════\n');

  if (tests.failed > 0) {
    console.log('FAILED TESTS:\n');
    tests.details
      .filter(t => !t.passed)
      .forEach((test, index) => {
        console.log(`${index + 1}. ${test.name}`);
        console.log(`   Error: ${test.error}\n`);
      });
  }

  if (tests.passed === tests.total) {
    console.log('🎉 All tests passed!\n');
  } else {
    console.log(`⚠️  ${tests.failed} test(s) failed. See details above.\n`);
  }
}

// Run tests
runTests()
  .then(() => {
    const exitCode = tests.failed > 0 ? 1 : 0;
    process.exit(exitCode);
  })
  .catch((error) => {
    console.error('\n❌ FATAL ERROR:', error);
    process.exit(1);
  });
