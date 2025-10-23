/**
 * Test Script: Compare Old vs New Orchestrator
 * 
 * Tests both orchestrators with the same input and compares results.
 * Helps validate that refactored version produces identical output.
 */

import { analyzeWebsiteIntelligent as analyzeOld } from '../orchestrator.js';
import { analyzeWebsiteIntelligent as analyzeNew } from '../orchestrator-refactored.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

// Test websites - Real companies
const testCases = [
  {
    url: 'https://apple.com',
    context: {
      company_name: 'Apple Inc.',
      industry: 'Technology',
      prospect_id: 'test-001'
    }
  },
  {
    url: 'https://maksant.com',
    context: {
      company_name: 'Maksant',
      industry: 'Technology',
      prospect_id: 'test-002'
    }
  },
  {
    url: 'https://notion.so',
    context: {
      company_name: 'Notion',
      industry: 'SaaS',
      prospect_id: 'test-003'
    }
  }
];

async function compareOrchestrators(testCase) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${testCase.url}`);
  console.log(`${'='.repeat(60)}\n`);

  const options = {
    maxPagesPerModule: 3, // Smaller for faster testing
    onProgress: (progress) => {
      console.log(`  [${progress.step}] ${progress.message}`);
    }
  };

  try {
    // Run OLD orchestrator
    console.log('\n🔵 Running OLD orchestrator...\n');
    const startOld = Date.now();
    const resultsOld = await analyzeOld(testCase.url, testCase.context, options);
    const timeOld = Date.now() - startOld;

    console.log(`\n✅ OLD completed in ${(timeOld / 1000).toFixed(2)}s`);

    // Run NEW orchestrator
    console.log('\n🟢 Running NEW orchestrator...\n');
    const startNew = Date.now();
    const resultsNew = await analyzeNew(testCase.url, testCase.context, options);
    const timeNew = Date.now() - startNew;

    console.log(`\n✅ NEW completed in ${(timeNew / 1000).toFixed(2)}s`);

    // Compare results
    console.log('\n📊 COMPARISON:\n');

    const comparison = {
      timing: {
        old: `${(timeOld / 1000).toFixed(2)}s`,
        new: `${(timeNew / 1000).toFixed(2)}s`,
        difference: `${(((timeNew - timeOld) / timeOld) * 100).toFixed(1)}%`,
        faster: timeNew < timeOld ? 'NEW' : 'OLD'
      },
      scores: {
        old: {
          overall: resultsOld.overall_score,
          design: resultsOld.design_score,
          seo: resultsOld.seo_score,
          content: resultsOld.content_score,
          social: resultsOld.social_score
        },
        new: {
          overall: resultsNew.overall_score,
          design: resultsNew.design_score,
          seo: resultsNew.seo_score,
          content: resultsNew.content_score,
          social: resultsNew.social_score
        },
        match: (
          resultsOld.overall_score === resultsNew.overall_score &&
          resultsOld.design_score === resultsNew.design_score &&
          resultsOld.seo_score === resultsNew.seo_score &&
          resultsOld.content_score === resultsNew.content_score &&
          resultsOld.social_score === resultsNew.social_score
        )
      },
      grade: {
        old: resultsOld.website_grade,
        new: resultsNew.website_grade,
        match: resultsOld.website_grade === resultsNew.website_grade
      },
      leadScoring: {
        old: {
          priority: resultsOld.lead_priority,
          tier: resultsOld.priority_tier
        },
        new: {
          priority: resultsNew.lead_priority,
          tier: resultsNew.priority_tier
        },
        match: (
          resultsOld.lead_priority === resultsNew.lead_priority &&
          resultsOld.priority_tier === resultsNew.priority_tier
        )
      },
      fields: {
        old: Object.keys(resultsOld).length,
        new: Object.keys(resultsNew).length,
        match: Object.keys(resultsOld).length === Object.keys(resultsNew).length
      }
    };

    console.log('⏱️  Timing:');
    console.log(`   OLD: ${comparison.timing.old}`);
    console.log(`   NEW: ${comparison.timing.new}`);
    console.log(`   Difference: ${comparison.timing.difference} (${comparison.timing.faster} is faster)`);

    console.log('\n📊 Scores:');
    console.log(`   Overall: ${comparison.scores.old.overall} vs ${comparison.scores.new.overall}`);
    console.log(`   Design:  ${comparison.scores.old.design} vs ${comparison.scores.new.design}`);
    console.log(`   SEO:     ${comparison.scores.old.seo} vs ${comparison.scores.new.seo}`);
    console.log(`   Content: ${comparison.scores.old.content} vs ${comparison.scores.new.content}`);
    console.log(`   Social:  ${comparison.scores.old.social} vs ${comparison.scores.new.social}`);
    console.log(`   Match: ${comparison.scores.match ? '✅ YES' : '❌ NO'}`);

    console.log('\n🎓 Grade:');
    console.log(`   OLD: ${comparison.grade.old}`);
    console.log(`   NEW: ${comparison.grade.new}`);
    console.log(`   Match: ${comparison.grade.match ? '✅ YES' : '❌ NO'}`);

    console.log('\n🎯 Lead Scoring:');
    console.log(`   Priority: ${comparison.leadScoring.old.priority} vs ${comparison.leadScoring.new.priority}`);
    console.log(`   Tier: ${comparison.leadScoring.old.tier} vs ${comparison.leadScoring.new.tier}`);
    console.log(`   Match: ${comparison.leadScoring.match ? '✅ YES' : '❌ NO'}`);

    console.log('\n📋 Fields:');
    console.log(`   OLD: ${comparison.fields.old} fields`);
    console.log(`   NEW: ${comparison.fields.new} fields`);
    console.log(`   Match: ${comparison.fields.match ? '✅ YES' : '❌ NO'}`);

    // Overall verdict
    const allMatch = (
      comparison.scores.match &&
      comparison.grade.match &&
      comparison.leadScoring.match &&
      comparison.fields.match
    );

    console.log('\n' + '='.repeat(60));
    if (allMatch) {
      console.log('✅ VERDICT: Results match perfectly!');
    } else {
      console.log('⚠️  VERDICT: Results differ - review needed');
    }
    console.log('='.repeat(60));

    return {
      success: allMatch,
      comparison
    };

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run tests
async function runTests() {
  console.log('\n🧪 ORCHESTRATOR COMPARISON TEST\n');
  console.log('Testing OLD vs NEW orchestrator implementations\n');

  const results = [];

  for (const testCase of testCases) {
    const result = await compareOrchestrators(testCase);
    results.push(result);
  }

  // Summary
  console.log('\n\n📊 TEST SUMMARY\n');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`Total tests: ${results.length}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ${failed > 0 ? '❌' : ''}`);
  console.log('='.repeat(60));

  if (failed === 0) {
    console.log('\n🎉 All tests passed! Refactored orchestrator is ready.\n');
  } else {
    console.log('\n⚠️  Some tests failed. Review differences before deploying.\n');
  }

  process.exit(failed > 0 ? 1 : 0);
}

// Run
runTests();
