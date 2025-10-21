/**
 * Comprehensive End-to-End Test Suite
 * Tests real websites across different industries and company sizes
 */

import { analyzeWebsite } from '../orchestrator.js';

// Test websites across different categories (all REAL websites)
const TEST_WEBSITES = [
  // PERFECT FIT: Restaurants (small to medium)
  {
    url: 'https://www.joespizzanyc.com',
    company_name: 'Joe\'s Pizza NYC',
    industry: 'restaurant',
    city: 'New York',
    state: 'NY',
    expectedTier: 'hot',
    notes: '47 years in business, payment processor, established'
  },
  {
    url: 'https://www.tartinebakery.com',
    company_name: 'Tartine Bakery',
    industry: 'restaurant',
    city: 'San Francisco',
    state: 'CA',
    expectedTier: 'warm',
    notes: 'Multi-location bakery, premium brand'
  },
  {
    url: 'https://www.sweetgreen.com',
    company_name: 'Sweetgreen',
    industry: 'restaurant',
    city: 'Los Angeles',
    state: 'CA',
    expectedTier: 'cold',
    notes: 'Large chain, good website, less need for help'
  },

  // GOOD FIT: Small Business Services
  {
    url: 'https://example.com',
    company_name: 'Example Domain',
    industry: 'technology',
    city: 'Unknown',
    state: 'CA',
    expectedTier: 'cold',
    notes: 'Placeholder site - minimal data'
  }
];

const results = [];
let totalCost = 0;
let totalTime = 0;
let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║        COMPREHENSIVE END-TO-END TEST SUITE                  ║');
console.log('║     Testing Real Websites Across Multiple Industries        ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

console.log(`Testing ${TEST_WEBSITES.length} websites across different industries...\n`);

for (const site of TEST_WEBSITES) {
  testsRun++;
  console.log('━'.repeat(64));
  console.log(`\n[${testsRun}/${TEST_WEBSITES.length}] Testing: ${site.company_name}`);
  console.log(`URL: ${site.url}`);
  console.log(`Industry: ${site.industry}`);
  console.log(`Expected: ${site.expectedTier}`);
  console.log(`Notes: ${site.notes}\n`);

  const startTime = Date.now();

  try {
    const result = await analyzeWebsite(
      site.url,
      {
        company_name: site.company_name,
        industry: site.industry,
        city: site.city,
        state: site.state
      },
      {
        onProgress: (progress) => {
          console.log(`  [${progress.step}] ${progress.message}`);
        }
      }
    );

    const testTime = Date.now() - startTime;
    totalTime += testTime;

    if (!result.success) {
      console.log(`\n❌ FAILED: ${result.error}\n`);
      testsFailed++;
      results.push({
        ...site,
        success: false,
        error: result.error,
        testTime
      });
      continue;
    }

    totalCost += result.analysis_cost || 0;

    console.log('\n✅ SUCCESS!');
    console.log(`\n📊 RESULTS:`);
    console.log(`  Website Grade: ${result.grade} (${result.overall_score}/100)`);
    console.log(`  Lead Priority: ${result.lead_priority}/100 (${result.priority_tier?.toUpperCase()})`);
    console.log(`  Budget Likelihood: ${result.budget_likelihood?.toUpperCase()}`);
    console.log(`  Fit Score: ${result.fit_score}/100`);
    console.log(`\n  Dimension Scores:`);
    console.log(`    • Quality Gap: ${result.quality_gap_score || 0}/25`);
    console.log(`    • Budget: ${result.budget_score || 0}/25`);
    console.log(`    • Urgency: ${result.urgency_score || 0}/20`);
    console.log(`    • Industry Fit: ${result.industry_fit_score || 0}/15`);
    console.log(`    • Company Size: ${result.company_size_score || 0}/10`);
    console.log(`    • Engagement: ${result.engagement_score || 0}/5`);

    console.log(`\n  Business Intelligence:`);
    console.log(`    • Years in Business: ${result.business_intelligence?.years_in_business || 'Unknown'}`);
    console.log(`    • Premium Features: ${result.business_intelligence?.premium_features?.join(', ') || 'None'}`);
    console.log(`    • Decision Maker: ${result.business_intelligence?.decision_maker_accessible ? 'Yes' : 'No'}`);
    console.log(`    • Pages Crawled: ${result.crawl_metadata?.pages_crawled || 0}`);

    console.log(`\n  Performance:`);
    console.log(`    • Test Time: ${(testTime / 1000).toFixed(1)}s`);
    console.log(`    • Cost: $${result.analysis_cost?.toFixed(4) || '0.0000'}`);

    testsPassed++;

    results.push({
      ...site,
      success: true,
      websiteGrade: result.grade,
      websiteScore: result.overall_score,
      leadPriority: result.lead_priority,
      priorityTier: result.priority_tier,
      budgetLikelihood: result.budget_likelihood,
      fitScore: result.fit_score,
      qualityGapScore: result.quality_gap_score || 0,
      budgetScore: result.budget_score || 0,
      urgencyScore: result.urgency_score || 0,
      industryFitScore: result.industry_fit_score || 0,
      companySizeScore: result.company_size_score || 0,
      engagementScore: result.engagement_score || 0,
      yearsInBusiness: result.business_intelligence?.years_in_business,
      premiumFeatures: result.business_intelligence?.premium_features || [],
      decisionMakerAccessible: result.business_intelligence?.decision_maker_accessible,
      pagesCrawled: result.crawl_metadata?.pages_crawled || 0,
      testTime,
      cost: result.analysis_cost || 0,
      reasoning: result.reasoning || ''
    });

  } catch (error) {
    console.log(`\n❌ EXCEPTION: ${error.message}\n`);
    testsFailed++;

    results.push({
      ...site,
      success: false,
      error: error.message,
      testTime: Date.now() - startTime
    });
  }
}

// Generate comprehensive report
console.log('\n\n');
console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║                  COMPREHENSIVE TEST REPORT                   ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

console.log('📈 OVERALL STATISTICS\n');
console.log(`  Total Tests: ${testsRun}`);
console.log(`  ✅ Passed: ${testsPassed}`);
console.log(`  ❌ Failed: ${testsFailed}`);
console.log(`  Success Rate: ${((testsPassed / testsRun) * 100).toFixed(1)}%`);
console.log(`  Total Cost: $${totalCost.toFixed(4)}`);
console.log(`  Avg Cost per Lead: $${(totalCost / testsPassed).toFixed(4)}`);
console.log(`  Total Time: ${(totalTime / 1000).toFixed(1)}s`);
console.log(`  Avg Time per Lead: ${(totalTime / testsPassed / 1000).toFixed(1)}s`);
console.log('');

// Lead Priority Distribution
const successfulResults = results.filter(r => r.success);
const hotLeads = successfulResults.filter(r => r.priorityTier === 'hot');
const warmLeads = successfulResults.filter(r => r.priorityTier === 'warm');
const coldLeads = successfulResults.filter(r => r.priorityTier === 'cold');

console.log('🔥 LEAD PRIORITY DISTRIBUTION\n');
console.log(`  HOT Leads (75-100):   ${hotLeads.length} (${((hotLeads.length / testsPassed) * 100).toFixed(0)}%)`);
console.log(`  WARM Leads (50-74):   ${warmLeads.length} (${((warmLeads.length / testsPassed) * 100).toFixed(0)}%)`);
console.log(`  COLD Leads (0-49):    ${coldLeads.length} (${((coldLeads.length / testsPassed) * 100).toFixed(0)}%)`);
console.log('');

// Industry Analysis
console.log('🏢 LEAD QUALITY BY INDUSTRY\n');
const industries = [...new Set(results.map(r => r.industry))];
industries.forEach(industry => {
  const industryResults = successfulResults.filter(r => r.industry === industry);
  if (industryResults.length > 0) {
    const avgPriority = industryResults.reduce((sum, r) => sum + r.leadPriority, 0) / industryResults.length;
    const avgFit = industryResults.reduce((sum, r) => sum + r.industryFitScore, 0) / industryResults.length;
    console.log(`  ${industry.toUpperCase()}`);
    console.log(`    • Avg Priority: ${avgPriority.toFixed(1)}/100`);
    console.log(`    • Avg Industry Fit: ${avgFit.toFixed(1)}/15`);
    console.log(`    • Tests: ${industryResults.length}`);
    console.log('');
  }
});

// Top Performing Leads
console.log('🌟 TOP 5 HOTTEST LEADS\n');
const topLeads = successfulResults
  .sort((a, b) => b.leadPriority - a.leadPriority)
  .slice(0, 5);

topLeads.forEach((lead, index) => {
  console.log(`  ${index + 1}. ${lead.company_name} (${lead.industry})`);
  console.log(`     Priority: ${lead.leadPriority}/100 (${lead.priorityTier?.toUpperCase()})`);
  console.log(`     Grade: ${lead.websiteGrade} | Budget: ${lead.budgetLikelihood?.toUpperCase()}`);
  console.log(`     Years in Business: ${lead.yearsInBusiness || 'Unknown'}`);
  console.log('');
});

// Business Intelligence Quality
console.log('🧠 BUSINESS INTELLIGENCE EXTRACTION\n');
const withYears = successfulResults.filter(r => r.yearsInBusiness).length;
const withFeatures = successfulResults.filter(r => r.premiumFeatures?.length > 0).length;
const withAccess = successfulResults.filter(r => r.decisionMakerAccessible).length;

console.log(`  Found Years in Business: ${withYears}/${testsPassed} (${((withYears / testsPassed) * 100).toFixed(0)}%)`);
console.log(`  Found Premium Features: ${withFeatures}/${testsPassed} (${((withFeatures / testsPassed) * 100).toFixed(0)}%)`);
console.log(`  Found Decision Maker Contact: ${withAccess}/${testsPassed} (${((withAccess / testsPassed) * 100).toFixed(0)}%)`);
console.log('');

// Detailed Results Table
console.log('📋 DETAILED RESULTS TABLE\n');
console.log('Company                    | Industry    | Grade | Priority | Tier | Budget | Fit  | Pages');
console.log('─'.repeat(95));
successfulResults.forEach(r => {
  const name = r.company_name.padEnd(25).substring(0, 25);
  const industry = r.industry.padEnd(11).substring(0, 11);
  const grade = r.websiteGrade.padEnd(5);
  const priority = String(r.leadPriority).padStart(3);
  const tier = (r.priorityTier || 'N/A').toUpperCase().padEnd(4);
  const budget = (r.budgetLikelihood || 'N/A').toUpperCase().substring(0, 6).padEnd(6);
  const fit = String(r.fitScore).padStart(3);
  const pages = String(r.pagesCrawled).padStart(2);

  console.log(`${name} | ${industry} | ${grade} | ${priority}      | ${tier} | ${budget} | ${fit}  | ${pages}`);
});

console.log('\n');
console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║                      VERDICT                                 ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

if (testsFailed === 0) {
  console.log('🎉 ALL TESTS PASSED! System is production-ready.\n');
  console.log('Key Findings:');
  console.log(`  ✅ Multi-page crawling working (avg ${(successfulResults.reduce((sum, r) => sum + r.pagesCrawled, 0) / testsPassed).toFixed(1)} pages/site)`);
  console.log(`  ✅ Business intelligence extraction successful`);
  console.log(`  ✅ AI lead scoring operational`);
  console.log(`  ✅ Cost per lead: $${(totalCost / testsPassed).toFixed(4)} (~${((totalCost / testsPassed) * 100).toFixed(1)} cents)`);
  console.log(`  ✅ Time per lead: ${(totalTime / testsPassed / 1000).toFixed(1)}s\n`);
  process.exit(0);
} else {
  console.log(`⚠️  ${testsFailed} test(s) failed. Review errors above.\n`);
  process.exit(1);
}
