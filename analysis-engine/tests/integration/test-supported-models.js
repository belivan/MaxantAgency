/**
 * AI Model Test - Supported Models Only
 * Tests OpenAI and Grok models that are actually configured
 */

import { callAI } from './shared/ai-client.js';
import dotenv from 'dotenv';

dotenv.config();

// Currently supported models (OpenAI + Grok only - no Anthropic client yet)
const MODELS_TO_TEST = [
  // OpenAI Models
  { provider: 'OpenAI', model: 'gpt-5', temperature: 1.0, note: 'Only supports temp=1' },
  { provider: 'OpenAI', model: 'gpt-4.1', temperature: 0.3, note: 'Latest GPT-4' },
  { provider: 'OpenAI', model: 'gpt-4o', temperature: 0.4, note: 'Vision capable' },

  // xAI Grok Models
  { provider: 'xAI', model: 'grok-3', temperature: 0.2, note: 'Previous flagship' },
  { provider: 'xAI', model: 'grok-4', temperature: 0.2, note: '256K context' },
  { provider: 'xAI', model: 'grok-4-fast', temperature: 0.2, note: '98% cost reduction' }
];

const TEST_PROMPT = {
  systemPrompt: 'You are a helpful assistant. Respond with valid JSON only.',
  userPrompt: 'Return a JSON object with three fields: "status" (set to "ok"), "model" (your model name), and "message" (say "Hello from [model name]").'
};

async function testModel(modelConfig) {
  const { provider, model, temperature, note } = modelConfig;

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`Testing: ${provider} - ${model}`);
  console.log(`Temperature: ${temperature} | Note: ${note}`);
  console.log(`${'─'.repeat(70)}`);

  const startTime = Date.now();

  try {
    const result = await callAI({
      model,
      systemPrompt: TEST_PROMPT.systemPrompt,
      userPrompt: TEST_PROMPT.userPrompt,
      temperature: temperature,
      jsonMode: true  // Enable JSON mode
    });

    const duration = Date.now() - startTime;

    // result.content contains the JSON string
    const content = result.content;

    // Try to parse JSON
    let parsedResult;
    try {
      parsedResult = JSON.parse(content);
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
    console.log('   Model Reported:', parsedResult.model || 'N/A');
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
  console.log('╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║        AI MODEL CONFIGURATION TEST - SUPPORTED MODELS ONLY         ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`Testing ${MODELS_TO_TEST.length} supported models...`);
  console.log('');
  console.log('📝 Note: Anthropic Claude models are NOT yet supported (no client configured)');
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
  console.log('╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║                          TEST SUMMARY                              ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝');
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

  const providers = ['OpenAI', 'xAI'];

  for (const provider of providers) {
    const providerResults = results.filter(r => r.provider === provider);
    const providerSuccess = providerResults.filter(r => r.success).length;
    const providerTotal = providerResults.length;

    console.log(`${provider}:`);
    console.log(`  ${providerSuccess}/${providerTotal} models working`);

    providerResults.forEach(r => {
      const icon = r.success ? '✅' : '❌';
      if (r.success) {
        console.log(`  ${icon} ${r.model.padEnd(15)} - ${r.duration}ms | $${r.cost.toFixed(6)} | ${r.tokens} tokens`);
      } else {
        console.log(`  ${icon} ${r.model.padEnd(15)} - ${r.error}`);
      }
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

  // Performance stats for successful tests
  const successful = results.filter(r => r.success);
  if (successful.length > 0) {
    const avgDuration = Math.round(
      successful.reduce((sum, r) => sum + r.duration, 0) / successful.length
    );
    const totalCost = successful.reduce((sum, r) => sum + r.cost, 0);

    console.log('Performance Statistics:');
    console.log(`  Average Response Time: ${avgDuration}ms`);
    console.log(`  Total Cost (all tests): $${totalCost.toFixed(6)}`);
    console.log('');
  }

  // Final verdict
  if (failCount === 0) {
    console.log('╔═══════════════════════════════════════════════════════════════════╗');
    console.log('║      🎉 ALL SUPPORTED MODELS WORKING CORRECTLY! 🎉                 ║');
    console.log('╚═══════════════════════════════════════════════════════════════════╝');
  } else {
    console.log('╔═══════════════════════════════════════════════════════════════════╗');
    console.log('║      ⚠️  SOME MODELS FAILED - CHECK ERRORS ABOVE  ⚠️                ║');
    console.log('╚═══════════════════════════════════════════════════════════════════╝');
  }
  console.log('');

  // Future enhancements
  console.log('🔮 Future Enhancements:');
  console.log('   • Add Anthropic SDK and configure Claude models');
  console.log('   • Test Claude Sonnet 4, Opus 4, and Haiku 3.5');
  console.log('   • Add vision testing for GPT-4o');
  console.log('');

  process.exit(failCount === 0 ? 0 : 1);
}

runAllTests().catch(err => {
  console.error('\n❌ Test suite crashed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
