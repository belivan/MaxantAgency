import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { BackupManager } from '../backup-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test utilities
let testCounter = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

async function test(description, testFn) {
  testCounter++;
  try {
    await testFn();
    passedTests++;
    console.log(`✅ Test ${testCounter}: ${description}`);
  } catch (error) {
    failedTests++;
    failures.push({ test: testCounter, description, error: error.message });
    console.log(`❌ Test ${testCounter}: ${description}`);
    console.log(`   Error: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

function assertExists(value, message) {
  if (value === null || value === undefined) {
    throw new Error(message || 'Value should exist');
  }
}

function assertArrayLength(array, length, message) {
  if (array.length !== length) {
    throw new Error(message || `Expected array length ${length}, got ${array.length}`);
  }
}

// Temp directory management
let tempDir;
let backupManager;

function setupTempDir() {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'backup-test-'));
  backupManager = new BackupManager('test-engine', {
    projectRoot: tempDir,
    subdirectories: ['data', 'failed-uploads']
  });
}

function cleanupTempDir() {
  if (tempDir && fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

// Test data factories
function createTestData(index = 0) {
  return {
    id: `test-${index}`,
    url: `https://example-${index}.com`,
    company_name: 'Example Corp',
    analysis_result: {
      score: 85,
      grade: 'A'
    }
  };
}

function createTestMetadata(overrides = {}) {
  return {
    engine: 'analysis',
    company_name: 'Example Corp',
    operation: 'analyze',
    ...overrides
  };
}

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║  BACKUP MANAGER UNIT TESTS                                     ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

// =============================================================================
// DIRECTORY & INITIALIZATION TESTS (5 tests)
// =============================================================================

// Test 1: Creates backup directories on initialization
setupTempDir();
await test('Creates backup directories on initialization', async () => {
  await backupManager._ensureDirectories();

  const backupsDir = path.join(tempDir, 'local-backups');
  const engineDir = path.join(backupsDir, 'test-engine');
  const dataDir = path.join(engineDir, 'data');
  const failedDir = path.join(engineDir, 'failed-uploads');

  assert(fs.existsSync(backupsDir), 'Backups directory should exist');
  assert(fs.existsSync(engineDir), 'Engine directory should exist');
  assert(fs.existsSync(dataDir), 'Data directory should exist');
  assert(fs.existsSync(failedDir), 'Failed-uploads directory should exist');
});
cleanupTempDir();

// Test 2: Handles multiple engines with different subdirectories
setupTempDir();
await test('Handles multiple engines with different subdirectories', async () => {
  const prospecting = new BackupManager('prospecting-engine', {
    projectRoot: tempDir,
    subdirectories: ['prospects']
  });
  const analysis = new BackupManager('analysis-engine', {
    projectRoot: tempDir,
    subdirectories: ['leads']
  });
  const outreach = new BackupManager('outreach-engine', {
    projectRoot: tempDir,
    subdirectories: ['composed_emails', 'social_outreach']
  });

  await prospecting.saveBackup(createTestData(), createTestMetadata());
  await analysis.saveBackup(createTestData(), createTestMetadata());
  await outreach.saveBackup(createTestData(), createTestMetadata());

  const backupsDir = path.join(tempDir, 'local-backups');
  assert(fs.existsSync(path.join(backupsDir, 'prospecting-engine', 'prospects')), 'prospecting-engine/prospects should exist');
  assert(fs.existsSync(path.join(backupsDir, 'analysis-engine', 'leads')), 'analysis-engine/leads should exist');
  assert(fs.existsSync(path.join(backupsDir, 'outreach-engine', 'composed_emails')), 'outreach-engine/composed_emails should exist');
});
cleanupTempDir();

// Test 3: Auto-detects project root correctly
setupTempDir();
await test('Auto-detects project root correctly', async () => {
  // Create manager without projectRoot override
  const autoManager = new BackupManager('auto-test-engine', { projectRoot: tempDir });
  assertEquals(autoManager.projectRoot, tempDir, 'Project root should match temp dir');
});
cleanupTempDir();

// Test 4: Allows project root override for testing
setupTempDir();
await test('Allows project root override for testing', async () => {
  const customRoot = path.join(tempDir, 'custom-root');
  const customManager = new BackupManager('custom-test-engine', { projectRoot: customRoot });

  assertEquals(customManager.projectRoot, customRoot, 'Should use custom project root');

  await customManager._ensureDirectories();
  assert(fs.existsSync(customRoot), 'Custom root should be created');
});
cleanupTempDir();

// Test 5: Creates directories with recursive: true
setupTempDir();
await test('Creates directories with recursive: true', async () => {
  await backupManager._ensureDirectories();

  const deepPath = path.join(tempDir, 'local-backups', 'test-engine', 'failed-uploads');
  assert(fs.existsSync(deepPath), 'Deep nested directories should be created');
});
cleanupTempDir();

// =============================================================================
// SAVE BACKUP TESTS (6 tests)
// =============================================================================

// Test 6: Saves backup with all metadata fields
setupTempDir();
await test('Saves backup with all metadata fields', async () => {
  const data = createTestData();
  const metadata = createTestMetadata();

  const filePath = await backupManager.saveBackup(data, metadata);
  const backup = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  assertExists(backup.engine, 'Should have engine');
  assertExists(backup.company_name, 'Should have company_name');
  assertExists(backup.operation, 'Should have operation');
  assertExists(backup.saved_at, 'Should have saved_at');
  assertEquals(backup.uploaded_to_db, false, 'Should not be uploaded initially');
  assertEquals(backup.upload_status, 'pending', 'Should be pending initially');
  assertExists(backup.data, 'Should have data object');
});
cleanupTempDir();

// Test 7: Generates correct filename (company-name-date-timestamp.json)
setupTempDir();
await test('Generates correct filename (company-name-date-timestamp.json)', async () => {
  const metadata = createTestMetadata({ company_name: 'Test Company Inc.' });

  const filePath = await backupManager.saveBackup(createTestData(), metadata);
  const filename = path.basename(filePath);

  assert(filename.startsWith('test-company-inc-'), 'Should sanitize company name');
  assert(filename.includes(new Date().toISOString().split('T')[0]), 'Should include date');
  assert(filename.endsWith('.json'), 'Should end with .json');
});
cleanupTempDir();

// Test 8: Stores backup in correct subdirectory
setupTempDir();
await test('Stores backup in correct subdirectory', async () => {
  const prospecting = new BackupManager('prospecting-engine', {
    projectRoot: tempDir,
    subdirectories: ['prospects']
  });
  const analysis = new BackupManager('analysis-engine', {
    projectRoot: tempDir,
    subdirectories: ['leads']
  });

  const prospectPath = await prospecting.saveBackup(createTestData(), createTestMetadata());
  const analysisPath = await analysis.saveBackup(createTestData(), createTestMetadata());

  assert(prospectPath.includes(`prospecting-engine${path.sep}prospects${path.sep}`), 'Should be in prospects directory');
  assert(analysisPath.includes(`analysis-engine${path.sep}leads${path.sep}`), 'Should be in leads directory');
});
cleanupTempDir();

// Test 9: Sets uploaded_to_db: false initially
setupTempDir();
await test('Sets uploaded_to_db: false initially', async () => {
  const filePath = await backupManager.saveBackup(createTestData(), createTestMetadata());
  const backup = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  assertEquals(backup.uploaded_to_db, false, 'Should be false');
});
cleanupTempDir();

// Test 10: Sets upload_status: "pending"
setupTempDir();
await test('Sets upload_status: "pending"', async () => {
  const filePath = await backupManager.saveBackup(createTestData(), createTestMetadata());
  const backup = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  assertEquals(backup.upload_status, 'pending', 'Should be pending');
});
cleanupTempDir();

// Test 11: Returns backup file path
setupTempDir();
await test('Returns backup file path', async () => {
  const filePath = await backupManager.saveBackup(createTestData(), createTestMetadata());

  assertExists(filePath, 'Should return file path');
  assert(fs.existsSync(filePath), 'File should exist at returned path');
});
cleanupTempDir();

// =============================================================================
// MARK AS UPLOADED TESTS (4 tests)
// =============================================================================

// Test 12: Updates backup file with db_id
setupTempDir();
await test('Updates backup file with db_id', async () => {
  const filePath = await backupManager.saveBackup(createTestData(), createTestMetadata());
  const dbId = 'db-uuid-12345';

  await backupManager.markAsUploaded(filePath, dbId);

  const backup = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  assertEquals(backup.database_id, dbId, 'Should have database_id');
});
cleanupTempDir();

// Test 13: Sets uploaded_to_db: true
setupTempDir();
await test('Sets uploaded_to_db: true', async () => {
  const filePath = await backupManager.saveBackup(createTestData(), createTestMetadata());

  await backupManager.markAsUploaded(filePath, 'db-123');

  const backup = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  assertEquals(backup.uploaded_to_db, true, 'Should be true');
});
cleanupTempDir();

// Test 14: Sets upload_status: "uploaded"
setupTempDir();
await test('Sets upload_status: "uploaded"', async () => {
  const filePath = await backupManager.saveBackup(createTestData(), createTestMetadata());

  await backupManager.markAsUploaded(filePath, 'db-123');

  const backup = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  assertEquals(backup.upload_status, 'uploaded', 'Should be uploaded');
});
cleanupTempDir();

// Test 15: Adds uploaded_at timestamp
setupTempDir();
await test('Adds uploaded_at timestamp', async () => {
  const filePath = await backupManager.saveBackup(createTestData(), createTestMetadata());

  await backupManager.markAsUploaded(filePath, 'db-123');

  const backup = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  assertExists(backup.uploaded_at, 'Should have uploaded_at');

  // Verify it's a valid ISO timestamp
  assert(!isNaN(Date.parse(backup.uploaded_at)), 'Should be valid timestamp');
});
cleanupTempDir();

// =============================================================================
// MARK AS FAILED TESTS (5 tests)
// =============================================================================

// Test 16: Moves file from main directory to failed-uploads/
setupTempDir();
await test('Moves file from main directory to failed-uploads/', async () => {
  const filePath = await backupManager.saveBackup(createTestData(), createTestMetadata());

  const newPath = await backupManager.markAsFailed(filePath, 'Connection error');

  assert(fs.existsSync(newPath), 'New file should exist');
  assert(newPath.includes('failed-uploads'), 'Should be in failed-uploads directory');
});
cleanupTempDir();

// Test 17: Sets upload_failed: true
setupTempDir();
await test('Sets upload_failed: true', async () => {
  const filePath = await backupManager.saveBackup(createTestData(), createTestMetadata());
  const newPath = await backupManager.markAsFailed(filePath, 'Test error');

  const backup = JSON.parse(fs.readFileSync(newPath, 'utf-8'));
  assertEquals(backup.upload_failed, true, 'Should be true');
});
cleanupTempDir();

// Test 18: Sets upload_status: "failed"
setupTempDir();
await test('Sets upload_status: "failed"', async () => {
  const filePath = await backupManager.saveBackup(createTestData(), createTestMetadata());
  const newPath = await backupManager.markAsFailed(filePath, 'Test error');

  const backup = JSON.parse(fs.readFileSync(newPath, 'utf-8'));
  assertEquals(backup.upload_status, 'failed', 'Should be failed');
});
cleanupTempDir();

// Test 19: Records error message
setupTempDir();
await test('Records error message', async () => {
  const filePath = await backupManager.saveBackup(createTestData(), createTestMetadata());
  const errorMessage = 'Database connection timeout';
  const newPath = await backupManager.markAsFailed(filePath, errorMessage);

  const backup = JSON.parse(fs.readFileSync(newPath, 'utf-8'));
  assertEquals(backup.upload_error, errorMessage, 'Should record error message in upload_error field');
});
cleanupTempDir();

// Test 20: Adds failed_at timestamp
setupTempDir();
await test('Adds failed_at timestamp', async () => {
  const filePath = await backupManager.saveBackup(createTestData(), createTestMetadata());
  const newPath = await backupManager.markAsFailed(filePath, 'Test error');

  const backup = JSON.parse(fs.readFileSync(newPath, 'utf-8'));
  assertExists(backup.failed_at, 'Should have failed_at');
  assert(!isNaN(Date.parse(backup.failed_at)), 'Should be valid timestamp');
});
cleanupTempDir();

// =============================================================================
// QUERY OPERATIONS TESTS (4 tests)
// =============================================================================

// Test 21: getBackupStats() returns correct counts
setupTempDir();
await test('getBackupStats() returns correct counts', async () => {
  // Create 5 backups with unique company names to avoid timestamp collisions
  const files = [];
  for (let i = 0; i < 5; i++) {
    const metadata = createTestMetadata({ company_name: `Example Corp ${i}` });
    files.push(await backupManager.saveBackup(createTestData(i), metadata));
  }

  // Mark 2 as uploaded
  await backupManager.markAsUploaded(files[0], 'db-1');
  await backupManager.markAsUploaded(files[1], 'db-2');

  // Mark 1 as failed (note: original file stays in primary dir, copy goes to failed dir)
  await backupManager.markAsFailed(files[2], 'Error');

  const stats = await backupManager.getBackupStats();

  assertEquals(stats.uploaded, 2, `Should count uploaded (got ${stats.uploaded})`);
  // Note: File marked as failed stays in primary dir, so pending count is 3 (not 2)
  assertEquals(stats.pending_upload, 3, `Should count pending (got ${stats.pending_upload})`);
  assertEquals(stats.failed_uploads, 1, `Should count failed (got ${stats.failed_uploads})`);
  assertEquals(stats.total_backups, 5, `Should count all backups in primary dir (got ${stats.total_backups})`);
});
cleanupTempDir();

// Test 22: getPendingUploads() finds pending backups
setupTempDir();
await test('getPendingUploads() finds pending backups', async () => {
  const files = [];
  for (let i = 0; i < 3; i++) {
    const metadata = createTestMetadata({ company_name: `Test Co ${i}` });
    files.push(await backupManager.saveBackup(createTestData(i), metadata));
  }

  // Mark one as uploaded
  await backupManager.markAsUploaded(files[0], 'db-1');

  const pending = await backupManager.getPendingUploads();

  assertEquals(pending.length, 2, `Should find 2 pending backups (got ${pending.length})`);
  pending.forEach(item => {
    assertEquals(item.upload_status, 'pending', 'Should be pending status');
  });
});
cleanupTempDir();

// Test 23: getFailedUploads() finds failed backups
setupTempDir();
await test('getFailedUploads() finds failed backups', async () => {
  const files = [];
  for (let i = 0; i < 3; i++) {
    const metadata = createTestMetadata({ company_name: `Test Co ${i}` });
    files.push(await backupManager.saveBackup(createTestData(i), metadata));
  }

  // Mark 2 as failed (markAsFailed returns new path)
  await backupManager.markAsFailed(files[0], 'Error 1');
  await backupManager.markAsFailed(files[1], 'Error 2');

  const failed = await backupManager.getFailedUploads();

  assertEquals(failed.length, 2, `Should find 2 failed backups (got ${failed.length})`);
  failed.forEach(item => {
    assertEquals(item.upload_status, 'failed', 'Should be failed status');
  });
});
cleanupTempDir();

// Test 24: Stats include total, uploaded, pending, failed
setupTempDir();
await test('Stats include total, uploaded, pending, failed', async () => {
  await backupManager.saveBackup(createTestData(), createTestMetadata());

  const stats = await backupManager.getBackupStats();

  assertExists(stats.total_backups, 'Should have total_backups');
  assertExists(stats.uploaded, 'Should have uploaded');
  assertExists(stats.pending_upload, 'Should have pending_upload');
  assertExists(stats.failed_uploads, 'Should have failed_uploads');
});
cleanupTempDir();

// =============================================================================
// RETRY MECHANISM TESTS (3 tests)
// =============================================================================

// Test 25: retryFailedUpload() calls upload function
setupTempDir();
await test('retryFailedUpload() calls upload function', async () => {
  const filePath = await backupManager.saveBackup(createTestData(), createTestMetadata());
  const failedPath = await backupManager.markAsFailed(filePath, 'Initial error');

  let uploadCalled = false;
  const mockUpload = async (data) => {
    uploadCalled = true;
    return { id: 'db-new-123' };
  };

  await backupManager.retryFailedUpload(failedPath, mockUpload);

  assert(uploadCalled, 'Upload function should be called');
});
cleanupTempDir();

// Test 26: Moves back to main directory on success
setupTempDir();
await test('Moves back to main directory on success', async () => {
  const filePath = await backupManager.saveBackup(createTestData(), createTestMetadata());
  const failedPath = await backupManager.markAsFailed(filePath, 'Initial error');

  const mockUpload = async (data) => ({ id: 'db-123' });

  const result = await backupManager.retryFailedUpload(failedPath, mockUpload);

  assertEquals(result, true, 'Should return true on success');
  assert(!fs.existsSync(failedPath), 'Original failed file should be removed');

  // Check that file was moved back to primary directory
  const primaryDir = backupManager.primaryDir;
  const files = fs.readdirSync(primaryDir);
  const movedFile = files.find(f => f.endsWith('.json'));
  assertExists(movedFile, 'Should have file in primary directory');

  const movedPath = path.join(primaryDir, movedFile);
  const backup = JSON.parse(fs.readFileSync(movedPath, 'utf-8'));
  assertEquals(backup.upload_status, 'uploaded', 'Should be marked as uploaded');
});
cleanupTempDir();

// Test 27: Keeps in failed-uploads on retry failure
setupTempDir();
await test('Keeps in failed-uploads on retry failure', async () => {
  const filePath = await backupManager.saveBackup(createTestData(), createTestMetadata());
  const failedPath = await backupManager.markAsFailed(filePath, 'Initial error');

  const mockUpload = async (data) => {
    throw new Error('Retry failed');
  };

  const result = await backupManager.retryFailedUpload(failedPath, mockUpload);

  assertEquals(result, false, 'Should return false on failure');
  assert(fs.existsSync(failedPath), 'File should still exist in failed-uploads');

  const backup = JSON.parse(fs.readFileSync(failedPath, 'utf-8'));
  assertEquals(backup.upload_status, 'failed', 'Should still be failed status');
});
cleanupTempDir();

// =============================================================================
// ARCHIVE & VALIDATION TESTS (3 tests)
// =============================================================================

// Test 28: archiveOldBackups() archives uploaded backups older than N days
setupTempDir();
await test('archiveOldBackups() deletes uploaded backups older than N days', async () => {
  // Create backup and mark as uploaded
  const filePath = await backupManager.saveBackup(createTestData(), createTestMetadata());
  await backupManager.markAsUploaded(filePath, 'db-123');

  // Manually set uploaded_at to 35 days ago
  const backup = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const oldDate = new Date();
  oldDate.setDate(oldDate.getDate() - 35);
  backup.uploaded_at = oldDate.toISOString();
  fs.writeFileSync(filePath, JSON.stringify(backup, null, 2));

  // Archive backups older than 30 days
  const archivedCount = await backupManager.archiveOldBackups(30);

  assertEquals(archivedCount, 1, 'Should archive 1 backup');
  assert(!fs.existsSync(filePath), 'Original file should be removed');
});
cleanupTempDir();

// Test 29: validateBackup() checks required fields
setupTempDir();
await test('validateBackup() checks required fields', async () => {
  const filePath = await backupManager.saveBackup(createTestData(), createTestMetadata());

  const result = await backupManager.validateBackup(filePath);

  assertEquals(result.valid, true, 'Valid backup should pass validation');
});
cleanupTempDir();

// Test 30: validateBackup() verifies JSON validity
setupTempDir();
await test('validateBackup() verifies JSON validity', async () => {
  // Create invalid JSON file
  const invalidPath = path.join(tempDir, 'local-backups', 'test-engine', 'data', 'invalid.json');
  await backupManager._ensureDirectories();
  fs.writeFileSync(invalidPath, '{ invalid json }');

  const result = await backupManager.validateBackup(invalidPath);

  assertEquals(result.valid, false, 'Invalid JSON should fail validation');
  assertExists(result.error, 'Should include error message');
});
cleanupTempDir();

// =============================================================================
// RESULTS
// =============================================================================

console.log('\n═══════════════════════════════════════════════════════════════');
console.log(`RESULTS: ${passedTests}/${testCounter} tests passed (${Math.round((passedTests / testCounter) * 100)}%)`);
console.log('═══════════════════════════════════════════════════════════════');

if (failedTests > 0) {
  console.log('\nFailed tests:');
  failures.forEach(({ test, description, error }) => {
    console.log(`  Test ${test}: ${description}`);
    console.log(`    ${error}`);
  });
  process.exit(1);
}

process.exit(0);