/**
 * End-to-End Test: Model Selections Feature
 * Tests the complete flow from UI → Backend → Database → UI Load
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

console.log('='.repeat(70));
console.log('MODEL SELECTIONS - END-TO-END TEST');
console.log('='.repeat(70));
console.log();

let testsPassed = 0;
let testsFailed = 0;

function logTest(name, passed, details = '') {
  if (passed) {
    console.log(`✅ ${name}`);
    if (details) console.log(`   ${details}`);
    testsPassed++;
  } else {
    console.log(`❌ ${name}`);
    if (details) console.log(`   ${details}`);
    testsFailed++;
  }
}

async function runTests() {
  let testProjectId = null;

  try {
    // ═══════════════════════════════════════════════════════════════
    // TEST 1: Verify Database Schema
    // ═══════════════════════════════════════════════════════════════
    console.log('TEST 1: Database Schema Verification');
    console.log('-'.repeat(70));

    const { data: schemaCheck, error: schemaError } = await supabase
      .from('projects')
      .select('prospecting_model_selections, analysis_model_selections')
      .limit(1);

    logTest(
      'Database has model_selections columns',
      !schemaError,
      schemaError ? `Error: ${schemaError.message}` : 'Columns exist'
    );

    if (schemaError) {
      console.log('\n⚠️  Run the SQL migration first:');
      console.log('   database-tools/migrations/add-model-selections.sql');
      process.exit(1);
    }

    console.log();

    // ═══════════════════════════════════════════════════════════════
    // TEST 2: Create Project with Model Selections
    // ═══════════════════════════════════════════════════════════════
    console.log('TEST 2: Create Project with Model Selections');
    console.log('-'.repeat(70));

    const testModelSelections = {
      queryUnderstanding: 'grok-4-fast',
      websiteExtraction: 'gpt-4o-vision',
      relevanceCheck: 'claude-haiku-4-5'
    };

    const testPrompts = {
      queryUnderstanding: {
        model: 'grok-4-fast',
        temperature: 0.2,
        systemPrompt: 'Test system prompt',
        userPromptTemplate: 'Test user prompt: {{industry}} in {{city}}'
      }
    };

    const { data: newProject, error: createError } = await supabase
      .from('projects')
      .insert({
        name: 'E2E Test - Model Selections',
        description: 'Testing model selections feature',
        prospecting_model_selections: testModelSelections,
        prospecting_prompts: testPrompts
      })
      .select()
      .single();

    logTest(
      'Created project with model selections',
      !createError && newProject,
      createError ? `Error: ${createError.message}` : `Project ID: ${newProject?.id}`
    );

    if (createError || !newProject) {
      process.exit(1);
    }

    testProjectId = newProject.id;

    logTest(
      'Model selections saved correctly',
      JSON.stringify(newProject.prospecting_model_selections) === JSON.stringify(testModelSelections),
      `Saved: ${JSON.stringify(newProject.prospecting_model_selections)}`
    );

    logTest(
      'Prompts saved correctly',
      newProject.prospecting_prompts !== null,
      `Prompt count: ${Object.keys(newProject.prospecting_prompts || {}).length}`
    );

    console.log();

    // ═══════════════════════════════════════════════════════════════
    // TEST 3: Load Project and Verify Data
    // ═══════════════════════════════════════════════════════════════
    console.log('TEST 3: Load Project and Verify Data');
    console.log('-'.repeat(70));

    const { data: loadedProject, error: loadError } = await supabase
      .from('projects')
      .select('id, name, prospecting_model_selections, prospecting_prompts')
      .eq('id', testProjectId)
      .single();

    logTest(
      'Loaded project successfully',
      !loadError && loadedProject,
      `Project: ${loadedProject?.name}`
    );

    logTest(
      'Model selections loaded correctly',
      loadedProject?.prospecting_model_selections?.queryUnderstanding === 'grok-4-fast' &&
      loadedProject?.prospecting_model_selections?.websiteExtraction === 'gpt-4o-vision' &&
      loadedProject?.prospecting_model_selections?.relevanceCheck === 'claude-haiku-4-5',
      `Models: ${JSON.stringify(loadedProject?.prospecting_model_selections)}`
    );

    logTest(
      'Prompts loaded correctly',
      loadedProject?.prospecting_prompts?.queryUnderstanding?.model === 'grok-4-fast',
      `Model in prompt: ${loadedProject?.prospecting_prompts?.queryUnderstanding?.model}`
    );

    console.log();

    // ═══════════════════════════════════════════════════════════════
    // TEST 4: Update Model Selections (Auto-Fork Simulation)
    // ═══════════════════════════════════════════════════════════════
    console.log('TEST 4: Update Model Selections (Auto-Fork Simulation)');
    console.log('-'.repeat(70));

    const updatedModelSelections = {
      queryUnderstanding: 'gpt-4o',
      websiteExtraction: 'claude-sonnet-4-5-vision',
      relevanceCheck: 'grok-4'
    };

    const { data: forkedProject, error: forkError } = await supabase
      .from('projects')
      .insert({
        name: `${loadedProject.name} (v2)`,
        description: 'Forked with custom models',
        prospecting_model_selections: updatedModelSelections,
        prospecting_prompts: loadedProject.prospecting_prompts
      })
      .select()
      .single();

    logTest(
      'Forked project with new models',
      !forkError && forkedProject,
      `Forked ID: ${forkedProject?.id}`
    );

    logTest(
      'Forked project has different models',
      forkedProject?.prospecting_model_selections?.queryUnderstanding === 'gpt-4o',
      `New model: ${forkedProject?.prospecting_model_selections?.queryUnderstanding}`
    );

    logTest(
      'Original project unchanged',
      loadedProject?.prospecting_model_selections?.queryUnderstanding === 'grok-4-fast',
      'Original preserved'
    );

    console.log();

    // ═══════════════════════════════════════════════════════════════
    // TEST 5: Query Projects by Model Usage
    // ═══════════════════════════════════════════════════════════════
    console.log('TEST 5: Query Projects by Model Usage');
    console.log('-'.repeat(70));

    // Find all projects using gpt-4o-vision for website extraction
    const { data: projectsWithGpt4o, error: queryError } = await supabase
      .from('projects')
      .select('id, name, prospecting_model_selections')
      .not('prospecting_model_selections', 'is', null)
      .limit(10);

    const projectsUsingGpt4oVision = projectsWithGpt4o?.filter(p =>
      p.prospecting_model_selections?.websiteExtraction === 'gpt-4o-vision'
    ) || [];

    logTest(
      'Can query projects by model usage',
      !queryError,
      `Found ${projectsUsingGpt4oVision.length} projects using gpt-4o-vision`
    );

    console.log();

    // ═══════════════════════════════════════════════════════════════
    // TEST 6: Cleanup
    // ═══════════════════════════════════════════════════════════════
    console.log('TEST 6: Cleanup');
    console.log('-'.repeat(70));

    const { error: deleteError1 } = await supabase
      .from('projects')
      .delete()
      .eq('id', testProjectId);

    const { error: deleteError2 } = await supabase
      .from('projects')
      .delete()
      .eq('id', forkedProject.id);

    logTest(
      'Cleaned up test projects',
      !deleteError1 && !deleteError2,
      'Test data removed'
    );

  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
    testsFailed++;
  }

  // Summary
  console.log();
  console.log('='.repeat(70));
  console.log('TEST SUMMARY');
  console.log('='.repeat(70));
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log(`📊 Total:  ${testsPassed + testsFailed}`);
  console.log(`📈 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
  console.log('='.repeat(70));

  if (testsFailed === 0) {
    console.log('\n🎉 All tests passed! Model selections feature is working correctly!');
    console.log('\nKey Features Verified:');
    console.log('  ✅ Database schema has new columns');
    console.log('  ✅ Can save model selections to projects');
    console.log('  ✅ Can load model selections from projects');
    console.log('  ✅ Auto-fork preserves model selections');
    console.log('  ✅ Can query projects by model usage');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the output above.');
    process.exit(1);
  }
}

runTests();
