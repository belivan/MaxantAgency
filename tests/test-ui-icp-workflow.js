/**
 * UI ICP Brief Workflow Test
 * Simulates what the UI does: generate prospects via SSE, then save ICP brief
 */

console.log('\n🧪 UI ICP BRIEF WORKFLOW TEST\n');
console.log('='.repeat(70));

async function simulateUIWorkflow() {
  try {
    const UI_API = 'http://localhost:3000/api';
    const PROSPECTING_API = 'http://localhost:3010';

    console.log('\n📋 Step 1: Create a new project\n');

    const createResponse = await fetch(`${UI_API}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `UI Workflow Test ${Date.now()}`,
        description: 'Testing UI ICP brief save workflow'
      })
    });

    const createData = await createResponse.json();
    const projectId = createData.data.id;

    console.log('✅ Project created:', projectId);

    console.log('\n📋 Step 2: Simulate UI generating prospects\n');

    const icpBrief = {
      industry: 'Coffee Shop',
      location: 'Seattle, WA',
      pain_points: ['Outdated website'],
      business_size: '1-5 employees',
      revenue_range: '$50K-$250K',
      target_personas: ['Owner']
    };

    console.log('ICP Brief:', JSON.stringify(icpBrief, null, 2));

    // Generate prospects
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

    // Read SSE stream (simulating UI)
    const reader = prospectResponse.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let completed = false;
    let results = null;

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
            results = event.results || event;
            const prospectCount = results.prospects?.length || results.saved || 0;
            console.log('✅ Generation complete:', prospectCount, 'prospects');
          }
        }
      }
    }

    console.log('\n📋 Step 3: Simulate UI saving ICP brief (what SHOULD happen)\n');

    // This is what the UI does in the completion handler
    try {
      console.log('Calling updateProject API...');
      const updateResponse = await fetch(`${UI_API}/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          icp_brief: icpBrief
        })
      });

      if (updateResponse.ok) {
        console.log('✅ ICP brief saved successfully via API');
      } else {
        const errorData = await updateResponse.json();
        console.log('❌ ICP brief save failed:', errorData.error);

        if (errorData.locked) {
          console.log('   Reason: ICP is locked');
        }
      }
    } catch (err) {
      console.error('❌ Exception during ICP save:', err.message);
    }

    console.log('\n📋 Step 4: Verify ICP brief was saved\n');

    const verifyResponse = await fetch(`${UI_API}/projects/${projectId}`);
    const verifyData = await verifyResponse.json();

    if (verifyData.data.icp_brief) {
      console.log('✅ ICP brief is in database');
      console.log(`   Industry: ${verifyData.data.icp_brief.industry}`);
      console.log(`   Location: ${verifyData.data.icp_brief.location}`);
    } else {
      console.log('❌ ICP brief is NOT in database');
    }

    console.log('\n📋 Step 5: Check prospect count and locking\n');

    const prospectsResponse = await fetch(`${UI_API}/projects/${projectId}/prospects`);
    const prospectsData = await prospectsResponse.json();
    const prospectCount = prospectsData.data?.length || 0;

    console.log(`Prospect count: ${prospectCount}`);

    if (prospectCount > 0) {
      console.log('✅ Prospects linked to project');
    }

    // Try to update ICP brief - should fail now
    const lockTestResponse = await fetch(`${UI_API}/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        icp_brief: { industry: 'Different' }
      })
    });

    if (lockTestResponse.status === 403) {
      console.log('✅ ICP brief is locked (subsequent updates blocked)');
    } else {
      console.log('⚠️  ICP brief is NOT locked (this is unexpected)');
    }

    console.log('\n='.repeat(70));

    if (verifyData.data.icp_brief) {
      console.log('✅ TEST PASSED - ICP brief workflow works correctly');
    } else {
      console.log('❌ TEST FAILED - ICP brief was not saved');
    }

    console.log('='.repeat(70));
    console.log(`\n🔗 Test project: http://localhost:3000/prospecting?project_id=${projectId}\n`);

    process.exit(verifyData.data.icp_brief ? 0 : 1);

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

simulateUIWorkflow();
