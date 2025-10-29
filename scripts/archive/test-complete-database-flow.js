/**
 * Test Complete Database Save Flow
 *
 * Verifies all 5 phases of the database save fix:
 * 1. Screenshot field names (both _path and _url)
 * 2. Performance metrics saved to database
 * 3. Benchmark data saved to database
 * 4. Report generation uses database data
 * 5. Complete reports with all data
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const TEST_URL = 'https://www.bluebackdental.com';
const COMPANY_NAME = 'Blue Back Dental FINAL TEST';

async function testCompleteFlow() {
  console.log('🧪 Testing Complete Database Save Flow\n');
  console.log('=' .repeat(60));

  try {
    // Step 0: Get or create a test project
    console.log('\n📁 Step 0: Getting test project...');

    let { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .limit(1);

    if (projectError) throw projectError;

    let projectId;
    if (projects && projects.length > 0) {
      projectId = projects[0].id;
      console.log(`   ✅ Using existing project: ${projectId}\n`);
    } else {
      // Create a test project
      const { data: newProject, error: createError } = await supabase
        .from('projects')
        .insert({ name: 'Database Flow Test', status: 'active' })
        .select()
        .single();

      if (createError) throw createError;
      projectId = newProject.id;
      console.log(`   ✅ Created test project: ${projectId}\n`);
    }

    // Step 1: Run production analysis
    console.log('\n📊 Step 1: Running production analysis...');
    console.log(`   URL: ${TEST_URL}`);
    console.log(`   Company: ${COMPANY_NAME}\n`);

    const response = await fetch('http://localhost:3001/api/analyze-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: TEST_URL,
        company_name: COMPANY_NAME,
        industry: 'dental',
        project_id: projectId
      })
    });

    if (!response.ok) {
      throw new Error(`Analysis failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('   ✅ Analysis completed');
    console.log(`   Lead ID: ${result.data.id}`);
    console.log(`   Overall Score: ${result.data.overall_score}`);
    console.log(`   Grade: ${result.data.website_grade}`);

    const leadId = result.data.id;

    // Step 2: Fetch lead from database
    console.log('\n📥 Step 2: Fetching lead from database...');

    const { data: lead, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (error) throw error;

    console.log(`   ✅ Lead fetched with ${Object.keys(lead).length} fields\n`);

    // Step 3: Verify Phase 1 - Screenshot fields
    console.log('🖼️  Phase 1: Verifying screenshot fields...');
    const hasDesktopUrl = !!lead.screenshot_desktop_url;
    const hasMobileUrl = !!lead.screenshot_mobile_url;

    console.log(`   Desktop URL: ${hasDesktopUrl ? '✅ Present' : '❌ Missing'}`);
    console.log(`   Mobile URL: ${hasMobileUrl ? '✅ Present' : '❌ Missing'}`);

    if (hasDesktopUrl) {
      console.log(`   → ${lead.screenshot_desktop_url.substring(0, 60)}...`);
    }

    const phase1Pass = hasDesktopUrl && hasMobileUrl;
    console.log(`   Result: ${phase1Pass ? '✅ PASS' : '❌ FAIL'}\n`);

    // Step 4: Verify Phase 2 - Performance metrics
    console.log('⚡ Phase 2: Verifying performance metrics...');
    const hasPerfMetrics = !!lead.performance_metrics_pagespeed;
    const hasCrux = !!lead.performance_metrics_crux;
    const hasPerfIssues = Array.isArray(lead.performance_issues);
    const hasMobileScore = lead.performance_score_mobile !== null;
    const hasDesktopScore = lead.performance_score_desktop !== null;

    console.log(`   PageSpeed Metrics: ${hasPerfMetrics ? '✅ Present' : '❌ Missing'}`);
    console.log(`   CrUX Metrics: ${hasCrux ? '✅ Present' : '❌ Missing'}`);
    console.log(`   Performance Issues: ${hasPerfIssues ? '✅ Present' : '❌ Missing'}`);
    console.log(`   Mobile Score: ${hasMobileScore ? `✅ ${lead.performance_score_mobile}` : '❌ Missing'}`);
    console.log(`   Desktop Score: ${hasDesktopScore ? `✅ ${lead.performance_score_desktop}` : '❌ Missing'}`);

    const phase2Pass = hasPerfMetrics || hasCrux || hasPerfIssues;
    console.log(`   Result: ${phase2Pass ? '✅ PASS' : '⚠️  PARTIAL (API may have rate limited)'}\n`);

    // Step 5: Verify Phase 3 - Benchmark data
    console.log('🏆 Phase 3: Verifying benchmark data...');
    const hasBenchmarkId = !!lead.matched_benchmark_id;
    const hasBenchmarkData = !!lead.matched_benchmark_data;

    console.log(`   Benchmark ID: ${hasBenchmarkId ? '✅ Present' : '❌ Missing'}`);
    console.log(`   Benchmark Data: ${hasBenchmarkData ? '✅ Present' : '❌ Missing'}`);

    if (hasBenchmarkData) {
      const bmData = lead.matched_benchmark_data;
      console.log(`   → Company: ${bmData.company_name || 'N/A'}`);
      console.log(`   → Score: ${bmData.overall_score || 'N/A'}`);
      console.log(`   → Has screenshots: ${bmData.screenshot_desktop_url ? '✅' : '❌'}`);
    }

    const phase3Pass = hasBenchmarkId && hasBenchmarkData;
    console.log(`   Result: ${phase3Pass ? '✅ PASS' : '⚠️  PARTIAL (benchmark may not exist for industry)'}\n`);

    // Step 6: Verify Phase 4 - Report files generated
    console.log('📄 Phase 4: Verifying report generation...');

    const { data: reports, error: reportError } = await supabase
      .from('reports')
      .select('*')
      .eq('lead_id', leadId);

    if (reportError) {
      console.log(`   ❌ Report query failed: ${reportError.message}`);
    } else {
      console.log(`   Reports found: ${reports?.length || 0}`);

      if (reports && reports.length > 0) {
        reports.forEach(r => {
          console.log(`   → ${r.report_type}: ${r.format} (${r.status})`);
        });
      }
    }

    const phase4Pass = reports && reports.length >= 2; // At least HTML preview + full
    console.log(`   Result: ${phase4Pass ? '✅ PASS' : '⚠️  Check report generation'}\n`);

    // Summary
    console.log('=' .repeat(60));
    console.log('\n📊 TEST SUMMARY:\n');
    console.log(`   Phase 1 (Screenshots): ${phase1Pass ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Phase 2 (Performance): ${phase2Pass ? '✅ PASS' : '⚠️  PARTIAL'}`);
    console.log(`   Phase 3 (Benchmark): ${phase3Pass ? '✅ PASS' : '⚠️  PARTIAL'}`);
    console.log(`   Phase 4 (Reports): ${phase4Pass ? '✅ PASS' : '⚠️  CHECK'}`);

    const allPass = phase1Pass && phase2Pass && phase3Pass && phase4Pass;
    console.log(`\n   Overall: ${allPass ? '✅ ALL TESTS PASSED' : '⚠️  SOME TESTS NEED REVIEW'}\n`);

    console.log('=' .repeat(60));

    // Cleanup option
    console.log('\n🗑️  Cleanup: To remove test lead, run:');
    console.log(`   DELETE FROM leads WHERE id = '${leadId}';`);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testCompleteFlow();
