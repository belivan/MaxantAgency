import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function getProspects() {
  const { data, error } = await supabase
    .from('prospects')
    .select('id, company_name, website, industry, city, state, google_rating, icp_match_score')
    .not('website', 'is', null)
    .order('created_at', { ascending: false })
    .limit(15);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\n📋 Available Prospects (Most Recent):\n');

  data.forEach((p, idx) => {
    console.log(`${idx + 1}. ${p.company_name}`);
    console.log(`   Website: ${p.website}`);
    console.log(`   Industry: ${p.industry || 'N/A'}`);
    console.log(`   Location: ${p.city || 'N/A'}, ${p.state || 'N/A'}`);
    console.log(`   ID: ${p.id}`);
    console.log('');
  });
}

getProspects();
