#!/usr/bin/env node

/**
 * Migration Script: Old Backup System → Centralized BackupManager
 *
 * This script migrates existing backups from the old custom backup system
 * to the new centralized BackupManager format and uploads pending backups.
 *
 * OLD FORMAT:
 * {
 *   "saved_at": "2025-10-21T...",
 *   "company_name": "Example Co",
 *   "url": "https://example.com",
 *   "analysis_result": { ... },
 *   "lead_data": { ... },
 *   "uploaded_to_db": false
 * }
 *
 * NEW FORMAT (BackupManager):
 * {
 *   "saved_at": "2025-10-21T...",
 *   "company_name": "Example Co",
 *   "url": "https://example.com",
 *   "grade": "B",
 *   "overall_score": 75,
 *   ... (metadata) ...,
 *   "data": {
 *     "analysis_result": { ... },
 *     "lead_data": { ... }
 *   },
 *   "uploaded_to_db": false,
 *   "upload_status": "pending"
 * }
 *
 * WHAT THIS SCRIPT DOES:
 * 1. Scans old backup directory: local-backups/analysis-engine/leads/
 * 2. Validates each backup file
 * 3. Converts old format to new BackupManager format
 * 4. Attempts to upload pending backups to database
 * 5. Marks successful uploads
 * 6. Moves failed uploads to failed-uploads/ directory
 *
 * Usage:
 *   node migrate-old-backups.js [options]
 *
 * Options:
 *   --dry-run       Preview migration without making changes
 *   --upload-only   Skip format conversion, only upload pending backups
 *   --force         Force re-upload of already uploaded backups
 */

import { readFile, writeFile, readdir, rename } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '..', '.env') });

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Configuration
const PROJECT_ROOT = join(__dirname, '..', '..');
const BACKUP_DIR = join(PROJECT_ROOT, 'local-backups', 'analysis-engine', 'leads');
const FAILED_DIR = join(PROJECT_ROOT, 'local-backups', 'analysis-engine', 'failed-uploads');

// Parse CLI arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const uploadOnly = args.includes('--upload-only');
const force = args.includes('--force');

// Statistics
const stats = {
  totalFiles: 0,
  converted: 0,
  uploaded: 0,
  failed: 0,
  skipped: 0,
  errors: []
};

/**
 * Atomic file write (write to temp file, then rename)
 */
async function atomicWrite(filepath, content) {
  const tempPath = `${filepath}.tmp`;

  try {
    await writeFile(tempPath, content, 'utf-8');
    await rename(tempPath, filepath);
  } catch (error) {
    // Clean up temp file on failure
    if (existsSync(tempPath)) {
      await unlink(tempPath).catch(() => {});
    }
    throw error;
  }
}

/**
 * Check if a backup is in old format
 */
function isOldFormat(backup) {
  return (
    backup.analysis_result !== undefined &&
    backup.lead_data !== undefined &&
    backup.data === undefined
  );
}

/**
 * Convert old backup format to new BackupManager format
 */
function convertToNewFormat(oldBackup) {
  const leadData = oldBackup.lead_data || {};

  return {
    // Metadata (for filtering/searching without opening file)
    saved_at: oldBackup.saved_at,
    company_name: oldBackup.company_name,
    url: oldBackup.url,

    // Analysis metadata
    grade: leadData.website_grade || null,
    overall_score: leadData.overall_score || null,
    design_score: leadData.design_score || null,
    seo_score: leadData.seo_score || null,
    content_score: leadData.content_score || null,
    social_score: leadData.social_score || null,
    top_issue: leadData.top_issue || null,
    quick_wins_count: (leadData.quick_wins || []).length,
    has_quick_wins: (leadData.quick_wins || []).length > 0,

    // References
    project_id: leadData.project_id || null,
    prospect_id: leadData.prospect_id || null,

    // Industry and location
    industry: leadData.industry || 'unknown',
    city: leadData.city || null,

    // Technical metadata
    has_https: leadData.has_https || false,
    is_mobile_friendly: leadData.is_mobile_friendly || false,
    has_blog: leadData.has_blog || false,

    // Multi-page intelligence
    pages_discovered: oldBackup.analysis_result?.intelligent_analysis?.pages_discovered || 0,
    pages_crawled: oldBackup.analysis_result?.intelligent_analysis?.pages_crawled || 0,

    // AI model tracking
    desktop_visual_model: leadData.desktop_visual_model || null,
    mobile_visual_model: leadData.mobile_visual_model || null,
    seo_analysis_model: leadData.seo_analysis_model || null,
    content_analysis_model: leadData.content_analysis_model || null,
    social_analysis_model: leadData.social_analysis_model || null,

    // Performance metrics
    analysis_cost: leadData.analysis_cost || 0,
    analysis_time: leadData.analysis_time || 0,

    // ACTUAL DATA (nested in BackupManager format)
    data: {
      analysis_result: oldBackup.analysis_result,
      lead_data: oldBackup.lead_data
    },

    // Upload tracking
    uploaded_to_db: oldBackup.uploaded_to_db || false,
    upload_status: oldBackup.uploaded_to_db ? 'uploaded' : 'pending',
    uploaded_at: oldBackup.uploaded_at || null,
    database_id: oldBackup.database_id || null
  };
}

/**
 * Upload a backup to database
 */
async function uploadBackup(backup) {
  const leadData = backup.data?.lead_data || backup.lead_data;

  if (!leadData) {
    throw new Error('No lead_data found in backup');
  }

  const { data: savedLead, error } = await supabase
    .from('leads')
    .upsert(leadData, { onConflict: 'url' })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return savedLead;
}

/**
 * Mark backup as uploaded
 */
async function markAsUploaded(backupPath, backup, dbId) {
  backup.uploaded_to_db = true;
  backup.upload_status = 'uploaded';
  backup.uploaded_at = new Date().toISOString();
  backup.database_id = dbId;

  await atomicWrite(backupPath, JSON.stringify(backup, null, 2));
}

/**
 * Move backup to failed-uploads directory
 */
async function markAsFailed(backupPath, backup, error) {
  const filename = backupPath.split(/[\\/]/).pop();
  const failedPath = join(FAILED_DIR, filename);

  backup.upload_failed = true;
  backup.upload_status = 'failed';
  backup.upload_error = error.message || String(error);
  backup.failed_at = new Date().toISOString();

  await atomicWrite(failedPath, JSON.stringify(backup, null, 2));

  return failedPath;
}

/**
 * Process a single backup file
 */
async function processBackup(filepath) {
  try {
    const content = await readFile(filepath, 'utf-8');
    let backup = JSON.parse(content);

    const filename = filepath.split(/[\\/]/).pop();

    // STEP 1: Convert old format to new format (if needed)
    if (!uploadOnly && isOldFormat(backup)) {
      console.log(`\n📦 Converting: ${filename}`);
      console.log(`   Old format detected, converting to BackupManager format...`);

      if (!dryRun) {
        backup = convertToNewFormat(backup);
        await atomicWrite(filepath, JSON.stringify(backup, null, 2));
        stats.converted++;
        console.log(`   ✅ Converted successfully`);
      } else {
        console.log(`   [DRY RUN] Would convert to new format`);
      }
    }

    // STEP 2: Upload to database (if pending or forced)
    const shouldUpload = !backup.uploaded_to_db || force;

    if (shouldUpload) {
      console.log(`\n📤 Uploading: ${filename}`);
      console.log(`   Company: ${backup.company_name}`);
      console.log(`   URL: ${backup.url}`);

      if (!dryRun) {
        try {
          const savedLead = await uploadBackup(backup);
          await markAsUploaded(filepath, backup, savedLead.id);
          stats.uploaded++;
          console.log(`   ✅ Uploaded successfully with ID: ${savedLead.id}`);
        } catch (uploadError) {
          const failedPath = await markAsFailed(filepath, backup, uploadError);
          stats.failed++;
          console.log(`   ❌ Upload failed: ${uploadError.message}`);
          console.log(`   Moved to: ${failedPath}`);

          stats.errors.push({
            file: filename,
            error: uploadError.message
          });
        }
      } else {
        console.log(`   [DRY RUN] Would upload to database`);
      }
    } else {
      stats.skipped++;
      console.log(`\n⏭️  Skipped: ${filename} (already uploaded)`);
    }

  } catch (error) {
    const filename = filepath.split(/[\\/]/).pop();
    stats.failed++;
    stats.errors.push({
      file: filename,
      error: error.message
    });
    console.error(`\n❌ Error processing ${filename}:`, error.message);
  }
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  ANALYSIS ENGINE BACKUP MIGRATION                              ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  if (uploadOnly) {
    console.log('📤 UPLOAD ONLY MODE - Skipping format conversion\n');
  }

  if (force) {
    console.log('⚡ FORCE MODE - Re-uploading all backups\n');
  }

  // Check if backup directory exists
  if (!existsSync(BACKUP_DIR)) {
    console.log(`❌ Backup directory not found: ${BACKUP_DIR}`);
    console.log(`No backups to migrate.`);
    return;
  }

  console.log(`📂 Scanning: ${BACKUP_DIR}\n`);

  // Get all JSON files
  const files = await readdir(BACKUP_DIR);
  const jsonFiles = files.filter(f => f.endsWith('.json'));

  stats.totalFiles = jsonFiles.length;

  if (jsonFiles.length === 0) {
    console.log('No backup files found.');
    return;
  }

  console.log(`Found ${jsonFiles.length} backup file(s)\n`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Process each backup
  for (const file of jsonFiles) {
    const filepath = join(BACKUP_DIR, file);
    await processBackup(filepath);
  }

  // Print summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('MIGRATION SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log(`Total files:       ${stats.totalFiles}`);
  console.log(`Converted:         ${stats.converted}`);
  console.log(`Uploaded:          ${stats.uploaded}`);
  console.log(`Failed:            ${stats.failed}`);
  console.log(`Skipped:           ${stats.skipped}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (stats.errors.length > 0) {
    console.log('ERRORS:\n');
    stats.errors.forEach((err, index) => {
      console.log(`${index + 1}. ${err.file}`);
      console.log(`   Error: ${err.error}\n`);
    });
  }

  if (dryRun) {
    console.log('✨ Dry run complete - No changes were made\n');
    console.log('To perform the migration, run without --dry-run flag\n');
  } else if (stats.uploaded > 0 || stats.converted > 0) {
    console.log('✅ Migration complete!\n');
  } else {
    console.log('ℹ️  No changes needed\n');
  }
}

// Run migration
migrate()
  .then(() => process.exit(stats.failed > 0 ? 1 : 0))
  .catch((error) => {
    console.error('\n❌ FATAL ERROR:', error);
    process.exit(1);
  });
