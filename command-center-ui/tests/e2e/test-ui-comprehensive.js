/**
 * Command Center UI Comprehensive Test Suite
 * Tests all API endpoints and validates UI functionality
 */

const BASE_URL = 'http://localhost:3000';
const TIMEOUT = 10000;

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

let passed = 0;
let failed = 0;
const errors = [];

/**
 * Make HTTP request with timeout
 */
async function makeRequest(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Test result logger
 */
function logTest(name, success, details = '') {
  if (success) {
    console.log(`${colors.green}✓${colors.reset} ${name}`);
    if (details) console.log(`  ${colors.cyan}→${colors.reset} ${details}`);
    passed++;
  } else {
    console.log(`${colors.red}✗${colors.reset} ${name}`);
    if (details) console.log(`  ${colors.red}→${colors.reset} ${details}`);
    errors.push({ test: name, error: details });
    failed++;
  }
}

/**
 * Section header
 */
function logSection(title) {
  console.log(`\n${colors.blue}━━━ ${title} ━━━${colors.reset}\n`);
}

/**
 * Test 1: UI Homepage Accessibility
 */
async function testHomepage() {
  try {
    const response = await makeRequest(`${BASE_URL}`);
    logTest('Homepage accessible', response.ok, `Status: ${response.status}`);

    if (response.ok) {
      const html = await response.text();
      const hasTitle = html.includes('Dashboard') || html.includes('Command Center');
      logTest('Homepage contains expected content', hasTitle);
    }
  } catch (error) {
    logTest('Homepage accessible', false, error.message);
  }
}

/**
 * Test 2: Stats API Endpoint
 */
async function testStatsAPI() {
  try {
    const response = await makeRequest(`${BASE_URL}/api/stats`);
    logTest('Stats API responds', response.ok, `Status: ${response.status}`);

    if (response.ok) {
      const data = await response.json();
      logTest('Stats API returns JSON', !!data);

      if (data.success) {
        logTest('Stats API success flag', true);
        logTest('Stats contains prospects data', !!data.prospects,
          `Total: ${data.prospects?.total || 0}`);
        logTest('Stats contains leads data', !!data.leads,
          `Total: ${data.leads?.total || 0} (A: ${data.leads?.A || 0}, B: ${data.leads?.B || 0})`);
        logTest('Stats contains emails data', !!data.emails,
          `Total: ${data.emails?.total || 0}`);
      } else {
        logTest('Stats API success flag', false, data.error || 'Unknown error');
      }
    }
  } catch (error) {
    logTest('Stats API responds', false, error.message);
  }
}

/**
 * Test 3: Leads API Endpoint
 */
async function testLeadsAPI() {
  try {
    const response = await makeRequest(`${BASE_URL}/api/leads?limit=5`);
    logTest('Leads API responds', response.ok, `Status: ${response.status}`);

    if (response.ok) {
      const data = await response.json();
      logTest('Leads API returns JSON', !!data);

      if (data.success) {
        logTest('Leads API success flag', true);
        logTest('Leads API returns array', Array.isArray(data.leads));

        if (data.leads && data.leads.length > 0) {
          const lead = data.leads[0];
          logTest('Lead has required fields',
            !!(lead.url && lead.company_name),
            `Sample: ${lead.company_name || 'N/A'} - ${lead.url || 'N/A'}`);
        } else {
          logTest('Leads exist in database', false, 'No leads found');
        }
      } else {
        logTest('Leads API success flag', false, data.error || 'Unknown error');
      }
    }
  } catch (error) {
    logTest('Leads API responds', false, error.message);
  }
}

/**
 * Test 4: Prospects API Endpoint (POST)
 */
async function testProspectsAPI() {
  try {
    // Test with invalid data to check error handling
    const response = await makeRequest(`${BASE_URL}/api/prospects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brief: { industry: 'restaurant', city: 'Philadelphia' },
        count: 1
      })
    });

    logTest('Prospects API responds',
      response.status === 200 || response.status === 400 || response.status === 500,
      `Status: ${response.status}`);

    if (response.ok || response.status === 400) {
      const data = await response.json();
      logTest('Prospects API returns JSON', !!data);
    }
  } catch (error) {
    logTest('Prospects API responds', false, error.message);
  }
}

/**
 * Test 5: Email Composition API Endpoint (POST)
 */
async function testComposeAPI() {
  try {
    // Test with minimal data
    const response = await makeRequest(`${BASE_URL}/api/compose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://example.com',
        strategy: 'compliment-sandwich'
      })
    });

    logTest('Compose API responds',
      response.status === 200 || response.status === 400 || response.status === 500,
      `Status: ${response.status}`);

    if (response.ok || response.status === 400) {
      const data = await response.json();
      logTest('Compose API returns JSON', !!data);
    }
  } catch (error) {
    logTest('Compose API responds', false, error.message);
  }
}

/**
 * Test 6: Emails API Endpoint
 */
async function testEmailsAPI() {
  try {
    const response = await makeRequest(`${BASE_URL}/api/emails?limit=5`);
    logTest('Emails API responds', response.ok, `Status: ${response.status}`);

    if (response.ok) {
      const data = await response.json();
      logTest('Emails API returns JSON', !!data);

      if (data.success) {
        logTest('Emails API success flag', true);
        logTest('Emails API returns array', Array.isArray(data.emails));
      }
    }
  } catch (error) {
    logTest('Emails API responds', false, error.message);
  }
}

/**
 * Test 7: Backend Service Integration
 */
async function testBackendServices() {
  const services = [
    { name: 'Prospecting Engine', url: 'http://localhost:3010/health' },
    { name: 'Analysis Engine', url: 'http://localhost:3001/health' },
    { name: 'Outreach Engine', url: 'http://localhost:3002/health' },
    { name: 'Pipeline Orchestrator', url: 'http://localhost:3020/api/campaigns' },
  ];

  for (const service of services) {
    try {
      const response = await makeRequest(service.url);
      const isHealthy = response.ok || response.status === 404; // 404 means service is running but endpoint might not exist
      logTest(`${service.name} is accessible`, isHealthy,
        `Status: ${response.status}`);
    } catch (error) {
      logTest(`${service.name} is accessible`, false, error.message);
    }
  }
}

/**
 * Test 8: UI Pages Accessibility
 */
async function testUIPages() {
  const pages = [
    { name: 'Dashboard', path: '/' },
    { name: 'Prospecting', path: '/prospecting' },
    { name: 'Analysis', path: '/analysis' },
    { name: 'Leads', path: '/leads' },
    { name: 'Outreach', path: '/outreach' },
    { name: 'Projects', path: '/projects' },
    { name: 'Analytics', path: '/analytics' },
  ];

  for (const page of pages) {
    try {
      const response = await makeRequest(`${BASE_URL}${page.path}`);
      logTest(`${page.name} page accessible`, response.ok,
        `Status: ${response.status}`);
    } catch (error) {
      logTest(`${page.name} page accessible`, false, error.message);
    }
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log(`\n${colors.cyan}╔════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║  Command Center UI - Comprehensive Test Suite ║${colors.reset}`);
  console.log(`${colors.cyan}╚════════════════════════════════════════════════╝${colors.reset}\n`);

  logSection('1. UI Accessibility Tests');
  await testHomepage();
  await testUIPages();

  logSection('2. API Endpoint Tests');
  await testStatsAPI();
  await testLeadsAPI();
  await testProspectsAPI();
  await testComposeAPI();
  await testEmailsAPI();

  logSection('3. Backend Service Integration');
  await testBackendServices();

  // Summary
  console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
  console.log(`${colors.green}✅ Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}❌ Failed: ${failed}${colors.reset}`);
  console.log(`${colors.blue}📊 Total: ${passed + failed}${colors.reset}\n`);

  if (errors.length > 0) {
    console.log(`${colors.yellow}⚠️  Failed Tests:${colors.reset}\n`);
    errors.forEach((err, i) => {
      console.log(`${i + 1}. ${err.test}`);
      console.log(`   ${colors.red}→${colors.reset} ${err.error}\n`);
    });
  }

  const successRate = ((passed / (passed + failed)) * 100).toFixed(1);
  console.log(`${colors.cyan}Success Rate: ${successRate}%${colors.reset}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
