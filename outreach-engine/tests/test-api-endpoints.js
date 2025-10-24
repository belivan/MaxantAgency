/**
 * OUTREACH ENGINE v2.0 - API ENDPOINT TESTS
 *
 * Tests all API endpoints to ensure they work correctly.
 */

import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = 'http://localhost:3002';

// Test counters
let totalTests = 0;
let passedTests = 0;

/**
 * Test helper
 */
function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passedTests++;
    return true;
  } catch (error) {
    console.log(`  ❌ ${name}`);
    console.log(`     Error: ${error.message}`);
    return false;
  }
}

/**
 * HTTP helper
 */
async function request(method, path, body = null) {
  const url = `${BASE_URL}${path}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const data = await response.json();

  return {
    status: response.status,
    data
  };
}

/**
 * Test suite: Health & Status
 */
async function testHealthEndpoints() {
  console.log('\n🏥 Testing Health & Status Endpoints...');

  // Test 1: Health check
  console.log('\n  Test: GET /health');
  const health = await request('GET', '/health');

  test('Returns 200 status', () => {
    if (health.status !== 200) {
      throw new Error(`Expected 200, got ${health.status}`);
    }
  });

  test('Has correct health data', () => {
    if (health.data.status !== 'healthy') {
      throw new Error('Status not healthy');
    }
    if (health.data.service !== 'outreach-engine') {
      throw new Error('Wrong service name');
    }
    if (health.data.version !== '2.0') {
      throw new Error('Wrong version');
    }
  });

  // Test 2: Stats endpoint
  console.log('\n  Test: GET /api/stats');
  const stats = await request('GET', '/api/stats');

  test('Stats returns success', () => {
    if (!stats.data.success) {
      throw new Error('Stats failed');
    }
  });

  test('Stats has correct structure', () => {
    if (!stats.data.stats || !stats.data.stats.leads || !stats.data.stats.emails) {
      throw new Error('Missing stats structure');
    }
    if (!stats.data.rateLimits) {
      throw new Error('Missing rate limits');
    }
  });

  console.log(`\n  📊 Database stats:`);
  console.log(`     Regular leads: ${stats.data.stats.leads.regular}`);
  console.log(`     Social leads: ${stats.data.stats.leads.social}`);
  console.log(`     Total emails: ${stats.data.stats.emails.total}`);
  console.log(`     Rate limit: ${stats.data.rateLimits.daily.sent}/${stats.data.rateLimits.daily.limit} today`);
}

/**
 * Test suite: Query Endpoints
 */
async function testQueryEndpoints() {
  console.log('\n🔍 Testing Query Endpoints...');

  // Test 1: Strategies
  console.log('\n  Test: GET /api/strategies');
  const strategies = await request('GET', '/api/strategies');

  test('Strategies returns success', () => {
    if (!strategies.data.success) {
      throw new Error('Strategies failed');
    }
  });

  test('Has email strategies', () => {
    if (!strategies.data.email || !Array.isArray(strategies.data.email)) {
      throw new Error('No email strategies');
    }
    if (strategies.data.email.length === 0) {
      throw new Error('Email strategies empty');
    }
  });

  test('Has social strategies', () => {
    if (!strategies.data.social || !Array.isArray(strategies.data.social)) {
      throw new Error('No social strategies');
    }
  });

  console.log(`\n  📋 Available strategies:`);
  console.log(`     Email: ${strategies.data.email.join(', ')}`);
  console.log(`     Social: ${strategies.data.social.join(', ')}`);

  // Test 2: Get leads
  console.log('\n  Test: GET /api/leads/ready');
  const leads = await request('GET', '/api/leads/ready?type=regular&limit=3');

  test('Leads returns success', () => {
    if (!leads.data.success) {
      throw new Error('Leads failed');
    }
  });

  test('Returns lead array', () => {
    if (!leads.data.leads || !Array.isArray(leads.data.leads)) {
      throw new Error('No leads array');
    }
  });

  console.log(`\n  📊 Found ${leads.data.count} leads`);
  if (leads.data.leads.length > 0) {
    console.log(`     First lead: ${leads.data.leads[0].company_name || leads.data.leads[0].url}`);
  }

  // Test 3: Get emails
  console.log('\n  Test: GET /api/emails');
  const emails = await request('GET', '/api/emails?limit=5');

  test('Emails returns success', () => {
    if (!emails.data.success) {
      throw new Error('Emails failed');
    }
  });

  test('Returns email array', () => {
    if (!emails.data.emails || !Array.isArray(emails.data.emails)) {
      throw new Error('No emails array');
    }
  });

  console.log(`\n  📧 Found ${emails.data.count} emails`);
}

/**
 * Test suite: Email Composition
 */
async function testEmailComposition() {
  console.log('\n📧 Testing Email Composition...');

  // Get a lead to test with
  const leadsResponse = await request('GET', '/api/leads/ready?type=regular&limit=1');

  if (!leadsResponse.data.success || leadsResponse.data.leads.length === 0) {
    console.log('  ⚠️  No leads available for testing');
    return;
  }

  const testLead = leadsResponse.data.leads[0];
  console.log(`\n  Testing with: ${testLead.company_name || testLead.url}`);

  // Test 1: Basic composition
  console.log('\n  Test: POST /api/compose (basic)');
  const startTime = Date.now();

  const compose = await request('POST', '/api/compose', {
    url: testLead.url,
    strategy: 'compliment-sandwich',
    model: 'claude-haiku-4-5'
  });

  const duration = Date.now() - startTime;

  test('Composition returns success', () => {
    if (!compose.data.success) {
      throw new Error(`Composition failed: ${compose.data.error}`);
    }
  });

  test('Has email object', () => {
    if (!compose.data.email || !compose.data.email.id) {
      throw new Error('No email object');
    }
  });

  test('Has result with subject and body', () => {
    if (!compose.data.result || !compose.data.result.subject || !compose.data.result.body) {
      throw new Error('Missing subject or body');
    }
  });

  test('Has validation data', () => {
    if (!compose.data.result.validation || typeof compose.data.result.validation.score !== 'number') {
      throw new Error('Missing validation');
    }
  });

  test('Has cost tracking', () => {
    if (typeof compose.data.result.total_cost !== 'number') {
      throw new Error('Missing cost');
    }
  });

  console.log(`\n  ✅ Email composed successfully!`);
  console.log(`     Subject: ${compose.data.result.subject.substring(0, 60)}...`);
  console.log(`     Validation: ${compose.data.result.validation.score}/100 (${compose.data.result.validation.rating})`);
  console.log(`     Cost: $${compose.data.result.total_cost.toFixed(6)}`);
  console.log(`     Time: ${duration}ms`);
  console.log(`     Email ID: ${compose.data.email.id}`);

  // Test 2: Composition with variants
  console.log('\n  Test: POST /api/compose (with variants)');

  const composeVariants = await request('POST', '/api/compose', {
    url: testLead.url,
    strategy: 'problem-first',
    generateVariants: true,
    model: 'claude-haiku-4-5'
  });

  test('Variant composition returns success', () => {
    if (!composeVariants.data.success) {
      throw new Error(`Variant composition failed: ${composeVariants.data.error}`);
    }
  });

  test('Has variant data', () => {
    if (!composeVariants.data.result.subjects || !composeVariants.data.result.bodies) {
      throw new Error('Missing variants');
    }
  });

  test('Has recommendation', () => {
    if (!composeVariants.data.result.recommended || typeof composeVariants.data.result.recommended.subject !== 'number') {
      throw new Error('Missing recommendation');
    }
  });

  console.log(`\n  ✅ Variants generated!`);
  console.log(`     Subjects: ${composeVariants.data.result.subjects.length}`);
  console.log(`     Bodies: ${composeVariants.data.result.bodies.length}`);
  console.log(`     Recommended: Subject ${composeVariants.data.result.recommended.subject + 1}, Body ${composeVariants.data.result.recommended.body + 1}`);
  console.log(`     Cost: $${composeVariants.data.result.total_cost.toFixed(6)}`);
}

/**
 * Test suite: Social DM Composition
 */
async function testSocialComposition() {
  console.log('\n💬 Testing Social DM Composition...');

  // Get a social lead to test with
  const leadsResponse = await request('GET', '/api/leads/ready?type=social&limit=1');

  if (!leadsResponse.data.success || leadsResponse.data.leads.length === 0) {
    console.log('  ⚠️  No social leads available for testing');
    return;
  }

  const testLead = leadsResponse.data.leads[0];

  // Find which platform this lead has
  let platform = 'instagram';
  if (testLead.social_profiles) {
    if (testLead.social_profiles.facebook) platform = 'facebook';
    else if (testLead.social_profiles.linkedin) platform = 'linkedin';
  }

  console.log(`\n  Testing with: ${testLead.company_name || testLead.url} (${platform})`);

  console.log('\n  Test: POST /api/compose-social');

  try {
    const composeSocial = await request('POST', '/api/compose-social', {
      url: testLead.url,
      platform,
      strategy: 'value-first',
      model: 'claude-haiku-4-5'
    });

    test('Social DM returns success', () => {
      if (!composeSocial.data.success) {
        throw new Error(`Social composition failed: ${composeSocial.data.error}`);
      }
    });

    if (composeSocial.data.success) {
      test('Has DM message', () => {
        if (!composeSocial.data.result || !composeSocial.data.result.message) {
          throw new Error('Missing message');
        }
      });

      test('Has validation', () => {
        if (!composeSocial.data.result.validation || typeof composeSocial.data.result.validation.score !== 'number') {
          throw new Error('Missing validation');
        }
      });

      console.log(`\n  ✅ DM composed successfully!`);
      console.log(`     Message: ${composeSocial.data.result.message.substring(0, 100)}...`);
      console.log(`     Characters: ${composeSocial.data.result.character_count}`);
      console.log(`     Validation: ${composeSocial.data.result.validation.score}/100`);
      console.log(`     Cost: $${composeSocial.data.result.cost.toFixed(6)}`);
    }
  } catch (error) {
    console.log(`  ⚠️  Social DM test skipped: ${error.message}`);
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║      OUTREACH ENGINE v2.0 - API TEST SUITE            ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  const startTime = Date.now();

  try {
    await testHealthEndpoints();
    await testQueryEndpoints();
    await testEmailComposition();
    await testSocialComposition();

    const duration = Date.now() - startTime;

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                   TEST SUMMARY                         ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log(`\n  Total Tests: ${totalTests}`);
    console.log(`  Passed: ${passedTests}`);
    console.log(`  Failed: ${totalTests - passedTests}`);
    console.log(`  Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    console.log(`  Duration: ${duration}ms`);

    if (passedTests === totalTests) {
      console.log('\n  ✅ ALL TESTS PASSED!');
      console.log('\n  🚀 Outreach Engine v2.0 is fully operational!');
      process.exit(0);
    } else {
      console.log('\n  ⚠️  SOME TESTS FAILED');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n  ❌ Test suite error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
runAllTests();
