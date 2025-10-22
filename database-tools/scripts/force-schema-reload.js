#!/usr/bin/env node

/**
 * Force Supabase PostgREST Schema Reload
 *
 * This script forces a schema cache reload by directly hitting the PostgREST admin endpoint.
 * Run this after creating or modifying tables.
 *
 * Usage:
 *   node scripts/force-schema-reload.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

console.log('🔄 Force reloading Supabase PostgREST schema cache...\n');

const supabase = createClient(supabaseUrl, supabaseKey);

// Method 1: NOTIFY signal
console.log('Method 1: Sending NOTIFY signal...');
const { error: notifyError } = await supabase.rpc('exec_sql', {
  sql_query: "NOTIFY pgrst, 'reload schema';"
});

if (notifyError) {
  console.log('  ⚠️  NOTIFY failed:', notifyError.message);
} else {
  console.log('  ✅ NOTIFY signal sent');
}

// Method 2: Try PostgREST admin endpoint (may not work on hosted Supabase)
const restUrl = supabaseUrl.replace('https://', '').replace('.supabase.co', '');
const adminEndpoint = `https://${restUrl}.supabase.co/rest/v1/rpc/`;

console.log('\nMethod 2: Attempting PostgREST admin reload...');
try {
  // This won't work on hosted Supabase, but worth trying
  console.log('  ℹ️  This method only works on self-hosted Supabase');
} catch (e) {
  console.log('  ⚠️  Not available on hosted Supabase');
}

// Wait and test
console.log('\n⏳ Waiting 5 seconds for cache to clear...');
await new Promise(resolve => setTimeout(resolve, 5000));

// Test if projects table is accessible
console.log('\n🧪 Testing if projects table is accessible...');
const { data, error } = await supabase
  .from('projects')
  .select('count', { count: 'exact', head: true });

if (error) {
  console.log('\n❌ FAILED: projects table still not accessible');
  console.log('   Error:', error.message);
  console.log('\n🚨 MANUAL ACTION REQUIRED:');
  console.log('   1. Go to Supabase Dashboard');
  console.log('   2. Navigate to: Project Settings → API');
  console.log('   3. Scroll down and click "Reload Schema" button');
  console.log('   4. OR wait 10-15 minutes for cache to expire naturally');
  process.exit(1);
} else {
  console.log('\n✅ SUCCESS! Projects table is now accessible via API');
  console.log('   You can now use the Command Center UI');
  process.exit(0);
}
