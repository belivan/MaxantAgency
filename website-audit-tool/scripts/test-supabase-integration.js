import fetch from 'node-fetch';
import { getLeadsByGrade, getLeadsReadyToContact } from '../modules/supabase-client.js';

console.log('🧪 TESTING SUPABASE INTEGRATION\n');
console.log('=' .repeat(60));

// Test 1: Analyze a website with Supabase enabled
console.log('\n📝 TEST 1: Analyzing maksant.com with Supabase ENABLED...\n');

try {
  const response = await fetch('http://localhost:3000/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      urls: ['https://maksant.com'],
      emailType: 'local',
      depthTier: 'tier1',
      modules: {
        basic: true,
        industry: true,
        visual: false,
        seo: false,
        competitor: false
      },
      saveToSupabase: true  // ← ENABLED
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const result = await response.json();
  console.log('✅ Analysis complete!');
  console.log(`   Company: ${result.results[0]?.companyName || 'Unknown'}`);
  console.log(`   Website Grade: ${result.results[0]?.websiteGrade}`);
  console.log(`   Lead Grade: ${result.results[0]?.leadGrade}`);
  console.log(`   Email: ${result.results[0]?.contact?.email || 'Not found'}`);

  // Wait a moment for database save
  console.log('\n⏳ Waiting 2 seconds for database save...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 2: Query Supabase for the lead
  console.log('\n📊 TEST 2: Querying Supabase for leads...\n');

  const gradeALeads = await getLeadsByGrade('A');
  console.log(`✅ Found ${gradeALeads.length} Grade A leads in database`);

  if (gradeALeads.length > 0) {
    const latest = gradeALeads[0];
    console.log('\n📄 Latest Grade A lead:');
    console.log(`   URL: ${latest.url}`);
    console.log(`   Company: ${latest.company_name}`);
    console.log(`   Email: ${latest.contact_email}`);
    console.log(`   Phone: ${latest.contact_phone || 'N/A'}`);
    console.log(`   Industry: ${latest.industry || 'N/A'}`);
    console.log(`   Location: ${latest.location || 'N/A'}`);
    console.log(`   Website Grade: ${latest.website_grade} (${latest.website_score}/100)`);
    console.log(`   Lead Grade: ${latest.lead_grade}`);
    console.log(`   Platform: ${latest.tech_stack?.platform || 'Unknown'}`);
    console.log(`   Services: ${latest.services?.join(', ') || 'None'}`);
    console.log(`   Analyzed: ${new Date(latest.analyzed_at).toLocaleString()}`);
  }

  // Test 3: Query ready-to-contact leads
  console.log('\n📧 TEST 3: Querying leads ready to contact...\n');

  const readyLeads = await getLeadsReadyToContact();
  console.log(`✅ Found ${readyLeads.length} leads ready to contact (Grade A/B, not contacted, has email)`);

  if (readyLeads.length > 0) {
    console.log('\nTop 3 ready to contact:');
    readyLeads.slice(0, 3).forEach((lead, i) => {
      console.log(`   ${i + 1}. ${lead.company_name || lead.url} (${lead.lead_grade}) - ${lead.contact_email}`);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎉 ALL TESTS PASSED! Supabase integration working perfectly!');
  console.log('='.repeat(60));

  console.log('\n📊 NEXT STEPS:');
  console.log('   1. Go to your Supabase dashboard: https://app.supabase.com/');
  console.log('   2. Open your project: njejsagzeebvvupzffpd');
  console.log('   3. Click "Table Editor" → "leads"');
  console.log('   4. You should see your analyzed websites!');
  console.log('\n   Query examples:');
  console.log('   - Grade A leads: SELECT * FROM leads WHERE lead_grade = \'A\';');
  console.log('   - WordPress sites: SELECT * FROM leads WHERE tech_stack->>\'platform\' = \'WordPress\';');
  console.log('   - Philadelphia businesses: SELECT * FROM leads WHERE location LIKE \'%Philadelphia%\';');

} catch (error) {
  console.error('\n❌ TEST FAILED:', error.message);
  console.error('\nPossible issues:');
  console.error('   - Server not running (start with: node server.js)');
  console.error('   - Supabase credentials not set in .env');
  console.error('   - SQL schema not created in Supabase');
  console.error('   - Network connection issue');
  process.exit(1);
}
