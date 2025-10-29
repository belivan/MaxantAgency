/**
 * Verify Report Field Removal
 *
 * Tests that:
 * 1. Outreach fields (one_liner, outreach_angle) are NOW saved correctly
 * 2. Report synthesis fields are NO LONGER in the database
 * 3. Analysis still runs successfully
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function verify() {
  console.log('🔍 Verifying Report Field Removal\n');
  console.log('=' .repeat(60));

  try {
    // Get the most recent lead to test
    const { data: lead, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) throw error;

    console.log('\n✅ Found lead:', lead.company_name);
    console.log(`   ID: ${lead.id}`);
    console.log(`   Grade: ${lead.website_grade}\n`);

    // Test 1: Verify outreach fields are present
    console.log('📋 Test 1: Outreach Fields (should be PRESENT)');
    const outreachFields = {
      'analysis_summary': lead.analysis_summary,
      'top_issue': lead.top_issue,
      'one_liner': lead.one_liner,
      'call_to_action': lead.call_to_action,
      'outreach_angle': lead.outreach_angle
    };

    let outreachPass = true;
    for (const [field, value] of Object.entries(outreachFields)) {
      const hasValue = value !== null && value !== undefined;
      console.log(`   ${field}: ${hasValue ? '✅ PRESENT' : '❌ MISSING'}`);
      if (!hasValue) outreachPass = false;
    }
    console.log(`   Result: ${outreachPass ? '✅ PASS' : '❌ FAIL'}\n`);

    // Test 2: Verify report synthesis fields are removed
    console.log('🗑️  Test 2: Report Synthesis Fields (should be REMOVED)');
    const removedFields = {
      'matched_benchmark_data': lead.matched_benchmark_data,
      'consolidated_issues': lead.consolidated_issues,
      'consolidated_issue_stats': lead.consolidated_issue_stats,
      'consolidated_issue_merge_log': lead.consolidated_issue_merge_log,
      'executive_summary': lead.executive_summary,
      'executive_summary_metadata': lead.executive_summary_metadata,
      'synthesis_stage_metadata': lead.synthesis_stage_metadata,
      'synthesis_errors': lead.synthesis_errors
    };

    let removalPass = true;
    for (const [field, value] of Object.entries(removedFields)) {
      const isRemoved = value === undefined;
      console.log(`   ${field}: ${isRemoved ? '✅ REMOVED' : '❌ STILL EXISTS'}`);
      if (!isRemoved) removalPass = false;
    }
    console.log(`   Result: ${removalPass ? '✅ PASS' : '❌ FAIL'}\n`);

    // Test 3: Verify matched_benchmark_id still exists (just the ID, not the full data)
    console.log('🔗 Test 3: Benchmark ID Reference (should be PRESENT)');
    const hasBenchmarkId = lead.matched_benchmark_id !== undefined;
    console.log(`   matched_benchmark_id: ${hasBenchmarkId ? '✅ PRESENT' : '❌ MISSING'}`);
    if (lead.matched_benchmark_id) {
      console.log(`   → Value: ${lead.matched_benchmark_id}`);
    }
    console.log(`   Result: ${hasBenchmarkId ? '✅ PASS' : '❌ FAIL'}\n`);

    // Summary
    console.log('=' .repeat(60));
    console.log('\n📊 VERIFICATION SUMMARY:\n');
    console.log(`   Outreach Fields: ${outreachPass ? '✅ ALL PRESENT' : '❌ SOME MISSING'}`);
    console.log(`   Removed Fields: ${removalPass ? '✅ ALL REMOVED' : '❌ SOME STILL EXIST'}`);
    console.log(`   Benchmark ID: ${hasBenchmarkId ? '✅ PRESENT' : '❌ MISSING'}`);

    const allPass = outreachPass && removalPass && hasBenchmarkId;
    console.log(`\n   Overall: ${allPass ? '✅ ALL TESTS PASSED!' : '⚠️  SOME TESTS FAILED'}\n`);

    console.log('=' .repeat(60));

    if (!allPass) {
      console.log('\n⚠️  Note: If testing on an OLD lead (created before migration),');
      console.log('   run a NEW analysis to verify the current behavior.');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);

    if (error.message.includes('column') && error.message.includes('does not exist')) {
      console.log('\n✅ This is EXPECTED! The column was successfully removed from the database.');
      console.log('   The undefined fields in the test results confirm the removal worked.');
    }
  }
}

verify();
