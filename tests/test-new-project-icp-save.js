/**
 * Test New Project ICP Brief Save
 * Verifies that ICP brief is saved when generating prospects for a new project
 */

console.log('\n🧪 NEW PROJECT ICP SAVE TEST\n');
console.log('='.repeat(70));

async function runTest() {
  try {
    const UI_API = 'http://localhost:3000/api';

    console.log('\n📋 Step 1: Create a new project (without ICP brief)\n');

    const createResponse = await fetch(`${UI_API}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Test Project - ICP Save ${Date.now()}`,
        description: 'Testing ICP brief auto-save'
      })
    });

    if (!createResponse.ok) {
      throw new Error('Failed to create project');
    }

    const createData = await createResponse.json();
    const projectId = createData.data.id;

    console.log('✅ Project created:', projectId);
    console.log('✅ Initial ICP brief:', createData.data.icp_brief || 'null');

    console.log('\n📋 Step 2: Check initial state\n');

    const projectResponse = await fetch(`${UI_API}/projects/${projectId}`);
    const projectData = await projectResponse.json();

    console.log('✅ Project name:', projectData.data.name);
    console.log('✅ Has ICP brief:', !!projectData.data.icp_brief);

    console.log('\n📋 Step 3: Check prospect count (should be 0)\n');

    const prospectsResponse = await fetch(`${UI_API}/projects/${projectId}/prospects`);
    const prospectsData = await prospectsResponse.json();
    const prospectCount = prospectsData.data?.length || 0;

    console.log('✅ Prospect count:', prospectCount);
    console.log('✅ Should allow ICP save:', prospectCount === 0 ? 'YES' : 'NO');

    console.log('\n📋 Step 4: Simulate saving ICP brief (manual API call)\n');

    const icpBrief = {
      industry: 'Coffee Shop',
      location: 'Austin, TX',
      pain_points: ['No website', 'Poor online presence'],
      business_size: '1-10 employees',
      revenue_range: '$100K-$500K',
      target_personas: ['Owner']
    };

    const updateResponse = await fetch(`${UI_API}/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        icp_brief: icpBrief
      })
    });

    if (updateResponse.ok) {
      console.log('✅ ICP brief saved successfully');

      const updatedData = await updateResponse.json();
      console.log('✅ Updated ICP brief:');
      console.log(`   Industry: ${updatedData.data.icp_brief?.industry}`);
      console.log(`   Location: ${updatedData.data.icp_brief?.location}`);
    } else {
      const errorData = await updateResponse.json();
      throw new Error(`Failed to save ICP brief: ${errorData.error}`);
    }

    console.log('\n📋 Step 5: Verify the save\n');

    const verifyResponse = await fetch(`${UI_API}/projects/${projectId}`);
    const verifyData = await verifyResponse.json();

    if (verifyData.data.icp_brief) {
      console.log('✅ ICP brief persisted in database');
      console.log(`   Industry: ${verifyData.data.icp_brief.industry}`);
      console.log(`   Location: ${verifyData.data.icp_brief.location}`);
    } else {
      throw new Error('ICP brief was not persisted');
    }

    console.log('\n='.repeat(70));
    console.log('✅ ALL TESTS PASSED');
    console.log('='.repeat(70));
    console.log('\n💡 Key Findings:');
    console.log('   • New projects can have ICP brief saved');
    console.log('   • No locking issues for new projects');
    console.log('   • API accepts ICP brief updates when prospect_count = 0\n');
    console.log('🔍 Next Steps:');
    console.log('   • Test in UI: Navigate to /prospecting?project_id=' + projectId);
    console.log('   • Generate prospects and verify ICP brief is saved');
    console.log('   • Check browser console for any errors\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runTest();
