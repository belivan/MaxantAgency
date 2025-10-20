/**
 * PHASE 1 INTEGRATION TEST
 *
 * Tests all Phase 1 components working together:
 * 1. Prompt loading & template filling
 * 2. Validation rules loading
 * 3. Personalization context building
 * 4. End-to-end workflow
 */

import { loadPrompt, fillTemplate, validateContext } from '../shared/prompt-loader.js';
import { buildPersonalizationContext, buildSocialContext } from '../shared/personalization-builder.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('='.repeat(60));
console.log('PHASE 1 INTEGRATION TEST');
console.log('Testing all components together');
console.log('='.repeat(60));
console.log();

// ============================================
// TEST DATA: Sample lead
// ============================================
const sampleLead = {
  id: 'test-123',
  url: 'https://zahavrestaurant.com',
  company_name: 'Zahav Restaurant',
  industry: 'Restaurant',
  location: 'Philadelphia, PA',
  contact_name: 'Michael Solomonov',
  contact_title: 'Owner',
  contact_email: 'michael@zahavrestaurant.com',
  website_grade: 'B',
  lead_grade: 'B',
  website_score: 75,
  load_time: 2.3,
  google_rating: 4.6,
  google_review_count: 458,
  top_issue: 'Mobile menu hidden on smaller screens',
  quick_wins: ['Fix mobile menu visibility (2-hour fix)', 'Add click-to-call button'],
  business_context: '15 years in business, award-winning Israeli restaurant',
  requires_social_outreach: false,
  social_profiles: {
    instagram: 'https://instagram.com/zahavrestaurant',
    facebook: 'https://facebook.com/zahavrestaurant'
  }
};

// ============================================
// TEST 1: Personalization Builder
// ============================================
console.log('Test 1: Personalization Context Building...');
try {
  const context = buildPersonalizationContext(sampleLead);

  // Verify all key fields present
  const requiredFields = [
    'company_name',
    'industry',
    'url',
    'contact_name',
    'grade',
    'top_issue',
    'quick_win',
    'business_context',
    'sender_name',
    'sender_company'
  ];

  for (const field of requiredFields) {
    if (!context[field]) {
      console.error(`❌ Missing field: ${field}`);
      process.exit(1);
    }
  }

  console.log(`✅ Context built with ${Object.keys(context).length} fields`);
  console.log(`   Company: ${context.company_name}`);
  console.log(`   Contact: ${context.contact_name} (${context.first_name})`);
  console.log(`   Grade: ${context.grade}`);
  console.log(`   Top Issue: ${context.top_issue}`);
  console.log(`   Business Context: ${context.business_context}`);
  console.log();
} catch (error) {
  console.error(`❌ Personalization builder failed: ${error.message}`);
  process.exit(1);
}

// ============================================
// TEST 2: Email Strategy + Template Filling
// ============================================
console.log('Test 2: Load Email Strategy & Fill Template...');
try {
  const prompt = loadPrompt('email-strategies', 'compliment-sandwich');
  const context = buildPersonalizationContext(sampleLead);

  // Validate context against prompt requirements
  const validation = validateContext(prompt, context);
  if (!validation.valid) {
    console.error(`❌ Context validation failed. Missing: ${validation.missing.join(', ')}`);
    process.exit(1);
  }

  // Fill template
  const filledPrompt = fillTemplate(prompt.userPromptTemplate, context);

  // Verify no unfilled variables
  if (filledPrompt.includes('{{')) {
    console.error('❌ Template has unfilled variables');
    console.log(filledPrompt);
    process.exit(1);
  }

  // Verify actual values inserted
  if (!filledPrompt.includes('Zahav Restaurant')) {
    console.error('❌ Company name not inserted');
    process.exit(1);
  }

  if (!filledPrompt.includes('Mobile menu hidden')) {
    console.error('❌ Top issue not inserted');
    process.exit(1);
  }

  console.log('✅ Template filled successfully');
  console.log(`   Strategy: ${prompt.name}`);
  console.log(`   Model: ${prompt.model}`);
  console.log(`   Length: ${filledPrompt.length} chars`);
  console.log();
} catch (error) {
  console.error(`❌ Template filling failed: ${error.message}`);
  process.exit(1);
}

// ============================================
// TEST 3: Subject Line Generator
// ============================================
console.log('Test 3: Subject Line Generator Template...');
try {
  const prompt = loadPrompt('email-strategies', 'subject-line-generator');
  const context = buildPersonalizationContext(sampleLead);
  context.variant_count = 3;

  const filledPrompt = fillTemplate(prompt.userPromptTemplate, context);

  if (filledPrompt.includes('{{')) {
    console.error('❌ Subject generator template has unfilled variables');
    process.exit(1);
  }

  console.log('✅ Subject line generator template ready');
  console.log(`   Optimal length: ${prompt.constraints.optimalRange.join('-')} chars`);
  console.log(`   Variants: ${context.variant_count}`);
  console.log();
} catch (error) {
  console.error(`❌ Subject line generator failed: ${error.message}`);
  process.exit(1);
}

// ============================================
// TEST 4: Social Media Context
// ============================================
console.log('Test 4: Social Media Context Building...');
try {
  const socialContext = buildSocialContext(sampleLead, 'instagram');

  if (!socialContext.platform) {
    console.error('❌ Platform not set');
    process.exit(1);
  }

  if (!socialContext.social_profile_url) {
    console.error('❌ Social profile URL not extracted');
    process.exit(1);
  }

  console.log('✅ Social context built');
  console.log(`   Platform: ${socialContext.platform}`);
  console.log(`   Username: ${socialContext.social_username}`);
  console.log(`   Profile: ${socialContext.social_profile_url}`);
  console.log();
} catch (error) {
  console.error(`❌ Social context builder failed: ${error.message}`);
  process.exit(1);
}

// ============================================
// TEST 5: Social Strategy Template
// ============================================
console.log('Test 5: Social Strategy Template Filling...');
try {
  const prompt = loadPrompt('social-strategies', 'value-first');
  const socialContext = buildSocialContext(sampleLead, 'instagram');

  const filledPrompt = fillTemplate(prompt.userPromptTemplate, socialContext);

  if (filledPrompt.includes('{{')) {
    console.error('❌ Social template has unfilled variables');
    process.exit(1);
  }

  if (!filledPrompt.includes('instagram')) {
    console.error('❌ Platform not inserted');
    process.exit(1);
  }

  console.log('✅ Social template filled');
  console.log(`   Strategy: ${prompt.name}`);
  console.log(`   Platforms: ${prompt.platforms.join(', ')}`);
  console.log();
} catch (error) {
  console.error(`❌ Social template failed: ${error.message}`);
  process.exit(1);
}

// ============================================
// TEST 6: Validation Rules Loading
// ============================================
console.log('Test 6: Load Validation Rules...');
try {
  // Load email validation
  const emailRulesPath = join(__dirname, '..', 'config', 'validation', 'email-quality.json');
  const emailRules = JSON.parse(readFileSync(emailRulesPath, 'utf-8'));

  if (!emailRules.rules || !emailRules.scoring) {
    console.error('❌ Email validation rules incomplete');
    process.exit(1);
  }

  console.log('✅ Email validation rules loaded');
  console.log(`   Subject min length: ${emailRules.rules.subject.minLength}`);
  console.log(`   Banned phrases: ${emailRules.rules.subject.bannedPhrases.length}`);

  // Load social validation
  const socialRulesPath = join(__dirname, '..', 'config', 'validation', 'social-quality.json');
  const socialRules = JSON.parse(readFileSync(socialRulesPath, 'utf-8'));

  if (!socialRules.platforms || !socialRules.platforms.instagram) {
    console.error('❌ Social validation rules incomplete');
    process.exit(1);
  }

  console.log('✅ Social validation rules loaded');
  console.log(`   Instagram max chars: ${socialRules.platforms.instagram.maxChars}`);
  console.log(`   Platforms: ${Object.keys(socialRules.platforms).join(', ')}`);

  // Load spam phrases
  const spamPath = join(__dirname, '..', 'config', 'validation', 'spam-phrases.json');
  const spamRules = JSON.parse(readFileSync(spamPath, 'utf-8'));

  if (!spamRules.categories) {
    console.error('❌ Spam rules incomplete');
    process.exit(1);
  }

  console.log('✅ Spam phrase rules loaded');
  console.log(`   Categories: ${Object.keys(spamRules.categories).length}`);
  console.log();
} catch (error) {
  console.error(`❌ Validation rules loading failed: ${error.message}`);
  process.exit(1);
}

// ============================================
// TEST 7: All Email Strategies
// ============================================
console.log('Test 7: Load All Email Strategies...');
const emailStrategies = [
  'compliment-sandwich',
  'problem-first',
  'achievement-focused',
  'question-based'
];

for (const strategy of emailStrategies) {
  try {
    const prompt = loadPrompt('email-strategies', strategy);
    const context = buildPersonalizationContext(sampleLead);
    const filled = fillTemplate(prompt.userPromptTemplate, context);

    if (filled.includes('{{')) {
      console.error(`❌ ${strategy} has unfilled variables`);
      process.exit(1);
    }

    console.log(`✅ ${strategy}`);
  } catch (error) {
    console.error(`❌ ${strategy} failed: ${error.message}`);
    process.exit(1);
  }
}
console.log();

// ============================================
// SUMMARY
// ============================================
console.log('='.repeat(60));
console.log('ALL PHASE 1 INTEGRATION TESTS PASSED! ✅');
console.log('='.repeat(60));
console.log();
console.log('Components Tested:');
console.log('  ✅ Prompt Loader');
console.log('  ✅ Template Filling');
console.log('  ✅ Personalization Builder');
console.log('  ✅ Email Strategies (4)');
console.log('  ✅ Social Strategies (1)');
console.log('  ✅ Subject Line Generator');
console.log('  ✅ Validation Rules (email, social, spam)');
console.log();
console.log('Phase 1 is COMPLETE and ready for Phase 2!');
console.log();
console.log('Next: Phase 2 - Build generators using these configs');
