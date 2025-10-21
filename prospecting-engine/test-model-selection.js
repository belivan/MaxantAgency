/**
 * Test Model Selection - Verify different AI models work with prospecting engine
 *
 * Tests:
 * - Query understanding with different models
 * - Relevance checking with different models
 */

import { understandQuery } from './validators/query-understanding.js';
import { checkRelevance } from './validators/relevance-checker.js';
import dotenv from 'dotenv';

dotenv.config();

// Test brief
const testBrief = {
  industry: 'Italian Restaurants',
  city: 'Philadelphia, PA',
  target: 'Upscale Italian restaurants with good reviews',
  count: 5
};

// Test prospect
const testProspect = {
  company_name: 'Vetri Cucina',
  industry: 'Restaurant',
  city: 'Philadelphia',
  state: 'PA',
  google_rating: 4.6,
  google_review_count: 500,
  description: 'Upscale Italian restaurant in Center City',
  services: ['Fine dining', 'Catering'],
  website_status: 'active',
  social_profiles: {
    instagram: 'https://instagram.com/vetriphilly',
    facebook: 'https://facebook.com/vetriphilly'
  }
};

// Models to test
const modelsToTest = [
  { name: 'Grok 4 Fast', id: 'grok-4-fast', available: !!process.env.XAI_API_KEY },
  { name: 'GPT-4o', id: 'gpt-4o', available: !!process.env.OPENAI_API_KEY },
  { name: 'GPT-5', id: 'gpt-5', available: !!process.env.OPENAI_API_KEY },
  { name: 'Claude Sonnet 4.5', id: 'claude-sonnet-4-5', available: !!process.env.ANTHROPIC_API_KEY },
  { name: 'Claude Haiku 4.5', id: 'claude-haiku-4-5', available: !!process.env.ANTHROPIC_API_KEY }
];

async function testModelSelection() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Testing Model Selection for Prospecting Engine');
  console.log('═══════════════════════════════════════════════════════\n');

  // Check which API keys are available
  console.log('API Keys Available:');
  console.log(`  - XAI_API_KEY (Grok): ${process.env.XAI_API_KEY ? '✅' : '❌'}`);
  console.log(`  - OPENAI_API_KEY (GPT): ${process.env.OPENAI_API_KEY ? '✅' : '❌'}`);
  console.log(`  - ANTHROPIC_API_KEY (Claude): ${process.env.ANTHROPIC_API_KEY ? '✅' : '❌'}`);
  console.log('');

  let passCount = 0;
  let failCount = 0;

  // Test each model
  for (const model of modelsToTest) {
    if (!model.available) {
      console.log(`⏭️  Skipping ${model.name} - API key not available\n`);
      continue;
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`  Testing: ${model.name} (${model.id})`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // Test 1: Query Understanding
    try {
      console.log(`[Test 1/2] Query Understanding...`);
      const query = await understandQuery(testBrief, model.id);
      console.log(`✅ Query: "${query}"`);
      passCount++;
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
      failCount++;
    }

    // Test 2: Relevance Check
    try {
      console.log(`[Test 2/2] Relevance Check...`);
      const relevance = await checkRelevance(testProspect, testBrief, model.id);
      console.log(`✅ Score: ${relevance.score}/100, Relevant: ${relevance.isRelevant}`);
      console.log(`   Reasoning: ${relevance.reasoning.substring(0, 100)}...`);
      passCount++;
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
      failCount++;
    }
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Test Summary');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`✅ Passed: ${passCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log('═══════════════════════════════════════════════════════\n');

  if (failCount > 0) {
    console.log('⚠️  Some tests failed. Check the errors above.');
    process.exit(1);
  } else {
    console.log('🎉 All available models tested successfully!');
    process.exit(0);
  }
}

// Run tests
testModelSelection().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
