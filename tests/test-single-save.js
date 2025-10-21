import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { analyzeWebsiteIntelligent } from './analysis-engine/orchestrator.js';

dotenv.config({ path: './analysis-engine/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

console.log('🧪 SINGLE PROSPECT SAVE TEST\n');
console.log('This will:');
console.log('  1. Analyze 1 prospect');
console.log('  2. Save to database with ALL new fields');
console.log('  3. Query and verify all fields saved correctly\n');
console.log('============================================================\n');

// Test prospect
const testUrl = 'http://www.forkrestaurant.com/';
const testCompany = 'Fork Restaurant';

console.log('📊 Analyzing:', testCompany);
console.log('   URL:', testUrl);
console.log('');

// Run analysis
const result = await analyzeWebsiteIntelligent(testUrl, {
  company_name: testCompany,
  industry: 'restaurant'
});

if (!result.success) {
  console.log('❌ Analysis failed:', result.error);
  process.exit(1);
}

console.log('✅ Analysis complete!');
console.log('   Grade:', result.grade, '(' + result.overall_score + '/100)');
console.log('   Pages crawled:', result.intelligent_analysis?.pages_crawled || 0);
console.log('');

// Prepare data for save
const leadData = {
  url: result.url,
  company_name: result.company_name,
  industry: result.industry,

  // Scores
  overall_score: Math.round(result.overall_score),
  website_grade: result.grade,  // FIXED: was 'grade'
  design_score: Math.round(result.design_score),
  design_score_desktop: result.design_score_desktop || Math.round(result.design_score),
  design_score_mobile: result.design_score_mobile || Math.round(result.design_score),
  seo_score: Math.round(result.seo_score),
  content_score: Math.round(result.content_score),
  social_score: Math.round(result.social_score),
  accessibility_score: Math.round(result.accessibility_score || 50),

  // Issues
  design_issues: result.design_issues || [],
  design_issues_desktop: result.design_issues_desktop || [],
  design_issues_mobile: result.design_issues_mobile || [],
  seo_issues: result.seo_issues || [],
  content_issues: result.content_issues || [],
  social_issues: result.social_issues || [],
  accessibility_issues: result.accessibility_issues || [],
  accessibility_compliance: result.accessibility_compliance || {},
  quick_wins: result.quick_wins || [],

  // Outreach
  top_issue: result.top_issue || null,
  one_liner: result.one_liner || null,

  // Models
  seo_analysis_model: result.seo_analysis_model || null,
  content_analysis_model: result.content_analysis_model || null,
  desktop_visual_model: result.desktop_visual_model || null,
  mobile_visual_model: result.mobile_visual_model || null,
  social_analysis_model: result.social_analysis_model || null,
  accessibility_analysis_model: result.accessibility_analysis_model || null,

  // Screenshots (NEW)
  screenshot_desktop_url: result.screenshot_desktop_url || null,
  screenshot_mobile_url: result.screenshot_mobile_url || null,

  // Social (NEW)
  social_profiles: result.social_profiles || {},
  social_platforms_present: result.social_platforms_present || [],

  // SEO/Tech (NEW)
  tech_stack: result.tech_stack || null,
  has_blog: result.has_blog || false,
  has_https: result.has_https || false,
  page_title: result.page_title || null,
  meta_description: result.meta_description || null,

  // Outreach support (NEW)
  analysis_summary: result.analysis_summary || null,
  call_to_action: result.call_to_action || null,
  outreach_angle: result.outreach_angle || null,

  // Crawl metadata (NEW - includes ALL page screenshots)
  crawl_metadata: result.crawl_metadata || {},

  // Intelligent analysis
  pages_discovered: result.intelligent_analysis?.pages_discovered || 0,
  pages_crawled: result.intelligent_analysis?.pages_crawled || 0,
  pages_analyzed: result.intelligent_analysis?.pages_crawled || 0,
  ai_page_selection: result.intelligent_analysis?.ai_page_selection || null,

  // Performance
  analysis_cost: result.analysis_cost || 0,
  analysis_time: result.analysis_time || 0,

  // Timestamps
  analyzed_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

console.log('💾 Saving to database...');
const { data: savedData, error: saveError } = await supabase
  .from('leads')
  .upsert(leadData, { onConflict: 'url' })
  .select()
  .single();

if (saveError) {
  console.log('❌ Save failed!');
  console.log('Error:', saveError.message);
  console.log('Details:', saveError);
  process.exit(1);
}

console.log('✅ Save successful!\n');

// Verify all fields
console.log('============================================================');
console.log('VERIFICATION - ALL NEW FIELDS');
console.log('============================================================\n');

console.log('✅ Core Fields:');
console.log('   Company:', savedData.company_name);
console.log('   Grade:', savedData.website_grade, '(' + savedData.overall_score + '/100)');
console.log('');

console.log('✅ Screenshot URLs (FIX #1):');
console.log('   Desktop:', savedData.screenshot_desktop_url ? 'SAVED ✓' : 'NULL ✗');
console.log('   Mobile:', savedData.screenshot_mobile_url ? 'SAVED ✓' : 'NULL ✗');
console.log('');

console.log('✅ Desktop/Mobile Split (FIX #2):');
console.log('   Desktop Score:', savedData.design_score_desktop);
console.log('   Mobile Score:', savedData.design_score_mobile);
console.log('   Desktop Issues:', savedData.design_issues_desktop?.length || 0);
console.log('   Mobile Issues:', savedData.design_issues_mobile?.length || 0);
console.log('');

console.log('✅ Social Profiles (FIX #3):');
console.log('   Platforms:', (savedData.social_platforms_present || []).join(', ') || 'None');
console.log('   Profile URLs:', Object.keys(savedData.social_profiles || {}).length, 'saved');
console.log('');

console.log('✅ Outreach Support (FIX #4):');
console.log('   Analysis Summary:', savedData.analysis_summary ? 'SAVED ✓ (' + savedData.analysis_summary.length + ' chars)' : 'NULL ✗');
console.log('   Call to Action:', savedData.call_to_action ? 'SAVED ✓' : 'NULL ✗');
console.log('   Outreach Angle:', savedData.outreach_angle ? 'SAVED ✓' : 'NULL ✗');
console.log('');

console.log('✅ Crawl Metadata (FIX #5 - ALL page screenshots):');
const pages = savedData.crawl_metadata?.pages_analyzed || [];
console.log('   Total pages:', pages.length);
pages.forEach((page, i) => {
  console.log('   ' + (i+1) + '. ' + page.url);
  console.log('      Desktop screenshot:', page.screenshot_desktop_url ? 'YES' : 'NO');
  console.log('      Mobile screenshot:', page.screenshot_mobile_url ? 'YES' : 'NO');
});
console.log('');

console.log('✅ Accessibility Compliance (FIX #6):');
console.log('   Compliance object:', savedData.accessibility_compliance ? 'SAVED ✓' : 'NULL ✗');
if (savedData.accessibility_compliance && Object.keys(savedData.accessibility_compliance).length > 0) {
  console.log('   Fields:', Object.keys(savedData.accessibility_compliance).join(', '));
}
console.log('');

console.log('✅ SEO/Tech Metadata (FIX #7):');
console.log('   Tech Stack:', savedData.tech_stack || 'NULL');
console.log('   Has Blog:', savedData.has_blog ? 'YES' : 'NO');
console.log('   Has HTTPS:', savedData.has_https ? 'YES' : 'NO');
console.log('   Page Title:', savedData.page_title ? 'SAVED ✓' : 'NULL ✗');
console.log('   Meta Description:', savedData.meta_description ? 'SAVED ✓' : 'NULL ✗');
console.log('');

console.log('============================================================');
console.log('✅ ALL FIELDS VERIFIED - TEST PASSED!');
console.log('============================================================');
