/**
 * Test ICP Brief Snapshot Saving
 * Verifies that prospects are being saved with icp_brief_snapshot
 */

import { supabase } from './prospecting-engine/database/supabase-client.js';

console.log('\n📋 ICP BRIEF SNAPSHOT TEST\n');
console.log('='.repeat(60));

async function testSnapshotSaving() {
  try {
    // Query the most recent prospect
    const { data, error } = await supabase
      .from('prospects')
      .select('id, company_name, icp_brief_snapshot, created_at')
      .order('created_at', { ascending: false })
      .limit(3);

    if (error) {
      console.error('❌ Error querying prospects:', error.message);
      process.exit(1);
    }

    if (!data || data.length === 0) {
      console.log('📭 No prospects found in database');
      console.log('   Generate some prospects first to test ICP snapshot saving\n');
      process.exit(0);
    }

    console.log(`\n✅ Found ${data.length} recent prospect(s):\n`);

    let snapshotCount = 0;

    for (const prospect of data) {
      console.log(`📌 ${prospect.company_name}`);
      console.log(`   ID: ${prospect.id}`);
      console.log(`   Created: ${new Date(prospect.created_at).toLocaleString()}`);

      if (prospect.icp_brief_snapshot) {
        snapshotCount++;
        console.log('   ✅ Has ICP Snapshot:');
        console.log(`      Industry: ${prospect.icp_brief_snapshot.industry || 'N/A'}`);
        console.log(`      Location: ${prospect.icp_brief_snapshot.location || prospect.icp_brief_snapshot.city || 'N/A'}`);

        if (prospect.icp_brief_snapshot.business_size) {
          console.log(`      Business Size: ${prospect.icp_brief_snapshot.business_size}`);
        }
        if (prospect.icp_brief_snapshot.revenue_range) {
          console.log(`      Revenue Range: ${prospect.icp_brief_snapshot.revenue_range}`);
        }
      } else {
        console.log('   ⚠️  No ICP snapshot (created before update)');
      }
      console.log('');
    }

    console.log('='.repeat(60));
    console.log(`\n📊 Summary: ${snapshotCount}/${data.length} prospects have ICP snapshots`);

    if (snapshotCount === 0) {
      console.log('\n⚠️  To test the new feature, generate prospects after the update:');
      console.log('   1. Create or select a project with ICP brief');
      console.log('   2. Run prospecting with projectId in options');
      console.log('   3. Check that new prospects have icp_brief_snapshot\n');
    } else {
      console.log('\n✅ ICP snapshot saving is working!\n');
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    process.exit(1);
  }
}

testSnapshotSaving();
