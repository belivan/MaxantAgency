import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from root .env
dotenv.config({ path: resolve(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const removeTest = args.includes('--remove-test');
const removeLow = args.includes('--remove-low');
const assignProjects = args.includes('--assign-projects');

console.log('\n═══════════════════════════════════════════════════════');
console.log('   PROSPECTS TABLE CLEANUP');
console.log('═══════════════════════════════════════════════════════\n');

if (dryRun) {
  console.log('🔍 DRY RUN MODE - No changes will be made\n');
}

async function performCleanup() {
  try {
    // Get all prospects
    const { data: allProspects, error } = await supabase
      .from('prospects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    console.log(`📊 Current state: ${allProspects.length} total prospects\n`);

    // Identify test data
    const testPatterns = [/test/i, /demo/i, /sample/i];
    const testData = allProspects.filter(p =>
      testPatterns.some(pattern =>
        pattern.test(p.company_name) ||
        pattern.test(p.industry || '')
      )
    );

    // Identify low relevance
    const lowRelevance = allProspects.filter(p => p.icp_match_score < 50);

    // Identify prospects without projects
    const noProject = allProspects.filter(p => !p.project_id);

    // Show what we found
    console.log('🔍 IDENTIFIED CLEANUP TARGETS:\n');

    if (testData.length > 0) {
      console.log(`🧪 Test Data (${testData.length} entries):`);
      testData.forEach(p => {
        console.log(`   - ${p.company_name}`);
        console.log(`     City: ${p.city}, Score: ${p.icp_match_score}, ID: ${p.id.slice(0, 8)}...`);
      });
      console.log('');
    }

    if (lowRelevance.length > 0) {
      console.log(`📉 Low Relevance (${lowRelevance.length} entries with score < 50):`);
      lowRelevance.forEach(p => {
        console.log(`   - ${p.company_name}`);
        console.log(`     City: ${p.city}, Score: ${p.icp_match_score}, ID: ${p.id.slice(0, 8)}...`);
      });
      console.log('');
    }

    console.log(`⚠️  Prospects without project: ${noProject.length}/${allProspects.length}\n`);

    // Show what would be done
    console.log('═══════════════════════════════════════════════════════');
    console.log('   CLEANUP ACTIONS');
    console.log('═══════════════════════════════════════════════════════\n');

    let deletedCount = 0;

    // Remove test data if requested
    if (removeTest && testData.length > 0) {
      console.log(`🧪 Removing ${testData.length} test data entries...`);
      if (!dryRun) {
        const ids = testData.map(p => p.id);
        const { error } = await supabase
          .from('prospects')
          .delete()
          .in('id', ids);

        if (error) throw error;
        deletedCount += testData.length;
        console.log(`   ✅ Deleted ${testData.length} test entries\n`);
      } else {
        console.log(`   Would delete: ${testData.map(p => p.company_name).join(', ')}\n`);
      }
    }

    // Remove low relevance if requested
    if (removeLow && lowRelevance.length > 0) {
      console.log(`📉 Removing ${lowRelevance.length} low relevance entries...`);
      if (!dryRun) {
        const ids = lowRelevance.map(p => p.id);
        const { error } = await supabase
          .from('prospects')
          .delete()
          .in('id', ids);

        if (error) throw error;
        deletedCount += lowRelevance.length;
        console.log(`   ✅ Deleted ${lowRelevance.length} low relevance entries\n`);
      } else {
        console.log(`   Would delete: ${lowRelevance.map(p => p.company_name).join(', ')}\n`);
      }
    }

    // Assign to default project if requested
    if (assignProjects && noProject.length > 0) {
      // Filter out any that were deleted
      const deletedIds = new Set();
      if (removeTest) testData.forEach(p => deletedIds.add(p.id));
      if (removeLow) lowRelevance.forEach(p => deletedIds.add(p.id));

      const toAssign = noProject.filter(p => !deletedIds.has(p.id));

      if (toAssign.length > 0) {
        console.log(`📁 Creating default project for ${toAssign.length} orphaned prospects...`);

        if (!dryRun) {
          // Create default project
          const { data: project, error: projectError } = await supabase
            .from('projects')
            .insert({
              name: 'Orphaned Prospects (Auto-created)',
              description: 'Default project for prospects without assignment',
              status: 'active',
              icp_brief: {
                industry: 'Various',
                city: 'Various',
                count: toAssign.length,
                note: 'Auto-created project for orphaned prospects'
              }
            })
            .select()
            .single();

          if (projectError) throw projectError;

          // Assign prospects
          const ids = toAssign.map(p => p.id);
          const { error: updateError } = await supabase
            .from('prospects')
            .update({ project_id: project.id })
            .in('id', ids);

          if (updateError) throw updateError;

          console.log(`   ✅ Created project and assigned ${toAssign.length} prospects`);
          console.log(`   Project ID: ${project.id}\n`);
        } else {
          console.log(`   Would create project and assign ${toAssign.length} prospects\n`);
        }
      }
    }

    // Show final summary
    if (!dryRun) {
      const { count } = await supabase
        .from('prospects')
        .select('*', { count: 'exact' });

      console.log('📊 CLEANUP SUMMARY:');
      console.log(`   - Started with: ${allProspects.length} prospects`);
      console.log(`   - Deleted: ${deletedCount} entries`);
      console.log(`   - Remaining: ${count} prospects`);
    } else {
      console.log('📊 DRY RUN SUMMARY:');
      console.log(`   - Would delete: ${
        (removeTest ? testData.length : 0) + (removeLow ? lowRelevance.length : 0)
      } entries`);
      console.log(`   - Would assign project to: ${assignProjects ? noProject.length : 0} prospects`);
    }

    // Show recommendations if nothing was done
    if (!removeTest && !removeLow && !assignProjects) {
      console.log('\n💡 RECOMMENDATIONS:\n');
      console.log('Run with options to perform cleanup:');
      console.log('   --dry-run         Preview changes without modifying database');
      console.log('   --remove-test     Remove test data entries');
      console.log('   --remove-low      Remove low relevance entries (score < 50)');
      console.log('   --assign-projects Create default project for orphaned prospects');
      console.log('\nExample: node cleanup-prospects-auto.js --dry-run --remove-test --remove-low');
    }

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

// Run cleanup
await performCleanup();

console.log('\n═══════════════════════════════════════════════════════');
console.log('   DONE');
console.log('═══════════════════════════════════════════════════════\n');

process.exit(0);