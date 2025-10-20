/**
 * Run migration to add Analysis Engine columns to leads table
 *
 * NOTE: Supabase client can't execute ALTER TABLE via JavaScript.
 * This script provides instructions and validates the migration.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

console.log('🔄 Migration: Add state column to leads table\n');
console.log('═══════════════════════════════════════════════════════════\n');

// SQL to add state column
const sql = `-- Add state column to leads table
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS state TEXT;

COMMENT ON COLUMN leads.state IS 'Business state (NY, CA, etc.)';`;

console.log('💡 Checking if state column exists...\n');

// Check if state column exists
const { data: checkData, error: checkError } = await supabase
  .from('leads')
  .select('state')
  .limit(1);

if (checkError) {
  if (checkError.message.includes('column') && checkError.message.includes('does not exist')) {
    console.log('❌ State column does NOT exist yet. Migration is needed.\n');
    console.log('📝 MANUAL MIGRATION REQUIRED\n');
    console.log('Supabase JavaScript client cannot execute DDL statements.');
    console.log('Please run the migration manually:\n');
    console.log('1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql');
    console.log('2. Copy and paste this SQL:\n');
    console.log('─────────────────────────────────────────────────────────');
    console.log(sql);
    console.log('─────────────────────────────────────────────────────────\n');
    console.log('3. Click "Run"');
    console.log('4. Refresh schema cache (optional)\n');
  } else {
    console.error('❌ Error checking column:', checkError.message);
  }
  process.exit(1);
} else {
  console.log('✅ State column already exists! Migration was already run.\n');
  console.log('\n✅ Database is ready for Analysis Engine!\n');

  // Show current lead count
  const { count } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 Current leads in table: ${count}\n`);
}
