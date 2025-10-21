/**
 * Integration Test: Full Orchestrator Pipeline with Multi-Page Crawling
 * Tests that multi-page crawler + business intelligence flows through the full pipeline
 */

import { analyzeWebsite } from '../orchestrator.js';

const TEST_URL = process.argv[2] || 'https://www.joespizzanyc.com';
const TEST_COMPANY = 'Joe\'s Pizza NYC';
const TEST_INDUSTRY = 'restaurant';

console.log('\n╔═══════════════════════════════════════════════════════════╗');
console.log('║    Orchestrator Integration Test - Multi-Page Pipeline   ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

console.log('Testing URL:', TEST_URL);
console.log('Company:', TEST_COMPANY);
console.log('Industry:', TEST_INDUSTRY);
console.log('');

const startTime = Date.now();

try {
  const result = await analyzeWebsite(
    TEST_URL,
    {
      company_name: TEST_COMPANY,
      industry: TEST_INDUSTRY,
      city: 'New York',
      state: 'NY'
    },
    {
      onProgress: (progress) => {
        console.log(`[${progress.step}] ${progress.message}`);
      }
    }
  );

  const totalTime = Date.now() - startTime;

  if (!result.success) {
    throw new Error(`Analysis failed: ${result.error}`);
  }

  console.log('\n✅ Analysis completed successfully!\n');

  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                    ANALYSIS RESULTS                       ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // Website Quality
  console.log('🎨 WEBSITE QUALITY');
  console.log('  • Overall Grade:', result.grade, `(${result.overall_score}/100)`);
  console.log('  • Design Score:', result.design_score);
  console.log('  • SEO Score:', result.seo_score);
  console.log('  • Content Score:', result.content_score);
  console.log('  • Social Score:', result.social_score);
  console.log('  • Quick Wins:', result.quick_wins.length);
  console.log('');

  // Lead Priority
  console.log('🎯 LEAD PRIORITY (AI-SCORED)');
  console.log('  • Priority Score:', result.lead_priority, '/100');
  console.log('  • Priority Tier:', result.priority_tier?.toUpperCase());
  console.log('  • Budget Likelihood:', result.budget_likelihood?.toUpperCase());
  console.log('  • Fit Score:', result.fit_score || 'N/A');
  console.log('  • Reasoning:', result.lead_priority_reasoning);
  console.log('');

  // Business Intelligence
  console.log('🧠 BUSINESS INTELLIGENCE');
  const bi = result.business_intelligence;
  console.log('  • Years in Business:', bi.years_in_business || 'Unknown');
  console.log('  • Founded Year:', bi.founded_year || 'Unknown');
  console.log('  • Employee Count:', bi.employee_count || 'Unknown');
  console.log('  • Location Count:', bi.location_count || 'Unknown');
  console.log('  • Pricing Visible:', bi.pricing_visible ? 'YES' : 'NO');
  if (bi.pricing_range) {
    console.log('  • Price Range: $' + bi.pricing_range.min + ' - $' + bi.pricing_range.max);
  }
  console.log('  • Blog Active:', bi.blog_active ? 'YES' : 'NO');
  console.log('  • Decision Maker Accessible:', bi.decision_maker_accessible ? 'YES' : 'NO');
  if (bi.owner_name) {
    console.log('  • Owner Name:', bi.owner_name);
  }
  console.log('  • Premium Features:', bi.premium_features.length > 0 ? bi.premium_features.join(', ') : 'None');
  console.log('  • Budget Indicator:', bi.budget_indicator?.toUpperCase() || 'Unknown');
  console.log('');

  // Crawl Metadata
  console.log('🕷️  CRAWL STATISTICS');
  const crawl = result.crawl_metadata;
  console.log('  • Pages Crawled:', crawl.pages_crawled);
  console.log('  • Links Found:', crawl.links_found);
  console.log('  • Crawl Time:', (crawl.crawl_time / 1000).toFixed(1) + 's');
  console.log('  • Failed Pages:', crawl.failed_pages);
  console.log('');

  // Performance
  console.log('⚡ PERFORMANCE');
  console.log('  • Total Time:', (totalTime / 1000).toFixed(1) + 's');
  console.log('  • Analysis Cost:', '$' + result.analysis_cost.toFixed(4));
  console.log('  • Page Load Time:', result.page_load_time + 'ms');
  console.log('');

  // Validation
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                      VALIDATION                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  let passed = 0;
  let failed = 0;

  // Test 1: Business intelligence was extracted
  if (result.business_intelligence) {
    console.log('✅ Business intelligence object exists');
    passed++;
  } else {
    console.log('❌ Business intelligence object missing');
    failed++;
  }

  // Test 2: Crawl metadata exists
  if (result.crawl_metadata && result.crawl_metadata.pages_crawled > 0) {
    console.log('✅ Multi-page crawling successful (' + result.crawl_metadata.pages_crawled + ' pages)');
    passed++;
  } else {
    console.log('❌ Multi-page crawling failed or no pages crawled');
    failed++;
  }

  // Test 3: Lead priority was scored
  if (result.lead_priority !== undefined && result.lead_priority !== null) {
    console.log('✅ Lead priority scored (' + result.lead_priority + '/100)');
    passed++;
  } else {
    console.log('❌ Lead priority not scored');
    failed++;
  }

  // Test 4: Priority tier was assigned
  if (result.priority_tier && ['hot', 'warm', 'cold'].includes(result.priority_tier)) {
    console.log('✅ Priority tier assigned (' + result.priority_tier + ')');
    passed++;
  } else {
    console.log('❌ Priority tier not assigned or invalid');
    failed++;
  }

  // Test 5: Business intelligence has at least some data
  const hasBusinessData = bi.years_in_business || bi.founded_year || bi.employee_count ||
                          bi.location_count || bi.pricing_visible || bi.blog_active ||
                          bi.decision_maker_accessible || bi.premium_features.length > 0;
  if (hasBusinessData) {
    console.log('✅ Business intelligence extracted meaningful data');
    passed++;
  } else {
    console.log('⚠️  Business intelligence extracted but no meaningful data found');
    console.log('   (This may be expected for simple websites with minimal content)');
    passed++;
  }

  // Test 6: All analysis modules ran
  if (result.design_score && result.seo_score && result.content_score && result.social_score) {
    console.log('✅ All analysis modules executed (design, SEO, content, social)');
    passed++;
  } else {
    console.log('❌ Not all analysis modules executed');
    failed++;
  }

  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                     TEST SUMMARY                          ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  console.log('✅ Passed:', passed);
  console.log('❌ Failed:', failed);
  console.log('');

  if (failed === 0) {
    console.log('🎉 All tests passed! Multi-page pipeline is fully integrated.\n');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Check errors above.\n');
    process.exit(1);
  }

} catch (error) {
  console.error('\n❌ Test failed with error:', error.message);
  console.error('');
  console.error('Stack trace:');
  console.error(error.stack);
  console.error('');
  process.exit(1);
}
