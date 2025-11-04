#!/usr/bin/env node

/**
 * Backup System Health Dashboard (Phase 4)
 *
 * Shows backup health across ALL engines in the MaxantAgency system.
 *
 * Usage:
 *   node database-tools/scripts/backup-stats.js              # All engines
 *   node database-tools/scripts/backup-stats.js --engine prospecting-engine
 *   node database-tools/scripts/backup-stats.js --json       # JSON output
 *   node database-tools/scripts/backup-stats.js --watch      # Live updates every 5s
 *
 * Features:
 * - Scans all engines in local-backups/
 * - Calculates total/uploaded/pending/failed counts
 * - Shows system-wide totals and success rates
 * - Identifies oldest failed uploads
 * - Reports storage usage
 * - JSON mode for automation/monitoring
 * - Watch mode for live monitoring
 *
 * @module backup-stats
 */

import { readdir, stat, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { BackupManager } from '../shared/backup-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Project root (database-tools/scripts/ -> ../..)
const PROJECT_ROOT = join(__dirname, '..', '..');
const LOCAL_BACKUPS_ROOT = join(PROJECT_ROOT, 'local-backups');

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
    engine: null,
    json: false,
    watch: false
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--engine' && args[i + 1]) {
      options.engine = args[i + 1];
      i++;
    } else if (args[i] === '--json') {
      options.json = true;
    } else if (args[i] === '--watch') {
      options.watch = true;
    } else if (args[i] === '--help' || args[i] === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

/**
 * Print help message
 */
function printHelp() {
  console.log(`
Backup System Health Dashboard

Usage:
  node database-tools/scripts/backup-stats.js [options]

Options:
  --engine <name>    Show stats for specific engine only
  --json             Output as JSON (for automation)
  --watch            Live updates every 5 seconds
  --help, -h         Show this help message

Examples:
  node database-tools/scripts/backup-stats.js
  node database-tools/scripts/backup-stats.js --engine prospecting-engine
  node database-tools/scripts/backup-stats.js --json
  node database-tools/scripts/backup-stats.js --watch

Available Engines:
  - prospecting-engine
  - analysis-engine
  - outreach-engine
  - pipeline-orchestrator
  `);
}

/**
 * Get file size in bytes
 */
async function getFileSize(filepath) {
  try {
    const stats = await stat(filepath);
    return stats.size;
  } catch (error) {
    return 0;
  }
}

/**
 * Format bytes to human-readable size
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Calculate age in days from ISO date string
 */
function getAgeInDays(isoDateString) {
  const date = new Date(isoDateString);
  const now = new Date();
  const diffMs = now - date;
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return days;
}

/**
 * Format date for display
 */
function formatDate(isoDateString) {
  const date = new Date(isoDateString);
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

/**
 * Get detailed statistics for a single engine
 */
async function getEngineStats(engineName, subdirectories) {
  const backupMgr = new BackupManager(engineName, {
    subdirectories,
    projectRoot: PROJECT_ROOT
  });

  // Get basic stats from BackupManager
  const basicStats = await backupMgr.getBackupStats();
  if (!basicStats) {
    return null;
  }

  // Calculate storage usage
  let totalStorage = 0;
  const primaryDir = backupMgr.getDirectory();
  const failedDir = backupMgr.getDirectory('failed-uploads');

  // Get all files from primary and failed directories
  const allFiles = [];

  if (existsSync(primaryDir)) {
    const primaryFiles = await readdir(primaryDir);
    for (const file of primaryFiles) {
      if (file.endsWith('.json')) {
        allFiles.push(join(primaryDir, file));
      }
    }
  }

  if (existsSync(failedDir)) {
    const failedFiles = await readdir(failedDir);
    for (const file of failedFiles) {
      if (file.endsWith('.json')) {
        allFiles.push(join(failedDir, file));
      }
    }
  }

  // Calculate total storage
  for (const filepath of allFiles) {
    totalStorage += await getFileSize(filepath);
  }

  // Find oldest failed upload
  let oldestFailed = null;
  let oldestFailedDate = null;

  if (existsSync(failedDir)) {
    const failedFiles = await readdir(failedDir);
    for (const file of failedFiles) {
      if (!file.endsWith('.json')) continue;

      const filepath = join(failedDir, file);
      try {
        const content = await readFile(filepath, 'utf-8');
        const backup = JSON.parse(content);

        if (backup.failed_at) {
          const failedDate = new Date(backup.failed_at);
          if (!oldestFailedDate || failedDate < oldestFailedDate) {
            oldestFailedDate = failedDate;
            oldestFailed = backup.failed_at;
          }
        }
      } catch (error) {
        // Skip invalid files
      }
    }
  }

  return {
    engine: engineName,
    total: basicStats.total_backups,
    uploaded: basicStats.uploaded,
    pending: basicStats.pending_upload,
    failed: basicStats.failed_uploads,
    success_rate: parseFloat(basicStats.success_rate),
    storage_bytes: totalStorage,
    storage_formatted: formatBytes(totalStorage),
    oldest_failed: oldestFailed,
    oldest_failed_age_days: oldestFailed ? getAgeInDays(oldestFailed) : null,
    backup_dir: basicStats.backup_dir,
    failed_dir: basicStats.failed_dir
  };
}

/**
 * Scan all engines and collect statistics
 */
async function scanAllEngines(filterEngine = null) {
  const results = {};

  for (const [engineName, subdirs] of Object.entries(ENGINE_CONFIG)) {
    // Skip if filtering by specific engine
    if (filterEngine && engineName !== filterEngine) {
      continue;
    }

    const stats = await getEngineStats(engineName, subdirs);
    if (stats) {
      results[engineName] = stats;
    }
  }

  return results;
}

/**
 * Calculate system-wide totals
 */
function calculateTotals(engineStats) {
  let totalBackups = 0;
  let totalUploaded = 0;
  let totalPending = 0;
  let totalFailed = 0;
  let totalStorage = 0;

  for (const stats of Object.values(engineStats)) {
    totalBackups += stats.total;
    totalUploaded += stats.uploaded;
    totalPending += stats.pending;
    totalFailed += stats.failed;
    totalStorage += stats.storage_bytes;
  }

  const successRate = totalBackups > 0
    ? ((totalUploaded / totalBackups) * 100).toFixed(1)
    : '0.0';

  return {
    total: totalBackups,
    uploaded: totalUploaded,
    pending: totalPending,
    failed: totalFailed,
    success_rate: parseFloat(successRate),
    storage_bytes: totalStorage,
    storage_formatted: formatBytes(totalStorage)
  };
}

/**
 * Display stats in human-readable format
 */
function displayStats(engineStats, totals) {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║  BACKUP SYSTEM HEALTH DASHBOARD                   ║');
  console.log('╚════════════════════════════════════════════════════╝');
  console.log();

  // Sort engines alphabetically
  const sortedEngines = Object.entries(engineStats).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  for (const [engineName, stats] of sortedEngines) {
    // Display engine name (capitalize first letter of each word)
    const displayName = engineName
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    console.log(`${displayName}:`);
    console.log(`  Total Backups:      ${stats.total}`);
    console.log(`  ├─ Uploaded:         ${stats.uploaded}`);
    console.log(`  ├─ Pending:          ${stats.pending}`);
    console.log(`  └─ Failed:           ${stats.failed}`);
    console.log();

    if (stats.oldest_failed) {
      const ageStr = stats.oldest_failed_age_days === 0
        ? '< 1 day'
        : `${stats.oldest_failed_age_days} day${stats.oldest_failed_age_days === 1 ? '' : 's'}`;

      console.log(`  Oldest Failed:      ${formatDate(stats.oldest_failed)} (${ageStr})`);
    }

    console.log(`  Storage Used:       ${stats.storage_formatted}`);
    console.log();
  }

  // System totals
  console.log('══════════════════════════════════════════════════════');
  console.log('SYSTEM TOTALS:');
  console.log(`  Total Backups:      ${totals.total}`);

  if (totals.failed > 0) {
    console.log(`  Failed Uploads:     ${totals.failed} ⚠️`);
  } else {
    console.log(`  Failed Uploads:     ${totals.failed}`);
  }

  console.log(`  Storage Used:       ${totals.storage_formatted}`);
  console.log(`  Success Rate:       ${totals.success_rate}%`);
  console.log('══════════════════════════════════════════════════════');
}

/**
 * Display stats as JSON
 */
function displayJSON(engineStats, totals) {
  const output = {
    engines: {},
    totals: {
      total: totals.total,
      uploaded: totals.uploaded,
      pending: totals.pending,
      failed: totals.failed,
      success_rate: totals.success_rate,
      storage_mb: (totals.storage_bytes / (1024 * 1024)).toFixed(2)
    }
  };

  for (const [engineName, stats] of Object.entries(engineStats)) {
    output.engines[engineName] = {
      total: stats.total,
      uploaded: stats.uploaded,
      pending: stats.pending,
      failed: stats.failed,
      success_rate: stats.success_rate,
      storage_mb: (stats.storage_bytes / (1024 * 1024)).toFixed(2),
      oldest_failed: stats.oldest_failed || null,
      oldest_failed_age_days: stats.oldest_failed_age_days || null
    };
  }

  console.log(JSON.stringify(output, null, 2));
}

/**
 * Main execution
 */
async function main() {
  const options = parseArgs();

  // Validate engine filter if provided
  if (options.engine && !ENGINE_CONFIG[options.engine]) {
    console.error(`❌ Unknown engine: ${options.engine}`);
    console.error(`Available engines: ${Object.keys(ENGINE_CONFIG).join(', ')}`);
    process.exit(1);
  }

  // Check if local-backups directory exists
  if (!existsSync(LOCAL_BACKUPS_ROOT)) {
    if (options.json) {
      console.log(JSON.stringify({
        error: 'No local-backups directory found',
        engines: {},
        totals: { total: 0, failed: 0, storage_mb: 0 }
      }));
    } else {
      console.log('╔════════════════════════════════════════════════════╗');
      console.log('║  BACKUP SYSTEM HEALTH DASHBOARD                   ║');
      console.log('╚════════════════════════════════════════════════════╝');
      console.log();
      console.log('⚠️  No local-backups directory found.');
      console.log('   Run an engine to create backups.');
      console.log();
    }
    process.exit(0);
  }

  // Scan engines and collect stats
  const engineStats = await scanAllEngines(options.engine);

  if (Object.keys(engineStats).length === 0) {
    if (options.json) {
      console.log(JSON.stringify({
        engines: {},
        totals: { total: 0, uploaded: 0, pending: 0, failed: 0, success_rate: 0, storage_mb: 0 }
      }));
    } else {
      console.log('╔════════════════════════════════════════════════════╗');
      console.log('║  BACKUP SYSTEM HEALTH DASHBOARD                   ║');
      console.log('╚════════════════════════════════════════════════════╝');
      console.log();
      console.log('⚠️  No backup data found.');
      console.log();
    }
    process.exit(0);
  }

  const totals = calculateTotals(engineStats);

  // Display results
  if (options.json) {
    displayJSON(engineStats, totals);
  } else {
    displayStats(engineStats, totals);
  }

  // Watch mode - refresh every 5 seconds
  if (options.watch && !options.json) {
    console.log();
    console.log('👁️  Watching for changes (Ctrl+C to stop)...');
    console.log();

    setInterval(async () => {
      // Clear screen
      console.clear();

      // Rescan and display
      const newEngineStats = await scanAllEngines(options.engine);
      const newTotals = calculateTotals(newEngineStats);
      displayStats(newEngineStats, newTotals);

      console.log();
      console.log('👁️  Watching for changes (Ctrl+C to stop)...');
      console.log(`   Last update: ${new Date().toLocaleTimeString()}`);
      console.log();
    }, 5000);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}` || import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  main().catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

export { scanAllEngines, calculateTotals, getEngineStats };