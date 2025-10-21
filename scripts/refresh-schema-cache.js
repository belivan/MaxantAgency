/**
 * Refresh Supabase PostgREST Schema Cache
 * Tells Supabase to recognize newly added database columns
 */

import { supabase } from './prospecting-engine/database/supabase-client.js';

console.log('\n🔄 Refreshing Supabase Schema Cache\n');
console.log('='.repeat(60));

async function refreshSchema() {
  try {
    // Send NOTIFY signal to PostgREST to reload schema
    const { data, error } = await supabase.rpc('pgrst_watch');

    if (error && error.code !== '42883') { // 42883 = function does not exist
      console.log('⚠️  pgrst_watch function not available, trying alternative method...\n');
    }

    // Alternative: Just query the table to force schema check
    console.log('Querying prospects table to trigger schema refresh...');

    const { data: test, error: testError } = await supabase
      .from('prospects')
      .select('id, company_name, icp_brief_snapshot')
      .limit(1);

    if (testError) {
      if (testError.message.includes('icp_brief_snapshot')) {
        console.error('❌ Column still not recognized in schema cache!');
        console.error('   Error:', testError.message);
        console.log('\n📝 Manual Steps Required:');
        console.log('   1. Go to Supabase Dashboard');
        console.log('   2. Navigate to API Docs or Settings');
        console.log('   3. Click "Reload Schema" or restart PostgREST');
        console.log('   4. OR wait ~30 seconds for automatic cache refresh\n');
        process.exit(1);
      }
      throw testError;
    }

    console.log('✅ Schema cache refreshed successfully!');
    console.log('   Column "icp_brief_snapshot" is now recognized\n');

    if (test && test.length > 0) {
      console.log('📊 Sample prospect:');
      console.log(`   Company: ${test[0].company_name}`);
      console.log(`   Has ICP snapshot: ${test[0].icp_brief_snapshot !== null}\n`);
    }

    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

console.log('Note: Supabase PostgREST caches table schemas for performance.');
console.log('After adding new columns, the cache must be refreshed.\n');

refreshSchema();
