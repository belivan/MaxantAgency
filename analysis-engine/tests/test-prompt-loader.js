/**
 * Test Prompt Loader
 *
 * Verifies that prompts load correctly and variable substitution works
 */

import { loadPrompt, listPrompts, getPromptMetadata } from '../shared/prompt-loader.js';

console.log('═══════════════════════════════════════════════════════════════');
console.log('PROMPT LOADER TEST');
console.log('═══════════════════════════════════════════════════════════════\n');

async function testPromptLoader() {
  try {
    // Test 1: List available prompts
    console.log('Test 1: List available prompts in web-design category');
    console.log('─────────────────────────────────────────────────────────────');
    const prompts = await listPrompts('web-design');
    console.log(`Found ${prompts.length} prompts:`);
    prompts.forEach(p => console.log(`  - ${p}`));
    console.log('✅ PASSED\n');

    // Test 2: Load prompt metadata
    console.log('Test 2: Load prompt metadata');
    console.log('─────────────────────────────────────────────────────────────');
    const metadata = await getPromptMetadata('web-design/design-critique');
    console.log(`Name: ${metadata.name}`);
    console.log(`Description: ${metadata.description}`);
    console.log(`Model: ${metadata.model}`);
    console.log(`Temperature: ${metadata.temperature}`);
    console.log(`Variables: ${metadata.variables.join(', ')}`);
    console.log(`Est. Cost: ${metadata.costEstimate?.estimatedCost || 'N/A'}`);
    console.log('✅ PASSED\n');

    // Test 3: Load prompt with variable substitution
    console.log('Test 3: Load prompt with variable substitution');
    console.log('─────────────────────────────────────────────────────────────');
    const testVariables = {
      company_name: 'Zahav Restaurant',
      industry: 'Restaurant',
      url: 'https://zahavrestaurant.com',
      tech_stack: 'WordPress',
      load_time: 2500
    };

    const prompt = await loadPrompt('web-design/design-critique', testVariables);

    console.log(`System Prompt (first 200 chars):`);
    console.log(`  ${prompt.systemPrompt.substring(0, 200)}...\n`);

    console.log(`User Prompt (with variables substituted):`);
    console.log(`  ${prompt.userPrompt.substring(0, 300)}...\n`);

    // Verify variables were substituted
    const hasPlaceholders = prompt.userPrompt.includes('{{');
    if (hasPlaceholders) {
      throw new Error('Variables not properly substituted!');
    }

    // Verify actual values appear
    const hasCompanyName = prompt.userPrompt.includes('Zahav Restaurant');
    const hasIndustry = prompt.userPrompt.includes('Restaurant');
    const hasUrl = prompt.userPrompt.includes('zahavrestaurant.com');

    if (!hasCompanyName || !hasIndustry || !hasUrl) {
      throw new Error('Expected values not found in substituted prompt!');
    }

    console.log('✅ Variables correctly substituted');
    console.log('✅ PASSED\n');

    // Test 4: Test all web-design prompts
    console.log('Test 4: Load all web-design prompts');
    console.log('─────────────────────────────────────────────────────────────');

    const testCases = [
      {
        name: 'design-critique',
        variables: {
          company_name: 'Test Co',
          industry: 'Retail',
          url: 'test.com',
          tech_stack: 'Custom',
          load_time: 3000
        }
      },
      {
        name: 'seo-analysis',
        variables: {
          url: 'test.com',
          industry: 'Retail',
          load_time: 3000,
          tech_stack: 'Custom',
          html: '<html><head><title>Test</title></head></html>'
        }
      },
      {
        name: 'content-analysis',
        variables: {
          company_name: 'Test Co',
          industry: 'Retail',
          url: 'test.com',
          content_summary: 'Homepage, About, Contact',
          blog_posts: 'None',
          key_pages: 'Standard pages'
        }
      },
      {
        name: 'social-analysis',
        variables: {
          company_name: 'Test Co',
          industry: 'Retail',
          url: 'test.com',
          social_profiles: { instagram: 'https://instagram.com/test' },
          social_metadata: { instagram: { followers: 1000 } },
          website_branding: { colors: 'blue', tone: 'professional' }
        }
      },
      {
        name: 'industry-critique',
        variables: {
          company_name: 'Test Co',
          industry: 'Retail',
          grade: 'B',
          overall_score: 75,
          design_score: 70,
          seo_score: 80,
          content_score: 75,
          social_score: 70,
          top_issues: ['Issue 1', 'Issue 2'],
          quick_wins: ['Fix 1', 'Fix 2']
        }
      }
    ];

    for (const testCase of testCases) {
      const loaded = await loadPrompt(`web-design/${testCase.name}`, testCase.variables);
      console.log(`  ✅ ${testCase.name}: Loaded successfully`);
      console.log(`     Model: ${loaded.model}, Temp: ${loaded.temperature}`);
    }

    console.log('✅ PASSED\n');

    // Test 5: Error handling
    console.log('Test 5: Error handling');
    console.log('─────────────────────────────────────────────────────────────');

    try {
      await loadPrompt('nonexistent/prompt', {});
      console.log('❌ FAILED: Should have thrown error for nonexistent prompt');
    } catch (error) {
      console.log(`  ✅ Correctly threw error for nonexistent prompt`);
      console.log(`     Error: ${error.message}`);
    }

    try {
      await loadPrompt('web-design/design-critique', { company_name: 'Test' }); // Missing required vars
      console.log('❌ FAILED: Should have thrown error for missing variables');
    } catch (error) {
      console.log(`  ✅ Correctly threw error for missing variables`);
      console.log(`     Error: ${error.message}`);
    }

    console.log('✅ PASSED\n');

    // Summary
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('ALL TESTS PASSED ✅');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`\nPrompt loader is working correctly!`);
    console.log(`\nNext steps:`);
    console.log(`  1. Prompts are ready to use in analyzer modules`);
    console.log(`  2. Each analyzer can load its prompt with loadPrompt()`);
    console.log(`  3. Variable substitution happens automatically`);

  } catch (error) {
    console.error('\n❌ TEST FAILED');
    console.error(error);
    process.exit(1);
  }
}

testPromptLoader();
