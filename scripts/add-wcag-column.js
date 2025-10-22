/**
 * Add missing accessibility_wcag_level column to leads table
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

async function addColumn() {
  console.log('Adding accessibility_wcag_level column to leads table...');

  // First check if column exists
  const { data: columns, error: checkError } = await supabase.rpc('get_column_info', {
    table_name: 'leads',
    column_name: 'accessibility_wcag_level'
  }).catch(async (err) => {
    // If the RPC doesn't exist, try another approach
    console.log('Trying direct SQL approach...');

    const { data, error } = await supabase.rpc('query', {
      query_text: `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'leads'
        AND column_name = 'accessibility_wcag_level'
      `
    }).catch(() => {
      // If that doesn't work either, just try to add the column
      return { data: null, error: null };
    });

    return { data, error };
  });

  // Try to add the column
  const { error: alterError } = await supabase.rpc('query', {
    query_text: `
      ALTER TABLE leads
      ADD COLUMN IF NOT EXISTS accessibility_wcag_level TEXT DEFAULT 'AA'
    `
  }).catch(async () => {
    // If RPC doesn't work, try direct SQL via the REST API
    console.log('Using direct SQL via REST API...');

    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/sql`, {
      method: 'POST',
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: `ALTER TABLE leads ADD COLUMN IF NOT EXISTS accessibility_wcag_level TEXT DEFAULT 'AA'`
      })
    }).catch(() => null);

    if (response && response.ok) {
      return { error: null };
    }

    // If all else fails, try a simple insert test
    return { error: 'Could not alter table' };
  });

  if (!alterError) {
    console.log('✅ Column added successfully (or already exists)');
  } else {
    console.log('⚠️  Could not add column via RPC. The column might already exist.');
    console.log('    You may need to add it manually via Supabase dashboard:');
    console.log('    ALTER TABLE leads ADD COLUMN accessibility_wcag_level TEXT DEFAULT \'AA\';');
  }

  // Test if we can select the column
  console.log('\nTesting column access...');
  const { data: testData, error: testError } = await supabase
    .from('leads')
    .select('id, accessibility_wcag_level')
    .limit(1);

  if (!testError) {
    console.log('✅ Column is accessible');
  } else {
    console.log('❌ Column not accessible:', testError.message);
  }
}

addColumn().catch(console.error);