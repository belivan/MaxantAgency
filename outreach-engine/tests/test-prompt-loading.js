/**
 * TEST: Prompt Loading
 *
 * Verifies that:
 * 1. Prompt configs can be loaded from JSON
 * 2. Templates can be filled with context data
 * 3. All required fields are present
 */

import { loadPrompt, fillTemplate, validateContext } from '../shared/prompt-loader.js';

console.log('====================================');
console.log('TESTING PROMPT LOADING SYSTEM');
console.log('====================================\n');

// Test 1: Load compliment-sandwich prompt
console.log('Test 1: Load compliment-sandwich email strategy...');
try {
  const prompt = loadPrompt('email-strategies', 'compliment-sandwich');
  console.log(`✅ Loaded: ${prompt.name}`);
  console.log(`   Description: ${prompt.description}`);
  console.log(`   Model: ${prompt.model}`);
  console.log(`   Variables: ${prompt.variables.length} declared`);
  console.log();
} catch (error) {
  console.error(`❌ Failed: ${error.message}`);
  process.exit(1);
}

// Test 2: Load all email strategies
console.log('Test 2: Load all email strategies...');
const emailStrategies = [
  'compliment-sandwich',
  'problem-first',
  'achievement-focused',
  'question-based',
  'subject-line-generator'
];

for (const strategy of emailStrategies) {
  try {
    const prompt = loadPrompt('email-strategies', strategy);
    console.log(`✅ ${strategy}`);
  } catch (error) {
    console.error(`❌ ${strategy}: ${error.message}`);
    process.exit(1);
  }
}
console.log();

// Test 3: Load social strategy
console.log('Test 3: Load social strategy...');
try {
  const prompt = loadPrompt('social-strategies', 'value-first');
  console.log(`✅ value-first`);
  console.log(`   Platforms: ${prompt.platforms.join(', ')}`);
  console.log();
} catch (error) {
  console.error(`❌ Failed: ${error.message}`);
  process.exit(1);
}

// Test 4: Template filling
console.log('Test 4: Fill template with context data...');
try {
  const prompt = loadPrompt('email-strategies', 'compliment-sandwich');

  const context = {
    company_name: 'Test Company',
    industry: 'Restaurant',
    url: 'testcompany.com',
    grade: 'B',
    top_issue: 'Mobile menu hidden',
    quick_win: 'Fix mobile menu visibility',
    business_context: '10 years in business',
    contact_name: 'John',
    contact_title: 'Owner',
    sender_company: 'Maksant',
    sender_website: 'https://maksant.com',
    sender_phone: '412-315-8398',
    sender_name: 'Anton Yanovich'
  };

  const filled = fillTemplate(prompt.userPromptTemplate, context);

  if (filled.includes('{{')) {
    console.error('❌ Template still has unfilled variables');
    console.log(filled);
    process.exit(1);
  }

  if (!filled.includes('Test Company')) {
    console.error('❌ Context data not inserted');
    process.exit(1);
  }

  console.log('✅ Template filled successfully');
  console.log(`   Contains: company name, industry, issue, sender info`);
  console.log();
} catch (error) {
  console.error(`❌ Failed: ${error.message}`);
  process.exit(1);
}

// Test 5: Context validation
console.log('Test 5: Validate context data...');
try {
  const prompt = loadPrompt('email-strategies', 'compliment-sandwich');

  // Complete context
  const completeContext = {
    company_name: 'Test',
    industry: 'Test',
    url: 'test.com',
    grade: 'B',
    top_issue: 'Test issue',
    quick_win: 'Test fix',
    business_context: 'Test',
    contact_name: 'John',
    contact_title: 'Owner',
    sender_company: 'Maksant',
    sender_website: 'https://maksant.com',
    sender_phone: '412-315-8398',
    sender_name: 'Anton'
  };

  const validation1 = validateContext(prompt, completeContext);
  if (!validation1.valid) {
    console.error('❌ Complete context marked as invalid');
    console.error('   Missing:', validation1.missing);
    process.exit(1);
  }
  console.log('✅ Complete context validated');

  // Incomplete context
  const incompleteContext = {
    company_name: 'Test',
    industry: 'Test'
  };

  const validation2 = validateContext(prompt, incompleteContext);
  if (validation2.valid) {
    console.error('❌ Incomplete context marked as valid');
    process.exit(1);
  }
  console.log(`✅ Incomplete context detected (${validation2.missing.length} missing variables)`);
  console.log();
} catch (error) {
  console.error(`❌ Failed: ${error.message}`);
  process.exit(1);
}

// Summary
console.log('====================================');
console.log('ALL TESTS PASSED! ✅');
console.log('====================================');
console.log();
console.log('Prompt loading system is working correctly.');
console.log('You can now use loadPrompt() to load any prompt config.');
console.log();
console.log('Next step: Create validation rules and personalization builder.');
