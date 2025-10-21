/**
 * Test Prospect Count Persistence
 * Verifies that prospect count displays correctly when switching projects
 */

console.log('\n🧪 PROSPECT COUNT PERSISTENCE TEST\n');
console.log('='.repeat(70));

async function testProspectCountPersistence() {
  try {
    const UI_API = 'http://localhost:3000/api';
    const PROSPECTING_API = 'http://localhost:3010';

    console.log('\n📋 Step 1: Create a new project and generate 1 prospect\n');

    const createResponse = await fetch(`${UI_API}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Prospect Count Test ${Date.now()}`,
        description: 'Testing prospect count persistence'
      })
    });

    const createData = await createResponse.json();
    const projectId = createData.data.id;

    console.log('✅ Project created:', projectId);

    // Generate 1 prospect
    const icpBrief = {
      industry: 'Cafe',
      location: 'Austin, TX',
      pain_points: ['No website'],
      business_size: '1-5 employees',
      revenue_range: '$50K-$250K',
      target_personas: ['Owner']
    };

    console.log('\n🔄 Generating 1 prospect...');

    const prospectResponse = await fetch(`${PROSPECTING_API}/api/prospect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brief: { ...icpBrief, count: 1 },
        options: {
          projectId: projectId,
          verify: false,
          model: 'grok-4-fast'
        }
      })
    });

    // Read SSE stream
    const reader = prospectResponse.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let completed = false;

    while (!completed) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const event = JSON.parse(line.slice(6));
          if (event.type === 'complete') {
            completed = true;
          }
        }
      }
    }

    console.log('✅ Prospect generation complete');

    console.log('\n📋 Step 2: Verify project has ICP brief and 1 prospect\n');

    const projectResponse = await fetch(`${UI_API}/projects/${projectId}`);
    const projectData = await projectResponse.json();

    const prospectsResponse = await fetch(`${UI_API}/projects/${projectId}/prospects`);
    const prospectsData = await prospectsResponse.json();

    const hasIcpBrief = !!projectData.data?.icp_brief;
    const prospectCount = prospectsData.data?.length || 0;

    console.log('Project state:');
    console.log(`  Has ICP brief: ${hasIcpBrief}`);
    console.log(`  Prospect count: ${prospectCount}`);

    if (!hasIcpBrief) {
      throw new Error('❌ ICP brief was not saved');
    }

    if (prospectCount !== 1) {
      throw new Error(`❌ Expected 1 prospect, got ${prospectCount}`);
    }

    console.log('✅ Project has ICP brief and 1 prospect');

    console.log('\n📋 Step 3: Simulate UI loading this project (what happens when user navigates)\n');

    // This simulates what the UI does when loading a project
    const [projectLoadResponse, prospectsLoadResponse] = await Promise.all([
      fetch(`${UI_API}/projects/${projectId}`),
      fetch(`${UI_API}/projects/${projectId}/prospects`)
    ]);

    const projectLoadData = await projectLoadResponse.json();
    const prospectsLoadData = await prospectsLoadResponse.json();

    const loadedHasIcpBrief = !!(projectLoadData.success && projectLoadData.data?.icp_brief);
    const loadedProspectCount = prospectsLoadData.data?.length || 0;
    const shouldBeLocked = loadedHasIcpBrief || loadedProspectCount > 0;

    console.log('Simulated UI load:');
    console.log(`  hasIcpBrief: ${loadedHasIcpBrief}`);
    console.log(`  prospectCount: ${loadedProspectCount}`);
    console.log(`  shouldBeLocked: ${shouldBeLocked}`);

    if (loadedProspectCount !== 1) {
      console.error('\n❌ BUG FOUND: Prospect count is not being returned correctly!');
      console.error('API Response:', JSON.stringify(prospectsLoadData, null, 2));
      throw new Error(`Expected prospect count 1, got ${loadedProspectCount}`);
    }

    console.log('✅ Prospect count loaded correctly (1)');

    if (!shouldBeLocked) {
      throw new Error('❌ ICP should be locked but calculated as unlocked');
    }

    console.log('✅ ICP lock calculated correctly (locked = true)');

    console.log('\n📋 Step 4: Verify the prospects API returns correct data\n');

    console.log('Prospects API response:');
    console.log(`  Success: ${prospectsLoadData.success}`);
    console.log(`  Data is array: ${Array.isArray(prospectsLoadData.data)}`);
    console.log(`  Array length: ${prospectsLoadData.data?.length}`);

    if (prospectsLoadData.data && prospectsLoadData.data.length > 0) {
      const firstProspect = prospectsLoadData.data[0];
      console.log(`  First prospect:`);
      console.log(`    Company: ${firstProspect.company_name || 'N/A'}`);
      console.log(`    City: ${firstProspect.city || 'N/A'}`);
      console.log(`    State: ${firstProspect.state || 'N/A'}`);
    }

    console.log('\n='.repeat(70));
    console.log('✅ ALL TESTS PASSED - Prospect count persists correctly');
    console.log('='.repeat(70));
    console.log('\n💡 Summary:');
    console.log('   • Project has 1 prospect');
    console.log('   • API returns prospect count correctly');
    console.log('   • ICP lock calculated correctly');
    console.log('   • UI should display "This project has 1 prospect"\n');

    console.log(`🔗 Test project: http://localhost:3000/prospecting?project_id=${projectId}\n`);

    process.exit(0);

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testProspectCountPersistence();
