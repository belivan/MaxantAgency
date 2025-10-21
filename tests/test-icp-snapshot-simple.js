/**
 * Simple test for ICP Brief Snapshot
 * Directly tests the prospect saving with ICP snapshot
 */

import { supabase } from './prospecting-engine/database/supabase-client.js';
import { getProjectIcpBrief, saveOrLinkProspect } from './prospecting-engine/database/supabase-client.js';

console.log('\n🔒 ICP BRIEF SNAPSHOT SIMPLE TEST\n');
console.log('='.repeat(70));

async function runTest() {
  try {
    // Step 1: Create a test project with ICP brief
    console.log('\n📝 Step 1: Create test project with ICP brief');

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        name: `ICP Snapshot Test ${Date.now()}`,
        description: 'Direct database test of ICP snapshot',
        budget: 300,
        icp_brief: {
          industry: 'Home Services',
          location: 'Austin, TX',
          business_size: '1-10 employees',
          revenue_range: '$100K-$500K',
          criteria: {
            has_website: true,
            missing_seo: true
          }
        }
      })
      .select()
      .single();

    if (projectError) {
      throw new Error(`Failed to create project: ${projectError.message}`);
    }

    console.log(`✅ Created project: ${project.name}`);
    console.log(`   ID: ${project.id}`);
    console.log(`   ICP Industry: ${project.icp_brief.industry}`);
    console.log(`   ICP Location: ${project.icp_brief.location}`);

    // Step 2: Fetch the ICP brief using our new function
    console.log('\n🔍 Step 2: Fetch project ICP brief');

    const fetchedBrief = await getProjectIcpBrief(project.id);

    if (!fetchedBrief) {
      throw new Error('Failed to fetch project ICP brief');
    }

    console.log(`✅ Fetched ICP brief successfully`);
    console.log(`   Industry: ${fetchedBrief.industry}`);
    console.log(`   Location: ${fetchedBrief.location}`);

    // Step 3: Save a prospect with ICP snapshot
    console.log('\n💾 Step 3: Save prospect with ICP snapshot');

    const testProspect = {
      company_name: 'Test Company for ICP Snapshot',
      industry: 'Home Services',
      website: 'https://test-company.example.com',
      website_status: 'accessible',
      city: 'Austin',
      state: 'TX',
      address: '123 Test St, Austin, TX',
      contact_phone: '512-555-1234',
      google_place_id: `test-place-${Date.now()}`,
      google_rating: 4.5,
      google_review_count: 25,
      icp_match_score: 85,
      is_relevant: true,
      icp_brief_snapshot: fetchedBrief, // ← This is the key field!
      status: 'ready_for_analysis',
      run_id: `test-run-${Date.now()}`,
      source: 'manual-test'
    };

    const savedProspect = await saveOrLinkProspect(testProspect, project.id, {
      run_id: testProspect.run_id,
      notes: 'Test prospect for ICP snapshot feature'
    });

    console.log(`✅ Saved prospect: ${savedProspect.company_name}`);
    console.log(`   ID: ${savedProspect.id}`);

    // Step 4: Verify the snapshot was saved
    console.log('\n✅ Step 4: Verify ICP snapshot in database');

    const { data: verifyProspect, error: verifyError } = await supabase
      .from('prospects')
      .select('id, company_name, icp_brief_snapshot')
      .eq('id', savedProspect.id)
      .single();

    if (verifyError) {
      throw new Error(`Failed to verify prospect: ${verifyError.message}`);
    }

    if (!verifyProspect.icp_brief_snapshot) {
      throw new Error('ICP brief snapshot was NOT saved!');
    }

    console.log(`✅ ICP snapshot verified in database!`);
    console.log(`   Industry: ${verifyProspect.icp_brief_snapshot.industry}`);
    console.log(`   Location: ${verifyProspect.icp_brief_snapshot.location}`);
    console.log(`   Business Size: ${verifyProspect.icp_brief_snapshot.business_size}`);
    console.log(`   Revenue Range: ${verifyProspect.icp_brief_snapshot.revenue_range}`);

    // Verify it matches the project's ICP brief
    if (verifyProspect.icp_brief_snapshot.industry !== project.icp_brief.industry) {
      throw new Error('ICP snapshot does not match project ICP brief!');
    }

    console.log('\n' + '='.repeat(70));
    console.log('🎉 ALL TESTS PASSED!');
    console.log('='.repeat(70));
    console.log('\n✅ ICP Brief Snapshot Feature Working Correctly:\n');
    console.log('   1. Projects can store ICP briefs in JSONB column');
    console.log('   2. getProjectIcpBrief() fetches ICP brief from project');
    console.log('   3. Prospects save icp_brief_snapshot field');
    console.log('   4. Snapshot persists correctly in database');
    console.log('   5. Snapshot matches original project ICP brief\n');

    console.log('📌 Test Data:');
    console.log(`   Project ID: ${project.id}`);
    console.log(`   Prospect ID: ${savedProspect.id}\n`);

    console.log('🚀 Next Steps:');
    console.log('   1. ✅ Prospecting engine saves ICP snapshots');
    console.log('   2. ⏳ Add API validation to prevent ICP updates');
    console.log('   3. ⏳ Update UI to show locked state\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

runTest();
