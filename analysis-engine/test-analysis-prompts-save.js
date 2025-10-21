/**
 * Test: Analysis Prompts Save to Project
 *
 * Verifies:
 * 1. analysis_config column exists in projects table
 * 2. collectAnalysisPrompts() successfully loads all prompts
 * 3. Prompts can be saved to projects.analysis_config
 * 4. Prompts can be read back from the database
 */

import { createClient } from '@supabase/supabase-js';
import { collectAnalysisPrompts } from './shared/prompt-loader.js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function runTest() {
  console.log('\n🧪 Testing Analysis Prompts Save to Project\n');

  try {
    // STEP 1: Verify projects table has analysis_config column
    console.log('1️⃣  Verifying analysis_config column exists...');
    const { data: projects, error: fetchError } = await supabase
      .from('projects')
      .select('id, name, analysis_config')
      .limit(1);

    if (fetchError) {
      if (fetchError.message.includes('analysis_config')) {
        console.error('❌ FAILED: analysis_config column does not exist!');
        console.error('   Run: cd database-tools && npm run db:setup');
        return;
      }
      throw fetchError;
    }

    console.log('✅ analysis_config column exists\n');

    // STEP 2: Collect analysis prompts
    console.log('2️⃣  Collecting analysis prompts...');
    const analysisPrompts = await collectAnalysisPrompts();

    console.log('✅ Successfully collected prompts:');
    console.log(`   - Design: ${analysisPrompts.design.name} (${analysisPrompts.design.model})`);
    console.log(`   - SEO: ${analysisPrompts.seo.name} (${analysisPrompts.seo.model})`);
    console.log(`   - Content: ${analysisPrompts.content.name} (${analysisPrompts.content.model})`);
    console.log(`   - Social: ${analysisPrompts.social.name} (${analysisPrompts.social.model})`);
    console.log(`   - Metadata: ${JSON.stringify(analysisPrompts._meta)}\n`);

    // STEP 3: Find or create a test project
    console.log('3️⃣  Finding or creating test project...');
    let testProject;

    const { data: existingProjects } = await supabase
      .from('projects')
      .select('id, name, analysis_config')
      .eq('name', 'Test Analysis Prompts')
      .limit(1);

    if (existingProjects && existingProjects.length > 0) {
      testProject = existingProjects[0];
      console.log(`✅ Using existing project: ${testProject.id}`);
    } else {
      const { data: newProject, error: createError } = await supabase
        .from('projects')
        .insert({
          name: 'Test Analysis Prompts',
          description: 'Test project for analysis prompts save verification',
          status: 'active'
        })
        .select()
        .single();

      if (createError) throw createError;
      testProject = newProject;
      console.log(`✅ Created new project: ${testProject.id}`);
    }

    console.log('');

    // STEP 4: Save prompts to project (merge with existing config)
    console.log('4️⃣  Saving prompts to project...');

    const existingConfig = testProject.analysis_config || {};
    const updatedConfig = {
      ...existingConfig,
      prompts: analysisPrompts,
      prompts_updated_at: new Date().toISOString(),
      test_run: true
    };

    const { data: updatedProject, error: updateError } = await supabase
      .from('projects')
      .update({ analysis_config: updatedConfig })
      .eq('id', testProject.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ FAILED to save prompts:', updateError);
      throw updateError;
    }

    console.log('✅ Successfully saved prompts to project\n');

    // STEP 5: Verify prompts were saved correctly
    console.log('5️⃣  Verifying saved prompts...');

    const { data: verifyProject, error: verifyError } = await supabase
      .from('projects')
      .select('id, name, analysis_config')
      .eq('id', testProject.id)
      .single();

    if (verifyError) throw verifyError;

    if (!verifyProject.analysis_config?.prompts) {
      console.error('❌ FAILED: Prompts not found in analysis_config');
      return;
    }

    const savedPrompts = verifyProject.analysis_config.prompts;

    // Verify all 4 prompts exist
    const hasDesign = savedPrompts.design?.name === 'design-critique';
    const hasSEO = savedPrompts.seo?.name === 'seo-analysis';
    const hasContent = savedPrompts.content?.name === 'content-analysis';
    const hasSocial = savedPrompts.social?.name === 'social-analysis';

    console.log(`   ${hasDesign ? '✅' : '❌'} Design prompt: ${savedPrompts.design?.name}`);
    console.log(`   ${hasSEO ? '✅' : '❌'} SEO prompt: ${savedPrompts.seo?.name}`);
    console.log(`   ${hasContent ? '✅' : '❌'} Content prompt: ${savedPrompts.content?.name}`);
    console.log(`   ${hasSocial ? '✅' : '❌'} Social prompt: ${savedPrompts.social?.name}`);
    console.log(`   ✅ Updated at: ${verifyProject.analysis_config.prompts_updated_at}`);

    if (hasDesign && hasSEO && hasContent && hasSocial) {
      console.log('\n✅ ALL TESTS PASSED!\n');
      console.log('Summary:');
      console.log('  - analysis_config column exists and is accessible');
      console.log('  - collectAnalysisPrompts() works correctly');
      console.log('  - Prompts can be saved to and read from Supabase');
      console.log('  - All 4 analysis prompts are stored with full configuration\n');
    } else {
      console.log('\n❌ SOME TESTS FAILED - Check output above\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runTest();
