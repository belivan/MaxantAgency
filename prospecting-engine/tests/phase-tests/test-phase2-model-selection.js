/**
 * Phase 2: Model Selection & Custom Prompts - Integration Tests
 * Tests the full flow of custom prompts and model selection
 */

import { loadAllProspectingPrompts, substituteVariables } from '../../shared/prompt-loader.js';
import { understandQuery } from '../../validators/query-understanding.js';
import { checkRelevance } from '../../validators/relevance-checker.js';
import { extractWebsiteData } from '../../extractors/grok-extractor.js';

// Test counters
let passed = 0;
let failed = 0;

function logTest(name, success, details = '') {
  if (success) {
    console.log(`✅ ${name}`);
    passed++;
  } else {
    console.log(`❌ ${name}`);
    if (details) console.log(`   ${details}`);
    failed++;
  }
}

function logSection(title) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(title);
  console.log('='.repeat(60));
}

// ============================================================================
// TEST SUITE 1: Default Prompts Loading
// ============================================================================

async function testDefaultPromptsLoading() {
  logSection('TEST SUITE 1: Default Prompts Loading');

  try {
    const prompts = loadAllProspectingPrompts();

    logTest(
      'loadAllProspectingPrompts() returns object',
      typeof prompts === 'object' && prompts !== null
    );

    logTest(
      'Has queryUnderstanding prompt',
      prompts.queryUnderstanding && typeof prompts.queryUnderstanding === 'object'
    );

    logTest(
      'Has websiteExtraction prompt',
      prompts.websiteExtraction && typeof prompts.websiteExtraction === 'object'
    );

    logTest(
      'Has relevanceCheck prompt',
      prompts.relevanceCheck && typeof prompts.relevanceCheck === 'object'
    );

    // Verify structure of queryUnderstanding prompt
    const qPrompt = prompts.queryUnderstanding;
    logTest(
      'queryUnderstanding has required fields',
      qPrompt.model && qPrompt.temperature !== undefined && qPrompt.systemPrompt && qPrompt.userPromptTemplate
    );

    logTest(
      'queryUnderstanding has variables array',
      Array.isArray(qPrompt.variables) && qPrompt.variables.length > 0
    );

    // Verify structure of websiteExtraction prompt
    const wPrompt = prompts.websiteExtraction;
    logTest(
      'websiteExtraction has required fields',
      wPrompt.model && wPrompt.temperature !== undefined && wPrompt.systemPrompt && wPrompt.userPromptTemplate
    );

    // Verify structure of relevanceCheck prompt
    const rPrompt = prompts.relevanceCheck;
    logTest(
      'relevanceCheck has required fields',
      rPrompt.model && rPrompt.temperature !== undefined && rPrompt.systemPrompt && rPrompt.userPromptTemplate
    );

    console.log(`\n📊 Default prompts loaded successfully`);
    console.log(`   - queryUnderstanding: ${qPrompt.variables.length} variables`);
    console.log(`   - websiteExtraction: ${wPrompt.variables.length} variables`);
    console.log(`   - relevanceCheck: ${rPrompt.variables.length} variables`);

  } catch (error) {
    logTest('Default prompts loading', false, error.message);
  }
}

// ============================================================================
// TEST SUITE 2: Variable Substitution
// ============================================================================

async function testVariableSubstitution() {
  logSection('TEST SUITE 2: Variable Substitution');

  try {
    // Test 1: Basic substitution
    const template1 = 'Find {{business_type}} in {{location}}';
    const vars1 = { business_type: 'restaurants', location: 'New York' };
    const result1 = substituteVariables(template1, vars1);

    logTest(
      'Basic variable substitution',
      result1 === 'Find restaurants in New York',
      `Got: "${result1}"`
    );

    // Test 2: Multiple occurrences
    const template2 = '{{name}} and {{name}} again';
    const vars2 = { name: 'test' };
    const result2 = substituteVariables(template2, vars2);

    logTest(
      'Multiple occurrences of same variable',
      result2 === 'test and test again',
      `Got: "${result2}"`
    );

    // Test 3: No variables
    const template3 = 'No variables here';
    const vars3 = {};
    const result3 = substituteVariables(template3, vars3);

    logTest(
      'Template with no variables',
      result3 === 'No variables here',
      `Got: "${result3}"`
    );

    // Test 4: Missing variables (should leave unreplaced)
    const template4 = 'Hello {{name}}, welcome to {{city}}';
    const vars4 = { name: 'Alice' }; // city missing
    const result4 = substituteVariables(template4, vars4);

    logTest(
      'Handles missing variables',
      result4.includes('Alice') && result4.includes('{{city}}'),
      `Got: "${result4}"`
    );

    // Test 5: Empty variables
    const template5 = 'Find {{type}}';
    const vars5 = { type: '' };
    const result5 = substituteVariables(template5, vars5);

    logTest(
      'Handles empty variable values',
      result5 === 'Find ',
      `Got: "${result5}"`
    );

    // Test 6: Complex template with many variables
    const prompts = loadAllProspectingPrompts();
    const qTemplate = prompts.queryUnderstanding.userPromptTemplate;
    const testVars = {
      industry: 'restaurant',
      city: 'Manhattan, New York',
      target_description: 'Italian restaurants with outdoor seating'
    };

    const result6 = substituteVariables(qTemplate, testVars);

    logTest(
      'Real query understanding template substitution',
      result6.includes('restaurant') && result6.includes('Manhattan') && !result6.includes('{{'),
      `All variables replaced: ${!result6.includes('{{')}`
    );

  } catch (error) {
    logTest('Variable substitution', false, error.message);
  }
}

// ============================================================================
// TEST SUITE 3: Custom Prompts in Validators
// ============================================================================

async function testCustomPromptsInValidators() {
  logSection('TEST SUITE 3: Custom Prompts in Validators');

  const testBrief = {
    industry: 'restaurant',
    business_type: 'Italian restaurant',
    location: 'Manhattan, New York',
    target_size: 'small to medium businesses',
    revenue_range: '$500k-$2M annual revenue',
    employee_count: '10-50 employees',
    other_criteria: 'family-owned, established 5+ years'
  };

  try {
    // Test 1: Query understanding with custom prompt
    console.log('\n🧪 Testing custom prompt in query understanding...');

    const customQueryPrompt = {
      model: 'grok-4',
      temperature: 0.3,
      systemPrompt: 'CUSTOM: You are a search query expert.',
      userPromptTemplate: 'CUSTOM TEMPLATE: Create search query for {{business_type}} in {{location}}',
      variables: ['business_type', 'location']
    };

    const queryResult = await understandQuery(testBrief, {
      customPrompt: customQueryPrompt
    });

    logTest(
      'understandQuery accepts custom prompt',
      queryResult && typeof queryResult === 'string' && queryResult.length > 0,
      `Got query: ${queryResult}`
    );

    logTest(
      'understandQuery returns non-empty string',
      typeof queryResult === 'string' && queryResult.length > 0,
      `Query: "${queryResult}"`
    );

    // Test 2: Relevance checker with custom prompt
    console.log('\n🧪 Testing custom prompt in relevance checker...');

    const mockProspectData = {
      companyName: 'La Trattoria',
      industry: 'Restaurant',
      description: 'Family-owned Italian restaurant in Manhattan, serving authentic cuisine since 2015',
      employeeCount: '25',
      revenue: '$1.2M'
    };

    const customRelevancePrompt = {
      model: 'grok-4',
      temperature: 0.2,
      systemPrompt: 'CUSTOM: You are a lead qualification expert.',
      userPromptTemplate: 'CUSTOM: Score this prospect {{company_name}} against criteria',
      variables: ['company_name', 'icp_brief', 'prospect_data']
    };

    const relevanceResult = await checkRelevance(
      mockProspectData,
      JSON.stringify(testBrief),
      {
        customPrompt: customRelevancePrompt
      }
    );

    logTest(
      'checkRelevance accepts custom prompt',
      relevanceResult && typeof relevanceResult.score === 'number',
      `Got score: ${relevanceResult?.score}`
    );

    logTest(
      'checkRelevance returns valid structure',
      relevanceResult.score >= 0 && relevanceResult.score <= 100 && relevanceResult.reasoning,
      `Score in range: ${relevanceResult.score}, Has reasoning: ${!!relevanceResult.reasoning}`
    );

  } catch (error) {
    logTest('Custom prompts in validators', false, error.message);
    console.error('Error details:', error);
  }
}

// ============================================================================
// TEST SUITE 4: Model Override
// ============================================================================

async function testModelOverride() {
  logSection('TEST SUITE 4: Model Override');

  const testBrief = {
    industry: 'restaurant',
    business_type: 'Italian restaurant',
    location: 'Manhattan, New York'
  };

  try {
    console.log('\n🧪 Testing model override in query understanding...');

    // Test with different models (using sonnet-latest to avoid version issues)
    const models = ['grok-4', 'gpt-4o', 'claude-3-5-sonnet-latest'];

    for (const model of models) {
      try {
        const result = await understandQuery(testBrief, {
          modelOverride: model
        });

        logTest(
          `Model override: ${model}`,
          result && typeof result === 'string' && result.length > 0,
          `Query: "${result}"`
        );
      } catch (error) {
        logTest(
          `Model override: ${model}`,
          false,
          `Error: ${error.message}`
        );
      }
    }

  } catch (error) {
    logTest('Model override', false, error.message);
  }
}

// ============================================================================
// TEST SUITE 5: Backwards Compatibility
// ============================================================================

async function testBackwardsCompatibility() {
  logSection('TEST SUITE 5: Backwards Compatibility');

  const testBrief = {
    industry: 'restaurant',
    business_type: 'Italian restaurant',
    location: 'Manhattan, New York'
  };

  try {
    // Test 1: Old signature (string modelOverride)
    console.log('\n🧪 Testing legacy string modelOverride...');

    const result1 = await understandQuery(testBrief, 'grok-4');

    logTest(
      'Legacy string modelOverride still works',
      result1 && typeof result1 === 'string' && result1.length > 0,
      `Query: "${result1}"`
    );

    // Test 2: New signature (options object)
    console.log('\n🧪 Testing new options object...');

    const result2 = await understandQuery(testBrief, {
      modelOverride: 'grok-4'
    });

    logTest(
      'New options object works',
      result2 && typeof result2 === 'string' && result2.length > 0,
      `Query: "${result2}"`
    );

    // Test 3: No options (uses defaults)
    console.log('\n🧪 Testing with no options...');

    const result3 = await understandQuery(testBrief);

    logTest(
      'No options uses defaults',
      result3 && typeof result3 === 'string' && result3.length > 0,
      `Query: "${result3}"`
    );

  } catch (error) {
    logTest('Backwards compatibility', false, error.message);
  }
}

// ============================================================================
// TEST SUITE 6: Prompt Modification Detection
// ============================================================================

async function testPromptModificationDetection() {
  logSection('TEST SUITE 6: Prompt Modification Detection');

  const defaultPrompts = loadAllProspectingPrompts();

  // Simulate the hasModifiedPrompts function from prospecting page
  function hasModifiedPrompts(currentPrompts, defaultPrompts) {
    if (!currentPrompts || !defaultPrompts) return false;

    const keys = ['queryUnderstanding', 'websiteExtraction', 'relevanceCheck'];

    return keys.some((key) => {
      const current = currentPrompts[key];
      const defaultVal = defaultPrompts[key];

      if (!current || !defaultVal) return false;

      return (
        current.model !== defaultVal.model ||
        current.temperature !== defaultVal.temperature ||
        current.systemPrompt !== defaultVal.systemPrompt ||
        current.userPromptTemplate !== defaultVal.userPromptTemplate
      );
    });
  }

  try {
    // Test 1: Identical prompts (no modification)
    const identicalPrompts = JSON.parse(JSON.stringify(defaultPrompts));
    const test1 = hasModifiedPrompts(identicalPrompts, defaultPrompts);

    logTest(
      'Detects no modification when prompts are identical',
      test1 === false,
      `Result: ${test1}`
    );

    // Test 2: Model changed
    const modelChanged = JSON.parse(JSON.stringify(defaultPrompts));
    modelChanged.queryUnderstanding.model = 'gpt-4o';
    const test2 = hasModifiedPrompts(modelChanged, defaultPrompts);

    logTest(
      'Detects model change',
      test2 === true,
      `Model changed from ${defaultPrompts.queryUnderstanding.model} to gpt-4o`
    );

    // Test 3: Temperature changed
    const tempChanged = JSON.parse(JSON.stringify(defaultPrompts));
    tempChanged.websiteExtraction.temperature = 0.9;
    const test3 = hasModifiedPrompts(tempChanged, defaultPrompts);

    logTest(
      'Detects temperature change',
      test3 === true,
      `Temperature changed to 0.9`
    );

    // Test 4: System prompt changed
    const sysChanged = JSON.parse(JSON.stringify(defaultPrompts));
    sysChanged.relevanceCheck.systemPrompt = 'MODIFIED SYSTEM PROMPT';
    const test4 = hasModifiedPrompts(sysChanged, defaultPrompts);

    logTest(
      'Detects system prompt change',
      test4 === true,
      `System prompt modified`
    );

    // Test 5: User prompt template changed
    const userChanged = JSON.parse(JSON.stringify(defaultPrompts));
    userChanged.queryUnderstanding.userPromptTemplate = 'MODIFIED USER TEMPLATE';
    const test5 = hasModifiedPrompts(userChanged, defaultPrompts);

    logTest(
      'Detects user prompt template change',
      test5 === true,
      `User template modified`
    );

    // Test 6: Multiple changes
    const multiChanged = JSON.parse(JSON.stringify(defaultPrompts));
    multiChanged.queryUnderstanding.model = 'gpt-4o';
    multiChanged.websiteExtraction.temperature = 0.8;
    multiChanged.relevanceCheck.systemPrompt = 'MODIFIED';
    const test6 = hasModifiedPrompts(multiChanged, defaultPrompts);

    logTest(
      'Detects multiple changes',
      test6 === true,
      `Multiple fields modified`
    );

    // Test 7: Null prompts
    const test7 = hasModifiedPrompts(null, defaultPrompts);

    logTest(
      'Handles null current prompts',
      test7 === false,
      `Returns false for null`
    );

    // Test 8: Undefined prompts
    const test8 = hasModifiedPrompts(undefined, defaultPrompts);

    logTest(
      'Handles undefined current prompts',
      test8 === false,
      `Returns false for undefined`
    );

  } catch (error) {
    logTest('Prompt modification detection', false, error.message);
  }
}

// ============================================================================
// RUN ALL TESTS
// ============================================================================

async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('PROSPECTING ENGINE - PHASE 2 INTEGRATION TESTS');
  console.log('Testing: Model Selection & Custom Prompts');
  console.log('='.repeat(60));

  await testDefaultPromptsLoading();
  await testVariableSubstitution();
  await testCustomPromptsInValidators();
  await testModelOverride();
  await testBackwardsCompatibility();
  await testPromptModificationDetection();

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total:  ${passed + failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  console.log('='.repeat(60));

  if (failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Phase 2 is ready for production.');
  } else {
    console.log('\n⚠️  Some tests failed. Review the output above.');
    process.exit(1);
  }
}

runAllTests().catch(error => {
  console.error('\n❌ Test suite crashed:', error);
  process.exit(1);
});
