#!/usr/bin/env node

/**
 * Comprehensive Model Testing
 * Tests all text + vision model combinations
 */

import http from 'http';

const API_URL = 'http://localhost:3010/api/prospect';

// All available models
const TEXT_MODELS = [
  'grok-4-fast',
  'gpt-4o',
  'gpt-5',
  'claude-sonnet-4-5',
  'claude-haiku-4-5'
];

const VISION_MODELS = [
  'gpt-4o',
  'gpt-5',
  'claude-sonnet-4-5',
  'claude-haiku-4-5'
];

// Test brief
const brief = {
  industry: 'coffee shop',
  city: 'Austin',
  count: 1
};

const results = [];
let currentTest = 0;
let totalTests = 0;

// Generate test combinations
const testCombinations = [];
TEXT_MODELS.forEach(textModel => {
  VISION_MODELS.forEach(visionModel => {
    testCombinations.push({
      textModel,
      visionModel,
      name: `${textModel} + ${visionModel}`
    });
  });
});

totalTests = testCombinations.length;

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║  COMPREHENSIVE MODEL TESTING                              ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');
console.log(`Testing ${totalTests} model combinations...\n`);

async function testModelCombination(textModel, visionModel) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({
      brief,
      options: {
        model: textModel,
        visionModel: visionModel,
        checkRelevance: false,
        filterIrrelevant: false
      }
    });

    const req = http.request(
      API_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      },
      (res) => {
        let data = '';
        let complete = false;
        let cost = 0;
        let found = 0;
        let error = null;

        res.on('data', (chunk) => {
          data += chunk.toString();
          const lines = data.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const event = JSON.parse(line.slice(6));

                if (event.type === 'complete' && event.results) {
                  complete = true;
                  cost = event.results.cost || 0;
                  found = event.results.found || 0;
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        });

        res.on('end', () => {
          if (complete && found > 0) {
            resolve({ success: true, cost, found });
          } else if (complete) {
            resolve({ success: false, error: 'No results' });
          } else {
            resolve({ success: false, error: 'Incomplete response' });
          }
        });

        res.on('error', (err) => {
          resolve({ success: false, error: err.message });
        });
      }
    );

    req.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });

    // Set timeout
    req.setTimeout(60000, () => {
      req.destroy();
      resolve({ success: false, error: 'Timeout' });
    });

    req.write(payload);
    req.end();
  });
}

async function runTests() {
  const startTime = Date.now();

  for (const combo of testCombinations) {
    currentTest++;

    process.stdout.write(`\r[${currentTest}/${totalTests}] Testing ${combo.name.padEnd(50)} `);

    const result = await testModelCombination(combo.textModel, combo.visionModel);

    results.push({
      textModel: combo.textModel,
      visionModel: combo.visionModel,
      name: combo.name,
      ...result
    });

    if (result.success) {
      console.log(`✅ $${result.cost.toFixed(4)}`);
    } else {
      console.log(`❌ ${result.error}`);
    }
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(1);

  console.log('\n\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  TEST RESULTS                                             ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // Group by result
  const passed = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`Total Tests:     ${totalTests}`);
  console.log(`✅ Passed:       ${passed.length}`);
  console.log(`❌ Failed:       ${failed.length}`);
  console.log(`Duration:        ${duration}s`);
  console.log(`Avg Time/Test:   ${(parseFloat(duration) / totalTests).toFixed(1)}s\n`);

  if (passed.length > 0) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('PASSING COMBINATIONS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Calculate total cost
    const totalCost = passed.reduce((sum, r) => sum + r.cost, 0);
    const avgCost = totalCost / passed.length;

    passed.forEach(r => {
      console.log(`✅ ${r.name.padEnd(50)} $${r.cost.toFixed(4)}`);
    });

    console.log(`\nTotal Cost:  $${totalCost.toFixed(4)}`);
    console.log(`Avg Cost:    $${avgCost.toFixed(4)}\n`);
  }

  if (failed.length > 0) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('FAILED COMBINATIONS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    failed.forEach(r => {
      console.log(`❌ ${r.name.padEnd(50)} ${r.error}`);
    });
    console.log('');
  }

  // Cost comparison
  if (passed.length > 1) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('COST RANKING (cheapest to most expensive):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const sorted = [...passed].sort((a, b) => a.cost - b.cost);
    sorted.forEach((r, i) => {
      const rank = `#${i + 1}`.padStart(3);
      console.log(`${rank}  ${r.name.padEnd(50)} $${r.cost.toFixed(4)}`);
    });
    console.log('');
  }

  // Recommendations
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('RECOMMENDATIONS:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (passed.length > 0) {
    const cheapest = passed.reduce((min, r) => r.cost < min.cost ? r : min);
    const mostExpensive = passed.reduce((max, r) => r.cost > max.cost ? r : max);

    console.log(`💰 Cheapest:  ${cheapest.name} - $${cheapest.cost.toFixed(4)}`);
    console.log(`💎 Premium:   ${mostExpensive.name} - $${mostExpensive.cost.toFixed(4)}`);

    // Find balanced option (GPT-4o variants)
    const gpt4o = passed.find(r => r.textModel === 'gpt-4o' && r.visionModel === 'gpt-4o');
    if (gpt4o) {
      console.log(`⚖️  Balanced:  ${gpt4o.name} - $${gpt4o.cost.toFixed(4)}`);
    }

    console.log('');
  }

  process.exit(failed.length > 0 ? 1 : 0);
}

runTests();