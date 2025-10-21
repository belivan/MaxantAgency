import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { analyzeWebsiteIntelligent } from './analysis-engine/orchestrator.js';

dotenv.config({ path: './analysis-engine/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

console.log('🧪 Testing 5 REAL PROSPECTS via Direct Orchestrator Call\n');

// 1. Get 5 prospect IDs (less to start)
console.log('📊 Fetching 5 prospect IDs...');
const { data: prospects, error } = await supabase
  .from('prospects')
  .select('id, company_name, website, industry')
  .limit(5);

if (error) {
  console.log('❌ Error:', error.message);
  process.exit(1);
}

console.log(`✅ Found ${prospects.length} prospects\n`);
prospects.forEach((p, i) => {
  console.log(`  ${i+1}. ${p.company_name} - ${p.website}`);
});

console.log('\n🚀 Starting analysis...\n');

// 2. Analyze each prospect
let successCount = 0;
for (let i = 0; i < prospects.length; i++) {
  const prospect = prospects[i];
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`[${i+1}/${prospects.length}] Analyzing: ${prospect.company_name}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  try {
    const result = await analyzeWebsiteIntelligent(prospect.website, {
      company_name: prospect.company_name || 'Unknown Company',
      industry: prospect.industry || 'unknown',
      project_id: null
    });

    if (result.success) {
      // Save to database
      const leadData = {
        url: result.url,
        company_name: result.company_name,
        industry: result.industry,

        // Scores
        overall_score: Math.round(result.overall_score),
        website_grade: result.grade,
        design_score: Math.round(result.design_score),
        design_score_desktop: result.design_score_desktop || Math.round(result.design_score),
        design_score_mobile: result.design_score_mobile || Math.round(result.design_score),
        seo_score: Math.round(result.seo_score),
        content_score: Math.round(result.content_score),
        social_score: Math.round(result.social_score),
        accessibility_score: Math.round(result.accessibility_score || 50),

        // Issues and wins
        design_issues: result.design_issues || [],
        design_issues_desktop: result.design_issues_desktop || [],
        design_issues_mobile: result.design_issues_mobile || [],
        seo_issues: result.seo_issues || [],
        content_issues: result.content_issues || [],
        social_issues: result.social_issues || [],
        accessibility_issues: result.accessibility_issues || [],
        accessibility_compliance: result.accessibility_compliance || {},
        quick_wins: result.quick_wins || [],

        // Top issue and one-liner
        top_issue: result.top_issue || null,
        one_liner: result.one_liner || null,

        // Model tracking
        seo_analysis_model: result.seo_analysis_model || null,
        content_analysis_model: result.content_analysis_model || null,
        desktop_visual_model: result.desktop_visual_model || null,
        mobile_visual_model: result.mobile_visual_model || null,
        social_analysis_model: result.social_analysis_model || null,
        accessibility_analysis_model: result.accessibility_analysis_model || null,

        // Screenshots
        screenshot_desktop_url: result.screenshot_desktop_url || null,
        screenshot_mobile_url: result.screenshot_mobile_url || null,

        // Social profiles
        social_profiles: result.social_profiles || {},
        social_platforms_present: result.social_platforms_present || [],

        // SEO/Tech metadata
        tech_stack: result.tech_stack || null,
        has_blog: result.has_blog || false,
        has_https: result.has_https || false,
        page_title: result.page_title || null,
        meta_description: result.meta_description || null,

        // Outreach support
        analysis_summary: result.analysis_summary || null,
        call_to_action: result.call_to_action || null,
        outreach_angle: result.outreach_angle || null,

        // Crawl metadata
        crawl_metadata: result.crawl_metadata || {},

        // Intelligent analysis metadata
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

      const { error: saveError } = await supabase
        .from('leads')
        .upsert(leadData, { onConflict: 'url' });

      if (saveError) {
        console.error(`\n❌ Failed to save to database:`, saveError.message);
      } else {
        console.log(`\n✅ SUCCESS!`);
        console.log(`   Grade: ${result.grade} (${result.overall_score}/100)`);
        console.log(`   Pages: ${result.intelligent_analysis?.pages_discovered || 0} discovered, ${result.intelligent_analysis?.pages_crawled || 0} crawled`);
        console.log(`   Screenshots: Desktop ${result.screenshot_desktop_url ? '✅' : '❌'} | Mobile ${result.screenshot_mobile_url ? '✅' : '❌'}`);
        console.log(`   Outreach Angle: ${result.outreach_angle ? '✅' : '❌'}`);
        successCount++;
      }
    } else {
      console.error(`\n❌ Analysis failed: ${result.error}`);
    }
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
  }

  console.log('');
}

console.log('\n' + '═'.repeat(50));
console.log(`🎉 TEST COMPLETE!`);
console.log(`   ${successCount}/${prospects.length} prospects analyzed and saved`);
console.log('═'.repeat(50));
