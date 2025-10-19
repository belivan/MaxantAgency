/**
 * QUICK TEST: Manual review of actual results
 * Run 3 quick analyses and output the results for manual review
 */

import fetch from 'node-fetch';

const TESTS = [
  {
    name: 'TEST 1: maksant.com (Visual OFF)',
    url: 'https://maksant.com',
    modules: { basic: true, industry: true, visual: false, seo: false, competitor: false }
  },
  {
    name: 'TEST 2: goettl.com (Visual OFF)',
    url: 'https://goettl.com',
    modules: { basic: true, industry: true, visual: false, seo: false, competitor: false }
  },
  {
    name: 'TEST 3: maksant.com (Visual ON)',
    url: 'https://maksant.com',
    modules: { basic: true, industry: true, visual: true, seo: false, competitor: false }
  }
];

async function runTest(test, index) {
  console.log('\n' + '='.repeat(80));
  console.log(`${test.name}`);
  console.log('='.repeat(80));
  console.log(`URL: ${test.url}`);
  console.log(`Modules: ${JSON.stringify(test.modules)}\n`);

  try {
    const response = await fetch('http://localhost:3000/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        urls: [test.url],
        emailType: 'local',
        depthTier: 'tier1',
        modules: test.modules
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
      return;
    }

    const analysis = result.results[0];

    console.log('✅ ANALYSIS COMPLETE');
    console.log(`   Grade: ${analysis.qualityGrade} (${analysis.qualityScore}/100)`);
    console.log(`   Company: ${analysis.companyName || 'Unknown'}`);
    console.log(`   Industry: ${analysis.industry?.specific || 'Unknown'}`);
    console.log(`   Email: ${analysis.contact?.email || 'NOT FOUND'}`);
    console.log(`   Phone: ${analysis.grokData?.contactInfo?.phone || 'NOT FOUND'}`);
    console.log(`   Modules Used: ${analysis.modulesUsed?.join(', ') || 'None'}`);

    console.log('\n📧 EMAIL:');
    console.log(`   Subject: ${analysis.email?.subject || 'N/A'}`);
    console.log('\n   Body:');
    console.log('   ' + '─'.repeat(76));
    if (analysis.email?.body) {
      const lines = analysis.email.body.split('\n');
      lines.forEach(line => console.log('   ' + line));
    }
    console.log('   ' + '─'.repeat(76));

    console.log('\n🔍 CRITIQUES:');
    if (analysis.critiques?.basic) {
      console.log(`   Basic critiques: ${analysis.critiques.basic.length}`);
      analysis.critiques.basic.forEach((c, i) => {
        console.log(`   ${i + 1}. ${c.substring(0, 120)}...`);
      });
    }
    if (analysis.critiques?.industry) {
      console.log(`   Industry critiques: ${analysis.critiques.industry.length}`);
    }
    if (analysis.critiques?.visual) {
      console.log(`   Visual critiques: ${analysis.critiques.visual.length}`);
    }

    console.log('\n🎯 AGENT SEPARATION CHECK:');

    // Check for banned visual phrases (only if visual was OFF)
    if (!test.modules.visual) {
      const allText = JSON.stringify(analysis).toLowerCase();
      const visualTerms = ['button size', 'color contrast', 'above fold', 'font size', 'text light'];
      const found = visualTerms.filter(term => allText.includes(term));

      if (found.length === 0) {
        console.log('   ✅ NO visual critiques detected (visual module was OFF)');
      } else {
        console.log(`   ⚠️  Found visual terms: ${found.join(', ')}`);
      }
    } else {
      console.log(`   📊 Visual module ON - visual critiques allowed`);
      console.log(`   Has visual data: ${analysis.visual ? 'YES' : 'NO'}`);
    }

    // Check for fake personalization
    const emailText = (analysis.email?.subject + ' ' + analysis.email?.body).toLowerCase();
    const fakeTerms = ['love your instagram', 'love your facebook', 'great photos', 'amazing content'];
    const fakesFound = fakeTerms.filter(term => emailText.includes(term));

    if (fakesFound.length === 0) {
      console.log('   ✅ NO fake personalization detected');
    } else {
      console.log(`   ⚠️  Fake personalization: ${fakesFound.join(', ')}`);
    }

    // Check for honest personalization examples
    const services = analysis.grokData?.businessIntel?.services || [];
    if (services.length > 0 && emailText.includes(services[0].toLowerCase())) {
      console.log(`   ✅ HONEST personalization: Mentions service "${services[0]}"`);
    }

  } catch (error) {
    console.log(`\n❌ Error: ${error.message}`);
  }
}

async function runAllTests() {
  console.log('\n🎯 QUICK MANUAL REVIEW TEST');
  console.log('Running 3 analyses and outputting results for manual review\n');

  for (let i = 0; i < TESTS.length; i++) {
    await runTest(TESTS[i], i);

    // Wait between tests
    if (i < TESTS.length - 1) {
      console.log('\n⏳ Waiting 3 seconds before next test...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  console.log('\n\n' + '='.repeat(80));
  console.log('🎉 ALL TESTS COMPLETE - Review results above');
  console.log('='.repeat(80));
}

runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
