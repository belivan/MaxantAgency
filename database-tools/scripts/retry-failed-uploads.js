#!/usr/bin/env node

/**
 * Cross-Engine Failed Upload Retry Utility
 *
 * Phase 4 tool that retries failed uploads across ALL engines.
 *
 * Scans local-backups directory for all engines:
 * - prospecting-engine: prospects
 * - analysis-engine: leads
 * - outreach-engine: composed_emails, social_outreach (future)
 *
 * For each failed backup:
 * 1. Load the backup file
 * 2. Extract the data object
 * 3. Attempt to upload using engine-specific upload function
 * 4. Move to main directory if successful
 * 5. Keep in failed-uploads if still failing
 *
 * Usage:
 *   node database-tools/scripts/retry-failed-uploads.js                     # All engines
 *   node database-tools/scripts/retry-failed-uploads.js --engine prospecting-engine
 *   node database-tools/scripts/retry-failed-uploads.js --engine analysis-engine
 *   node database-tools/scripts/retry-failed-uploads.js --dry-run          # Preview only
 *   node database-tools/scripts/retry-failed-uploads.js --project-id=<uuid> # For prospecting engine
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { BackupManager } from '../shared/backup-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const projectRoot = join(__dirname, '..', '..');
dotenv.config({ path: join(projectRoot, '.env') });

// Initialize Supabase client (shared across engines)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

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

// Parse CLI arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

let engineFilter = null;
const engineArg = args.find(arg => arg.startsWith('--engine'));
if (engineArg) {
  engineFilter = engineArg.split('=')[1] || args[args.indexOf(engineArg) + 1];
}

let projectId = null;
const projectArg = args.find(arg => arg.startsWith('--project-id'));
if (projectArg) {
  projectId = projectArg.split('=')[1];
}

// Engine configurations
const ENGINE_CONFIGS = {
  'prospecting-engine': {
    name: 'Prospecting Engine',
    subdirectories: ['prospects', 'failed-uploads'],
    uploadFunction: async (backupData) => {
      // Import prospecting engine's saveOrLinkProspect function
      const { saveOrLinkProspect } = await import(
        join(projectRoot, 'prospecting-engine', 'database', 'supabase-client.js')
      );

      const prospectData = backupData.data || backupData.prospect_data;
      if (!prospectData) {
        throw new Error('No prospect_data found in backup');
      }

      return await saveOrLinkProspect(
        prospectData,
        projectId || backupData.project_id || null,
        {
          run_id: backupData.run_id,
          discovery_query: backupData.discovery_query,
          query_generation_model: backupData.query_generation_model,
          icp_brief_snapshot: backupData.icp_brief_snapshot,
          prompts_snapshot: backupData.prompts_snapshot,
          model_selections_snapshot: backupData.model_selections_snapshot,
          relevance_reasoning: backupData.relevance_reasoning,
          discovery_cost_usd: backupData.discovery_cost_usd,
          discovery_time_ms: backupData.discovery_time_ms
        }
      );
    }
  },

  'analysis-engine': {
    name: 'Analysis Engine',
    subdirectories: ['leads', 'failed-uploads'],
    uploadFunction: async (backupData) => {
      const leadData = backupData.lead_data || backupData.data?.lead_data;
      if (!leadData) {
        throw new Error('No lead_data found in backup');
      }

      // Use upsert to handle duplicates
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
  }

  // Future: outreach-engine configuration
  // 'outreach-engine': {
  //   name: 'Outreach Engine',
  //   subdirectories: ['composed_emails', 'social_outreach', 'failed-uploads'],
  //   uploadFunction: async (backupData) => { ... }
  // }
};

// Statistics tracking
const stats = {
  totalFailed: 0,
  totalUploaded: 0,
  totalStillFailing: 0,
  byEngine: {}
};

/**
 * Retry failed uploads for a specific engine
 */
async function retryEngineFailedUploads(engineName, config) {
  console.log(`${colors.bright}${config.name}:${colors.reset}`);

  // Initialize backup manager for this engine
  const backupMgr = new BackupManager(engineName, {
    subdirectories: config.subdirectories,
    projectRoot
  });

  // Get all failed uploads for this engine
  const failedUploads = await backupMgr.getFailedUploads();

  if (failedUploads.length === 0) {
    console.log(`  ${colors.gray}No failed uploads found${colors.reset}\n`);
    return {
      total: 0,
      uploaded: 0,
      stillFailing: 0,
      results: []
    };
  }

  console.log(`  Found ${failedUploads.length} failed upload(s)\n`);

  const results = {
    total: failedUploads.length,
    uploaded: 0,
    stillFailing: 0,
    results: []
  };

  stats.byEngine[engineName] = results;

  // Retry each failed upload
  for (let i = 0; i < failedUploads.length; i++) {
    const upload = failedUploads[i];
    const companyName = upload.company_name || upload.data?.company_name || 'Unknown';
    const filename = upload.filename;

    // Extract just the filename without .json
    const displayName = filename.replace('.json', '').substring(0, 50);

    if (dryRun) {
      console.log(`  ${colors.yellow}[DRY RUN]${colors.reset} ${displayName}`);
      console.log(`    Would attempt upload for: ${companyName}`);
      console.log(`    Original error: ${upload.upload_error?.substring(0, 80) || 'Unknown'}...`);
      console.log();
      continue;
    }

    try {
      // Attempt retry using engine-specific upload function
      const success = await backupMgr.retryFailedUpload(
        upload.filepath,
        config.uploadFunction
      );

      if (success) {
        results.uploaded++;
        stats.totalUploaded++;

        console.log(`  ${colors.green}✅${colors.reset} ${displayName} → Uploaded successfully`);

        results.results.push({
          success: true,
          filename,
          company: companyName
        });
      } else {
        results.stillFailing++;
        stats.totalStillFailing++;

        console.log(`  ${colors.red}❌${colors.reset} ${displayName} → Still failing (upload returned false)`);

        results.results.push({
          success: false,
          filename,
          company: companyName,
          error: 'Upload function returned false'
        });
      }
    } catch (error) {
      results.stillFailing++;
      stats.totalStillFailing++;

      console.log(`  ${colors.red}❌${colors.reset} ${displayName} → Still failing (${error.message.substring(0, 50)}...)`);

      results.results.push({
        success: false,
        filename,
        company: companyName,
        error: error.message
      });
    }

    // Small delay between retries to avoid rate limiting
    if (i < failedUploads.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  console.log();
  return results;
}

/**
 * Main execution
 */
async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  RETRY FAILED UPLOADS                                          ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  if (dryRun) {
    console.log(`${colors.cyan}🔍 DRY RUN MODE - No uploads will be performed${colors.reset}\n`);
  }

  if (engineFilter) {
    console.log(`${colors.cyan}🔍 Engine Filter: ${engineFilter}${colors.reset}\n`);
  }

  if (projectId) {
    console.log(`${colors.cyan}🎯 Project ID: ${projectId}${colors.reset}\n`);
  }

  console.log('Scanning failed-uploads directories...\n');

  // Determine which engines to process
  const enginesToProcess = engineFilter
    ? { [engineFilter]: ENGINE_CONFIGS[engineFilter] }
    : ENGINE_CONFIGS;

  // Validate engine filter
  if (engineFilter && !ENGINE_CONFIGS[engineFilter]) {
    console.error(`${colors.red}Error: Unknown engine "${engineFilter}"${colors.reset}`);
    console.log(`\nAvailable engines: ${Object.keys(ENGINE_CONFIGS).join(', ')}\n`);
    process.exit(1);
  }

  // Check if centralized local-backups directory exists
  const backupRoot = join(projectRoot, 'local-backups');
  if (!existsSync(backupRoot)) {
    console.log(`${colors.yellow}No local-backups directory found at: ${backupRoot}${colors.reset}\n`);
    console.log('No failed uploads to retry.\n');
    process.exit(0);
  }

  // Process each engine
  for (const [engineName, config] of Object.entries(enginesToProcess)) {
    const engineBackupDir = join(backupRoot, engineName);

    // Skip if engine backup directory doesn't exist
    if (!existsSync(engineBackupDir)) {
      console.log(`${colors.gray}${config.name}: No backup directory found${colors.reset}\n`);

      // Check for old location (engine-specific local-backups/)
      const oldLocationDir = join(projectRoot, engineName, 'local-backups', 'failed-uploads');
      if (existsSync(oldLocationDir)) {
        console.log(`${colors.yellow}  Note: Found backups in old location: ${engineName}/local-backups/failed-uploads/${colors.reset}`);
        console.log(`  ${colors.yellow}These backups need to be migrated to centralized location first.${colors.reset}\n`);
      }

      continue;
    }

    const failedDir = join(engineBackupDir, 'failed-uploads');

    // Skip if no failed-uploads directory
    if (!existsSync(failedDir)) {
      console.log(`${colors.gray}${config.name}: No failed-uploads directory${colors.reset}\n`);

      // Check for old location
      const oldLocationDir = join(projectRoot, engineName, 'local-backups', 'failed-uploads');
      if (existsSync(oldLocationDir)) {
        console.log(`${colors.yellow}  Note: Found backups in old location: ${engineName}/local-backups/failed-uploads/${colors.reset}`);
        console.log(`  ${colors.yellow}These backups need to be migrated to centralized location first.${colors.reset}\n`);
      }

      continue;
    }

    // Retry failed uploads for this engine
    const engineResults = await retryEngineFailedUploads(engineName, config);
    stats.totalFailed += engineResults.total;
  }

  // Print summary
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('RESULTS:');
  console.log(`  Total Failed: ${stats.totalFailed}`);

  if (dryRun) {
    console.log(`  ${colors.yellow}[DRY RUN]${colors.reset} No changes made`);
  } else {
    console.log(`  ${colors.green}✅ Uploaded: ${stats.totalUploaded}${colors.reset}`);
    console.log(`  ${colors.red}❌ Still Failing: ${stats.totalStillFailing}${colors.reset}`);

    if (stats.totalFailed > 0) {
      const successRate = ((stats.totalUploaded / stats.totalFailed) * 100).toFixed(1);
      console.log(`  Success Rate: ${successRate}%`);
    }
  }

  console.log('═══════════════════════════════════════════════════════════════\n');

  // Print detailed failures if any
  if (!dryRun && stats.totalStillFailing > 0) {
    console.log(`${colors.bright}${colors.red}STILL FAILING:${colors.reset}\n`);

    for (const [engineName, engineResults] of Object.entries(stats.byEngine)) {
      const stillFailing = engineResults.results.filter(r => !r.success);

      if (stillFailing.length > 0) {
        const config = ENGINE_CONFIGS[engineName];
        console.log(`${colors.bright}${config.name}:${colors.reset}`);

        stillFailing.forEach((result, index) => {
          console.log(`  ${index + 1}. ${result.company || 'Unknown'}`);
          console.log(`     File: ${result.filename}`);
          console.log(`     Error: ${result.error?.substring(0, 100) || 'Unknown'}...`);
          console.log();
        });
      }
    }
  }

  // Exit with appropriate code
  if (dryRun) {
    console.log(`${colors.cyan}Dry run complete. Run without --dry-run to retry uploads.${colors.reset}\n`);
    process.exit(0);
  } else if (stats.totalFailed === 0) {
    console.log(`${colors.green}No failed uploads found!${colors.reset}\n`);
    process.exit(0);
  } else if (stats.totalStillFailing > 0) {
    console.log(`${colors.yellow}⚠️  Some uploads still failing. Check errors above.${colors.reset}\n`);
    process.exit(1);
  } else {
    console.log(`${colors.green}✅ All failed uploads successfully retried!${colors.reset}\n`);
    process.exit(0);
  }
}

// Run the script
main().catch((error) => {
  console.error(`\n${colors.red}❌ FATAL ERROR:${colors.reset}`, error);
  console.error(error.stack);
  process.exit(1);
});