/**
 * Direct test of new strategies (no database required)
 */

import { generateCompleteEmail } from './generators/email-generator.js';
import { validateEmail } from './validators/email-validator.js';

// Mock lead data
const testLead = {
  url: 'greenthumblandscaping.com',
  company_name: 'Green Thumb Landscaping',
  industry: 'Landscaping',
  grade: 'B',
  website_score: 75,
  design_score: 80,
  seo_score: 70,
  content_score: 75,
  social_score: 70,
  top_issue: 'No online booking system - forcing customers to call during business hours',
  quick_win: 'Add online quote request form (4-hour implementation)',
  design_issues: [
    'No mobile-optimized contact form',
    'Service pricing not visible'
  ],
  quick_wins: [
    'Add online booking system',
    'Display service pricing',
    'Add customer testimonials section'
  ],
  one_liner: 'Beautiful portfolio but missing 24/7 lead capture for after-hours visitors',
  business_context: 'Family-owned for 20 years, strong reputation in local area',
  contact_name: 'Sarah',
  contact_title: 'Owner'
};

async function testStrategy(strategyName) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Testing Strategy: ${strategyName}`);
  console.log('='.repeat(70));

  try {
    const result = await generateCompleteEmail(testLead, {
      strategy: strategyName,
      model: 'claude-haiku-4-5'
    });

    const validation = validateEmail({
      subject: result.subject,
      body: result.body
    });

    console.log(`\n📧 Subject: "${result.subject}"`);
    console.log(`\n📝 Body:\n${result.body}`);
    console.log(`\n✅ Quality Score: ${validation.score}/100 (${validation.rating})`);
    console.log(`💰 Cost: $${result.total_cost.toFixed(6)}`);
    console.log(`⏱️  Time: ${result.generation_time_ms}ms`);

    if (validation.issues.length > 0) {
      console.log(`\n⚠️  Issues:`);
      validation.issues.forEach(issue => {
        console.log(`   - ${issue.issue}`);
      });
    }

    return { success: true, validation };
  } catch (error) {
    console.log(`\n❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('\n🧪 TESTING NEW EMAIL STRATEGIES');
  console.log('Testing: compliment-sandwich, problem-agitation, industry-insight\n');

  const strategies = [
    'compliment-sandwich',
    'problem-agitation',
    'industry-insight'
  ];

  const results = [];

  for (const strategy of strategies) {
    const result = await testStrategy(strategy);
    results.push({ strategy, ...result });
  }

  // Summary
  console.log(`\n\n${'='.repeat(70)}`);
  console.log('📊 SUMMARY');
  console.log('='.repeat(70));

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`\n✅ Passed: ${passed}/${strategies.length}`);
  console.log(`❌ Failed: ${failed}/${strategies.length}`);

  results.forEach(r => {
    const status = r.success ? '✅' : '❌';
    const quality = r.validation ? `(${r.validation.score}/100)` : '';
    console.log(`   ${status} ${r.strategy} ${quality}`);
  });

  console.log('\n');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
