/**
 * UI Debug Test - Find the exact issue with prospect count display
 */

console.log('\n🔍 UI DEBUG TEST - Finding the bug\n');
console.log('='.repeat(70));

async function debugUIIssue() {
  try {
    const UI_API = 'http://localhost:3000/api';

    // Use the project from the earlier test
    const projectId = '284d0c08-1955-43fc-8860-06959ab3f6e3';

    console.log('\n📋 Testing with project:', projectId);
    console.log('\n1️⃣ Fetch project data (what UI does):\n');

    const projectResponse = await fetch(`${UI_API}/projects/${projectId}`);
    const projectData = await projectResponse.json();

    console.log('Project API Response:');
    console.log('  Status:', projectResponse.status);
    console.log('  Success:', projectData.success);
    console.log('  Has data:', !!projectData.data);
    console.log('  Has ICP brief:', !!projectData.data?.icp_brief);

    if (projectData.data?.icp_brief) {
      console.log('  ICP brief:', JSON.stringify(projectData.data.icp_brief, null, 2));
    }

    console.log('\n2️⃣ Fetch prospects (what UI does):\n');

    const prospectsResponse = await fetch(`${UI_API}/projects/${projectId}/prospects`);
    console.log('Prospects API URL:', `${UI_API}/projects/${projectId}/prospects`);
    console.log('Response status:', prospectsResponse.status);
    console.log('Response ok:', prospectsResponse.ok);

    const prospectsData = await prospectsResponse.json();
    console.log('\nProspects API Response:');
    console.log('  Raw response:', JSON.stringify(prospectsData, null, 2));

    console.log('\n3️⃣ Calculate what UI should show:\n');

    const hasIcpBrief = !!(projectData.success && projectData.data?.icp_brief);
    const prospectCount = prospectsData.data?.length || 0;
    const shouldBeLocked = hasIcpBrief || prospectCount > 0;

    console.log('UI State Calculation:');
    console.log('  hasIcpBrief:', hasIcpBrief);
    console.log('  prospectCount:', prospectCount);
    console.log('  shouldBeLocked:', shouldBeLocked);

    console.log('\n4️⃣ What user should see:\n');

    if (shouldBeLocked) {
      console.log('✅ ICP Lock Banner should show');
      console.log(`   Message: "This project has ${prospectCount} prospect${prospectCount !== 1 ? 's' : ''}"`);
    } else {
      console.log('❌ ICP Lock Banner should NOT show');
    }

    console.log('\n5️⃣ Verify prospect data:\n');

    if (prospectsData.data && Array.isArray(prospectsData.data)) {
      console.log(`Total prospects: ${prospectsData.data.length}`);
      prospectsData.data.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.company_name || 'Unknown'} (${p.city || 'No city'}, ${p.state || 'No state'})`);
      });
    } else {
      console.log('❌ No prospects array in response');
    }

    console.log('\n='.repeat(70));

    if (prospectCount === 0 && prospectsData.data?.length > 0) {
      console.log('❌ BUG FOUND: Data exists but prospectCount calculated as 0');
      console.log('   prospectsData.data.length:', prospectsData.data.length);
      console.log('   prospectCount:', prospectCount);
    } else if (prospectCount > 0) {
      console.log('✅ Prospect count is correct:', prospectCount);
      console.log('\n⚠️  If UI shows 0, the problem is:');
      console.log('   1. Next.js not hot-reloading the changes');
      console.log('   2. Browser cache showing old code');
      console.log('   3. State update not triggering re-render');
    }

    console.log('\n🔧 Try this:');
    console.log('   1. Hard refresh browser: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)');
    console.log('   2. Clear browser cache');
    console.log('   3. Restart Next.js dev server: npm run dev:ui');
    console.log('   4. Open browser DevTools console and check for errors\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

debugUIIssue();
