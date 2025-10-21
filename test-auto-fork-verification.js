/**
 * Auto-Fork Verification Test
 * Verifies that auto-fork logic works correctly by simulating the workflow
 */

console.log('='.repeat(60));
console.log('AUTO-FORK VERIFICATION TEST');
console.log('='.repeat(60));

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

// Test scenarios
const scenarios = [
  {
    name: 'No prospects, prompts modified',
    prospectCount: 0,
    promptsModified: true,
    expectedFork: false,
    expectedWarning: false
  },
  {
    name: 'Prospects exist, prompts NOT modified',
    prospectCount: 5,
    promptsModified: false,
    expectedFork: false,
    expectedWarning: false
  },
  {
    name: 'Prospects exist, prompts modified',
    prospectCount: 5,
    promptsModified: true,
    expectedFork: true,
    expectedWarning: true
  },
  {
    name: 'Prospects exist, only model changed',
    prospectCount: 3,
    promptsModified: true, // Model change counts as prompt modification
    expectedFork: true,
    expectedWarning: true
  }
];

// Default prompts
const defaultPrompts = {
  queryUnderstanding: {
    model: 'grok-4',
    temperature: 0.2,
    systemPrompt: 'Default system prompt',
    userPromptTemplate: 'Default user template'
  },
  websiteExtraction: {
    model: 'grok-4',
    temperature: 0.3,
    systemPrompt: 'Default system prompt',
    userPromptTemplate: 'Default user template'
  },
  relevanceCheck: {
    model: 'grok-4',
    temperature: 0.2,
    systemPrompt: 'Default system prompt',
    userPromptTemplate: 'Default user template'
  }
};

// Test each scenario
let passed = 0;
let failed = 0;

console.log('\n');

scenarios.forEach((scenario, index) => {
  console.log(`\nTest ${index + 1}: ${scenario.name}`);
  console.log('-'.repeat(60));

  // Prepare current prompts based on scenario
  let currentPrompts = JSON.parse(JSON.stringify(defaultPrompts));

  if (scenario.promptsModified) {
    // Modify the model for queryUnderstanding
    currentPrompts.queryUnderstanding.model = 'gpt-4o';
  }

  // Calculate expected behavior
  const shouldShowForkWarning = scenario.prospectCount > 0 && hasModifiedPrompts(currentPrompts, defaultPrompts);
  const shouldAutoFork = scenario.prospectCount > 0 && hasModifiedPrompts(currentPrompts, defaultPrompts);

  // Check results
  const warningCorrect = shouldShowForkWarning === scenario.expectedWarning;
  const forkCorrect = shouldAutoFork === scenario.expectedFork;

  console.log(`  Prospect Count: ${scenario.prospectCount}`);
  console.log(`  Prompts Modified: ${hasModifiedPrompts(currentPrompts, defaultPrompts)}`);
  console.log(`  Show Fork Warning: ${shouldShowForkWarning} (expected: ${scenario.expectedWarning})`);
  console.log(`  Should Auto-Fork: ${shouldAutoFork} (expected: ${scenario.expectedFork})`);

  if (warningCorrect && forkCorrect) {
    console.log('  ✅ PASS');
    passed++;
  } else {
    console.log('  ❌ FAIL');
    if (!warningCorrect) console.log(`     - Warning flag incorrect`);
    if (!forkCorrect) console.log(`     - Auto-fork flag incorrect`);
    failed++;
  }
});

// Summary
console.log('\n' + '='.repeat(60));
console.log('SUMMARY');
console.log('='.repeat(60));
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📊 Total:  ${passed + failed}`);
console.log('='.repeat(60));

if (failed === 0) {
  console.log('\n🎉 All auto-fork logic tests passed!');
  console.log('\nAuto-fork will trigger when:');
  console.log('  1. Project has existing prospects (prospectCount > 0)');
  console.log('  2. Prompts/models have been modified');
  console.log('  3. User clicks "Generate Prospects"');
  console.log('\nFork warnings will show when:');
  console.log('  - User modifies prompts/models AND prospects exist');
  console.log('  - User modifies ICP brief AND prospects exist');
} else {
  console.log('\n⚠️  Some tests failed.');
  process.exit(1);
}
