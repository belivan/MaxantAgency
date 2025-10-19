/**
 * Test Grok-based extraction on sample websites
 * Compare quality to traditional scraping approach
 */

import { chromium } from 'playwright';
import { extractWithGrok, formatExtractionSummary, getBestContactEmail, getBestContactPerson, getMostRecentPost } from './modules/grok-extractor.js';
import dotenv from 'dotenv';

dotenv.config();

// Test websites
const TEST_SITES = [
  'https://mediaproper.com',
  'https://maksant.com'
];

async function testGrokExtraction(url) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Testing: ${url}`);
  console.log('='.repeat(80));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Load the website
    console.log('Loading website...');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Get HTML content
    const html = await page.content();
    console.log(`HTML loaded: ${(html.length / 1024).toFixed(1)}KB`);

    // Extract with Grok (pass page for fallback)
    console.log('\nExtracting data with Grok AI...');
    const startTime = Date.now();
    const extracted = await extractWithGrok(html, url, 'grok-4-fast', page);
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`\nExtraction completed in ${duration}s`);
    console.log(formatExtractionSummary(extracted));

    // Show helper function results
    console.log('=== HELPER FUNCTIONS ===\n');

    const bestEmail = getBestContactEmail(extracted);
    if (bestEmail) {
      console.log(`Best Contact Email: ${bestEmail.email} (${bestEmail.isGeneric ? 'generic' : 'personal'}, confidence: ${(bestEmail.confidence * 100).toFixed(0)}%)`);
    } else {
      console.log('Best Contact Email: Not found');
    }

    const bestPerson = getBestContactPerson(extracted);
    if (bestPerson) {
      console.log(`Best Contact Person: ${bestPerson.name} (${bestPerson.title})`);
      if (bestPerson.linkedIn) {
        console.log(`  LinkedIn: ${bestPerson.linkedIn}`);
      }
    } else {
      console.log('Best Contact Person: Not found');
    }

    const recentPost = getMostRecentPost(extracted);
    if (recentPost) {
      console.log(`Most Recent Post: "${recentPost.title}" (${recentPost.date})`);
    } else {
      console.log('Most Recent Post: Not found');
    }

    // Calculate quality score
    console.log('\n=== QUALITY SCORE ===\n');
    let score = 0;
    let maxScore = 0;

    // Company info (30 points)
    maxScore += 30;
    if (extracted?.companyInfo?.name) score += 10;
    if (extracted?.companyInfo?.industry) score += 10;
    if (extracted?.companyInfo?.description) score += 10;

    // Contact info (20 points)
    maxScore += 20;
    if (extracted?.contactInfo?.email) score += 10;
    if (extracted?.contactInfo?.phone) score += 10;

    // Social profiles (15 points)
    maxScore += 15;
    const socialCount = [
      extracted?.socialProfiles?.linkedIn?.company,
      extracted?.socialProfiles?.instagram?.url,
      extracted?.socialProfiles?.twitter?.url,
      extracted?.socialProfiles?.facebook,
      extracted?.socialProfiles?.youtube
    ].filter(Boolean).length;
    score += Math.min(15, socialCount * 3);

    // Team info (15 points)
    maxScore += 15;
    if (extracted?.teamInfo?.founder?.name) score += 10;
    if (extracted?.teamInfo?.keyPeople?.length > 0) score += 5;

    // Content info (10 points)
    maxScore += 10;
    if (extracted?.contentInfo?.hasActiveBlog) score += 5;
    if (extracted?.contentInfo?.recentPosts?.length > 0) score += 5;

    // Business intel (10 points)
    maxScore += 10;
    if (extracted?.businessIntel?.services?.length > 0) score += 5;
    if (extracted?.businessIntel?.valueProposition) score += 5;

    const percentage = Math.round((score / maxScore) * 100);
    console.log(`Overall Quality Score: ${score}/${maxScore} (${percentage}%)`);

    // Show personalization opportunities
    console.log('\n=== PERSONALIZATION OPPORTUNITIES ===\n');
    const opportunities = [];

    if (extracted?.companyInfo?.name) {
      opportunities.push(`✅ Can address email to "${extracted.companyInfo.name}"`);
    }
    if (bestPerson) {
      opportunities.push(`✅ Can address email to ${bestPerson.name} personally`);
    }
    if (extracted?.contactInfo?.email) {
      opportunities.push(`✅ Have direct email contact`);
    }
    if (socialCount >= 2) {
      opportunities.push(`✅ Can do multi-channel outreach (${socialCount} platforms found)`);
    }
    if (recentPost) {
      opportunities.push(`✅ Can reference recent content: "${recentPost.title}"`);
    }
    if (extracted?.businessIntel?.recentNews?.length > 0) {
      opportunities.push(`✅ Can reference recent news/achievements`);
    }
    if (extracted?.companyInfo?.location) {
      opportunities.push(`✅ Can mention their location (${extracted.companyInfo.location})`);
    }

    if (opportunities.length === 0) {
      console.log('❌ No personalization opportunities found');
    } else {
      opportunities.forEach(opp => console.log(opp));
    }

    console.log(`\n📊 Total opportunities: ${opportunities.length}/7`);

    // Cost estimate
    if (extracted?._meta?.tokensUsed) {
      const inputTokens = extracted._meta.tokensUsed.input;
      const outputTokens = extracted._meta.tokensUsed.output;
      // Grok-4-fast pricing: $0.20 per 1M input, $0.50 per 1M output
      const inputCost = (inputTokens / 1_000_000) * 0.20;
      const outputCost = (outputTokens / 1_000_000) * 0.50;
      const totalCost = inputCost + outputCost;

      console.log(`\n💰 Cost: $${totalCost.toFixed(4)} (${inputTokens.toLocaleString()} in + ${outputTokens.toLocaleString()} out)`);
    }

    return { url, extracted, score, maxScore, percentage, opportunities: opportunities.length };

  } catch (error) {
    console.error(`\n❌ Error testing ${url}:`, error.message);
    return { url, error: error.message, score: 0, maxScore: 100, percentage: 0, opportunities: 0 };
  } finally {
    await browser.close();
  }
}

async function runAllTests() {
  console.log('\n🚀 Starting Grok Extraction Tests\n');
  console.log('This will test Grok-based AI extraction on sample websites');
  console.log('and compare quality to traditional scraping approach.\n');

  if (!process.env.XAI_API_KEY) {
    console.error('❌ ERROR: XAI_API_KEY not found in .env file');
    console.error('Please add your xAI API key to continue.');
    process.exit(1);
  }

  const results = [];

  for (const url of TEST_SITES) {
    const result = await testGrokExtraction(url);
    results.push(result);

    // Wait a bit between requests
    if (TEST_SITES.indexOf(url) < TEST_SITES.length - 1) {
      console.log('\n⏳ Waiting 2 seconds before next test...\n');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Summary
  console.log('\n\n');
  console.log('='.repeat(80));
  console.log('SUMMARY OF ALL TESTS');
  console.log('='.repeat(80));

  results.forEach(r => {
    console.log(`\n${r.url}`);
    if (r.error) {
      console.log(`  ❌ Error: ${r.error}`);
    } else {
      console.log(`  Quality Score: ${r.score}/${r.maxScore} (${r.percentage}%)`);
      console.log(`  Personalization Opportunities: ${r.opportunities}/7`);
    }
  });

  const avgScore = results.reduce((sum, r) => sum + r.percentage, 0) / results.length;
  const avgOpp = results.reduce((sum, r) => sum + r.opportunities, 0) / results.length;

  console.log('\n' + '='.repeat(80));
  console.log('OVERALL RESULTS');
  console.log('='.repeat(80));
  console.log(`Average Quality Score: ${avgScore.toFixed(0)}%`);
  console.log(`Average Personalization Opportunities: ${avgOpp.toFixed(1)}/7`);
  console.log('\nCompare to traditional scraping:');
  console.log('  mediaproper.com: 37% → ?% (Grok)');
  console.log('  maksant.com: 13% → ?% (Grok)');
  console.log('\n✅ Test complete!\n');
}

runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
