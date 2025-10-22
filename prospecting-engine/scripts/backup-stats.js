#!/usr/bin/env node

/**
 * Backup Statistics Script
 *
 * Displays statistics about local prospect backups:
 * - Total backups
 * - Uploaded vs pending
 * - Failed uploads
 * - Success rate
 *
 * Usage:
 *   node scripts/backup-stats.js
 *   node scripts/backup-stats.js --detailed  # Show detailed file list
 */

import { getBackupStats, getPendingUploads, getFailedUploads, getConfig } from '../utils/local-backup.js';

// Parse command line arguments
const args = process.argv.slice(2);
const showDetailed = args.includes('--detailed');

/**
 * Main stats function
 */
async function showBackupStats() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  PROSPECTING ENGINE - BACKUP STATISTICS                        ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  try {
    // Get backup configuration
    const config = getConfig();
    console.log('Configuration:');
    console.log(`  Engine: ${config.engineName}`);
    console.log(`  Backup root: ${config.backupRoot}`);
    console.log(`  Primary directory: ${config.primaryDir}`);
    console.log(`  Failed directory: ${config.failedDir}\n`);

    // Get backup statistics
    const stats = await getBackupStats();

    if (!stats) {
      console.log('❌ Failed to retrieve backup statistics\n');
      return;
    }

    // Display statistics
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('BACKUP STATISTICS');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Total backups:     ${stats.total_backups}`);
    console.log(`✅ Uploaded:       ${stats.uploaded} (${stats.success_rate}%)`);
    console.log(`⏳ Pending upload: ${stats.pending_upload}`);
    console.log(`❌ Failed uploads: ${stats.failed_uploads}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Show health status
    if (stats.total_backups === 0) {
      console.log('💡 No backups found. Start prospecting to create backups.\n');
    } else if (stats.pending_upload === 0 && stats.failed_uploads === 0) {
      console.log('✅ All backups successfully uploaded!\n');
    } else if (stats.failed_uploads > 0) {
      console.log(`⚠️  ${stats.failed_uploads} backup(s) failed to upload.`);
      console.log('   Run: node scripts/retry-failed-prospects.js\n');
    } else if (stats.pending_upload > 0) {
      console.log(`⏳ ${stats.pending_upload} backup(s) pending upload.\n`);
    }

    // Show detailed file list if requested
    if (showDetailed) {
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('DETAILED FILE LIST');
      console.log('═══════════════════════════════════════════════════════════════\n');

      // Show pending uploads
      if (stats.pending_upload > 0) {
        const pending = await getPendingUploads();
        console.log(`⏳ Pending Uploads (${pending.length}):`);
        pending.forEach((backup, index) => {
          console.log(`  ${index + 1}. ${backup.company_name || 'Unknown'}`);
          console.log(`     File: ${backup.filename}`);
          console.log(`     Saved at: ${backup.saved_at || 'Unknown'}`);
          console.log(`     City: ${backup.city || 'N/A'}`);
          console.log(`     Website: ${backup.website || 'N/A'}\n`);
        });
      }

      // Show failed uploads
      if (stats.failed_uploads > 0) {
        const failed = await getFailedUploads();
        console.log(`❌ Failed Uploads (${failed.length}):`);
        failed.forEach((backup, index) => {
          console.log(`  ${index + 1}. ${backup.company_name || 'Unknown'}`);
          console.log(`     File: ${backup.filename}`);
          console.log(`     Failed at: ${backup.failed_at || 'Unknown'}`);
          console.log(`     Error: ${backup.upload_error?.substring(0, 100) || 'Unknown'}...`);
          console.log(`     City: ${backup.city || 'N/A'}`);
          console.log(`     Website: ${backup.website || 'N/A'}\n`);
        });
      }
    } else if (stats.pending_upload > 0 || stats.failed_uploads > 0) {
      console.log('💡 Run with --detailed flag to see full file list\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
showBackupStats();
