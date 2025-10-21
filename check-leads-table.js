import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './analysis-engine/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

console.log('🔍 Checking Supabase connection and pulling leads table...\n');

const { data, error } = await supabase
  .from('leads')
  .select('*')
  .order('analyzed_at', { ascending: false })
  .limit(5);

if (error) {
  console.log('❌ Error querying leads table:');
  console.log('   Message:', error.message);
  console.log('   Code:', error.code);
  console.log('   Details:', error.details);
  process.exit(1);
}

console.log('✅ Successfully connected to Supabase!');
console.log('✅ Found', data.length, 'recent leads\n');

if (data.length === 0) {
  console.log('📭 No leads in database yet');
} else {
  data.forEach((lead, i) => {
    console.log('════════════════════════════════════════════════════════');
    console.log(`Lead ${i+1}: ${lead.company_name}`);
    console.log('════════════════════════════════════════════════════════');
    console.log('URL:', lead.url);
    console.log('Grade:', lead.website_grade, `(${lead.overall_score}/100)`);
    console.log('');
    console.log('📊 Scores:');
    console.log('   Design:', lead.design_score, `(Desktop: ${lead.design_score_desktop || 'N/A'}, Mobile: ${lead.design_score_mobile || 'N/A'})`);
    console.log('   SEO:', lead.seo_score);
    console.log('   Content:', lead.content_score);
    console.log('   Social:', lead.social_score);
    console.log('   Accessibility:', lead.accessibility_score || 'N/A');
    console.log('');
    console.log('📸 Screenshots:');
    console.log('   Desktop:', lead.screenshot_desktop_url || 'NULL');
    console.log('   Mobile:', lead.screenshot_mobile_url || 'NULL');
    console.log('');
    console.log('📄 Intelligent Analysis:');
    console.log('   Pages Discovered:', lead.pages_discovered || 0);
    console.log('   Pages Crawled:', lead.pages_crawled || 0);
    console.log('   Pages Analyzed:', lead.pages_analyzed || 0);
    console.log('');
    console.log('🎯 Outreach:');
    console.log('   Outreach Angle:', lead.outreach_angle || 'NULL');
    console.log('   Analysis Summary:', lead.analysis_summary ? `${lead.analysis_summary.substring(0, 60)}...` : 'NULL');
    console.log('');
    console.log('📅 Analyzed:', new Date(lead.analyzed_at).toLocaleString());
    console.log('');
  });
}

console.log('════════════════════════════════════════════════════════');
console.log('✅ Database connection is working!');
console.log('════════════════════════════════════════════════════════');
