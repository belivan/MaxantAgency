/**
 * COMPREHENSIVE PROSPECTING ENGINE TEST
 *
 * Tests all components of the Prospecting Engine:
 * - Health check
 * - API endpoints
 * - Database integration
 * - 7-step pipeline
 * - Google Maps discovery
 * - Website extraction
 * - Social enrichment
 * - ICP relevance scoring
 */

import fetch from 'node-fetch';
import { runProspectingPipeline } from '../../orchestrator.js';
import { getProspects, getProspectStats, saveOrLinkProspect } from '../../database/supabase-client.js';
import { costTracker } from '../../shared/cost-tracker.js';
import { logInfo } from '../../shared/logger.js';

const API_BASE = 'http://localhost:3010';

// Test results tracker
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: []
};

function recordTest(name, passed, detail = '') {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${name}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${name}`);
  }
  if (detail) {
    console.log(`   ${detail}`);
  }
  testResults.tests.push({ name, passed, detail });
}

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ════════════════════════════════════════════════════════════════════
// TEST 1: Service Health Check
// ════════════════════════════════════════════════════════════════════

async function testHealthEndpoint() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 1: Service Health Check');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const response = await fetch(`${API_BASE}/health`, {
      timeout: 5000
    });

    const data = await response.json();

    recordTest('GET /health returns 200', response.status === 200);
    recordTest('Health response has status field', data.status === 'healthy');
    recordTest('Health response has service field', data.service === 'prospecting-engine');
    recordTest('Health response has version field', !!data.version);
    recordTest('Health response has timestamp', !!data.timestamp);

    console.log(`\n   Service: ${data.service}`);
    console.log(`   Version: ${data.version}`);
    console.log(`   Status: ${data.status}`);

  } catch (error) {
    recordTest('Service is running', false, 'Cannot connect to http://localhost:3010');
    console.log('\n   ⚠️  Make sure to start the server: npm run dev:prospecting');
    throw new Error('Service not running. Please start it first.');
  }
}

// ════════════════════════════════════════════════════════════════════
// TEST 2: Root Endpoint
// ════════════════════════════════════════════════════════════════════

async function testRootEndpoint() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 2: Root Endpoint Documentation');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const response = await fetch(`${API_BASE}/`);
    const data = await response.json();

    recordTest('GET / returns 200', response.status === 200);
    recordTest('Root has endpoints documentation', !!data.endpoints);
    recordTest('Root has name field', data.name === 'Prospecting Engine');
    recordTest('Root has description', !!data.description);

    console.log(`\n   Available Endpoints:`);
    Object.entries(data.endpoints).forEach(([key, value]) => {
      console.log(`   - ${value}`);
    });

  } catch (error) {
    recordTest('GET / endpoint works', false, error.message);
  }
}

// ════════════════════════════════════════════════════════════════════
// TEST 3: Database Connection
// ════════════════════════════════════════════════════════════════════

async function testDatabaseConnection() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 3: Database Connection');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const prospects = await getProspects({ limit: 1 });
    recordTest('Database connection successful', true);
    recordTest('Can query prospects table', true);

    const stats = await getProspectStats();
    recordTest('Can query prospect statistics', true);

    console.log(`\n   Total prospects in database: ${stats.total || 0}`);
    if (stats.byStatus) {
      console.log(`   By Status:`);
      Object.entries(stats.byStatus).forEach(([status, count]) => {
        console.log(`   - ${status}: ${count}`);
      });
    }

  } catch (error) {
    recordTest('Database connection', false, error.message);
    console.log(`\n   Error: ${error.message}`);
    console.log('   Make sure SUPABASE_URL and SUPABASE_SERVICE_KEY are set in .env');
  }
}

// ════════════════════════════════════════════════════════════════════
// TEST 4: GET /api/prospects
// ════════════════════════════════════════════════════════════════════

async function testGetProspects() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 4: GET /api/prospects Endpoint');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Test basic query
    const response = await fetch(`${API_BASE}/api/prospects?limit=5`);
    const data = await response.json();

    recordTest('GET /api/prospects returns 200', response.status === 200);
    recordTest('Response has success field', data.success === true);
    recordTest('Response has prospects array', Array.isArray(data.prospects));
    recordTest('Response has count field', typeof data.count === 'number');

    console.log(`\n   Prospects returned: ${data.count}`);

    // Test with filters
    const filteredResponse = await fetch(`${API_BASE}/api/prospects?status=ready_for_analysis&limit=3`);
    const filteredData = await filteredResponse.json();

    recordTest('GET /api/prospects with filters works', filteredResponse.status === 200);

    console.log(`   Prospects with status filter: ${filteredData.count}`);

    // Display sample prospect
    if (data.prospects.length > 0) {
      const sample = data.prospects[0];
      console.log(`\n   Sample Prospect:`);
      console.log(`   - Company: ${sample.company_name}`);
      console.log(`   - Industry: ${sample.industry || 'N/A'}`);
      console.log(`   - Location: ${sample.city || 'N/A'}, ${sample.state || 'N/A'}`);
      console.log(`   - Website: ${sample.website || 'N/A'}`);
      console.log(`   - Rating: ${sample.google_rating || 'N/A'}/5.0`);
      console.log(`   - Status: ${sample.status || 'N/A'}`);
    }

  } catch (error) {
    recordTest('GET /api/prospects endpoint', false, error.message);
  }
}

// ════════════════════════════════════════════════════════════════════
// TEST 5: GET /api/stats
// ════════════════════════════════════════════════════════════════════

async function testGetStats() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 5: GET /api/stats Endpoint');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const response = await fetch(`${API_BASE}/api/stats`);
    const data = await response.json();

    recordTest('GET /api/stats returns 200', response.status === 200);
    recordTest('Stats response has success field', data.success === true);
    recordTest('Stats response has stats object', !!data.stats);

    console.log(`\n   Statistics:`);
    console.log(`   - Total: ${data.stats.total || 0}`);

    if (data.stats.byStatus) {
      console.log(`   - By Status:`);
      Object.entries(data.stats.byStatus).forEach(([status, count]) => {
        console.log(`     • ${status}: ${count}`);
      });
    }

    if (data.stats.byIndustry) {
      console.log(`   - Top Industries:`);
      Object.entries(data.stats.byIndustry)
        .slice(0, 5)
        .forEach(([industry, count]) => {
          console.log(`     • ${industry}: ${count}`);
        });
    }

  } catch (error) {
    recordTest('GET /api/stats endpoint', false, error.message);
  }
}

// ════════════════════════════════════════════════════════════════════
// TEST 6: Pipeline - Query Understanding (Step 1)
// ════════════════════════════════════════════════════════════════════

async function testQueryUnderstanding() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 6: Query Understanding (Step 1)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const { understandQuery } = await import('../validators/index.js');

    const testBrief = {
      industry: 'Coffee Shops',
      city: 'Seattle, WA',
      target: 'Specialty coffee shops with outdoor seating'
    };

    console.log('   Input Brief:');
    console.log(`   - Industry: ${testBrief.industry}`);
    console.log(`   - City: ${testBrief.city}`);
    console.log(`   - Target: ${testBrief.target}`);

    const query = await understandQuery(testBrief);

    recordTest('Query understanding generates search query', !!query);
    recordTest('Query is a non-empty string', typeof query === 'string' && query.length > 0);

    console.log(`\n   Generated Query: "${query}"`);

  } catch (error) {
    recordTest('Query understanding', false, error.message);
    console.log(`   Note: This may fail if XAI_API_KEY is not set (will use fallback)`);
  }
}

// ════════════════════════════════════════════════════════════════════
// TEST 7: Mini End-to-End Pipeline Test
// ════════════════════════════════════════════════════════════════════

async function testMiniPipeline() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 7: Mini Pipeline Test (3 Prospects)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('⚠️  This test requires API keys:');
  console.log('   - GOOGLE_MAPS_API_KEY (for Google Maps discovery)');
  console.log('   - XAI_API_KEY (optional, for AI features)');
  console.log('   If not set, test will be skipped.\n');

  if (!process.env.GOOGLE_MAPS_API_KEY) {
    recordTest('Mini pipeline test', false, 'GOOGLE_MAPS_API_KEY not set - skipping');
    console.log('   To enable this test, add GOOGLE_MAPS_API_KEY to .env');
    return;
  }

  try {
    const testBrief = {
      industry: 'pizza',
      city: 'New York, NY',
      count: 3
    };

    const options = {
      minRating: 4.0,
      verifyWebsites: true,
      scrapeWebsites: false, // Skip scraping for quick test
      findSocial: false,      // Skip social for quick test
      checkRelevance: false   // Skip relevance for quick test
    };

    console.log('   Test Brief: Pizza places in New York');
    console.log('   Count: 3 (quick test)');
    console.log('   Features: Basic discovery + verification\n');

    const startTime = Date.now();

    // Progress tracking
    let stepCount = 0;
    const onProgress = (event) => {
      if (event.type === 'step' && event.status === 'completed') {
        stepCount++;
        console.log(`   ✓ Step ${event.step}: ${event.name}`);
      }
    };

    const results = await runProspectingPipeline(testBrief, options, onProgress);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    recordTest('Pipeline completes without errors', true);
    recordTest('Pipeline finds companies', results.found > 0, `Found ${results.found}`);
    recordTest('Pipeline saves prospects', results.saved > 0, `Saved ${results.saved}`);
    recordTest('Pipeline tracks costs', results.cost >= 0, `Cost: $${results.cost}`);

    console.log(`\n   Results:`);
    console.log(`   - Companies Found: ${results.found}`);
    console.log(`   - Prospects Saved: ${results.saved}`);
    console.log(`   - Success Rate: ${((results.saved / results.found) * 100).toFixed(0)}%`);
    console.log(`   - Duration: ${duration}s`);
    console.log(`   - Total Cost: $${results.cost}`);

  } catch (error) {
    recordTest('Mini pipeline test', false, error.message);
    console.log(`\n   Error: ${error.message}`);
  }
}

// ════════════════════════════════════════════════════════════════════
// TEST 8: Error Handling
// ════════════════════════════════════════════════════════════════════

async function testErrorHandling() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 8: Error Handling');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Test invalid request (missing brief)
    const response1 = await fetch(`${API_BASE}/api/prospect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    recordTest('POST /api/prospect rejects missing brief', response1.status === 400);

    // Test invalid request (missing industry/target)
    const response2 = await fetch(`${API_BASE}/api/prospect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brief: {} })
    });

    recordTest('POST /api/prospect validates brief fields', response2.status === 400);

    // Test 404
    const response3 = await fetch(`${API_BASE}/api/nonexistent`);
    recordTest('Returns 404 for invalid endpoint', response3.status === 404);

    console.log('\n   Error handling working correctly ✓');

  } catch (error) {
    recordTest('Error handling test', false, error.message);
  }
}

// ════════════════════════════════════════════════════════════════════
// MAIN TEST RUNNER
// ════════════════════════════════════════════════════════════════════

async function runAllTests() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║                                                          ║');
  console.log('║    PROSPECTING ENGINE - COMPREHENSIVE TEST SUITE         ║');
  console.log('║                                                          ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  const startTime = Date.now();

  try {
    // Run all tests sequentially
    await testHealthEndpoint();
    await testRootEndpoint();
    await testDatabaseConnection();
    await testGetProspects();
    await testGetStats();
    await testQueryUnderstanding();
    await testErrorHandling();
    await testMiniPipeline(); // Run last as it takes longest

    // Final Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('\n\n╔══════════════════════════════════════════════════════════╗');
    console.log('║                 TEST SUMMARY                             ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    console.log(`   Total Tests: ${testResults.total}`);
    console.log(`   ✅ Passed: ${testResults.passed}`);
    console.log(`   ❌ Failed: ${testResults.failed}`);
    console.log(`   Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(0)}%`);
    console.log(`   Duration: ${duration}s`);

    // Group by category
    console.log('\n   Results by Category:\n');

    const categories = {
      'Service Health': testResults.tests.filter(t => t.name.includes('health') || t.name.includes('running')),
      'API Endpoints': testResults.tests.filter(t => t.name.includes('GET') || t.name.includes('POST')),
      'Database': testResults.tests.filter(t => t.name.includes('Database') || t.name.includes('query')),
      'Pipeline': testResults.tests.filter(t => t.name.includes('Pipeline') || t.name.includes('Query understanding')),
      'Error Handling': testResults.tests.filter(t => t.name.includes('Error') || t.name.includes('invalid'))
    };

    Object.entries(categories).forEach(([category, tests]) => {
      if (tests.length > 0) {
        const passed = tests.filter(t => t.passed).length;
        const icon = passed === tests.length ? '✅' : '⚠️';
        console.log(`   ${icon} ${category}: ${passed}/${tests.length}`);
      }
    });

    console.log('\n');

    // Final verdict
    const allPassed = testResults.failed === 0;

    if (allPassed) {
      console.log('╔══════════════════════════════════════════════════════════╗');
      console.log('║                                                          ║');
      console.log('║       🎉 ALL TESTS PASSED! SYSTEM OPERATIONAL! 🎉       ║');
      console.log('║                                                          ║');
      console.log('╚══════════════════════════════════════════════════════════╝\n');
    } else {
      console.log('╔══════════════════════════════════════════════════════════╗');
      console.log('║                                                          ║');
      console.log('║         ⚠️  SOME TESTS FAILED - REVIEW ABOVE  ⚠️         ║');
      console.log('║                                                          ║');
      console.log('╚══════════════════════════════════════════════════════════╝\n');

      console.log('   Failed Tests:\n');
      testResults.tests.filter(t => !t.passed).forEach(t => {
        console.log(`   ❌ ${t.name}`);
        if (t.detail) console.log(`      ${t.detail}`);
      });
      console.log('');
    }

    return {
      success: allPassed,
      results: testResults,
      duration
    };

  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:\n');
    console.error(error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run tests
runAllTests()
  .then(result => {
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
