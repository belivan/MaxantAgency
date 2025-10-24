/**
 * Analyzer Module Tests
 *
 * Tests that all analyzer modules:
 * 1. Can be imported
 * 2. Load their prompts correctly
 * 3. Handle errors gracefully
 * 4. Return expected data structures
 *
 * NOTE: These tests do NOT make real API calls (would be expensive)
 * They test module structure and error handling only
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test utilities
let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ ${message}`);
    testsPassed++;
  } else {
    console.log(`❌ ${message}`);
    testsFailed++;
  }
}

console.log('═══════════════════════════════════════════════════════════════');
console.log('ANALYZER MODULE TESTS');
console.log('═══════════════════════════════════════════════════════════════\n');

// Test 1: Import all analyzers
console.log('Test 1: Import analyzer modules');
console.log('─────────────────────────────────────────────────────────────');

try {
  // DEPRECATED: design-analyzer.js removed - use desktop-visual-analyzer and mobile-visual-analyzer instead
  console.log('⚠️  Skipping deprecated design-analyzer (use desktop/mobile analyzers)');

  const desktopAnalyzer = await import('../../analyzers/desktop-visual-analyzer.js');
  assert(typeof desktopAnalyzer.analyzeDesktopVisual === 'function', 'desktop-visual-analyzer exports analyzeDesktopVisual function');
  assert(typeof desktopAnalyzer.countCriticalDesktopIssues === 'function', 'desktop-visual-analyzer exports countCriticalDesktopIssues function');

  const mobileAnalyzer = await import('../../analyzers/mobile-visual-analyzer.js');
  assert(typeof mobileAnalyzer.analyzeMobileVisual === 'function', 'mobile-visual-analyzer exports analyzeMobileVisual function');
  assert(typeof mobileAnalyzer.countCriticalMobileIssues === 'function', 'mobile-visual-analyzer exports countCriticalMobileIssues function');

  const seoAnalyzer = await import('../../analyzers/seo-analyzer.js');
  assert(typeof seoAnalyzer.analyzeSEO === 'function', 'seo-analyzer exports analyzeSEO function');
  assert(typeof seoAnalyzer.countCriticalSEOIssues === 'function', 'seo-analyzer exports countCriticalSEOIssues function');

  const contentAnalyzer = await import('../../analyzers/content-analyzer.js');
  assert(typeof contentAnalyzer.analyzeContent === 'function', 'content-analyzer exports analyzeContent function');
  assert(typeof contentAnalyzer.getBestEngagementHook === 'function', 'content-analyzer exports getBestEngagementHook function');

  const socialAnalyzer = await import('../../analyzers/social-analyzer.js');
  assert(typeof socialAnalyzer.analyzeSocial === 'function', 'social-analyzer exports analyzeSocial function');
  assert(typeof socialAnalyzer.hasSocialPresence === 'function', 'social-analyzer exports hasSocialPresence function');

  console.log('');

} catch (error) {
  console.error('❌ Failed to import analyzers:', error.message);
  testsFailed++;
}

// Test 2: Import barrel export
console.log('Test 2: Import barrel export (analyzers/index.js)');
console.log('─────────────────────────────────────────────────────────────');

try {
  const analyzers = await import('../../analyzers/index.js');
  // DEPRECATED: analyzeDesign removed from barrel export
  assert(typeof analyzers.analyzeDesktopVisual === 'function', 'Barrel exports analyzeDesktopVisual');
  assert(typeof analyzers.analyzeMobileVisual === 'function', 'Barrel exports analyzeMobileVisual');
  assert(typeof analyzers.analyzeSEO === 'function', 'Barrel exports analyzeSEO');
  assert(typeof analyzers.analyzeContent === 'function', 'Barrel exports analyzeContent');
  assert(typeof analyzers.analyzeSocial === 'function', 'Barrel exports analyzeSocial');
  assert(typeof analyzers.runAllAnalyses === 'function', 'Barrel exports runAllAnalyses');
  assert(typeof analyzers.calculateTotalCost === 'function', 'Barrel exports calculateTotalCost');

  console.log('');

} catch (error) {
  console.error('❌ Failed to import barrel export:', error.message);
  testsFailed++;
}

// Test 3: Verify prompt loading for each analyzer
console.log('Test 3: Verify prompt configurations');
console.log('─────────────────────────────────────────────────────────────');

try {
  const { loadPrompt } = await import('../../shared/prompt-loader.js');

  // Desktop Visual prompt (replaces old design-critique)
  const desktopPrompt = await loadPrompt('web-design/desktop-visual-analysis', {
    company_name: 'Test Company',
    industry: 'Restaurant',
    url: 'https://test.com',
    tech_stack: 'WordPress',
    load_time: '2.5'
  });
  assert(desktopPrompt.model === 'gpt-5', 'Desktop visual analyzer uses GPT-5');
  assert(desktopPrompt.userPrompt.includes('Test Company'), 'Desktop visual prompt substitutes company_name');

  // SEO prompt
  const seoPrompt = await loadPrompt('web-design/seo-analysis', {
    url: 'https://test.com',
    industry: 'Restaurant',
    load_time: '2500',
    tech_stack: 'WordPress',
    html: '<html><head><title>Test</title></head><body><h1>Test</h1></body></html>'
  });
  assert(seoPrompt.model === 'gpt-5', 'SEO analyzer uses GPT-5');

  // Content prompt
  const contentPrompt = await loadPrompt('web-design/content-analysis', {
    company_name: 'Test Company',
    industry: 'Restaurant',
    url: 'https://test.com',
    content_summary: 'Homepage Headline: "Test"\nWord Count: 500',
    blog_posts: 'No blog posts found',
    key_pages: '- About section: Present\n- Services section: Present'
  });
  assert(contentPrompt.model === 'gpt-5', 'Content analyzer uses GPT-5');

  // Social prompt
  const socialPrompt = await loadPrompt('web-design/social-analysis', {
    company_name: 'Test Company',
    industry: 'Restaurant',
    url: 'https://test.com',
    social_profiles: '{}',
    social_metadata: '{}',
    website_branding: '{}'
  });
  assert(socialPrompt.model === 'gpt-5', 'Social analyzer uses GPT-5');

  console.log('');

} catch (error) {
  console.error('❌ Prompt loading failed:', error.message);
  testsFailed++;
}

// Test 4: Test helper functions
console.log('Test 4: Test analyzer helper functions');
console.log('─────────────────────────────────────────────────────────────');

try {
  // DEPRECATED: countQuickWins from design-analyzer.js removed
  console.log('⚠️  Skipping deprecated countQuickWins test (design-analyzer removed)');

  const { countCriticalSEOIssues } = await import('../../analyzers/seo-analyzer.js');
  const { getBestEngagementHook } = await import('../../analyzers/content-analyzer.js');
  const { hasSocialPresence } = await import('../../analyzers/social-analyzer.js');

  // Test countCriticalSEOIssues
  const mockSEOResults = {
    issues: [
      { severity: 'critical' },
      { severity: 'medium' },
      { priority: 'high' },
      { priority: 'low' }
    ]
  };
  const criticalCount = countCriticalSEOIssues(mockSEOResults);
  assert(criticalCount === 2, `countCriticalSEOIssues returns correct count (expected 2, got ${criticalCount})`);

  // Test getBestEngagementHook
  const mockContentResults = {
    engagementHooks: [
      { type: 'generic', specificity: 'low' },
      { type: 'blog_mention', specificity: 'high' }
    ]
  };
  const bestHook = getBestEngagementHook(mockContentResults);
  assert(bestHook.type === 'blog_mention', 'getBestEngagementHook prioritizes specific hooks');

  // Test hasSocialPresence
  const socialProfilesPresent = { instagram: 'https://instagram.com/test', facebook: '' };
  const socialProfilesAbsent = {};
  assert(hasSocialPresence(socialProfilesPresent) === true, 'hasSocialPresence returns true when profiles exist');
  assert(hasSocialPresence(socialProfilesAbsent) === false, 'hasSocialPresence returns false when no profiles');

  console.log('');

} catch (error) {
  console.error('❌ Helper function tests failed:', error.message);
  testsFailed++;
}

// Test 5: Test calculateTotalCost
console.log('Test 5: Test cost calculation');
console.log('─────────────────────────────────────────────────────────────');

try {
  const { calculateTotalCost } = await import('../../analyzers/index.js');

  const mockResults = {
    design: { _meta: { cost: 0.015 } },
    seo: { _meta: { cost: 0.006 } },
    content: { _meta: { cost: 0.006 } },
    social: { _meta: { cost: 0.006 } }
  };

  const totalCost = calculateTotalCost(mockResults);
  const expectedCost = 0.033;
  const costDiff = Math.abs(totalCost - expectedCost);

  assert(costDiff < 0.001, `calculateTotalCost returns correct sum (expected ~${expectedCost}, got ${totalCost})`);

  console.log('');

} catch (error) {
  console.error('❌ Cost calculation test failed:', error.message);
  testsFailed++;
}

// Test 6: Test AI client
console.log('Test 6: Test AI client utility');
console.log('─────────────────────────────────────────────────────────────');

try {
  const aiClient = await import('../../shared/ai-client.js');

  assert(typeof aiClient.callAI === 'function', 'AI client exports callAI function');
  assert(typeof aiClient.parseJSONResponse === 'function', 'AI client exports parseJSONResponse function');

  // Test JSON parsing
  const validJSON = '{"test": "value"}';
  const parsed = aiClient.parseJSONResponse(validJSON);
  assert(parsed.test === 'value', 'parseJSONResponse correctly parses JSON');

  // Test invalid JSON (should throw)
  try {
    aiClient.parseJSONResponse('invalid json');
    assert(false, 'parseJSONResponse should throw on invalid JSON');
  } catch (error) {
    assert(true, 'parseJSONResponse throws error on invalid JSON');
  }

  console.log('');

} catch (error) {
  console.error('❌ AI client tests failed:', error.message);
  testsFailed++;
}

// Test Summary
console.log('═══════════════════════════════════════════════════════════════');
console.log('TEST SUMMARY');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log(`✅ Passed: ${testsPassed}`);
console.log(`❌ Failed: ${testsFailed}`);
console.log(`   Total:  ${testsPassed + testsFailed}\n`);

if (testsFailed === 0) {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('ALL TESTS PASSED ✅');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('Analyzer modules are working correctly!');
  console.log('Ready to move to Phase 3: Grading & Critique System\n');
} else {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`${testsFailed} TESTS FAILED ❌`);
  console.log('═══════════════════════════════════════════════════════════════\n');
  process.exit(1);
}
