/**
 * Check if prospects are linked to projects in the database
 */

console.log('\n🔍 CHECKING PROJECT-PROSPECT LINKS\n');
console.log('='.repeat(70));

async function checkLinks() {
  try {
    const UI_API = 'http://localhost:3000/api';

    // Get all projects
    const projectsResponse = await fetch(`${UI_API}/projects?limit=10`);
    const projectsData = await projectsResponse.json();

    if (!projectsData.success || !projectsData.data) {
      throw new Error('Failed to fetch projects');
    }

    console.log(`\n📋 Found ${projectsData.data.length} projects\n`);

    for (const project of projectsData.data) {
      // Get prospects for each project
      const prospectsResponse = await fetch(`${UI_API}/projects/${project.id}/prospects`);
      const prospectsData = await prospectsResponse.json();

      const count = prospectsData.data?.length || 0;
      const hasIcpBrief = !!project.icp_brief;
      const isLocked = count > 0;

      console.log(`Project: ${project.name}`);
      console.log(`  ID: ${project.id}`);
      console.log(`  Prospects: ${count}`);
      console.log(`  Has ICP Brief: ${hasIcpBrief ? 'YES' : 'NO'}`);
      console.log(`  ICP Locked: ${isLocked ? 'YES' : 'NO'}`);

      if (count > 0) {
        console.log(`  First 3 prospects:`);
        prospectsData.data.slice(0, 3).forEach(p => {
          console.log(`    • ${p.company_name || 'Unknown'} (${p.city || 'No city'}, ${p.state || 'No state'})`);
        });
      }

      console.log('');
    }

    // Check for orphaned prospects (not linked to any project)
    console.log('='.repeat(70));
    console.log('\n🔍 Checking for orphaned prospects...\n');

    // This would require a direct database query
    console.log('⚠️  Cannot check orphaned prospects via API');
    console.log('   (Would need direct Supabase query)\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkLinks();
