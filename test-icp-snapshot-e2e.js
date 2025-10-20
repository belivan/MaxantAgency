/**
 * End-to-End Test for ICP Brief Snapshot Feature
 * Tests that prospects save a snapshot of the project's ICP brief
 */

const UI_API = 'http://localhost:3000/api';
const PROSPECTING_API = 'http://localhost:3010';

let testProjectId = null;
let testProspectIds = [];

console.log('\n🔒 ICP BRIEF SNAPSHOT LOCKING TEST\n');
console.log('='.repeat(70));

async function test1_CreateProject() {
  console.log('\n📝 Step 1: Create project with ICP brief\n');

  const projectData = {
    name: `ICP Snapshot Test ${Date.now()}`,
    description: 'Testing ICP brief snapshot locking',
    budget: 500,
    icp_brief: {
      industry: 'Landscaping',
      location: 'Denver, CO',
      business_size: '5-20 employees',
      revenue_range: '$250K-$1M',
      pain_points: ['No online presence', 'Manual scheduling'],
      target_personas: ['Owner', 'Operations Manager']
    }
  };

  const response = await fetch(`${UI_API}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(projectData)
  });

  if (!response.ok) {
    throw new Error(`Failed to create project: ${response.statusText}`);
  }

  const result = await response.json();
  testProjectId = result.data.id;

  console.log(`✅ Project created: ${result.data.name}`);
  console.log(`   ID: ${testProjectId}`);
  console.log(`   ICP Industry: ${result.data.icp_brief.industry}`);
  console.log(`   ICP Location: ${result.data.icp_brief.location}`);

  return testProjectId;
}

async function test2_RunProspecting() {
  console.log('\n🔍 Step 2: Run prospecting with project ID\n');

  const prospectingRequest = {
    brief: {
      industry: 'Landscaping',
      city: 'Denver',
      state: 'CO'
    },
    count: 3, // Just 3 for testing
    options: {
      projectId: testProjectId,
      verifyWebsites: false,
      scrapeWebsites: false,
      findSocial: false,
      scrapeSocial: false,
      checkRelevance: false
    }
  };

  console.log(`   Generating 3 prospects for project ${testProjectId}...`);

  const response = await fetch(`${PROSPECTING_API}/api/prospect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(prospectingRequest)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Prospecting failed: ${response.statusText} - ${error}`);
  }

  const result = await response.json();
  testProspectIds = result.prospects?.map(p => p.id) || [];

  console.log(`✅ Generated ${testProspectIds.length} prospects`);

  return testProspectIds;
}

async function test3_VerifyICPSnapshot() {
  console.log('\n🔍 Step 3: Verify ICP snapshot was saved\n');

  if (testProspectIds.length === 0) {
    throw new Error('No prospects were generated');
  }

  // Fetch the first prospect to check snapshot
  const response = await fetch(`${UI_API}/prospects/${testProspectIds[0]}`);

  if (!response.ok) {
    console.log(`   ⚠️  Could not fetch prospect via UI API`);
    console.log(`   Trying direct database query instead...\n`);

    // Query database directly
    const { supabase } = await import('./prospecting-engine/database/supabase-client.js');

    const { data: prospects, error } = await supabase
      .from('prospects')
      .select('id, company_name, icp_brief_snapshot')
      .in('id', testProspectIds);

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    let passCount = 0;
    let failCount = 0;

    for (const prospect of prospects) {
      console.log(`📌 ${prospect.company_name}`);
      console.log(`   ID: ${prospect.id}`);

      if (prospect.icp_brief_snapshot) {
        passCount++;
        console.log('   ✅ Has ICP snapshot:');
        console.log(`      Industry: ${prospect.icp_brief_snapshot.industry}`);
        console.log(`      Location: ${prospect.icp_brief_snapshot.location}`);
        console.log(`      Business Size: ${prospect.icp_brief_snapshot.business_size}`);
        console.log(`      Revenue Range: ${prospect.icp_brief_snapshot.revenue_range}`);

        // Verify it matches the project's ICP brief
        if (prospect.icp_brief_snapshot.industry !== 'Landscaping') {
          throw new Error(`ICP snapshot industry mismatch: ${prospect.icp_brief_snapshot.industry}`);
        }
        if (prospect.icp_brief_snapshot.location !== 'Denver, CO') {
          throw new Error(`ICP snapshot location mismatch: ${prospect.icp_brief_snapshot.location}`);
        }
      } else {
        failCount++;
        console.log('   ❌ NO ICP SNAPSHOT!');
      }
      console.log('');
    }

    if (failCount > 0) {
      throw new Error(`${failCount}/${prospects.length} prospects missing ICP snapshot`);
    }

    console.log(`✅ All ${passCount} prospects have correct ICP snapshot!`);
    return true;
  }
}

async function runTest() {
  let passed = 0;
  let failed = 0;

  try {
    await test1_CreateProject();
    passed++;
  } catch (err) {
    console.log(`\n❌ Step 1 FAILED: ${err.message}`);
    failed++;
    return;
  }

  try {
    await test2_RunProspecting();
    passed++;
  } catch (err) {
    console.log(`\n❌ Step 2 FAILED: ${err.message}`);
    failed++;
  }

  try {
    await test3_VerifyICPSnapshot();
    passed++;
  } catch (err) {
    console.log(`\n❌ Step 3 FAILED: ${err.message}`);
    failed++;
  }

  console.log('\n' + '='.repeat(70));
  console.log('📊 TEST RESULTS');
  console.log('='.repeat(70));
  console.log(`✅ Passed: ${passed}/3`);
  console.log(`❌ Failed: ${failed}/3`);

  if (testProjectId) {
    console.log(`\n📌 Test Project ID: ${testProjectId}`);
  }

  if (failed === 0) {
    console.log('\n🎉 ICP BRIEF SNAPSHOT FEATURE WORKING!\n');
    console.log('✅ Prospects now save a snapshot of the project\'s ICP brief');
    console.log('✅ Next step: Add validation to prevent ICP brief updates\n');
  } else {
    console.log('\n⚠️  Some tests failed. Review errors above.\n');
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTest().catch(err => {
  console.error('\n💥 FATAL ERROR:', err.message);
  process.exit(1);
});
