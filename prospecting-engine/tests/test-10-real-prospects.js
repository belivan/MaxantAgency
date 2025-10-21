import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { analyzeWebsiteIntelligent } from './analysis-engine/orchestrator.js';

// Load environment
dotenv.config({ path: './analysis-engine/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test10RealProspects() {
  console.log('🧪 Testing Intelligent Multi-Page Analysis - 10 REAL PROSPECTS\n');
  console.log('============================================================\n');

  // Fetch 10 prospects from database
  console.log('📊 Fetching 10 prospects from database...');
  const { data: prospects, error } = await supabase
    .from('prospects')
    .select('id, company_name, website, industry, city, state')
    .not('website', 'is', null)
    .limit(10);

  if (error) {
    console.error('❌ Database error:', error.message);
    process.exit(1);
  }

  if (!prospects || prospects.length === 0) {
    console.error('❌ No prospects found in database');
    process.exit(1);
  }

  console.log(`✅ Found ${prospects.length} prospects:\n`);
  prospects.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.company_name} (${p.website})`);
  });
  console.log('\n============================================================\n');

  const startTime = Date.now();
  const results = [];

  for (let i = 0; i < prospects.length; i++) {
    const prospect = prospects[i];
    console.log(`\n[${i + 1}/${prospects.length}] Analyzing ${prospect.company_name}...`);
    console.log(`URL: ${prospect.website}`);
    console.log(`Industry: ${prospect.industry || 'unknown'}`);
    console.log(`Location: ${prospect.city || '?'}, ${prospect.state || '?'}`);
    console.log('------------------------------------------------------------');

    const testStart = Date.now();

    try {
      const result = await analyzeWebsiteIntelligent(prospect.website, {
        company_name: prospect.company_name,
        industry: prospect.industry || 'unknown',
        city: prospect.city,
        state: prospect.state,
        prospect_id: prospect.id
      });

      const testDuration = ((Date.now() - testStart) / 1000).toFixed(1);

      if (result.success) {
        // Save to database
        const leadData = {
          prospect_id: prospect.id,
          company_name: prospect.company_name,
          industry: prospect.industry,
          url: result.url,
          city: prospect.city,
          state: prospect.state,

          // Grading
          website_grade: result.grade,
          overall_score: Math.round(result.overall_score),

          // Scores
          design_score: result.design_score,
          design_score_desktop: result.design_score_desktop,
          design_score_mobile: result.design_score_mobile,
          seo_score: result.seo_score,
          content_score: result.content_score,
          social_score: result.social_score,
          accessibility_score: result.accessibility_score,

          // Model tracking
          seo_analysis_model: result.seo_analysis_model,
          content_analysis_model: result.content_analysis_model,
          desktop_visual_model: result.desktop_visual_model,
          mobile_visual_model: result.mobile_visual_model,
          social_analysis_model: result.social_analysis_model,
          accessibility_analysis_model: result.accessibility_analysis_model,

          // Issues
          design_issues_desktop: result.design_issues_desktop,
          design_issues_mobile: result.design_issues_mobile,
          seo_issues: result.seo_issues,
          content_issues: result.content_issues,
          social_issues: result.social_issues,
          accessibility_issues: result.accessibility_issues,
          accessibility_wcag_level: result.accessibility_wcag_level,
          accessibility_compliance: result.accessibility_compliance,

          // Insights
          quick_wins: result.quick_wins,
          top_issue: result.top_issue,
          one_liner: result.one_liner,

          // Metadata
          tech_stack: result.tech_stack,
          has_blog: result.has_blog,
          has_https: result.has_https,

          // Social
          social_profiles: result.social_profiles,
          social_platforms_present: result.social_platforms_present,

          // Page data
          page_title: result.page_title,
          meta_description: result.meta_description,

          // Intelligent analysis metadata
          pages_discovered: result.intelligent_analysis?.pages_discovered || 0,
          pages_crawled: result.intelligent_analysis?.pages_crawled || 0,

          // Crawl metadata with enhanced error logging
          crawl_metadata: result.crawl_metadata,

          // Performance
          analysis_cost: result.analysis_cost,
          analysis_time: result.analysis_time,
          analyzed_at: result.analyzed_at,

          status: 'ready_for_outreach'
        };

        const { error: saveError } = await supabase
          .from('leads')
          .upsert(leadData, { onConflict: 'url' });

        if (saveError) {
          console.log(`⚠️  Database save failed: ${saveError.message}`);
        }

        results.push({
          name: prospect.company_name,
          success: true,
          grade: result.grade,
          score: result.overall_score,
          pages_discovered: result.intelligent_analysis?.pages_discovered || 0,
          pages_crawled: result.intelligent_analysis?.pages_crawled || 0,
          discovery_errors: result.crawl_metadata?.discovery_errors || {},
          failed_pages: result.crawl_metadata?.failed_pages?.length || 0,
          duration: testDuration
        });

        console.log(`✅ SUCCESS - Grade: ${result.grade} (${result.overall_score}/100)`);
        console.log(`   Design: ${result.design_score}/100 (Desktop: ${result.design_score_desktop}, Mobile: ${result.design_score_mobile})`);
        console.log(`   SEO: ${result.seo_score}/100`);
        console.log(`   Content: ${result.content_score}/100`);
        console.log(`   Social: ${result.social_score}/100`);
        console.log(`   Accessibility: ${result.accessibility_score}/100`);
        console.log(`   Pages: ${result.intelligent_analysis?.pages_crawled || 0}/${result.intelligent_analysis?.pages_discovered || 0} crawled`);
        console.log(`   Duration: ${testDuration}s`);
        console.log(`   💾 Saved to database`);
      } else {
        results.push({
          name: prospect.company_name,
          success: false,
          error: result.error,
          duration: testDuration
        });

        console.log(`❌ FAILED - ${result.error}`);
        console.log(`   Duration: ${testDuration}s`);
      }
    } catch (error) {
      const testDuration = ((Date.now() - testStart) / 1000).toFixed(1);
      results.push({
        name: prospect.company_name,
        success: false,
        error: error.message,
        duration: testDuration
      });

      console.log(`❌ ERROR - ${error.message}`);
      console.log(`   Duration: ${testDuration}s`);
    }
  }

  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n\n============================================================');
  console.log('📊 TEST SUMMARY');
  console.log('============================================================\n');

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`Total: ${results.length}`);
  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);
  console.log(`⏱️  Total Time: ${totalDuration}s (~${(totalDuration / 60).toFixed(1)} minutes)`);

  if (successful.length > 0) {
    console.log('\n✅ Successful Analyses:');
    successful.forEach(r => {
      console.log(`   ${r.name}: Grade ${r.grade} (${r.score}/100) - ${r.pages_crawled}/${r.pages_discovered} pages - ${r.duration}s`);
      if (r.failed_pages > 0) {
        console.log(`      ⚠️  ${r.failed_pages} pages failed to crawl`);
      }
      const discoveryErrors = Object.entries(r.discovery_errors).filter(([k, v]) => v !== null);
      if (discoveryErrors.length > 0) {
        console.log(`      ⚠️  Discovery errors: ${discoveryErrors.map(([k, v]) => k).join(', ')}`);
      }
    });

    const avgScore = (successful.reduce((sum, r) => sum + r.score, 0) / successful.length).toFixed(1);
    const avgPages = (successful.reduce((sum, r) => sum + r.pages_crawled, 0) / successful.length).toFixed(1);
    const avgDiscovered = (successful.reduce((sum, r) => sum + r.pages_discovered, 0) / successful.length).toFixed(0);
    const grades = successful.map(r => r.grade);
    const gradeCounts = {};
    grades.forEach(g => gradeCounts[g] = (gradeCounts[g] || 0) + 1);

    console.log(`\n   Average Score: ${avgScore}/100`);
    console.log(`   Grade Distribution: ${Object.entries(gradeCounts).map(([g, c]) => `${g}(${c})`).join(', ')}`);
    console.log(`   Average Pages: ${avgPages} crawled, ${avgDiscovered} discovered`);
  }

  if (failed.length > 0) {
    console.log('\n❌ Failed Analyses:');
    failed.forEach(r => {
      console.log(`   ${r.name}: ${r.error}`);
    });
  }

  console.log('\n============================================================\n');

  process.exit(failed.length === 0 ? 0 : 1);
}

test10RealProspects().catch(error => {
  console.error('\n============================================================');
  console.error('❌ TEST CRASHED!');
  console.error('============================================================\n');
  console.error(error);
  process.exit(1);
});