/**
 * Comprehensive AI Model Test Suite
 * Tests all supported AI models to verify configuration and functionality
 */

import { callAI } from './shared/ai-client.js';
import dotenv from 'dotenv';

dotenv.config();

// All models to test
const MODELS_TO_TEST = [
  // OpenAI Models
  { provider: 'OpenAI', model: 'gpt-5', temperature: 1.0, supportsCustomTemp: false },
  { provider: 'OpenAI', model: 'gpt-4.1', temperature: 0.3, supportsCustomTemp: true },
  { provider: 'OpenAI', model: 'gpt-4o', temperature: 0.4, supportsCustomTemp: true },

  // Anthropic Claude Models
  { provider: 'Anthropic', model: 'claude-sonnet-4.5', temperature: 0.3, supportsCustomTemp: true },
  { provider: 'Anthropic', model: 'claude-opus-4.1', temperature: 0.3, supportsCustomTemp: true },
  { provider: 'Anthropic', model: 'claude-haiku-4.5', temperature: 0.3, supportsCustomTemp: true },

  // xAI Grok Models
  { provider: 'xAI', model: 'grok-3', temperature: 0.2, supportsCustomTemp: true },
  { provider: 'xAI', model: 'grok-4', temperature: 0.2, supportsCustomTemp: true },
  { provider: 'xAI', model: 'grok-4-fast', temperature: 0.2, supportsCustomTemp: true }
];

const TEST_PROMPT = {
  systemPrompt: 'You are a helpful assistant. Respond with valid JSON only.',
  userPrompt: 'Return a JSON object with three fields: "status" (string), "model" (string with the model name you are), and "message" (string saying hello).',
  temperature: 0.3
};

async function testModel(modelConfig) {
  const { provider, model, temperature, supportsCustomTemp } = modelConfig;

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`Testing: ${provider} - ${model}`);
  console.log(`Temperature: ${temperature} (Custom temp ${supportsCustomTemp ? 'supported' : 'NOT supported'})`);
  console.log(`${'─'.repeat(60)}`);

  const startTime = Date.now();

  try {
    const result = await callAI({
      model,
      systemPrompt: TEST_PROMPT.systemPrompt,
      userPrompt: TEST_PROMPT.userPrompt,
      temperature: temperature,
      responseFormat: 'json_object'
    });

    const duration = Date.now() - startTime;

    // Try to parse JSON
    let parsedResult;
    try {
      parsedResult = JSON.parse(result);
    } catch (e) {
      console.log('⚠️  Response is not valid JSON');
      console.log('Raw response:', result.substring(0, 200));
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

    return {
      success: true,
      provider,
      model,
      temperature,
      duration,
      response: parsedResult
    };

  } catch (error) {
    const duration = Date.now() - startTime;

    console.log('❌ FAILED');
    console.log('   Error:', error.message);
    console.log('   Duration:', duration + 'ms');

    // Check if it's a temperature error for GPT-5
    if (model === 'gpt-5' && error.message.includes('temperature')) {
      console.log('   ℹ️  This is expected - GPT-5 only supports temperature=1');
    }

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
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║     AI MODEL CONFIGURATION & FUNCTIONALITY TEST SUITE      ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`Testing ${MODELS_TO_TEST.length} models...`);
  console.log('');

  const results = [];

  for (const modelConfig of MODELS_TO_TEST) {
    const result = await testModel(modelConfig);
    results.push(result);

    // Small delay between tests to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Generate summary
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                       TEST SUMMARY                         ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log('');

  // Group by provider
  console.log('Results by Provider:');
  console.log('');

  const providers = ['OpenAI', 'Anthropic', 'xAI'];

  for (const provider of providers) {
    const providerResults = results.filter(r => r.provider === provider);
    const providerSuccess = providerResults.filter(r => r.success).length;
    const providerTotal = providerResults.length;

    console.log(`${provider}:`);
    console.log(`  ${providerSuccess}/${providerTotal} models working`);

    providerResults.forEach(r => {
      const icon = r.success ? '✅' : '❌';
      const status = r.success ? 'OK' : `FAILED: ${r.error}`;
      console.log(`  ${icon} ${r.model.padEnd(20)} - ${status}`);
    });
    console.log('');
  }

  // Failed tests details
  const failures = results.filter(r => !r.success);
  if (failures.length > 0) {
    console.log('Failed Tests Details:');
    console.log('');
    failures.forEach(f => {
      console.log(`❌ ${f.provider} - ${f.model}`);
      console.log(`   Error: ${f.error}`);
      console.log('');
    });
  }

  // Performance stats
  const avgDuration = Math.round(
    results.filter(r => r.success).reduce((sum, r) => sum + r.duration, 0) /
    results.filter(r => r.success).length
  );

  console.log('Performance:');
  console.log(`  Average Response Time: ${avgDuration}ms`);
  console.log('');

  // Final verdict
  if (failCount === 0) {
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║  🎉 ALL MODELS CONFIGURED CORRECTLY AND WORKING! 🎉       ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
  } else {
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║  ⚠️  SOME MODELS FAILED - CHECK CONFIGURATION ABOVE  ⚠️    ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
  }
  console.log('');

  process.exit(failCount === 0 ? 0 : 1);
}

runAllTests().catch(err => {
  console.error('Test suite crashed:', err);
  process.exit(1);
});
