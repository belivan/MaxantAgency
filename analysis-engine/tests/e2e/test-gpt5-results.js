import { supabase } from './database/supabase-client.js';

const { data, error } = await supabase
  .from('leads')
  .select('*')
  .ilike('company_name', '%lighthouse%')
  .order('analyzed_at', { ascending: false })
  .limit(1);

if (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}

if (data && data.length > 0) {
  const lead = data[0];
  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ E2E TEST WITH GPT-5 - LIGHTHOUSE ROASTERS');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('📊 BASIC INFO:');
  console.log('   Company:', lead.company_name);
  console.log('   Grade:', lead.website_grade, `(${lead.overall_score}/100)`);
  console.log('   URL:', lead.url);
  console.log('');

  console.log('🎯 AI LEAD SCORING (GPT-5):');
  const hasScoring = lead.lead_priority !== null;
  console.log('   Priority:', hasScoring ? `✅ ${lead.lead_priority}/100` : '❌ MISSING');
  console.log('   Tier:', lead.priority_tier ? `✅ ${lead.priority_tier.toUpperCase()}` : '❌ MISSING');
  console.log('   Budget:', lead.budget_likelihood ? `✅ ${lead.budget_likelihood.toUpperCase()}` : '❌ MISSING');
  console.log('   Fit Score:', lead.fit_score !== null ? `✅ ${lead.fit_score}` : '❌ MISSING');
  console.log('');

  console.log('📈 DIMENSION SCORES:');
  console.log('   Quality Gap:', lead.quality_gap_score !== null ? `✅ ${lead.quality_gap_score}/25` : '❌ MISSING');
  console.log('   Budget:', lead.budget_score !== null ? `✅ ${lead.budget_score}/25` : '❌ MISSING');
  console.log('   Urgency:', lead.urgency_score !== null ? `✅ ${lead.urgency_score}/20` : '❌ MISSING');
  console.log('   Industry Fit:', lead.industry_fit_score !== null ? `✅ ${lead.industry_fit_score}/15` : '❌ MISSING');
  console.log('   Company Size:', lead.company_size_score !== null ? `✅ ${lead.company_size_score}/10` : '❌ MISSING');
  console.log('   Engagement:', lead.engagement_score !== null ? `✅ ${lead.engagement_score}/5` : '❌ MISSING');
  console.log('');

  console.log('🏢 BUSINESS INTELLIGENCE:');
  if (lead.business_intelligence) {
    console.log('   ✅ Present');
    console.log('     Years in Business:', lead.business_intelligence.years_in_business || 'N/A');
    console.log('     Budget Indicator:', lead.business_intelligence.budget_indicator || 'N/A');
    console.log('     Premium Features:', (lead.business_intelligence.premium_features?.length || 0), 'detected');
  } else {
    console.log('   ❌ MISSING');
  }
  console.log('');

  console.log('🌐 CRAWL METADATA:');
  if (lead.crawl_metadata) {
    console.log('   ✅ Present');
    console.log('     Pages Crawled:', lead.crawl_metadata.pages_crawled);
    console.log('     Links Found:', lead.crawl_metadata.links_found);
    console.log('     Crawl Time:', (lead.crawl_metadata.crawl_time/1000).toFixed(1) + 's');
  } else {
    console.log('   ❌ MISSING');
  }
  console.log('');

  console.log('💰 ANALYSIS METADATA:');
  console.log('   Cost: $' + lead.analysis_cost);
  console.log('   Time:', (lead.analysis_time/1000).toFixed(1) + 's');
  console.log('   Analyzed:', lead.analyzed_at);
  console.log('');

  console.log('═══════════════════════════════════════════════════════════');

  const allPresent = lead.lead_priority !== null && lead.priority_tier &&
    lead.budget_likelihood && lead.quality_gap_score !== null &&
    lead.budget_score !== null && lead.business_intelligence && lead.crawl_metadata;

  if (allPresent) {
    console.log('✅ ✅ ✅  ALL DATA SAVED - GPT-5 TEST PASSED!  ✅ ✅ ✅');
  } else {
    console.log('❌ SOME DATA MISSING - TEST FAILED');
    console.log('');
    console.log('Missing fields:');
    if (lead.lead_priority === null) console.log('  - lead_priority');
    if (!lead.priority_tier) console.log('  - priority_tier');
    if (!lead.budget_likelihood) console.log('  - budget_likelihood');
    if (lead.quality_gap_score === null) console.log('  - quality_gap_score');
    if (lead.budget_score === null) console.log('  - budget_score');
    if (!lead.business_intelligence) console.log('  - business_intelligence');
    if (!lead.crawl_metadata) console.log('  - crawl_metadata');
  }
  console.log('═══════════════════════════════════════════════════════════');
} else {
  console.log('❌ No lead found - analysis may still be running');
}

process.exit(0);
