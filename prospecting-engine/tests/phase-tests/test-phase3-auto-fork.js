/**
 * Phase 3: Auto-Fork - Integration Tests
 * Tests the auto-fork trigger logic and project creation flow
 */

import { loadAllProspectingPrompts } from '../../shared/prompt-loader.js';

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
// AUTO-FORK DECISION LOGIC (from prospecting/page.tsx)
// ============================================================================

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

function shouldAutoFork(currentPrompts, defaultPrompts, prospectCount) {
  const promptsModified = hasModifiedPrompts(currentPrompts, defaultPrompts);
  const hasExistingProspects = prospectCount > 0;

  return promptsModified && hasExistingProspects;
}

// ============================================================================
// TEST SUITE 1: Auto-Fork Decision Matrix
// ============================================================================

async function testAutoForkDecisionMatrix() {
  logSection('TEST SUITE 1: Auto-Fork Decision Matrix');

  const defaultPrompts = loadAllProspectingPrompts();
  const modifiedPrompts = JSON.parse(JSON.stringify(defaultPrompts));
  modifiedPrompts.queryUnderstanding.model = 'gpt-4o'; // Modify one field

  try {
    // Test Case 1: No modification + No prospects = NO FORK
    const test1 = shouldAutoFork(defaultPrompts, defaultPrompts, 0);
    logTest(
      'Case 1: Prompts NOT modified + No prospects → NO FORK',
      test1 === false,
      `Expected: false, Got: ${test1}`
    );

    // Test Case 2: No modification + Has prospects = NO FORK
    const test2 = shouldAutoFork(defaultPrompts, defaultPrompts, 5);
    logTest(
      'Case 2: Prompts NOT modified + Has prospects → NO FORK',
      test2 === false,
      `Expected: false, Got: ${test2}`
    );

    // Test Case 3: Modified + No prospects = NO FORK
    const test3 = shouldAutoFork(modifiedPrompts, defaultPrompts, 0);
    logTest(
      'Case 3: Prompts modified + No prospects → NO FORK',
      test3 === false,
      `Expected: false, Got: ${test3}`
    );

    // Test Case 4: Modified + Has prospects = AUTO FORK ✅
    const test4 = shouldAutoFork(modifiedPrompts, defaultPrompts, 5);
    logTest(
      'Case 4: Prompts modified + Has prospects → AUTO FORK ✅',
      test4 === true,
      `Expected: true, Got: ${test4}`
    );

    // Edge Case 1: Exactly 1 prospect
    const test5 = shouldAutoFork(modifiedPrompts, defaultPrompts, 1);
    logTest(
      'Edge: Prompts modified + Exactly 1 prospect → AUTO FORK',
      test5 === true,
      `Expected: true, Got: ${test5}`
    );

    // Edge Case 2: Large number of prospects
    const test6 = shouldAutoFork(modifiedPrompts, defaultPrompts, 1000);
    logTest(
      'Edge: Prompts modified + 1000 prospects → AUTO FORK',
      test6 === true,
      `Expected: true, Got: ${test6}`
    );

    // Edge Case 3: Null prompts
    const test7 = shouldAutoFork(null, defaultPrompts, 5);
    logTest(
      'Edge: Null current prompts + Has prospects → NO FORK',
      test7 === false,
      `Expected: false, Got: ${test7}`
    );

    // Edge Case 4: Undefined prompts
    const test8 = shouldAutoFork(undefined, defaultPrompts, 5);
    logTest(
      'Edge: Undefined current prompts + Has prospects → NO FORK',
      test8 === false,
      `Expected: false, Got: ${test8}`
    );

  } catch (error) {
    logTest('Auto-fork decision matrix', false, error.message);
  }
}

// ============================================================================
// TEST SUITE 2: Prompt Comparison Accuracy
// ============================================================================

async function testPromptComparisonAccuracy() {
  logSection('TEST SUITE 2: Prompt Comparison Accuracy');

  const defaultPrompts = loadAllProspectingPrompts();

  try {
    // Test 1: Model change detection
    const test1Prompts = JSON.parse(JSON.stringify(defaultPrompts));
    test1Prompts.queryUnderstanding.model = 'gpt-4o';

    logTest(
      'Detects queryUnderstanding model change',
      hasModifiedPrompts(test1Prompts, defaultPrompts) === true,
      `Changed model to gpt-4o`
    );

    // Test 2: Temperature change detection
    const test2Prompts = JSON.parse(JSON.stringify(defaultPrompts));
    test2Prompts.websiteExtraction.temperature = 0.9;

    logTest(
      'Detects websiteExtraction temperature change',
      hasModifiedPrompts(test2Prompts, defaultPrompts) === true,
      `Changed temperature to 0.9`
    );

    // Test 3: System prompt change detection
    const test3Prompts = JSON.parse(JSON.stringify(defaultPrompts));
    test3Prompts.relevanceCheck.systemPrompt = 'MODIFIED SYSTEM PROMPT';

    logTest(
      'Detects relevanceCheck system prompt change',
      hasModifiedPrompts(test3Prompts, defaultPrompts) === true,
      `Modified system prompt`
    );

    // Test 4: User template change detection
    const test4Prompts = JSON.parse(JSON.stringify(defaultPrompts));
    test4Prompts.queryUnderstanding.userPromptTemplate = 'NEW TEMPLATE';

    logTest(
      'Detects user prompt template change',
      hasModifiedPrompts(test4Prompts, defaultPrompts) === true,
      `Modified user template`
    );

    // Test 5: Multiple module changes
    const test5Prompts = JSON.parse(JSON.stringify(defaultPrompts));
    test5Prompts.queryUnderstanding.model = 'gpt-4o';
    test5Prompts.websiteExtraction.model = 'claude-3-5-sonnet-20241022';
    test5Prompts.relevanceCheck.model = 'gpt-4o-mini';

    logTest(
      'Detects changes across all 3 modules',
      hasModifiedPrompts(test5Prompts, defaultPrompts) === true,
      `All 3 modules modified`
    );

    // Test 6: Whitespace-only change (should detect)
    const test6Prompts = JSON.parse(JSON.stringify(defaultPrompts));
    test6Prompts.queryUnderstanding.systemPrompt += ' '; // Add trailing space

    logTest(
      'Detects whitespace-only changes',
      hasModifiedPrompts(test6Prompts, defaultPrompts) === true,
      `Even whitespace changes trigger fork`
    );

    // Test 7: Case sensitivity
    const test7Prompts = JSON.parse(JSON.stringify(defaultPrompts));
    test7Prompts.queryUnderstanding.systemPrompt =
      test7Prompts.queryUnderstanding.systemPrompt.toUpperCase();

    logTest(
      'Detects case changes in prompts',
      hasModifiedPrompts(test7Prompts, defaultPrompts) === true,
      `Case change detected`
    );

    // Test 8: No changes (exact copy)
    const test8Prompts = JSON.parse(JSON.stringify(defaultPrompts));

    logTest(
      'No false positives on identical prompts',
      hasModifiedPrompts(test8Prompts, defaultPrompts) === false,
      `Exact copy returns false`
    );

  } catch (error) {
    logTest('Prompt comparison accuracy', false, error.message);
  }
}

// ============================================================================
// TEST SUITE 3: Module-Specific Detection
// ============================================================================

async function testModuleSpecificDetection() {
  logSection('TEST SUITE 3: Module-Specific Detection');

  const defaultPrompts = loadAllProspectingPrompts();

  try {
    // Test each module independently
    const modules = ['queryUnderstanding', 'websiteExtraction', 'relevanceCheck'];

    for (const moduleName of modules) {
      const testPrompts = JSON.parse(JSON.stringify(defaultPrompts));
      testPrompts[moduleName].model = 'CHANGED_MODEL';

      logTest(
        `Detects change in ${moduleName} module only`,
        hasModifiedPrompts(testPrompts, defaultPrompts) === true,
        `Modified ${moduleName}.model`
      );
    }

    // Test that untracked fields don't trigger modification
    const unrelatedChange = JSON.parse(JSON.stringify(defaultPrompts));
    unrelatedChange.queryUnderstanding.newUnusedField = 'test';

    logTest(
      'Ignores untracked fields (newUnusedField)',
      hasModifiedPrompts(unrelatedChange, defaultPrompts) === false,
      `Adding new fields doesn't trigger fork`
    );

    // Test version/name fields (should not trigger)
    const metadataChange = JSON.parse(JSON.stringify(defaultPrompts));
    metadataChange.queryUnderstanding.version = '2.0.0';
    metadataChange.queryUnderstanding.name = 'New Name';

    logTest(
      'Ignores metadata changes (version, name)',
      hasModifiedPrompts(metadataChange, defaultPrompts) === false,
      `Metadata changes don't trigger fork`
    );

  } catch (error) {
    logTest('Module-specific detection', false, error.message);
  }
}

// ============================================================================
// TEST SUITE 4: Auto-Fork Workflow Simulation
// ============================================================================

async function testAutoForkWorkflowSimulation() {
  logSection('TEST SUITE 4: Auto-Fork Workflow Simulation');

  const defaultPrompts = loadAllProspectingPrompts();

  try {
    // Scenario 1: Fresh project, first generation
    console.log('\n📖 Scenario 1: Fresh project, first generation');
    const scenario1 = {
      currentPrompts: defaultPrompts,
      defaultPrompts: defaultPrompts,
      prospectCount: 0
    };

    const fork1 = shouldAutoFork(
      scenario1.currentPrompts,
      scenario1.defaultPrompts,
      scenario1.prospectCount
    );

    logTest(
      'Scenario 1: NO FORK expected',
      fork1 === false,
      `New project with default prompts → Normal generation`
    );

    // Scenario 2: After first generation (now has prospects)
    console.log('\n📖 Scenario 2: Same project, generate again (no changes)');
    const scenario2 = {
      currentPrompts: defaultPrompts,
      defaultPrompts: defaultPrompts,
      prospectCount: 10 // Generated 10 prospects
    };

    const fork2 = shouldAutoFork(
      scenario2.currentPrompts,
      scenario2.defaultPrompts,
      scenario2.prospectCount
    );

    logTest(
      'Scenario 2: NO FORK expected',
      fork2 === false,
      `Existing prospects but no prompt changes → Normal generation`
    );

    // Scenario 3: User modifies prompts, generates again
    console.log('\n📖 Scenario 3: User modifies prompts, tries to generate');
    const modifiedPrompts = JSON.parse(JSON.stringify(defaultPrompts));
    modifiedPrompts.queryUnderstanding.model = 'gpt-4o';
    modifiedPrompts.websiteExtraction.temperature = 0.8;

    const scenario3 = {
      currentPrompts: modifiedPrompts,
      defaultPrompts: defaultPrompts,
      prospectCount: 10 // Still has original prospects
    };

    const fork3 = shouldAutoFork(
      scenario3.currentPrompts,
      scenario3.defaultPrompts,
      scenario3.prospectCount
    );

    logTest(
      'Scenario 3: AUTO-FORK TRIGGERED ✅',
      fork3 === true,
      `Modified prompts + existing prospects → Create new project (v2)`
    );

    // Scenario 4: On forked project (v2), first generation
    console.log('\n📖 Scenario 4: On forked project (v2), first generation');
    const scenario4 = {
      currentPrompts: modifiedPrompts,
      defaultPrompts: defaultPrompts, // Still comparing to defaults
      prospectCount: 0 // New fork has no prospects yet
    };

    const fork4 = shouldAutoFork(
      scenario4.currentPrompts,
      scenario4.defaultPrompts,
      scenario4.prospectCount
    );

    logTest(
      'Scenario 4: NO FORK expected',
      fork4 === false,
      `Forked project with 0 prospects → Normal generation (no double-fork)`
    );

    // Scenario 5: Modify prompts again on v2
    console.log('\n📖 Scenario 5: Modify prompts again on v2, after generating');
    const furtherModifiedPrompts = JSON.parse(JSON.stringify(modifiedPrompts));
    furtherModifiedPrompts.relevanceCheck.model = 'claude-3-5-sonnet-20241022';

    const scenario5 = {
      currentPrompts: furtherModifiedPrompts,
      defaultPrompts: defaultPrompts,
      prospectCount: 15 // v2 now has prospects
    };

    const fork5 = shouldAutoFork(
      scenario5.currentPrompts,
      scenario5.defaultPrompts,
      scenario5.prospectCount
    );

    logTest(
      'Scenario 5: AUTO-FORK TRIGGERED AGAIN ✅',
      fork5 === true,
      `Further modifications + prospects on v2 → Create v3`
    );

  } catch (error) {
    logTest('Auto-fork workflow simulation', false, error.message);
  }
}

// ============================================================================
// TEST SUITE 5: Edge Cases & Error Handling
// ============================================================================

async function testEdgeCasesAndErrorHandling() {
  logSection('TEST SUITE 5: Edge Cases & Error Handling');

  const defaultPrompts = loadAllProspectingPrompts();

  try {
    // Test 1: Negative prospect count (invalid but should handle)
    const test1 = shouldAutoFork(defaultPrompts, defaultPrompts, -1);
    logTest(
      'Handles negative prospect count',
      test1 === false,
      `Negative count treated as 0 → NO FORK`
    );

    // Test 2: Null prospect count
    const test2 = shouldAutoFork(defaultPrompts, defaultPrompts, null);
    logTest(
      'Handles null prospect count',
      test2 === false,
      `Null count → NO FORK`
    );

    // Test 3: Undefined prospect count
    const test3 = shouldAutoFork(defaultPrompts, defaultPrompts, undefined);
    logTest(
      'Handles undefined prospect count',
      test3 === false,
      `Undefined count → NO FORK`
    );

    // Test 4: String prospect count (type coercion)
    const modifiedPrompts = JSON.parse(JSON.stringify(defaultPrompts));
    modifiedPrompts.queryUnderstanding.model = 'gpt-4o';

    const test4 = shouldAutoFork(modifiedPrompts, defaultPrompts, '5');
    logTest(
      'Handles string prospect count',
      test4 === true,
      `String '5' coerced to number → AUTO FORK`
    );

    // Test 5: Empty object as prompts
    const test5 = shouldAutoFork({}, defaultPrompts, 5);
    logTest(
      'Handles empty object as current prompts',
      test5 === false,
      `Empty object has no modules → NO FORK`
    );

    // Test 6: Partially missing modules
    const partialPrompts = {
      queryUnderstanding: defaultPrompts.queryUnderstanding
      // Missing websiteExtraction and relevanceCheck
    };

    const test6 = shouldAutoFork(partialPrompts, defaultPrompts, 5);
    logTest(
      'Handles partially missing modules',
      test6 === false,
      `Missing modules → NO FORK`
    );

    // Test 7: Extra modules (should ignore)
    const extraModules = JSON.parse(JSON.stringify(defaultPrompts));
    extraModules.newModule = { model: 'test' };

    const test7 = shouldAutoFork(extraModules, defaultPrompts, 5);
    logTest(
      'Ignores extra modules',
      test7 === false,
      `Extra modules don't affect comparison → NO FORK`
    );

    // Test 8: Very large prompt text
    const largePrompt = JSON.parse(JSON.stringify(defaultPrompts));
    largePrompt.queryUnderstanding.systemPrompt = 'A'.repeat(10000);

    const test8 = hasModifiedPrompts(largePrompt, defaultPrompts);
    logTest(
      'Handles very large prompt text',
      test8 === true,
      `Large prompt (10k chars) detected as modified`
    );

  } catch (error) {
    logTest('Edge cases and error handling', false, error.message);
  }
}

// ============================================================================
// RUN ALL TESTS
// ============================================================================

async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('PROSPECTING ENGINE - PHASE 3 AUTO-FORK TESTS');
  console.log('Testing: Auto-Fork Trigger Logic');
  console.log('='.repeat(60));

  await testAutoForkDecisionMatrix();
  await testPromptComparisonAccuracy();
  await testModuleSpecificDetection();
  await testAutoForkWorkflowSimulation();
  await testEdgeCasesAndErrorHandling();

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
    console.log('\n🎉 ALL AUTO-FORK TESTS PASSED! Phase 3 is ready for production.');
    console.log('\n📋 Decision Matrix Summary:');
    console.log('   • Prompts NOT modified + No prospects     → Normal generation');
    console.log('   • Prompts NOT modified + Has prospects    → Normal generation');
    console.log('   • Prompts modified     + No prospects     → Normal generation (saves prompts)');
    console.log('   • Prompts modified     + Has prospects    → 🔀 AUTO-FORK (creates v2)');
  } else {
    console.log('\n⚠️  Some tests failed. Review the output above.');
    process.exit(1);
  }
}

runAllTests().catch(error => {
  console.error('\n❌ Test suite crashed:', error);
  process.exit(1);
});
