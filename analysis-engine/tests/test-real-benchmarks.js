/**
 * Test Benchmark System on Real Websites
 */

process.env.USE_BENCHMARK_CONTEXT = 'true';
process.env.USE_AI_GRADING = 'true';

import { analyzeWebsiteIntelligent } from '../orchestrator-refactored.js';

console.log('🧪 TESTING BENCHMARK SYSTEM ON REAL WEBSITES\n');
console.log('===================================================================\n');

const testSites = [
  {
    url: 'https://www.chipotle.com',
    company_name: 'Chipotle Mexican Grill',
    industry: 'restaurant'
  },
  {
    url: 'https://www.panerabread.com',
    company_name: 'Panera Bread',
    industry: 'restaurant'
  }
];

for (const site of testSites) {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🎯 ANALYZING: ${site.company_name}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  try {
    const result = await analyzeWebsiteIntelligent(site.url, {
      company_name: site.company_name,
      industry: site.industry
    });

    console.log('\n📊 RESULTS:\n');
    console.log(`   Overall Grade: ${result.grade} (${result.overall_score}/100)`);
    console.log(`   Design Score: ${result.design_score}/100`);
    console.log(`   SEO Score: ${result.seo_score}/100`);
    console.log(`   Content Score: ${result.content_score}/100`);

    if (result.matched_benchmark) {
      console.log('\n🎯 BENCHMARK COMPARISON:\n');
      console.log(`   Matched To: ${result.matched_benchmark.company_name}`);
      console.log(`   Match Score: ${result.matched_benchmark.match_score}%`);
      console.log(`   Comparison Tier: ${result.matched_benchmark.comparison_tier}`);
      console.log(`   Benchmark Grade: ${result.matched_benchmark.scores.grade} (${result.matched_benchmark.scores.overall}/100)`);

      console.log('\n   Match Reasoning:');
      console.log(`   ${result.matched_benchmark.match_reasoning}`);

      console.log('\n   Similarities:');
      result.matched_benchmark.key_similarities.forEach((s, i) => {
        console.log(`   ${i + 1}. ${s}`);
      });

      console.log('\n   Differences:');
      result.matched_benchmark.key_differences.forEach((d, i) => {
        console.log(`   ${i + 1}. ${d}`);
      });

      // Show example of concrete comparisons in issues
      console.log('\n   📍 SAMPLE CONCRETE COMPARISONS:\n');
      const designIssues = result.design_issues_desktop?.slice(0, 2) || [];
      designIssues.forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue.title}`);
        console.log(`      ${issue.description.substring(0, 150)}...`);
      });
    } else {
      console.log('\n⚠️  NO BENCHMARK MATCHED');
    }

    console.log('\n✅ Analysis complete');

  } catch (error) {
    console.error(`\n❌ Error analyzing ${site.company_name}:`, error.message);
  }
}

console.log('\n===================================================================');
console.log('✅ ALL TESTS COMPLETE\n');
