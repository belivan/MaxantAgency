/**
 * Reload Supabase Schema Cache
 *
 * After adding new columns to the database, Supabase's PostgREST caches
 * the schema and needs to be reloaded.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function reloadCache() {
  console.log('🔄 Reloading Supabase schema cache...\n');

  try {
    // Method 1: Use rpc to reload schema cache
    const { data, error } = await supabase.rpc('pgrst_schema_cache_reload');

    if (error) {
      console.log('⚠️  RPC reload failed (may not be available):', error.message);
      console.log('\n📋 Manual reload instructions:');
      console.log('   1. Go to: https://supabase.com/dashboard/project/your-project-id/api');
      console.log('   2. Click "Restart" on the PostgREST instance');
      console.log('   3. Wait 10-15 seconds for cache to reload');
      console.log('\nOR run this SQL query in the SQL Editor:');
      console.log('   NOTIFY pgrst, \'reload schema\';');
    } else {
      console.log('✅ Schema cache reloaded successfully!');
    }

    // Method 2: Try querying the leads table to see if columns exist
    console.log('\n🔍 Verifying columns exist in database...');

    const { data: testData, error: testError } = await supabase
      .from('leads')
      .select('matched_benchmark_id, matched_benchmark_data')
      .limit(1);

    if (testError) {
      console.log('❌ Columns do not exist or cache not updated:', testError.message);
      console.log('\n💡 Solution: Run database migration first:');
      console.log('   cd database-tools && npm run db:setup');
    } else {
      console.log('✅ Columns exist and are accessible!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

reloadCache();
