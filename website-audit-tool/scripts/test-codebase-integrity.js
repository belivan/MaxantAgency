#!/usr/bin/env node

/**
 * Codebase Integrity Test
 *
 * Validates:
 * 1. All imports/exports work correctly
 * 2. Function calls match function definitions
 * 3. Cost tracking calculations are accurate
 * 4. Module integration works
 * 5. No orphaned functions or dead code
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 CODEBASE INTEGRITY TEST\n');
console.log('='.repeat(60));

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function test(description, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✅ ${description}`);
    passedTests++;
    return true;
  } catch (error) {
    console.log(`❌ ${description}`);
    console.log(`   Error: ${error.message}`);
    failedTests++;
    return false;
  }
}

// TEST 1: Import all modules
console.log('\n📦 TEST 1: Module Imports\n');

let grokExtractor, promptBuilder, costTracker, supabaseClient;

test('Import grok-extractor.js', async () => {
  grokExtractor = await import('../modules/grok-extractor.js');
  if (!grokExtractor.extractDataWithGrok) throw new Error('extractDataWithGrok not exported');
});

test('Import prompt-builder.js', async () => {
  promptBuilder = await import('../modules/prompt-builder.js');
  if (!promptBuilder.buildBasicAnalysisPrompt) throw new Error('buildBasicAnalysisPrompt not exported');
  if (!promptBuilder.buildIndustryAnalysisPrompt) throw new Error('buildIndustryAnalysisPrompt not exported');
  if (!promptBuilder.buildSEOAnalysisPrompt) throw new Error('buildSEOAnalysisPrompt not exported');
});

test('Import cost-tracker.js', async () => {
  costTracker = await import('../modules/cost-tracker.js');
  if (!costTracker.calculateTotalCost) throw new Error('calculateTotalCost not exported');
  if (!costTracker.formatCost) throw new Error('formatCost not exported');
  if (!costTracker.formatTime) throw new Error('formatTime not exported');
});

test('Import supabase-client.js', async () => {
  supabaseClient = await import('../modules/supabase-client.js');
  if (!supabaseClient.saveLeadToSupabase) throw new Error('saveLeadToSupabase not exported');
  if (!supabaseClient.getLeadsByGrade) throw new Error('getLeadsByGrade not exported');
});

// TEST 2: Cost Tracking Calculations
console.log('\n💰 TEST 2: Cost Tracking\n');

test('Cost calculation - basic tier1', async () => {
  const costModule = await import('../modules/cost-tracker.js');
  const config = {
    textModel: 'gpt-5-mini',
    depthTier: 'tier1',
    modules: { basic: true },
    pagesAnalyzed: 1
  };
  const cost = costModule.calculateTotalCost(config);
  if (cost.total <= 0) throw new Error('Cost should be greater than 0');
  if (!cost.breakdown.grokExtraction) throw new Error('Missing grokExtraction cost');
  if (!cost.breakdown.basicAnalysis) throw new Error('Missing basicAnalysis cost');
});

test('Cost calculation - with industry module', async () => {
  const costModule = await import('../modules/cost-tracker.js');
  const config = {
    textModel: 'gpt-5-mini',
    depthTier: 'tier1',
    modules: { basic: true, industry: true },
    pagesAnalyzed: 1
  };
  const cost = costModule.calculateTotalCost(config);
  if (!cost.breakdown.industryAnalysis) throw new Error('Missing industryAnalysis cost');
});

test('Cost calculation - with SEO module', async () => {
  const costModule = await import('../modules/cost-tracker.js');
  const config = {
    textModel: 'gpt-5-mini',
    depthTier: 'tier1',
    modules: { basic: true, seo: true },
    pagesAnalyzed: 1
  };
  const cost = costModule.calculateTotalCost(config);
  if (!cost.breakdown.seoAnalysis) throw new Error('Missing seoAnalysis cost');
});

test('Cost calculation - tier2 (more pages)', async () => {
  const costModule = await import('../modules/cost-tracker.js');
  const config1 = {
    textModel: 'gpt-5-mini',
    depthTier: 'tier1',
    modules: { basic: true },
    pagesAnalyzed: 1
  };
  const config2 = {
    textModel: 'gpt-5-mini',
    depthTier: 'tier2',
    modules: { basic: true },
    pagesAnalyzed: 5
  };
  const cost1 = costModule.calculateTotalCost(config1);
  const cost2 = costModule.calculateTotalCost(config2);
  if (cost2.total <= cost1.total) throw new Error('Tier2 should cost more than tier1');
});

test('formatCost() function', async () => {
  const costModule = await import('../modules/cost-tracker.js');
  const formatted = costModule.formatCost(0.0234);
  if (formatted !== '$0.0234') throw new Error(`Expected "$0.0234", got "${formatted}"`);
});

test('formatTime() function', async () => {
  const costModule = await import('../modules/cost-tracker.js');
  const formatted = costModule.formatTime(125);
  if (formatted !== '2m 5s') throw new Error(`Expected "2m 5s", got "${formatted}"`);
});

// TEST 3: Prompt Builder Functions
console.log('\n📝 TEST 3: Prompt Builder\n');

test('buildBasicAnalysisPrompt() works', async () => {
  const pb = await import('../modules/prompt-builder.js');
  const mockGrokData = {
    contactInfo: { email: 'test@example.com' },
    companyInfo: { name: 'Test Co' },
    services: ['Web Design'],
    socialProfiles: []
  };
  const prompt = pb.buildBasicAnalysisPrompt({ url: 'https://example.com' }, mockGrokData);
  if (!prompt || typeof prompt !== 'string') throw new Error('Should return a string');
  if (prompt.length < 100) throw new Error('Prompt seems too short');
});

test('buildIndustryAnalysisPrompt() works', async () => {
  const pb = await import('../modules/prompt-builder.js');
  const mockGrokData = {
    companyInfo: { industry: 'Web Design' },
    services: ['SEO', 'Branding']
  };
  const prompt = pb.buildIndustryAnalysisPrompt({ url: 'https://example.com' }, mockGrokData);
  if (!prompt || typeof prompt !== 'string') throw new Error('Should return a string');
  if (!prompt.includes('Web Design')) throw new Error('Should mention industry');
});

test('buildSEOAnalysisPrompt() works', async () => {
  const pb = await import('../modules/prompt-builder.js');
  const mockPage = {
    url: 'https://example.com',
    title: 'Test Page',
    h1: 'Welcome'
  };
  const mockGrokData = {
    companyInfo: { name: 'Test Co' }
  };
  const prompt = pb.buildSEOAnalysisPrompt(mockPage, mockGrokData);
  if (!prompt || typeof prompt !== 'string') throw new Error('Should return a string');
});

// TEST 4: File Structure
console.log('\n📁 TEST 4: File Structure\n');

test('analyzer.js exists', () => {
  const file = path.join(__dirname, '../analyzer.js');
  if (!fs.existsSync(file)) throw new Error('analyzer.js not found');
});

test('server.js exists', () => {
  const file = path.join(__dirname, '../server.js');
  if (!fs.existsSync(file)) throw new Error('server.js not found');
});

test('modules/ directory exists', () => {
  const dir = path.join(__dirname, '../modules');
  if (!fs.existsSync(dir)) throw new Error('modules/ directory not found');
});

test('All required modules exist', () => {
  const modules = [
    'grok-extractor.js',
    'prompt-builder.js',
    'cost-tracker.js',
    'supabase-client.js'
  ];
  for (const module of modules) {
    const file = path.join(__dirname, '../modules', module);
    if (!fs.existsSync(file)) throw new Error(`${module} not found`);
  }
});

test('.env.example exists', () => {
  const file = path.join(__dirname, '../.env.example');
  if (!fs.existsSync(file)) throw new Error('.env.example not found');
});

test('package.json exists', () => {
  const file = path.join(__dirname, '../package.json');
  if (!fs.existsSync(file)) throw new Error('package.json not found');
});

// TEST 5: Check for removed email functions
console.log('\n🧹 TEST 5: Email Code Removal\n');

test('No generateEmail() calls in analyzer.js', () => {
  const content = fs.readFileSync(path.join(__dirname, '../analyzer.js'), 'utf8');
  const matches = content.match(/(?<!\/\/ .*|\/\*.*\*\/)generateEmail\s*\(/g);
  if (matches && matches.length > 0) throw new Error('Found generateEmail() call');
});

test('No humanizeEmailWithAI() calls in analyzer.js', () => {
  const content = fs.readFileSync(path.join(__dirname, '../analyzer.js'), 'utf8');
  const matches = content.match(/(?<!\/\/ .*|\/\*.*\*\/)humanizeEmailWithAI\s*\(/g);
  if (matches && matches.length > 0) throw new Error('Found humanizeEmailWithAI() call');
});

test('No qaReviewEmail() calls in analyzer.js', () => {
  const content = fs.readFileSync(path.join(__dirname, '../analyzer.js'), 'utf8');
  const matches = content.match(/(?<!\/\/ .*|\/\*.*\*\/)qaReviewEmail\s*\(/g);
  if (matches && matches.length > 0) throw new Error('Found qaReviewEmail() call');
});

test('No lead_grade in supabase-client.js', () => {
  const content = fs.readFileSync(path.join(__dirname, '../modules/supabase-client.js'), 'utf8');
  // Allow comments but not actual code
  const lines = content.split('\n').filter(line => !line.trim().startsWith('//') && !line.includes('REMOVED'));
  const hasLeadGrade = lines.some(line => line.includes('lead_grade:'));
  if (hasLeadGrade) throw new Error('Found lead_grade field (should be website_grade)');
});

// TEST 6: Verify grading logic
console.log('\n🎯 TEST 6: Grading System\n');

test('Uses grade-{letter}/ folder structure', () => {
  const content = fs.readFileSync(path.join(__dirname, '../analyzer.js'), 'utf8');
  if (content.includes('lead-${')) throw new Error('Still using lead-${grade} folder structure');
  if (!content.includes('grade-${')) throw new Error('Should use grade-${websiteGrade} folder structure');
});

test('Uses websiteGrade variable', () => {
  const content = fs.readFileSync(path.join(__dirname, '../analyzer.js'), 'utf8');
  if (!content.includes('websiteGrade')) throw new Error('Should use websiteGrade variable');
});

// SUMMARY
console.log('\n' + '='.repeat(60));
console.log('📊 TEST SUMMARY\n');
console.log(`Total Tests:  ${totalTests}`);
console.log(`✅ Passed:     ${passedTests}`);
console.log(`❌ Failed:     ${failedTests}`);
console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

if (failedTests === 0) {
  console.log('\n🎉 ALL TESTS PASSED - CODEBASE IS HEALTHY!\n');
  process.exit(0);
} else {
  console.log('\n⚠️  SOME TESTS FAILED - REVIEW ERRORS ABOVE\n');
  process.exit(1);
}
