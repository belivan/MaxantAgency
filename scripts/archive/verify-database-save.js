/**
 * Verify Database Save - Check All Fields
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function verify() {
  console.log('🔍 Verifying database save for: Blue Back Dental FINAL TEST\n');

  try {
    // Fetch the lead
    const { data: lead, error } = await supabase
      .from('leads')
      .select('*')
      .eq('company_name', 'Blue Back Dental FINAL TEST')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) throw error;

    console.log('✅ Lead found:', lead.id);
    console.log(`   Company: ${lead.company_name}`);
    console.log(`   Grade: ${lead.website_grade}`);
    console.log(`   Score: ${lead.overall_score}\n`);

    // Check Phase 1: Screenshot fields
    console.log('📸 Phase 1: Screenshot Fields');
    console.log(`   Desktop URL: ${lead.screenshot_desktop_url ? '✅ SAVED' : '❌ MISSING'}`);
    console.log(`   Mobile URL: ${lead.screenshot_mobile_url ? '✅ SAVED' : '❌ MISSING'}`);
    if (lead.screenshot_desktop_url) {
      console.log(`   → ${lead.screenshot_desktop_url.substring(0, 60)}...`);
    }
    console.log();

    // Check Phase 2: Performance metrics
    console.log('⚡ Phase 2: Performance Metrics');
    console.log(`   PageSpeed Metrics: ${lead.performance_metrics_pagespeed ? '✅ SAVED' : '❌ MISSING'}`);
    console.log(`   CrUX Metrics: ${lead.performance_metrics_crux ? '✅ SAVED' : '❌ MISSING'}`);
    console.log(`   Performance Issues: ${lead.performance_issues ? '✅ SAVED' : '❌ MISSING'}`);
    console.log(`   Mobile Score: ${lead.performance_score_mobile !== null ? `✅ ${lead.performance_score_mobile}` : '❌ MISSING'}`);
    console.log(`   Desktop Score: ${lead.performance_score_desktop !== null ? `✅ ${lead.performance_score_desktop}` : '❌ MISSING'}`);
    console.log(`   API Errors: ${lead.performance_api_errors ? `✅ ${lead.performance_api_errors.length} errors` : '❌ MISSING'}`);
    console.log();

    // Check Phase 3: Benchmark data
    console.log('🏆 Phase 3: Benchmark Data');
    console.log(`   Benchmark ID: ${lead.matched_benchmark_id ? '✅ SAVED' : '❌ MISSING'}`);
    console.log(`   Benchmark Data: ${lead.matched_benchmark_data ? '✅ SAVED' : '❌ MISSING'}`);
    if (lead.matched_benchmark_data) {
      const bm = lead.matched_benchmark_data;
      console.log(`   → Company: ${bm.company_name || 'N/A'}`);
      console.log(`   → Score: ${bm.overall_score || 'N/A'}`);
      console.log(`   → Grade: ${bm.website_grade || 'N/A'}`);
      console.log(`   → Desktop Screenshot: ${bm.screenshot_desktop_url ? '✅' : '❌'}`);
      console.log(`   → Mobile Screenshot: ${bm.screenshot_mobile_url ? '✅' : '❌'}`);
    }
    console.log();

    // Summary
    console.log('=' .repeat(60));
    console.log('\n📊 VERIFICATION SUMMARY:\n');

    const phase1 = lead.screenshot_desktop_url && lead.screenshot_mobile_url;
    const phase2 = lead.performance_metrics_pagespeed || lead.performance_metrics_crux || lead.performance_issues;
    const phase3 = lead.matched_benchmark_id && lead.matched_benchmark_data;

    console.log(`   Phase 1 (Screenshots): ${phase1 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Phase 2 (Performance): ${phase2 ? '✅ PASS' : '⚠️  PARTIAL (APIs may have failed)'}`);
    console.log(`   Phase 3 (Benchmark): ${phase3 ? '✅ PASS' : '❌ FAIL'}`);

    const allPass = phase1 && phase2 && phase3;
    console.log(`\n   Overall: ${allPass ? '✅ ALL DATA SAVED SUCCESSFULLY!' : '⚠️  SOME DATA MISSING'}\n`);

    console.log('=' .repeat(60));

    // Field count
    const fieldCount = Object.keys(lead).length;
    console.log(`\n📈 Total Fields in Database: ${fieldCount}`);
    console.log('   (Original issue: Only 33 fields were being saved)');
    console.log('   (Target: 82+ fields with all analysis data)\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

verify();
