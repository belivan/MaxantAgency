/**
 * TEST: Verify Critique Reasoning Feature
 * Tests that critique-reasoning.txt is generated with explanations
 */

import fetch from 'node-fetch';

console.log('🧪 TESTING CRITIQUE REASONING FEATURE');
console.log('='.repeat(80));

const TEST_URL = 'https://maksant.com';

console.log(`\n📍 Testing on: ${TEST_URL}`);
console.log('   Tier: 2 (3 pages)');
console.log('   Modules: Industry + Visual (defaults)');
console.log('\nThis test will verify:');
console.log('  ✓ Email is generated');
console.log('  ✓ critique-reasoning.txt is created');
console.log('  ✓ Reasoning explains WHY each critique was made');
console.log('  ✓ Uses cheap model (gpt-4o-mini) to save costs\n');

async function testCritiqueReasoning() {
  try {
    console.log('⏳ Starting analysis...\n');

    const response = await fetch('http://localhost:3000/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        urls: [TEST_URL],
        emailType: 'local',
        depthTier: 'tier2',
        modules: {
          basic: true,
          industry: true,
          visual: true,  // Visual enabled by default now!
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
      console.log('❌ Analysis failed - no results returned');
      return;
    }

    const analysis = result.results[0];
    console.log('✅ Analysis completed!');
    console.log(`   Grade: ${analysis.qualityGrade} (${analysis.qualityScore}/100)`);
    console.log(`   Email Subject: ${analysis.email?.subject}`);
    console.log(`   Has Email: ${!!analysis.email}`);
    console.log(`   Has Reasoning: ${!!analysis.critiqueReasoning}`);

    if (analysis.critiqueReasoning) {
      console.log('\n📝 CRITIQUE REASONING PREVIEW:');
      console.log('─'.repeat(80));
      const preview = analysis.critiqueReasoning.substring(0, 500);
      console.log(preview);
      if (analysis.critiqueReasoning.length > 500) {
        console.log('\n... (truncated, see full file in analysis-results/)');
      }
      console.log('─'.repeat(80));

      console.log('\n✅ SUCCESS! Critique reasoning was generated!');
      console.log('   Location: analysis-results/grade-' + analysis.qualityGrade + '/maksant.com/[timestamp]/critique-reasoning.txt');
    } else {
      console.log('\n❌ FAILED: No critique reasoning was generated');
    }

  } catch (error) {
    console.log(`\n❌ Error: ${error.message}`);
  }
}

testCritiqueReasoning();
