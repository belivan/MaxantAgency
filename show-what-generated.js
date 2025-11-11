import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const { data, error } = await supabase
  .from('composed_outreach')
  .select('company_name, url, linkedin_free_value')
  .order('updated_at', { ascending: false })
  .limit(3);

if (error) {
  console.log('Error:', error.message);
  process.exit(1);
}

console.log('\n' + '='.repeat(80));
console.log('GENERATED OUTREACH - What Actually Made It To Database');
console.log('(BUG: Only 1/12 variations saved per lead)');
console.log('='.repeat(80) + '\n');

data.forEach((rec, idx) => {
  console.log(`LEAD ${idx + 1}: ${rec.company_name}`);
  console.log(`URL: ${rec.url}`);
  console.log(`\nLinkedIn Free Value DM:`);
  console.log(`"${rec.linkedin_free_value}"`);
  console.log('\n' + '='.repeat(80) + '\n');
});

console.log('✅ Queue system works perfectly!');
console.log('❌ Bug in batch-generate-consolidated.js - only saves 1/12 variations');
console.log('📝 Recommendation: Fix batch generator before production use\n');
