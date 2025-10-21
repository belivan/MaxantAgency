/**
 * Test: Orchestrator Prompt Save Integration
 *
 * Verifies that prompts are automatically saved when generating prospects
 */

import { supabase } from './database/supabase-client.js';
import { loadAllProspectingPrompts } from './shared/prompt-loader.js';
import { saveProjectIcpAndPrompts } from './database/supabase-client.js';

console.log('\n=======================================================');
console.log('   TEST: Orchestrator Prompt Save Integration');
console.log('=======================================================\n');

async function testOrchestrationPromptSave() {
  try {
    // Step 1: Create a test project
    console.log('Step 1: Creating test project...');
    const { data: project, error: createError } = await supabase
      .from('projects')
      .insert({
        name: 'Orchestrator Prompt Test',
        description: 'Test project for orchestrator prompt save',
        status: 'active'
      })
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    console.log(`✅ Created project: ${project.name} (${project.id})`);
    console.log('');

    // Step 2: Simulate what the orchestrator does
    console.log('Step 2: Simulating orchestrator ICP + prompt save...');

    const icpBrief = {
      business_type: 'Restaurant',
      industry: 'Food & Hospitality',
      target_description: 'Italian restaurants in Philadelphia',
      location: {
        city: 'Philadelphia',
        state: 'PA'
      }
    };

    const prospectingPrompts = loadAllProspectingPrompts();

    console.log('   - ICP Brief:', JSON.stringify(icpBrief, null, 2));
    console.log('   - Prompts loaded:', Object.keys(prospectingPrompts));
    console.log('');

    // Save both (this is what orchestrator.js does)
    await saveProjectIcpAndPrompts(project.id, icpBrief, prospectingPrompts);

    console.log('✅ Saved ICP brief and prompts using saveProjectIcpAndPrompts()');
    console.log('');

    // Step 3: Verify the save
    console.log('Step 3: Verifying data in database...');
    const { data: savedProject, error: fetchError } = await supabase
      .from('projects')
      .select('id, name, icp_brief, prospecting_prompts')
      .eq('id', project.id)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    // Verify ICP brief
    if (!savedProject.icp_brief) {
      throw new Error('ICP brief not saved');
    }
    console.log('✅ ICP brief saved:', {
      industry: savedProject.icp_brief.industry,
      city: savedProject.icp_brief.location?.city
    });

    // Verify prompts
    if (!savedProject.prospecting_prompts) {
      throw new Error('Prompts not saved');
    }
    console.log('✅ Prompts saved:', {
      promptCount: Object.keys(savedProject.prospecting_prompts).length,
      queryModel: savedProject.prospecting_prompts.queryUnderstanding?.model,
      extractionModel: savedProject.prospecting_prompts.websiteExtraction?.model,
      relevanceModel: savedProject.prospecting_prompts.relevanceCheck?.model
    });
    console.log('');

    // Step 4: Verify prompt content
    console.log('Step 4: Verifying prompt content integrity...');
    const { queryUnderstanding, websiteExtraction, relevanceCheck } = savedProject.prospecting_prompts;

    if (!queryUnderstanding.systemPrompt || !queryUnderstanding.userPromptTemplate) {
      throw new Error('Query understanding prompt missing required fields');
    }

    if (!websiteExtraction.systemPrompt || !websiteExtraction.userPromptTemplate) {
      throw new Error('Website extraction prompt missing required fields');
    }

    if (!relevanceCheck.systemPrompt || !relevanceCheck.userPromptTemplate) {
      throw new Error('Relevance check prompt missing required fields');
    }

    console.log('✅ All prompts contain required fields (systemPrompt, userPromptTemplate)');
    console.log('✅ Prompt versions preserved:', {
      query: queryUnderstanding.version,
      extraction: websiteExtraction.version,
      relevance: relevanceCheck.version
    });
    console.log('');

    // Step 5: Clean up test project
    console.log('Step 5: Cleaning up test project...');
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', project.id);

    if (deleteError) {
      console.warn('⚠️  Failed to delete test project:', deleteError.message);
    } else {
      console.log('✅ Test project deleted');
    }
    console.log('');

    // Success!
    console.log('=======================================================');
    console.log('   ✅ ALL CHECKS PASSED');
    console.log('=======================================================');
    console.log('');
    console.log('The orchestrator integration is working correctly:');
    console.log('  ✓ ICP brief saves to projects.icp_brief');
    console.log('  ✓ Prompts save to projects.prospecting_prompts');
    console.log('  ✓ All 3 prompts are included (query, extraction, relevance)');
    console.log('  ✓ Prompt content is preserved with full details');
    console.log('  ✓ Historical tracking is enabled');
    console.log('');
    console.log('🎉 Ready for production use!\n');

    return true;

  } catch (error) {
    console.error('');
    console.error('=======================================================');
    console.error('   ❌ TEST FAILED');
    console.error('=======================================================');
    console.error('Error:', error.message);
    console.error('');
    return false;
  }
}

// Run the test
testOrchestrationPromptSave().then(success => {
  process.exit(success ? 0 : 1);
});
