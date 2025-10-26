/**
 * Test Benchmark System Across Multiple Industries
 */

process.env.USE_BENCHMARK_CONTEXT = 'true';
process.env.USE_AI_GRADING = 'true';

import { findBestBenchmark } from '../services/benchmark-matcher.js';

console.log('🧪 TESTING BENCHMARK MATCHING ACROSS INDUSTRIES\n');
console.log('===================================================================\n');

const testBusinesses = [
  {
    company_name: 'Smile Dental Care',
    industry: 'dentist',
    url: 'https://smiledentalcare.com',
    city: 'Denver',
    state: 'CO'
  },
  {
    company_name: 'QuickFix Plumbing',
    industry: 'plumber',
    url: 'https://quickfixplumbing.com',
    city: 'Phoenix',
    state: 'AZ'
  },
  {
    company_name: 'The Local Bistro',
    industry: 'restaurant',
    url: 'https://localbistro.com',
    city: 'Seattle',
    state: 'WA'
  }
];

for (const business of testBusinesses) {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🎯 ${business.company_name} (${business.industry})`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  try {
    const result = await findBestBenchmark(business);

    if (result.success) {
      console.log(`✅ MATCHED TO: ${result.benchmark.company_name}`);
      console.log(`   URL: ${result.benchmark.website_url}`);
      console.log(`   Industry: ${result.benchmark.industry}`);
      console.log(`   Benchmark Grade: ${result.benchmark.overall_grade} (${result.benchmark.overall_score}/100)`);
      console.log(`   Match Confidence: ${result.match_metadata.match_score}%`);
      console.log(`   Comparison Tier: ${result.match_metadata.comparison_tier}`);

      console.log(`\n   📝 Match Reasoning:`);
      console.log(`   ${result.match_metadata.match_reasoning}`);

      console.log(`\n   📊 Benchmark Scores:`);
      console.log(`   - Design: ${result.benchmark.design_score}/100`);
      console.log(`   - SEO: ${result.benchmark.seo_score}/100`);
      console.log(`   - Performance: ${result.benchmark.performance_score}/100`);
      console.log(`   - Content: ${result.benchmark.content_score}/100`);
      console.log(`   - Accessibility: ${result.benchmark.accessibility_score}/100`);
      console.log(`   - Social: ${result.benchmark.social_score}/100`);

      console.log(`\n   💪 Strengths Available:`);
      console.log(`   - Design: ${result.benchmark.design_strengths ? '✅ ' + result.benchmark.design_strengths.length + ' items' : '❌ NO'}`);
      console.log(`   - SEO: ${result.benchmark.seo_strengths ? '✅ ' + result.benchmark.seo_strengths.length + ' items' : '❌ NO'}`);
      console.log(`   - Content: ${result.benchmark.content_strengths ? '✅ ' + result.benchmark.content_strengths.length + ' items' : '❌ NO'}`);

    } else {
      console.log(`❌ NO MATCH FOUND: ${result.error}`);
    }

  } catch (error) {
    console.error(`\n❌ Error testing ${business.company_name}:`, error.message);
  }
}

console.log('\n===================================================================');
console.log('✅ MULTI-INDUSTRY TEST COMPLETE\n');
