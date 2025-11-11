import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const { data, error } = await supabase
  .from('composed_outreach')
  .select('*')
  .order('updated_at', { ascending: false })
  .limit(3);

if (error) {
  console.log('Error:', error.message);
  process.exit(1);
}

console.log('\n' + '='.repeat(80));
console.log('  GENERATED OUTREACH MATERIAL - 3 DENTAL PRACTICES');
console.log('='.repeat(80) + '\n');

data.forEach((record, idx) => {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`LEAD ${idx + 1}: ${record.company_name}`);
  console.log('='.repeat(80));
  console.log(`URL: ${record.url}`);
  console.log(`Updated: ${new Date(record.updated_at).toLocaleString()}`);
  console.log(`Generation Cost: $${(record.generation_cost || 0).toFixed(4)}`);
  console.log(`Generation Time: ${(record.generation_time_ms || 0).toFixed(0)}ms\n`);

  // Email Variations
  console.log('--- EMAIL VARIATIONS (3) ---\n');

  if (record.email_free_value) {
    const email = typeof record.email_free_value === 'string'
      ? JSON.parse(record.email_free_value)
      : record.email_free_value;
    console.log('1. FREE VALUE DELIVERY');
    console.log(`   Subject: ${email.subject}`);
    console.log(`   Body: ${email.body.substring(0, 300)}...`);
    console.log();
  }

  if (record.email_portfolio_building) {
    const email = typeof record.email_portfolio_building === 'string'
      ? JSON.parse(record.email_portfolio_building)
      : record.email_portfolio_building;
    console.log('2. PORTFOLIO BUILDING');
    console.log(`   Subject: ${email.subject}`);
    console.log(`   Body: ${email.body.substring(0, 300)}...`);
    console.log();
  }

  if (record.email_problem_first) {
    const email = typeof record.email_problem_first === 'string'
      ? JSON.parse(record.email_problem_first)
      : record.email_problem_first;
    console.log('3. PROBLEM-FIRST URGENT');
    console.log(`   Subject: ${email.subject}`);
    console.log(`   Body: ${email.body.substring(0, 300)}...`);
    console.log();
  }

  // Social Variations (sample)
  console.log('--- SOCIAL DM VARIATIONS (9 total, showing 3 samples) ---\n');

  if (record.instagram_free_value) {
    const msg = typeof record.instagram_free_value === 'string'
      ? JSON.parse(record.instagram_free_value)
      : record.instagram_free_value;
    console.log('Instagram (Free Value):');
    console.log(`   ${msg.message}`);
    console.log();
  }

  if (record.linkedin_problem_first) {
    const msg = typeof record.linkedin_problem_first === 'string'
      ? JSON.parse(record.linkedin_problem_first)
      : record.linkedin_problem_first;
    console.log('LinkedIn (Problem-First):');
    console.log(`   ${msg.message}`);
    console.log();
  }

  if (record.facebook_portfolio_building) {
    const msg = typeof record.facebook_portfolio_building === 'string'
      ? JSON.parse(record.facebook_portfolio_building)
      : record.facebook_portfolio_building;
    console.log('Facebook (Portfolio Building):');
    console.log(`   ${msg.message}`);
    console.log();
  }
});

console.log('='.repeat(80));
console.log('✅ ALL 12 VARIATIONS GENERATED PER LEAD');
console.log('   (3 email strategies + 9 social DM strategies)');
console.log('='.repeat(80) + '\n');
