/**
 * Integration Test: End-to-End Orchestrator Test
 * 
 * Tests the refactored orchestrator with a real website to ensure
 * all services work together correctly.
 */

import { analyzeWebsiteIntelligent } from '../../orchestrator-refactored.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../../../.env') });

async function runE2ETest() {
  console.log('\n🧪 END-TO-END ORCHESTRATOR TEST\n');
  console.log('Testing refactored orchestrator with real websites\n');
  console.log('='.repeat(60) + '\n');

  // Test with all three companies
  const testCases = [
    {
      url: 'https://apple.com',
      company_name: 'Apple Inc.',
      industry: 'Technology',
      prospect_id: 'e2e-test-001'
    },
    {
      url: 'https://maksant.com',
      company_name: 'Maksant',
      industry: 'Technology',
      prospect_id: 'e2e-test-002'
    },
    {
      url: 'https://notion.so',
      company_name: 'Notion',
      industry: 'SaaS',
      prospect_id: 'e2e-test-003'
    }
  ];

  let totalPassed = 0;
  let totalFailed = 0;

  for (const testCase of testCases) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing: ${testCase.url}`);
    console.log(`Company: ${testCase.company_name}`);
    console.log(`Industry: ${testCase.industry}`);
    console.log('='.repeat(60) + '\n');

    const testContext = {
      company_name: testCase.company_name,
      industry: testCase.industry,
      prospect_id: testCase.prospect_id
    };

  const options = {
    maxPagesPerModule: 3, // Keep small for faster testing
    onProgress: (progress) => {
      if (progress && progress.step && progress.message) {
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        console.log(`  [${timestamp}] [${progress.step}] ${progress.message}`);
      }
    }
  };

  try {
    const startTime = Date.now();
    
    console.log('\n🚀 Starting analysis...\n');
    const results = await analyzeWebsiteIntelligent(testCase.url, testContext, options);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Analysis completed successfully!');
    console.log('='.repeat(60) + '\n');

    // Validate results structure
    console.log('📊 VALIDATING RESULTS:\n');

    const validations = [
      { name: 'Overall Score', check: () => typeof results.overall_score === 'number' && results.overall_score >= 0 && results.overall_score <= 100 },
      { name: 'SEO Score', check: () => typeof results.seo_score === 'number' },
      { name: 'Content Score', check: () => typeof results.content_score === 'number' },
      { name: 'Design Score', check: () => typeof results.design_score === 'number' },
      { name: 'Social Score', check: () => typeof results.social_score === 'number' },
      { name: 'Accessibility Score', check: () => typeof results.accessibility_score === 'number' },
      { name: 'Website Grade', check: () => typeof results.website_grade === 'string' && ['A', 'B', 'C', 'D', 'F'].includes(results.website_grade) },
      { name: 'Quick Wins', check: () => Array.isArray(results.quick_wins) },
      { name: 'SEO Analysis', check: () => results.seo_analysis && typeof results.seo_analysis === 'object' },
      { name: 'Content Analysis', check: () => results.content_analysis && typeof results.content_analysis === 'object' },
      { name: 'Desktop Visual', check: () => results.desktop_visual_analysis && typeof results.desktop_visual_analysis === 'object' },
      { name: 'Mobile Visual', check: () => results.mobile_visual_analysis && typeof results.mobile_visual_analysis === 'object' },
      { name: 'Social Analysis', check: () => results.social_analysis && typeof results.social_analysis === 'object' },
      { name: 'Accessibility Analysis', check: () => results.accessibility_analysis && typeof results.accessibility_analysis === 'object' },
      { name: 'Lead Priority', check: () => typeof results.lead_priority === 'number' && results.lead_priority >= 0 && results.lead_priority <= 100 },
      { name: 'Priority Tier', check: () => typeof results.priority_tier === 'string' && ['Hot', 'Warm', 'Cold'].includes(results.priority_tier) },
      { name: 'Priority Reasoning', check: () => typeof results.priority_reasoning === 'string' },
      { name: 'Screenshots', check: () => results.screenshots && typeof results.screenshots === 'object' },
      { name: 'Total Pages Discovered', check: () => typeof results.total_pages_discovered === 'number' },
      { name: 'Pages Analyzed', check: () => typeof results.pages_analyzed === 'number' },
      { name: 'Analysis Time', check: () => typeof results.analysis_time === 'number' },
      { name: 'Total Cost', check: () => typeof results.total_cost === 'number' }
    ];

    let passed = 0;
    let failed = 0;

    for (const validation of validations) {
      try {
        if (validation.check()) {
          console.log(`  ✅ ${validation.name}`);
          passed++;
        } else {
          console.log(`  ❌ ${validation.name} - Invalid value`);
          failed++;
        }
      } catch (error) {
        console.log(`  ❌ ${validation.name} - ${error.message}`);
        failed++;
      }
    }

    // Print summary statistics
    console.log('\n' + '='.repeat(60));
    console.log('📈 RESULTS SUMMARY:\n');
    console.log(`  Overall Score: ${results.overall_score}/100 (Grade: ${results.website_grade})`);
    console.log(`  SEO: ${results.seo_score}/100`);
    console.log(`  Content: ${results.content_score}/100`);
    console.log(`  Design: ${results.design_score}/100`);
    console.log(`  Social: ${results.social_score}/100`);
    console.log(`  Accessibility: ${results.accessibility_score}/100`);
    console.log(`  \n  Lead Priority: ${results.lead_priority}/100 (${results.priority_tier})`);
    console.log(`  Quick Wins: ${results.quick_wins.length} identified`);
    console.log(`  \n  Pages Discovered: ${results.total_pages_discovered}`);
    console.log(`  Pages Analyzed: ${results.pages_analyzed}`);
    console.log(`  Analysis Time: ${duration}s`);
    console.log(`  Total Cost: $${results.total_cost.toFixed(4)}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ VALIDATION RESULTS:\n');
    console.log(`  Validations Passed: ${passed}/${validations.length}`);
    console.log(`  Validations Failed: ${failed}/${validations.length}`);

    console.log('\n' + '='.repeat(60));

    if (failed === 0) {
      console.log(`✅ ${testCase.url} - All validations passed!\n`);
      totalPassed++;
    } else {
      console.log(`⚠️  ${testCase.url} - Some validations failed.\n`);
      totalFailed++;
    }

  } catch (error) {
    console.log('\n' + '='.repeat(60));
    console.log(`❌ ${testCase.url} - TEST FAILED\n`);
    console.log('='.repeat(60));
    console.error('\nError:', error.message);
    console.error('\nStack trace:', error.stack);
    totalFailed++;
  }
  }

  // Final summary for all tests
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`\nTotal websites tested: ${testCases.length}`);
  console.log(`Passed: ${totalPassed} ✅`);
  console.log(`Failed: ${totalFailed} ❌`);
  console.log('\n' + '='.repeat(60));

  if (totalFailed === 0) {
    console.log('\n🎉 All tests passed! Orchestrator is working correctly.\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Review results above.\n');
    process.exit(1);
  }
}

// Run test
runE2ETest();
