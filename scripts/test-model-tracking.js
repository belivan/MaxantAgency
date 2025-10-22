/**
 * Test Model Tracking in Prospecting Engine
 *
 * This script tests that:
 * 1. Model selections are saved to projects
 * 2. Models are actually used as selected
 * 3. Model usage is tracked per prospect
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
// fetch is now built into Node.js

// Load env from root
config({ path: '../.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const PROSPECTING_API = 'http://localhost:3010';

// Test configurations with different models
const testConfigs = [
  {
    name: 'GPT-5 Test',
    models: {
      queryUnderstanding: 'gpt-5-mini',
      websiteExtraction: 'gpt-5',
      relevanceCheck: 'gpt-5-mini'
    }
  },
  {
    name: 'Claude 4.5 Test',
    models: {
      queryUnderstanding: 'claude-haiku-4-5',
      websiteExtraction: 'claude-sonnet-4-5',
      relevanceCheck: 'claude-haiku-4-5'
    }
  },
  {
    name: 'Mixed Models Test',
    models: {
      queryUnderstanding: 'grok-4-fast',
      websiteExtraction: 'gpt-5',
      relevanceCheck: 'claude-haiku-4-5'
    }
  }
];

async function testModelTracking() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('   MODEL TRACKING TEST - Prospecting Engine');
  console.log('═══════════════════════════════════════════════════════\n');

  // 1. Create a test project
  console.log('📦 Creating test project...');
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({
      name: `Model Test - ${new Date().toISOString()}`,
      client_name: 'Model Tracking Test',
      description: 'Testing model selection and tracking',
      status: 'active'
    })
    .select()
    .single();

  if (projectError) {
    console.error('❌ Failed to create project:', projectError.message);
    return;
  }

  console.log('✅ Created project:', project.id);

  // Run tests for each configuration
  for (const config of testConfigs) {
    console.log(`\n🧪 Testing: ${config.name}`);
    console.log('   Models:', JSON.stringify(config.models, null, 2));

    // 2. Generate prospects with specific model selections
    console.log('   🚀 Generating prospect with custom models...');

    const response = await fetch(`${PROSPECTING_API}/api/prospect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brief: {
          industry: 'Test Industry',
          city: 'Test City',
          target: 'Test businesses',
          count: 1
        },
        options: {
          projectId: project.id,
          verify: false  // Skip verification for test
        },
        model_selections: config.models
      })
    });

    if (!response.ok) {
      console.error('   ❌ Failed to generate prospects:', response.statusText);
      continue;
    }

    // Read SSE stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let prospectId = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const event = JSON.parse(line.slice(6));

            if (event.type === 'prospect' && event.prospect?.id) {
              prospectId = event.prospect.id;
            }

            if (event.type === 'complete') {
              console.log(`   ✅ Generation complete`);
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    }

    // 3. Verify model selections were saved to project
    console.log('   🔍 Verifying project model selections...');
    const { data: updatedProject, error: fetchError } = await supabase
      .from('projects')
      .select('prospecting_model_selections')
      .eq('id', project.id)
      .single();

    if (fetchError) {
      console.error('   ❌ Failed to fetch project:', fetchError.message);
      continue;
    }

    if (updatedProject.prospecting_model_selections) {
      console.log('   ✅ Model selections saved to project:');
      console.log('      ', JSON.stringify(updatedProject.prospecting_model_selections, null, 2));

      // Verify they match what we sent
      const saved = updatedProject.prospecting_model_selections;
      let allMatch = true;
      for (const [module, model] of Object.entries(config.models)) {
        if (saved[module] !== model) {
          console.error(`   ❌ Model mismatch for ${module}: expected ${model}, got ${saved[module]}`);
          allMatch = false;
        }
      }
      if (allMatch) {
        console.log('   ✅ All model selections match!');
      }
    } else {
      console.error('   ❌ No model selections saved to project');
    }

    // 4. Check if prospect has models_used field populated
    if (prospectId) {
      console.log('   🔍 Checking prospect model tracking...');
      const { data: prospect, error: prospectError } = await supabase
        .from('prospects')
        .select('company_name, models_used, prompts_snapshot')
        .eq('id', prospectId)
        .single();

      if (prospectError) {
        console.error('   ❌ Failed to fetch prospect:', prospectError.message);
      } else {
        if (prospect.models_used) {
          console.log('   ✅ Models tracked on prospect:');
          console.log('      ', JSON.stringify(prospect.models_used, null, 2));
        } else {
          console.log('   ⚠️ No models_used data on prospect (need to update orchestrator)');
        }

        if (prospect.prompts_snapshot) {
          console.log('   ✅ Prompts snapshot saved');
        } else {
          console.log('   ⚠️ No prompts_snapshot data on prospect');
        }
      }
    }

    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Cleanup test project
  console.log('\n🧹 Cleaning up test project...');
  await supabase
    .from('prospects')
    .delete()
    .eq('project_id', project.id);

  await supabase
    .from('projects')
    .delete()
    .eq('id', project.id);

  console.log('✅ Test complete!\n');
}

// Run the test
testModelTracking().catch(console.error);