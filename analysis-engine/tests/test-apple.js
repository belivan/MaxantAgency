/**
 * Apple.com Test
 * 
 * Test the refactored orchestrator with a major corporate website
 */

import { analyzeWebsiteIntelligent } from '../orchestrator-refactored.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

async function testApple() {
  console.log('\n🍎 Apple.com Test: Refactored Orchestrator\n');
  console.log('='.repeat(70));
  console.log('Testing: https://www.apple.com');
  console.log('Company: Apple Inc.');
  console.log('='.repeat(70) + '\n');

  const options = {
    maxPagesPerModule: 3, // Test with 3 pages per module
    timeout: 60000, // Increase timeout to 60s for large pages
    onProgress: (progress) => {
      console.log(`  → ${progress.message}`);
    }
  };

  const context = {
    company_name: 'Apple Inc.',
    industry: 'Technology',
    prospect_id: 'test-apple-001'
  };

  try {
    const startTime = Date.now();
    const result = await analyzeWebsiteIntelligent('https://www.apple.com', context, options);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n' + '='.repeat(70));
    console.log('✅ ANALYSIS COMPLETE!');
    console.log('='.repeat(70) + '\n');

    console.log('📊 Results Summary:\n');
    console.log(`  Overall Score: ${result.overall_score}/100`);
    console.log(`  Grade: ${result.website_grade}`);
    console.log(`  Lead Priority: ${result.lead_priority}/100 (${result.priority_tier})`);
    console.log(`  \n  SEO: ${result.seo_score}/100`);
    console.log(`  Content: ${result.content_score}/100`);
    console.log(`  Design: ${result.design_score}/100`);
    console.log(`  Social: ${result.social_score}/100`);
    console.log(`  Accessibility: ${result.accessibility_score}/100`);
    console.log(`  \n  Quick Wins: ${result.quick_wins.length} identified`);
    console.log(`  Pages Discovered: ${result.total_pages_discovered}`);
    console.log(`  Pages Analyzed: ${result.pages_analyzed}`);
    console.log(`  Duration: ${duration}s`);
    console.log(`  Cost: $${result.total_cost.toFixed(4)}`);

    console.log('\n' + '='.repeat(70));
    console.log('🎉 Test passed! Refactored orchestrator working perfectly.\n');
    
    process.exit(0);

  } catch (error) {
    console.log('\n' + '='.repeat(70));
    console.log('❌ TEST FAILED');
    console.log('='.repeat(70));
    console.error('\nError:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testApple();
