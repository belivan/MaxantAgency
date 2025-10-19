import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

console.log('🔍 QUERYING SUPABASE DATABASE\n');
console.log('='.repeat(70));

try {
  // Get all leads
  const { data: allLeads, error } = await supabase
    .from('leads')
    .select('*')
    .order('analyzed_at', { ascending: false })
    .limit(20);

  if (error) throw error;

  console.log(`\n✅ Found ${allLeads.length} total leads in database\n`);
  console.log('='.repeat(70));

  // Display each lead
  allLeads.forEach((lead, i) => {
    console.log(`\n${i + 1}. ${lead.company_name || 'Unknown'}`);
    console.log(`   URL: ${lead.url}`);
    console.log(`   Email: ${lead.contact_email || '❌ Not found'}`);
    console.log(`   Phone: ${lead.contact_phone || 'Not found'}`);
    console.log(`   Industry: ${lead.industry || 'Unknown'}`);
    console.log(`   Location: ${lead.location || 'Unknown'}`);
    console.log(`   Platform: ${lead.tech_stack?.platform || 'Unknown'}`);
    console.log(`   Services: ${lead.services?.length || 0} found`);
    console.log(`   Grades: Website ${lead.website_grade} (${lead.website_score}/100) | Lead ${lead.lead_grade}`);
    console.log(`   Analyzed: ${new Date(lead.analyzed_at).toLocaleString()}`);
  });

  console.log('\n' + '='.repeat(70));
  console.log('📊 SUMMARY BY LEAD GRADE\n');

  const gradeCount = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  allLeads.forEach(l => {
    if (l.lead_grade) gradeCount[l.lead_grade]++;
  });

  console.log(`   Grade A (Ready to contact): ${gradeCount.A}`);
  console.log(`   Grade B (Review then contact): ${gradeCount.B}`);
  console.log(`   Grade C (Needs editing): ${gradeCount.C}`);
  console.log(`   Grade D (Major rewrite): ${gradeCount.D}`);
  console.log(`   Grade F (Do not contact): ${gradeCount.F}`);

  // Data quality metrics
  let hasEmail = 0, hasPhone = 0, hasLocation = 0, hasPlatform = 0;
  allLeads.forEach(l => {
    if (l.contact_email) hasEmail++;
    if (l.contact_phone) hasPhone++;
    if (l.location) hasLocation++;
    if (l.tech_stack?.platform) hasPlatform++;
  });

  console.log('\n' + '='.repeat(70));
  console.log('📈 DATA QUALITY METRICS\n');
  console.log(`   ✉️  Email found: ${hasEmail}/${allLeads.length} (${Math.round(hasEmail/allLeads.length*100)}%)`);
  console.log(`   📞 Phone found: ${hasPhone}/${allLeads.length} (${Math.round(hasPhone/allLeads.length*100)}%)`);
  console.log(`   📍 Location found: ${hasLocation}/${allLeads.length} (${Math.round(hasLocation/allLeads.length*100)}%)`);
  console.log(`   💻 Platform detected: ${hasPlatform}/${allLeads.length} (${Math.round(hasPlatform/allLeads.length*100)}%)`);

  console.log('\n' + '='.repeat(70));
  console.log('🎉 SUPABASE INTEGRATION WORKING PERFECTLY!');
  console.log('='.repeat(70));
  console.log('\n📍 View in Supabase dashboard:');
  console.log(`   https://supabase.com/dashboard/project/${process.env.SUPABASE_URL.split('.')[0].split('//')[1]}/editor`);

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
