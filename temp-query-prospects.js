import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const { data, error } = await supabase
  .from('prospects')
  .select('id, company_name, website, industry, city, state, website_status, project_id')
  .order('created_at', { ascending: false })
  .limit(20);

if (error) {
  console.error('Error:', error);
} else {
  console.log(`Found ${data.length} prospects:\n`);
  data.forEach((p, i) => {
    console.log(`${i+1}. ${p.company_name} - ${p.website || 'no website'}`);
    console.log(`   Industry: ${p.industry || 'unknown'} | Location: ${p.city}, ${p.state}`);
    console.log(`   Status: ${p.website_status} | Project ID: ${p.project_id || 'NONE'}`);
    console.log(`   ID: ${p.id}\n`);
  });
}
