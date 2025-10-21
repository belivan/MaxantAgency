/**
 * Test Visual Analyzers (Desktop and Mobile)
 *
 * Tests the new desktop-visual-analyzer and mobile-visual-analyzer modules
 */

import { analyzeDesktopVisual, countCriticalDesktopIssues } from '../analyzers/desktop-visual-analyzer.js';
import { analyzeMobileVisual, countCriticalMobileIssues } from '../analyzers/mobile-visual-analyzer.js';

// Test counters
let passed = 0;
let failed = 0;

/**
 * Test helper
 */
function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (error) {
    console.error(`❌ ${name}`);
    console.error(`   Error: ${error.message}`);
    failed++;
  }
}

/**
 * Assert helper
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// =======================
// Desktop Visual Analyzer Tests
// =======================

console.log('\n=== Desktop Visual Analyzer Module Tests ===\n');

test('Desktop analyzer exports correct functions', () => {
  assert(typeof analyzeDesktopVisual === 'function', 'analyzeDesktopVisual should be a function');
  assert(typeof countCriticalDesktopIssues === 'function', 'countCriticalDesktopIssues should be a function');
});

test('Desktop analyzer rejects non-Buffer screenshot', async () => {
  try {
    await analyzeDesktopVisual('https://example.com', 'not-a-buffer', {});
    throw new Error('Should have thrown error for non-Buffer');
  } catch (error) {
    assert(error.message.includes('Buffer'), 'Error should mention Buffer requirement');
  }
});

test('Desktop analyzer returns graceful degradation on error', async () => {
  // Pass an empty buffer to trigger error
  const result = await analyzeDesktopVisual(
    'https://example.com',
    Buffer.from(''),
    { company_name: 'Test Co', industry: 'Test' }
  );

  assert(result.visualScore === 50, 'Should return default score of 50');
  assert(Array.isArray(result.issues), 'Should return issues array');
  assert(result.issues.length > 0, 'Should have at least one error issue');
  assert(result.issues[0].category === 'error', 'First issue should be error category');
  assert(result._meta.analyzer === 'desktop-visual', 'Should include correct analyzer metadata');
  assert(result._meta.error, 'Should include error in metadata');
});

test('countCriticalDesktopIssues handles null input', () => {
  const count = countCriticalDesktopIssues(null);
  assert(count === 0, 'Should return 0 for null input');
});

test('countCriticalDesktopIssues handles missing issues', () => {
  const count = countCriticalDesktopIssues({});
  assert(count === 0, 'Should return 0 for empty object');
});

test('countCriticalDesktopIssues counts high priority issues', () => {
  const mockResults = {
    issues: [
      { priority: 'high', title: 'Issue 1' },
      { priority: 'medium', title: 'Issue 2' },
      { priority: 'high', title: 'Issue 3' },
      { severity: 'critical', title: 'Issue 4' },
      { difficulty: 'quick-win', title: 'Issue 5' }
    ]
  };

  const count = countCriticalDesktopIssues(mockResults);
  assert(count === 4, 'Should count high priority, critical severity, and quick-win issues');
});

// =======================
// Mobile Visual Analyzer Tests
// =======================

console.log('\n=== Mobile Visual Analyzer Module Tests ===\n');

test('Mobile analyzer exports correct functions', () => {
  assert(typeof analyzeMobileVisual === 'function', 'analyzeMobileVisual should be a function');
  assert(typeof countCriticalMobileIssues === 'function', 'countCriticalMobileIssues should be a function');
});

test('Mobile analyzer rejects non-Buffer screenshot', async () => {
  try {
    await analyzeMobileVisual('https://example.com', 'not-a-buffer', {});
    throw new Error('Should have thrown error for non-Buffer');
  } catch (error) {
    assert(error.message.includes('Buffer'), 'Error should mention Buffer requirement');
  }
});

test('Mobile analyzer returns graceful degradation on error', async () => {
  // Pass an empty buffer to trigger error
  const result = await analyzeMobileVisual(
    'https://example.com',
    Buffer.from(''),
    { company_name: 'Test Co', industry: 'Test' }
  );

  assert(result.visualScore === 50, 'Should return default score of 50');
  assert(Array.isArray(result.issues), 'Should return issues array');
  assert(result.issues.length > 0, 'Should have at least one error issue');
  assert(result.issues[0].category === 'error', 'First issue should be error category');
  assert(result._meta.analyzer === 'mobile-visual', 'Should include correct analyzer metadata');
  assert(result._meta.error, 'Should include error in metadata');
});

test('countCriticalMobileIssues handles null input', () => {
  const count = countCriticalMobileIssues(null);
  assert(count === 0, 'Should return 0 for null input');
});

test('countCriticalMobileIssues handles missing issues', () => {
  const count = countCriticalMobileIssues({});
  assert(count === 0, 'Should return 0 for empty object');
});

test('countCriticalMobileIssues counts high priority issues', () => {
  const mockResults = {
    issues: [
      { priority: 'high', title: 'Issue 1' },
      { priority: 'medium', title: 'Issue 2' },
      { priority: 'high', title: 'Issue 3' },
      { severity: 'critical', title: 'Issue 4' },
      { difficulty: 'quick-win', title: 'Issue 5' }
    ]
  };

  const count = countCriticalMobileIssues(mockResults);
  assert(count === 4, 'Should count high priority, critical severity, and quick-win issues');
});

// =======================
// Prompt Loading Tests
// =======================

console.log('\n=== Prompt Loading Tests ===\n');

test('Desktop prompt file exists and loads correctly', async () => {
  const { loadPrompt } = await import('../shared/prompt-loader.js');
  const prompt = await loadPrompt('web-design/desktop-visual-analysis', {
    company_name: 'Test Co',
    industry: 'Test',
    url: 'https://example.com',
    tech_stack: 'React',
    load_time: '2000'
  });

  assert(prompt.name === 'desktop-visual-analysis', 'Should load desktop prompt');
  assert(prompt.model === 'gpt-4o', 'Should use GPT-4o model');
  assert(prompt.systemPrompt.includes('desktop'), 'System prompt should mention desktop');
  assert(prompt.userPrompt.includes('Test Co'), 'User prompt should include company name');
});

test('Mobile prompt file exists and loads correctly', async () => {
  const { loadPrompt } = await import('../shared/prompt-loader.js');
  const prompt = await loadPrompt('web-design/mobile-visual-analysis', {
    company_name: 'Test Co',
    industry: 'Test',
    url: 'https://example.com',
    tech_stack: 'React',
    load_time: '2000'
  });

  assert(prompt.name === 'mobile-visual-analysis', 'Should load mobile prompt');
  assert(prompt.model === 'gpt-4o', 'Should use GPT-4o model');
  assert(prompt.systemPrompt.includes('mobile'), 'System prompt should mention mobile');
  assert(prompt.userPrompt.includes('Test Co'), 'User prompt should include company name');
});

test('Desktop prompt has correct output schema', async () => {
  const { getRawPromptConfig } = await import('../shared/prompt-loader.js');
  const config = await getRawPromptConfig('web-design/desktop-visual-analysis');

  assert(config.outputFormat.type === 'json', 'Output format should be JSON');
  assert(config.outputFormat.schema.visualScore, 'Schema should include visualScore');
  assert(config.outputFormat.schema.issues, 'Schema should include issues');
  assert(config.outputFormat.schema.positives, 'Schema should include positives');
  assert(config.outputFormat.schema.quickWinCount, 'Schema should include quickWinCount');
});

test('Mobile prompt has correct output schema', async () => {
  const { getRawPromptConfig } = await import('../shared/prompt-loader.js');
  const config = await getRawPromptConfig('web-design/mobile-visual-analysis');

  assert(config.outputFormat.type === 'json', 'Output format should be JSON');
  assert(config.outputFormat.schema.visualScore, 'Schema should include visualScore');
  assert(config.outputFormat.schema.issues, 'Schema should include issues');
  assert(config.outputFormat.schema.positives, 'Schema should include positives');
  assert(config.outputFormat.schema.quickWinCount, 'Schema should include quickWinCount');
});

// =======================
// Results
// =======================

console.log('\n=== Test Results ===\n');
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📊 Total: ${passed + failed}`);

if (failed === 0) {
  console.log('\n🎉 All tests passed!\n');
  process.exit(0);
} else {
  console.log(`\n⚠️  ${failed} test(s) failed\n`);
  process.exit(1);
}
