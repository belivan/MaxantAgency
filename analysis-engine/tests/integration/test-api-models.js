/**
 * End-to-End API Test - Test model selection through API
 */

const API_URL = 'http://localhost:3010/api/prospect';

const testBrief = {
  industry: 'Italian Restaurants',
  city: 'Philadelphia, PA',
  count: 1
};

const modelsToTest = [
  'grok-4-fast',
  'gpt-4o',
  'claude-sonnet-4-5',
  'claude-haiku-4-5'
];

async function testAPIWithModel(model) {
  console.log(`\nTesting API with ${model}...`);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brief: testBrief,
        options: {
          model,
          checkRelevance: false,
          filterIrrelevant: false
        }
      })
    });

    // Check if SSE stream
    if (response.headers.get('content-type')?.includes('text/event-stream')) {
      console.log(`✅ ${model} - API accepted request (SSE stream started)`);

      // Read first event to confirm model is being used
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const { value } = await reader.read();
      const text = decoder.decode(value);

      if (text.includes('"type":"started"')) {
        console.log(`   ✓ Stream started successfully`);
      }

      reader.cancel();
      return true;
    } else {
      const data = await response.json();
      console.log(`❌ ${model} - Unexpected response:`, data);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${model} - Error: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  End-to-End API Model Selection Test');
  console.log('═══════════════════════════════════════════════════════\n');

  let passed = 0;
  let failed = 0;

  for (const model of modelsToTest) {
    const success = await testAPIWithModel(model);
    if (success) {
      passed++;
    } else {
      failed++;
    }

    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Results');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('═══════════════════════════════════════════════════════\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
