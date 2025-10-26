/**
 * Quick Benchmark Matching Demo
 * Shows benchmark matching without full analysis
 */

import { findBestBenchmark } from '../services/benchmark-matcher.js';

console.log('⚡ QUICK BENCHMARK MATCHING DEMO\n');
console.log('===================================================================\n');

const testBusinesses = [
  {
    company_name: 'Local Pizza Place',
    industry: 'restaurant',
    url: 'https://joespizzanyc.com'
  },
  {
    company_name: 'Main Street Dental',
    industry: 'dentist',
    url: 'https://mainstreetdental.com'
  },
  {
    company_name: 'Quick Plumbing',
    industry: 'plumber',
    url: 'https://quickplumbing.com'
  }
];

for (const business of testBusinesses) {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🎯 ${business.company_name} (${business.industry})`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

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

    console.log(`\n   🎯 Key Similarities:`);
    result.match_metadata.key_similarities.forEach((s, i) => {
      console.log(`   ${i + 1}. ${s}`);
    });

    console.log(`\n   ⚖️  Key Differences:`);
    result.match_metadata.key_differences.forEach((d, i) => {
      console.log(`   ${i + 1}. ${d}`);
    });

    console.log(`\n   📊 Benchmark Scores:`);
    console.log(`   - Design: ${result.benchmark.design_score}/100`);
    console.log(`   - SEO: ${result.benchmark.seo_score}/100`);
    console.log(`   - Content: ${result.benchmark.content_score}/100`);
    console.log(`   - Accessibility: ${result.benchmark.accessibility_score}/100`);
    console.log(`   - Social: ${result.benchmark.social_score}/100`);

    console.log(`\n   💡 Strength Data Available:`);
    console.log(`   - Design Strengths: ${result.benchmark.design_strengths ? '✅ YES' : '❌ NO'}`);
    console.log(`   - SEO Strengths: ${result.benchmark.seo_strengths ? '✅ YES' : '❌ NO'}`);
    console.log(`   - Content Strengths: ${result.benchmark.content_strengths ? '✅ YES' : '❌ NO'}`);
    console.log(`   - Social Strengths: ${result.benchmark.social_strengths ? '✅ YES' : '❌ NO'}`);
    console.log(`   - Accessibility Strengths: ${result.benchmark.accessibility_strengths ? '✅ YES' : '❌ NO'}`);

  } else {
    console.log(`❌ NO MATCH FOUND: ${result.error}`);
  }
}

console.log('\n===================================================================');
console.log('✅ DEMO COMPLETE\n');
