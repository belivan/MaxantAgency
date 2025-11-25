#!/usr/bin/env node

/**
 * Backfill Contact Information
 *
 * Extracts emails and phones from business_intelligence.decisionMakerAccessibility.signals
 * and populates the contact_email and contact_phone fields for existing leads.
 *
 * Targets: Pittsburgh Dental 11_24 (22 leads) + Dental 11_7 (47 leads) = 69 total
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

/**
 * Extract email from business intelligence signals array
 */
function extractEmailFromSignals(signals) {
  if (!signals || !Array.isArray(signals)) return null;

  for (const signal of signals) {
    const match = signal.match(/(?:Direct email found|Generic email):\s*([^\s]+@[^\s]+)/i);
    if (match && match[1]) {
      const email = match[1].trim();
      // Validate it's a real email (not an image file)
      if (email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/) && !email.match(/\.(png|jpg|jpeg|gif|svg)$/i)) {
        return email;
      }
    }
  }
  return null;
}

/**
 * Extract phone number from business intelligence signals array
 */
function extractPhoneFromSignals(signals) {
  if (!signals || !Array.isArray(signals)) return null;

  for (const signal of signals) {
    const phoneMatch = signal.match(/\b(\d{3}[-.\s]?\d{3}[-.\s]?\d{4}|\(\d{3}\)\s*\d{3}[-.\s]?\d{4})\b/);
    if (phoneMatch && phoneMatch[1]) {
      return phoneMatch[1];
    }
  }
  return null;
}

async function backfillProject(projectId, projectName) {
  log(`\n${'='.repeat(70)}`, 'bright');
  log(`Backfilling: ${projectName}`, 'bright');
  log('='.repeat(70) + '\n', 'bright');

  // Get all leads for this project
  const { data: leads, error } = await supabase
    .from('leads')
    .select('id, company_name, contact_email, contact_phone, business_intelligence')
    .eq('project_id', projectId);

  if (error) {
    log(`Error fetching leads: ${error.message}`, 'red');
    return { processed: 0, updated: 0, skipped: 0, errors: 0 };
  }

  if (!leads || leads.length === 0) {
    log('No leads found', 'yellow');
    return { processed: 0, updated: 0, skipped: 0, errors: 0 };
  }

  log(`Found ${leads.length} leads\n`, 'cyan');

  let processed = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const lead of leads) {
    processed++;

    try {
      const signals = lead.business_intelligence?.decisionMakerAccessibility?.signals;

      if (!signals || !Array.isArray(signals)) {
        log(`[${processed}/${leads.length}] ${lead.company_name} - No signals data`, 'yellow');
        skipped++;
        continue;
      }

      // Extract contact info from signals
      const extractedEmail = extractEmailFromSignals(signals);
      const extractedPhone = extractPhoneFromSignals(signals);

      // Determine what to update
      const needsEmailUpdate = !lead.contact_email && extractedEmail;
      const needsPhoneUpdate = !lead.contact_phone && extractedPhone;

      if (!needsEmailUpdate && !needsPhoneUpdate) {
        log(`[${processed}/${leads.length}] ${lead.company_name} - Already has contact info`, 'blue');
        skipped++;
        continue;
      }

      // Prepare update data
      const updateData = {};
      if (needsEmailUpdate) updateData.contact_email = extractedEmail;
      if (needsPhoneUpdate) updateData.contact_phone = extractedPhone;

      // Update the lead
      const { error: updateError } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', lead.id);

      if (updateError) {
        log(`[${processed}/${leads.length}] ${lead.company_name} - Update failed: ${updateError.message}`, 'red');
        errors++;
        continue;
      }

      const updates = [];
      if (needsEmailUpdate) updates.push(`📧 ${extractedEmail}`);
      if (needsPhoneUpdate) updates.push(`📞 ${extractedPhone}`);

      log(`[${processed}/${leads.length}] ${lead.company_name} - Updated: ${updates.join(', ')}`, 'green');
      updated++;

    } catch (error) {
      log(`[${processed}/${leads.length}] ${lead.company_name} - Error: ${error.message}`, 'red');
      errors++;
    }
  }

  return { processed, updated, skipped, errors };
}

async function main() {
  log('\n' + '='.repeat(70), 'bright');
  log('Backfill Contact Information from Business Intelligence', 'bright');
  log('='.repeat(70) + '\n', 'bright');

  // Process both projects
  const pittsburghResults = await backfillProject(PITTSBURGH_PROJECT_ID, 'Pittsburgh Dental 11_24');
  const dental117Results = await backfillProject(DENTAL_11_7_PROJECT_ID, 'Dental 11_7');

  // Summary
  log('\n' + '='.repeat(70), 'bright');
  log('BACKFILL COMPLETE', 'bright');
  log('='.repeat(70), 'bright');

  log('\nPittsburgh Dental 11_24:', 'cyan');
  log(`  Processed: ${pittsburghResults.processed}`, 'blue');
  log(`  Updated: ${pittsburghResults.updated}`, 'green');
  log(`  Skipped: ${pittsburghResults.skipped}`, 'yellow');
  if (pittsburghResults.errors > 0) {
    log(`  Errors: ${pittsburghResults.errors}`, 'red');
  }

  log('\nDental 11_7:', 'cyan');
  log(`  Processed: ${dental117Results.processed}`, 'blue');
  log(`  Updated: ${dental117Results.updated}`, 'green');
  log(`  Skipped: ${dental117Results.skipped}`, 'yellow');
  if (dental117Results.errors > 0) {
    log(`  Errors: ${dental117Results.errors}`, 'red');
  }

  log('\nTotal:', 'cyan');
  log(`  Processed: ${pittsburghResults.processed + dental117Results.processed}`, 'blue');
  log(`  Updated: ${pittsburghResults.updated + dental117Results.updated}`, 'green');
  log(`  Skipped: ${pittsburghResults.skipped + dental117Results.skipped}`, 'yellow');
  const totalErrors = pittsburghResults.errors + dental117Results.errors;
  if (totalErrors > 0) {
    log(`  Errors: ${totalErrors}`, 'red');
  }

  log('\n' + '='.repeat(70), 'bright');
  log('', 'reset');
}

main().catch(console.error);
