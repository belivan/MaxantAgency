#!/usr/bin/env node

/**
 * Backup Cleanup Script
 *
 * Archives (deletes) old uploaded backups that are older than N days.
 * Only removes backups that have been successfully uploaded to the database.
 *
 * Usage:
 *   node scripts/cleanup-backups.js                    # Default: 30 days
 *   node scripts/cleanup-backups.js --days=7          # Keep 7 days
 *   node scripts/cleanup-backups.js --days=90         # Keep 90 days
 *   node scripts/cleanup-backups.js --dry-run         # Preview only
 *   node scripts/cleanup-backups.js --days=7 --dry-run # Preview 7-day cleanup
 */

import { cleanupOldBackups, getBackupStats } from '../utils/local-backup.js';

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const daysArg = args.find(arg => arg.startsWith('--days='));
const daysToKeep = daysArg ? parseInt(daysArg.split('=')[1]) : 30;

// Validate days parameter
if (isNaN(daysToKeep) || daysToKeep < 1) {
  console.error('❌ Invalid --days parameter. Must be a positive number.');
  process.exit(1);
}

/**
 * Main cleanup function
 */
async function cleanupBackups() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  BACKUP CLEANUP SCRIPT                                         ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  console.log(`Settings:`);
  console.log(`  Days to keep: ${daysToKeep}`);
  console.log(`  Mode: ${isDryRun ? 'DRY RUN (preview only)' : 'LIVE (will delete files)'}\n`);

  try {
    // Show current stats
    const statsBefore = await getBackupStats();

    if (!statsBefore) {
      console.log('❌ Failed to retrieve backup statistics\n');
      return;
    }

    console.log('Current backup statistics:');
    console.log(`  Total backups: ${statsBefore.total_backups}`);
    console.log(`  Uploaded: ${statsBefore.uploaded}`);
    console.log(`  Pending: ${statsBefore.pending_upload}`);
    console.log(`  Failed: ${statsBefore.failed_uploads}\n`);

    if (statsBefore.uploaded === 0) {
      console.log('✅ No uploaded backups to clean up.\n');
      return;
    }

    if (isDryRun) {
      console.log('🔍 DRY RUN MODE: Simulating cleanup...\n');
      console.log('⚠️  This is a preview. Run without --dry-run to actually delete files.\n');
    } else {
      console.log('🧹 Starting cleanup...\n');
    }

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    console.log(`Will archive backups uploaded before: ${cutoffDate.toISOString().split('T')[0]}\n`);

    // Perform cleanup (or dry run)
    const archivedCount = isDryRun ? 0 : await cleanupOldBackups(daysToKeep);

    if (isDryRun) {
      // For dry run, we can't easily determine what would be deleted without duplicating logic
      console.log('ℹ️  Dry run complete. Actual deletion count will vary based on upload dates.\n');
      console.log('Run without --dry-run to perform cleanup.\n');
    } else {
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('CLEANUP RESULTS');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log(`🧹 Archived: ${archivedCount} backup(s)\n`);

      // Show updated stats
      const statsAfter = await getBackupStats();
      if (statsAfter) {
        console.log('Updated backup statistics:');
        console.log(`  Total backups: ${statsAfter.total_backups} (was ${statsBefore.total_backups})`);
        console.log(`  Uploaded: ${statsAfter.uploaded} (was ${statsBefore.uploaded})`);
        console.log(`  Pending: ${statsAfter.pending_upload}`);
        console.log(`  Failed: ${statsAfter.failed_uploads}\n`);
      }

      if (archivedCount > 0) {
        console.log(`✅ Successfully archived ${archivedCount} old backup(s)!\n`);
      } else {
        console.log(`✅ No backups older than ${daysToKeep} days found.\n`);
      }
    }

  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    process.exit(1);
  }
}

// Run the script
cleanupBackups();
