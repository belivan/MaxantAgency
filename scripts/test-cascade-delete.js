// Test CASCADE delete behavior
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testCascadeDelete() {
  console.log('🧪 Testing CASCADE DELETE behavior...\n');

  const testProjectId = '11111111-1111-1111-1111-111111111111';

  try {
    // Step 1: Create test project
    console.log('Step 1: Creating test project...');
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        id: testProjectId,
        name: 'CASCADE Delete Test',
        description: 'Test project to verify CASCADE delete works'
      })
      .select()
      .single();

    if (projectError) throw projectError;
    console.log(`✅ Created project: ${project.name}\n`);

    // Step 2: Create test lead for this project
    console.log('Step 2: Creating test lead for this project...');
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        company_name: 'Test Company for CASCADE',
        url: 'https://test-cascade.com',
        project_id: testProjectId,
        website_grade: 'C',
        overall_score: 75,
        design_score: 70,
        seo_score: 75,
        content_score: 80,
        social_score: 75
      })
      .select()
      .single();

    if (leadError) throw leadError;
    console.log(`✅ Created lead: ${lead.company_name}\n`);

    // Step 3: Verify lead exists
    console.log('Step 3: Verifying lead exists BEFORE delete...');
    const { data: beforeCount } = await supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', testProjectId);

    console.log(`   Leads with project_id=${testProjectId}: ${beforeCount?.length || 0}\n`);

    // Step 4: DELETE the project
    console.log('Step 4: DELETING the project...');
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', testProjectId);

    if (deleteError) throw deleteError;
    console.log(`✅ Deleted project\n`);

    // Step 5: Verify lead was CASCADE deleted
    console.log('Step 5: Verifying lead was CASCADE deleted AFTER delete...');
    const { data: afterLeads, count: afterCount } = await supabase
      .from('leads')
      .select('id', { count: 'exact' })
      .eq('project_id', testProjectId);

    console.log(`   Leads with project_id=${testProjectId}: ${afterCount || 0}\n`);

    // Final result
    if (afterCount === 0) {
      console.log('✅ ✅ ✅ CASCADE DELETE WORKS! ✅ ✅ ✅');
      console.log('   Lead was automatically deleted when project was deleted.\n');
      console.log('Summary:');
      console.log('- Created project + lead');
      console.log('- Deleted project');
      console.log('- Lead was automatically CASCADE deleted ✅');
      return true;
    } else {
      console.log('❌ CASCADE DELETE FAILED!');
      console.log(`   Lead still exists after project deletion (${afterCount} leads found)\n`);
      console.log('   Cleaning up test lead manually...');
      await supabase.from('leads').delete().eq('id', lead.id);
      return false;
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    // Cleanup on error
    await supabase.from('leads').delete().eq('project_id', testProjectId);
    await supabase.from('projects').delete().eq('id', testProjectId);
    return false;
  }
}

testCascadeDelete()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error(error);
    process.exit(1);
  });