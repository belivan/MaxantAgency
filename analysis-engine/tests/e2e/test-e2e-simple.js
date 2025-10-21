/**
 * Simple End-to-End Test for Analysis Engine
 * Tests the full analysis workflow with a real website
 */

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║         ANALYSIS ENGINE - END-TO-END TEST                      ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

const testUrl = 'https://zahavrestaurant.com';
const testCompany = 'Zahav Restaurant';
const testIndustry = 'restaurant';

let passedTests = 0;
let failedTests = 0;

function logTest(name, passed, details = '') {
  if (passed) {
    console.log(`✅ ${name}`);
    if (details) console.log(`   ${details}`);
    passedTests++;
  } else {
    console.log(`❌ ${name}`);
    if (details) console.log(`   ${details}`);
    failedTests++;
  }
}

// Test 1: Health Check
console.log('1️⃣  Testing Health Endpoint...\n');
try {
  const healthResponse = await fetch('http://localhost:3001/health');
  const healthData = await healthResponse.json();

  logTest('Health check returns 200', healthResponse.status === 200);
  logTest('Health check returns OK status', healthData.status === 'ok');
  logTest('Service name is correct', healthData.service === 'analysis-engine');
} catch (err) {
  logTest('Health check', false, err.message);
}

// Test 2: Analyze URL
console.log('\n2️⃣  Testing URL Analysis...\n');
console.log(`   Target: ${testUrl}`);
console.log(`   Company: ${testCompany}`);
console.log(`   Industry: ${testIndustry}\n`);

const startTime = Date.now();

try {
  const response = await fetch('http://localhost:3001/api/analyze-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: testUrl,
      company_name: testCompany,
      industry: testIndustry
    })
  });

  const result = await response.json();
  const analysisTime = Date.now() - startTime;

  logTest('Analysis request returns 200', response.status === 200 || response.status === 201);
  logTest('Response has success flag', result.success === true);

  if (result.success && result.result) {
    const analysis = result.result;

    // Test structure
    logTest('Analysis has grade', analysis.grade !== undefined);
    logTest('Analysis has overall_score', analysis.overall_score !== undefined);
    logTest('Analysis has design_score', analysis.design_score !== undefined);
    logTest('Analysis has seo_score', analysis.seo_score !== undefined);
    logTest('Analysis has content_score', analysis.content_score !== undefined);
    logTest('Analysis has social_score', analysis.social_score !== undefined);

    // Test values
    logTest('Grade is A-F', /^[A-F]$/.test(analysis.grade), `Grade: ${analysis.grade}`);
    logTest('Overall score is 0-100', analysis.overall_score >= 0 && analysis.overall_score <= 100, `Score: ${analysis.overall_score}`);
    logTest('Has quick_wins array', Array.isArray(analysis.quick_wins), `Count: ${analysis.quick_wins?.length || 0}`);
    logTest('Has top_issue object', analysis.top_issue !== undefined && typeof analysis.top_issue === 'object');
    logTest('Has one_liner string', typeof analysis.one_liner === 'string' && analysis.one_liner.length > 0);

    // Display results
    console.log('\n   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('   📊 ANALYSIS RESULTS:');
    console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Grade:        ${analysis.grade}`);
    console.log(`   Score:        ${analysis.overall_score}/100`);
    console.log(`   Design:       ${analysis.design_score}/100`);
    console.log(`   SEO:          ${analysis.seo_score}/100`);
    console.log(`   Content:      ${analysis.content_score}/100`);
    console.log(`   Social:       ${analysis.social_score}/100`);
    console.log(`   Quick Wins:   ${analysis.quick_wins?.length || 0}`);
    console.log(`   Top Issue:    ${analysis.top_issue?.title || 'None'}`);
    console.log(`   One-liner:    ${analysis.one_liner}`);
    console.log(`   Analysis Time: ${(analysisTime / 1000).toFixed(1)}s`);
    console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } else {
    logTest('Analysis response structure', false, `Error: ${result.error || 'Unknown error'}`);
  }
} catch (err) {
  logTest('URL Analysis', false, err.message);
}

// Test 3: Database Verification
console.log('3️⃣  Testing Database Persistence...\n');

try {
  const { createClient } = await import('@supabase/supabase-js');
  import('dotenv').then(dotenv => dotenv.config());

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // Query for the most recent lead
  const { data: leads, error } = await supabase
    .from('leads')
    .select('company_name, website_grade, design_score, seo_score, url, analyzed_at')
    .eq('url', testUrl)
    .order('analyzed_at', { ascending: false })
    .limit(1);

  if (error) {
    logTest('Database query', false, error.message);
  } else {
    logTest('Database query successful', !error);
    logTest('Lead saved to database', leads && leads.length > 0);

    if (leads && leads.length > 0) {
      const lead = leads[0];
      logTest('Saved lead has company_name', lead.company_name === testCompany);
      logTest('Saved lead has website_grade', lead.website_grade !== null);
      logTest('Saved lead has design_score', lead.design_score !== null);
      logTest('Saved lead has seo_score', lead.seo_score !== null);

      console.log('\n   📝 Database Record:');
      console.log(`   Company: ${lead.company_name}`);
      console.log(`   Grade: ${lead.website_grade}`);
      console.log(`   Design: ${lead.design_score}`);
      console.log(`   SEO: ${lead.seo_score}`);
      console.log(`   Analyzed: ${new Date(lead.analyzed_at).toLocaleString()}\n`);
    }
  }
} catch (err) {
  logTest('Database verification', false, err.message);
}

// Test 4: Batch Analysis Endpoint
console.log('4️⃣  Testing Batch Analysis Endpoint...\n');

try {
  const response = await fetch('http://localhost:3001/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prospect_ids: ['test-id-1', 'test-id-2'],
      tier: 'tier1',
      modules: ['design', 'seo']
    })
  });

  logTest('Batch endpoint responds', response.status !== 404);

  // Check if it's SSE or JSON
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('text/event-stream')) {
    logTest('Batch endpoint returns SSE stream', true);
  } else {
    const result = await response.json();
    logTest('Batch endpoint returns JSON', true);
  }
} catch (err) {
  logTest('Batch analysis endpoint', false, err.message);
}

// Summary
console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║                      TEST SUMMARY                              ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');
console.log(`   ✅ Passed: ${passedTests}`);
console.log(`   ❌ Failed: ${failedTests}`);
console.log(`   📊 Total:  ${passedTests + failedTests}`);
console.log(`   📈 Success Rate: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%\n`);

if (failedTests === 0) {
  console.log('   🎉 ALL TESTS PASSED! Analysis Engine is working correctly.\n');
  process.exit(0);
} else {
  console.log('   ⚠️  Some tests failed. Please review the output above.\n');
  process.exit(1);
}
