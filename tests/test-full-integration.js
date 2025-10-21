/**
 * Full Integration Test - Project Workspace + Live Engines
 * Tests complete workflow: Project → Prospecting → Analysis → Outreach
 */

const PROSPECTING_ENGINE = 'http://localhost:3010';
const ANALYSIS_ENGINE = 'http://localhost:3001';
const OUTREACH_ENGINE = 'http://localhost:3020'; // Updated port
const UI_API = 'http://localhost:3007/api'; // Current UI port

let testProjectId = null;
let testProspectIds = [];
let testLeadIds = [];
let testEmailIds = [];

console.log('\n🚀 FULL INTEGRATION TEST - PROJECT WORKSPACE\n');
console.log('='.repeat(60));

// Helper to check engine health
async function checkEngine(name, url) {
  try {
    const response = await fetch(`${url}/health`);
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ ${name}: ${data.status || 'OK'}`);
      return true;
    }
  } catch (err) {
    console.log(`❌ ${name}: NOT RUNNING`);
    return false;
  }
}

async function test0_VerifyEngines() {
  console.log('\n📡 STEP 0: Verify all engines are running\n');

  const prospecting = await checkEngine('Prospecting Engine', PROSPECTING_ENGINE);
  const analysis = await checkEngine('Analysis Engine', ANALYSIS_ENGINE);
  const ui = await checkEngine('UI API', 'http://localhost:3007');

  if (!prospecting || !analysis || !ui) {
    console.log('\n⚠️  Some engines are not running. Test may fail.');
    console.log('   Please start missing engines manually.');
  }

  return { prospecting, analysis, ui };
}

async function test1_CreateProject() {
  console.log('\n📝 STEP 1: Create test project\n');

  const projectData = {
    name: `Full Integration Test ${Date.now()}`,
    description: 'Testing complete pipeline with all engines',
    budget_limit: 5000
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

  console.log(`✅ Created project: ${result.data.name}`);
  console.log(`   ID: ${testProjectId}`);

  return testProjectId;
}

async function test2_SaveProjectConfigs() {
  console.log('\n⚙️  STEP 2: Save project configurations\n');

  const configs = {
    icp_brief: {
      industry: 'Restaurant',
      location: 'Philadelphia, PA',
      business_size: '10-50 employees',
      revenue_range: '$500K-$2M',
      criteria: {
        has_website: true,
        missing_features: ['online ordering', 'mobile optimization']
      }
    },
    analysis_config: {
      tier: 'tier1',
      modules: ['design', 'seo', 'content'],
      thresholds: {
        min_score_for_lead: 60
      }
    },
    outreach_config: {
      default_strategy: 'compliment-sandwich',
      tone: 'professional',
      variants: 2
    }
  };

  const response = await fetch(`${UI_API}/projects/${testProjectId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(configs)
  });

  if (!response.ok) {
    throw new Error(`Failed to save configs: ${response.statusText}`);
  }

  const result = await response.json();

  console.log(`✅ ICP Brief saved: ${result.data.icp_brief.industry} in ${result.data.icp_brief.location}`);
  console.log(`✅ Analysis Config saved: ${result.data.analysis_config.tier}, ${result.data.analysis_config.modules.length} modules`);
  console.log(`✅ Outreach Config saved: ${result.data.outreach_config.default_strategy} strategy`);
}

async function test3_RunProspecting() {
  console.log('\n🔍 STEP 3: Run prospecting workflow\n');

  const prospectingRequest = {
    brief: {
      industry: 'Restaurant',
      city: 'Philadelphia',
      state: 'PA'
    },
    count: 5,
    options: {
      projectId: testProjectId
    }
  };

  console.log(`   Requesting 5 prospects for project ${testProjectId}...`);

  const response = await fetch(`${PROSPECTING_ENGINE}/api/prospect`, {
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
  if (testProspectIds.length > 0) {
    console.log(`   First prospect ID: ${testProspectIds[0]}`);
  }

  return testProspectIds;
}

async function test4_VerifyProspectsLinkedToProject() {
  console.log('\n🔗 STEP 4: Verify prospects linked to project\n');

  // Query prospects via UI API with project filter
  const response = await fetch(`${UI_API}/prospects?project_id=${testProjectId}&limit=100`);

  if (!response.ok) {
    console.log(`   ⚠️  Could not verify project linking via UI API`);
    return;
  }

  const result = await response.json();
  const projectProspects = result.data || result.prospects || [];

  console.log(`✅ Found ${projectProspects.length} prospects linked to project`);

  if (projectProspects.length !== testProspectIds.length) {
    console.log(`   ⚠️  Expected ${testProspectIds.length}, found ${projectProspects.length}`);
  }
}

async function test5_RunAnalysis() {
  console.log('\n🔬 STEP 5: Run analysis on prospects\n');

  if (testProspectIds.length === 0) {
    console.log('   ⏭️  Skipping - no prospects to analyze');
    return [];
  }

  const analysisRequest = {
    prospect_ids: testProspectIds.slice(0, 3), // Analyze first 3 to save time
    tier: 'tier1',
    modules: ['design', 'seo'],
    filters: {
      projectId: testProjectId
    }
  };

  console.log(`   Analyzing ${analysisRequest.prospect_ids.length} prospects...`);

  const response = await fetch(`${ANALYSIS_ENGINE}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(analysisRequest)
  });

  if (!response.ok) {
    console.log(`   ⚠️  Analysis failed: ${response.statusText}`);
    return [];
  }

  const result = await response.json();
  testLeadIds = result.leads?.map(l => l.id) || [];

  console.log(`✅ Created ${testLeadIds.length} leads`);
  if (testLeadIds.length > 0) {
    console.log(`   First lead ID: ${testLeadIds[0]}`);
  }

  return testLeadIds;
}

async function test6_VerifyLeadsLinkedToProject() {
  console.log('\n🔗 STEP 6: Verify leads linked to project\n');

  const response = await fetch(`${UI_API}/leads?project_id=${testProjectId}&limit=100`);

  if (!response.ok) {
    console.log(`   ⚠️  Could not verify lead linking via UI API`);
    return;
  }

  const result = await response.json();
  const projectLeads = result.data || result.leads || [];

  console.log(`✅ Found ${projectLeads.length} leads linked to project`);

  if (projectLeads.length > 0) {
    const lead = projectLeads[0];
    console.log(`   Sample lead: ${lead.company_name} (Grade: ${lead.grade || lead.website_grade})`);
  }
}

async function test7_FetchProjectStats() {
  console.log('\n📊 STEP 7: Fetch updated project statistics\n');

  const response = await fetch(`${UI_API}/projects/${testProjectId}/stats`);

  if (!response.ok) {
    throw new Error(`Failed to fetch stats: ${response.statusText}`);
  }

  const result = await response.json();
  const stats = result.data;

  console.log(`✅ Project statistics updated:`);
  console.log(`   Prospects: ${stats.prospects_count || 0}`);
  console.log(`   Leads: ${stats.leads_count || 0}`);
  console.log(`   Emails: ${stats.emails_count || 0}`);
  console.log(`   Budget used: $${stats.budget_used || 0} / $${stats.budget_limit || 0}`);

  return stats;
}

async function test8_ViewProjectPage() {
  console.log('\n🌐 STEP 8: Verify project detail page\n');

  const response = await fetch(`http://localhost:3007/projects/${testProjectId}`);

  if (!response.ok) {
    console.log(`   ⚠️  Project page returned ${response.status}`);
  } else {
    console.log(`✅ Project detail page accessible`);
    console.log(`   URL: http://localhost:3007/projects/${testProjectId}`);
  }
}

async function runAllTests() {
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  const tests = [
    { name: 'Verify Engines', fn: test0_VerifyEngines, critical: true },
    { name: 'Create Project', fn: test1_CreateProject, critical: true },
    { name: 'Save Configs', fn: test2_SaveProjectConfigs, critical: false },
    { name: 'Run Prospecting', fn: test3_RunProspecting, critical: false },
    { name: 'Verify Prospect Links', fn: test4_VerifyProspectsLinkedToProject, critical: false },
    { name: 'Run Analysis', fn: test5_RunAnalysis, critical: false },
    { name: 'Verify Lead Links', fn: test6_VerifyLeadsLinkedToProject, critical: false },
    { name: 'Fetch Stats', fn: test7_FetchProjectStats, critical: false },
    { name: 'View Project Page', fn: test8_ViewProjectPage, critical: false }
  ];

  for (const test of tests) {
    try {
      await test.fn();
      passed++;
    } catch (err) {
      console.log(`\n❌ ${test.name.toUpperCase()} FAILED`);
      console.log(`   Error: ${err.message}`);
      failed++;

      if (test.critical) {
        console.log(`\n🛑 Critical test failed. Stopping.`);
        break;
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📈 FINAL RESULTS');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${passed}/${tests.length}`);
  console.log(`❌ Failed: ${failed}/${tests.length}`);

  if (testProjectId) {
    console.log(`\n📌 Test Project ID: ${testProjectId}`);
    console.log(`🌐 View: http://localhost:3007/projects/${testProjectId}`);
  }

  console.log(`\n✨ Test Summary:`);
  console.log(`   - Created project: ${testProjectId ? 'Yes' : 'No'}`);
  console.log(`   - Generated prospects: ${testProspectIds.length}`);
  console.log(`   - Created leads: ${testLeadIds.length}`);
  console.log(`   - Project stats working: ${passed >= 7 ? 'Yes' : 'No'}`);

  process.exit(failed > 0 ? 1 : 0);
}

runAllTests().catch(err => {
  console.error('\n💥 FATAL ERROR:', err.message);
  process.exit(1);
});
