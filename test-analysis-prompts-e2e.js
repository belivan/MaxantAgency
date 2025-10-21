/**
 * End-to-End Test: Analysis Prompts Flow
 *
 * Simulates the complete flow:
 * 1. Create a project
 * 2. Save analysis config from UI (tier, modules, etc.)
 * 3. Simulate what Analysis Engine does - merge prompts into config
 * 4. Verify prompts are accessible from UI
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function runTest() {
  console.log('\n🧪 End-to-End Test: Analysis Prompts Flow\n');

  try {
    // STEP 1: Create a test project
    console.log('1️⃣  Creating test project...');
    const { data: project, error: createError } = await supabase
      .from('projects')
      .insert({
        name: 'E2E Test: Analysis Prompts',
        description: 'Testing complete analysis prompts flow',
        status: 'active'
      })
      .select()
      .single();

    if (createError) throw createError;
    console.log(`✅ Created project: ${project.id}\n`);

    // STEP 2: Simulate UI saving analysis config (what happens in analysis page)
    console.log('2️⃣  Simulating UI saving analysis config...');
    const uiConfig = {
      tier: 'full',
      modules: ['design', 'seo', 'content', 'social'],
      capture_screenshots: true,
      max_pages: 30,
      level_2_sample_rate: 0.5,
      max_crawl_time: 120
    };

    const { data: updatedProject1, error: update1Error } = await supabase
      .from('projects')
      .update({ analysis_config: uiConfig })
      .eq('id', project.id)
      .select()
      .single();

    if (update1Error) throw update1Error;
    console.log('✅ UI saved analysis config:');
    console.log(`   - Tier: ${uiConfig.tier}`);
    console.log(`   - Modules: ${uiConfig.modules.join(', ')}`);
    console.log(`   - Max pages: ${uiConfig.max_pages}\n`);

    // STEP 3: Simulate Analysis Engine merging prompts (what happens in server.js)
    console.log('3️⃣  Simulating Analysis Engine merging prompts...');

    // Fetch current config (like Analysis Engine does)
    const { data: currentProject, error: fetchError } = await supabase
      .from('projects')
      .select('analysis_config')
      .eq('id', project.id)
      .single();

    if (fetchError) throw fetchError;

    // Mock prompts (in real flow, this comes from collectAnalysisPrompts())
    const mockPrompts = {
      design: {
        name: 'design-critique',
        model: 'gpt-5',
        description: 'Design analysis prompt',
        version: '1.0'
      },
      seo: {
        name: 'seo-analysis',
        model: 'gpt-5',
        description: 'SEO analysis prompt',
        version: '1.0'
      },
      content: {
        name: 'content-analysis',
        model: 'gpt-5',
        description: 'Content analysis prompt',
        version: '1.0'
      },
      social: {
        name: 'social-analysis',
        model: 'gpt-5',
        description: 'Social media analysis prompt',
        version: '1.0'
      },
      _meta: {
        collectedAt: new Date().toISOString(),
        version: '1.0'
      }
    };

    // Merge prompts with existing config (CRITICAL: preserve existing config)
    const existingConfig = currentProject.analysis_config || {};
    const mergedConfig = {
      ...existingConfig,
      prompts: mockPrompts,
      prompts_updated_at: new Date().toISOString()
    };

    const { data: updatedProject2, error: update2Error } = await supabase
      .from('projects')
      .update({ analysis_config: mergedConfig })
      .eq('id', project.id)
      .select()
      .single();

    if (update2Error) throw update2Error;
    console.log('✅ Analysis Engine merged prompts into config\n');

    // STEP 4: Verify final state (what UI will see)
    console.log('4️⃣  Verifying final state (UI perspective)...');
    const { data: finalProject, error: verifyError } = await supabase
      .from('projects')
      .select('id, name, analysis_config')
      .eq('id', project.id)
      .single();

    if (verifyError) throw verifyError;

    const config = finalProject.analysis_config;

    // Check that both UI config AND prompts are preserved
    const hasUIConfig = config.tier === 'full' && config.modules && config.modules.length === 4;
    const hasPrompts = config.prompts &&
                       config.prompts.design &&
                       config.prompts.seo &&
                       config.prompts.content &&
                       config.prompts.social;

    console.log('📊 Final analysis_config contains:');
    console.log(`   ${hasUIConfig ? '✅' : '❌'} UI Config (tier, modules, etc.)`);
    console.log(`      - Tier: ${config.tier}`);
    console.log(`      - Modules: ${config.modules?.join(', ')}`);
    console.log(`      - Max pages: ${config.max_pages}`);
    console.log(`   ${hasPrompts ? '✅' : '❌'} Analysis Prompts`);
    console.log(`      - Design: ${config.prompts?.design?.name}`);
    console.log(`      - SEO: ${config.prompts?.seo?.name}`);
    console.log(`      - Content: ${config.prompts?.content?.name}`);
    console.log(`      - Social: ${config.prompts?.social?.name}`);
    console.log(`   ✅ Prompts updated: ${config.prompts_updated_at}\n`);

    // STEP 5: Cleanup
    console.log('5️⃣  Cleaning up test project...');
    await supabase
      .from('projects')
      .delete()
      .eq('id', project.id);
    console.log('✅ Test project deleted\n');

    // Final result
    if (hasUIConfig && hasPrompts) {
      console.log('✅ END-TO-END TEST PASSED!\n');
      console.log('Summary:');
      console.log('  ✓ UI config is preserved when prompts are added');
      console.log('  ✓ Prompts are successfully merged into analysis_config');
      console.log('  ✓ Both UI settings and prompts coexist in same JSONB column');
      console.log('  ✓ Data is accessible for UI to display\n');
    } else {
      console.log('❌ TEST FAILED - Config merge issue\n');
      console.log('Config state:', JSON.stringify(config, null, 2));
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runTest();
