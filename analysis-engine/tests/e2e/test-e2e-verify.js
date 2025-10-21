import dotenv from 'dotenv';
dotenv.config();

import { supabase } from './analysis-engine/database/supabase-client.js';

const { data, error } = await supabase
  .from('leads')
  .select('*')
  .ilike('company_name', '%milstead%')
  .order('analyzed_at', { ascending: false })
  .limit(1);

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

if (data && data.length > 0) {
  const lead = data[0];
  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ E2E TEST RESULTS - MILSTEAD & CO.');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('📊 BASIC INFO:');
  console.log('   Company:', lead.company_name);
  console.log('   Grade:', lead.website_grade, `(${lead.overall_score}/100)`);
  console.log('');
  console.log('🎯 AI LEAD SCORING:');
  console.log('   Priority:', lead.lead_priority ? `✓ ${lead.lead_priority}/100` : '✗ MISSING');
  console.log('   Tier:', lead.priority_tier ? `✓ ${lead.priority_tier.toUpperCase()}` : '✗ MISSING');
  console.log('   Budget:', lead.budget_likelihood ? `✓ ${lead.budget_likelihood.toUpperCase()}` : '✗ MISSING');
  console.log('');
  console.log('📈 DIMENSION SCORES:');
  console.log('   Quality Gap:', lead.quality_gap_score !== null ? `✓ ${lead.quality_gap_score}/25` : '✗');
  console.log('   Budget:', lead.budget_score !== null ? `✓ ${lead.budget_score}/25` : '✗');
  console.log('   Urgency:', lead.urgency_score !== null ? `✓ ${lead.urgency_score}/20` : '✗');
  console.log('   Industry Fit:', lead.industry_fit_score !== null ? `✓ ${lead.industry_fit_score}/15` : '✗');
  console.log('   Company Size:', lead.company_size_score !== null ? `✓ ${lead.company_size_score}/10` : '✗');
  console.log('   Engagement:', lead.engagement_score !== null ? `✓ ${lead.engagement_score}/5` : '✗');
  console.log('');
  console.log('🏢 BUSINESS INTELLIGENCE:');
  if (lead.business_intelligence) {
    console.log('   ✓ Present');
    console.log('     Years:', lead.business_intelligence.years_in_business || 'N/A');
    console.log('     Budget:', lead.business_intelligence.budget_indicator || 'N/A');
    console.log('     Premium:', (lead.business_intelligence.premium_features?.length || 0), 'features');
  } else {
    console.log('   ✗ NOT SAVED');
  }
  console.log('');
  console.log('🌐 CRAWL METADATA:');
  if (lead.crawl_metadata) {
    console.log('   ✓ Present');
    console.log('     Pages:', lead.crawl_metadata.pages_crawled);
    console.log('     Time:', (lead.crawl_metadata.crawl_time/1000).toFixed(1) + 's');
  } else {
    console.log('   ✗ NOT SAVED');
  }
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');

  const allPresent = lead.lead_priority && lead.priority_tier && lead.budget_likelihood &&
    lead.quality_gap_score !== null && lead.business_intelligence && lead.crawl_metadata;

  if (allPresent) {
    console.log('✅ ✅ ✅  ALL DATA PRESENT - TEST PASSED!  ✅ ✅ ✅');
  } else {
    console.log('❌ SOME DATA MISSING - TEST FAILED');
  }
  console.log('═══════════════════════════════════════════════════════════');
} else {
  console.log('❌ No lead found');
}

process.exit(0);
