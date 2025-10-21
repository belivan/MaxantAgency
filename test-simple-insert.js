import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './analysis-engine/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

console.log('🧪 Testing simple insert with all new fields...\n');

const testLead = {
  url: 'https://test-' + Date.now() + '.com',
  company_name: 'Test Restaurant',
  industry: 'restaurant',

  // Scores
  overall_score: 75,
  website_grade: 'C',
  design_score: 70,
  design_score_desktop: 72,
  design_score_mobile: 68,
  seo_score: 75,
  content_score: 70,
  social_score: 65,
  accessibility_score: 80,

  // Issues
  design_issues: ['Issue 1', 'Issue 2'],
  design_issues_desktop: ['Desktop issue 1'],
  design_issues_mobile: ['Mobile issue 1'],
  seo_issues: ['SEO issue 1'],
  content_issues: ['Content issue 1'],
  social_issues: ['Social issue 1'],
  accessibility_issues: ['A11y issue 1'],
  accessibility_compliance: {
    level_a: 90,
    level_aa: 75,
    level_aaa: 50
  },
  quick_wins: ['Quick win 1', 'Quick win 2'],

  // Screenshots (NEW FIELDS)
  screenshot_desktop_url: '/screenshots/test-desktop.png',
  screenshot_mobile_url: '/screenshots/test-mobile.png',

  // Social (NEW FIELDS)
  social_profiles: {
    facebook: 'https://facebook.com/test',
    instagram: 'https://instagram.com/test'
  },
  social_platforms_present: ['facebook', 'instagram'],

  // Outreach (NEW FIELDS)
  analysis_summary: 'This is a test analysis summary for the restaurant',
  call_to_action: 'Schedule a free consultation',
  outreach_angle: 'Working site but missing key elements that drive conversions and traffic',

  // Intelligent analysis (NEW FIELDS)
  pages_discovered: 20,
  pages_crawled: 10,
  pages_analyzed: 10,
  ai_page_selection: {
    seo_pages: ['/about', '/services'],
    content_pages: ['/blog', '/contact']
  },

  // Crawl metadata (NEW FIELD)
  crawl_metadata: {
    pages_analyzed: [
      {
        url: '/',
        fullUrl: 'https://test.com/',
        screenshot_desktop_url: '/screenshots/home-desktop.png',
        screenshot_mobile_url: '/screenshots/home-mobile.png',
        analyzed_for: {
          seo: true,
          content: true,
          visual: true,
          social: true
        }
      },
      {
        url: '/about',
        fullUrl: 'https://test.com/about',
        screenshot_desktop_url: '/screenshots/about-desktop.png',
        screenshot_mobile_url: '/screenshots/about-mobile.png',
        analyzed_for: {
          seo: true,
          content: false,
          visual: true,
          social: false
        }
      }
    ]
  },

  // SEO/Tech metadata (NEW FIELDS)
  tech_stack: 'WordPress',
  has_blog: true,
  has_https: true,
  page_title: 'Test Restaurant - Best Food in Town',
  meta_description: 'Welcome to Test Restaurant',

  // Model tracking
  seo_analysis_model: 'grok-beta',
  content_analysis_model: 'grok-beta',
  desktop_visual_model: 'gpt-4o',
  mobile_visual_model: 'gpt-4o',
  social_analysis_model: 'grok-beta',
  accessibility_analysis_model: 'grok-beta',

  // Performance
  analysis_cost: 0.05,
  analysis_time: 60000,

  // Timestamps
  analyzed_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

console.log('📝 Inserting test lead with ALL new fields...');

const { data, error } = await supabase
  .from('leads')
  .insert(testLead)
  .select()
  .single();

if (error) {
  console.log('\n❌ Insert FAILED!');
  console.log('Error:', error.message);
  console.log('Code:', error.code);
  console.log('Details:', error);
  process.exit(1);
}

console.log('\n✅ Insert SUCCESSFUL!\n');

// Verify all fields
console.log('════════════════════════════════════════════════════════');
console.log('VERIFICATION - ALL FIELDS SAVED');
console.log('════════════════════════════════════════════════════════\n');

console.log('✅ Core Fields:');
console.log('   Company:', data.company_name);
console.log('   Grade:', data.website_grade, '(' + data.overall_score + '/100)');
console.log('');

console.log('✅ Screenshots (FIX #1):');
console.log('   Desktop:', data.screenshot_desktop_url);
console.log('   Mobile:', data.screenshot_mobile_url);
console.log('');

console.log('✅ Desktop/Mobile Split (FIX #2):');
console.log('   Desktop Score:', data.design_score_desktop);
console.log('   Mobile Score:', data.design_score_mobile);
console.log('   Desktop Issues:', data.design_issues_desktop.length);
console.log('   Mobile Issues:', data.design_issues_mobile.length);
console.log('');

console.log('✅ Social Profiles (FIX #3):');
console.log('   Platforms:', data.social_platforms_present.join(', '));
console.log('   Profile URLs:', Object.keys(data.social_profiles).length, 'saved');
console.log('');

console.log('✅ Outreach Support (FIX #4):');
console.log('   Analysis Summary:', data.analysis_summary);
console.log('   Call to Action:', data.call_to_action);
console.log('   Outreach Angle:', data.outreach_angle);
console.log('');

console.log('✅ Intelligent Analysis (NEW):');
console.log('   Pages Discovered:', data.pages_discovered);
console.log('   Pages Crawled:', data.pages_crawled);
console.log('   Pages Analyzed:', data.pages_analyzed);
console.log('   AI Selection:', Object.keys(data.ai_page_selection).length, 'categories');
console.log('');

console.log('✅ Crawl Metadata (FIX #5 - ALL page screenshots):');
console.log('   Total pages:', data.crawl_metadata.pages_analyzed.length);
data.crawl_metadata.pages_analyzed.forEach((page, i) => {
  console.log('   ' + (i+1) + '. ' + page.url);
  console.log('      Desktop:', page.screenshot_desktop_url);
  console.log('      Mobile:', page.screenshot_mobile_url);
});
console.log('');

console.log('✅ Accessibility (FIX #6):');
console.log('   Score:', data.accessibility_score);
console.log('   Compliance:', JSON.stringify(data.accessibility_compliance));
console.log('');

console.log('✅ SEO/Tech (FIX #7):');
console.log('   Tech Stack:', data.tech_stack);
console.log('   Has Blog:', data.has_blog);
console.log('   Has HTTPS:', data.has_https);
console.log('   Page Title:', data.page_title);
console.log('   Meta Description:', data.meta_description);
console.log('');

console.log('════════════════════════════════════════════════════════');
console.log('✅ ALL NEW FIELDS SAVED SUCCESSFULLY!');
console.log('════════════════════════════════════════════════════════\n');

// Clean up test record
console.log('🧹 Cleaning up test record...');
await supabase.from('leads').delete().eq('url', testLead.url);
console.log('✅ Test record deleted\n');

console.log('🎉 DATABASE SAVE TEST PASSED - ALL SYSTEMS GO!');
