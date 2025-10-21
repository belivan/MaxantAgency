/**
 * GPT-5 E2E Test Verification
 * Checks if the most recent Overcast Coffee analysis has all AI scoring data
 */

import { supabase } from './database/supabase-client.js';

async function checkResults() {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('company_name', 'Overcast Coffee Company')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅  GPT-5 E2E TEST - LEAD VERIFICATION');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('📊 BASIC INFO:');
  console.log('  Company:', data.company_name);
  console.log('  URL:', data.url);
  console.log('  Grade:', data.website_grade, '(' + data.overall_score + '/100)');
  console.log('  Analyzed:', data.analyzed_at);
  console.log('');
  console.log('📊 MODULE SCORES:');
  console.log('  Design:', data.design_score || '❌ MISSING');
  console.log('  SEO:', data.seo_score || '❌ MISSING');
  console.log('  Content:', data.content_score || '❌ MISSING');
  console.log('  Social:', data.social_score || '❌ MISSING');
  console.log('');
  console.log('🎯 AI LEAD SCORING:');
  console.log('  Priority:', data.lead_priority !== null ? data.lead_priority + '/100' : '❌ MISSING');
  console.log('  Tier:', data.priority_tier || '❌ MISSING');
  console.log('  Budget:', data.budget_likelihood || '❌ MISSING');
  console.log('  Fit Score:', data.fit_score !== null ? data.fit_score + '/100' : '❌ MISSING');
  console.log('');
  console.log('📈 DIMENSION SCORES:');
  console.log('  Quality Gap:', data.quality_gap_score !== null ? data.quality_gap_score + '/25' : '❌ MISSING');
  console.log('  Budget:', data.budget_score !== null ? data.budget_score + '/25' : '❌ MISSING');
  console.log('  Urgency:', data.urgency_score !== null ? data.urgency_score + '/20' : '❌ MISSING');
  console.log('  Industry Fit:', data.industry_fit_score !== null ? data.industry_fit_score + '/15' : '❌ MISSING');
  console.log('  Company Size:', data.company_size_score !== null ? data.company_size_score + '/10' : '❌ MISSING');
  console.log('  Engagement:', data.engagement_score !== null ? data.engagement_score + '/5' : '❌ MISSING');
  console.log('');
  console.log('💼 BUSINESS INTELLIGENCE:');
  console.log('  Has Data:', data.business_intelligence !== null ? '✅ YES' : '❌ MISSING');
  if (data.business_intelligence) {
    const bi = data.business_intelligence;
    console.log('  Years in Business:', bi.years_in_business || 'N/A');
    console.log('  Employee Count:', bi.employee_count || 'N/A');
    console.log('  Decision Makers:', bi.decision_makers?.length || 0);
  }
  console.log('');
  console.log('🕸️  CRAWL METADATA:');
  console.log('  Has Data:', data.crawl_metadata !== null ? '✅ YES' : '❌ MISSING');
  if (data.crawl_metadata) {
    const cm = data.crawl_metadata;
    console.log('  Pages Crawled:', cm.pages_crawled || 'N/A');
    console.log('  Links Found:', cm.total_links || 'N/A');
    console.log('  Crawl Time:', cm.crawl_time_ms ? (cm.crawl_time_ms/1000).toFixed(1) + 's' : 'N/A');
  }
  console.log('');

  // Check if all critical fields are present
  const allPresent =
    data.lead_priority !== null &&
    data.priority_tier !== null &&
    data.budget_likelihood !== null &&
    data.fit_score !== null &&
    data.quality_gap_score !== null &&
    data.budget_score !== null &&
    data.urgency_score !== null &&
    data.industry_fit_score !== null &&
    data.company_size_score !== null &&
    data.engagement_score !== null &&
    data.business_intelligence !== null &&
    data.crawl_metadata !== null;

  if (allPresent) {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ ✅ ✅  ALL DATA SAVED - GPT-5 E2E TEST PASSED!  ✅ ✅ ✅');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('🎉 Lead Priority Reasoning:');
    console.log(data.lead_priority_reasoning || 'N/A');
    console.log('');
  } else {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('❌  SOME DATA MISSING - CHECK ANALYSIS ENGINE');
    console.log('═══════════════════════════════════════════════════════════');
  }

  process.exit(allPresent ? 0 : 1);
}

checkResults();
