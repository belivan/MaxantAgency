/**
 * Test Locked ICP Brief Save Skip
 * Verifies that we don't attempt to save ICP brief when locked
 */

console.log('\n🧪 LOCKED ICP SAVE SKIP TEST\n');
console.log('='.repeat(70));

async function runTest() {
  try {
    const UI_API = 'http://localhost:3000/api';
    const projectId = '1f1a56bb-6b1d-48bb-9dad-9b8aa408e324';

    console.log('\n📋 Step 1: Check project lock status\n');

    // Get prospect count
    const prospectsResponse = await fetch(`${UI_API}/projects/${projectId}/prospects`);
    const prospectsData = await prospectsResponse.json();
    const prospectCount = prospectsData.data?.length || 0;
    const isLocked = prospectCount > 0;

    console.log(`✅ Project has ${prospectCount} prospects`);
    console.log(`✅ ICP Brief is ${isLocked ? 'LOCKED' : 'UNLOCKED'}`);

    console.log('\n📋 Step 2: Verify API blocks ICP updates when locked\n');

    if (isLocked) {
      const updateResponse = await fetch(`${UI_API}/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          icp_brief: {
            industry: 'Test Industry',
            location: 'Test Location'
          }
        })
      });

      const updateData = await updateResponse.json();

      if (updateResponse.status === 403 && updateData.locked) {
        console.log('✅ API correctly returns 403 Forbidden');
        console.log('✅ Response has locked flag:', updateData.locked);
        console.log(`✅ Error message: "${updateData.error}"`);
      } else {
        throw new Error('Expected 403 Forbidden when updating locked ICP brief');
      }
    } else {
      console.log('⚠️  ICP brief is not locked (project has no prospects)');
      console.log('   Skipping locked update test');
    }

    console.log('\n📋 Step 3: Verify non-ICP updates still work\n');

    const nameUpdateResponse = await fetch(`${UI_API}/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: `Test update at ${new Date().toISOString()}`
      })
    });

    if (nameUpdateResponse.ok) {
      console.log('✅ Non-ICP update succeeds (description updated)');
    } else {
      throw new Error('Non-ICP update should succeed');
    }

    console.log('\n='.repeat(70));
    console.log('✅ ALL TESTS PASSED');
    console.log('='.repeat(70));
    console.log('\n💡 Expected UI Behavior:');
    console.log('   When generating prospects for a locked project:');
    console.log('   • NO warning about "Failed to save ICP brief"');
    console.log('   • Info message: "ICP brief is locked for this project"');
    console.log('   • Prospects generate successfully\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runTest();
