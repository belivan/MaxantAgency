import dotenv from 'dotenv';
dotenv.config();

import { supabase } from './analysis-engine/database/supabase-client.js';

const { data, error } = await supabase
  .from('leads')
  .select('company_name, website_grade, overall_score, lead_priority, priority_tier, budget_likelihood, business_intelligence, crawl_metadata, analyzed_at')
  .order('analyzed_at', { ascending: false })
  .limit(3);

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

console.log('═══════════════════════════════════════════');
console.log('LAST 3 ANALYZED LEADS:');
console.log('═══════════════════════════════════════════\n');

data.forEach((lead, i) => {
  console.log(`${i+1}. ${lead.company_name} - Grade ${lead.website_grade} (${lead.overall_score})`);
  console.log(`   Analyzed: ${lead.analyzed_at}`);
  console.log(`   Lead Priority: ${lead.lead_priority !== null ? lead.lead_priority : 'NULL'}`);
  console.log(`   Priority Tier: ${lead.priority_tier || 'NULL'}`);
  console.log(`   Budget: ${lead.budget_likelihood || 'NULL'}`);
  console.log(`   Business Intel: ${lead.business_intelligence ? 'PRESENT' : 'NULL'}`);
  console.log(`   Crawl Metadata: ${lead.crawl_metadata ? 'PRESENT' : 'NULL'}`);
  console.log('');
});

console.log('═══════════════════════════════════════════');

process.exit(0);
