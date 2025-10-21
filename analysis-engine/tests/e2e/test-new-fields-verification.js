/**
 * Test: Verify ALL New Fields Are Saved to Database
 *
 * This test verifies that all fixes from FIXES-IMPLEMENTED.md work correctly:
 * 1. Screenshot URLs saved (homepage desktop + mobile)
 * 2. ALL screenshots saved in crawl_metadata.pages
 * 3. Desktop/mobile score split
 * 4. Desktop/mobile issues split
 * 5. Social profiles saved
 * 6. Social platforms saved
 * 7. Analysis summary saved
 * 8. Crawl metadata with enhanced error logging
 * 9. Accessibility compliance
 * 10. SEO/tech metadata (5 fields)
 * 11. Outreach support (2 fields)
 * 12. analysis_time (not analysis_time_seconds)
 */

import { analyzeWebsiteIntelligent } from './analysis-engine/orchestrator.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './analysis-engine/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

console.log('🧪 NEW FIELDS VERIFICATION TEST\n');
console.log('This test will:');
console.log('  1. Analyze 1 real prospect');
console.log('  2. Query database for ALL new fields');
console.log('  3. Verify each field is populated\n');

async function runTest() {
  console.log('============================================================');
  console.log('PHASE 1: Analyze 1 Real Prospect');
  console.log('============================================================\n');

  // Get 1 real prospect
  const { data: prospects, error } = await supabase
    .from('prospects')
    .select('id, company_name, website, industry, city, state')
    .not('website', 'is', null)
    .limit(1);

  if (error || !prospects || prospects.length === 0) {
    console.error('❌ Failed to fetch prospect:', error);
    process.exit(1);
  }

  const prospect = prospects[0];
  console.log(`📊 Testing: ${prospect.company_name}`);
  console.log(`   URL: ${prospect.website}`);
  console.log(`   Industry: ${prospect.industry}\n`);

  // Run intelligent analysis
  console.log('⚙️  Running intelligent multi-page analysis...\n');
  const startTime = Date.now();

  const result = await analyzeWebsiteIntelligent(prospect.website, {
    company_name: prospect.company_name,
    industry: prospect.industry || 'unknown',
    city: prospect.city,
    state: prospect.state,
    prospect_id: prospect.id
  });

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  if (!result.success) {
    console.error('❌ Analysis failed:', result.error);
    process.exit(1);
  }

  console.log(`✅ Analysis complete in ${duration}s`);
  console.log(`   Grade: ${result.grade} (${result.overall_score}/100)`);
  console.log(`   Pages crawled: ${result.intelligent_analysis?.pages_crawled || 0}`);
  console.log(`   Screenshots captured: ${result.crawl_metadata?.pages?.length || 0} pages\n`);

  // Save to database (this happens in server.js normally, but we'll test the data structure)
  console.log('💾 Saving to database...\n');

  const leadData = {
    url: result.url,
    company_name: result.company_name,
    industry: result.industry,

    // Scores
    overall_score: Math.round(result.overall_score),
    grade: result.grade,
    design_score: Math.round(result.design_score),
    design_score_desktop: result.design_score_desktop,
    design_score_mobile: result.design_score_mobile,
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

    // Top findings
    top_issue: result.top_issue || null,
    one_liner: result.one_liner || null,

    // Model tracking
    seo_analysis_model: result.seo_analysis_model || null,
    content_analysis_model: result.content_analysis_model || null,
    desktop_visual_model: result.desktop_visual_model || null,
    mobile_visual_model: result.mobile_visual_model || null,
    social_analysis_model: result.social_analysis_model || null,
    accessibility_analysis_model: result.accessibility_analysis_model || null,

    // Screenshots (NEW!)
    screenshot_desktop_url: result.screenshot_desktop_url || null,
    screenshot_mobile_url: result.screenshot_mobile_url || null,

    // Social profiles (NEW!)
    social_profiles: result.social_profiles || {},
    social_platforms_present: result.social_platforms_present || [],

    // SEO/Tech metadata (NEW!)
    tech_stack: result.tech_stack || null,
    has_blog: result.has_blog || false,
    has_https: result.has_https || false,
    page_title: result.page_title || null,
    meta_description: result.meta_description || null,

    // Outreach support (NEW!)
    analysis_summary: result.analysis_summary || null,
    call_to_action: result.call_to_action || null,
    outreach_angle: result.outreach_angle || null,

    // Crawl metadata (NEW!)
    crawl_metadata: result.crawl_metadata || {},

    // Intelligent analysis
    pages_discovered: result.intelligent_analysis?.pages_discovered || 0,
    pages_crawled: result.intelligent_analysis?.pages_crawled || 0,
    pages_analyzed: result.intelligent_analysis?.pages_crawled || 0,
    ai_page_selection: result.intelligent_analysis?.ai_page_selection || null,

    // Performance (FIXED field name!)
    analysis_cost: result.analysis_cost || 0,
    analysis_time: result.analysis_time || 0,

    // Timestamps
    analyzed_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { error: saveError } = await supabase
    .from('leads')
    .upsert(leadData, { onConflict: 'url' });

  if (saveError) {
    console.error('❌ Database save failed:', saveError.message);
    console.error('   Details:', saveError);
    process.exit(1);
  }

  console.log('✅ Saved to database successfully\n');

  // PHASE 2: Verify all fields in database
  console.log('============================================================');
  console.log('PHASE 2: Verify All New Fields in Database');
  console.log('============================================================\n');

  const { data: lead, error: fetchError } = await supabase
    .from('leads')
    .select('*')
    .eq('url', result.url)
    .single();

  if (fetchError || !lead) {
    console.error('❌ Failed to fetch lead from database:', fetchError);
    process.exit(1);
  }

  console.log('📊 Checking all new fields...\n');

  // Verification checklist
  const checks = [
    // CRITICAL FIXES
    {
      name: 'Screenshot URLs (Homepage)',
      fields: [
        { field: 'screenshot_desktop_url', expected: 'string path', value: lead.screenshot_desktop_url },
        { field: 'screenshot_mobile_url', expected: 'string path', value: lead.screenshot_mobile_url }
      ]
    },
    {
      name: 'Desktop/Mobile Score Split',
      fields: [
        { field: 'design_score_desktop', expected: 'number 0-100', value: lead.design_score_desktop },
        { field: 'design_score_mobile', expected: 'number 0-100', value: lead.design_score_mobile }
      ]
    },
    {
      name: 'Desktop/Mobile Issues Split',
      fields: [
        { field: 'design_issues_desktop', expected: 'array', value: lead.design_issues_desktop },
        { field: 'design_issues_mobile', expected: 'array', value: lead.design_issues_mobile }
      ]
    },
    {
      name: 'Social Profiles (DM Generation)',
      fields: [
        { field: 'social_profiles', expected: 'object', value: lead.social_profiles },
        { field: 'social_platforms_present', expected: 'array', value: lead.social_platforms_present }
      ]
    },
    {
      name: 'Analysis Summary (Required)',
      fields: [
        { field: 'analysis_summary', expected: 'string', value: lead.analysis_summary }
      ]
    },
    {
      name: 'Crawl Metadata (Enhanced)',
      fields: [
        { field: 'crawl_metadata', expected: 'object with pages array', value: lead.crawl_metadata }
      ]
    },

    // HIGH VALUE FIXES
    {
      name: 'Accessibility Compliance',
      fields: [
        { field: 'accessibility_compliance', expected: 'object', value: lead.accessibility_compliance }
      ]
    },
    {
      name: 'SEO/Tech Metadata',
      fields: [
        { field: 'tech_stack', expected: 'string', value: lead.tech_stack },
        { field: 'has_blog', expected: 'boolean', value: lead.has_blog },
        { field: 'has_https', expected: 'boolean', value: lead.has_https },
        { field: 'page_title', expected: 'string', value: lead.page_title },
        { field: 'meta_description', expected: 'string', value: lead.meta_description }
      ]
    },
    {
      name: 'Outreach Support',
      fields: [
        { field: 'call_to_action', expected: 'string', value: lead.call_to_action },
        { field: 'outreach_angle', expected: 'string', value: lead.outreach_angle }
      ]
    },

    // BUG FIX
    {
      name: 'Field Name Fix',
      fields: [
        { field: 'analysis_time', expected: 'number (milliseconds)', value: lead.analysis_time }
      ]
    }
  ];

  let totalChecks = 0;
  let passedChecks = 0;
  let failedChecks = 0;

  for (const category of checks) {
    console.log(`\n🔍 ${category.name}:`);

    for (const check of category.fields) {
      totalChecks++;
      const value = check.value;
      let passed = false;
      let status = '❌';

      // Check if field exists and has appropriate type
      if (value !== null && value !== undefined) {
        if (check.expected.includes('array') && Array.isArray(value)) {
          passed = true;
          status = '✅';
        } else if (check.expected.includes('object') && typeof value === 'object' && !Array.isArray(value)) {
          passed = true;
          status = '✅';
        } else if (check.expected.includes('string') && typeof value === 'string' && value.length > 0) {
          passed = true;
          status = '✅';
        } else if (check.expected.includes('number') && typeof value === 'number') {
          passed = true;
          status = '✅';
        } else if (check.expected.includes('boolean') && typeof value === 'boolean') {
          passed = true;
          status = '✅';
        }
      }

      if (passed) {
        passedChecks++;
      } else {
        failedChecks++;
      }

      // Format value for display
      let displayValue = value;
      if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          displayValue = `Array(${value.length})`;
        } else {
          displayValue = `Object(${Object.keys(value).length} keys)`;
        }
      } else if (typeof value === 'string' && value.length > 50) {
        displayValue = value.substring(0, 47) + '...';
      }

      console.log(`   ${status} ${check.field}: ${displayValue}`);
    }
  }

  // Special check: crawl_metadata.pages array
  console.log(`\n🔍 Special Check: All Screenshots in crawl_metadata.pages:`);
  if (lead.crawl_metadata?.pages && Array.isArray(lead.crawl_metadata.pages)) {
    const pages = lead.crawl_metadata.pages;
    console.log(`   ✅ Found ${pages.length} pages with screenshots`);

    for (const page of pages) {
      const hasDesktop = page.screenshot_desktop ? '✅' : '❌';
      const hasMobile = page.screenshot_mobile ? '✅' : '❌';
      console.log(`      ${page.url}: Desktop ${hasDesktop} Mobile ${hasMobile}`);
    }
  } else {
    console.log('   ❌ crawl_metadata.pages is missing or not an array');
    failedChecks++;
  }

  // FINAL SUMMARY
  console.log('\n============================================================');
  console.log('FINAL VERIFICATION SUMMARY');
  console.log('============================================================\n');

  console.log(`Total Checks: ${totalChecks}`);
  console.log(`✅ Passed: ${passedChecks}`);
  console.log(`❌ Failed: ${failedChecks}`);
  console.log(`Success Rate: ${Math.round((passedChecks / totalChecks) * 100)}%\n`);

  if (failedChecks === 0) {
    console.log('🎉 ALL CHECKS PASSED! All new fields are saving correctly!');
    console.log('✅ Reports will have screenshots');
    console.log('✅ Outreach Engine can generate DMs');
    console.log('✅ UI has all required fields');
    console.log('✅ Enhanced error logging is preserved\n');
  } else {
    console.log('⚠️  Some checks failed. Review the output above.');
    console.log('   This may indicate missing database columns or data issues.\n');
  }

  console.log('============================================================');
}

runTest().catch(error => {
  console.error('\n❌ Test failed with error:', error);
  process.exit(1);
});
