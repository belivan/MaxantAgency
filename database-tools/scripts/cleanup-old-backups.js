#!/usr/bin/env node

/**
 * Backup Cleanup Utility
 *
 * Archives (deletes) old uploaded backups across all engines to free up disk space.
 *
 * SAFETY RULES:
 * - Only deletes backups marked as "uploaded_to_db: true"
 * - NEVER deletes pending or failed uploads
 * - Default retention: 30 days
 *
 * Usage:
 *   node database-tools/scripts/cleanup-old-backups.js                  # Delete uploaded backups older than 30 days
 *   node database-tools/scripts/cleanup-old-backups.js --days 90        # Custom retention (90 days)
 *   node database-tools/scripts/cleanup-old-backups.js --engine prospecting-engine  # Specific engine only
 *   node database-tools/scripts/cleanup-old-backups.js --dry-run        # Preview what would be deleted
 *   node database-tools/scripts/cleanup-old-backups.js --verbose        # Detailed output
 *
 * Features:
 * - Scans all engines: prospecting-engine, analysis-engine, outreach-engine, pipeline-orchestrator
 * - Uses BackupManager.archiveOldBackups(daysOld) for safe deletion
 * - Reports total files deleted and disk space saved
 * - Dry-run mode for preview before actual deletion
 * - Verbose mode for detailed per-file logging
 *
 * @module cleanup-old-backups
 */

import { stat, readFile, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { BackupManager } from '../shared/backup-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Project root (database-tools/scripts/ -> ../..)
const PROJECT_ROOT = join(__dirname, '..', '..');
const LOCAL_BACKUPS_ROOT = join(PROJECT_ROOT, 'local-backups');

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

// Engine configuration (subdirectories for each engine)
const ENGINE_CONFIG = {
  'prospecting-engine': ['prospects'],
  'analysis-engine': ['leads'],
  'outreach-engine': ['composed_outreach', 'social_outreach'],
  'pipeline-orchestrator': ['campaigns', 'campaign_runs']
};

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    days: 30,
    engine: null,
    dryRun: false,
    verbose: false
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--days' && args[i + 1]) {
      options.days = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i].startsWith('--days=')) {
      options.days = parseInt(args[i].split('=')[1], 10);
    } else if (args[i] === '--engine' && args[i + 1]) {
      options.engine = args[i + 1];
      i++;
    } else if (args[i].startsWith('--engine=')) {
      options.engine = args[i].split('=')[1];
    } else if (args[i] === '--dry-run') {
      options.dryRun = true;
    } else if (args[i] === '--verbose') {
      options.verbose = true;
    } else if (args[i] === '--help' || args[i] === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  // Validate days
  if (isNaN(options.days) || options.days < 1) {
    console.error(`${colors.red}Error: --days must be a positive number${colors.reset}`);
    process.exit(1);
  }

  return options;
}

/**
 * Print help message
 */
function printHelp() {
  console.log(`
Backup Cleanup Utility

Archives (deletes) old uploaded backups to free up disk space.

SAFETY: Only deletes backups marked as "uploaded_to_db: true"
        NEVER deletes pending or failed uploads

Usage:
  node database-tools/scripts/cleanup-old-backups.js [options]

Options:
  --days <number>      Days to retain uploaded backups (default: 30)
  --engine <name>      Clean specific engine only
  --dry-run            Preview what would be deleted (no changes)
  --verbose            Detailed per-file logging
  --help, -h           Show this help message

Examples:
  node database-tools/scripts/cleanup-old-backups.js
  node database-tools/scripts/cleanup-old-backups.js --days 90
  node database-tools/scripts/cleanup-old-backups.js --engine prospecting-engine
  node database-tools/scripts/cleanup-old-backups.js --dry-run
  node database-tools/scripts/cleanup-old-backups.js --days 7 --verbose

Available Engines:
  - prospecting-engine
  - analysis-engine
  - outreach-engine
  - pipeline-orchestrator
  `);
}

/**
 * Format bytes to human-readable size
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Get total file size for all uploaded backups older than cutoff
 */
async function calculateSpaceSaved(engineName, subdirectories, daysOld, verbose = false) {
  const backupMgr = new BackupManager(engineName, {
    subdirectories,
    projectRoot: PROJECT_ROOT
  });

  const primaryDir = backupMgr.getDirectory();
  if (!existsSync(primaryDir)) {
    return { count: 0, bytes: 0, files: [] };
  }

  const files = await readdir(primaryDir);
  const jsonFiles = files.filter(f => f.endsWith('.json'));

  const cutoffDate = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
  let totalBytes = 0;
  let count = 0;
  const filesToDelete = [];

  for (const file of jsonFiles) {
    const filepath = join(primaryDir, file);

    try {
      const content = await readFile(filepath, 'utf-8');
      const backup = JSON.parse(content);

      // Only count if uploaded AND older than cutoff
      if (backup.uploaded_to_db && backup.uploaded_at) {
        const uploadedDate = new Date(backup.uploaded_at).getTime();
        if (uploadedDate < cutoffDate) {
          const stats = await stat(filepath);
          totalBytes += stats.size;
          count++;

          if (verbose) {
            filesToDelete.push({
              filename: file,
              size: stats.size,
              uploadedAt: backup.uploaded_at
            });
          }
        }
      }
    } catch (error) {
      // Skip invalid files
      if (verbose) {
        console.log(`  ${colors.yellow}⚠️  Skipped invalid file: ${file}${colors.reset}`);
      }
    }
  }

  return { count, bytes: totalBytes, files: filesToDelete };
}

/**
 * Clean up old backups for a single engine
 */
async function cleanupEngine(engineName, subdirectories, options) {
  const backupMgr = new BackupManager(engineName, {
    subdirectories,
    projectRoot: PROJECT_ROOT
  });

  const engineBackupDir = join(LOCAL_BACKUPS_ROOT, engineName);
  if (!existsSync(engineBackupDir)) {
    return {
      engine: engineName,
      skipped: true,
      reason: 'No backup directory found',
      deleted: 0,
      spaceSaved: 0
    };
  }

  const primaryDir = backupMgr.getDirectory();
  const primarySubdir = subdirectories[0] || 'data';

  // Display engine name (capitalize first letter of each word)
  const displayName = engineName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  console.log(`${colors.bright}${displayName}:${colors.reset}`);
  console.log(`  Scanning: ${colors.gray}local-backups/${engineName}/${primarySubdir}/${colors.reset}`);

  // Calculate what would be deleted
  const preview = await calculateSpaceSaved(engineName, subdirectories, options.days, options.verbose);

  if (preview.count === 0) {
    console.log(`  ${colors.gray}No uploaded backups older than ${options.days} days${colors.reset}`);
    console.log();
    return {
      engine: engineName,
      deleted: 0,
      spaceSaved: 0
    };
  }

  console.log(`  Found: ${preview.count} uploaded backups older than ${options.days} days`);

  if (options.verbose) {
    console.log();
    console.log(`  ${colors.cyan}Files to delete:${colors.reset}`);
    preview.files.forEach((file, index) => {
      const uploadDate = new Date(file.uploadedAt).toISOString().split('T')[0];
      console.log(`    ${index + 1}. ${file.filename}`);
      console.log(`       Uploaded: ${uploadDate} | Size: ${formatBytes(file.size)}`);
    });
    console.log();
  }

  if (options.dryRun) {
    console.log(`  ${colors.yellow}[DRY RUN]${colors.reset} Would delete: ${preview.count} backups`);
    console.log(`  ${colors.yellow}[DRY RUN]${colors.reset} Would save: ${formatBytes(preview.bytes)}`);
    console.log();
    return {
      engine: engineName,
      deleted: preview.count,
      spaceSaved: preview.bytes,
      dryRun: true
    };
  }

  // Actually delete old backups using BackupManager
  const deletedCount = await backupMgr.archiveOldBackups(options.days);

  console.log(`  ${colors.green}🗑️  Deleted:${colors.reset} ${deletedCount} backups`);
  console.log(`  ${colors.green}💾 Saved:${colors.reset} ${formatBytes(preview.bytes)}`);
  console.log();

  return {
    engine: engineName,
    deleted: deletedCount,
    spaceSaved: preview.bytes
  };
}

/**
 * Main execution
 */
async function main() {
  const options = parseArgs();

  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  BACKUP CLEANUP UTILITY                                        ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log();

  // Configuration display
  console.log('Configuration:');
  console.log(`  Retention: ${colors.cyan}${options.days} days${colors.reset}`);
  console.log(`  Mode: ${options.dryRun ? colors.yellow + 'DRY RUN (--dry-run for preview)' + colors.reset : colors.green + 'LIVE' + colors.reset}`);

  if (options.engine) {
    console.log(`  Engine: ${colors.cyan}${options.engine}${colors.reset}`);
  } else {
    console.log(`  Scope: ${colors.cyan}All engines${colors.reset}`);
  }

  if (options.verbose) {
    console.log(`  Verbose: ${colors.cyan}Enabled${colors.reset}`);
  }

  console.log();

  // Validate engine filter if provided
  if (options.engine && !ENGINE_CONFIG[options.engine]) {
    console.error(`${colors.red}Error: Unknown engine "${options.engine}"${colors.reset}`);
    console.log(`\nAvailable engines: ${Object.keys(ENGINE_CONFIG).join(', ')}\n`);
    process.exit(1);
  }

  // Check if local-backups directory exists
  if (!existsSync(LOCAL_BACKUPS_ROOT)) {
    console.log(`${colors.yellow}⚠️  No local-backups directory found${colors.reset}`);
    console.log('   Run an engine to create backups.\n');
    process.exit(0);
  }

  // Determine which engines to process
  const enginesToProcess = options.engine
    ? { [options.engine]: ENGINE_CONFIG[options.engine] }
    : ENGINE_CONFIG;

  // Process each engine
  const results = [];
  for (const [engineName, subdirs] of Object.entries(enginesToProcess)) {
    const result = await cleanupEngine(engineName, subdirs, options);
    results.push(result);
  }

  // Calculate totals
  const totalDeleted = results.reduce((sum, r) => sum + r.deleted, 0);
  const totalSpaceSaved = results.reduce((sum, r) => sum + r.spaceSaved, 0);

  // Print summary
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`${colors.bright}TOTAL CLEANUP:${colors.reset}`);

  if (options.dryRun) {
    console.log(`  ${colors.yellow}[DRY RUN]${colors.reset} Would delete: ${totalDeleted} backups`);
    console.log(`  ${colors.yellow}[DRY RUN]${colors.reset} Would save: ${formatBytes(totalSpaceSaved)}`);
  } else {
    console.log(`  Deleted: ${colors.green}${totalDeleted} backups${colors.reset}`);
    console.log(`  Disk Space Saved: ${colors.green}${formatBytes(totalSpaceSaved)}${colors.reset}`);
  }

  console.log('═══════════════════════════════════════════════════════════════');
  console.log();

  // Exit messages
  if (options.dryRun) {
    console.log(`${colors.cyan}Dry run complete. Run without --dry-run to delete backups.${colors.reset}\n`);
    process.exit(0);
  } else if (totalDeleted === 0) {
    console.log(`${colors.green}✅ No old backups to clean up!${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${colors.green}✅ Cleanup complete! Deleted ${totalDeleted} old backups.${colors.reset}\n`);

    // Reminder about safety
    console.log(`${colors.gray}Note: Only uploaded backups were deleted. Pending/failed uploads were preserved.${colors.reset}\n`);
    process.exit(0);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}` || import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  main().catch(error => {
    console.error(`\n${colors.red}❌ FATAL ERROR:${colors.reset}`, error.message);
    if (error.stack) {
      console.error(colors.gray + error.stack + colors.reset);
    }
    process.exit(1);
  });
}

export { cleanupEngine, calculateSpaceSaved };