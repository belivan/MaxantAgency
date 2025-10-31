/**
 * End-to-End Test: Single Business Lookup
 *
 * Tests the new /api/lookup-business endpoint with various query types
 */

import fetch from 'node-fetch';
import { getProspectById, deleteProspect } from '../database/supabase-client.js';

const API_URL = 'http://localhost:3010/api/lookup-business';
const TESTS_PASSED = [];
const TESTS_FAILED = [];

// ANSI color codes
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

console.log('\n' + '='.repeat(60));
console.log('  END-TO-END TEST: Single Business Lookup');
console.log('='.repeat(60) + '\n');

/**
 * Test helper: Lookup business and verify
 */
async function testLookup(testName, query, expectedCompanyName, options = {}) {
  console.log(`\n${BLUE}[TEST]${RESET} ${testName}`);
  console.log(`${YELLOW}Query:${RESET} ${query}`);

  const startTime = Date.now();

  try {
    // Step 1: Call API
    console.log('  → Calling API...');
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, options })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`API returned ${response.status}: ${error.error}`);
    }

    const result = await response.json();
    const apiTime = Date.now() - startTime;

    // Step 2: Verify response structure
    console.log('  → Verifying response structure...');
    if (!result.success) {
      throw new Error('Response missing success=true');
    }
    if (!result.prospect) {
      throw new Error('Response missing prospect object');
    }
    if (!result.metadata) {
      throw new Error('Response missing metadata');
    }

    const prospect = result.prospect;
    const metadata = result.metadata;

    // Step 3: Verify prospect data
    console.log('  → Verifying prospect data...');

    // Required fields
    const requiredFields = [
      'id', 'company_name', 'city', 'state', 'source', 'status',
      'google_place_id', 'created_at', 'updated_at'
    ];

    for (const field of requiredFields) {
      if (!prospect[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Verify company name matches (case-insensitive partial match)
    if (expectedCompanyName &&
        !prospect.company_name.toLowerCase().includes(expectedCompanyName.toLowerCase())) {
      throw new Error(
        `Company name mismatch. Expected "${expectedCompanyName}", got "${prospect.company_name}"`
      );
    }

    // Verify source is 'single-lookup'
    if (prospect.source !== 'single-lookup') {
      throw new Error(`Source should be 'single-lookup', got '${prospect.source}'`);
    }

    // Verify ICP fields are null (no ICP used)
    if (prospect.icp_match_score !== null) {
      throw new Error(`icp_match_score should be null, got ${prospect.icp_match_score}`);
    }
    if (prospect.icp_brief_snapshot !== null) {
      throw new Error(`icp_brief_snapshot should be null`);
    }

    // Verify is_relevant is true (default for single lookup)
    if (prospect.is_relevant !== true) {
      throw new Error(`is_relevant should be true, got ${prospect.is_relevant}`);
    }

    // Step 4: Verify database record
    console.log('  → Verifying database record...');
    const dbProspect = await getProspectById(prospect.id);

    if (!dbProspect) {
      throw new Error('Prospect not found in database');
    }

    if (dbProspect.company_name !== prospect.company_name) {
      throw new Error('Database company name mismatch');
    }

    // Step 5: Display results
    console.log(`\n  ${GREEN}✓ SUCCESS${RESET}`);
    console.log(`  ─────────────────────────────────────────────────────`);
    console.log(`  Company:       ${prospect.company_name}`);
    console.log(`  Location:      ${prospect.city}, ${prospect.state}`);
    console.log(`  Website:       ${prospect.website || 'N/A'}`);
    console.log(`  Status:        ${prospect.website_status || 'N/A'}`);
    console.log(`  Email:         ${prospect.contact_email || 'Not found'}`);
    console.log(`  Phone:         ${prospect.contact_phone || 'Not found'}`);
    console.log(`  Rating:        ${prospect.google_rating || 'N/A'} (${prospect.google_review_count || 0} reviews)`);
    console.log(`  Social:        ${Object.keys(prospect.social_profiles || {}).filter(k => prospect.social_profiles[k]).join(', ') || 'None'}`);
    console.log(`  Services:      ${prospect.services?.length || 0} found`);
    console.log(`  ─────────────────────────────────────────────────────`);
    console.log(`  Time:          ${apiTime}ms (API) | ${metadata.discovery_time_ms}ms (total)`);
    console.log(`  Cost:          $${metadata.discovery_cost_usd.toFixed(4)}`);
    console.log(`  Steps:         ${metadata.steps_completed}`);
    console.log(`  Database ID:   ${prospect.id}`);

    TESTS_PASSED.push(testName);

    // Cleanup: Delete test prospect
    if (!options.keepInDatabase) {
      console.log(`  → Cleaning up (deleting prospect)...`);
      await deleteProspect(prospect.id);
      console.log(`  → Deleted from database`);
    }

    return prospect;

  } catch (error) {
    console.log(`\n  ${RED}✗ FAILED${RESET}`);
    console.log(`  Error: ${error.message}`);
    TESTS_FAILED.push({ test: testName, error: error.message });
    throw error;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  try {
    // TEST 1: Business name + city
    await testLookup(
      'Test 1: Business Name + City',
      'Di Bruno Bros Philadelphia',
      'Di Bruno'
    );

    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s between tests

    // TEST 2: Business with specific location
    await testLookup(
      'Test 2: Business with Location',
      'Reading Terminal Market Philadelphia',
      'Reading Terminal'
    );

    await new Promise(resolve => setTimeout(resolve, 2000));

    // TEST 3: Simple business name (should find first result)
    await testLookup(
      'Test 3: Simple Business Name',
      'Starbucks New York',
      'Starbucks'
    );

    await new Promise(resolve => setTimeout(resolve, 2000));

    // TEST 4: With options (minimal enrichment for speed)
    await testLookup(
      'Test 4: With Options (Minimal Enrichment)',
      'Target Philadelphia',
      'Target',
      {
        scrapeWebsite: false,
        findSocial: false,
        scrapeSocial: false
      }
    );

    await new Promise(resolve => setTimeout(resolve, 2000));

    // TEST 5: Business not found (should fail gracefully)
    console.log(`\n${BLUE}[TEST]${RESET} Test 5: Business Not Found (Error Handling)`);
    console.log(`${YELLOW}Query:${RESET} NonexistentBusiness12345XYZ`);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'NonexistentBusiness12345XYZ' })
      });

      const result = await response.json();

      if (response.status === 404 && result.error === 'Business not found in Google Maps') {
        console.log(`  ${GREEN}✓ SUCCESS${RESET} - Correctly returned 404 error`);
        TESTS_PASSED.push('Test 5: Error Handling');
      } else {
        throw new Error(`Expected 404 error, got ${response.status}: ${result.error}`);
      }
    } catch (error) {
      console.log(`  ${RED}✗ FAILED${RESET}`);
      console.log(`  Error: ${error.message}`);
      TESTS_FAILED.push({ test: 'Test 5: Error Handling', error: error.message });
    }

    // TEST 6: Missing query parameter (should fail validation)
    console.log(`\n${BLUE}[TEST]${RESET} Test 6: Missing Query Parameter (Validation)`);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}) // No query
      });

      const result = await response.json();

      if (response.status === 400 && result.error.includes('Missing "query"')) {
        console.log(`  ${GREEN}✓ SUCCESS${RESET} - Correctly returned 400 validation error`);
        TESTS_PASSED.push('Test 6: Validation');
      } else {
        throw new Error(`Expected 400 validation error, got ${response.status}`);
      }
    } catch (error) {
      console.log(`  ${RED}✗ FAILED${RESET}`);
      console.log(`  Error: ${error.message}`);
      TESTS_FAILED.push({ test: 'Test 6: Validation', error: error.message });
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('  TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`  ${GREEN}✓ Passed:${RESET} ${TESTS_PASSED.length}`);
    console.log(`  ${RED}✗ Failed:${RESET} ${TESTS_FAILED.length}`);

    if (TESTS_PASSED.length > 0) {
      console.log(`\n  ${GREEN}Passed Tests:${RESET}`);
      TESTS_PASSED.forEach(test => console.log(`    • ${test}`));
    }

    if (TESTS_FAILED.length > 0) {
      console.log(`\n  ${RED}Failed Tests:${RESET}`);
      TESTS_FAILED.forEach(({ test, error }) => {
        console.log(`    • ${test}`);
        console.log(`      Error: ${error}`);
      });
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Exit with appropriate code
    process.exit(TESTS_FAILED.length > 0 ? 1 : 0);

  } catch (error) {
    console.error(`\n${RED}Fatal error:${RESET}`, error);
    process.exit(1);
  }
}

// Run tests
runTests();