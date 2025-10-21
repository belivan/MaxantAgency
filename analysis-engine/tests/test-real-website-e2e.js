/**
 * End-to-End Test: Real Website Analysis
 * Tests multi-page crawler + business intelligence extractor on a real website
 */

import { crawlWebsite } from '../scrapers/multi-page-crawler.js';
import { extractBusinessIntelligence } from '../scrapers/business-intelligence-extractor.js';

// Test website - start with example.com to verify flow works
// Then can test with real SMB sites
const TEST_URL = process.argv[2] || 'https://example.com';

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║     Real Website E2E Test - Multi-Page Crawler + BI      ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

async function runE2ETest() {
  const startTime = Date.now();

  try {
    // STEP 1: Crawl the website
    console.log('📡 STEP 1: Crawling website...');
    console.log('Target URL:', TEST_URL);
    console.log('');

    const crawlResult = await crawlWebsite(TEST_URL, {
      maxTotalPages: 15,
      maxCrawlTime: 120000
    });

    if (!crawlResult || !crawlResult.homepage) {
      throw new Error(`Crawl failed: No homepage data returned`);
    }

    console.log('\n✅ Crawl completed successfully!');
    console.log('');
    console.log('📊 Crawl Statistics:');
    console.log('  • Pages crawled:', crawlResult.metadata.totalPagesCrawled);
    console.log('  • Links found:', crawlResult.metadata.totalLinksFound);
    console.log('  • Crawl time:', (crawlResult.metadata.crawlTime / 1000).toFixed(1) + 's');
    console.log('  • Failed pages:', crawlResult.metadata.failedPages?.length || 0);
    console.log('');

    // Show discovered pages
    console.log('🔍 Pages Discovered:');
    console.log('');
    console.log('  Homepage:');
    console.log('    • URL:', crawlResult.homepage.url);
    console.log('    • Depth: 0');
    console.log('    • Load time:', crawlResult.homepage.loadTime + 'ms');
    console.log('');

    if (crawlResult.pages.length > 0) {
      console.log('  Other Pages:');
      crawlResult.pages.forEach((page, idx) => {
        console.log(`    ${idx + 1}. ${page.url}`);
        console.log(`       • Depth: ${page.depth}`);
        console.log(`       • Load time: ${page.loadTime}ms`);
        console.log(`       • Found from: ${page.discoveredFrom}`);
      });
      console.log('');
    }

    // STEP 2: Extract business intelligence
    console.log('\n🧠 STEP 2: Extracting business intelligence...');
    console.log('');

    // Combine homepage + pages for business intelligence
    const allPages = [crawlResult.homepage, ...crawlResult.pages].filter(p => p && p.html);
    const businessIntel = extractBusinessIntelligence(allPages);

    console.log('✅ Business intelligence extraction completed!');
    console.log('');

    // STEP 3: Display results
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║              BUSINESS INTELLIGENCE REPORT                  ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');

    // Company Size
    console.log('👥 COMPANY SIZE');
    console.log('  • Employee count:', businessIntel.companySize?.employeeCount || 'Unknown');
    console.log('  • Location count:', businessIntel.companySize?.locationCount || 'Unknown');
    if (businessIntel.companySize?.signals?.length > 0) {
      console.log('  • Signals:');
      businessIntel.companySize.signals.forEach(signal => {
        console.log(`    - ${signal}`);
      });
    }
    console.log('  • Confidence:', businessIntel.companySize?.confidence || 'none');
    console.log('');

    // Years in Business
    console.log('📅 YEARS IN BUSINESS');
    console.log('  • Estimated years:', businessIntel.yearsInBusiness?.estimatedYears || 'Unknown');
    console.log('  • Founded year:', businessIntel.yearsInBusiness?.foundedYear || 'Unknown');
    if (businessIntel.yearsInBusiness?.signals?.length > 0) {
      console.log('  • Signals:');
      businessIntel.yearsInBusiness.signals.forEach(signal => {
        console.log(`    - ${signal}`);
      });
    }
    console.log('  • Confidence:', businessIntel.yearsInBusiness?.confidence || 'none');
    console.log('');

    // Pricing Visibility
    console.log('💰 PRICING VISIBILITY');
    console.log('  • Pricing visible:', businessIntel.pricingVisibility?.visible ? 'YES' : 'NO');
    if (businessIntel.pricingVisibility?.visible) {
      console.log('  • Price range: $' + businessIntel.pricingVisibility.priceRange?.min + ' - $' + businessIntel.pricingVisibility.priceRange?.max);
    }
    if (businessIntel.pricingVisibility?.signals?.length > 0) {
      console.log('  • Signals:');
      businessIntel.pricingVisibility.signals.forEach(signal => {
        console.log(`    - ${signal}`);
      });
    }
    console.log('  • Confidence:', businessIntel.pricingVisibility?.confidence || 'none');
    console.log('');

    // Content Freshness
    console.log('📝 CONTENT FRESHNESS');
    console.log('  • Blog active:', businessIntel.contentFreshness?.blogActive ? 'YES' : 'NO');
    if (businessIntel.contentFreshness?.lastUpdate) {
      console.log('  • Last update:', businessIntel.contentFreshness.lastUpdate);
    }
    if (businessIntel.contentFreshness?.postCount) {
      console.log('  • Post count:', businessIntel.contentFreshness.postCount);
    }
    if (businessIntel.contentFreshness?.signals?.length > 0) {
      console.log('  • Signals:');
      businessIntel.contentFreshness.signals.forEach(signal => {
        console.log(`    - ${signal}`);
      });
    }
    console.log('  • Confidence:', businessIntel.contentFreshness?.confidence || 'none');
    console.log('');

    // Decision Maker Accessibility
    console.log('📧 DECISION MAKER ACCESSIBILITY');
    console.log('  • Direct email:', businessIntel.decisionMakerAccessibility?.hasDirectEmail ? 'YES' : 'NO');
    console.log('  • Direct phone:', businessIntel.decisionMakerAccessibility?.hasDirectPhone ? 'YES' : 'NO');
    if (businessIntel.decisionMakerAccessibility?.ownerName) {
      console.log('  • Owner name:', businessIntel.decisionMakerAccessibility.ownerName);
    }
    if (businessIntel.decisionMakerAccessibility?.signals?.length > 0) {
      console.log('  • Signals:');
      businessIntel.decisionMakerAccessibility.signals.forEach(signal => {
        console.log(`    - ${signal}`);
      });
    }
    console.log('  • Confidence:', businessIntel.decisionMakerAccessibility?.confidence || 'none');
    console.log('');

    // Premium Features
    console.log('⚡ PREMIUM FEATURES');
    if (businessIntel.premiumFeatures?.detected?.length > 0) {
      console.log('  • Detected:', businessIntel.premiumFeatures.detected.join(', '));
    } else {
      console.log('  • Detected: None');
    }
    if (businessIntel.premiumFeatures?.signals?.length > 0) {
      console.log('  • Signals:');
      businessIntel.premiumFeatures.signals.forEach(signal => {
        console.log(`    - ${signal}`);
      });
    }
    console.log('  • Budget indicator:', businessIntel.premiumFeatures?.budgetIndicator || 'none');
    console.log('');

    // Page Types Summary
    console.log('📄 PAGE TYPES DETECTED');
    if (businessIntel.pageTypes) {
      Object.entries(businessIntel.pageTypes).forEach(([type, count]) => {
        if (count > 0) {
          console.log(`  • ${type}: ${count}`);
        }
      });
    }
    console.log('');

    // STEP 4: Lead Qualification Preview
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║              LEAD QUALIFICATION PREVIEW                    ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');

    // Calculate simple lead score
    let leadScore = 0;
    let scoreBreakdown = [];

    // Company size scoring
    if (businessIntel.companySize?.employeeCount) {
      if (businessIntel.companySize.employeeCount >= 10) {
        leadScore += 20;
        scoreBreakdown.push('Large company (10+ employees): +20');
      } else if (businessIntel.companySize.employeeCount >= 5) {
        leadScore += 15;
        scoreBreakdown.push('Medium company (5-10 employees): +15');
      } else {
        leadScore += 10;
        scoreBreakdown.push('Small company (<5 employees): +10');
      }
    }

    // Years in business
    if (businessIntel.yearsInBusiness?.estimatedYears) {
      if (businessIntel.yearsInBusiness.estimatedYears >= 10) {
        leadScore += 20;
        scoreBreakdown.push('Established business (10+ years): +20');
      } else if (businessIntel.yearsInBusiness.estimatedYears >= 5) {
        leadScore += 15;
        scoreBreakdown.push('Stable business (5-10 years): +15');
      } else {
        leadScore += 5;
        scoreBreakdown.push('New business (<5 years): +5');
      }
    }

    // Pricing visibility
    if (businessIntel.pricingVisibility?.visible) {
      leadScore += 15;
      scoreBreakdown.push('Transparent pricing: +15');
    }

    // Decision maker accessible
    if (businessIntel.decisionMakerAccessibility?.hasDirectEmail) {
      leadScore += 10;
      scoreBreakdown.push('Direct email available: +10');
    }
    if (businessIntel.decisionMakerAccessibility?.ownerName) {
      leadScore += 10;
      scoreBreakdown.push('Owner identified: +10');
    }

    // Premium features
    if (businessIntel.premiumFeatures?.budgetIndicator === 'high') {
      leadScore += 20;
      scoreBreakdown.push('High-budget features detected: +20');
    } else if (businessIntel.premiumFeatures?.budgetIndicator === 'medium') {
      leadScore += 10;
      scoreBreakdown.push('Medium-budget features detected: +10');
    }

    // Content activity
    if (businessIntel.contentFreshness?.blogActive) {
      leadScore += 10;
      scoreBreakdown.push('Active blog: +10');
    }

    console.log('🎯 Lead Score:', leadScore + '/100');
    console.log('');
    console.log('Score Breakdown:');
    scoreBreakdown.forEach(item => {
      console.log('  • ' + item);
    });
    console.log('');

    // Lead grade
    let leadGrade;
    if (leadScore >= 80) leadGrade = 'A (Hot Lead!)';
    else if (leadScore >= 65) leadGrade = 'B (Warm Lead)';
    else if (leadScore >= 50) leadGrade = 'C (Qualified)';
    else if (leadScore >= 35) leadGrade = 'D (Low Priority)';
    else leadGrade = 'F (Poor Fit)';

    console.log('📊 Lead Grade:', leadGrade);
    console.log('');

    // Summary
    const totalTime = Date.now() - startTime;
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                   TEST SUMMARY                             ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('✅ End-to-end test PASSED');
    console.log('');
    console.log('Performance:');
    console.log('  • Total time:', (totalTime / 1000).toFixed(1) + 's');
    console.log('  • Pages analyzed:', crawlResult.metadata.totalPagesCrawled);
    console.log('  • Time per page:', (totalTime / crawlResult.metadata.totalPagesCrawled / 1000).toFixed(1) + 's');
    console.log('');
    console.log('Data Quality:');
    console.log('  • Business intelligence extracted: YES');
    console.log('  • Page types detected:', Object.values(businessIntel.pageTypes || {}).reduce((a, b) => a + b, 0));
    console.log('  • Signals collected:', [
      ...(businessIntel.companySize?.signals || []),
      ...(businessIntel.yearsInBusiness?.signals || []),
      ...(businessIntel.pricingVisibility?.signals || []),
      ...(businessIntel.contentFreshness?.signals || []),
      ...(businessIntel.decisionMakerAccessibility?.signals || []),
      ...(businessIntel.premiumFeatures?.signals || [])
    ].length);
    console.log('');

    return {
      success: true,
      crawlResult,
      businessIntel,
      leadScore,
      leadGrade,
      totalTime
    };

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('');
    console.error('Error details:');
    console.error(error);
    console.error('');

    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
runE2ETest().then(result => {
  if (result.success) {
    console.log('🎉 All systems operational! Ready for integration.');
    process.exit(0);
  } else {
    console.log('❌ Test failed. Check errors above.');
    process.exit(1);
  }
});
