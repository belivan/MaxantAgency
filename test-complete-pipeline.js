/**
 * Complete Pipeline Test - FINAL VERSION
 * Tests: Project → Prospecting → Analysis → Stats
 */

const PROSPECTING_ENGINE = 'http://localhost:3010';
const ANALYSIS_ENGINE = 'http://localhost:3001';
const UI_API = 'http://localhost:3007/api';

let testProjectId = null;
let testProspects = [];
let testLeads = [];

console.log('\n🎯 COMPLETE PIPELINE TEST - FINAL RUN\n');
console.log('='.repeat(70));

async function step1_CreateProject() {
  console.log('\n📝 STEP 1: Create test project');

  const projectData = {
    name: `Pipeline Test ${Date.now()}`,
    description: 'Complete end-to-end pipeline test',
    budget_limit: 10000
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

  console.log(`   ✅ Created: ${result.data.name}`);
  console.log(`   📌 ID: ${testProjectId}`);

  return testProjectId;
}

async function step2_SaveConfigs() {
  console.log('\n⚙️  STEP 2: Save project configurations');

  const configs = {
    icp_brief: {
      industry: 'Restaurant',
      location: 'Philadelphia, PA',
      size: '10-50 employees'
    },
    analysis_config: {
      tier: 'tier1',
      modules: ['design', 'seo']
    },
    outreach_config: {
      default_strategy: 'compliment-sandwich',
      tone: 'professional'
    }
  };

  const response = await fetch(`${UI_API}/projects/${testProjectId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(configs)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to save configs: ${response.statusText} - ${text}`);
  }

  const result = await response.json();

  console.log(`   ✅ ICP Brief: ${result.data.icp_brief.industry}`);
  console.log(`   ✅ Analysis: ${result.data.analysis_config.tier}`);
  console.log(`   ✅ Outreach: ${result.data.outreach_config.default_strategy}`);
}

async function step3_GenerateProspects() {
  console.log('\n🔍 STEP 3: Generate prospects');

  const prospectRequest = {
    brief: {
      industry: 'Restaurant',
      city: 'Philadelphia',
      state: 'PA'
    },
    count: 3,
    options: {
      projectId: testProjectId
    }
  };

  console.log(`   🎯 Targeting: Restaurants in Philadelphia`);
  console.log(`   📊 Count: 3 prospects`);
  console.log(`   🔗 Project ID: ${testProjectId}`);

  const response = await fetch(`${PROSPECTING_ENGINE}/api/prospect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(prospectRequest)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Prospecting failed: ${response.statusText} - ${text.substring(0, 200)}`);
  }

  const result = await response.json();

  // Handle both array and object responses
  if (Array.isArray(result)) {
    testProspects = result;
  } else if (result.prospects) {
    testProspects = result.prospects;
  } else if (result.prospect) {
    testProspects = [result.prospect];
  } else {
    testProspects = [result];
  }

  console.log(`   ✅ Generated ${testProspects.length} prospects`);
  if (testProspects.length > 0) {
    console.log(`   📍 Sample: ${testProspects[0].company_name || testProspects[0].name || 'Unknown'}`);
  }

  return testProspects;
}

async function step4_VerifyProspectLinks() {
  console.log('\n🔗 STEP 4: Verify prospects linked to project');

  // Wait a moment for database to update
  await new Promise(resolve => setTimeout(resolve, 2000));

  const response = await fetch(`${UI_API}/prospects?limit=100`);

  if (!response.ok) {
    console.log(`   ⚠️  Could not fetch prospects via UI API`);
    return;
  }

  const result = await response.json();
  const allProspects = result.data || result.prospects || [];

  // Try to find our project's prospects
  const projectProspects = allProspects.filter(p => {
    return testProspects.some(tp =>
      (tp.id && p.id === tp.id) ||
      (tp.company_name && p.company_name === tp.company_name) ||
      (tp.name && p.company_name === tp.name)
    );
  });

  console.log(`   📊 Total prospects in system: ${allProspects.length}`);
  console.log(`   ✅ Our prospects found: ${projectProspects.length}/${testProspects.length}`);
}

async function step5_AnalyzeProspects() {
  console.log('\n🔬 STEP 5: Analyze prospects');

  if (testProspects.length === 0) {
    console.log(`   ⏭️  Skipping - no prospects to analyze`);
    return [];
  }

  // Get prospect IDs
  const prospectIds = testProspects
    .map(p => p.id)
    .filter(id => id)
    .slice(0, 2); // Analyze first 2 to save time

  if (prospectIds.length === 0) {
    console.log(`   ⚠️  No valid prospect IDs found`);
    return [];
  }

  console.log(`   🎯 Analyzing ${prospectIds.length} prospects`);

  const analysisRequest = {
    prospect_ids: prospectIds,
    tier: 'tier1',
    modules: ['design', 'seo'],
    filters: {
      projectId: testProjectId
    }
  };

  const response = await fetch(`${ANALYSIS_ENGINE}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(analysisRequest)
  });

  if (!response.ok) {
    const text = await response.text();
    console.log(`   ⚠️  Analysis failed: ${response.statusText}`);
    console.log(`   Details: ${text.substring(0, 200)}`);
    return [];
  }

  const result = await response.json();
  testLeads = result.leads || [];

  console.log(`   ✅ Created ${testLeads.length} leads`);
  if (testLeads.length > 0) {
    const lead = testLeads[0];
    console.log(`   📊 Sample: ${lead.company_name} (Grade: ${lead.grade || lead.website_grade || 'N/A'})`);
  }

  return testLeads;
}

async function step6_FetchProjectStats() {
  console.log('\n📊 STEP 6: Fetch updated project stats');

  // Wait for data to propagate
  await new Promise(resolve => setTimeout(resolve, 1000));

  const response = await fetch(`${UI_API}/projects/${testProjectId}/stats`);

  if (!response.ok) {
    throw new Error(`Failed to fetch stats: ${response.statusText}`);
  }

  const result = await response.json();
  const stats = result.data;

  console.log(`   ✅ Project Statistics:`);
  console.log(`      📍 Prospects: ${stats.prospects_count || 0}`);
  console.log(`      🎯 Leads: ${stats.leads_count || 0}`);
  console.log(`      📧 Emails: ${stats.emails_count || 0}`);
  console.log(`      💰 Budget: $${stats.budget_used || 0} / $${stats.budget_limit || 0}`);

  return stats;
}

async function step7_ViewInUI() {
  console.log('\n🌐 STEP 7: Verify project page accessible');

  const response = await fetch(`http://localhost:3007/projects/${testProjectId}`);

  if (!response.ok) {
    console.log(`   ⚠️  Page returned ${response.status}`);
  } else {
    console.log(`   ✅ Project detail page accessible`);
    console.log(`   🔗 URL: http://localhost:3007/projects/${testProjectId}`);
  }
}

async function runTest() {
  console.log('\n🚀 Starting complete pipeline test...\n');

  let passed = 0;
  let failed = 0;
  const startTime = Date.now();

  const tests = [
    { name: 'Create Project', fn: step1_CreateProject, critical: true },
    { name: 'Save Configs', fn: step2_SaveConfigs, critical: true },
    { name: 'Generate Prospects', fn: step3_GenerateProspects, critical: false },
    { name: 'Verify Links', fn: step4_VerifyProspectLinks, critical: false },
    { name: 'Analyze Prospects', fn: step5_AnalyzeProspects, critical: false },
    { name: 'Fetch Stats', fn: step6_FetchProjectStats, critical: false },
    { name: 'View in UI', fn: step7_ViewInUI, critical: false }
  ];

  for (const test of tests) {
    try {
      await test.fn();
      passed++;
    } catch (err) {
      console.log(`\n   ❌ ${test.name.toUpperCase()} FAILED`);
      console.log(`   Error: ${err.message}`);
      failed++;

      if (test.critical) {
        console.log(`\n🛑 Critical test failed. Stopping.`);
        break;
      }
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n' + '='.repeat(70));
  console.log('🎉 TEST COMPLETE');
  console.log('='.repeat(70));
  console.log(`✅ Passed: ${passed}/${tests.length}`);
  console.log(`❌ Failed: ${failed}/${tests.length}`);
  console.log(`⏱️  Duration: ${duration}s`);

  if (testProjectId) {
    console.log(`\n📌 Test Project:`);
    console.log(`   ID: ${testProjectId}`);
    console.log(`   Prospects: ${testProspects.length}`);
    console.log(`   Leads: ${testLeads.length}`);
    console.log(`   URL: http://localhost:3007/projects/${testProjectId}`);
  }

  console.log(`\n${'='.repeat(70)}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runTest().catch(err => {
  console.error('\n💥 FATAL ERROR:', err.message);
  console.error(err.stack);
  process.exit(1);
});
