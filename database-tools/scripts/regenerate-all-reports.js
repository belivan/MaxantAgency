#!/usr/bin/env node

/**
 * Regenerate All Reports
 *
 * Queues PDF regeneration for both Pittsburgh Dental 11_24 and Dental 11_7 projects
 * to include newly backfilled contact information (emails and phones).
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const PITTSBURGH_PROJECT_ID = 'a4bba02c-9a9b-459c-972d-d98016f34d94';
const DENTAL_11_7_PROJECT_ID = 'b9c9f0f3-ee36-467a-996e-dd8e684475d0';
const REPORT_ENGINE_URL = 'http://localhost:3003';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function regenerateProjectReports(projectId, projectName) {
  log(`\n${'='.repeat(70)}`, 'bright');
  log(`Regenerating: ${projectName}`, 'bright');
  log('='.repeat(70) + '\n', 'bright');

  // Get all leads for this project
  const { data: leads, error } = await supabase
    .from('leads')
    .select('id, company_name, website_grade')
    .eq('project_id', projectId);

  if (error) {
    log(`Error fetching leads: ${error.message}`, 'red');
    return { processed: 0, success: 0, failed: 0 };
  }

  if (!leads || leads.length === 0) {
    log('No leads found', 'yellow');
    return { processed: 0, success: 0, failed: 0 };
  }

  log(`Found ${leads.length} leads to regenerate\n`, 'cyan');

  let processed = 0;
  let success = 0;
  let failed = 0;

  for (const lead of leads) {
    processed++;

    try {
      const response = await fetch(`${REPORT_ENGINE_URL}/api/generate-queue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: lead.id })
      });

      const result = await response.json();

      if (result.success) {
        success++;
        log(`✅ [${processed}/${leads.length}] ${lead.company_name} (Grade ${lead.website_grade})`, 'green');
      } else {
        failed++;
        log(`❌ [${processed}/${leads.length}] ${lead.company_name} - ${result.error}`, 'red');
      }
    } catch (error) {
      failed++;
      log(`❌ [${processed}/${leads.length}] ${lead.company_name} - ${error.message}`, 'red');
    }
  }

  return { processed, success, failed };
}

async function main() {
  log('\n' + '='.repeat(70), 'bright');
  log('Regenerate All Reports with Contact Information', 'bright');
  log('='.repeat(70) + '\n', 'bright');

  // Check if Report Engine is running
  try {
    const healthCheck = await fetch(`${REPORT_ENGINE_URL}/health`);
    if (!healthCheck.ok) {
      log('Report Engine is not responding!', 'red');
      log('Please start it with: npm run dev:reports', 'yellow');
      process.exit(1);
    }
    log('✅ Report Engine is running\n', 'green');
  } catch (error) {
    log('Report Engine is not running!', 'red');
    log('Please start it with: npm run dev:reports', 'yellow');
    process.exit(1);
  }

  // Regenerate both projects
  const pittsburghResults = await regenerateProjectReports(PITTSBURGH_PROJECT_ID, 'Pittsburgh Dental 11_24');
  const dental117Results = await regenerateProjectReports(DENTAL_11_7_PROJECT_ID, 'Dental 11_7');

  // Summary
  log('\n' + '='.repeat(70), 'bright');
  log('REGENERATION QUEUED', 'bright');
  log('='.repeat(70), 'bright');

  log('\nPittsburgh Dental 11_24:', 'cyan');
  log(`  Total: ${pittsburghResults.processed}`, 'blue');
  log(`  Queued: ${pittsburghResults.success}`, 'green');
  if (pittsburghResults.failed > 0) {
    log(`  Failed: ${pittsburghResults.failed}`, 'red');
  }

  log('\nDental 11_7:', 'cyan');
  log(`  Total: ${dental117Results.processed}`, 'blue');
  log(`  Queued: ${dental117Results.success}`, 'green');
  if (dental117Results.failed > 0) {
    log(`  Failed: ${dental117Results.failed}`, 'red');
  }

  log('\nTotal:', 'cyan');
  log(`  Total Reports: ${pittsburghResults.processed + dental117Results.processed}`, 'blue');
  log(`  Successfully Queued: ${pittsburghResults.success + dental117Results.success}`, 'green');
  const totalFailed = pittsburghResults.failed + dental117Results.failed;
  if (totalFailed > 0) {
    log(`  Failed: ${totalFailed}`, 'red');
  }

  log('\n📊 Reports will complete in ~2-3 minutes per report', 'yellow');
  log(`⏱️  Estimated completion time: ~${Math.round((pittsburghResults.success + dental117Results.success) * 2.5)} minutes\n`, 'yellow');

  log('='.repeat(70), 'bright');
  log('', 'reset');
}

main().catch(console.error);
