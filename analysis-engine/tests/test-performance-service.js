/**
 * Test script for Performance Service
 *
 * Run: node tests/test-performance-service.js [URL]
 * Example: node tests/test-performance-service.js https://example.com
 */

import { PerformanceService } from '../services/performance-service.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function testPerformanceService() {
  console.log('🧪 Testing Performance Service\n');

  const service = new PerformanceService({
    onProgress: ({ step, message }) => console.log(`[Progress] ${message}`)
  });

  const testUrl = process.argv[2] || 'https://example.com';
  console.log(`Testing URL: ${testUrl}\n`);

  console.log('═'.repeat(70));
  console.log('TEST 1: PageSpeed Insights (Mobile)');
  console.log('═'.repeat(70));

  const psiMobile = await service.fetchPageSpeedInsights(testUrl, 'mobile');
  if (psiMobile.success) {
    console.log('✅ Success!');
    console.log(`Performance Score: ${psiMobile.data.performanceScore}/100`);
    console.log(`LCP: ${(psiMobile.data.lcp / 1000).toFixed(2)}s`);
    console.log(`FID: ${psiMobile.data.fid}ms`);
    console.log(`CLS: ${psiMobile.data.cls}`);
    console.log(`FCP: ${(psiMobile.data.fcp / 1000).toFixed(2)}s`);
    console.log(`TTI: ${(psiMobile.data.tti / 1000).toFixed(2)}s`);
    console.log(`\nTop 3 Opportunities:`);
    psiMobile.data.opportunities.slice(0, 3).forEach((opp, i) => {
      console.log(`  ${i + 1}. ${opp.title} (saves ${(opp.savings / 1000).toFixed(1)}s)`);
    });
  } else {
    console.log('❌ Failed:', psiMobile.error);
  }

  console.log('\n' + '═'.repeat(70));
  console.log('TEST 2: PageSpeed Insights (Desktop)');
  console.log('═'.repeat(70));

  const psiDesktop = await service.fetchPageSpeedInsights(testUrl, 'desktop');
  if (psiDesktop.success) {
    console.log('✅ Success!');
    console.log(`Performance Score: ${psiDesktop.data.performanceScore}/100`);
    console.log(`LCP: ${(psiDesktop.data.lcp / 1000).toFixed(2)}s`);
    console.log(`FID: ${psiDesktop.data.fid}ms`);
    console.log(`CLS: ${psiDesktop.data.cls}`);
  } else {
    console.log('❌ Failed:', psiDesktop.error);
  }

  console.log('\n' + '═'.repeat(70));
  console.log('TEST 3: Chrome UX Report (Mobile)');
  console.log('═'.repeat(70));

  const cruxMobile = await service.fetchCruxData(testUrl, 'PHONE');
  if (cruxMobile.success) {
    console.log('✅ Success!');
    const rating = cruxMobile.data.rating;
    console.log(`\nCore Web Vitals: ${rating.passingCount}/${rating.totalMetrics} Passing (${rating.passingPercentage}%)`);
    console.log(`Status: ${rating.message}`);

    console.log('\nMetric Breakdown:');
    rating.breakdown.forEach(m => {
      const icon = m.passing ? '✓' : '✗';
      const status = m.passing ? 'Good' : 'Needs Improvement';
      const displayValue = m.unit === 'ms'
        ? `${(m.value / 1000).toFixed(2)}s`
        : Number(m.value).toFixed(3);
      console.log(`  ${icon} ${m.metric}: ${status} (${displayValue})`);
    });

    console.log(`\nUser Experience Distribution (LCP):`);
    console.log(`  - Good: ${Math.round(cruxMobile.data.lcp.good * 100)}%`);
    console.log(`  - Needs Improvement: ${Math.round(cruxMobile.data.lcp.needsImprovement * 100)}%`);
    console.log(`  - Poor: ${Math.round(cruxMobile.data.lcp.poor * 100)}%`);
  } else {
    console.log(cruxMobile.noData ? '⚠️  No CrUX data (site needs more Chrome traffic)' : `❌ Failed: ${cruxMobile.error}`);
  }

  console.log('\n' + '═'.repeat(70));
  console.log('TEST 4: Chrome UX Report (Desktop)');
  console.log('═'.repeat(70));

  const cruxDesktop = await service.fetchCruxData(testUrl, 'DESKTOP');
  if (cruxDesktop.success) {
    console.log('✅ Success!');
    const rating = cruxDesktop.data.rating;
    console.log(`\nCore Web Vitals: ${rating.passingCount}/${rating.totalMetrics} Passing (${rating.passingPercentage}%)`);
    console.log(`Status: ${rating.message}`);

    console.log('\nMetric Breakdown:');
    rating.breakdown.forEach(m => {
      const icon = m.passing ? '✓' : '✗';
      const status = m.passing ? 'Good' : 'Needs Improvement';
      const displayValue = m.unit === 'ms'
        ? `${(m.value / 1000).toFixed(2)}s`
        : Number(m.value).toFixed(3);
      console.log(`  ${icon} ${m.metric}: ${status} (${displayValue})`);
    });
  } else {
    console.log(cruxDesktop.noData ? '⚠️  No CrUX data (site needs more Chrome traffic)' : `❌ Failed: ${cruxDesktop.error}`);
  }

  console.log('\n' + '═'.repeat(70));
  console.log('TEST 5: Combined Performance Data + Issue Generation');
  console.log('═'.repeat(70));

  const allData = await service.fetchAllPerformanceData(testUrl);
  const issues = service.generatePerformanceIssues(allData);

  console.log(`\n📊 Performance Analysis Summary:`);
  console.log(`  - PageSpeed Mobile: ${allData.pageSpeed.mobile ? allData.pageSpeed.mobile.performanceScore + '/100' : 'N/A'}`);
  console.log(`  - PageSpeed Desktop: ${allData.pageSpeed.desktop ? allData.pageSpeed.desktop.performanceScore + '/100' : 'N/A'}`);
  console.log(`  - CrUX Data Available: ${allData.crux.hasData ? 'YES' : 'NO'}`);
  console.log(`  - Issues Generated: ${issues.length}`);
  console.log(`  - API Errors: ${allData.errors.length}`);

  if (allData.errors.length > 0) {
    console.log(`\n⚠️  API Errors:`);
    allData.errors.forEach(err => {
      console.log(`  - ${err.source}: ${err.error}`);
    });
  }

  if (issues.length > 0) {
    console.log(`\n🔴 Performance Issues Found:`);
    issues.forEach((issue, i) => {
      console.log(`\n${i + 1}. ${issue.title}`);
      console.log(`   Severity: ${issue.severity.toUpperCase()}`);
      console.log(`   Category: ${issue.category}`);
      console.log(`   Impact: ${issue.impact}`);
      console.log(`   Source: ${issue.source}`);
      if (issue.estimatedTimeSavings) {
        console.log(`   Estimated Time Savings: ${(issue.estimatedTimeSavings / 1000).toFixed(1)}s`);
      }
    });
  } else {
    console.log(`\n✅ No critical performance issues detected!`);
  }

  console.log('\n' + '═'.repeat(70));
  console.log('✅ All tests complete!');
  console.log('═'.repeat(70));

  console.log('\n💡 Next Steps:');
  console.log('  1. Review the data above');
  console.log('  2. If APIs work, integration is ready');
  console.log('  3. Set ENABLE_PERFORMANCE_API=true in .env to enable in analysis pipeline');
}

testPerformanceService().catch(error => {
  console.error('\n❌ Test failed with error:', error);
  process.exit(1);
});
