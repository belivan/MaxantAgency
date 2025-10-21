import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './analysis-engine/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

console.log('🔍 Verifying website_grade column fix...\n');

const { data, error } = await supabase
  .from('leads')
  .select('company_name, website_grade, overall_score, screenshot_desktop_url, screenshot_mobile_url, design_score_desktop, design_score_mobile, social_profiles, social_platforms_present, crawl_metadata, analysis_summary, analyzed_at')
  .eq('url', 'https://wilderphilly.com/')
  .order('analyzed_at', { ascending: false })
  .limit(1);

if (error) {
  console.log('❌ Query error:', error.message);
  process.exit(1);
}

if (!data || data.length === 0) {
  console.log('❌ No data found');
  process.exit(1);
}

const lead = data[0];
console.log('✅ DATA VERIFIED (Most Recent Analysis)!\n');
console.log('Company:', lead.company_name);
console.log('Grade:', lead.website_grade, '(' + lead.overall_score + '/100)');
console.log('');

console.log('📸 Screenshot URLs:');
console.log('  Desktop:', lead.screenshot_desktop_url ? '✅ SAVED' : '❌ NULL');
console.log('  Mobile:', lead.screenshot_mobile_url ? '✅ SAVED' : '❌ NULL');
console.log('');

console.log('📊 Desktop/Mobile Split:');
console.log('  Desktop Score:', lead.design_score_desktop);
console.log('  Mobile Score:', lead.design_score_mobile);
console.log('');

console.log('👥 Social Profiles:');
console.log('  Platforms Count:', Object.keys(lead.social_profiles || {}).length);
console.log('  Platforms:', (lead.social_platforms_present || []).join(', ') || 'None');
console.log('');

console.log('📸 All Page Screenshots in Crawl Metadata:');
const pages = lead.crawl_metadata?.pages_analyzed || [];
console.log('  Total pages with screenshots:', pages.length);
pages.forEach((page, i) => {
  console.log(`  ${i+1}. ${page.url}`);
  console.log(`     Desktop: ${page.screenshot_desktop_url ? '✅ ' + page.screenshot_desktop_url : '❌ NULL'}`);
  console.log(`     Mobile: ${page.screenshot_mobile_url ? '✅ ' + page.screenshot_mobile_url : '❌ NULL'}`);
});
console.log('');

console.log('📝 Analysis Summary:');
console.log('  ', lead.analysis_summary ? `✅ SAVED (${lead.analysis_summary.length} chars)` : '❌ NULL');
console.log('');

console.log('⏰ Analyzed At:', lead.analyzed_at);
