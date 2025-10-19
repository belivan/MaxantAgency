import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkRecentLeads() {
  console.log('Checking most recent leads in database...\n');

  // Get the 10 most recent leads
  const { data: leads, error } = await supabase
    .from('leads')
    .select('url, company_name, website_grade, website_status, requires_social_outreach, social_profiles, analyzed_at')
    .order('analyzed_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  console.log(`Found ${leads.length} recent leads:\n`);

  for (const lead of leads) {
    console.log('────────────────────────────────────────');
    console.log(`Company: ${lead.company_name || 'Unknown'}`);
    console.log(`URL: ${lead.url}`);
    console.log(`Grade: ${lead.website_grade || 'N/A'}`);
    console.log(`Status: ${lead.website_status || 'unknown'}`);
    console.log(`Requires Social Outreach: ${lead.requires_social_outreach ?? 'NULL/UNDEFINED'}`);
    console.log(`Has Social Profiles: ${lead.social_profiles ? 'Yes' : 'No'}`);
    if (lead.social_profiles) {
      const platforms = Object.keys(lead.social_profiles).join(', ');
      console.log(`  Platforms: ${platforms}`);
    }
    console.log(`Analyzed: ${new Date(lead.analyzed_at).toLocaleString()}`);
    console.log('');
  }

  // Check table schema
  console.log('\n═══════════════════════════════════════════');
  console.log('Checking if requires_social_outreach column exists...\n');

  const { data: columns, error: schemaError } = await supabase
    .rpc('exec_sql', {
      sql: `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'leads'
        AND column_name IN ('requires_social_outreach', 'website_status', 'website_error', 'content_insights')
        ORDER BY column_name;
      `
    });

  if (schemaError) {
    // Try alternative approach - just show the data types
    console.log('Note: Cannot check schema via RPC. Checking actual data...');

    const { data: sample, error: sampleError } = await supabase
      .from('leads')
      .select('requires_social_outreach, website_status, website_error, content_insights')
      .limit(1);

    if (!sampleError && sample && sample.length > 0) {
      console.log('✅ New columns exist in the table:');
      console.log(`   requires_social_outreach: ${typeof sample[0].requires_social_outreach} (${sample[0].requires_social_outreach})`);
      console.log(`   website_status: ${typeof sample[0].website_status} (${sample[0].website_status})`);
      console.log(`   website_error: ${typeof sample[0].website_error} (${sample[0].website_error ? 'exists' : 'null'})`);
      console.log(`   content_insights: ${typeof sample[0].content_insights} (${sample[0].content_insights ? 'exists' : 'null'})`);
    } else {
      console.log('⚠️  Could not verify schema');
    }
  } else {
    console.log('Schema info:', columns);
  }
}

checkRecentLeads();
