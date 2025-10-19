import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkSocialOutreachLeads() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('SOCIAL OUTREACH LEADS - Database Verification');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Query leads that require social outreach
  const { data: leads, error } = await supabase
    .from('leads')
    .select('*')
    .eq('requires_social_outreach', true)
    .order('analyzed_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching leads:', error.message);
    return;
  }

  console.log(`✅ Found ${leads.length} leads flagged for social outreach\n`);

  // Display each lead
  for (const lead of leads) {
    console.log('─────────────────────────────────────────────────────────────');
    console.log(`🏢 Company: ${lead.company_name || 'Unknown'}`);
    console.log(`🔗 URL: ${lead.url}`);
    console.log(`📊 Website Status: ${lead.website_status}`);
    console.log(`❌ Error: ${lead.website_error?.substring(0, 100)}...`);
    console.log(`📅 Analyzed: ${new Date(lead.analyzed_at).toLocaleString()}`);

    // Show social profiles
    if (lead.social_profiles) {
      console.log('\n📱 Social Profiles:');
      const profiles = lead.social_profiles;

      if (profiles.instagram) {
        console.log(`   Instagram: ${profiles.instagram.url || profiles.instagram}`);
        if (profiles.instagram.username) console.log(`     @${profiles.instagram.username}`);
      }
      if (profiles.facebook) {
        console.log(`   Facebook: ${profiles.facebook.url || profiles.facebook}`);
        if (profiles.facebook.name) console.log(`     ${profiles.facebook.name}`);
      }
      if (profiles.linkedin_company) {
        console.log(`   LinkedIn (Company): ${profiles.linkedin_company.url || profiles.linkedin_company}`);
      }
      if (profiles.linkedin_person) {
        console.log(`   LinkedIn (Person): ${profiles.linkedin_person.url || profiles.linkedin_person}`);
      }
    } else {
      console.log('⚠️  No social profiles saved');
    }

    // Show metadata
    if (lead.metadata) {
      console.log('\n📋 Metadata:');
      if (lead.metadata.whyNow) console.log(`   Why Now: ${lead.metadata.whyNow}`);
      if (lead.metadata.teaser) console.log(`   Teaser: ${lead.metadata.teaser}`);
      if (lead.metadata.prospectId) console.log(`   Prospect ID: ${lead.metadata.prospectId}`);
    }

    console.log('');
  }

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('OUTREACH STRATEGY RECOMMENDATIONS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Group by error type
  const byErrorType = leads.reduce((acc, lead) => {
    const status = lead.website_status || 'unknown';
    if (!acc[status]) acc[status] = [];
    acc[status].push(lead);
    return acc;
  }, {});

  for (const [status, statusLeads] of Object.entries(byErrorType)) {
    console.log(`\n${status.toUpperCase()} (${statusLeads.length} leads):`);

    if (status === 'ssl_error') {
      console.log('   📧 Message: "Your website has an SSL certificate issue - potential');
      console.log('   customers see \'Not Secure\' warnings. I can fix this quickly!"');
    } else if (status === 'timeout' || status === 'dns_error') {
      console.log('   📧 Message: "I noticed your website appears to be down. I can help');
      console.log('   get it back online and ensure it stays that way!"');
    } else {
      console.log('   📧 Message: "I noticed some issues with your website. Let\'s chat');
      console.log('   about getting it fixed!"');
    }
  }

  console.log('\n');
}

checkSocialOutreachLeads();
