/**
 * Test Intelligent Multi-Page Analysis System
 *
 * This tests the new AI-powered page selection and multi-page analysis
 */

import { analyzeWebsiteIntelligent } from './analysis-engine/orchestrator.js';

async function testIntelligentAnalysis() {
  console.log('🧪 Testing Intelligent Multi-Page Analysis System\n');
  console.log('='.repeat(60));

  const testUrl = 'https://www.example.com'; // Replace with a real website
  const testContext = {
    company_name: 'Example Company',
    industry: 'Technology',
    prospect_id: 'test-001'
  };

  console.log(`\n📊 Analyzing: ${testUrl}`);
  console.log(`🏭 Industry: ${testContext.industry}`);
  console.log(`🏢 Company: ${testContext.company_name}\n`);

  const startTime = Date.now();

  try {
    const result = await analyzeWebsiteIntelligent(testUrl, testContext, {
      maxPagesPerModule: 5, // Analyze up to 5 pages per module
      onProgress: (progress) => {
        console.log(`⏳ [${progress.step}] ${progress.message}`);
      }
    });

    const totalTime = Date.now() - startTime;

    console.log('\n' + '='.repeat(60));
    console.log('✅ ANALYSIS COMPLETE!');
    console.log('='.repeat(60));

    if (!result.success) {
      console.error('\n❌ Analysis failed:', result.error);
      return;
    }

    console.log('\n📈 RESULTS:');
    console.log(`  Overall Grade: ${result.grade} (${result.overall_score}/100)`);
    console.log(`  Design Score: ${result.design_score} (Desktop: ${result.design_score_desktop}, Mobile: ${result.design_score_mobile})`);
    console.log(`  SEO Score: ${result.seo_score}`);
    console.log(`  Content Score: ${result.content_score}`);
    console.log(`  Social Score: ${result.social_score}`);

    console.log('\n🤖 INTELLIGENT ANALYSIS:');
    const intel = result.intelligent_analysis;
    console.log(`  Pages Discovered: ${intel.pages_discovered}`);
    console.log(`  Pages Crawled: ${intel.pages_crawled}`);
    console.log(`  SEO Analysis: ${intel.pages_analyzed_seo} pages`);
    console.log(`  Content Analysis: ${intel.pages_analyzed_content} pages`);
    console.log(`  Visual Analysis: ${intel.pages_analyzed_visual} pages`);
    console.log(`  Social Analysis: ${intel.pages_analyzed_social} pages`);

    console.log('\n🎯 TOP ISSUES:');
    if (result.seo_issues.length > 0) {
      console.log(`  SEO: ${result.seo_issues.slice(0, 3).map(i => i.title).join(', ')}`);
    }
    if (result.design_issues_desktop.length > 0) {
      console.log(`  Desktop: ${result.design_issues_desktop.slice(0, 3).map(i => i.title).join(', ')}`);
    }
    if (result.design_issues_mobile.length > 0) {
      console.log(`  Mobile: ${result.design_issues_mobile.slice(0, 3).map(i => i.title).join(', ')}`);
    }

    console.log('\n⚡ QUICK WINS:');
    result.quick_wins.slice(0, 5).forEach((win, i) => {
      console.log(`  ${i + 1}. ${win}`);
    });

    console.log('\n💰 COST & TIME:');
    console.log(`  Analysis Cost: $${result.analysis_cost.toFixed(4)}`);
    console.log(`  Analysis Time: ${(totalTime / 1000).toFixed(1)}s`);

    console.log('\n💡 ONE-LINER:');
    console.log(`  "${result.one_liner}"`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ TEST PASSED!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testIntelligentAnalysis();