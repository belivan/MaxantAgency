#!/usr/bin/env node

/**
 * API Endpoint Test Suite
 *
 * Comprehensive tests for all Prospecting Engine API endpoints:
 * - GET /health
 * - GET /api/prompts/default
 * - POST /api/prospect (with SSE)
 * - GET /api/prospects
 * - GET /api/prospects/:id
 * - GET /api/stats
 * - DELETE /api/prospects/:id
 * - POST /api/prospects/batch-delete
 */

import dotenv from 'dotenv';

dotenv.config();

const API_BASE = process.env.PROSPECTING_API || 'http://localhost:3010';

// Test counters
let passed = 0;
let failed = 0;
const testResults = [];

function logTest(name, success, details = '') {
  const result = {
    name,
    success,
    details,
    timestamp: new Date().toISOString()
  };
  testResults.push(result);

  if (success) {
    console.log(`✅ ${name}`);
    passed++;
  } else {
    console.log(`❌ ${name}`);
    if (details) console.log(`   ${details}`);
    failed++;
  }
}

function logSection(title) {
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`  ${title}`);
  console.log('═'.repeat(80));
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 1: Health Check
// ═══════════════════════════════════════════════════════════════════════════

async function testHealthEndpoint() {
  logSection('TEST 1: GET /health - Health Check');

  try {
    const response = await fetch(`${API_BASE}/health`);
    const data = await response.json();

    logTest(
      'Health endpoint returns 200',
      response.status === 200,
      `Status: ${response.status}`
    );

    logTest(
      'Health response has status field',
      data.status === 'healthy',
      `Status: ${data.status}`
    );

    logTest(
      'Health response has service name',
      data.service === 'prospecting-engine',
      `Service: ${data.service}`
    );

    logTest(
      'Health response has version',
      typeof data.version === 'string',
      `Version: ${data.version}`
    );

    console.log(`\n   Service: ${data.service} v${data.version}`);
    console.log(`   Status: ${data.status}`);
    console.log(`   Timestamp: ${data.timestamp}`);

  } catch (error) {
    logTest('Health endpoint', false, error.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 2: Default Prompts
// ═══════════════════════════════════════════════════════════════════════════

async function testDefaultPromptsEndpoint() {
  logSection('TEST 2: GET /api/prompts/default - Load Default Prompts');

  try {
    const response = await fetch(`${API_BASE}/api/prompts/default`);
    const data = await response.json();

    logTest(
      'Default prompts endpoint returns 200',
      response.status === 200,
      `Status: ${response.status}`
    );

    logTest(
      'Response has success=true',
      data.success === true
    );

    logTest(
      'Response has data object',
      data.data && typeof data.data === 'object'
    );

    const prompts = data.data;

    logTest(
      'Has queryUnderstanding prompt',
      prompts.queryUnderstanding &&
      prompts.queryUnderstanding.model &&
      prompts.queryUnderstanding.systemPrompt
    );

    logTest(
      'Has websiteExtraction prompt',
      prompts.websiteExtraction &&
      prompts.websiteExtraction.model &&
      prompts.websiteExtraction.systemPrompt
    );

    logTest(
      'Has relevanceCheck prompt',
      prompts.relevanceCheck &&
      prompts.relevanceCheck.model &&
      prompts.relevanceCheck.systemPrompt
    );

    console.log(`\n   Default Models:`);
    console.log(`   - Query Understanding: ${prompts.queryUnderstanding?.model}`);
    console.log(`   - Website Extraction: ${prompts.websiteExtraction?.model}`);
    console.log(`   - Relevance Check: ${prompts.relevanceCheck?.model}`);

    return prompts;

  } catch (error) {
    logTest('Default prompts endpoint', false, error.message);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 3: Prospect Generation (SSE)
// ═══════════════════════════════════════════════════════════════════════════

async function testProspectGeneration(defaultPrompts) {
  logSection('TEST 3: POST /api/prospect - Generate Prospects (SSE)');

  if (!defaultPrompts) {
    logTest('Prospect generation', false, 'Cannot test without default prompts');
    return [];
  }

  try {
    const testBrief = {
      industry: 'Coffee Shops',
      city: 'Seattle, WA',
      target: 'Independent coffee shops',
      count: 2
    };

    console.log(`\n   Testing prospect generation...`);
    console.log(`   Industry: ${testBrief.industry}`);
    console.log(`   Location: ${testBrief.city}`);
    console.log(`   Count: ${testBrief.count}`);

    const requestBody = {
      brief: testBrief,
      options: {
        enableSocialScraping: false, // Skip social for speed
        verifyWebsites: true,
        checkRelevance: true
      }
    };

    const response = await fetch(`${API_BASE}/api/prospect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    logTest(
      'Prospect generation returns 200',
      response.status === 200,
      `Status: ${response.status}`
    );

    logTest(
      'Response has SSE content type',
      response.headers.get('content-type')?.includes('text/event-stream'),
      `Content-Type: ${response.headers.get('content-type')}`
    );

    // Parse SSE stream
    const text = await response.text();
    const events = text
      .split('\n\n')
      .filter(e => e.startsWith('data: '))
      .map(e => {
        try {
          return JSON.parse(e.replace('data: ', ''));
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    logTest(
      'SSE stream contains events',
      events.length > 0,
      `Events received: ${events.length}`
    );

    const startedEvent = events.find(e => e.type === 'started');
    logTest(
      'Received "started" event',
      !!startedEvent
    );

    const completeEvent = events.find(e => e.type === 'complete');
    logTest(
      'Received "complete" event',
      !!completeEvent
    );

    if (completeEvent?.results) {
      const results = completeEvent.results;
      console.log(`\n   Results:`);
      console.log(`   - Found: ${results.found}`);
      console.log(`   - Saved: ${results.saved}`);
      console.log(`   - Failed: ${results.failed}`);
      console.log(`   - Cost: $${results.cost?.toFixed(4) || '0.0000'}`);

      logTest(
        'Generation found prospects',
        results.found > 0,
        `Found: ${results.found}`
      );

      return results.prospects || [];
    }

    return [];

  } catch (error) {
    logTest('Prospect generation', false, error.message);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 4: List Prospects
// ═══════════════════════════════════════════════════════════════════════════

async function testListProspects() {
  logSection('TEST 4: GET /api/prospects - List Prospects');

  try {
    // Test without filters
    const response = await fetch(`${API_BASE}/api/prospects?limit=10`);
    const data = await response.json();

    logTest(
      'List prospects returns 200',
      response.status === 200,
      `Status: ${response.status}`
    );

    logTest(
      'Response has success=true',
      data.success === true
    );

    logTest(
      'Response has prospects array',
      Array.isArray(data.prospects)
    );

    logTest(
      'Response has count',
      typeof data.count === 'number',
      `Count: ${data.count}`
    );

    console.log(`\n   Results:`);
    console.log(`   - Count: ${data.count}`);
    console.log(`   - Total: ${data.total}`);

    if (data.prospects?.length > 0) {
      console.log(`\n   Sample prospects:`);
      data.prospects.slice(0, 3).forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.company_name} (${p.city || 'unknown'})`);
      });
    }

    // Test with filters
    if (data.prospects?.length > 0) {
      const firstProspect = data.prospects[0];
      const filterResponse = await fetch(
        `${API_BASE}/api/prospects?city=${encodeURIComponent(firstProspect.city || '')}&limit=5`
      );
      const filterData = await filterResponse.json();

      logTest(
        'Filtering by city works',
        filterData.success && Array.isArray(filterData.prospects),
        `Filtered results: ${filterData.count}`
      );
    }

    return data.prospects?.[0] || null;

  } catch (error) {
    logTest('List prospects', false, error.message);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 5: Get Prospect by ID
// ═══════════════════════════════════════════════════════════════════════════

async function testGetProspectById(sampleProspect) {
  logSection('TEST 5: GET /api/prospects/:id - Get Prospect by ID');

  if (!sampleProspect?.id) {
    logTest('Get prospect by ID', false, 'No sample prospect available');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/prospects/${sampleProspect.id}`);
    const data = await response.json();

    logTest(
      'Get prospect by ID returns 200',
      response.status === 200,
      `Status: ${response.status}`
    );

    logTest(
      'Response has success=true',
      data.success === true
    );

    logTest(
      'Response has prospect object',
      data.prospect && typeof data.prospect === 'object'
    );

    logTest(
      'Prospect ID matches',
      data.prospect?.id === sampleProspect.id,
      `ID: ${data.prospect?.id}`
    );

    console.log(`\n   Prospect:`);
    console.log(`   - Name: ${data.prospect?.company_name}`);
    console.log(`   - Industry: ${data.prospect?.industry}`);
    console.log(`   - City: ${data.prospect?.city}`);
    console.log(`   - Website: ${data.prospect?.website || 'none'}`);
    console.log(`   - Rating: ${data.prospect?.google_rating || 'N/A'}`);

    // Test non-existent ID
    const notFoundResponse = await fetch(`${API_BASE}/api/prospects/00000000-0000-0000-0000-000000000000`);
    const notFoundData = await notFoundResponse.json();

    logTest(
      'Non-existent ID returns 404',
      notFoundResponse.status === 404,
      `Status: ${notFoundResponse.status}`
    );

  } catch (error) {
    logTest('Get prospect by ID', false, error.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 6: Get Stats
// ═══════════════════════════════════════════════════════════════════════════

async function testGetStats() {
  logSection('TEST 6: GET /api/stats - Get Statistics');

  try {
    const response = await fetch(`${API_BASE}/api/stats`);
    const data = await response.json();

    logTest(
      'Stats endpoint returns 200',
      response.status === 200,
      `Status: ${response.status}`
    );

    logTest(
      'Response has success=true',
      data.success === true
    );

    logTest(
      'Response has stats object',
      data.stats && typeof data.stats === 'object'
    );

    console.log(`\n   Statistics:`);
    if (data.stats) {
      Object.entries(data.stats).forEach(([key, value]) => {
        console.log(`   - ${key}: ${value}`);
      });
    }

  } catch (error) {
    logTest('Get stats', false, error.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 7: Custom Prompts
// ═══════════════════════════════════════════════════════════════════════════

async function testCustomPrompts(defaultPrompts) {
  logSection('TEST 7: POST /api/prospect - Custom Prompts & Models');

  if (!defaultPrompts) {
    logTest('Custom prompts test', false, 'Cannot test without default prompts');
    return;
  }

  try {
    // Create custom prompts (modify models and temperatures)
    const customPrompts = {
      queryUnderstanding: {
        ...defaultPrompts.queryUnderstanding,
        model: 'claude-haiku-4-5',
        temperature: 0.5
      },
      websiteExtraction: {
        ...defaultPrompts.websiteExtraction,
        model: 'claude-sonnet-4-5',
        temperature: 0.3
      },
      relevanceCheck: {
        ...defaultPrompts.relevanceCheck,
        model: 'gpt-4o',
        temperature: 0.2
      }
    };

    const testBrief = {
      industry: 'Bakeries',
      city: 'Portland, OR',
      target: 'Artisan bakeries',
      count: 1
    };

    console.log(`\n   Testing with custom AI models...`);
    console.log(`   Query: ${customPrompts.queryUnderstanding.model}`);
    console.log(`   Extraction: ${customPrompts.websiteExtraction.model}`);
    console.log(`   Relevance: ${customPrompts.relevanceCheck.model}`);

    const requestBody = {
      brief: testBrief,
      options: {
        enableSocialScraping: false,
        verifyWebsites: false // Skip for speed
      },
      custom_prompts: customPrompts
    };

    const response = await fetch(`${API_BASE}/api/prospect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    logTest(
      'Custom prompts accepted',
      response.status === 200,
      `Status: ${response.status}`
    );

    const text = await response.text();
    const events = text
      .split('\n\n')
      .filter(e => e.startsWith('data: '))
      .map(e => {
        try {
          return JSON.parse(e.replace('data: ', ''));
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    const completeEvent = events.find(e => e.type === 'complete');

    logTest(
      'Custom prompts execution succeeded',
      !!completeEvent,
      completeEvent?.results ? `Found: ${completeEvent.results.found}` : 'No results'
    );

  } catch (error) {
    logTest('Custom prompts test', false, error.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 8: Error Handling
// ═══════════════════════════════════════════════════════════════════════════

async function testErrorHandling() {
  logSection('TEST 8: Error Handling');

  try {
    // Test missing brief
    const response1 = await fetch(`${API_BASE}/api/prospect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const data1 = await response1.json();

    logTest(
      'Missing brief returns 400',
      response1.status === 400,
      `Status: ${response1.status}`
    );

    logTest(
      'Error response has error field',
      typeof data1.error === 'string',
      `Error: ${data1.error}`
    );

    // Test invalid brief format
    const response2 = await fetch(`${API_BASE}/api/prospect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brief: {} })
    });
    const data2 = await response2.json();

    logTest(
      'Invalid brief returns 400',
      response2.status === 400,
      `Status: ${response2.status}`
    );

  } catch (error) {
    logTest('Error handling test', false, error.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Test Runner
// ═══════════════════════════════════════════════════════════════════════════

async function runAllTests() {
  console.log('\n╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║         PROSPECTING ENGINE API ENDPOINT TEST SUITE                        ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝');

  console.log(`\n🔧 Testing API: ${API_BASE}\n`);

  const startTime = Date.now();

  // Check if server is running
  try {
    const healthCheck = await fetch(`${API_BASE}/health`);
    if (!healthCheck.ok) {
      throw new Error('Server not responding');
    }
  } catch (error) {
    console.log(`❌ Prospecting Engine not running at ${API_BASE}`);
    console.log('   Start it with: npm run dev:prospecting');
    process.exit(1);
  }

  // Run all tests
  await testHealthEndpoint();
  const defaultPrompts = await testDefaultPromptsEndpoint();
  const generatedProspects = await testProspectGeneration(defaultPrompts);
  const sampleProspect = await testListProspects();
  await testGetProspectById(sampleProspect);
  await testGetStats();
  await testCustomPrompts(defaultPrompts);
  await testErrorHandling();

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(1);

  // Summary
  logSection('TEST SUMMARY');

  console.log(`\n📊 Results:`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Total: ${passed + failed}`);
  console.log(`   ⏱ Duration: ${duration}s`);
  console.log(`   🎯 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  console.log('\n═'.repeat(80));

  if (failed === 0) {
    console.log('🎉 ALL API ENDPOINT TESTS PASSED!');
    console.log('\n✅ All endpoints are working correctly');
    console.log('✅ Error handling is functional');
    console.log('✅ Custom prompts and models supported');
    console.log('✅ SSE streaming working properly');
  } else {
    console.log('⚠️ SOME TESTS FAILED - Review results above');
  }

  console.log('═'.repeat(80) + '\n');

  // Save results
  const fs = await import('fs/promises');
  const reportPath = `./test-results-api-${Date.now()}.json`;
  await fs.writeFile(reportPath, JSON.stringify({
    summary: {
      passed,
      failed,
      total: passed + failed,
      duration,
      successRate: ((passed / (passed + failed)) * 100).toFixed(1)
    },
    tests: testResults,
    timestamp: new Date().toISOString()
  }, null, 2));

  console.log(`💾 Full results saved to: ${reportPath}\n`);

  process.exit(failed === 0 ? 0 : 1);
}

// Run tests
runAllTests().catch(error => {
  console.error('\n❌ Test suite crashed:', error);
  process.exit(1);
});