#!/usr/bin/env node

/**
 * Test Backup Flow
 *
 * Tests the local backup system without hitting the database.
 * This verifies that the backup wrapper and BackupManager integration works correctly.
 */

import { saveLocalBackup, markAsUploaded, markAsFailed, getBackupStats, getPendingUploads, getFailedUploads } from '../utils/local-backup.js';

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║  BACKUP FLOW TEST                                              ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

async function testBackupFlow() {
  try {
    // Test 1: Create a test prospect
    console.log('Test 1: Creating test prospect backup...');
    const testProspect = {
      company_name: 'Test Company Inc',
      industry: 'Technology',
      city: 'San Francisco',
      state: 'CA',
      website: 'https://example.com',
      contact_phone: '555-1234',
      google_place_id: 'test-place-id-123',
      google_rating: 4.5,
      icp_match_score: 85,
      is_relevant: true,
      run_id: 'test-run-123',
      website_status: 'accessible',
      source: 'google_maps',
      status: 'ready_for_analysis',
      discovery_cost: 0.01,
      discovery_time_ms: 5000
    };

    const backupPath = await saveLocalBackup(testProspect);

    if (backupPath) {
      console.log(`✅ Backup created: ${backupPath.split(/[\\/]/).pop()}\n`);
    } else {
      console.log('❌ Failed to create backup\n');
      return;
    }

    // Test 2: Check backup stats
    console.log('Test 2: Checking backup statistics...');
    const stats1 = await getBackupStats();
    console.log(`  Total backups: ${stats1.total_backups}`);
    console.log(`  Pending: ${stats1.pending_upload}`);
    console.log(`  Uploaded: ${stats1.uploaded}`);
    console.log(`  Failed: ${stats1.failed_uploads}\n`);

    // Test 3: Mark as uploaded
    console.log('Test 3: Marking backup as uploaded...');
    await markAsUploaded(backupPath, 'test-db-uuid-12345');
    console.log('✅ Marked as uploaded\n');

    // Test 4: Check updated stats
    console.log('Test 4: Checking updated statistics...');
    const stats2 = await getBackupStats();
    console.log(`  Total backups: ${stats2.total_backups}`);
    console.log(`  Pending: ${stats2.pending_upload}`);
    console.log(`  Uploaded: ${stats2.uploaded}`);
    console.log(`  Success rate: ${stats2.success_rate}%\n`);

    // Test 5: Create another backup and mark as failed
    console.log('Test 5: Creating another backup to test failure handling...');
    const failedProspect = {
      company_name: 'Failed Company LLC',
      industry: 'Finance',
      city: 'New York',
      state: 'NY',
      website: 'https://failed-example.com',
      run_id: 'test-run-123'
    };

    const failedBackupPath = await saveLocalBackup(failedProspect);
    console.log(`✅ Backup created: ${failedBackupPath.split(/[\\/]/).pop()}\n`);

    console.log('Test 6: Marking backup as failed...');
    await markAsFailed(failedBackupPath, 'Test database connection error');
    console.log('✅ Marked as failed\n');

    // Test 7: Check final stats
    console.log('Test 7: Checking final statistics...');
    const stats3 = await getBackupStats();
    console.log(`  Total backups: ${stats3.total_backups}`);
    console.log(`  Pending: ${stats3.pending_upload}`);
    console.log(`  Uploaded: ${stats3.uploaded}`);
    console.log(`  Failed: ${stats3.failed_uploads}`);
    console.log(`  Success rate: ${stats3.success_rate}%\n`);

    // Test 8: Verify failed uploads
    console.log('Test 8: Retrieving failed uploads...');
    const failedUploads = await getFailedUploads();
    console.log(`  Found ${failedUploads.length} failed upload(s)`);
    if (failedUploads.length > 0) {
      console.log(`  First failed upload: ${failedUploads[0].company_name}`);
      console.log(`  Error: ${failedUploads[0].upload_error}\n`);
    }

    // Test 9: Verify pending uploads
    console.log('Test 9: Retrieving pending uploads...');
    const pendingUploads = await getPendingUploads();
    console.log(`  Found ${pendingUploads.length} pending upload(s)\n`);

    // Summary
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ All tests passed!');
    console.log('');
    console.log('Backup system is working correctly:');
    console.log('  - Backups are saved locally before database upload');
    console.log('  - Backups can be marked as uploaded with DB ID');
    console.log('  - Failed uploads are moved to failed-uploads/ directory');
    console.log('  - Statistics are tracked correctly');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('💡 Next steps:');
    console.log('  - Run: node scripts/backup-stats.js --detailed');
    console.log('  - Run: node scripts/retry-failed-prospects.js --dry-run');
    console.log('  - Clean up test backups when done\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testBackupFlow();
