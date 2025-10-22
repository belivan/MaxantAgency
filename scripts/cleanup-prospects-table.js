import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import readline from 'readline';

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

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

console.log('\n═══════════════════════════════════════════════════════');
console.log('   PROSPECTS TABLE CLEANUP TOOL');
console.log('═══════════════════════════════════════════════════════\n');

async function identifyCleanupTargets() {
  try {
    // Get all prospects
    const { data: allProspects, error } = await supabase
      .from('prospects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const cleanupTargets = {
      testData: [],
      lowRelevance: [],
      noProject: []
    };

    // Identify test data
    const testPatterns = [/test/i, /demo/i, /sample/i];
    allProspects.forEach(p => {
      if (testPatterns.some(pattern =>
        pattern.test(p.company_name) ||
        pattern.test(p.industry || '')
      )) {
        cleanupTargets.testData.push(p);
      }
    });

    // Identify low relevance
    allProspects.forEach(p => {
      if (p.icp_match_score < 50) {
        cleanupTargets.lowRelevance.push(p);
      }
    });

    // Identify prospects without projects
    allProspects.forEach(p => {
      if (!p.project_id) {
        cleanupTargets.noProject.push(p);
      }
    });

    return { allProspects, cleanupTargets };
  } catch (error) {
    console.error('❌ Failed to fetch prospects:', error);
    process.exit(1);
  }
}

async function performCleanup() {
  const { allProspects, cleanupTargets } = await identifyCleanupTargets();

  console.log('📊 CLEANUP TARGETS IDENTIFIED:\n');

  // Show test data
  if (cleanupTargets.testData.length > 0) {
    console.log(`🧪 Test Data (${cleanupTargets.testData.length} entries):`);
    cleanupTargets.testData.forEach(p => {
      console.log(`   - ${p.company_name} (${p.city}) - Score: ${p.icp_match_score}`);
    });
    console.log('');
  }

  // Show low relevance
  if (cleanupTargets.lowRelevance.length > 0) {
    console.log(`📉 Low Relevance (${cleanupTargets.lowRelevance.length} entries with score < 50):`);
    cleanupTargets.lowRelevance.forEach(p => {
      console.log(`   - ${p.company_name} (${p.city}) - Score: ${p.icp_match_score}`);
    });
    console.log('');
  }

  // Show no project summary
  console.log(`⚠️  Prospects without project: ${cleanupTargets.noProject.length}/${allProspects.length}\n`);

  console.log('═══════════════════════════════════════════════════════');
  console.log('   CLEANUP OPTIONS');
  console.log('═══════════════════════════════════════════════════════\n');

  const actions = [];

  // Ask about test data
  if (cleanupTargets.testData.length > 0) {
    const removeTest = await question(`1. Remove ${cleanupTargets.testData.length} test data entries? (y/n): `);
    if (removeTest.toLowerCase() === 'y') {
      actions.push({ type: 'removeTest', targets: cleanupTargets.testData });
    }
  }

  // Ask about low relevance
  if (cleanupTargets.lowRelevance.length > 0) {
    const removeLow = await question(`2. Remove ${cleanupTargets.lowRelevance.length} low relevance entries (score < 50)? (y/n): `);
    if (removeLow.toLowerCase() === 'y') {
      actions.push({ type: 'removeLow', targets: cleanupTargets.lowRelevance });
    }
  }

  // Ask about creating default project
  if (cleanupTargets.noProject.length > 0) {
    const createProject = await question(`3. Create a default project and assign ${cleanupTargets.noProject.length} orphaned prospects? (y/n): `);
    if (createProject.toLowerCase() === 'y') {
      actions.push({ type: 'assignProject', targets: cleanupTargets.noProject });
    }
  }

  if (actions.length === 0) {
    console.log('\n✅ No cleanup actions selected. Exiting...');
    rl.close();
    return;
  }

  // Confirm actions
  console.log('\n📋 PLANNED ACTIONS:');
  let totalToDelete = 0;
  actions.forEach(action => {
    if (action.type === 'removeTest') {
      console.log(`   - Delete ${action.targets.length} test data entries`);
      totalToDelete += action.targets.length;
    }
    if (action.type === 'removeLow') {
      console.log(`   - Delete ${action.targets.length} low relevance entries`);
      totalToDelete += action.targets.length;
    }
    if (action.type === 'assignProject') {
      console.log(`   - Create default project and assign ${action.targets.length} prospects`);
    }
  });

  const proceed = await question(`\n⚠️  This will modify the database. Continue? (y/n): `);
  if (proceed.toLowerCase() !== 'y') {
    console.log('❌ Cleanup cancelled.');
    rl.close();
    return;
  }

  // Execute cleanup
  console.log('\n🧹 EXECUTING CLEANUP...\n');

  for (const action of actions) {
    try {
      if (action.type === 'removeTest' || action.type === 'removeLow') {
        const ids = action.targets.map(p => p.id);
        const { error } = await supabase
          .from('prospects')
          .delete()
          .in('id', ids);

        if (error) throw error;

        console.log(`✅ Deleted ${action.targets.length} ${action.type === 'removeTest' ? 'test data' : 'low relevance'} entries`);
      }

      if (action.type === 'assignProject') {
        // Create a default project
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .insert({
            name: 'Unassigned Prospects (Auto-created)',
            description: 'Default project for orphaned prospects',
            status: 'active',
            discovery_config: {
              industry: 'Various',
              city: 'Various',
              count: action.targets.length
            }
          })
          .select()
          .single();

        if (projectError) throw projectError;

        // Update all orphaned prospects
        const ids = action.targets.map(p => p.id);
        const { error: updateError } = await supabase
          .from('prospects')
          .update({ project_id: project.id })
          .in('id', ids);

        if (updateError) throw updateError;

        console.log(`✅ Created project "${project.name}" and assigned ${action.targets.length} prospects`);
        console.log(`   Project ID: ${project.id}`);
      }
    } catch (error) {
      console.error(`❌ Failed to execute ${action.type}:`, error);
    }
  }

  // Show final stats
  const { data: remaining, count } = await supabase
    .from('prospects')
    .select('*', { count: 'exact' });

  console.log('\n📊 CLEANUP COMPLETE:');
  console.log(`   - Deleted: ${totalToDelete} entries`);
  console.log(`   - Remaining: ${count} prospects`);

  rl.close();
}

// Run cleanup
await performCleanup();

console.log('\n═══════════════════════════════════════════════════════');
console.log('   CLEANUP TOOL FINISHED');
console.log('═══════════════════════════════════════════════════════\n');

process.exit(0);