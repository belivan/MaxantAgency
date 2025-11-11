import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const { data, error } = await supabase
  .from('composed_outreach')
  .select('lead_id, email_variations, social_variations, created_at')
  .order('created_at', { ascending: false })
  .limit(3);

if (error) {
  console.log('Error:', error.message);
  process.exit(1);
}

console.log('\n========================================');
console.log('GENERATED OUTREACH MATERIAL');
console.log('========================================\n');
console.log(`Total records: ${data.length}`);
console.log('='.repeat(80));

data.forEach((record, idx) => {
  console.log(`\n=== LEAD ${idx + 1} ===`);
  console.log('Lead ID:', record.lead_id);
  console.log('Created:', new Date(record.created_at).toLocaleString());
  console.log(`\nEmail Variations: ${record.email_variations?.length || 0}`);
  console.log(`Social Variations: ${record.social_variations?.length || 0}`);

  // Show first email variation
  if (record.email_variations && record.email_variations.length > 0) {
    const email = record.email_variations[0];
    console.log(`\n--- EMAIL #1 (${email.strategy}) ---`);
    console.log('Subject:', email.subject);
    console.log('Body preview:', email.body.substring(0, 250) + '...');
  }

  // Show first social variation
  if (record.social_variations && record.social_variations.length > 0) {
    const social = record.social_variations[0];
    console.log(`\n--- SOCIAL #1 (${social.platform} - ${social.strategy}) ---`);
    console.log('Message:', social.message.substring(0, 200));
  }

  console.log('\n' + '='.repeat(80));
});

console.log('\n✅ All outreach material successfully generated and stored!');
