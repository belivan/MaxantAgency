/**
 * Test Model Override - Verify environment variables override JSON prompt configs
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { loadPrompt } from './shared/prompt-loader.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

console.log('\n' + '='.repeat(80));
console.log('TESTING MODEL OVERRIDE FUNCTIONALITY');
console.log('='.repeat(80));

console.log('\n📋 Environment Variables:');
console.log(`  SYNTHESIS_DEDUP_MODEL = ${process.env.SYNTHESIS_DEDUP_MODEL || '(not set)'}`);
console.log(`  SYNTHESIS_EXECUTIVE_MODEL = ${process.env.SYNTHESIS_EXECUTIVE_MODEL || '(not set)'}`);

async function testPromptLoading() {
  console.log('\n🧪 Test 1: Issue Deduplication Prompt');
  console.log('─'.repeat(80));

  try {
    const dedupPrompt = await loadPrompt('report-synthesis/issue-deduplication', {
      company_name: 'Test Company',
      industry: 'test',
      grade: 'A',
      overall_score: 90,
      desktop_issues_json: '[]',
      mobile_issues_json: '[]',
      seo_issues_json: '[]',
      content_issues_json: '[]',
      social_issues_json: '[]',
      accessibility_issues_json: '[]'
    });

    console.log(`✅ Loaded successfully`);
    console.log(`   Model from JSON: claude-haiku-4-5 (hardcoded in JSON)`);
    console.log(`   Model resolved: ${dedupPrompt.model}`);
    console.log(`   Expected: ${process.env.SYNTHESIS_DEDUP_MODEL || 'gpt-5'}`);

    if (dedupPrompt.model === process.env.SYNTHESIS_DEDUP_MODEL) {
      console.log(`   ✅ PASS: Environment variable override working!`);
    } else {
      console.log(`   ❌ FAIL: Still using JSON config model`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Error loading prompt: ${error.message}`);
    return false;
  }

  console.log('\n🧪 Test 2: Executive Insights Prompt');
  console.log('─'.repeat(80));

  try {
    const execPrompt = await loadPrompt('report-synthesis/executive-insights-generator', {
      company_name: 'Test Company',
      industry: 'test',
      grade: 'A',
      overall_score: 90,
      url: 'https://example.com',
      lead_priority: 'high',
      priority_tier: 'A',
      budget_likelihood: 'high',
      tech_stack: 'Unknown',
      pages_crawled: 1,
      consolidated_issues_json: '[]',
      balanced_quick_wins_json: '[]',
      screenshot_references_json: '[]'
    });

    console.log(`✅ Loaded successfully`);
    console.log(`   Model from JSON: claude-haiku-4-5 (hardcoded in JSON)`);
    console.log(`   Model resolved: ${execPrompt.model}`);
    console.log(`   Expected: ${process.env.SYNTHESIS_EXECUTIVE_MODEL || 'gpt-5'}`);

    if (execPrompt.model === process.env.SYNTHESIS_EXECUTIVE_MODEL) {
      console.log(`   ✅ PASS: Environment variable override working!`);
    } else {
      console.log(`   ❌ FAIL: Still using JSON config model`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Error loading prompt: ${error.message}`);
    return false;
  }

  return true;
}

// Run tests
testPromptLoading().then(success => {
  console.log('\n' + '='.repeat(80));
  if (success) {
    console.log('✅ ALL TESTS PASSED');
    console.log('   Synthesis pipeline will use GPT-5 from .env');
    console.log('   Rate limit issue should be resolved (500K TPM vs 8K OTPM)');
  } else {
    console.log('❌ TESTS FAILED');
    console.log('   Check implementation above');
  }
  console.log('='.repeat(80) + '\n');
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('\n❌ Test execution failed:', error);
  process.exit(1);
});
