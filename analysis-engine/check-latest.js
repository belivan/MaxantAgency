import dotenv from 'dotenv';
dotenv.config();

import { supabase } from './database/supabase-client.js';

const { data } = await supabase
  .from('leads')
  .select('company_name, website_grade, overall_score, lead_priority, priority_tier, budget_likelihood, quality_gap_score, budget_score, business_intelligence, crawl_metadata, analyzed_at')
  .order('analyzed_at', { ascending: false })
  .limit(1);

if (data && data.length > 0) {
  const l = data[0];
  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ MOST RECENT LEAD - GPT-5 E2E TEST');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Company:', l.company_name);
  console.log('Grade:', l.website_grade, `(${l.overall_score})`);
  console.log('Analyzed:', l.analyzed_at);
  console.log('');
  console.log('AI Lead Scoring:');
  console.log('  Priority:', l.lead_priority !== null ? `✅ ${l.lead_priority}/100` : '❌ NULL');
  console.log('  Tier:', l.priority_tier ? `✅ ${l.priority_tier.toUpperCase()}` : '❌ NULL');
  console.log('  Budget:', l.budget_likelihood ? `✅ ${l.budget_likelihood.toUpperCase()}` : '❌ NULL');
  console.log('');
  console.log('Dimension Scores:');
  console.log('  Quality Gap:', l.quality_gap_score !== null ? `✅ ${l.quality_gap_score}/25` : '❌ NULL');
  console.log('  Budget:', l.budget_score !== null ? `✅ ${l.budget_score}/25` : '❌ NULL');
  console.log('');
  console.log('Business Intel:', l.business_intelligence ? '✅ PRESENT' : '❌ NULL');
  console.log('Crawl Metadata:', l.crawl_metadata ? '✅ PRESENT' : '❌ NULL');
  console.log('═══════════════════════════════════════════════════════════');

  const allPresent = l.lead_priority !== null && l.priority_tier && l.budget_likelihood &&
    l.quality_gap_score !== null && l.budget_score !== null &&
    l.business_intelligence && l.crawl_metadata;

  if (allPresent) {
    console.log('✅ ✅ ✅  ALL DATA SAVED - GPT-5 E2E TEST PASSED!  ✅ ✅ ✅');
  } else {
    console.log('❌ SOME DATA MISSING - TEST FAILED');
  }
  console.log('═══════════════════════════════════════════════════════════');
} else {
  console.log('No leads found');
}

process.exit(0);
