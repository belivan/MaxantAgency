/**
 * Quick Test: Single Website E2E
 * 
 * Fast test with one website to verify orchestrator works
 */

import { analyzeWebsiteIntelligent } from '../orchestrator-refactored.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

async function quickTest() {
  const testUrl = 'https://maksant.com';
  const testContext = {
    company_name: 'Maksant',
    industry: 'Technology',
    prospect_id: 'quick-test-001'
  };

  console.log('\n🚀 Quick Test: Refactored Orchestrator\n');
  console.log('='.repeat(60));
  console.log(`Testing: ${testUrl}`);
  console.log(`Company: ${testContext.company_name}`);
  console.log('='.repeat(60) + '\n');

  const options = {
    maxPagesPerModule: 1, // VERY small for quick testing (1 page per module = 4 total unique pages)
    onProgress: (progress) => {
      console.log(`  ✓ ${progress.message}`);
    }
  };

  try {
    const startTime = Date.now();
    const results = await analyzeWebsiteIntelligent(testUrl, testContext, options);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n' + '='.repeat(60));
    console.log('✅ ANALYSIS COMPLETE!');
    console.log('='.repeat(60) + '\n');

    console.log('📊 Results Summary:\n');
    console.log(`  Overall Score: ${results.overall_score}/100`);
    console.log(`  Grade: ${results.website_grade}`);
    console.log(`  Lead Priority: ${results.lead_priority}/100 (${results.priority_tier})`);
    console.log(`  \n  SEO: ${results.seo_score}/100`);
    console.log(`  Content: ${results.content_score}/100`);
    console.log(`  Design: ${results.design_score}/100`);
    console.log(`  Social: ${results.social_score}/100`);
    console.log(`  Accessibility: ${results.accessibility_score}/100`);
    console.log(`  \n  Quick Wins: ${results.quick_wins.length} identified`);
    console.log(`  Pages Discovered: ${results.total_pages_discovered}`);
    console.log(`  Pages Analyzed: ${results.pages_analyzed}`);
    console.log(`  Duration: ${duration}s`);
    console.log(`  Cost: $${results.total_cost.toFixed(4)}`);

    console.log('\n' + '='.repeat(60));
    console.log('🎉 Test passed! Orchestrator working correctly.\n');
    
    process.exit(0);

  } catch (error) {
    console.log('\n' + '='.repeat(60));
    console.log('❌ TEST FAILED');
    console.log('='.repeat(60));
    console.error('\nError:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

quickTest();
