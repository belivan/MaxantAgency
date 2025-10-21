/**
 * Test: Prospecting Prompts Save Feature
 *
 * Verifies that prompts are loaded and can be saved to projects table
 */

import { loadAllProspectingPrompts, loadRawPrompt } from './shared/prompt-loader.js';
import { saveProjectProspectingPrompts } from './database/supabase-client.js';
import { supabase } from './database/supabase-client.js';

console.log('\n=======================================================');
console.log('   TEST: Prospecting Prompts Save Feature');
console.log('=======================================================\n');

let testsPassed = 0;
let testsFailed = 0;

// ================================================================
// TEST 1: Load individual prompts
// ================================================================

console.log('TEST 1: Load individual prompt files');
try {
  const queryPrompt = loadRawPrompt('01-query-understanding');
  const extractionPrompt = loadRawPrompt('04-website-extraction');
  const relevancePrompt = loadRawPrompt('07-relevance-check');

  console.log('✅ Query Understanding prompt loaded:', {
    name: queryPrompt.name,
    version: queryPrompt.version,
    model: queryPrompt.model
  });

  console.log('✅ Website Extraction prompt loaded:', {
    name: extractionPrompt.name,
    version: extractionPrompt.version,
    model: extractionPrompt.model
  });

  console.log('✅ Relevance Check prompt loaded:', {
    name: relevancePrompt.name,
    version: relevancePrompt.version,
    model: relevancePrompt.model
  });

  testsPassed++;
} catch (error) {
  console.error('❌ Failed to load individual prompts:', error.message);
  testsFailed++;
}

console.log('');

// ================================================================
// TEST 2: Load all prompts at once
// ================================================================

console.log('TEST 2: Load all prompts using loadAllProspectingPrompts()');
try {
  const allPrompts = loadAllProspectingPrompts();

  console.log('✅ All prompts loaded successfully');
  console.log('   - Query Understanding:', allPrompts.queryUnderstanding.name);
  console.log('   - Website Extraction:', allPrompts.websiteExtraction.name);
  console.log('   - Relevance Check:', allPrompts.relevanceCheck.name);
  console.log('   - Total prompts:', Object.keys(allPrompts).length);

  // Verify structure
  if (!allPrompts.queryUnderstanding || !allPrompts.websiteExtraction || !allPrompts.relevanceCheck) {
    throw new Error('Missing required prompt keys');
  }

  testsPassed++;
} catch (error) {
  console.error('❌ Failed to load all prompts:', error.message);
  testsFailed++;
}

console.log('');

// ================================================================
// TEST 3: Verify database column exists
// ================================================================

console.log('TEST 3: Verify prospecting_prompts column exists in projects table');
try {
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, prospecting_prompts')
    .limit(1);

  if (error) {
    throw error;
  }

  console.log('✅ Column exists and is accessible');
  console.log('   - Query returned successfully');

  testsPassed++;
} catch (error) {
  console.error('❌ Database column verification failed:', error.message);
  console.error('   Make sure you ran the migration: add-prospecting-prompts-column.sql');
  testsFailed++;
}

console.log('');

// ================================================================
// TEST 4: Test saving prompts to a project (if test project exists)
// ================================================================

console.log('TEST 4: Test saving prompts to a project');
try {
  // Find or create a test project
  let testProject;

  // Check if a test project exists
  const { data: existingProjects, error: selectError } = await supabase
    .from('projects')
    .select('id, name, prospecting_prompts')
    .limit(1);

  if (selectError) {
    throw selectError;
  }

  if (existingProjects && existingProjects.length > 0) {
    testProject = existingProjects[0];
    console.log(`   Using existing project: ${testProject.name} (${testProject.id})`);
  } else {
    // Create a test project
    const { data: newProject, error: createError } = await supabase
      .from('projects')
      .insert({
        name: 'Test Project - Prompt Save',
        description: 'Test project for verifying prompt save functionality',
        status: 'active'
      })
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    testProject = newProject;
    console.log(`   Created test project: ${testProject.name} (${testProject.id})`);
  }

  // Load and save prompts
  const prompts = loadAllProspectingPrompts();
  await saveProjectProspectingPrompts(testProject.id, prompts);

  console.log('✅ Prompts saved successfully to project');

  // Verify the save
  const { data: verifyProject, error: verifyError } = await supabase
    .from('projects')
    .select('prospecting_prompts')
    .eq('id', testProject.id)
    .single();

  if (verifyError) {
    throw verifyError;
  }

  if (!verifyProject.prospecting_prompts) {
    throw new Error('Prompts were not saved to database');
  }

  console.log('✅ Verified prompts in database:', {
    promptKeys: Object.keys(verifyProject.prospecting_prompts),
    queryUnderstandingModel: verifyProject.prospecting_prompts.queryUnderstanding?.model,
    websiteExtractionModel: verifyProject.prospecting_prompts.websiteExtraction?.model,
    relevanceCheckModel: verifyProject.prospecting_prompts.relevanceCheck?.model
  });

  testsPassed++;
} catch (error) {
  console.error('❌ Failed to save/verify prompts:', error.message);
  testsFailed++;
}

console.log('');

// ================================================================
// SUMMARY
// ================================================================

console.log('=======================================================');
console.log('   TEST SUMMARY');
console.log('=======================================================');
console.log(`✅ Passed: ${testsPassed}`);
console.log(`❌ Failed: ${testsFailed}`);
console.log(`Total: ${testsPassed + testsFailed}`);
console.log('=======================================================\n');

if (testsFailed === 0) {
  console.log('🎉 All tests passed! Prospecting prompts save feature is working correctly.\n');
  process.exit(0);
} else {
  console.log('⚠️  Some tests failed. Please review the errors above.\n');
  process.exit(1);
}
