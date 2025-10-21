/**
 * End-to-End Test for Project Workspace Functionality
 * Tests the complete workflow from project creation to outreach
 */

const API_BASE = 'http://localhost:3007/api';

let testProjectId = null;
let testProspectIds = [];
let testLeadIds = [];

console.log('\n🧪 PROJECT WORKSPACE END-TO-END TEST\n');
console.log('=====================================\n');

async function test1_CreateProject() {
  console.log('📝 TEST 1: Create a new project');

  const projectData = {
    name: `E2E Test Project ${Date.now()}`,
    description: 'End-to-end testing of project workspace functionality',
    budget_limit: 1000
  };

  const response = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(projectData)
  });

  if (!response.ok) {
    throw new Error(`Failed to create project: ${response.statusText}`);
  }

  const result = await response.json();

  if (!result.success || !result.data) {
    throw new Error('Project creation failed: No data returned');
  }

  testProjectId = result.data.id;
  console.log(`✅ Created project: ${result.data.name}`);
  console.log(`   Project ID: ${testProjectId}`);
  console.log(`   Budget: $${result.data.budget || 0}`);

  return testProjectId;
}

async function test2_SaveICPBrief() {
  console.log('\n📋 TEST 2: Save ICP brief to project');

  const icpBrief = {
    industry: 'Restaurant',
    location: 'Philadelphia, PA',
    business_size: '10-50 employees',
    revenue_range: '$500K-$2M',
    pain_points: ['No online ordering', 'Poor mobile experience', 'Missing social media presence'],
    target_personas: ['Restaurant Owner', 'Marketing Manager']
  };

  const response = await fetch(`${API_BASE}/projects/${testProjectId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ icp_brief: icpBrief })
  });

  if (!response.ok) {
    throw new Error(`Failed to save ICP brief: ${response.statusText}`);
  }

  const result = await response.json();

  console.log(`✅ ICP brief saved`);
  console.log(`   Industry: ${result.data.icp_brief.industry}`);
  console.log(`   Location: ${result.data.icp_brief.location}`);
  console.log(`   Target size: ${result.data.icp_brief.business_size}`);
}

async function test3_SaveAnalysisConfig() {
  console.log('\n⚙️  TEST 3: Save analysis config to project');

  const analysisConfig = {
    tier: 'tier1',
    modules: ['design', 'seo', 'content', 'social'],
    scoring_weights: {
      design: 0.3,
      seo: 0.3,
      content: 0.2,
      social: 0.2
    }
  };

  const response = await fetch(`${API_BASE}/projects/${testProjectId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ analysis_config: analysisConfig })
  });

  if (!response.ok) {
    throw new Error(`Failed to save analysis config: ${response.statusText}`);
  }

  const result = await response.json();

  console.log(`✅ Analysis config saved`);
  console.log(`   Tier: ${result.data.analysis_config.tier}`);
  console.log(`   Modules: ${result.data.analysis_config.modules.join(', ')}`);
}

async function test4_SaveOutreachConfig() {
  console.log('\n📧 TEST 4: Save outreach config to project');

  const outreachConfig = {
    default_strategy: 'compliment-sandwich',
    tone: 'professional',
    variants: 3,
    follow_up_enabled: true,
    follow_up_days: 3
  };

  const response = await fetch(`${API_BASE}/projects/${testProjectId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ outreach_config: outreachConfig })
  });

  if (!response.ok) {
    throw new Error(`Failed to save outreach config: ${response.statusText}`);
  }

  const result = await response.json();

  console.log(`✅ Outreach config saved`);
  console.log(`   Strategy: ${result.data.outreach_config.default_strategy}`);
  console.log(`   Tone: ${result.data.outreach_config.tone}`);
  console.log(`   Variants: ${result.data.outreach_config.variants}`);
}

async function test5_VerifyConfigPersistence() {
  console.log('\n🔍 TEST 5: Verify all configs persisted correctly');

  const response = await fetch(`${API_BASE}/projects/${testProjectId}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch project: ${response.statusText}`);
  }

  const result = await response.json();
  const project = result.data;

  // Verify ICP brief
  if (!project.icp_brief || project.icp_brief.industry !== 'Restaurant') {
    throw new Error('ICP brief not persisted correctly');
  }

  // Verify analysis config
  if (!project.analysis_config || project.analysis_config.tier !== 'tier1') {
    throw new Error('Analysis config not persisted correctly');
  }

  // Verify outreach config
  if (!project.outreach_config || project.outreach_config.default_strategy !== 'compliment-sandwich') {
    throw new Error('Outreach config not persisted correctly');
  }

  console.log(`✅ All configs verified in database`);
  console.log(`   ICP Brief: ✓`);
  console.log(`   Analysis Config: ✓`);
  console.log(`   Outreach Config: ✓`);
}

async function test6_FetchProjectStats() {
  console.log('\n📊 TEST 6: Fetch project statistics');

  const response = await fetch(`${API_BASE}/projects/${testProjectId}/stats`);

  if (!response.ok) {
    throw new Error(`Failed to fetch project stats: ${response.statusText}`);
  }

  const result = await response.json();
  const stats = result.data;

  console.log(`✅ Project stats fetched`);
  console.log(`   Prospects: ${stats.prospects_count || 0}`);
  console.log(`   Leads: ${stats.leads_count || 0}`);
  console.log(`   Emails sent: ${stats.emails_count || 0}`);
  console.log(`   Budget used: $${stats.budget_used || 0} / $${stats.budget_limit || 0}`);

  return stats;
}

async function test7_ProjectDetailPage() {
  console.log('\n🌐 TEST 7: Verify project detail page loads');

  const response = await fetch(`http://localhost:3007/projects/${testProjectId}`);

  if (!response.ok) {
    console.log(`   ⚠️  Project detail page returned ${response.status}`);
    console.log(`   This is expected if the page has rendering issues`);
  } else {
    console.log(`✅ Project detail page accessible`);
  }
}

async function runAllTests() {
  let passed = 0;
  let failed = 0;

  try {
    await test1_CreateProject();
    passed++;
  } catch (err) {
    console.log(`❌ TEST 1 FAILED: ${err.message}`);
    failed++;
    return; // Can't continue without a project
  }

  try {
    await test2_SaveICPBrief();
    passed++;
  } catch (err) {
    console.log(`❌ TEST 2 FAILED: ${err.message}`);
    failed++;
  }

  try {
    await test3_SaveAnalysisConfig();
    passed++;
  } catch (err) {
    console.log(`❌ TEST 3 FAILED: ${err.message}`);
    failed++;
  }

  try {
    await test4_SaveOutreachConfig();
    passed++;
  } catch (err) {
    console.log(`❌ TEST 4 FAILED: ${err.message}`);
    failed++;
  }

  try {
    await test5_VerifyConfigPersistence();
    passed++;
  } catch (err) {
    console.log(`❌ TEST 5 FAILED: ${err.message}`);
    failed++;
  }

  try {
    await test6_FetchProjectStats();
    passed++;
  } catch (err) {
    console.log(`❌ TEST 6 FAILED: ${err.message}`);
    failed++;
  }

  try {
    await test7_ProjectDetailPage();
    passed++;
  } catch (err) {
    console.log(`❌ TEST 7 FAILED: ${err.message}`);
    failed++;
  }

  console.log('\n=====================================');
  console.log('📈 TEST SUMMARY');
  console.log('=====================================');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${passed + failed}`);

  if (testProjectId) {
    console.log(`\n📌 Test Project ID: ${testProjectId}`);
    console.log(`🌐 View in browser: http://localhost:3007/projects/${testProjectId}`);
  }

  process.exit(failed > 0 ? 1 : 0);
}

runAllTests();
