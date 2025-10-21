/**
 * Full ICP Brief Workflow Test
 * Tests the complete workflow: create project -> generate prospects -> verify ICP save
 */

console.log('\n🧪 FULL ICP BRIEF WORKFLOW TEST\n');
console.log('='.repeat(70));

async function runFullWorkflow() {
  try {
    const UI_API = 'http://localhost:3000/api';
    const PROSPECTING_API = 'http://localhost:3010';

    console.log('\n📋 Step 1: Create a new project (no ICP brief initially)\n');

    const createResponse = await fetch(`${UI_API}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `ICP Workflow Test ${Date.now()}`,
        description: 'Testing ICP brief auto-save during prospect generation'
      })
    });

    if (!createResponse.ok) {
      throw new Error('Failed to create project');
    }

    const createData = await createResponse.json();
    const projectId = createData.data.id;

    console.log('✅ Project created:', projectId);
    console.log('✅ Project name:', createData.data.name);
    console.log('✅ Initial ICP brief:', createData.data.icp_brief || 'null');
    console.log('✅ Prospect count: 0 (new project)');

    console.log('\n📋 Step 2: Generate prospects with ICP brief\n');

    const icpBrief = {
      industry: 'Bakery',
      location: 'Boston, MA',
      pain_points: ['Outdated website', 'No online ordering'],
      business_size: '1-10 employees',
      revenue_range: '$100K-$500K',
      target_personas: ['Owner', 'Manager']
    };

    console.log('ICP Brief to use:');
    console.log(JSON.stringify(icpBrief, null, 2));

    // Generate 1 prospect via prospecting engine
    const prospectPayload = {
      brief: {
        ...icpBrief,
        count: 1
      },
      options: {
        projectId: projectId,
        verify: false,
        model: 'grok-4-fast'
      }
    };

    console.log('\n🔄 Calling prospecting engine...');
    console.log(`   Project ID: ${projectId}`);
    console.log(`   Count: 1`);

    const prospectResponse = await fetch(`${PROSPECTING_API}/api/prospect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prospectPayload)
    });

    if (!prospectResponse.ok) {
      const errorText = await prospectResponse.text();
      throw new Error(`Prospect generation failed: ${errorText}`);
    }

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
          const eventData = JSON.parse(line.slice(6));

          if (eventData.type === 'progress') {
            console.log(`   Progress: ${eventData.message}`);
          }

          if (eventData.type === 'complete') {
            completed = true;
            generatedCount = eventData.results?.prospects?.length || 0;
            console.log(`\n✅ Generation complete: ${generatedCount} prospects`);
          }
        }
      }
    }

    console.log('\n📋 Step 3: Check if ICP brief was saved to project\n');

    // Wait a moment for any async saves to complete
    await new Promise(resolve => setTimeout(resolve, 1000));

    const projectCheckResponse = await fetch(`${UI_API}/projects/${projectId}`);
    const projectCheckData = await projectCheckResponse.json();

    console.log('Project state after generation:');
    console.log(`  Name: ${projectCheckData.data.name}`);
    console.log(`  Has ICP brief: ${!!projectCheckData.data.icp_brief ? 'YES' : 'NO'}`);

    if (projectCheckData.data.icp_brief) {
      console.log(`  ICP Industry: ${projectCheckData.data.icp_brief.industry}`);
      console.log(`  ICP Location: ${projectCheckData.data.icp_brief.location}`);
      console.log('✅ ICP brief was saved!');
    } else {
      console.log('❌ ICP brief was NOT saved!');
      console.log('\n⚠️  This is the problem - ICP brief should be saved during prospect generation');
    }

    console.log('\n📋 Step 4: Check if prospects were linked to project\n');

    const prospectsCheckResponse = await fetch(`${UI_API}/projects/${projectId}/prospects`);
    const prospectsCheckData = await prospectsCheckResponse.json();

    const prospectCount = prospectsCheckData.data?.length || 0;
    console.log(`Prospect count: ${prospectCount}`);

    if (prospectCount > 0) {
      console.log('✅ Prospects were linked to project');
      console.log('Prospects:');
      prospectsCheckData.data.forEach(p => {
        console.log(`  • ${p.company_name} (${p.city}, ${p.state})`);
      });
    } else {
      console.log('❌ Prospects were NOT linked to project');
    }

    console.log('\n📋 Step 5: Verify lock status\n');

    const shouldBeLocked = prospectCount > 0;
    console.log(`Should be locked: ${shouldBeLocked ? 'YES' : 'NO'}`);

    if (shouldBeLocked) {
      // Try to update ICP brief - should fail
      const updateResponse = await fetch(`${UI_API}/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          icp_brief: {
            industry: 'Different Industry',
            location: 'Different Location'
          }
        })
      });

      if (updateResponse.status === 403) {
        console.log('✅ ICP brief is locked (cannot update)');
      } else {
        console.log('⚠️  ICP brief is NOT locked (update succeeded - this is wrong!)');
      }
    }

    console.log('\n='.repeat(70));

    if (!projectCheckData.data.icp_brief) {
      console.log('❌ TEST IDENTIFIED THE ISSUE');
      console.log('='.repeat(70));
      console.log('\n🔍 Problem: ICP brief is NOT being saved during prospect generation');
      console.log('\n💡 Possible causes:');
      console.log('   1. UI is not calling updateProject() with ICP brief');
      console.log('   2. SSE stream "complete" event is not triggering');
      console.log('   3. icpBriefLocked state is incorrectly true for new project');
      console.log('   4. updateProject() is failing silently\n');
      console.log('🔧 Next step: Add debug logging to UI prospecting page');
    } else {
      console.log('✅ TEST PASSED - ICP brief workflow works correctly');
      console.log('='.repeat(70));
    }

    console.log(`\n🔗 Test project URL: http://localhost:3000/prospecting?project_id=${projectId}\n`);

    process.exit(projectCheckData.data.icp_brief ? 0 : 1);

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runFullWorkflow();
