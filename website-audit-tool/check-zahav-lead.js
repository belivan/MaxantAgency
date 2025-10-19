import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkZahavLead() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('ZAHAV RESTAURANT - Lead Data Verification');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const { data: lead, error } = await supabase
    .from('leads')
    .select('*')
    .eq('url', 'https://www.mcdevittlawfirm.com')
    .order('analyzed_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  console.log('🏢 BASIC INFO');
  console.log('─'.repeat(63));
  console.log(`Company Name: ${lead.company_name}`);
  console.log(`URL: ${lead.url}`);
  console.log(`Industry: ${lead.industry}`);
  console.log(`Location: ${lead.location}`);
  console.log(`Website Grade: ${lead.website_grade}`);
  console.log(`Website Score: ${lead.website_score}`);
  console.log(`Analyzed: ${new Date(lead.analyzed_at).toLocaleString()}\n`);

  console.log('📱 SOCIAL PROFILES');
  console.log('─'.repeat(63));
  if (lead.social_profiles) {
    console.log(JSON.stringify(lead.social_profiles, null, 2));
  } else {
    console.log('None found\n');
  }

  console.log('\n📞 CONTACT INFO');
  console.log('─'.repeat(63));
  console.log(`Email: ${lead.contact_email || 'Not found'}`);
  console.log(`Phone: ${lead.contact_phone || 'Not found'}`);
  console.log(`Contact Name: ${lead.contact_name || 'Not found'}\n`);

  console.log('📝 COMPANY INFO');
  console.log('─'.repeat(63));
  console.log(`Description: ${lead.company_description || 'None'}`);
  console.log(`Value Prop: ${lead.value_proposition || 'None'}`);
  console.log(`Target Audience: ${lead.target_audience || 'None'}`);
  console.log(`Founding Year: ${lead.founding_year || 'Unknown'}\n`);

  console.log('🛠️ SERVICES');
  console.log('─'.repeat(63));
  if (lead.services && lead.services.length > 0) {
    lead.services.forEach((service, i) => console.log(`  ${i + 1}. ${service}`));
  } else {
    console.log('None listed');
  }
  console.log('');

  console.log('🏆 ACHIEVEMENTS');
  console.log('─'.repeat(63));
  if (lead.achievements) {
    console.log(JSON.stringify(lead.achievements, null, 2));
  } else {
    console.log('None found\n');
  }

  console.log('\n💬 TESTIMONIALS');
  console.log('─'.repeat(63));
  if (lead.testimonials && lead.testimonials.length > 0) {
    lead.testimonials.forEach((test, i) => {
      console.log(`  ${i + 1}. ${JSON.stringify(test, null, 2)}`);
    });
  } else {
    console.log('None found');
  }
  console.log('');

  console.log('🤝 COMMUNITY INVOLVEMENT');
  console.log('─'.repeat(63));
  if (lead.community_involvement && lead.community_involvement.length > 0) {
    lead.community_involvement.forEach((item, i) => console.log(`  ${i + 1}. ${item}`));
  } else {
    console.log('None found');
  }
  console.log('');

  console.log('🎨 BRAND VOICE');
  console.log('─'.repeat(63));
  console.log(lead.brand_voice || 'Not analyzed\n');

  console.log('📰 CONTENT INSIGHTS');
  console.log('─'.repeat(63));
  if (lead.content_insights) {
    console.log(JSON.stringify(lead.content_insights, null, 2));
  } else {
    console.log('None\n');
  }

  console.log('\n⚠️ CRITIQUES');
  console.log('─'.repeat(63));
  console.log('\nBasic Critiques:');
  if (lead.critiques_basic && lead.critiques_basic.length > 0) {
    lead.critiques_basic.forEach((c, i) => console.log(`  ${i + 1}. ${c}`));
  } else {
    console.log('  None');
  }

  console.log('\nIndustry Critiques:');
  if (lead.critiques_industry && lead.critiques_industry.length > 0) {
    lead.critiques_industry.forEach((c, i) => console.log(`  ${i + 1}. ${c}`));
  } else {
    console.log('  None');
  }

  console.log('\nSEO Critiques:');
  if (lead.critiques_seo && lead.critiques_seo.length > 0) {
    lead.critiques_seo.forEach((c, i) => console.log(`  ${i + 1}. ${c}`));
  } else {
    console.log('  None');
  }

  console.log('\n📊 ANALYSIS SUMMARY');
  console.log('─'.repeat(63));
  console.log(lead.analysis_summary || 'None\n');

  console.log('\n🚦 SOCIAL OUTREACH STATUS');
  console.log('─'.repeat(63));
  console.log(`Requires Social Outreach: ${lead.requires_social_outreach}`);
  console.log(`Website Status: ${lead.website_status}`);
  console.log(`Website Error: ${lead.website_error || 'None'}\n`);

  console.log('═══════════════════════════════════════════════════════════════');
}

checkZahavLead();
