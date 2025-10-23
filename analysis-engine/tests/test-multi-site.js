/**
 * Multi-Site Test
 * 
 * Test the refactored orchestrator with multiple different websites
 * to ensure it works across various site structures
 */

import { analyzeWebsiteIntelligent } from '../orchestrator-refactored.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

const testSites = [
  {
    url: 'https://example.com',
    context: {
      company_name: 'Example Company',
      industry: 'Technology',
      prospect_id: 'test-001'
    }
  },
  {
    url: 'https://github.com',
    context: {
      company_name: 'GitHub',
      industry: 'Technology',
      prospect_id: 'test-002'
    }
  },
  {
    url: 'https://stripe.com',
    context: {
      company_name: 'Stripe',
      industry: 'FinTech',
      prospect_id: 'test-003'
    }
  }
];

async function testMultipleSites() {
  console.log('\n🧪 Multi-Site Test: Refactored Orchestrator\n');
  console.log('='.repeat(70));
  console.log(`Testing ${testSites.length} different websites...\n`);

  const options = {
    maxPagesPerModule: 2, // Keep small for speed
    onProgress: (progress) => {
      if (progress.step === 'discovery' || progress.step === 'analysis') {
        console.log(`  → ${progress.message}`);
      }
    }
  };

  const results = [];

  for (const [index, site] of testSites.entries()) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`Test ${index + 1}/${testSites.length}: ${site.context.company_name}`);
    console.log(`URL: ${site.url}`);
    console.log('='.repeat(70));

    try {
      const startTime = Date.now();
      const result = await analyzeWebsiteIntelligent(site.url, site.context, options);
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log(`\n✅ SUCCESS (${duration}s)`);
      console.log(`  Score: ${result.overall_score}/100`);
      console.log(`  Grade: ${result.website_grade}`);
      console.log(`  Pages Discovered: ${result.total_pages_discovered}`);
      console.log(`  Pages Analyzed: ${result.pages_analyzed}`);
      console.log(`  Cost: $${result.total_cost.toFixed(4)}`);

      results.push({
        site: site.context.company_name,
        success: true,
        duration,
        score: result.overall_score,
        grade: result.website_grade,
        pages: result.pages_analyzed,
        cost: result.total_cost
      });

    } catch (error) {
      console.log(`\n❌ FAILED`);
      console.error(`  Error: ${error.message}`);
      
      results.push({
        site: site.context.company_name,
        success: false,
        error: error.message
      });
    }
  }

  // Summary
  console.log(`\n${'='.repeat(70)}`);
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(70) + '\n');

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  console.log(`Total Tests: ${results.length}`);
  console.log(`Passed: ${successCount} ✅`);
  console.log(`Failed: ${failCount} ❌`);
  console.log(`Success Rate: ${((successCount / results.length) * 100).toFixed(1)}%\n`);

  results.forEach((result, i) => {
    console.log(`${i + 1}. ${result.site}:`);
    if (result.success) {
      console.log(`   ✅ Score: ${result.score}, Grade: ${result.grade}, Pages: ${result.pages}, Time: ${result.duration}s`);
    } else {
      console.log(`   ❌ ${result.error}`);
    }
  });

  console.log('\n' + '='.repeat(70) + '\n');

  if (failCount === 0) {
    console.log('🎉 All tests passed!\n');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Review errors above.\n');
    process.exit(1);
  }
}

testMultipleSites();
