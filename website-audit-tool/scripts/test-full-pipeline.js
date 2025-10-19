/**
 * Comprehensive Integration Test
 * Tests the complete pipeline: Scraping → Grok Extraction → Validation → Quality Check
 */

import { chromium } from 'playwright';
import { extractWithGrok, formatExtractionSummary } from './modules/grok-extractor.js';
import { validateJSON, validateQualityWithAI, formatValidationResult } from './modules/json-validator.js';
import dotenv from 'dotenv';

dotenv.config();

console.log('\n🚀 COMPREHENSIVE INTEGRATION TEST');
console.log('='.repeat(80));
console.log('Testing: Scraping → Grok Extraction → Validation → Quality Check\n');

// Test configuration - Batch 3: Philadelphia Local Businesses
const TEST_SITES = [
  // HVAC - Philadelphia
  { url: 'https://www.mcallisterenergy.com/', name: 'McAllister Energy', category: 'HVAC - Philly' },

  // Plumber - Philadelphia
  { url: 'https://www.rstbyers.com/', name: 'R.S. Byers Plumbing & Heating', category: 'Plumbing - Philly' },

  // Electrician - Philadelphia
  { url: 'https://www.paelec.com/', name: 'P.A. Electric', category: 'Electrician - Philly' },

  // Law Firm - Philadelphia
  { url: 'https://www.morganlewis.com/', name: 'Morgan, Lewis & Bockius', category: 'Law Firm - Philly' },

  // Restaurant - Philadelphia
  { url: 'https://www.zahavrestaurant.com/', name: 'Zahav Restaurant', category: 'Restaurant - Philly' },

  // Dental - Philadelphia
  { url: 'https://www.phillydental.com/', name: 'Philadelphia Dentistry', category: 'Dental - Philly' },

  // Accounting - Philadelphia
  { url: 'https://www.marcumllp.com/', name: 'Marcum LLP', category: 'Accounting - Philly' },

  // Marketing Agency - Philadelphia
  { url: 'https://www.barkleyus.com/', name: 'Barkley', category: 'Marketing - Philly' }
];

const ENABLE_QUALITY_CHECK = process.env.ENABLE_AI_QUALITY_CHECK === 'true';

// Check API keys
const requiredKeys = {
  'XAI_API_KEY': process.env.XAI_API_KEY,
  'OPENAI_API_KEY': ENABLE_QUALITY_CHECK ? process.env.OPENAI_API_KEY : 'not required'
};

console.log('Environment Check:');
Object.entries(requiredKeys).forEach(([key, value]) => {
  const status = value && value !== 'not required' ? '✅' : (value === 'not required' ? '⏭️' : '❌');
  console.log(`  ${status} ${key}: ${value ? (value === 'not required' ? 'Skipped' : 'Set') : 'Missing'}`);
});

if (!process.env.XAI_API_KEY) {
  console.error('\n❌ ERROR: XAI_API_KEY required for Grok extraction');
  process.exit(1);
}

console.log(`\nQuality Check: ${ENABLE_QUALITY_CHECK ? '✅ ENABLED' : '⏭️ DISABLED (set ENABLE_AI_QUALITY_CHECK=true to enable)'}\n`);
console.log('='.repeat(80));

/**
 * Test a single website through the full pipeline
 */
async function testWebsite(siteConfig) {
  const { url, name, category } = siteConfig;
  const results = {
    url,
    name,
    category: category || 'Unknown',
    phases: {},
    success: false,
    errors: [],
    totalCost: 0,
    totalDuration: 0
  };

  console.log(`\n${'='.repeat(80)}`);
  console.log(`TESTING: ${name} (${url})`);
  console.log('='.repeat(80));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // PHASE 1: SCRAPING
    console.log('\n📡 PHASE 1: SCRAPING');
    console.log('-'.repeat(80));
    const scrapeStart = Date.now();

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const html = await page.content();
    const scrapeDuration = Date.now() - scrapeStart;

    results.phases.scraping = {
      success: true,
      duration: scrapeDuration,
      htmlSize: html.length
    };

    console.log(`✅ Loaded in ${(scrapeDuration / 1000).toFixed(1)}s`);
    console.log(`   HTML size: ${(html.length / 1024).toFixed(1)}KB`);

    // PHASE 2: GROK EXTRACTION
    console.log('\n🤖 PHASE 2: GROK AI EXTRACTION');
    console.log('-'.repeat(80));
    const grokStart = Date.now();

    const extracted = await extractWithGrok(html, url, 'grok-4-fast', page);
    const grokDuration = Date.now() - grokStart;

    results.phases.grokExtraction = {
      success: true,
      duration: grokDuration,
      tokensUsed: extracted._meta.tokensUsed,
      usedFallback: extracted._meta.usedFallback
    };

    console.log(`✅ Extracted in ${(grokDuration / 1000).toFixed(1)}s`);
    console.log(`   Tokens: ${extracted._meta.tokensUsed.input} in / ${extracted._meta.tokensUsed.output} out`);
    if (extracted._meta.usedFallback) {
      console.log(`   ⚠️  Used fallback scraping for email/phone`);
    }

    // Calculate Grok cost
    const grokCost = (extracted._meta.tokensUsed.input / 1_000_000) * 0.20 +
                     (extracted._meta.tokensUsed.output / 1_000_000) * 0.50;
    results.totalCost += grokCost;

    console.log(`   Cost: $${grokCost.toFixed(4)}`);
    console.log('\nExtraction Summary:');
    console.log(formatExtractionSummary(extracted));

    // PHASE 3: STRUCTURE VALIDATION (Layer 1)
    console.log('\n🔍 PHASE 3: STRUCTURE VALIDATION (Layer 1)');
    console.log('-'.repeat(80));
    const validationStart = Date.now();

    // Convert extracted data back to JSON string for validation
    const extractedJSON = JSON.stringify(extracted);
    const validation = validateJSON(extractedJSON, 'grokExtraction');
    const validationDuration = Date.now() - validationStart;

    results.phases.structureValidation = {
      success: validation.isValid,
      duration: validationDuration,
      errors: validation.errors,
      warnings: validation.warnings
    };

    if (validation.isValid) {
      console.log(`✅ Structure validation PASSED (${validationDuration}ms)`);
    } else {
      console.log(`❌ Structure validation FAILED`);
      console.log('Errors:', validation.errors.join(', '));
      results.errors.push(...validation.errors);
    }

    // PHASE 4: QUALITY VALIDATION (Layer 2)
    if (ENABLE_QUALITY_CHECK) {
      console.log('\n✨ PHASE 4: AI QUALITY CHECK (Layer 2)');
      console.log('-'.repeat(80));

      const qualityStart = Date.now();
      const qualityCheck = await validateQualityWithAI(extracted, 'grokExtraction', {
        model: 'gpt-4o-mini',
        forceCheck: false // Only check if suspicious
      });
      const qualityDuration = Date.now() - qualityStart;

      results.phases.qualityValidation = {
        success: qualityCheck.isQualityGood,
        duration: qualityDuration,
        cost: qualityCheck.cost,
        skipped: qualityCheck.skipped,
        issues: qualityCheck.issues,
        fixed: !!qualityCheck.fixedVersion
      };

      results.totalCost += qualityCheck.cost;

      if (qualityCheck.skipped) {
        console.log(`✅ Quality check SKIPPED (no suspicious signals)`);
        console.log(`   Cost saved: $0.0001`);
      } else if (qualityCheck.isQualityGood) {
        console.log(`✅ Quality check PASSED`);
        console.log(`   Duration: ${qualityDuration}ms`);
        console.log(`   Cost: $${qualityCheck.cost.toFixed(4)}`);
      } else {
        console.log(`⚠️  Quality issues detected`);
        console.log(`   Issues: ${qualityCheck.issues.join(', ')}`);
        console.log(`   Duration: ${qualityDuration}ms`);
        console.log(`   Cost: $${qualityCheck.cost.toFixed(4)}`);
        if (qualityCheck.fixedVersion) {
          console.log(`   ✅ Auto-fixed version available`);
        }
      }
    } else {
      console.log('\n⏭️  PHASE 4: QUALITY CHECK SKIPPED (disabled)');
      console.log('-'.repeat(80));
      console.log('Set ENABLE_AI_QUALITY_CHECK=true to enable');
    }

    // PHASE 5: DATA QUALITY ASSESSMENT
    console.log('\n📊 PHASE 5: DATA QUALITY ASSESSMENT');
    console.log('-'.repeat(80));

    let score = 0;
    let maxScore = 0;
    const checks = [];

    // Company info (30 points)
    maxScore += 30;
    if (extracted?.companyInfo?.name) {
      score += 10;
      checks.push(`✅ Company name: ${extracted.companyInfo.name}`);
    } else {
      checks.push(`❌ Company name: Not found`);
    }
    if (extracted?.companyInfo?.industry) {
      score += 10;
      checks.push(`✅ Industry: ${extracted.companyInfo.industry}`);
    } else {
      checks.push(`⚠️  Industry: Not detected`);
    }
    if (extracted?.companyInfo?.location) {
      score += 10;
      checks.push(`✅ Location: ${extracted.companyInfo.location}`);
    } else {
      checks.push(`⚠️  Location: Not found`);
    }

    // Contact info (30 points)
    maxScore += 30;
    if (extracted?.contactInfo?.email) {
      score += 15;
      checks.push(`✅ Email: ${extracted.contactInfo.email}`);
    } else {
      checks.push(`❌ Email: Not found`);
    }
    if (extracted?.contactInfo?.phone) {
      score += 15;
      checks.push(`✅ Phone: ${extracted.contactInfo.phone}`);
    } else {
      checks.push(`❌ Phone: Not found`);
    }

    // Social profiles (20 points)
    maxScore += 20;
    const socialCount = [
      extracted?.socialProfiles?.linkedIn?.company,
      extracted?.socialProfiles?.instagram?.url,
      extracted?.socialProfiles?.twitter?.url,
      extracted?.socialProfiles?.facebook,
      extracted?.socialProfiles?.youtube
    ].filter(Boolean).length;
    const socialPoints = Math.min(20, socialCount * 4);
    score += socialPoints;
    checks.push(`${socialCount > 0 ? '✅' : '❌'} Social profiles: ${socialCount} found (${socialPoints}/20 pts)`);

    // Team info (10 points)
    maxScore += 10;
    if (extracted?.teamInfo?.founder?.name) {
      score += 10;
      checks.push(`✅ Founder: ${extracted.teamInfo.founder.name}`);
    } else {
      checks.push(`⚠️  Founder: Not found`);
    }

    // Content info (10 points)
    maxScore += 10;
    if (extracted?.contentInfo?.hasActiveBlog) {
      score += 5;
      checks.push(`✅ Blog: Active`);
    } else {
      checks.push(`⚠️  Blog: Not detected`);
    }
    if (extracted?.contentInfo?.recentPosts?.length > 0) {
      score += 5;
      checks.push(`✅ Recent posts: ${extracted.contentInfo.recentPosts.length} found`);
    }

    const percentage = Math.round((score / maxScore) * 100);

    // Determine quality grade
    let grade, gradeColor, recommendation;
    if (percentage >= 70) {
      grade = 'A';
      gradeColor = '🟢';
      recommendation = '✅ EXCELLENT - Ready to use for outreach';
    } else if (percentage >= 50) {
      grade = 'B';
      gradeColor = '🟡';
      recommendation = '⚠️  GOOD - Review contact info before use';
    } else if (percentage >= 30) {
      grade = 'C';
      gradeColor = '🟠';
      recommendation = '⚠️  FAIR - Verify data manually before outreach';
    } else if (percentage >= 10) {
      grade = 'D';
      gradeColor = '🔴';
      recommendation = '❌ POOR - Manual review required';
    } else {
      grade = 'F';
      gradeColor = '⛔';
      recommendation = '❌ FAILED - Do not use, re-scrape or skip';
    }

    // Detect suspicious signals
    const warnings = [];

    // Check for non-English company names
    if (extracted?.companyInfo?.name) {
      const hasNonLatin = /[^\x00-\x7F\u00C0-\u00FF]/.test(extracted.companyInfo.name);
      if (hasNonLatin) {
        warnings.push('⚠️  Company name contains non-Latin characters (possible wrong site/redirect)');
      }
    }

    // Check for malformed phone numbers
    if (extracted?.contactInfo?.phone && extracted.contactInfo.phone.length < 10) {
      warnings.push('⚠️  Phone number appears incomplete or malformed');
    }

    // Check for missing critical data
    if (!extracted?.contactInfo?.email && !extracted?.contactInfo?.phone) {
      warnings.push('🚨 CRITICAL: No contact information found (email or phone)');
    }

    // Check for very small HTML (JS-heavy sites)
    if (results.phases.scraping.htmlSize < 10000) {
      warnings.push('⚠️  Very small HTML (<10KB) - likely JavaScript-rendered content');
    }

    // Check for parent company mismatch
    if (extracted?.companyInfo?.name && name &&
        !extracted.companyInfo.name.toLowerCase().includes(name.toLowerCase().split(' ')[0].toLowerCase())) {
      warnings.push(`⚠️  Company name mismatch: Expected "${name}", got "${extracted.companyInfo.name}"`);
    }

    results.phases.dataQuality = {
      score,
      maxScore,
      percentage,
      grade,
      gradeColor,
      recommendation,
      warnings,
      checks
    };

    console.log(`\n${'='.repeat(80)}`);
    console.log(`QUALITY ASSESSMENT`);
    console.log('='.repeat(80));
    console.log(`Grade: ${gradeColor} ${grade} (${percentage}%)`);
    console.log(`Score: ${score}/${maxScore} points`);
    console.log(`Recommendation: ${recommendation}`);

    if (warnings.length > 0) {
      console.log(`\n🚨 WARNINGS (${warnings.length}):`);
      warnings.forEach(warning => console.log(`   ${warning}`));
    }

    console.log(`\nDetailed Checks:`);
    checks.forEach(check => console.log(`  ${check}`));

    // FINAL SUMMARY
    results.success = true;
    results.totalDuration = Date.now() - scrapeStart;

    console.log(`\n${'='.repeat(80)}`);
    console.log(`✅ TEST COMPLETE: ${name}`);
    console.log(`   Total duration: ${(results.totalDuration / 1000).toFixed(1)}s`);
    console.log(`   Total cost: $${results.totalCost.toFixed(4)}`);
    console.log(`   Quality: ${gradeColor} ${grade} (${percentage}%)`);
    console.log('='.repeat(80));

  } catch (error) {
    console.error(`\n❌ ERROR: ${error.message}`);
    results.success = false;
    results.errors.push(error.message);
  } finally {
    await browser.close();
  }

  return results;
}

/**
 * Run all tests and generate report
 */
async function runAllTests() {
  const startTime = Date.now();
  const allResults = [];

  for (const site of TEST_SITES) {
    const result = await testWebsite(site);
    allResults.push(result);

    // Wait between tests to avoid rate limiting
    if (TEST_SITES.indexOf(site) < TEST_SITES.length - 1) {
      console.log('\n⏳ Waiting 3 seconds before next test...\n');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  const totalDuration = Date.now() - startTime;

  // FINAL REPORT
  console.log('\n\n');
  console.log('='.repeat(80));
  console.log('FINAL REPORT');
  console.log('='.repeat(80));

  const successful = allResults.filter(r => r.success).length;
  const failed = allResults.filter(r => !r.success).length;
  const totalCost = allResults.reduce((sum, r) => sum + r.totalCost, 0);
  const avgQuality = allResults.reduce((sum, r) => sum + (r.phases.dataQuality?.percentage || 0), 0) / allResults.length;

  console.log('\nOverall Summary:');
  console.log(`  Total tests: ${allResults.length}`);
  console.log(`  Successful: ${successful} ✅`);
  console.log(`  Failed: ${failed} ${failed > 0 ? '❌' : ''}`);
  console.log(`  Total duration: ${(totalDuration / 1000).toFixed(1)}s`);
  console.log(`  Total cost: $${totalCost.toFixed(4)}`);
  console.log(`  Average quality: ${avgQuality.toFixed(0)}%`);

  // Category breakdown
  console.log('\nQuality by Category:');
  const categories = {};
  TEST_SITES.forEach(site => {
    const result = allResults.find(r => r.url === site.url);
    if (result && result.success && site.category) {
      if (!categories[site.category]) {
        categories[site.category] = { total: 0, count: 0 };
      }
      categories[site.category].total += result.phases.dataQuality.percentage;
      categories[site.category].count += 1;
    }
  });
  Object.entries(categories).sort((a, b) => (b[1].total / b[1].count) - (a[1].total / a[1].count)).forEach(([cat, data]) => {
    const avg = Math.round(data.total / data.count);
    console.log(`  ${cat}: ${avg}% (${data.count} site${data.count > 1 ? 's' : ''})`);
  });

  // Grade distribution
  console.log('\nGrade Distribution:');
  const grades = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  allResults.filter(r => r.success).forEach(r => {
    const grade = r.phases.dataQuality.grade;
    grades[grade]++;
  });
  console.log(`  🟢 A (70%+): ${grades.A} sites - Ready to use`);
  console.log(`  🟡 B (50-69%): ${grades.B} sites - Review before use`);
  console.log(`  🟠 C (30-49%): ${grades.C} sites - Manual verification needed`);
  console.log(`  🔴 D (10-29%): ${grades.D} sites - Poor quality`);
  console.log(`  ⛔ F (<10%): ${grades.F} sites - Do not use`);

  // Sites needing review
  const needsReview = allResults.filter(r =>
    r.success && r.phases.dataQuality?.warnings?.length > 0
  );
  if (needsReview.length > 0) {
    console.log(`\n🚨 SITES REQUIRING MANUAL REVIEW (${needsReview.length}):`);
    needsReview.forEach(r => {
      console.log(`\n  ${r.name} - ${r.phases.dataQuality.gradeColor} ${r.phases.dataQuality.grade}`);
      console.log(`    URL: ${r.url}`);
      r.phases.dataQuality.warnings.forEach(w => console.log(`    ${w}`));
    });
  }

  console.log('\nDetailed Results:');
  allResults.forEach(result => {
    const gradeIcon = result.success ? result.phases.dataQuality.gradeColor : '❌';
    const gradeText = result.success ? result.phases.dataQuality.grade : 'FAIL';
    console.log(`\n  ${gradeIcon} ${result.name} [${result.category}]`);
    console.log(`    URL: ${result.url}`);
    console.log(`    Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    if (result.success) {
      console.log(`    Grade: ${result.phases.dataQuality.gradeColor} ${result.phases.dataQuality.grade} (${result.phases.dataQuality.percentage}%)`);
      console.log(`    Recommendation: ${result.phases.dataQuality.recommendation}`);
      if (result.phases.dataQuality.warnings?.length > 0) {
        console.log(`    ⚠️  Warnings: ${result.phases.dataQuality.warnings.length}`);
      }
      console.log(`    Cost: $${result.totalCost.toFixed(4)}`);
      console.log(`    Duration: ${(result.totalDuration / 1000).toFixed(1)}s`);

      // Phase breakdown
      console.log(`    Phases:`);
      if (result.phases.scraping) {
        console.log(`      - Scraping: ${(result.phases.scraping.duration / 1000).toFixed(1)}s`);
      }
      if (result.phases.grokExtraction) {
        console.log(`      - Grok: ${(result.phases.grokExtraction.duration / 1000).toFixed(1)}s ($${((result.phases.grokExtraction.tokensUsed.input / 1_000_000) * 0.20 + (result.phases.grokExtraction.tokensUsed.output / 1_000_000) * 0.50).toFixed(4)})`);
      }
      if (result.phases.qualityValidation && !result.phases.qualityValidation.skipped) {
        console.log(`      - Quality Check: ${(result.phases.qualityValidation.duration / 1000).toFixed(1)}s ($${result.phases.qualityValidation.cost.toFixed(4)})`);
      }
    } else {
      console.log(`    Errors: ${result.errors.join(', ')}`);
    }
  });

  console.log('\n' + '='.repeat(80));
  console.log('Pipeline Components Tested:');
  console.log('  ✅ Playwright web scraping');
  console.log('  ✅ Grok AI extraction');
  console.log('  ✅ Traditional scraping fallback');
  console.log('  ✅ Structure validation (Layer 1)');
  console.log(`  ${ENABLE_QUALITY_CHECK ? '✅' : '⏭️ '} AI quality validation (Layer 2)`);
  console.log('  ✅ Data quality scoring');

  console.log('\n✅ INTEGRATION TEST COMPLETE!\n');

  return allResults;
}

// Run tests
runAllTests().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
