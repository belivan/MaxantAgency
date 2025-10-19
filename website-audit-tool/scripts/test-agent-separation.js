/**
 * TEST: Agent Separation Verification
 * Tests that each agent stays in its lane and doesn't overlap
 *
 * TWO CRITICAL TESTS:
 * 1. Visual module OFF → NO visual critiques
 * 2. Visual module ON → Visual critiques allowed
 */

import fetch from 'node-fetch';

console.log('🎯 AGENT SEPARATION TEST');
console.log('='.repeat(80));
console.log('\nTesting strict agent boundaries from AGENT-PROMPTS.md:\n');
console.log('  📊 Basic Analysis Agent: NO visual critiques when visual OFF');
console.log('  ✍️  Email Writing Agent: Honest personalization ONLY');
console.log('  👁️  Visual Agent: Only runs when visual module ON\n');

const TEST_URL = 'https://maksant.com';

// Banned visual phrases that should NOT appear when visual module is OFF
const BANNED_VISUAL_PHRASES = [
  'button is too small',
  'button too small',
  'hard to see',
  'not visible',
  'above the fold',
  'contrast',
  'color',
  'spacing',
  'layout',
  'font size',
  'text is light',
  'design is',
  'looks',
  'blurry',
  'image quality'
];

// Banned fake personalization phrases
const BANNED_FAKE_PHRASES = [
  'love your instagram',
  'love your facebook',
  'love your twitter',
  'love your tweets',
  'your instagram posts',
  'your facebook posts',
  'great photos',
  'amazing content',
  'love your content'
];

async function testVisualOff() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 1: Visual Module OFF');
  console.log('='.repeat(80));
  console.log('\nExpected: NO visual critiques (button sizes, colors, contrast, etc.)');
  console.log('Allowed: Missing info, page speed, content clarity, SEO\n');

  try {
    console.log('⏳ Analyzing with visual module DISABLED...\n');

    const response = await fetch('http://localhost:3000/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        urls: [TEST_URL],
        emailType: 'local',
        depthTier: 'tier1',  // Just homepage for speed
        modules: {
          basic: true,
          industry: true,
          visual: false,     // VISUAL OFF
          seo: false,
          competitor: false
        }
      })
    });

    const text = await response.text();
    const events = text.split('\n\n').filter(e => e.trim());

    let result = null;
    for (const event of events) {
      if (event.startsWith('data: ')) {
        const data = JSON.parse(event.slice(6));
        if (data.type === 'complete') {
          result = data;
        }
      }
    }

    if (!result?.results?.[0]) {
      console.log('❌ Analysis failed');
      return { success: false };
    }

    const analysis = result.results[0];
    const email = analysis.email?.body || '';
    const critiques = JSON.stringify(analysis); // Check all critiques

    console.log('✅ Analysis completed!');
    console.log(`   Grade: ${analysis.qualityGrade} (${analysis.qualityScore}/100)`);
    console.log(`   Email subject: ${analysis.email?.subject}\n`);

    // Check for banned visual phrases
    const foundVisualPhrases = [];
    for (const phrase of BANNED_VISUAL_PHRASES) {
      if (critiques.toLowerCase().includes(phrase.toLowerCase()) ||
          email.toLowerCase().includes(phrase.toLowerCase())) {
        foundVisualPhrases.push(phrase);
      }
    }

    // Check for banned fake personalization
    const foundFakePhrases = [];
    for (const phrase of BANNED_FAKE_PHRASES) {
      if (email.toLowerCase().includes(phrase.toLowerCase())) {
        foundFakePhrases.push(phrase);
      }
    }

    console.log('🔍 VISUAL CRITIQUE CHECK:');
    if (foundVisualPhrases.length === 0) {
      console.log('   ✅ NO visual critiques found - agent stayed in its lane!');
    } else {
      console.log('   ❌ VISUAL CRITIQUES DETECTED (should not happen):');
      foundVisualPhrases.forEach(phrase => {
        console.log(`      - "${phrase}"`);
      });
    }

    console.log('\n🔍 FAKE PERSONALIZATION CHECK:');
    if (foundFakePhrases.length === 0) {
      console.log('   ✅ NO fake personalization - honest only!');
    } else {
      console.log('   ❌ FAKE PERSONALIZATION DETECTED:');
      foundFakePhrases.forEach(phrase => {
        console.log(`      - "${phrase}"`);
      });
    }

    console.log('\n📧 EMAIL PREVIEW (first 300 chars):');
    console.log('─'.repeat(80));
    console.log(email.substring(0, 300) + '...');
    console.log('─'.repeat(80));

    return {
      success: true,
      visualPhrasesFound: foundVisualPhrases.length,
      fakePhrasesFound: foundFakePhrases.length,
      passed: foundVisualPhrases.length === 0 && foundFakePhrases.length === 0
    };

  } catch (error) {
    console.log(`\n❌ Error: ${error.message}`);
    return { success: false };
  }
}

async function testVisualOn() {
  console.log('\n\n' + '='.repeat(80));
  console.log('TEST 2: Visual Module ON');
  console.log('='.repeat(80));
  console.log('\nExpected: Visual critiques ARE allowed (buttons, colors, layout, etc.)');
  console.log('Checking: Visual analysis data exists\n');

  try {
    console.log('⏳ Analyzing with visual module ENABLED...\n');

    const response = await fetch('http://localhost:3000/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        urls: [TEST_URL],
        emailType: 'local',
        depthTier: 'tier1',
        modules: {
          basic: true,
          industry: true,
          visual: true,      // VISUAL ON
          seo: false,
          competitor: false
        }
      })
    });

    const text = await response.text();
    const events = text.split('\n\n').filter(e => e.trim());

    let result = null;
    for (const event of events) {
      if (event.startsWith('data: ')) {
        const data = JSON.parse(event.slice(6));
        if (data.type === 'complete') {
          result = data;
        }
      }
    }

    if (!result?.results?.[0]) {
      console.log('❌ Analysis failed');
      return { success: false };
    }

    const analysis = result.results[0];
    const hasVisualData = !!analysis.visual;

    console.log('✅ Analysis completed!');
    console.log(`   Grade: ${analysis.qualityGrade} (${analysis.qualityScore}/100)`);
    console.log(`   Has visual data: ${hasVisualData ? 'YES' : 'NO'}`);

    console.log('\n🔍 VISUAL DATA CHECK:');
    if (hasVisualData) {
      console.log('   ✅ Visual analysis ran - visual critiques ARE allowed!');
      console.log(`   📊 Visual critiques count: ${analysis.visual?.critiques?.length || 0}`);
    } else {
      console.log('   ⚠️  NO visual data - visual module may not have run');
    }

    return {
      success: true,
      hasVisualData,
      passed: hasVisualData
    };

  } catch (error) {
    console.log(`\n❌ Error: ${error.message}`);
    return { success: false };
  }
}

async function runTests() {
  const test1 = await testVisualOff();
  await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between tests
  const test2 = await testVisualOn();

  // FINAL SUMMARY
  console.log('\n\n' + '='.repeat(80));
  console.log('🎯 AGENT SEPARATION TEST SUMMARY');
  console.log('='.repeat(80));

  console.log('\nTEST 1 - Visual Module OFF:');
  if (test1.passed) {
    console.log('  ✅ PASSED - No visual critiques, no fake personalization');
  } else {
    console.log('  ❌ FAILED');
    if (test1.visualPhrasesFound > 0) {
      console.log(`     - Found ${test1.visualPhrasesFound} banned visual phrases`);
    }
    if (test1.fakePhrasesFound > 0) {
      console.log(`     - Found ${test1.fakePhrasesFound} fake personalization phrases`);
    }
  }

  console.log('\nTEST 2 - Visual Module ON:');
  if (test2.passed) {
    console.log('  ✅ PASSED - Visual analysis ran successfully');
  } else {
    console.log('  ❌ FAILED - Visual analysis did not run');
  }

  console.log('\n' + '='.repeat(80));
  if (test1.passed && test2.passed) {
    console.log('🎉 ALL TESTS PASSED! Agent separation is working correctly!');
  } else {
    console.log('⚠️  SOME TESTS FAILED - Review details above');
  }
  console.log('='.repeat(80));
}

runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
