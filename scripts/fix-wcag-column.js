/**
 * Simple fix for missing accessibility_wcag_level column
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixColumn() {
  console.log('Testing accessibility_wcag_level column...');

  // Try to select the column
  const { data, error } = await supabase
    .from('leads')
    .select('id, accessibility_wcag_level')
    .limit(1);

  if (error && error.message.includes('accessibility_wcag_level')) {
    console.log('❌ Column does not exist. Please add it manually via Supabase dashboard:');
    console.log('\nSQL to run:');
    console.log('ALTER TABLE leads ADD COLUMN accessibility_wcag_level TEXT DEFAULT \'AA\';');
    console.log('\nOr go to: Supabase Dashboard > Table Editor > leads > Add Column');
    console.log('  - Name: accessibility_wcag_level');
    console.log('  - Type: text');
    console.log('  - Default: AA');
  } else if (error) {
    console.log('❌ Other error:', error.message);
  } else {
    console.log('✅ Column exists and is accessible!');
    if (data && data.length > 0) {
      console.log('   Sample value:', data[0].accessibility_wcag_level || 'null');
    }
  }
}

fixColumn().catch(console.error);