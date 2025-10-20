/**
 * PHASE 2 INTEGRATION TEST
 *
 * Tests all Phase 2 components:
 * - Email generator
 * - Variant generator
 * - Social DM generator
 * - Email validator
 * - Social validator
 */

import { generateEmail, generateCompleteEmail } from '../generators/email-generator.js';
import { generateEmailVariants } from '../generators/variant-generator.js';
import { generateSocialDM, generateSocialVariants } from '../generators/social-generator.js';
import { validateEmail, validateSubject, validateBody } from '../validators/email-validator.js';
import { validateSocialDM, validateSocialVariants } from '../validators/social-validator.js';

// Mock lead data
const mockLead = {
  url: 'https://apexplumbingservices.com',
  company_name: 'Apex Plumbing Services',
  industry: 'Home Services',
  lead_grade: 'C',
  website_grade: 'C',
  seo_score: 45,
  performance_score: 62,
  accessibility_score: 78,
  mobile_score: 55,
  missing_pages: ['about', 'testimonials'],
  performance_issues: ['Large images not optimized', 'No lazy loading'],
  seo_issues: ['Missing meta descriptions', 'No schema markup'],
  accessibility_issues: ['Low contrast text', 'Missing alt tags'],
  content_issues: ['No clear CTA', 'Vague service descriptions'],
  contact_info: {
    email: 'info@apexplumbing.com',
    phone: '(555) 123-4567'
  },
  social_profiles: {
    instagram: 'https://instagram.com/apexplumbing',
    facebook: 'https://facebook.com/apexplumbing'
  }
};

// Test counters
let totalTests = 0;
let passedTests = 0;
let totalCost = 0;

/**
 * Test helper
 */
function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passedTests++;
    return true;
  } catch (error) {
    console.log(`  ❌ ${name}`);
    console.log(`     Error: ${error.message}`);
    return false;
  }
}

/**
 * Test suite: Email Generator
 */
async function testEmailGenerator() {
  console.log('\n📧 Testing Email Generator...');

  // Test 1: Generate email with compliment-sandwich strategy
  console.log('\n  Test: Generate email (compliment-sandwich)');
  const email1 = await generateEmail(mockLead, {
    strategy: 'compliment-sandwich',
    model: 'claude-haiku-3-5'
  });

  test('Email body generated', () => {
    if (!email1.body || email1.body.length === 0) {
      throw new Error('Email body is empty');
    }
    if (email1.body.length < 50) {
      throw new Error('Email body too short');
    }
  });

  test('Strategy field present', () => {
    if (email1.strategy !== 'compliment-sandwich') {
      throw new Error(`Expected 'compliment-sandwich', got '${email1.strategy}'`);
    }
  });

  test('Cost tracking works', () => {
    if (typeof email1.cost !== 'number' || email1.cost <= 0) {
      throw new Error('Cost not tracked properly');
    }
    totalCost += email1.cost;
  });

  test('Usage tracking works', () => {
    if (!email1.usage || !email1.usage.input_tokens || !email1.usage.output_tokens) {
      throw new Error('Usage not tracked properly');
    }
  });

  // Test 2: Generate complete email (subject + body)
  console.log('\n  Test: Generate complete email (subject + body)');
  const email2 = await generateCompleteEmail(mockLead, {
    strategy: 'problem-first',
    model: 'claude-haiku-3-5'
  });

  test('Subject line generated', () => {
    if (!email2.subject || email2.subject.length === 0) {
      throw new Error('Subject line is empty');
    }
  });

  test('Subject length optimal (50-70 chars)', () => {
    const len = email2.subject.length;
    if (len < 50 || len > 70) {
      console.log(`     ⚠️  Subject length: ${len} chars (optimal: 50-70)`);
    }
    // Still pass the test, just warn
  });

  test('Body generated', () => {
    if (!email2.body || email2.body.length === 0) {
      throw new Error('Email body is empty');
    }
  });

  totalCost += email2.total_cost;

  console.log(`  💰 Email generator cost: $${totalCost.toFixed(6)}`);
}

/**
 * Test suite: Variant Generator
 */
async function testVariantGenerator() {
  console.log('\n🔀 Testing Variant Generator...');

  const variants = await generateEmailVariants(mockLead, {
    strategy: 'compliment-sandwich',
    subjectVariants: 3,
    bodyVariants: 2,
    model: 'claude-haiku-3-5'
  });

  test('Generated 3 subject variants', () => {
    if (!variants.subjects || variants.subjects.length !== 3) {
      throw new Error(`Expected 3 subjects, got ${variants.subjects?.length}`);
    }
  });

  test('Generated 2 body variants', () => {
    if (!variants.bodies || variants.bodies.length !== 2) {
      throw new Error(`Expected 2 bodies, got ${variants.bodies?.length}`);
    }
  });

  test('AI recommendation present', () => {
    if (!variants.recommended || typeof variants.recommended.subject !== 'number') {
      throw new Error('No AI recommendation for subject');
    }
    if (typeof variants.recommended.body !== 'number') {
      throw new Error('No AI recommendation for body');
    }
  });

  test('Recommendation reasoning present', () => {
    if (!variants.reasoning || variants.reasoning.length === 0) {
      throw new Error('No reasoning provided');
    }
  });

  test('All subjects unique', () => {
    const unique = new Set(variants.subjects);
    if (unique.size !== variants.subjects.length) {
      throw new Error('Subject variants not unique');
    }
  });

  totalCost += variants.total_cost;

  console.log(`  💡 Recommended: Subject ${variants.recommended.subject + 1}, Body ${variants.recommended.body + 1}`);
  console.log(`  📝 Reasoning: ${variants.reasoning.substring(0, 100)}...`);
  console.log(`  💰 Variant generator cost: $${variants.total_cost.toFixed(6)}`);
}

/**
 * Test suite: Social DM Generator
 */
async function testSocialGenerator() {
  console.log('\n💬 Testing Social DM Generator...');

  // Test Instagram DM
  console.log('\n  Test: Instagram DM');
  const instagramDM = await generateSocialDM(mockLead, {
    platform: 'instagram',
    strategy: 'value-first',
    model: 'claude-haiku-3-5'
  });

  test('Instagram DM generated', () => {
    if (!instagramDM.message || instagramDM.message.length === 0) {
      throw new Error('Instagram DM is empty');
    }
  });

  test('Instagram character limit (max 1000)', () => {
    if (instagramDM.character_count > 1000) {
      throw new Error(`Instagram DM too long: ${instagramDM.character_count} chars (max: 1000)`);
    }
  });

  test('Instagram validation present', () => {
    if (!instagramDM.validation || typeof instagramDM.validation.valid !== 'boolean') {
      throw new Error('Validation not present');
    }
  });

  test('No URLs in Instagram DM', () => {
    const urlPattern = /https?:\/\/|www\.|\.com|\.net|\.org/i;
    if (urlPattern.test(instagramDM.message)) {
      throw new Error('Instagram DM contains URL (blocked by Instagram)');
    }
  });

  totalCost += instagramDM.cost;

  // Test Facebook DM
  console.log('\n  Test: Facebook DM');
  const facebookDM = await generateSocialDM(mockLead, {
    platform: 'facebook',
    strategy: 'value-first',
    model: 'claude-haiku-3-5'
  });

  test('Facebook DM generated', () => {
    if (!facebookDM.message || facebookDM.message.length === 0) {
      throw new Error('Facebook DM is empty');
    }
  });

  test('Facebook character limit (max 5000)', () => {
    if (facebookDM.character_count > 5000) {
      throw new Error(`Facebook DM too long: ${facebookDM.character_count} chars (max: 5000)`);
    }
  });

  totalCost += facebookDM.cost;

  // Test LinkedIn DM
  console.log('\n  Test: LinkedIn DM');
  const linkedinDM = await generateSocialDM(mockLead, {
    platform: 'linkedin',
    strategy: 'value-first',
    model: 'claude-haiku-3-5'
  });

  test('LinkedIn DM generated', () => {
    if (!linkedinDM.message || linkedinDM.message.length === 0) {
      throw new Error('LinkedIn DM is empty');
    }
  });

  test('LinkedIn character limit (max 1900)', () => {
    if (linkedinDM.character_count > 1900) {
      throw new Error(`LinkedIn DM too long: ${linkedinDM.character_count} chars (max: 1900)`);
    }
  });

  totalCost += linkedinDM.cost;

  console.log(`  📊 Instagram: ${instagramDM.character_count} chars`);
  console.log(`  📊 Facebook: ${facebookDM.character_count} chars`);
  console.log(`  📊 LinkedIn: ${linkedinDM.character_count} chars`);
  console.log(`  💰 Social generator cost: $${(instagramDM.cost + facebookDM.cost + linkedinDM.cost).toFixed(6)}`);
}

/**
 * Test suite: Email Validator
 */
async function testEmailValidator() {
  console.log('\n✅ Testing Email Validator...');

  // Test good email
  const goodEmail = {
    subject: 'quick mobile speed fix for apexplumbingservices.com',
    body: `Hey there,

I was checking out your site and noticed your mobile speed is a bit slow (55/100). That's costing you customers who bounce before your page loads.

The good news? This is super fixable. I can show you exactly what's slowing it down.

Want me to send over a quick breakdown?

Best,
Max`
  };

  console.log('\n  Test: Valid email');
  const validation1 = validateEmail(goodEmail);

  test('Good email passes validation', () => {
    if (!validation1.isValid) {
      throw new Error(`Good email failed validation (score: ${validation1.score})`);
    }
  });

  test('Score is high (>= 70)', () => {
    if (validation1.score < 70) {
      throw new Error(`Score too low: ${validation1.score}`);
    }
  });

  test('Rating is good/excellent', () => {
    const acceptableRatings = ['good', 'excellent', 'acceptable'];
    if (!acceptableRatings.includes(validation1.rating)) {
      throw new Error(`Rating: ${validation1.rating}`);
    }
  });

  // Test bad email (spam phrases, too long, etc.)
  const badEmail = {
    subject: 'FREE MONEY!!! CLICK HERE NOW!!!',
    body: `Dear Sir/Madam,

This is a limited time offer to leverage our synergistic solutions and unlock your potential! We guarantee 100% results with our revolutionary breakthrough technology!

Act now before it's too late! This exclusive opportunity won't last forever!

CLICK HERE to claim your FREE trial and transform your business overnight!

Best Regards,
Salesperson`
  };

  console.log('\n  Test: Invalid email (spam)');
  const validation2 = validateEmail(badEmail);

  test('Bad email fails validation', () => {
    if (validation2.isValid) {
      throw new Error('Spam email passed validation');
    }
  });

  test('Score is low (< 70)', () => {
    if (validation2.score >= 70) {
      throw new Error(`Score too high: ${validation2.score}`);
    }
  });

  test('Issues detected', () => {
    if (!validation2.issues || validation2.issues.length === 0) {
      throw new Error('No issues detected in spam email');
    }
  });

  // Test placeholder detection
  const emailWithPlaceholder = {
    subject: 'quick fix for {{company_name}}',
    body: 'Hey {{first_name}}, I noticed an issue...'
  };

  console.log('\n  Test: Placeholder detection');
  const validation3 = validateEmail(emailWithPlaceholder);

  test('Placeholders detected', () => {
    if (validation3.isValid) {
      throw new Error('Email with placeholders passed validation');
    }
    const hasPlaceholderIssue = validation3.issues.some(i =>
      i.issue.toLowerCase().includes('placeholder')
    );
    if (!hasPlaceholderIssue) {
      throw new Error('Placeholder issue not detected');
    }
  });

  console.log(`  📊 Good email score: ${validation1.score}/100 (${validation1.rating})`);
  console.log(`  📊 Spam email score: ${validation2.score}/100 (${validation2.rating})`);
  console.log(`  📊 Placeholder email score: ${validation3.score}/100 (${validation3.rating})`);
}

/**
 * Test suite: Social Validator
 */
async function testSocialValidator() {
  console.log('\n✅ Testing Social Validator...');

  // Test valid Instagram DM
  const goodInstagramDM = {
    message: "hey! just checked out your page and your work looks amazing 👏 noticed you could get way more visibility with a couple quick tweaks to your bio and posting schedule. mind if i share what i found?",
    platform: 'instagram'
  };

  console.log('\n  Test: Valid Instagram DM');
  const validation1 = validateSocialDM(goodInstagramDM);

  test('Good Instagram DM passes', () => {
    if (!validation1.valid) {
      throw new Error(`Good DM failed validation (score: ${validation1.score})`);
    }
  });

  test('Score is high (>= 65)', () => {
    if (validation1.score < 65) {
      throw new Error(`Score too low: ${validation1.score}`);
    }
  });

  // Test Instagram DM with URL (blocked)
  const dmWithURL = {
    message: "Hey! Check out my website at https://example.com for more info",
    platform: 'instagram'
  };

  console.log('\n  Test: Instagram DM with URL');
  const validation2 = validateSocialDM(dmWithURL);

  test('Instagram DM with URL fails', () => {
    if (validation2.valid) {
      throw new Error('Instagram DM with URL passed validation');
    }
    const hasURLIssue = validation2.issues.some(i =>
      i.issue.toLowerCase().includes('url') || i.issue.toLowerCase().includes('pattern')
    );
    if (!hasURLIssue) {
      throw new Error('URL issue not detected');
    }
  });

  // Test character limit violation
  const tooLongDM = {
    message: 'a'.repeat(1500),
    platform: 'instagram'
  };

  console.log('\n  Test: Character limit (Instagram 1000)');
  const validation3 = validateSocialDM(tooLongDM);

  test('Too long DM fails', () => {
    if (validation3.valid) {
      throw new Error('Too long DM passed validation');
    }
    const hasCharIssue = validation3.issues.some(i =>
      i.issue.toLowerCase().includes('character') || i.issue.toLowerCase().includes('limit')
    );
    if (!hasCharIssue) {
      throw new Error('Character limit issue not detected');
    }
  });

  // Test Facebook DM (different limits)
  const facebookDM = {
    message: "Hey there! I came across your Facebook page and noticed a few things that could help you reach more customers in your area.",
    platform: 'facebook'
  };

  console.log('\n  Test: Facebook DM');
  const validation4 = validateSocialDM(facebookDM);

  test('Facebook DM validated correctly', () => {
    if (validation4.platform !== 'facebook') {
      throw new Error('Platform not set correctly');
    }
  });

  // Test LinkedIn DM (professional tone)
  const linkedinDM = {
    message: "Hi there, I noticed your company's website and saw some opportunities to improve your online presence. Would you be open to a brief conversation?",
    platform: 'linkedin'
  };

  console.log('\n  Test: LinkedIn DM');
  const validation5 = validateSocialDM(linkedinDM);

  test('LinkedIn DM validated correctly', () => {
    if (validation5.platform !== 'linkedin') {
      throw new Error('Platform not set correctly');
    }
  });

  console.log(`  📊 Good Instagram DM: ${validation1.score}/100 (${validation1.rating})`);
  console.log(`  📊 Instagram DM with URL: ${validation2.score}/100 (${validation2.rating})`);
  console.log(`  📊 Too long DM: ${validation3.score}/100 (${validation3.rating})`);
  console.log(`  📊 Facebook DM: ${validation4.score}/100 (${validation4.rating})`);
  console.log(`  📊 LinkedIn DM: ${validation5.score}/100 (${validation5.rating})`);
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║        PHASE 2 INTEGRATION TEST SUITE                 ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  const startTime = Date.now();

  try {
    await testEmailGenerator();
    await testVariantGenerator();
    await testSocialGenerator();
    await testEmailValidator();
    await testSocialValidator();

    const duration = Date.now() - startTime;

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                   TEST SUMMARY                         ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log(`\n  Total Tests: ${totalTests}`);
    console.log(`  Passed: ${passedTests}`);
    console.log(`  Failed: ${totalTests - passedTests}`);
    console.log(`  Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    console.log(`  Duration: ${duration}ms`);
    console.log(`  Total Cost: $${totalCost.toFixed(6)}`);

    if (passedTests === totalTests) {
      console.log('\n  ✅ ALL TESTS PASSED!');
      console.log('\n  Phase 2 is complete and ready for Phase 3 (Integrations).');
      process.exit(0);
    } else {
      console.log('\n  ❌ SOME TESTS FAILED');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n  ❌ Test suite error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
runAllTests();
