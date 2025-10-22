#!/usr/bin/env node

/**
 * Retry Failed Prospect Uploads
 *
 * This script retries uploading all prospects that failed to save to the database.
 * Failed prospects are stored in local-backups/prospecting-engine/failed-uploads/
 *
 * Usage:
 *   node scripts/retry-failed-prospects.js
 *   node scripts/retry-failed-prospects.js --dry-run  # Preview only
 *   node scripts/retry-failed-prospects.js --project-id=<uuid>  # Retry for specific project
 */

import { getFailedUploads, retryFailedUpload } from '../utils/local-backup.js';
import { saveOrLinkProspect } from '../database/supabase-client.js';
import { logInfo, logError, logWarn } from '../shared/logger.js';

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const projectIdArg = args.find(arg => arg.startsWith('--project-id='));
const projectId = projectIdArg ? projectIdArg.split('=')[1] : null;

/**
 * Main retry function
 */
async function retryFailedProspects() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  RETRY FAILED PROSPECT UPLOADS                                 ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  if (isDryRun) {
    console.log('🔍 DRY RUN MODE: No changes will be made\n');
  }

  if (projectId) {
    console.log(`🎯 Project ID: ${projectId}\n`);
  }

  try {
    // Get all failed uploads
    logInfo('Fetching failed uploads');
    const failedUploads = await getFailedUploads();

    if (failedUploads.length === 0) {
      console.log('✅ No failed uploads found!\n');
      return;
    }

    console.log(`Found ${failedUploads.length} failed upload(s)\n`);

    // Display failed uploads
    console.log('Failed uploads:');
    failedUploads.forEach((upload, index) => {
      console.log(`  ${index + 1}. ${upload.company_name || 'Unknown'}`);
      console.log(`     File: ${upload.filename}`);
      console.log(`     Failed at: ${upload.failed_at || 'Unknown'}`);
      console.log(`     Error: ${upload.upload_error?.substring(0, 80) || 'Unknown error'}...\n`);
    });

    if (isDryRun) {
      console.log('🔍 Dry run complete. Run without --dry-run to retry uploads.\n');
      return;
    }

    // Retry each failed upload
    console.log('Starting retry process...\n');

    const results = {
      successful: 0,
      failed: 0,
      details: []
    };

    for (let i = 0; i < failedUploads.length; i++) {
      const upload = failedUploads[i];
      const companyName = upload.company_name || upload.data?.company_name || 'Unknown';

      console.log(`[${i + 1}/${failedUploads.length}] Retrying: ${companyName}`);

      try {
        // Upload function to pass to retryFailedUpload
        const uploadFn = async (prospectData) => {
          return await saveOrLinkProspect(
            prospectData,
            projectId, // Use provided project ID or null
            {
              run_id: prospectData.run_id,
              // Preserve metadata if it exists
              discovery_query: upload.discovery_query,
              query_generation_model: upload.query_generation_model,
              icp_brief_snapshot: upload.icp_brief_snapshot,
              relevance_reasoning: upload.relevance_reasoning
            }
          );
        };

        // Retry the upload
        const success = await retryFailedUpload(upload.filepath, uploadFn);

        if (success) {
          results.successful++;
          results.details.push({
            success: true,
            company: companyName,
            filename: upload.filename
          });
          console.log(`  ✅ Success!\n`);
        } else {
          results.failed++;
          results.details.push({
            success: false,
            company: companyName,
            filename: upload.filename,
            error: 'Upload function returned false'
          });
          console.log(`  ❌ Failed (no result returned)\n`);
        }

      } catch (error) {
        results.failed++;
        results.details.push({
          success: false,
          company: companyName,
          filename: upload.filename,
          error: error.message
        });
        logError('Retry failed', error, { company: companyName });
        console.log(`  ❌ Failed: ${error.message}\n`);
      }

      // Small delay between retries to avoid rate limiting
      if (i < failedUploads.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Print summary
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('RETRY SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Total attempts: ${failedUploads.length}`);
    console.log(`✅ Successful: ${results.successful}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`Success rate: ${((results.successful / failedUploads.length) * 100).toFixed(1)}%`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Exit with appropriate code
    if (results.failed > 0) {
      console.log('⚠️  Some retries failed. Check logs for details.\n');
      process.exit(1);
    } else {
      console.log('✅ All retries successful!\n');
      process.exit(0);
    }

  } catch (error) {
    logError('Retry script failed', error);
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run the script
retryFailedProspects();
