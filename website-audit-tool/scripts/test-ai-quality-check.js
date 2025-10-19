/**
 * Test AI Quality Validation
 * Tests the cheap AI agent that validates formatting and quality
 */

import { validateQualityWithAI } from './modules/json-validator.js';
import dotenv from 'dotenv';

dotenv.config();

console.log('🧪 Testing AI Quality Validation (Layer 2)\n');
console.log('This uses GPT-4o-mini (~$0.0001 per check) to catch quality issues\n');

if (!process.env.OPENAI_API_KEY) {
  console.error('❌ ERROR: OPENAI_API_KEY not found in .env file');
  console.error('AI quality check requires OpenAI API access.');
  process.exit(1);
}

// Test 1: Good response (should skip AI check)
console.log('TEST 1: Perfect response (should skip AI validation)');
console.log('='.repeat(70));
const goodResponse = {
  companyName: 'Maksant',
  critiques: [
    'Your site takes 5 seconds to load - visitors expect 2-3 seconds and may leave before seeing your work',
    'Visitors can\'t immediately tell what makes you different from other agencies',
    'Phone number isn\'t tappable on mobile devices - mobile users have to copy and paste to call'
  ],
  summary: 'Solid foundation with great services, but speed and mobile experience need improvement'
};

let result1 = await validateQualityWithAI(goodResponse, 'websiteAnalysis', { forceCheck: false });
console.log('Result:', JSON.stringify(result1, null, 2));
console.log('\n');

// Test 2: Company name with SEO spam
console.log('TEST 2: Company name with SEO spam (should trigger AI check)');
console.log('='.repeat(70));
const seoSpamResponse = {
  companyName: 'Top Philadelphia Web Design Company',
  critiques: [
    'Your site loads slowly at 5 seconds',
    'Missing clear value proposition',
    'Contact form is hard to find'
  ],
  summary: 'Needs performance improvements'
};

let result2 = await validateQualityWithAI(seoSpamResponse, 'websiteAnalysis', { forceCheck: false });
console.log('Result:', JSON.stringify(result2, null, 2));
console.log('\n');

// Test 3: Technical jargon in critiques
console.log('TEST 3: Technical jargon (should trigger AI check and fix)');
console.log('='.repeat(70));
const jargonResponse = {
  companyName: 'Acme Corp',
  critiques: [
    'Your H1 tag is too generic and lacks a USP',
    'Missing meta description for SEO',
    'CTA buttons need better placement above the fold'
  ],
  summary: 'Technical SEO issues need addressing'
};

let result3 = await validateQualityWithAI(jargonResponse, 'websiteAnalysis', { forceCheck: false });
console.log('Result:', JSON.stringify(result3, null, 2));
console.log('\n');

// Test 4: Too short critiques
console.log('TEST 4: Critiques too short (should trigger AI check)');
console.log('='.repeat(70));
const shortCritiquesResponse = {
  companyName: 'Test Company',
  critiques: [
    'Slow site',
    'Bad design',
    'No contact info'
  ],
  summary: 'Needs work'
};

let result4 = await validateQualityWithAI(shortCritiquesResponse, 'websiteAnalysis', { forceCheck: false });
console.log('Result:', JSON.stringify(result4, null, 2));
console.log('\n');

// Test 5: Force quality check even on good response
console.log('TEST 5: Force quality check (forceCheck: true)');
console.log('='.repeat(70));
let result5 = await validateQualityWithAI(goodResponse, 'websiteAnalysis', { forceCheck: true });
console.log('Result:', JSON.stringify(result5, null, 2));
console.log('\n');

// Summary
console.log('='.repeat(70));
console.log('SUMMARY');
console.log('='.repeat(70));
const totalCost = [result1, result2, result3, result4, result5].reduce((sum, r) => sum + (r.cost || 0), 0);
const checksRun = [result1, result2, result3, result4, result5].filter(r => !r.skipped).length;
const checksSkipped = [result1, result2, result3, result4, result5].filter(r => r.skipped).length;

console.log(`Total tests: 5`);
console.log(`AI checks run: ${checksRun}`);
console.log(`AI checks skipped: ${checksSkipped} (no suspicious signals)`);
console.log(`Total cost: $${totalCost.toFixed(4)}`);
console.log(`Average cost per check: $${(totalCost / checksRun).toFixed(4)}`);
console.log('\nExpected behavior:');
console.log('  Test 1: Should SKIP (no issues)');
console.log('  Test 2: Should RUN (SEO spam detected)');
console.log('  Test 3: Should RUN (technical jargon detected)');
console.log('  Test 4: Should RUN (critiques too short)');
console.log('  Test 5: Should RUN (forced)');
console.log('\n✅ AI quality validation test complete!');
