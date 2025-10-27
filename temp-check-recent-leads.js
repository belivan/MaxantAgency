import { supabase } from './analysis-engine/database/supabase-client.js';

async function checkRecentLeads() {
  const { data, error } = await supabase
    .from('leads')
    .select('id, company_name, website_grade, overall_score, tech_stack, url')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\n📊 Recent Leads:\n');
  data.forEach(l => {
    console.log(`  ${l.company_name}`);
    console.log(`    Grade: ${l.website_grade} (${l.overall_score}%)`);
    console.log(`    Tech Stack: ${l.tech_stack || 'Unknown'}`);
    console.log(`    URL: ${l.url}`);
    console.log(`    ID: ${l.id}\n`);
  });
}

checkRecentLeads();
