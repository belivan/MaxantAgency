#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// API endpoints
const ANALYSIS_API = 'http://localhost:3001';
const REPORT_API = 'http://localhost:3003';
const OUTREACH_API = 'http://localhost:3002';

async function getDentalProspects() {
  console.log('🔍 Finding dental project prospects...\n');

  // First find the dental project
  const { data: projects, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .ilike('name', '%dental%');

  if (projectError) throw projectError;

  if (!projects || projects.length === 0) {
    throw new Error('No dental project found');
  }

  console.log(`✅ Found project: ${projects[0].name}\n`);
  const projectId = projects[0].id;

  // Get prospects from this project
  const { data: projectProspects, error: ppError } = await supabase
    .from('project_prospects')
    .select('prospect_id')
    .eq('project_id', projectId)
    .limit(15);

  if (ppError) throw ppError;

  if (!projectProspects || projectProspects.length === 0) {
    throw new Error('No prospects found for dental project');
  }

  const prospectIds = projectProspects.map(pp => pp.prospect_id);

  // Get full prospect details
  const { data: prospects, error: prospectError } = await supabase
    .from('prospects')
    .select('*')
    .in('id', prospectIds)
    .limit(10);

  if (prospectError) throw prospectError;

  console.log(`✅ Found ${prospects.length} prospects for testing\n`);
  prospects.forEach((p, i) => {
    console.log(`   ${i+1}. ${p.company_name} - ${p.website}`);
  });
  console.log('');

  return prospects;
}

async function analyzeCompany(prospect) {
  console.log(`📊 Analyzing: ${prospect.company_name}...`);

  try {
    const response = await axios.post(`${ANALYSIS_API}/api/analyze-url`, {
      url: prospect.website,
      company_name: prospect.company_name,
      industry: prospect.industry || 'dental'
    }, {
      timeout: 180000 // 3 minute timeout
    });

    if (response.data && response.data.lead) {
      console.log(`   ✅ Analysis complete - Grade: ${response.data.lead.website_grade || 'N/A'}`);
      return response.data.lead;
    } else {
      console.log(`   ⚠️  Analysis returned no lead data`);
      return null;
    }
  } catch (error) {
    console.log(`   ❌ Analysis failed: ${error.message}`);
    return null;
  }
}

async function generateReport(lead) {
  console.log(`📄 Generating report: ${lead.company_name}...`);

  try {
    const response = await axios.post(`${REPORT_API}/api/generate-report`, {
      lead_id: lead.id
    }, {
      timeout: 120000 // 2 minute timeout
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
      timeout: 120000 // 2 minute timeout
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
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  END-TO-END TEST: DENTAL PROJECT (10 COMPANIES)       ║');
  console.log('║  Analysis → Report → Outreach                         ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  const startTime = Date.now();

  // Step 1: Get prospects
  const prospects = await getDentalProspects();

  const results = {
    total: prospects.length,
    analyzed: 0,
    reports_generated: 0,
    outreach_composed: 0,
    failed: 0,
    details: []
  };

  // Step 2: Process each prospect
  for (let i = 0; i < prospects.length; i++) {
    const prospect = prospects[i];
    console.log(`\n[${ i + 1 }/${prospects.length}] ========================================`);
    console.log(`Company: ${prospect.company_name}`);
    console.log(`Website: ${prospect.website}\n`);

    const companyResult = {
      company_name: prospect.company_name,
      website: prospect.website,
      analysis_success: false,
      report_success: false,
      outreach_success: false,
      lead_id: null,
      report_id: null,
      outreach_id: null
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
    }

    results.details.push(companyResult);
  }

  const endTime = Date.now();
  const durationMin = Math.round((endTime - startTime) / 1000 / 60);

  // Print summary
  console.log('\n\n╔════════════════════════════════════════════════════════╗');
  console.log('║                    TEST SUMMARY                        ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  console.log(`Total Companies:      ${results.total}`);
  console.log(`✅ Analyzed:          ${results.analyzed}/${results.total}`);
  console.log(`✅ Reports Generated: ${results.reports_generated}/${results.total}`);
  console.log(`✅ Outreach Composed: ${results.outreach_composed}/${results.total}`);
  console.log(`❌ Failed:            ${results.failed}/${results.total}`);
  console.log(`⏱️  Duration:          ${durationMin} minutes\n`);

  console.log('DETAILED RESULTS:');
  console.log('─────────────────────────────────────────────────────────');
  results.details.forEach((r, i) => {
    const status = r.analysis_success && r.report_success && r.outreach_success ? '✅' :
                   r.analysis_success ? '⚠️ ' : '❌';
    console.log(`${status} ${i+1}. ${r.company_name}`);
    console.log(`     Analysis: ${r.analysis_success ? '✅' : '❌'} | Report: ${r.report_success ? '✅' : '❌'} | Outreach: ${r.outreach_success ? '✅' : '❌'}`);
  });

  // Save full results to file
  const resultsFile = `/home/user/MaxantAgency/e2e-test-results-${Date.now()}.json`;
  const fs = await import('fs');
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
  console.log(`\n📝 Full results saved to: ${resultsFile}`);

  return results;
}

// Run the test
runE2ETest()
  .then(() => {
    console.log('\n✅ E2E Test completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ E2E Test failed:', error);
    process.exit(1);
  });
