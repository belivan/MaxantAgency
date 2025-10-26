import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Check for Blue Back Dental
const { data, error } = await supabase
  .from('leads')
  .select('id, company_name, url, website_grade, overall_score, analyzed_at, industry')
  .ilike('company_name', '%blue back%')
  .order('analyzed_at', { ascending: false })
  .limit(1);

if (error) {
  console.error('Error:', error);
} else if (data.length === 0) {
  console.log('❌ Blue Back Dental not found in leads table');
} else {
  const lead = data[0];
  console.log('✅ Found Blue Back Dental!\n');
  console.log(`Company: ${lead.company_name}`);
  console.log(`Grade: ${lead.website_grade} (${Math.round(lead.overall_score)}/100)`);
  console.log(`URL: ${lead.url}`);
  console.log(`Industry: ${lead.industry}`);
  console.log(`Analyzed: ${new Date(lead.analyzed_at).toLocaleString()}`);
  console.log(`\nLead ID: ${lead.id}`);
}
