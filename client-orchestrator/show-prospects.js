import { getSupabase } from './supabase.js';

async function showProspects() {
  try {
    const supabase = getSupabase();

    // Get all prospects
    const { data, error } = await supabase
      .from('prospects')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ Error fetching prospects:', error);
      return;
    }

    console.log('\n📊 PROSPECTS TABLE DATA\n');
    console.log(`Found ${data.length} prospects (showing last 10):\n`);

    if (data.length === 0) {
      console.log('No prospects in database yet.\n');
      return;
    }

    // Show table structure
    console.log('📋 TABLE COLUMNS:');
    const columns = Object.keys(data[0]);
    columns.forEach(col => {
      const sampleValue = data[0][col];
      const type = sampleValue === null ? 'null' : typeof sampleValue;
      console.log(`  - ${col} (${type})`);
    });

    console.log('\n📝 SAMPLE ROWS:\n');

    // Show each prospect
    data.forEach((prospect, i) => {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`${i + 1}. ${prospect.company_name || 'Unknown Company'}`);
      console.log(`   Website: ${prospect.website || 'N/A'}`);
      console.log(`   Industry: ${prospect.industry || 'N/A'}`);
      console.log(`   Status: ${prospect.status || 'N/A'}`);
      console.log(`   City: ${prospect.city || 'N/A'}`);
      console.log(`   Why Now: ${prospect.why_now || 'N/A'}`);
      console.log(`   Teaser: ${prospect.teaser || 'N/A'}`);

      if (prospect.social_profiles) {
        console.log(`   📱 Social Profiles:`);
        if (prospect.social_profiles.instagram) {
          console.log(`      Instagram: ${prospect.social_profiles.instagram}`);
        }
        if (prospect.social_profiles.facebook) {
          console.log(`      Facebook: ${prospect.social_profiles.facebook}`);
        }
        if (prospect.social_profiles.linkedin_company) {
          console.log(`      LinkedIn Company: ${prospect.social_profiles.linkedin_company}`);
        }
        if (prospect.social_profiles.linkedin_person) {
          console.log(`      LinkedIn Person: ${prospect.social_profiles.linkedin_person}`);
        }
      } else {
        console.log(`   📱 Social Profiles: None`);
      }

      console.log(`   Created: ${new Date(prospect.created_at).toLocaleString()}`);
    });

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // Show summary for website audit tool
    console.log('🔧 FOR WEBSITE AUDIT TOOL:\n');
    console.log('Available data per prospect:');
    console.log('  - website: The URL to analyze');
    console.log('  - company_name: Business name');
    console.log('  - industry: Business type/niche');
    console.log('  - city: Location');
    console.log('  - social_profiles: Instagram, Facebook, LinkedIn URLs');
    console.log('  - status: Current stage (pending_analysis, analyzed, etc.)');
    console.log('  - why_now: Trigger/pain point identified');
    console.log('  - teaser: Personalized opener\n');

    console.log('💡 The website-audit-tool can read prospects with status="pending_analysis"');
    console.log('   and run automated audits on each website.\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

showProspects();
