// Quick test script to verify the VIEW is working
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from root directory
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testView() {
  console.log('🔍 Testing leads VIEW...\n');

  // Test 1: Basic query
  const { data: leads, error } = await supabase
    .from('leads')
    .select('id, company_name, website_grade, grade, city, state, contact_email, prospect_id')
    .limit(5);

  if (error) {
    console.error('❌ Error querying VIEW:', error);
    return;
  }

  console.log(`✅ Found ${leads.length} leads\n`);

  // Test 2: Check grade alias
  console.log('📊 Grade Alias Test:');
  leads.forEach(lead => {
    const match = lead.website_grade === lead.grade ? '✅' : '❌';
    console.log(`${match} ${lead.company_name}: website_grade=${lead.website_grade}, grade=${lead.grade}`);
  });

  // Test 3: Check contact/location data
  console.log('\n📍 Contact/Location Data Test:');
  const leadsWithData = leads.filter(l => l.city || l.contact_email);
  const leadsWithProspect = leads.filter(l => l.prospect_id);

  console.log(`Leads with prospect_id: ${leadsWithProspect.length}/${leads.length}`);
  console.log(`Leads with city/email: ${leadsWithData.length}/${leads.length}`);

  if (leadsWithData.length > 0) {
    console.log('\n✅ Sample lead with contact data:');
    const sample = leadsWithData[0];
    console.log(`  Company: ${sample.company_name}`);
    console.log(`  City: ${sample.city || 'N/A'}`);
    console.log(`  State: ${sample.state || 'N/A'}`);
    console.log(`  Email: ${sample.contact_email || 'N/A'}`);
    console.log(`  Prospect ID: ${sample.prospect_id || 'N/A'}`);
  } else {
    console.log('\n⚠️  No leads have contact/location data');
    console.log('   This is expected if leads don\'t have prospect_id set');
  }

  // Test 4: Grade filtering
  console.log('\n🎯 Grade Filter Test:');
  const { data: cLeads, error: cError } = await supabase
    .from('leads')
    .select('company_name, website_grade')
    .eq('website_grade', 'C')
    .limit(3);

  if (cError) {
    console.error('❌ Error filtering by grade:', cError);
  } else {
    console.log(`✅ Found ${cLeads.length} C-grade leads:`);
    cLeads.forEach(l => console.log(`  - ${l.company_name}: ${l.website_grade}`));
  }

  console.log('\n✅ VIEW test complete!');
}

testView().catch(console.error);