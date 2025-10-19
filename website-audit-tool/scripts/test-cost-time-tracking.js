import { analyzeWebsites } from '../analyzer.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

console.log('🧪 COST & TIME TRACKING TEST\n');
console.log('='.repeat(70));

const TEST_URL = 'https://maksant.com';

console.log(`\n📋 Test Plan:`);
console.log(`   - Analyze 1 website: ${TEST_URL}`);
console.log(`   - Depth: Tier 1 (quick analysis)`);
console.log(`   - Modules: Basic + Industry`);
console.log(`   - Supabase: ENABLED`);
console.log(`\n⏱️  Estimated time: ~1 minute`);
console.log('='.repeat(70));

const startTime = Date.now();

// Progress callback
function sendProgress(data) {
  if (data.type === 'step') {
    console.log(`   📊 ${data.message}`);
  } else if (data.type === 'site_complete') {
    console.log(`\n✅ Analysis complete!`);
  } else if (data.type === 'error') {
    console.log(`\n❌ Error: ${data.message}`);
  }
}

// Options for analysis
const options = {
  emailType: 'local',
  depthTier: 'tier1',
  textModel: 'gpt-5-mini',
  visionModel: 'gpt-4o',
  modules: {
    basic: true,
    industry: true,
    visual: false,
    seo: false,
    competitor: false
  },
  saveToDrafts: false,
  saveToSupabase: true
};

console.log('\n🚀 Starting analysis...\n');

try {
  // Run analysis
  const results = await analyzeWebsites([TEST_URL], options, sendProgress);

  const totalTime = Math.floor((Date.now() - startTime) / 1000);

  console.log('\n' + '='.repeat(70));
  console.log('✅ ANALYSIS COMPLETE!');
  console.log('='.repeat(70));
  console.log(`   Total time: ${totalTime}s`);

  // Check result object
  const result = results[0];

  console.log('\n📊 COST & TIME TRACKING VERIFICATION:\n');

  // 1. Check if cost is present
  if (result.cost !== undefined && result.cost !== null) {
    console.log(`   ✅ Cost tracked: $${result.cost.toFixed(4)}`);
  } else {
    console.log(`   ❌ Cost NOT tracked (result.cost is ${result.cost})`);
  }

  // 2. Check if analysisTime is present
  if (result.analysisTime) {
    const minutes = Math.floor(result.analysisTime / 60);
    const seconds = result.analysisTime % 60;
    console.log(`   ✅ Analysis time tracked: ${minutes}m ${seconds}s (${result.analysisTime}s)`);
  } else {
    console.log(`   ❌ Analysis time NOT tracked (result.analysisTime is ${result.analysisTime})`);
  }

  // 3. Check if costBreakdown is present
  if (result.costBreakdown && Object.keys(result.costBreakdown).length > 0) {
    console.log(`   ✅ Cost breakdown tracked (${Object.keys(result.costBreakdown).length} operations):`);
    Object.entries(result.costBreakdown).forEach(([op, cost]) => {
      console.log(`      - ${op}: $${cost.toFixed(4)}`);
    });
  } else {
    console.log(`   ❌ Cost breakdown NOT tracked`);
  }

  // Wait for Supabase save to complete
  console.log(`\n⏳ Waiting 3 seconds for Supabase save to complete...`);
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('\n' + '='.repeat(70));
  console.log('📊 QUERYING SUPABASE FOR COST & TIME DATA...');
  console.log('='.repeat(70));

  // Query Supabase for the lead
  const { data: lead, error } = await supabase
    .from('leads')
    .select('url, company_name, analysis_cost, analysis_time, cost_breakdown')
    .ilike('url', '%maksant.com%')
    .order('analyzed_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('❌ Supabase query failed:', error.message);
    throw error;
  }

  console.log(`\n✅ Found lead in database: ${lead.company_name}\n`);

  // Verify Supabase data
  console.log('📊 SUPABASE VERIFICATION:\n');

  if (lead.analysis_cost !== undefined && lead.analysis_cost !== null) {
    console.log(`   ✅ Cost saved to Supabase: $${parseFloat(lead.analysis_cost).toFixed(4)}`);
  } else {
    console.log(`   ❌ Cost NOT saved to Supabase (analysis_cost is ${lead.analysis_cost})`);
  }

  if (lead.analysis_time) {
    const minutes = Math.floor(lead.analysis_time / 60);
    const seconds = lead.analysis_time % 60;
    console.log(`   ✅ Analysis time saved to Supabase: ${minutes}m ${seconds}s (${lead.analysis_time}s)`);
  } else {
    console.log(`   ❌ Analysis time NOT saved to Supabase (analysis_time is ${lead.analysis_time})`);
  }

  if (lead.cost_breakdown && Object.keys(lead.cost_breakdown).length > 0) {
    console.log(`   ✅ Cost breakdown saved to Supabase (${Object.keys(lead.cost_breakdown).length} operations):`);
    Object.entries(lead.cost_breakdown).forEach(([op, cost]) => {
      console.log(`      - ${op}: $${parseFloat(cost).toFixed(4)}`);
    });
  } else {
    console.log(`   ❌ Cost breakdown NOT saved to Supabase`);
  }

  // Final verdict
  console.log('\n' + '='.repeat(70));

  const allPassed =
    result.cost &&
    result.analysisTime &&
    result.costBreakdown &&
    lead.analysis_cost !== null &&
    lead.analysis_time !== null &&
    lead.cost_breakdown;

  if (allPassed) {
    console.log('🎉 ALL TESTS PASSED! COST & TIME TRACKING WORKING!');
  } else {
    console.log('⚠️  SOME TESTS FAILED - Check output above');
  }

  console.log('='.repeat(70));

  console.log(`\n📍 NEXT STEPS:`);
  console.log(`   1. If cost/time columns missing: Run docs/supabase-migration-cost-time.sql`);
  console.log(`   2. View in Supabase: https://app.supabase.com/project/njejsagzeebvvupzffpd/editor`);
  console.log(`   3. Query: SELECT url, analysis_cost, analysis_time FROM leads;`);

} catch (error) {
  console.error('\n❌ TEST FAILED:', error.message);
  console.error(error.stack);
  process.exit(1);
}
