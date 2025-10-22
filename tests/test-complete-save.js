/**
 * Test Complete Analysis Flow with Database Save
 * Verifies that analysis results can be saved to the database without schema errors
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testDatabaseSave() {
  console.log('🧪 Testing Complete Analysis Database Save\n');
  console.log('═'.repeat(60));

  // First, get or create a test project
  let testProject;
  const { data: existingProjects } = await supabase
    .from('projects')
    .select('id, name')
    .limit(1);

  if (existingProjects && existingProjects.length > 0) {
    testProject = existingProjects[0];
    console.log(`✓ Using existing project: ${testProject.name} (${testProject.id})\n`);
  } else {
    const { data: newProject, error: projectError } = await supabase
      .from('projects')
      .insert({
        name: 'Test Project for Schema Verification',
        target_industry: 'restaurant',
        status: 'active'
      })
      .select()
      .single();

    if (projectError) {
      console.error('❌ Failed to create test project:', projectError.message);
      return false;
    }

    testProject = newProject;
    console.log(`✓ Created test project: ${testProject.name} (${testProject.id})\n`);
  }

  // Mock complete analysis result with ALL fields
  const mockAnalysisResult = {
    // Core information
    url: `https://test-complete-${Date.now()}.com`,
    company_name: 'Complete Test Restaurant',
    industry: 'restaurant',
    project_id: testProject.id,
    prospect_id: null,

    // Grading & Scores
    overall_score: 75,
    website_grade: 'B',
    design_score: 80,
    design_score_desktop: 82,
    design_score_mobile: 78,
    seo_score: 70,
    content_score: 75,
    social_score: 77,
    accessibility_score: 68,

    // Lead Scoring
    lead_priority: 85,
    lead_priority_reasoning: 'High-quality website with clear improvement opportunities',
    priority_tier: 'hot',
    budget_likelihood: 'medium',
    fit_score: 85,
    quality_gap_score: 70,
    budget_score: 75,
    urgency_score: 60,
    industry_fit_score: 90,
    company_size_score: 80,
    engagement_score: 70,

    // Issues
    design_issues: ['Navigation needs work'],
    design_issues_desktop: ['Hero image slow'],
    design_issues_mobile: ['Font too small'],
    desktop_critical_issues: 1,
    mobile_critical_issues: 2,
    seo_issues: ['Missing meta descriptions'],
    content_issues: ['CTA unclear'],
    social_issues: ['Broken link'],
    accessibility_issues: ['Images missing alt text'],
    accessibility_compliance: { wcag_a: true, wcag_aa: false },
    accessibility_wcag_level: 'A',
    quick_wins: ['Fix meta descriptions', 'Add alt text'],

    // Insights
    top_issue: { category: 'SEO', issue: 'Missing meta', impact: 'High' },
    one_liner: 'Good design, needs SEO work',
    analysis_summary: 'Website shows promise',
    call_to_action: 'Let us help you improve',
    outreach_angle: 'Quick SEO wins',

    // AI Models
    seo_analysis_model: 'gpt-4o-mini',
    content_analysis_model: 'gpt-4o-mini',
    desktop_visual_model: 'gpt-4o',
    mobile_visual_model: 'gpt-4o',
    social_analysis_model: 'grok-4-fast',
    accessibility_analysis_model: 'grok-4-fast',

    // Contact
    contact_email: 'test@example.com',
    contact_phone: '555-1234',
    contact_name: 'Test Contact',

    // Technical - ALL THE COLUMNS THAT WERE MISSING
    tech_stack: 'WordPress',
    has_blog: true, // ✓ Now exists
    has_https: true,
    is_mobile_friendly: true,
    page_load_time: 2500,
    page_title: 'Test Restaurant - Best Food', // ✓ Now exists
    meta_description: 'Amazing food at Test Restaurant', // ✓ Now exists

    // Screenshots
    screenshot_desktop_url: '/screenshots/test-desktop.png',
    screenshot_mobile_url: '/screenshots/test-mobile.png',

    // Social
    social_profiles: { facebook: 'https://facebook.com/test' },
    social_platforms_present: ['facebook'],
    social_metadata: { og_title: 'Test' },

    // Content
    content_insights: { word_count: 1200, headings: 8 }, // ✓ Now exists

    // Business Intelligence
    business_intelligence: { years_in_business: 5 },

    // Crawl metadata
    crawl_metadata: { pages_crawled: 5, crawl_time: 10 },
    pages_discovered: 10,
    pages_crawled: 5,
    pages_analyzed: 5,
    ai_page_selection: { strategy: 'intelligent' },

    // Performance
    analysis_cost: 0.15,
    analysis_time: 45000,

    // Discovery log
    discovery_log: { totalPages: 10, sources: ['sitemap'] },

    // Timestamps
    analyzed_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    console.log('📝 Attempting to save complete analysis result...\n');

    const { data: savedLead, error: saveError } = await supabase
      .from('leads')
      .insert(mockAnalysisResult)
      .select()
      .single();

    if (saveError) {
      console.error('❌ Database save failed:');
      console.error('Error code:', saveError.code);
      console.error('Error message:', saveError.message);
      console.error('Error details:', saveError.details);
      console.error('Error hint:', saveError.hint);
      return false;
    }

    console.log('✅ Analysis result saved successfully!');
    console.log('   Lead ID:', savedLead.id);
    console.log('   Company:', savedLead.company_name);
    console.log('   Grade:', savedLead.website_grade);
    console.log('   Score:', savedLead.overall_score);
    console.log('\n📊 Verified all columns:');
    console.log('   ✓ has_blog:', savedLead.has_blog);
    console.log('   ✓ page_title:', savedLead.page_title);
    console.log('   ✓ meta_description:', savedLead.meta_description);
    console.log('   ✓ content_insights:', JSON.stringify(savedLead.content_insights));

    // Clean up
    console.log('\n🧹 Cleaning up test record...');
    await supabase.from('leads').delete().eq('id', savedLead.id);
    console.log('✓ Test record cleaned up');

    return true;

  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  } finally {
    console.log('\n' + '═'.repeat(60));
  }
}

testDatabaseSave()
  .then(success => {
    if (success) {
      console.log('✅ Complete analysis flow test PASSED!');
      console.log('   All schema columns are working correctly.');
      console.log('   The analysis engine can now save leads without errors.');
      process.exit(0);
    } else {
      console.log('❌ Test FAILED - there may still be schema issues');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Test error:', error);
    process.exit(1);
  });
