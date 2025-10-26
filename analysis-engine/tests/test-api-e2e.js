/**
 * END-TO-END API INTEGRATION TEST
 * =================================
 *
 * Tests the complete Analysis Engine API workflow as if called from the UI
 *
 * Test Flow:
 * 1. Pre-flight checks (health, prompts)
 * 2. Project setup
 * 3. Single URL analysis
 * 4. Lead retrieval & verification
 * 5. Report generation
 * 6. Report access
 * 7. Statistics dashboard
 * 8. Batch analysis with SSE
 * 9. Cleanup
 */

import { createClient } from '@supabase/supabase-js';
import chalk from 'chalk';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../../.env') });

// ============================================================================
// CONFIGURATION
// ============================================================================

const API_BASE = 'http://localhost:3001';
const TEST_PROJECT_NAME = 'E2E API Test Project';

// Test URLs (fast, reliable sites)
const SINGLE_TEST_URL = 'https://example.com';
const BATCH_TEST_URLS = [
  { url: 'https://example.org', company_name: 'Example Org', industry: 'test' },
  { url: 'https://example.net', company_name: 'Example Net', industry: 'test' }
];

// Initialize Supabase client for direct database queries
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ============================================================================
// TEST STATE
// ============================================================================

const testState = {
  projectId: null,
  leadIds: [],
  reportIds: [],
  totalCost: 0,
  totalTime: 0,
  testsRun: 0,
  testsPassed: 0,
  testsFailed: 0
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function log(message, type = 'info') {
  const icons = {
    info: 'ℹ️',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    progress: '⏳',
    api: '🌐',
    db: '💾',
    report: '📄'
  };

  const colors = {
    info: chalk.cyan,
    success: chalk.green,
    error: chalk.red,
    warning: chalk.yellow,
    progress: chalk.blue,
    api: chalk.magenta,
    db: chalk.cyan,
    report: chalk.blue
  };

  const color = colors[type] || chalk.white;
  console.log(color(`${icons[type] || '•'} ${message}`));
}

function logSection(title) {
  console.log('\n' + chalk.bold.white('═'.repeat(80)));
  console.log(chalk.bold.cyan(`  ${title}`));
  console.log(chalk.bold.white('═'.repeat(80)) + '\n');
}

function logSubsection(title) {
  console.log('\n' + chalk.gray('─'.repeat(80)));
  console.log(chalk.white.bold(`  ${title}`));
  console.log(chalk.gray('─'.repeat(80)));
}

async function runTest(name, testFn) {
  testState.testsRun++;
  try {
    log(`Running: ${name}`, 'progress');
    await testFn();
    testState.testsPassed++;
    log(`PASSED: ${name}`, 'success');
    return true;
  } catch (error) {
    testState.testsFailed++;
    log(`FAILED: ${name}`, 'error');
    log(`Error: ${error.message}`, 'error');
    console.error(error);
    return false;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertExists(value, fieldName) {
  assert(value !== null && value !== undefined, `${fieldName} should exist`);
}

function assertEqual(actual, expected, fieldName) {
  assert(actual === expected, `${fieldName} should be ${expected}, got ${actual}`);
}

// ============================================================================
// TEST STEP 1: PRE-FLIGHT CHECKS
// ============================================================================

async function testHealthCheck() {
  log('GET /health', 'api');
  const response = await fetch(`${API_BASE}/health`);
  const data = await response.json();

  assertEqual(response.status, 200, 'Status code');
  assertEqual(data.status, 'ok', 'Health status');
  assertEqual(data.service, 'analysis-engine', 'Service name');
  assertExists(data.timestamp, 'Timestamp');

  log(`Server: ${data.service} v${data.version}`, 'info');
  log(`Status: ${data.status}`, 'success');
}

async function testGetDefaultPrompts() {
  log('GET /api/prompts/default', 'api');
  const response = await fetch(`${API_BASE}/api/prompts/default`);
  const data = await response.json();

  assertEqual(response.status, 200, 'Status code');
  assertEqual(data.success, true, 'Success flag');
  assertExists(data.data, 'Prompts data');

  const prompts = data.data;
  assertExists(prompts.design_critique, 'Design critique prompt');
  assertExists(prompts.seo_analysis, 'SEO analysis prompt');
  assertExists(prompts.content_analysis, 'Content analysis prompt');
  assertExists(prompts.social_analysis, 'Social analysis prompt');

  log(`Loaded ${Object.keys(prompts).length} prompt configurations`, 'success');
}

// ============================================================================
// TEST STEP 2: PROJECT SETUP
// ============================================================================

async function setupTestProject() {
  log('Setting up test project', 'db');

  // Check if test project already exists
  const { data: existingProjects } = await supabase
    .from('projects')
    .select('id, name, status')
    .eq('name', TEST_PROJECT_NAME)
    .limit(1);

  if (existingProjects && existingProjects.length > 0) {
    testState.projectId = existingProjects[0].id;
    log(`Using existing test project: ${testState.projectId}`, 'info');
  } else {
    // Create new test project
    const { data: newProject, error } = await supabase
      .from('projects')
      .insert({
        name: TEST_PROJECT_NAME,
        client_name: 'E2E Test Client',
        description: 'Automated end-to-end API testing project',
        status: 'active'
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create project: ${error.message}`);

    testState.projectId = newProject.id;
    log(`Created new test project: ${testState.projectId}`, 'success');
  }
}

// ============================================================================
// TEST STEP 3: SINGLE URL ANALYSIS
// ============================================================================

async function testAnalyzeSingleURL() {
  log(`POST /api/analyze-url`, 'api');
  log(`Analyzing: ${SINGLE_TEST_URL}`, 'info');

  const startTime = Date.now();

  const response = await fetch(`${API_BASE}/api/analyze-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: SINGLE_TEST_URL,
      company_name: 'Example E2E Test',
      industry: 'test',
      project_id: testState.projectId
    })
  });

  const data = await response.json();
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  assertEqual(response.status, 200, 'Status code');
  assertEqual(data.success, true, 'Success flag');

  const result = data.result;
  assertExists(result, 'Analysis result');
  assertEqual(result.database_saved, true, 'Database saved');
  assertExists(result.database_id, 'Database ID');

  // Verify analysis fields
  assertExists(result.grade, 'Grade');
  assertExists(result.overall_score, 'Overall score');
  assertExists(result.design_score, 'Design score');
  assertExists(result.seo_score, 'SEO score');
  assertExists(result.content_score, 'Content score');
  assertExists(result.social_score, 'Social score');

  // Track for cleanup
  testState.leadIds.push(result.database_id);

  // Track metrics
  if (result.analysis_cost) testState.totalCost += result.analysis_cost;
  if (result.analysis_time) testState.totalTime += result.analysis_time;

  log(`Grade: ${result.grade} (${result.overall_score}/100)`, 'success');
  log(`Analysis time: ${duration}s`, 'info');
  if (result.analysis_cost) log(`Cost: $${result.analysis_cost.toFixed(4)}`, 'info');
  if (result.report) {
    log(`Auto-generated report: ${result.report.id}`, 'report');
    testState.reportIds.push(result.report.id);
  }
}

// ============================================================================
// TEST STEP 4: LEAD RETRIEVAL
// ============================================================================

async function testGetLeads() {
  log('GET /api/leads', 'api');

  const response = await fetch(`${API_BASE}/api/leads?limit=10`);
  const data = await response.json();

  assertEqual(response.status, 200, 'Status code');
  assertEqual(data.success, true, 'Success flag');
  assertExists(data.leads, 'Leads array');
  assert(Array.isArray(data.leads), 'Leads should be array');
  assert(data.leads.length > 0, 'Should have at least one lead');

  log(`Retrieved ${data.leads.length} leads`, 'success');

  // Find our test lead
  const testLead = data.leads.find(lead => testState.leadIds.includes(lead.id));
  assertExists(testLead, 'Test lead in results');

  log(`Verified test lead: ${testLead.company_name}`, 'success');
}

async function testGetLeadByFilter() {
  log('GET /api/leads with filters', 'api');

  // Test grade filter
  const response = await fetch(`${API_BASE}/api/leads?grade=A&limit=5`);
  const data = await response.json();

  assertEqual(response.status, 200, 'Status code');
  assertEqual(data.success, true, 'Success flag');

  if (data.leads.length > 0) {
    data.leads.forEach(lead => {
      assertEqual(lead.website_grade, 'A', 'Filtered grade');
    });
    log(`Grade filter working: ${data.leads.length} A-grade leads`, 'success');
  } else {
    log('No A-grade leads found (expected for test site)', 'info');
  }
}

// ============================================================================
// TEST STEP 5: REPORT GENERATION
// ============================================================================

async function testGenerateMarkdownReport() {
  log('POST /api/reports/generate (Markdown)', 'api');

  const leadId = testState.leadIds[0];
  const response = await fetch(`${API_BASE}/api/reports/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lead_id: leadId,
      format: 'markdown',
      sections: ['all']
    })
  });

  const data = await response.json();

  assertEqual(response.status, 200, 'Status code');
  assertEqual(data.success, true, 'Success flag');
  assertExists(data.report, 'Report data');
  assertExists(data.report.id, 'Report ID');
  assertExists(data.report.storage_path, 'Storage path');

  testState.reportIds.push(data.report.id);

  log(`Markdown report generated: ${data.report.id}`, 'success');
  log(`Storage: ${data.report.storage_path}`, 'info');
}

async function testGenerateHTMLReport() {
  log('POST /api/reports/generate (HTML)', 'api');

  const leadId = testState.leadIds[0];
  const response = await fetch(`${API_BASE}/api/reports/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lead_id: leadId,
      format: 'html',
      sections: ['all']
    })
  });

  const data = await response.json();

  assertEqual(response.status, 200, 'Status code');
  assertEqual(data.success, true, 'Success flag');
  assertExists(data.report, 'Report data');
  assertExists(data.report.id, 'Report ID');

  testState.reportIds.push(data.report.id);

  log(`HTML report generated: ${data.report.id}`, 'success');
}

// ============================================================================
// TEST STEP 6: REPORT ACCESS
// ============================================================================

async function testGetReportsByLead() {
  log(`GET /api/reports/lead/:lead_id`, 'api');

  const leadId = testState.leadIds[0];
  const response = await fetch(`${API_BASE}/api/reports/lead/${leadId}`);
  const data = await response.json();

  assertEqual(response.status, 200, 'Status code');
  assertEqual(data.success, true, 'Success flag');
  assertExists(data.reports, 'Reports array');
  assert(Array.isArray(data.reports), 'Reports should be array');
  assert(data.reports.length > 0, 'Should have at least one report');

  log(`Found ${data.reports.length} reports for lead`, 'success');

  data.reports.forEach(report => {
    log(`  - ${report.format.toUpperCase()}: ${report.id}`, 'info');
  });
}

async function testGetReportDownloadURL() {
  log(`GET /api/reports/:id/download`, 'api');

  const reportId = testState.reportIds[0];
  const response = await fetch(`${API_BASE}/api/reports/${reportId}/download`);
  const data = await response.json();

  assertEqual(response.status, 200, 'Status code');
  assertEqual(data.success, true, 'Success flag');
  assertExists(data.download_url, 'Download URL');
  assertExists(data.report, 'Report metadata');

  assert(data.download_url.includes('supabase'), 'URL should be Supabase storage');

  log(`Download URL generated`, 'success');
  log(`Expires in 1 hour`, 'info');
}

// ============================================================================
// TEST STEP 7: STATISTICS
// ============================================================================

async function testGetStats() {
  log('GET /api/stats', 'api');

  const response = await fetch(`${API_BASE}/api/stats`);
  const data = await response.json();

  assertEqual(response.status, 200, 'Status code');
  assertEqual(data.success, true, 'Success flag');
  assertExists(data.stats, 'Stats object');

  const stats = data.stats;
  assertExists(stats.totalLeads, 'Total leads');
  assertExists(stats.gradeDistribution, 'Grade distribution');
  assertExists(stats.averageScores, 'Average scores');

  log(`Total leads: ${stats.totalLeads}`, 'info');
  log('Grade distribution:', 'info');
  Object.entries(stats.gradeDistribution).forEach(([grade, count]) => {
    if (count > 0) log(`  ${grade}: ${count}`, 'info');
  });
  log(`Avg overall score: ${stats.averageScores.overall}`, 'info');
  log(`Ready for outreach: ${stats.readyForOutreach}`, 'info');
}

// ============================================================================
// TEST STEP 8: BATCH ANALYSIS WITH SSE
// ============================================================================

async function testBatchAnalysisSSE() {
  log('POST /api/analyze (SSE streaming)', 'api');
  log(`Analyzing ${BATCH_TEST_URLS.length} URLs in batch...`, 'info');

  const startTime = Date.now();

  const response = await fetch(`${API_BASE}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prospects: BATCH_TEST_URLS,
      project_id: testState.projectId
    })
  });

  assertEqual(response.status, 200, 'Status code');

  const contentType = response.headers.get('content-type');
  assert(contentType.includes('text/event-stream'), 'Should be SSE stream');

  log('SSE stream started', 'success');

  // Parse SSE stream
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let buffer = '';
  let eventCount = 0;
  let successCount = 0;
  let errorCount = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.trim() === '') continue;

      if (line.startsWith('event:')) {
        eventCount++;
        const eventType = line.slice(6).trim();
        log(`Event: ${eventType}`, 'progress');
      } else if (line.startsWith('data:')) {
        try {
          const data = JSON.parse(line.slice(5));

          if (data.company_name && data.current) {
            log(`  [${data.current}/${data.total}] ${data.company_name}`, 'info');
          }

          if (data.grade) {
            successCount++;
            log(`  ✓ ${data.company}: Grade ${data.grade} (${data.score}/100)`, 'success');
          }

          if (data.error && data.company) {
            errorCount++;
            log(`  ✗ ${data.company}: ${data.error}`, 'error');
          }

          if (data.successful !== undefined) {
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            log(`\nBatch complete: ${data.successful}/${data.total} successful`, 'success');
            log(`Total time: ${duration}s`, 'info');

            // Track lead IDs for cleanup
            if (data.results) {
              data.results.forEach(result => {
                if (result.success && result.database_id) {
                  testState.leadIds.push(result.database_id);
                }
              });
            }
          }
        } catch (e) {
          // Ignore parse errors for non-JSON data
        }
      }
    }
  }

  log(`SSE stream completed`, 'success');
  log(`Total events: ${eventCount}`, 'info');
  assert(successCount > 0, 'Should have at least one successful analysis');
}

// ============================================================================
// TEST STEP 9: CLEANUP
// ============================================================================

async function cleanupTestData() {
  log('Cleaning up test data...', 'warning');

  // Delete leads
  if (testState.leadIds.length > 0) {
    log(`Deleting ${testState.leadIds.length} test leads`, 'db');

    const response = await fetch(`${API_BASE}/api/leads/batch-delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: testState.leadIds })
    });

    const data = await response.json();

    if (data.success) {
      log(`Deleted ${data.deleted} leads`, 'success');
    } else {
      log(`Failed to delete leads: ${data.error}`, 'error');
    }
  }

  // Delete reports
  if (testState.reportIds.length > 0) {
    log(`Deleting ${testState.reportIds.length} test reports`, 'db');

    for (const reportId of testState.reportIds) {
      try {
        const response = await fetch(`${API_BASE}/api/reports/${reportId}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          log(`  ✓ Deleted report ${reportId}`, 'success');
        }
      } catch (error) {
        log(`  ✗ Failed to delete report ${reportId}`, 'error');
      }
    }
  }

  log('Cleanup complete', 'success');
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  console.log('\n');
  logSection('🧪 ANALYSIS ENGINE - END-TO-END API TEST');
  log(`Testing API at: ${API_BASE}`, 'info');
  log(`Project: ${TEST_PROJECT_NAME}`, 'info');
  console.log('');

  try {
    // STEP 1: Pre-flight checks
    logSubsection('STEP 1: Pre-Flight Checks');
    await runTest('Health check', testHealthCheck);
    await runTest('Get default prompts', testGetDefaultPrompts);

    // STEP 2: Project setup
    logSubsection('STEP 2: Project Setup');
    await runTest('Setup test project', setupTestProject);

    // STEP 3: Single URL analysis
    logSubsection('STEP 3: Single URL Analysis');
    await runTest('Analyze single URL', testAnalyzeSingleURL);

    // STEP 4: Lead retrieval
    logSubsection('STEP 4: Lead Retrieval & Verification');
    await runTest('Get leads', testGetLeads);
    await runTest('Get leads with filters', testGetLeadByFilter);

    // STEP 5: Report generation
    logSubsection('STEP 5: Report Generation');
    await runTest('Generate Markdown report', testGenerateMarkdownReport);
    await runTest('Generate HTML report', testGenerateHTMLReport);

    // STEP 6: Report access
    logSubsection('STEP 6: Report Access');
    await runTest('Get reports by lead', testGetReportsByLead);
    await runTest('Get report download URL', testGetReportDownloadURL);

    // STEP 7: Statistics
    logSubsection('STEP 7: Statistics Dashboard');
    await runTest('Get statistics', testGetStats);

    // STEP 8: Batch analysis
    logSubsection('STEP 8: Batch Analysis with SSE');
    await runTest('Batch analysis with SSE streaming', testBatchAnalysisSSE);

    // STEP 9: Cleanup
    logSubsection('STEP 9: Cleanup');
    await runTest('Cleanup test data', cleanupTestData);

  } catch (error) {
    log(`Fatal error: ${error.message}`, 'error');
    console.error(error);
  }

  // Final summary
  console.log('\n');
  logSection('📊 TEST SUMMARY');

  const passRate = testState.testsRun > 0
    ? ((testState.testsPassed / testState.testsRun) * 100).toFixed(1)
    : 0;

  console.log('');
  log(`Tests run:    ${testState.testsRun}`, 'info');
  log(`Tests passed: ${testState.testsPassed}`, 'success');
  log(`Tests failed: ${testState.testsFailed}`, testState.testsFailed > 0 ? 'error' : 'info');
  log(`Pass rate:    ${passRate}%`, passRate === '100.0' ? 'success' : 'warning');

  if (testState.totalCost > 0) {
    log(`Total cost:   $${testState.totalCost.toFixed(4)}`, 'info');
  }

  if (testState.totalTime > 0) {
    log(`Total time:   ${testState.totalTime}ms`, 'info');
  }

  console.log('\n');

  if (testState.testsFailed === 0) {
    log('✨ ALL TESTS PASSED! ✨', 'success');
  } else {
    log('⚠️  SOME TESTS FAILED', 'error');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});
