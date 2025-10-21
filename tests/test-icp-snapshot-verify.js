/**
 * Quick test to verify icp_brief_snapshot column is recognized
 */

import { supabase } from '../prospecting-engine/database/supabase-client.js';

console.log('\n🔍 Verifying icp_brief_snapshot column...\n');

async function verify() {
  try {
    // Try to query the column
    const { data, error } = await supabase
      .from('prospects')
      .select('id, company_name, icp_brief_snapshot')
      .limit(1);

    if (error) {
      console.error('❌ Column not recognized by Supabase API');
      console.error('   Error:', error.message);
      console.log('\n💡 The column exists in the database but PostgREST cache needs refresh.');
      console.log('   Wait 30-60 seconds or restart your Supabase project.\n');
      process.exit(1);
    }

    console.log('✅ Column recognized by Supabase API!');
    console.log('   Ready to save prospects with ICP snapshots.\n');

    if (data && data.length > 0) {
      console.log('📊 Sample prospect:');
      console.log(`   ID: ${data[0].id}`);
      console.log(`   Company: ${data[0].company_name}`);
      console.log(`   Has snapshot: ${data[0].icp_brief_snapshot !== null}\n`);
    }

    process.exit(0);

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

verify();
