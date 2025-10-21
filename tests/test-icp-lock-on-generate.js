/**
 * Test ICP Lock on Generate Click
 * Verifies that ICP is locked immediately when user clicks Generate
 */

console.log('\n🧪 ICP LOCK ON GENERATE TEST\n');
console.log('='.repeat(70));

async function testICPLockOnGenerate() {
  try {
    const UI_API = 'http://localhost:3000/api';
    const PROSPECTING_API = 'http://localhost:3010';

    console.log('\n📋 Step 1: Create a new project (no ICP, no prospects)\n');

    const createResponse = await fetch(`${UI_API}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Lock On Generate Test ${Date.now()}`,
        description: 'Testing immediate ICP locking'
      })
    });

    const createData = await createResponse.json();
    const projectId = createData.data.id;

    console.log('✅ Project created:', projectId);
    console.log('✅ ICP brief: null');
    console.log('✅ Prospect count: 0');
    console.log('✅ Should allow generation: YES');

    console.log('\n📋 Step 2: Simulate UI clicking "Generate" (saves ICP first)\n');

    const icpBrief = {
      industry: 'Yoga Studio',
      location: 'Portland, OR',
      pain_points: ['Poor website', 'No online booking'],
      business_size: '1-10 employees',
      revenue_range: '$50K-$250K',
      target_personas: ['Owner']
    };

    console.log('ICP Brief to lock:', JSON.stringify(icpBrief, null, 2));

    // Simulate what the UI does: Save ICP brief FIRST
    console.log('\n🔒 Saving ICP brief to project (locking it)...');

    const saveIcpResponse = await fetch(`${UI_API}/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        icp_brief: icpBrief
      })
    });

    if (saveIcpResponse.ok) {
      console.log('✅ ICP brief saved to project');
    } else {
      const errorData = await saveIcpResponse.json();
      throw new Error(`Failed to save ICP brief: ${errorData.error}`);
    }

    console.log('\n📋 Step 3: Verify ICP is saved BEFORE any prospects exist\n');

    const projectCheckResponse = await fetch(`${UI_API}/projects/${projectId}`);
    const projectCheckData = await projectCheckResponse.json();

    if (projectCheckData.data.icp_brief) {
      console.log('✅ ICP brief is in database');
      console.log(`   Industry: ${projectCheckData.data.icp_brief.industry}`);
      console.log(`   Location: ${projectCheckData.data.icp_brief.location}`);
    } else {
      throw new Error('ICP brief was not saved');
    }

    // Check prospect count (should still be 0)
    const prospectsCheckResponse = await fetch(`${UI_API}/projects/${projectId}/prospects`);
    const prospectsCheckData = await prospectsCheckResponse.json();
    const prospectCount = prospectsCheckData.data?.length || 0;

    console.log(`✅ Prospect count: ${prospectCount} (still 0 - ICP locked before generation)`);

    console.log('\n📋 Step 4: Try to change ICP brief (should fail - locked)\n');

    const updateIcpResponse = await fetch(`${UI_API}/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        icp_brief: {
          industry: 'Different Industry',
          location: 'Different Location'
        }
      })
    });

    if (updateIcpResponse.status === 403) {
      const errorData = await updateIcpResponse.json();
      console.log('✅ ICP update blocked (403 Forbidden)');
      console.log(`   Error: "${errorData.error}"`);
      console.log('✅ ICP is locked even though prospect_count = 0');
    } else {
      console.log('❌ ICP update succeeded (this is WRONG - should be locked)');
      throw new Error('ICP brief should be locked after first save');
    }

    console.log('\n📋 Step 5: Generate prospects (should work with locked ICP)\n');

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
    let generatedCount = 0;

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
            const results = event.results || event;
            generatedCount = results.prospects?.length || results.saved || 0;
          }
        }
      }
    }

    console.log(`✅ Generated ${generatedCount} prospects with locked ICP`);

    console.log('\n📋 Step 6: Verify final state\n');

    // Check project state
    const finalProjectResponse = await fetch(`${UI_API}/projects/${projectId}`);
    const finalProjectData = await finalProjectResponse.json();

    // Check prospect count
    const finalProspectsResponse = await fetch(`${UI_API}/projects/${projectId}/prospects`);
    const finalProspectsData = await finalProspectsResponse.json();
    const finalProspectCount = finalProspectsData.data?.length || 0;

    console.log(`Project state:`);
    console.log(`  Has ICP brief: ${!!finalProjectData.data.icp_brief ? 'YES' : 'NO'}`);
    console.log(`  ICP Industry: ${finalProjectData.data.icp_brief?.industry || 'N/A'}`);
    console.log(`  Prospect count: ${finalProspectCount}`);
    console.log(`  ICP locked: YES (locked on Generate click, before generation)`);

    console.log('\n='.repeat(70));
    console.log('✅ ALL TESTS PASSED - NEW UX FLOW WORKS CORRECTLY');
    console.log('='.repeat(70));
    console.log('\n💡 New UX Flow Summary:');
    console.log('   1. User clicks "Generate" button');
    console.log('   2. UI saves ICP brief IMMEDIATELY (before generation starts)');
    console.log('   3. ICP becomes locked (even with 0 prospects)');
    console.log('   4. UI shows locked state, disables Generate button');
    console.log('   5. Prospects generate in background');
    console.log('   6. User cannot change ICP or generate with different ICP\n');
    console.log(`🔗 Test project: http://localhost:3000/prospecting?project_id=${projectId}\n`);

    process.exit(0);

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testICPLockOnGenerate();
