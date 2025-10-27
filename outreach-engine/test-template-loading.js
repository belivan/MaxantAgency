import { loadPrompt } from './shared/prompt-loader.js';

const EMAIL_VARIATIONS = [
  { name: 'free-value-delivery', type: 'free_value' },
  { name: 'portfolio-building', type: 'portfolio_building' },
  { name: 'problem-first-urgent', type: 'problem_first' }
];

const SOCIAL_VARIATIONS = {
  instagram: [
    { name: 'instagram-free-value', type: 'free_value' },
    { name: 'instagram-portfolio-building', type: 'portfolio_building' },
    { name: 'instagram-problem-first', type: 'problem_first' }
  ],
  linkedin: [
    { name: 'linkedin-free-value', type: 'free_value' },
    { name: 'linkedin-portfolio-building', type: 'portfolio_building' },
    { name: 'linkedin-problem-first', type: 'problem_first' }
  ],
  facebook: [
    { name: 'facebook-free-value', type: 'free_value' },
    { name: 'facebook-portfolio-building', type: 'portfolio_building' },
    { name: 'facebook-problem-first', type: 'problem_first' }
  ]
};

console.log('Testing template loading...\n');

let passed = 0;
let failed = 0;

// Test email templates
console.log('EMAIL TEMPLATES:');
for (const variation of EMAIL_VARIATIONS) {
  try {
    const prompt = loadPrompt('email-strategies', variation.name, {});
    if (prompt && prompt.model && prompt.systemPrompt) {
      console.log(`  ✓ ${variation.name}`);
      passed++;
    } else {
      console.log(`  ✗ ${variation.name} - Missing required fields`);
      failed++;
    }
  } catch (error) {
    console.log(`  ✗ ${variation.name} - ${error.message}`);
    failed++;
  }
}

// Test social templates
for (const [platform, variations] of Object.entries(SOCIAL_VARIATIONS)) {
  console.log(`\n${platform.toUpperCase()} TEMPLATES:`);
  for (const variation of variations) {
    try {
      const prompt = loadPrompt('social-strategies', variation.name, {});
      if (prompt && prompt.model && prompt.systemPrompt) {
        console.log(`  ✓ ${variation.name}`);
        passed++;
      } else {
        console.log(`  ✗ ${variation.name} - Missing required fields`);
        failed++;
      }
    } catch (error) {
      console.log(`  ✗ ${variation.name} - ${error.message}`);
      failed++;
    }
  }
}

console.log(`\n${'='.repeat(50)}`);
console.log(`✅ Passed: ${passed}/12`);
console.log(`❌ Failed: ${failed}/12`);
console.log(failed === 0 ? '\n🎉 All templates ready for generation!' : '\n⚠️  Fix errors before generation');

process.exit(failed);
