/**
 * Check Social Media Data in Leads Table
 * Shows actual social profiles scraped and saved
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('SOCIAL MEDIA DATA IN LEADS TABLE');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Query leads with social profiles
  const { data: leads, error } = await supabase
    .from('leads')
    .select('company_name, url, social_profiles, achievements, brand_voice, testimonials')
    .not('social_profiles', 'is', null)
    .order('analyzed_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`Found ${leads.length} leads with social media data:\n`);

  leads.forEach((lead, index) => {
    console.log(`${index + 1}. ${lead.company_name || 'Unknown'}`);
    console.log(`   URL: ${lead.url}`);
    console.log(`   Brand Voice: ${lead.brand_voice || 'Not detected'}`);
    console.log(`   \n   Social Profiles:`);
    console.log(JSON.stringify(lead.social_profiles, null, 4));

    if (lead.achievements) {
      console.log(`\n   Achievements:`);
      console.log(JSON.stringify(lead.achievements, null, 4));
    }

    if (lead.testimonials && lead.testimonials.length > 0) {
      console.log(`\n   Testimonials: ${lead.testimonials.length} found`);
    }

    console.log('\n' + '─'.repeat(70) + '\n');
  });
}

main();
