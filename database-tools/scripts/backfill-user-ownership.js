/**
 * Backfill User Ownership Migration Script
 *
 * This script assigns all existing data to the owner user (anton.yanovich@hotmail.com)
 * and calculates initial usage counts.
 *
 * Run AFTER:
 * 1. Users table is created
 * 2. user_id columns are added to all tables
 * 3. Owner user record exists in users table
 *
 * Usage:
 *   node database-tools/scripts/backfill-user-ownership.js
 *
 * Options:
 *   --dry-run    Preview changes without executing
 *   --verbose    Show detailed progress
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });
dotenv.config({ path: join(__dirname, '../.env') });

const OWNER_EMAIL = 'anton.yanovich@hotmail.com';

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isVerbose = args.includes('--verbose');

function log(message, level = 'info') {
  const prefix = {
    info: '\x1b[36mℹ\x1b[0m',
    success: '\x1b[32m✓\x1b[0m',
    warning: '\x1b[33m⚠\x1b[0m',
    error: '\x1b[31m✗\x1b[0m',
  };
  console.log(`${prefix[level] || '•'} ${message}`);
}

function verbose(message) {
  if (isVerbose) {
    console.log(`  ${message}`);
  }
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    log('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables', 'error');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('\n========================================');
  console.log('  Backfill User Ownership Migration');
  console.log('========================================\n');

  if (isDryRun) {
    log('DRY RUN MODE - No changes will be made', 'warning');
  }

  // Step 1: Find or create owner user
  log(`Looking for owner user: ${OWNER_EMAIL}`);

  let { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('email', OWNER_EMAIL)
    .single();

  if (userError || !user) {
    log(`Owner user not found. Please ensure ${OWNER_EMAIL} has signed up via Clerk first.`, 'error');
    log('Alternatively, create the user manually:', 'info');
    console.log(`
INSERT INTO users (clerk_id, email, tier, usage_prospects, usage_analyses, usage_reports, usage_outreach)
VALUES ('user_YOUR_CLERK_ID', '${OWNER_EMAIL}', 'full', 0, 0, 0, 0);
    `);
    process.exit(1);
  }

  log(`Found owner user: ${user.email} (ID: ${user.id})`, 'success');
  verbose(`  Clerk ID: ${user.clerk_id}`);
  verbose(`  Tier: ${user.tier}`);

  // Step 2: Count existing records
  log('Counting existing records...');

  const tables = [
    { name: 'projects', countField: null },
    { name: 'prospects', countField: 'prospects' },
    { name: 'leads', countField: 'analyses' },
    { name: 'composed_outreach', countField: 'outreach' },
    { name: 'reports', countField: 'reports' },
    { name: 'page_analyses', countField: null },
  ];

  const counts = {};
  const usageCounts = {
    prospects: 0,
    analyses: 0,
    reports: 0,
    outreach: 0,
  };

  for (const table of tables) {
    const { count, error } = await supabase
      .from(table.name)
      .select('*', { count: 'exact', head: true })
      .is('user_id', null);

    if (error) {
      log(`Error counting ${table.name}: ${error.message}`, 'error');
      counts[table.name] = 0;
    } else {
      counts[table.name] = count || 0;
      if (table.countField && count) {
        usageCounts[table.countField] = count;
      }
    }

    verbose(`  ${table.name}: ${counts[table.name]} records without user_id`);
  }

  const totalRecords = Object.values(counts).reduce((a, b) => a + b, 0);
  log(`Found ${totalRecords} total records to update`, 'info');

  if (totalRecords === 0) {
    log('No records need updating. Migration complete!', 'success');
    return;
  }

  // Step 3: Update records
  if (!isDryRun) {
    log('Updating records with user_id...');

    for (const table of tables) {
      if (counts[table.name] === 0) {
        verbose(`  Skipping ${table.name} (no records)`);
        continue;
      }

      const { error } = await supabase
        .from(table.name)
        .update({ user_id: user.id })
        .is('user_id', null);

      if (error) {
        log(`Error updating ${table.name}: ${error.message}`, 'error');
      } else {
        log(`Updated ${counts[table.name]} records in ${table.name}`, 'success');
      }
    }

    // Step 4: Update user tier to 'full' and set usage counts
    log('Setting owner user to full tier with usage counts...');

    const { error: updateError } = await supabase
      .from('users')
      .update({
        tier: 'full',
        usage_prospects: usageCounts.prospects,
        usage_analyses: usageCounts.analyses,
        usage_reports: usageCounts.reports,
        usage_outreach: usageCounts.outreach,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      log(`Error updating user: ${updateError.message}`, 'error');
    } else {
      log('Owner user updated successfully', 'success');
      verbose(`  Tier: full`);
      verbose(`  Usage - Prospects: ${usageCounts.prospects}`);
      verbose(`  Usage - Analyses: ${usageCounts.analyses}`);
      verbose(`  Usage - Reports: ${usageCounts.reports}`);
      verbose(`  Usage - Outreach: ${usageCounts.outreach}`);
    }
  } else {
    log('Would update the following:', 'info');
    for (const table of tables) {
      if (counts[table.name] > 0) {
        console.log(`  - ${table.name}: ${counts[table.name]} records`);
      }
    }
    console.log(`  - users: Set tier='full', update usage counts`);
  }

  console.log('\n========================================');
  log('Migration complete!', 'success');
  console.log('========================================\n');
}

main().catch((error) => {
  log(`Migration failed: ${error.message}`, 'error');
  console.error(error);
  process.exit(1);
});
