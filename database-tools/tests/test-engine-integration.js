/**
 * Engine Integration Tests for BackupManager
 *
 * Tests that both Prospecting Engine and Analysis Engine are properly
 * integrated with the centralized BackupManager.
 *
 * Test Coverage:
 * - Prospecting Engine integration (5 tests)
 * - Analysis Engine integration (5 tests)
 * - Cross-engine consistency (3 tests)
 *
 * Run: node database-tools/tests/test-engine-integration.js
 */

import { existsSync } from 'fs';
import { readdir, readFile, rm } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Import engine-specific wrappers
import * as prospectingBackup from '../../prospecting-engine/utils/local-backup.js';
import * as analysisBackup from '../../analysis-engine/utils/local-backup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..');

// Test utilities
let testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

function logTest(testName, passed, error = null) {
  if (passed) {
    console.log(`✅ ${testName}`);
    testResults.passed++;
  } else {
    console.log(`❌ ${testName}`);
    testResults.failed++;
    if (error) {
      testResults.errors.push({ test: testName, error: error.message || error });
    }
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// Cleanup test backups
async function cleanupTestBackups() {
  const testDirs = [
    join(projectRoot, 'local-backups', 'prospecting-engine'),
    join(projectRoot, 'local-backups', 'analysis-engine')
  ];

  for (const dir of testDirs) {
    if (existsSync(dir)) {
      await rm(dir, { recursive: true, force: true });
    }
  }
}

// ============================================================================
// PROSPECTING ENGINE INTEGRATION TESTS (5 tests)
// ============================================================================

async function testProspectingEngineSaveBackup() {
  const testName = 'Test 1: Prospecting Engine - saveLocalBackup saves prospect';

  try {
    const mockProspect = {
      company_name: 'Test Cafe',
      industry: 'restaurant',
      city: 'Austin',
      state: 'TX',
      website: 'https://testcafe.com',
      contact_phone: '555-1234',
      google_place_id: 'ChIJtest123',
      google_rating: 4.5,
      source: 'google_maps'
    };

    const backupPath = await prospectingBackup.saveLocalBackup(mockProspect);

    assert(backupPath, 'Backup path should be returned');
    assert(existsSync(backupPath), 'Backup file should exist');

    // Verify file content
    const content = await readFile(backupPath, 'utf-8');
    const backup = JSON.parse(content);

    assert(backup.data, 'Backup should contain data object');
    assert(backup.company_name === 'Test Cafe', 'Backup should contain company_name metadata');
    assert(backup.industry === 'restaurant', 'Backup should contain industry metadata');
    assert(backup.uploaded_to_db === false, 'Backup should not be marked as uploaded');
    assert(backup.upload_status === 'pending', 'Backup status should be pending');

    logTest(testName, true);
    return backupPath;
  } catch (error) {
    logTest(testName, false, error);
    return null;
  }
}

async function testProspectingEngineMarkAsUploaded() {
  const testName = 'Test 2: Prospecting Engine - markAsUploaded updates backup file';

  try {
    // First create a backup
    const mockProspect = {
      company_name: 'Upload Test Restaurant',
      industry: 'restaurant',
      website: 'https://uploadtest.com'
    };

    const backupPath = await prospectingBackup.saveLocalBackup(mockProspect);
    assert(backupPath, 'Backup should be created');

    // Mark as uploaded
    const mockDbId = 'db123-456-789';
    await prospectingBackup.markAsUploaded(backupPath, mockDbId);

    // Verify update
    const content = await readFile(backupPath, 'utf-8');
    const backup = JSON.parse(content);

    assert(backup.uploaded_to_db === true, 'Backup should be marked as uploaded');
    assert(backup.upload_status === 'uploaded', 'Upload status should be updated');
    assert(backup.database_id === mockDbId, 'Database ID should be recorded');
    assert(backup.uploaded_at, 'Uploaded timestamp should be set');

    logTest(testName, true);
  } catch (error) {
    logTest(testName, false, error);
  }
}

async function testProspectingEngineMarkAsFailed() {
  const testName = 'Test 3: Prospecting Engine - markAsFailed moves to failed-uploads/';

  try {
    // Create a backup
    const mockProspect = {
      company_name: 'Failed Upload Test',
      industry: 'retail',
      website: 'https://failedtest.com'
    };

    const backupPath = await prospectingBackup.saveLocalBackup(mockProspect);
    assert(backupPath, 'Backup should be created');

    // Mark as failed
    const errorMessage = 'Database connection timeout';
    const failedPath = await prospectingBackup.markAsFailed(backupPath, errorMessage);

    assert(failedPath, 'Failed path should be returned');
    assert(existsSync(failedPath), 'Failed backup file should exist');
    assert(failedPath.includes('failed-uploads'), 'File should be in failed-uploads directory');

    // Verify failed file content
    const content = await readFile(failedPath, 'utf-8');
    const backup = JSON.parse(content);

    assert(backup.upload_failed === true, 'Backup should be marked as failed');
    assert(backup.upload_status === 'failed', 'Upload status should be failed');
    assert(backup.upload_error === errorMessage, 'Error message should be recorded');
    assert(backup.failed_at, 'Failed timestamp should be set');

    logTest(testName, true);
  } catch (error) {
    logTest(testName, false, error);
  }
}

async function testProspectingEngineGetBackupStats() {
  const testName = 'Test 4: Prospecting Engine - getBackupStats returns counts';

  try {
    // Create multiple backups in different states
    const mockProspect1 = {
      company_name: 'Stats Test 1',
      industry: 'restaurant'
    };
    const backupPath1 = await prospectingBackup.saveLocalBackup(mockProspect1);

    const mockProspect2 = {
      company_name: 'Stats Test 2',
      industry: 'retail'
    };
    const backupPath2 = await prospectingBackup.saveLocalBackup(mockProspect2);

    // Mark one as uploaded
    await prospectingBackup.markAsUploaded(backupPath1, 'db-test-id');

    // Get stats
    const stats = await prospectingBackup.getBackupStats();

    assert(stats, 'Stats should be returned');
    assert(stats.total_backups >= 2, 'Total backups should be at least 2');
    assert(stats.uploaded >= 1, 'At least 1 backup should be uploaded');
    assert(stats.pending_upload >= 1, 'At least 1 backup should be pending');
    assert('success_rate' in stats, 'Success rate should be calculated');
    assert(stats.backup_dir, 'Backup directory path should be returned');
    assert(stats.failed_dir, 'Failed directory path should be returned');

    logTest(testName, true);
  } catch (error) {
    logTest(testName, false, error);
  }
}

async function testProspectingEngineDirectoryStructure() {
  const testName = 'Test 5: Prospecting Engine - Verify directory structure';

  try {
    const expectedDirs = [
      join(projectRoot, 'local-backups', 'prospecting-engine', 'prospects'),
      join(projectRoot, 'local-backups', 'prospecting-engine', 'failed-uploads')
    ];

    for (const dir of expectedDirs) {
      assert(existsSync(dir), `Directory should exist: ${dir}`);
    }

    // Verify getBackupDir() returns correct path
    const backupDir = prospectingBackup.getBackupDir();
    assert(backupDir.includes('prospecting-engine'), 'Backup dir should include engine name');
    assert(backupDir.includes('prospects'), 'Backup dir should include prospects subdirectory');

    // Verify getFailedDir() returns correct path
    const failedDir = prospectingBackup.getFailedDir();
    assert(failedDir.includes('prospecting-engine'), 'Failed dir should include engine name');
    assert(failedDir.includes('failed-uploads'), 'Failed dir should include failed-uploads subdirectory');

    logTest(testName, true);
  } catch (error) {
    logTest(testName, false, error);
  }
}

// ============================================================================
// ANALYSIS ENGINE INTEGRATION TESTS (5 tests)
// ============================================================================

async function testAnalysisEngineSaveBackup() {
  const testName = 'Test 6: Analysis Engine - saveLocalBackup saves lead with analysis';

  try {
    const mockAnalysisResult = {
      overall_score: 75,
      grade: 'B',
      design_score: 80,
      seo_score: 70,
      content_score: 75,
      social_score: 65,
      design_issues: ['Mobile navigation unclear', 'Color contrast issues'],
      quick_wins: ['Add meta descriptions', 'Optimize images'],
      top_issue: 'Mobile navigation unclear',
      one_liner: 'Good design but needs mobile optimization'
    };

    const mockLeadData = {
      company_name: 'Test Company LLC',
      url: 'https://testcompany.com',
      website_grade: 'B',
      overall_score: 75,
      design_score: 80,
      seo_score: 70,
      content_score: 75,
      social_score: 65,
      quick_wins: ['Add meta descriptions', 'Optimize images'],
      top_issue: 'Mobile navigation unclear',
      industry: 'technology',
      city: 'San Francisco',
      has_https: true,
      is_mobile_friendly: false,
      has_blog: true
    };

    const backupPath = await analysisBackup.saveLocalBackup(mockAnalysisResult, mockLeadData);

    assert(backupPath, 'Backup path should be returned');
    assert(existsSync(backupPath), 'Backup file should exist');

    // Verify file content
    const content = await readFile(backupPath, 'utf-8');
    const backup = JSON.parse(content);

    assert(backup.data, 'Backup should contain data object');
    assert(backup.data.analysis_result, 'Backup should contain analysis_result');
    assert(backup.data.lead_data, 'Backup should contain lead_data');
    assert(backup.company_name === 'Test Company LLC', 'Backup should contain company_name metadata');
    assert(backup.grade === 'B', 'Backup should contain grade metadata');
    assert(backup.overall_score === 75, 'Backup should contain overall_score metadata');
    assert(backup.uploaded_to_db === false, 'Backup should not be marked as uploaded');
    assert(backup.upload_status === 'pending', 'Backup status should be pending');

    logTest(testName, true);
    return backupPath;
  } catch (error) {
    logTest(testName, false, error);
    return null;
  }
}

async function testAnalysisEngineMarkAsUploaded() {
  const testName = 'Test 7: Analysis Engine - markAsUploaded works';

  try {
    // First create a backup
    const mockAnalysisResult = { overall_score: 85, grade: 'A' };
    const mockLeadData = {
      company_name: 'Upload Test Company',
      url: 'https://uploadtest.com',
      website_grade: 'A',
      overall_score: 85
    };

    const backupPath = await analysisBackup.saveLocalBackup(mockAnalysisResult, mockLeadData);
    assert(backupPath, 'Backup should be created');

    // Mark as uploaded
    const mockDbId = 'lead-db-123-456';
    await analysisBackup.markAsUploaded(backupPath, mockDbId);

    // Verify update
    const content = await readFile(backupPath, 'utf-8');
    const backup = JSON.parse(content);

    assert(backup.uploaded_to_db === true, 'Backup should be marked as uploaded');
    assert(backup.upload_status === 'uploaded', 'Upload status should be updated');
    assert(backup.database_id === mockDbId, 'Database ID should be recorded');
    assert(backup.uploaded_at, 'Uploaded timestamp should be set');

    logTest(testName, true);
  } catch (error) {
    logTest(testName, false, error);
  }
}

async function testAnalysisEngineMarkAsFailed() {
  const testName = 'Test 8: Analysis Engine - markAsFailed moves to failed-uploads/';

  try {
    // Create a backup
    const mockAnalysisResult = { overall_score: 60, grade: 'C' };
    const mockLeadData = {
      company_name: 'Failed Analysis Test',
      url: 'https://failedanalysis.com',
      website_grade: 'C',
      overall_score: 60
    };

    const backupPath = await analysisBackup.saveLocalBackup(mockAnalysisResult, mockLeadData);
    assert(backupPath, 'Backup should be created');

    // Mark as failed
    const errorMessage = 'Supabase insert error: duplicate key';
    const failedPath = await analysisBackup.markAsFailed(backupPath, errorMessage);

    assert(failedPath, 'Failed path should be returned');
    assert(existsSync(failedPath), 'Failed backup file should exist');
    assert(failedPath.includes('failed-uploads'), 'File should be in failed-uploads directory');

    // Verify failed file content
    const content = await readFile(failedPath, 'utf-8');
    const backup = JSON.parse(content);

    assert(backup.upload_failed === true, 'Backup should be marked as failed');
    assert(backup.upload_status === 'failed', 'Upload status should be failed');
    assert(backup.upload_error === errorMessage, 'Error message should be recorded');
    assert(backup.failed_at, 'Failed timestamp should be set');

    logTest(testName, true);
  } catch (error) {
    logTest(testName, false, error);
  }
}

async function testAnalysisEngineGetBackupStats() {
  const testName = 'Test 9: Analysis Engine - getBackupStats returns counts';

  try {
    // Create multiple backups in different states
    const mockAnalysis1 = { overall_score: 90, grade: 'A' };
    const mockLead1 = {
      company_name: 'Stats Lead 1',
      url: 'https://stats1.com',
      website_grade: 'A',
      overall_score: 90
    };
    const backupPath1 = await analysisBackup.saveLocalBackup(mockAnalysis1, mockLead1);

    const mockAnalysis2 = { overall_score: 55, grade: 'C' };
    const mockLead2 = {
      company_name: 'Stats Lead 2',
      url: 'https://stats2.com',
      website_grade: 'C',
      overall_score: 55
    };
    const backupPath2 = await analysisBackup.saveLocalBackup(mockAnalysis2, mockLead2);

    // Mark one as uploaded
    await analysisBackup.markAsUploaded(backupPath1, 'lead-db-test-id');

    // Get stats
    const stats = await analysisBackup.getBackupStats();

    assert(stats, 'Stats should be returned');
    assert(stats.total_backups >= 2, 'Total backups should be at least 2');
    assert(stats.uploaded >= 1, 'At least 1 backup should be uploaded');
    assert(stats.pending_upload >= 1, 'At least 1 backup should be pending');
    assert('success_rate' in stats, 'Success rate should be calculated');
    assert(stats.backup_dir, 'Backup directory path should be returned');
    assert(stats.failed_dir, 'Failed directory path should be returned');

    logTest(testName, true);
  } catch (error) {
    logTest(testName, false, error);
  }
}

async function testAnalysisEngineDirectoryStructure() {
  const testName = 'Test 10: Analysis Engine - Verify directory structure';

  try {
    const expectedDirs = [
      join(projectRoot, 'local-backups', 'analysis-engine', 'leads'),
      join(projectRoot, 'local-backups', 'analysis-engine', 'failed-uploads')
    ];

    for (const dir of expectedDirs) {
      assert(existsSync(dir), `Directory should exist: ${dir}`);
    }

    // Verify getBackupDir() returns correct path
    const backupDir = analysisBackup.getBackupDir();
    assert(backupDir.includes('analysis-engine'), 'Backup dir should include engine name');
    assert(backupDir.includes('leads'), 'Backup dir should include leads subdirectory');

    // Verify getFailedDir() returns correct path
    const failedDir = analysisBackup.getFailedDir();
    assert(failedDir.includes('analysis-engine'), 'Failed dir should include engine name');
    assert(failedDir.includes('failed-uploads'), 'Failed dir should include failed-uploads subdirectory');

    logTest(testName, true);
  } catch (error) {
    logTest(testName, false, error);
  }
}

// ============================================================================
// CROSS-ENGINE CONSISTENCY TESTS (3 tests)
// ============================================================================

async function testBothEnginesCoexist() {
  const testName = 'Test 11: Both engines can coexist without conflicts';

  try {
    // Create backups for both engines simultaneously
    const mockProspect = {
      company_name: 'Coexist Test Restaurant',
      industry: 'restaurant'
    };
    const prospectBackupPath = await prospectingBackup.saveLocalBackup(mockProspect);

    const mockAnalysis = { overall_score: 80, grade: 'B' };
    const mockLead = {
      company_name: 'Coexist Test Company',
      url: 'https://coexist.com',
      website_grade: 'B',
      overall_score: 80
    };
    const leadBackupPath = await analysisBackup.saveLocalBackup(mockAnalysis, mockLead);

    // Both should succeed
    assert(prospectBackupPath, 'Prospect backup should be created');
    assert(leadBackupPath, 'Lead backup should be created');
    assert(existsSync(prospectBackupPath), 'Prospect backup file should exist');
    assert(existsSync(leadBackupPath), 'Lead backup file should exist');

    // Verify they're in different directories
    assert(prospectBackupPath.includes('prospecting-engine'), 'Prospect should be in prospecting-engine dir');
    assert(leadBackupPath.includes('analysis-engine'), 'Lead should be in analysis-engine dir');
    assert(!prospectBackupPath.includes('analysis-engine'), 'Prospect should NOT be in analysis-engine dir');
    assert(!leadBackupPath.includes('prospecting-engine'), 'Lead should NOT be in prospecting-engine dir');

    // Get stats from both engines
    const prospectStats = await prospectingBackup.getBackupStats();
    const leadStats = await analysisBackup.getBackupStats();

    assert(prospectStats, 'Prospect stats should be returned');
    assert(leadStats, 'Lead stats should be returned');
    assert(prospectStats.total_backups > 0, 'Prospect stats should show backups');
    assert(leadStats.total_backups > 0, 'Lead stats should show backups');

    logTest(testName, true);
  } catch (error) {
    logTest(testName, false, error);
  }
}

async function testSameBackupFormatStructure() {
  const testName = 'Test 12: Both engines use the same backup format structure';

  try {
    // Create backup for each engine
    const mockProspect = {
      company_name: 'Format Test Restaurant',
      industry: 'restaurant'
    };
    const prospectBackupPath = await prospectingBackup.saveLocalBackup(mockProspect);

    const mockAnalysis = { overall_score: 75, grade: 'B' };
    const mockLead = {
      company_name: 'Format Test Company',
      url: 'https://formattest.com',
      website_grade: 'B',
      overall_score: 75
    };
    const leadBackupPath = await analysisBackup.saveLocalBackup(mockAnalysis, mockLead);

    // Read both backup files
    const prospectContent = await readFile(prospectBackupPath, 'utf-8');
    const prospectBackup = JSON.parse(prospectContent);

    const leadContent = await readFile(leadBackupPath, 'utf-8');
    const leadBackup = JSON.parse(leadContent);

    // Verify they have the same core structure
    const coreFields = ['saved_at', 'data', 'uploaded_to_db', 'upload_status'];

    for (const field of coreFields) {
      assert(field in prospectBackup, `Prospect backup should have ${field} field`);
      assert(field in leadBackup, `Lead backup should have ${field} field`);
    }

    // Verify they have the same upload_status values
    assert(prospectBackup.upload_status === 'pending', 'Prospect upload_status should be pending');
    assert(leadBackup.upload_status === 'pending', 'Lead upload_status should be pending');

    // Verify they both have data objects
    assert(typeof prospectBackup.data === 'object', 'Prospect data should be an object');
    assert(typeof leadBackup.data === 'object', 'Lead data should be an object');

    logTest(testName, true);
  } catch (error) {
    logTest(testName, false, error);
  }
}

async function testProperDirectoryStructureCreation() {
  const testName = 'Test 13: Both engines create proper directory structures';

  try {
    const backupRoot = join(projectRoot, 'local-backups');
    assert(existsSync(backupRoot), 'Root backup directory should exist');

    // Check prospecting-engine directories
    const prospectingEngineDir = join(backupRoot, 'prospecting-engine');
    const prospectsDir = join(prospectingEngineDir, 'prospects');
    const prospectingFailedDir = join(prospectingEngineDir, 'failed-uploads');

    assert(existsSync(prospectingEngineDir), 'Prospecting engine directory should exist');
    assert(existsSync(prospectsDir), 'Prospects directory should exist');
    assert(existsSync(prospectingFailedDir), 'Prospecting failed-uploads directory should exist');

    // Check analysis-engine directories
    const analysisEngineDir = join(backupRoot, 'analysis-engine');
    const leadsDir = join(analysisEngineDir, 'leads');
    const analysisFailedDir = join(analysisEngineDir, 'failed-uploads');

    assert(existsSync(analysisEngineDir), 'Analysis engine directory should exist');
    assert(existsSync(leadsDir), 'Leads directory should exist');
    assert(existsSync(analysisFailedDir), 'Analysis failed-uploads directory should exist');

    // Verify that each engine has its own failed-uploads directory
    assert(prospectingFailedDir !== analysisFailedDir, 'Each engine should have separate failed-uploads dirs');

    // Check that backups are in correct directories
    const prospectFiles = await readdir(prospectsDir);
    const leadFiles = await readdir(leadsDir);

    assert(prospectFiles.length > 0, 'Prospects directory should contain files');
    assert(leadFiles.length > 0, 'Leads directory should contain files');

    logTest(testName, true);
  } catch (error) {
    logTest(testName, false, error);
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  ENGINE INTEGRATION TESTS                                      ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  // Clean up old test data
  await cleanupTestBackups();

  console.log('Prospecting Engine Integration:');
  await testProspectingEngineSaveBackup();
  await testProspectingEngineMarkAsUploaded();
  await testProspectingEngineMarkAsFailed();
  await testProspectingEngineGetBackupStats();
  await testProspectingEngineDirectoryStructure();

  console.log('\nAnalysis Engine Integration:');
  await testAnalysisEngineSaveBackup();
  await testAnalysisEngineMarkAsUploaded();
  await testAnalysisEngineMarkAsFailed();
  await testAnalysisEngineGetBackupStats();
  await testAnalysisEngineDirectoryStructure();

  console.log('\nCross-Engine Tests:');
  await testBothEnginesCoexist();
  await testSameBackupFormatStructure();
  await testProperDirectoryStructureCreation();

  // Print results
  console.log('\n═══════════════════════════════════════════════════════════════');
  const totalTests = testResults.passed + testResults.failed;
  const successRate = totalTests > 0 ? ((testResults.passed / totalTests) * 100).toFixed(1) : '0.0';
  console.log(`RESULTS: ${testResults.passed}/${totalTests} tests passed (${successRate}%)`);

  if (testResults.failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    testResults.errors.forEach(({ test, error }) => {
      console.log(`   ${test}`);
      console.log(`   Error: ${error}`);
    });
  }

  console.log('═══════════════════════════════════════════════════════════════\n');

  // Cleanup after tests
  console.log('Cleaning up test backups...');
  await cleanupTestBackups();
  console.log('✓ Cleanup complete\n');

  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});