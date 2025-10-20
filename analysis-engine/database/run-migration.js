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

console.log('🔄 Migration: Add Analysis Engine columns to leads table\n');
console.log('═══════════════════════════════════════════════════════════\n');

// Read the SQL migration file
const sql = fs.readFileSync('./database/migration-add-analysis-columns.sql', 'utf8');

console.log('📝 MANUAL MIGRATION REQUIRED\n');
console.log('Supabase JavaScript client cannot execute DDL statements.');
console.log('Please run the migration manually:\n');
console.log('1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql');
console.log('2. Copy and paste the SQL from: database/migration-add-analysis-columns.sql');
console.log('3. Click "Run"\n');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('💡 OR: Let me check if columns already exist...\n');

// Check if columns already exist
const { data: checkData, error: checkError } = await supabase
  .from('leads')
  .select('design_score, seo_score, content_score, social_score, design_issues, quick_wins')
  .limit(1);

if (checkError) {
  if (checkError.message.includes('column') && checkError.message.includes('does not exist')) {
    console.log('❌ Columns do NOT exist yet. Migration is needed.\n');
    console.log('Copy this SQL and run it in Supabase SQL Editor:\n');
    console.log('─────────────────────────────────────────────────────────');
    console.log(sql);
    console.log('─────────────────────────────────────────────────────────\n');
  } else {
    console.error('❌ Error checking columns:', checkError.message);
  }
  process.exit(1);
} else {
  console.log('✅ Columns already exist! Migration was already run.\n');
  console.log('Verified columns:');
  console.log('  - design_score, seo_score, content_score, social_score');
  console.log('  - design_issues, quick_wins');
  console.log('\n✅ Database is ready for Analysis Engine!\n');

  // Show current lead count
  const { count } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 Current leads in table: ${count}`);

  // Check how many have new analysis data
  const { data: withAnalysis } = await supabase
    .from('leads')
    .select('id')
    .not('design_score', 'is', null);

  console.log(`📊 Leads with Analysis Engine data: ${withAnalysis?.length || 0}\n`);
}
