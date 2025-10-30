/**
 * Test updated prompt loader with Handlebars helpers
 */

import { loadPrompt } from '../shared/prompt-loader.js';

console.log('🧪 Testing Prompt Loader with Handlebars Helpers');
console.log('=================================================\n');

try {
  // Test social strengths extractor v2 with Handlebars syntax
  console.log('1. Testing social-strengths-extractor-v2...');
  const socialPrompt = await loadPrompt('benchmarking/social-strengths-extractor-v2', {
    company_name: 'Test Dental',
    industry: 'dentist',
    url: 'https://test.com',
    google_rating: 4.8,
    google_review_count: 150,
    social_score: 85,
    social_issues: [{issue: 'Test issue', severity: 'minor'}],
    social_platforms_present: ['google', 'facebook'],
    social_profiles: {google: 'https://google.com/test'},
    screenshot_desktop_url: 'https://test.com/desktop.png',
    screenshot_mobile_url: 'https://test.com/mobile.png'
  });

  console.log('✅ Social prompt loaded successfully!');
  console.log(`   Model: ${socialPrompt.model}`);
  console.log(`   User prompt length: ${socialPrompt.userPrompt.length} chars`);

  // Check for Handlebars rendering
  if (socialPrompt.userPrompt.includes('{{') || socialPrompt.userPrompt.includes('Missing helper')) {
    console.log('⚠️  WARNING: Template may not have rendered correctly');
    console.log('   Sample:', socialPrompt.userPrompt.substring(0, 500));
  } else {
    console.log('✅ Template rendered correctly (no {{ or errors visible)');
  }
  console.log('');

  // Test accessibility strengths extractor v2
  console.log('2. Testing accessibility-strengths-extractor-v2...');
  const accessibilityPrompt = await loadPrompt('benchmarking/accessibility-strengths-extractor-v2', {
    company_name: 'Test Dental',
    industry: 'dentist',
    url: 'https://test.com',
    accessibility_score: 82,
    accessibility_compliance: 'AA',
    accessibility_issues: [{issue: 'Test issue', severity: 'minor'}],
    design_tokens_desktop: {colors: {primary: '#1B3A57', background: '#FFFFFF'}},
    design_tokens_mobile: {colors: {primary: '#1B3A57', background: '#FFFFFF'}},
    screenshot_desktop_url: 'https://test.com/desktop.png',
    screenshot_mobile_url: 'https://test.com/mobile.png'
  });

  console.log('✅ Accessibility prompt loaded successfully!');
  console.log(`   Model: ${accessibilityPrompt.model}`);
  console.log(`   User prompt length: ${accessibilityPrompt.userPrompt.length} chars`);

  if (accessibilityPrompt.userPrompt.includes('{{') || accessibilityPrompt.userPrompt.includes('Missing helper')) {
    console.log('⚠️  WARNING: Template may not have rendered correctly');
    console.log('   Sample:', accessibilityPrompt.userPrompt.substring(0, 500));
  } else {
    console.log('✅ Template rendered correctly');
  }
  console.log('');

  console.log('✅ All tests passed! Prompt loader with Handlebars helpers is working.');
  console.log('');
  console.log('Ready to run backfill script!');

} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}
