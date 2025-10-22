#!/usr/bin/env node

/**
 * Retry Failed Lead Uploads
 *
 * This script retries uploading all failed lead backups to Supabase.
 *
 * It reads from: local-backups/analysis-engine/failed-uploads/
 * On success: Moves backup to leads/ directory and marks as uploaded
 * On failure: Keeps in failed-uploads/ and updates error metadata
 *
 * Usage:
 *   node retry-failed-uploads.js [options]
 *
 * Options:
 *   --dry-run       Preview retry without uploading
 *   --limit N       Only retry first N failed uploads
 *   --company NAME  Only retry backups matching company name (partial match)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { getFailedUploads, retryFailedUpload } from '../utils/local-backup.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '..', '.env') });

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Parse CLI arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

let limit = null;
const limitIndex = args.indexOf('--limit');
if (limitIndex !== -1 && args[limitIndex + 1]) {
  limit = parseInt(args[limitIndex + 1], 10);
}

let companyFilter = null;
const companyIndex = args.indexOf('--company');
if (companyIndex !== -1 && args[companyIndex + 1]) {
  companyFilter = args[companyIndex + 1].toLowerCase();
}

// Statistics
const stats = {
  total: 0,
  successful: 0,
  failed: 0,
  skipped: 0,
  results: []
};

/**
 * Upload function for retryFailedUpload
 */
async function uploadLead(backupData) {
  const leadData = backupData.lead_data || backupData.data?.lead_data;

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
 * Main retry function
 */
async function retryFailed() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  RETRY FAILED LEAD UPLOADS                                     ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No uploads will be performed\n');
  }

  if (limit) {
    console.log(`📊 LIMIT: Processing only first ${limit} failed upload(s)\n`);
  }

  if (companyFilter) {
    console.log(`🔍 FILTER: Only retrying companies matching "${companyFilter}"\n`);
  }

  console.log('[Retry] Scanning for failed uploads...\n');

  // Get all failed uploads
  const failedBackups = await getFailedUploads();

  if (failedBackups.length === 0) {
    console.log('✅ No failed uploads found!\n');
    return;
  }

  console.log(`Found ${failedBackups.length} failed upload(s)\n`);

  // Filter by company name if specified
  let backupsToRetry = failedBackups;

  if (companyFilter) {
    backupsToRetry = failedBackups.filter(backup =>
      backup.company_name?.toLowerCase().includes(companyFilter)
    );

    console.log(`Filtered to ${backupsToRetry.length} backup(s) matching "${companyFilter}"\n`);

    if (backupsToRetry.length === 0) {
      console.log('❌ No backups match the company filter\n');
      return;
    }
  }

  // Apply limit if specified
  if (limit && backupsToRetry.length > limit) {
    console.log(`Limiting to first ${limit} backup(s)\n`);
    backupsToRetry = backupsToRetry.slice(0, limit);
  }

  stats.total = backupsToRetry.length;

  console.log('═══════════════════════════════════════════════════════════════\n');

  // Retry each failed upload
  for (let i = 0; i < backupsToRetry.length; i++) {
    const backup = backupsToRetry[i];
    const progress = `[${i + 1}/${backupsToRetry.length}]`;

    console.log(`${progress} Retrying: ${backup.company_name}`);
    console.log(`   URL: ${backup.url}`);
    console.log(`   Original error: ${backup.upload_error?.substring(0, 100)}${backup.upload_error?.length > 100 ? '...' : ''}`);
    console.log(`   Failed at: ${backup.failed_at}`);

    if (dryRun) {
      console.log(`   [DRY RUN] Would attempt upload\n`);
      stats.skipped++;
      continue;
    }

    try {
      const success = await retryFailedUpload(backup.filepath, uploadLead);

      if (success) {
        stats.successful++;
        console.log(`   ✅ SUCCESS: Uploaded to database\n`);

        stats.results.push({
          success: true,
          company_name: backup.company_name,
          url: backup.url
        });
      } else {
        stats.failed++;
        console.log(`   ❌ FAILED: Upload attempt unsuccessful\n`);

        stats.results.push({
          success: false,
          company_name: backup.company_name,
          url: backup.url,
          error: 'Upload returned false (check logs for details)'
        });
      }
    } catch (error) {
      stats.failed++;
      console.error(`   ❌ ERROR: ${error.message}\n`);

      stats.results.push({
        success: false,
        company_name: backup.company_name,
        url: backup.url,
        error: error.message
      });
    }
  }

  // Print summary
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('RETRY SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log(`Total attempted:   ${stats.total}`);
  console.log(`✅ Successful:     ${stats.successful}`);
  console.log(`❌ Failed:         ${stats.failed}`);

  if (dryRun) {
    console.log(`⏭️  Skipped (dry):  ${stats.skipped}`);
  }

  const successRate = stats.total > 0
    ? ((stats.successful / stats.total) * 100).toFixed(1)
    : '0.0';
  console.log(`\nSuccess rate: ${successRate}%`);

  console.log('═══════════════════════════════════════════════════════════════\n');

  if (stats.failed > 0 && !dryRun) {
    console.log('FAILED RETRIES:\n');
    stats.results
      .filter(r => !r.success)
      .forEach((result, index) => {
        console.log(`${index + 1}. ${result.company_name}`);
        console.log(`   URL: ${result.url}`);
        console.log(`   Error: ${result.error}\n`);
      });
  }

  if (dryRun) {
    console.log('✨ Dry run complete - No uploads were performed\n');
    console.log('To retry failed uploads, run without --dry-run flag\n');
  } else if (stats.successful > 0) {
    console.log(`✅ Successfully uploaded ${stats.successful} lead(s)!\n`);

    if (stats.failed > 0) {
      console.log(`⚠️  ${stats.failed} upload(s) still failed. Check error messages above.\n`);
    }
  } else if (stats.failed > 0) {
    console.log('❌ All retry attempts failed. Check error messages above.\n');
  }
}

// Run retry
retryFailed()
  .then(() => {
    const exitCode = stats.failed > 0 ? 1 : 0;
    process.exit(exitCode);
  })
  .catch((error) => {
    console.error('\n❌ FATAL ERROR:', error);
    process.exit(1);
  });
