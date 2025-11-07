#!/usr/bin/env node

/**
 * E2E Test with Simulated Data
 *
 * Tests the full pipeline using:
 * - Simulated AI calls (no API keys needed)
 * - Mock dental company data (no database needed)
 * - In-memory result storage
 *
 * This allows testing the system logic without external dependencies
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// Ensure simulation mode is enabled
process.env.SIMULATE_AI_CALLS = 'true';

// API endpoints
const ANALYSIS_API = 'http://localhost:3001';
const REPORT_API = 'http://localhost:3003';
const OUTREACH_API = 'http://localhost:3002';

// Mock dental companies for testing (using real URLs so scraper doesn't fail)
const MOCK_DENTAL_COMPANIES = [
  { id: '1', company_name: 'Example Dental Group', website: 'https://example.com', industry: 'dental' },
  { id: '2', company_name: 'Test Dental Care', website: 'https://example.org', industry: 'dental' },
  { id: '3', company_name: 'Demo Orthodontics', website: 'https://example.net', industry: 'dental' },
  { id: '4', company_name: 'Sample Dental Clinic', website: 'https://example.edu', industry: 'dental' },
  { id: '5', company_name: 'Mock Teeth Center', website: 'https://example.info', industry: 'dental' },
  { id: '6', company_name: 'Placeholder Dental', website: 'https://httpbin.org', industry: 'dental' },
  { id: '7', company_name: 'Test Elite Dental', website: 'https://jsonplaceholder.typicode.com', industry: 'dental' },
  { id: '8', company_name: 'Demo Care Dentistry', website: 'https://httpstat.us', industry: 'dental' },
  { id: '9', company_name: 'Sample Associates', website: 'https://postman-echo.com', industry: 'dental' },
  { id: '10', company_name: 'Mock Dentistry', website: 'https://reqres.in', industry: 'dental' }
];

async function checkServiceHealth(serviceName, url) {
  try {
    const response = await axios.get(`${url}/health`, { timeout: 5000 });
    console.log(`✅ ${serviceName}: ${response.data.status}`);
    return true;
  } catch (error) {
    console.log(`❌ ${serviceName}: Not responding (${error.message})`);
    return false;
  }
}

async function analyzeCompany(prospect) {
  console.log(`\n📊 Analyzing: ${prospect.company_name}...`);

  try {
    const response = await axios.post(`${ANALYSIS_API}/api/analyze-url`, {
      url: prospect.website,
      company_name: prospect.company_name,
      industry: prospect.industry,
      project_id: 'mock-dental-project-id-e2e-test'
    }, {
      timeout: 60000 // 1 minute timeout (simulated calls are fast)
    });

    if (response.data && response.data.lead) {
      const lead = response.data.lead;
      console.log(`   ✅ Analysis complete`);
      console.log(`      Grade: ${lead.website_grade || 'N/A'}`);
      console.log(`      Design Score: ${lead.design_score || 'N/A'}`);
      console.log(`      SEO Score: ${lead.seo_score || 'N/A'}`);
      return lead;
    } else {
      console.log(`   ⚠️  Analysis returned no lead data`);
      return null;
    }
  } catch (error) {
    console.log(`   ❌ Analysis failed: ${error.message}`);
    if (error.response?.data) {
      console.log(`      Error details:`, error.response.data);
    }
    return null;
  }
}

async function generateReport(lead) {
  console.log(`📄 Generating report: ${lead.company_name}...`);

  try {
    const response = await axios.post(`${REPORT_API}/api/generate-report`, {
      lead_id: lead.id
    }, {
      timeout: 60000 // 1 minute timeout
    });

    if (response.data && response.data.report) {
      console.log(`   ✅ Report generated - ID: ${response.data.report.id}`);
      return response.data.report;
    } else {
      console.log(`   ⚠️  Report generation returned no data`);
      return null;
    }
  } catch (error) {
    console.log(`   ❌ Report generation failed: ${error.message}`);
    return null;
  }
}

async function composeOutreach(lead) {
  console.log(`✉️  Composing outreach: ${lead.company_name}...`);

  try {
    const response = await axios.post(`${OUTREACH_API}/api/compose-outreach`, {
      lead_id: lead.id,
      email_strategies: ['free-value-delivery', 'portfolio-building'],
      social_strategies: ['facebook', 'linkedin']
    }, {
      timeout: 60000 // 1 minute timeout
    });

    if (response.data && response.data.outreach) {
      console.log(`   ✅ Outreach composed - ID: ${response.data.outreach.id}`);
      return response.data.outreach;
    } else {
      console.log(`   ⚠️  Outreach composition returned no data`);
      return null;
    }
  } catch (error) {
    console.log(`   ❌ Outreach composition failed: ${error.message}`);
    return null;
  }
}

async function runE2ETest() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  E2E TEST: SIMULATED MODE (10 DENTAL COMPANIES)              ║');
  console.log('║  Using: AI Simulation + Mock Data + In-Memory Storage       ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  // Verify simulation mode
  if (process.env.SIMULATE_AI_CALLS !== 'true') {
    console.error('❌ SIMULATE_AI_CALLS not enabled in .env');
    process.exit(1);
  }
  console.log('🎭 AI Simulation Mode: ENABLED\n');

  const startTime = Date.now();

  // Step 1: Check service health
  console.log('=== CHECKING SERVICES ===\n');
  const analysisHealthy = await checkServiceHealth('Analysis Engine', ANALYSIS_API);
  const reportHealthy = await checkServiceHealth('Report Engine', REPORT_API);
  const outreachHealthy = await checkServiceHealth('Outreach Engine', OUTREACH_API);

  if (!analysisHealthy || !reportHealthy || !outreachHealthy) {
    console.log('\n⚠️  Some services are not running. Start them with:');
    console.log('   cd analysis-engine && npm start &');
    console.log('   cd report-engine && npm start &');
    console.log('   cd outreach-engine && npm start &');
    process.exit(1);
  }

  const results = {
    total: MOCK_DENTAL_COMPANIES.length,
    analyzed: 0,
    reports_generated: 0,
    outreach_composed: 0,
    failed: 0,
    details: []
  };

  // Step 2: Process each company
  console.log('\n\n=== PROCESSING COMPANIES ===\n');

  for (let i = 0; i < MOCK_DENTAL_COMPANIES.length; i++) {
    const prospect = MOCK_DENTAL_COMPANIES[i];
    console.log(`\n[${ i + 1 }/${MOCK_DENTAL_COMPANIES.length}] ========================================`);
    console.log(`Company: ${prospect.company_name}`);
    console.log(`Website: ${prospect.website}`);

    const companyResult = {
      company_name: prospect.company_name,
      website: prospect.website,
      analysis_success: false,
      report_success: false,
      outreach_success: false,
      lead_id: null,
      report_id: null,
      outreach_id: null,
      errors: []
    };

    // Analyze
    const lead = await analyzeCompany(prospect);
    if (lead) {
      results.analyzed++;
      companyResult.analysis_success = true;
      companyResult.lead_id = lead.id;

      // Generate Report
      const report = await generateReport(lead);
      if (report) {
        results.reports_generated++;
        companyResult.report_success = true;
        companyResult.report_id = report.id;
      }

      // Compose Outreach
      const outreach = await composeOutreach(lead);
      if (outreach) {
        results.outreach_composed++;
        companyResult.outreach_success = true;
        companyResult.outreach_id = outreach.id;
      }
    } else {
      results.failed++;
      companyResult.errors.push('Analysis failed');
    }

    results.details.push(companyResult);
  }

  const endTime = Date.now();
  const durationSec = Math.round((endTime - startTime) / 1000);

  // Print summary
  console.log('\n\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                    TEST SUMMARY                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  console.log(`Total Companies:      ${results.total}`);
  console.log(`✅ Analyzed:          ${results.analyzed}/${results.total} (${Math.round(results.analyzed/results.total*100)}%)`);
  console.log(`✅ Reports Generated: ${results.reports_generated}/${results.total} (${Math.round(results.reports_generated/results.total*100)}%)`);
  console.log(`✅ Outreach Composed: ${results.outreach_composed}/${results.total} (${Math.round(results.outreach_composed/results.total*100)}%)`);
  console.log(`❌ Failed:            ${results.failed}/${results.total} (${Math.round(results.failed/results.total*100)}%)`);
  console.log(`⏱️  Duration:          ${durationSec} seconds\n`);

  console.log('DETAILED RESULTS:');
  console.log('─────────────────────────────────────────────────────────────────');
  results.details.forEach((r, i) => {
    const status = r.analysis_success && r.report_success && r.outreach_success ? '✅ PASS' :
                   r.analysis_success ? '⚠️  PARTIAL' : '❌ FAIL';
    console.log(`${status} ${i+1}. ${r.company_name}`);
    console.log(`     Analysis: ${r.analysis_success ? '✅' : '❌'} | Report: ${r.report_success ? '✅' : '❌'} | Outreach: ${r.outreach_success ? '✅' : '❌'}`);
    if (r.errors.length > 0) {
      console.log(`     Errors: ${r.errors.join(', ')}`);
    }
  });

  // Save full results to file
  const resultsFile = `/home/user/MaxantAgency/e2e-test-results-simulated-${Date.now()}.json`;
  const fs = await import('fs');
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
  console.log(`\n📝 Full results saved to: ${resultsFile}`);

  // Final verdict
  const successRate = results.outreach_composed / results.total;
  console.log('\n═══════════════════════════════════════════════════════════════');
  if (successRate >= 0.9) {
    console.log('🎉 SUCCESS: E2E pipeline working excellently!');
  } else if (successRate >= 0.7) {
    console.log('✅ PASS: E2E pipeline working with minor issues');
  } else if (successRate >= 0.5) {
    console.log('⚠️  PARTIAL: E2E pipeline has significant issues');
  } else {
    console.log('❌ FAIL: E2E pipeline has critical failures');
  }
  console.log('═══════════════════════════════════════════════════════════════\n');

  return results;
}

// Run the test
runE2ETest()
  .then((results) => {
    const exitCode = results.outreach_composed >= results.total * 0.5 ? 0 : 1;
    process.exit(exitCode);
  })
  .catch(error => {
    console.error('\n❌ E2E Test crashed:', error);
    console.error(error.stack);
    process.exit(1);
  });
