import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './analysis-engine/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

console.log('🧪 Testing 10 REAL PROSPECTS via Analysis Engine API\n');

// 1. Get 10 prospect IDs
console.log('📊 Fetching 10 prospect IDs...');
const { data: prospects, error } = await supabase
  .from('prospects')
  .select('id, company_name, website')
  .limit(10);

if (error) {
  console.log('❌ Error:', error.message);
  process.exit(1);
}

console.log(`✅ Found ${prospects.length} prospects\n`);
prospects.forEach((p, i) => {
  console.log(`  ${i+1}. ${p.company_name} - ${p.website}`);
});

const prospectIds = prospects.map(p => p.id);

console.log('\n📤 Calling Analysis Engine API...');
console.log('POST http://localhost:3001/api/analyze');
console.log('Body:', JSON.stringify({ prospect_ids: prospectIds }, null, 2));
console.log('\nThis will take ~20 minutes for 10 prospects...\n');

// 2. Call API
const response = await fetch('http://localhost:3001/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prospect_ids: prospectIds })
});

const result = await response.json();

console.log('\n✅ API Response:');
console.log(JSON.stringify(result, null, 2));

// 3. Verify in database
console.log('\n🔍 Verifying database saves...');
const { data: leads } = await supabase
  .from('leads')
  .select('company_name, website_grade, overall_score, screenshot_desktop_url, pages_discovered, pages_crawled, outreach_angle')
  .order('analyzed_at', { ascending: false })
  .limit(10);

console.log(`\n✅ Found ${leads?.length || 0} leads in database:`);
leads?.forEach((lead, i) => {
  console.log(`\n${i+1}. ${lead.company_name}`);
  console.log(`   Grade: ${lead.website_grade} (${lead.overall_score}/100)`);
  console.log(`   Screenshots: ${lead.screenshot_desktop_url ? 'YES' : 'NO'}`);
  console.log(`   Pages: ${lead.pages_discovered} discovered, ${lead.pages_crawled} crawled`);
  console.log(`   Outreach Angle: ${lead.outreach_angle ? 'YES' : 'NO'}`);
});

console.log('\n🎉 TEST COMPLETE!');
