/**
 * Comprehensive AI Model Test Suite
 * Tests ALL supported AI models: OpenAI (GPT), xAI (Grok), and Anthropic (Claude)
 */

import { callAI } from '../../../database-tools/shared/ai-client.js';
import dotenv from 'dotenv';

dotenv.config();

// All supported AI models
const MODELS_TO_TEST = [
  // OpenAI Models
  { provider: 'OpenAI', model: 'gpt-5', temperature: 1.0, note: 'Latest flagship - only supports temp=1' },
  { provider: 'OpenAI', model: 'gpt-4.1', temperature: 0.3, note: 'Latest GPT-4 with 1M context' },
  { provider: 'OpenAI', model: 'gpt-4o', temperature: 0.4, note: 'Multimodal vision model' },

  // Anthropic Claude Models (Claude 4.x - Latest)
  { provider: 'Anthropic', model: 'claude-sonnet-4-5', temperature: 0.3, note: 'Best coding model (Sep 2025)' },
  { provider: 'Anthropic', model: 'claude-haiku-4-5', temperature: 0.3, note: 'Fast & affordable (Oct 2025)' },
  { provider: 'Anthropic', model: 'claude-opus-4-1', temperature: 0.3, note: 'Most powerful (Aug 2025)' },

  // xAI Grok Models
  { provider: 'xAI', model: 'grok-3', temperature: 0.2, note: 'Previous flagship' },
  { provider: 'xAI', model: 'grok-4', temperature: 0.2, note: '256K context with tools' },
  { provider: 'xAI', model: 'grok-4-fast', temperature: 0.2, note: '98% cost reduction vs Grok-4' }
];

const TEST_PROMPT = {
  systemPrompt: 'You are a helpful AI assistant. Respond with valid JSON only.',
  userPrompt: 'Return a JSON object with: "status" (set to "ok"), "model" (your actual model name), and "message" (say "Hello from [your model]").'
};

async function testModel(modelConfig) {
  const { provider, model, temperature, note } = modelConfig;

  console.log(`\n${'═'.repeat(75)}`);
  console.log(`Testing: ${provider} - ${model}`);
  console.log(`Temp: ${temperature} | ${note}`);
  console.log(`${'─'.repeat(75)}`);

  const startTime = Date.now();

  try {
    const result = await callAI({
      model,
      systemPrompt: TEST_PROMPT.systemPrompt,
      userPrompt: TEST_PROMPT.userPrompt,
      temperature: temperature,
      jsonMode: provider !== 'Anthropic'  // Claude doesn't support jsonMode param
    });

    const duration = Date.now() - startTime;
    const content = result.content;

    // Try to parse JSON
    let parsedResult;
    try {
      // Claude might wrap in markdown, so try to extract
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) ||
                       content.match(/```\n([\s\S]*?)\n```/) ||
                       [null, content];
      parsedResult = JSON.parse(jsonMatch[1] || content);
    } catch (e) {
      console.log('⚠️  Response is not valid JSON');
      console.log('Raw response:', content.substring(0, 300));
      throw new Error('Invalid JSON response');
    }

    // Validate expected fields
    if (!parsedResult.status || !parsedResult.message) {
      console.log('⚠️  Missing expected fields in JSON');
      console.log('Response:', JSON.stringify(parsedResult, null, 2));
      throw new Error('Missing expected fields');
    }

    console.log('✅ SUCCESS');
    console.log('   Status:', parsedResult.status);
    console.log('   Model:', parsedResult.model || 'N/A');
    console.log('   Message:', parsedResult.message);
    console.log('   Duration:', duration + 'ms');
    console.log('   Cost: $' + result.cost.toFixed(6));
    console.log('   Tokens:', result.usage?.total_tokens || 'N/A');

    return {
      success: true,
      provider,
      model,
      temperature,
      duration,
      cost: result.cost,
      tokens: result.usage?.total_tokens || 0,
      response: parsedResult
    };

  } catch (error) {
    const duration = Date.now() - startTime;

    console.log('❌ FAILED');
    console.log('   Error:', error.message);
    console.log('   Duration:', duration + 'ms');

    return {
      success: false,
      provider,
      model,
      temperature,
      duration,
      error: error.message
    };
  }
}

async function runAllTests() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════════════╗');
  console.log('║          COMPREHENSIVE AI MODEL CONFIGURATION TEST SUITE               ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`Testing ${MODELS_TO_TEST.length} AI models across 3 providers...`);
  console.log('');

  const results = [];

  for (const modelConfig of MODELS_TO_TEST) {
    const result = await testModel(modelConfig);
    results.push(result);

    // Small delay between tests to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  // Generate summary
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════════════╗');
  console.log('║                            TEST SUMMARY                                ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════╝');
  console.log('');

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  console.log(`📊 Overall Results:`);
  console.log(`   Total Tests: ${results.length}`);
  console.log(`   ✅ Passed: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   Success Rate: ${((successCount / results.length) * 100).toFixed(1)}%`);
  console.log('');

  // Group by provider
  console.log('📋 Results by Provider:');
  console.log('');

  const providers = ['OpenAI', 'Anthropic', 'xAI'];

  for (const provider of providers) {
    const providerResults = results.filter(r => r.provider === provider);
    const providerSuccess = providerResults.filter(r => r.success).length;
    const providerTotal = providerResults.length;

    console.log(`${provider}:`);
    console.log(`  Status: ${providerSuccess}/${providerTotal} working`);

    providerResults.forEach(r => {
      const icon = r.success ? '✅' : '❌';
      const modelName = r.model.padEnd(30);

      if (r.success) {
        const stats = `${r.duration}ms | $${r.cost.toFixed(6)} | ${r.tokens} tokens`;
        console.log(`  ${icon} ${modelName} ${stats}`);
      } else {
        console.log(`  ${icon} ${modelName} ERROR`);
      }
    });
    console.log('');
  }

  // Failed tests details
  const failures = results.filter(r => !r.success);
  if (failures.length > 0) {
    console.log('❌ Failed Tests - Detailed Errors:');
    console.log('');
    failures.forEach(f => {
      console.log(`Provider: ${f.provider}`);
      console.log(`Model: ${f.model}`);
      console.log(`Error: ${f.error}`);
      console.log('');
    });
  }

  // Performance & cost stats
  const successful = results.filter(r => r.success);
  if (successful.length > 0) {
    const avgDuration = Math.round(
      successful.reduce((sum, r) => sum + r.duration, 0) / successful.length
    );
    const totalCost = successful.reduce((sum, r) => sum + r.cost, 0);
    const totalTokens = successful.reduce((sum, r) => sum + r.tokens, 0);

    console.log('📊 Performance Statistics:');
    console.log(`   Average Response Time: ${avgDuration}ms`);
    console.log(`   Total Tokens Used: ${totalTokens.toLocaleString()}`);
    console.log(`   Total Cost: $${totalCost.toFixed(6)}`);
    console.log('');
  }

  // Final verdict
  if (failCount === 0) {
    console.log('╔═══════════════════════════════════════════════════════════════════════╗');
    console.log('║      🎉🎉🎉  ALL AI MODELS CONFIGURED AND WORKING!  🎉🎉🎉            ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════╝');
  } else if (successCount > 0) {
    console.log('╔═══════════════════════════════════════════════════════════════════════╗');
    console.log('║      ⚠️  PARTIAL SUCCESS - SOME MODELS FAILED  ⚠️                      ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════╝');
  } else {
    console.log('╔═══════════════════════════════════════════════════════════════════════╗');
    console.log('║      ❌  ALL TESTS FAILED - CHECK CONFIGURATION  ❌                     ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════╝');
  }
  console.log('');

  process.exit(failCount === 0 ? 0 : 1);
}

runAllTests().catch(err => {
  console.error('\n❌ Test suite crashed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
