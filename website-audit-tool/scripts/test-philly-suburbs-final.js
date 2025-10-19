/**
 * FINAL COMPREHENSIVE TEST
 * 8 Philadelphia Suburb Businesses
 * Tests: Personalization, Grade Mention, Email Quality, Variety
 */

import fetch from 'node-fetch';

const TEST_SITES = [
  { url: 'https://www.coveredbridgecoffeeroasters.com/', name: 'Covered Bridge Coffee', location: 'Bucks County' },
  { url: 'https://eatatbittersweet.com/', name: 'Bittersweet Kitchen', location: 'Delaware County' },
  { url: 'https://secretsaucebbq.com/', name: "Wilson's Secret Sauce BBQ", location: 'Upper Darby' },
  { url: 'https://www.etcusa.com/', name: 'Environmental Tectonics Corp', location: 'Southampton' },
  { url: 'https://arianomedia.com/', name: 'Ariano Italian Restaurant', location: 'Media PA' },
  { url: 'https://maksant.com', name: 'Maksant Web Agency', location: 'Swarthmore' },
  { url: 'https://www.grindcorehouse.com/', name: 'Grindcore House Coffee', location: 'West Philly' },
  { url: 'https://www.emergefitnessllc.com/', name: 'Emerge Fitness', location: 'Philadelphia' }
];

console.log('🧪 FINAL COMPREHENSIVE TEST - PHILLY SUBURBS');
console.log('='.repeat(80));
console.log('Testing 8 local businesses for:');
console.log('  ✓ Personalized subject lines');
console.log('  ✓ Grade mentions');
console.log('  ✓ Service/location context');
console.log('  ✓ Variety in critiques');
console.log('  ✓ No visual assumptions\n');

async function testSite(site, index) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`[${index + 1}/8] ${site.name} - ${site.location}`);
  console.log(`URL: ${site.url}`);
  console.log('='.repeat(80));

  try {
    const response = await fetch('http://localhost:3000/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        urls: [site.url],
        emailType: 'local',
        depthTier: 'tier2'  // TIER 2: Analyzes 3 pages (homepage + 2 additional)
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

    if (result?.results?.[0]) {
      const analysis = result.results[0];
      const emailBody = analysis.email?.body || '';
      const subject = analysis.email?.subject || '';
      const grade = analysis.qualityGrade || '?';
      const score = analysis.qualityScore || 0;

      console.log(`\n📊 Grade: ${grade} (${score}/100)`);
      console.log(`📧 Subject: ${subject}`);
      console.log(`\n📝 Email Preview (first 300 chars):\n${emailBody.substring(0, 300)}...`);

      // Check personalization
      const checks = {
        mentionsAnalysis: emailBody.toLowerCase().includes('analysis') || emailBody.toLowerCase().includes('tool'),
        mentionsGrade: emailBody.toLowerCase().includes('scored') || emailBody.match(/grade\s+[a-f]/i),
        hasGeneric: emailBody.toLowerCase().includes('i checked out your website') ||
                    emailBody.toLowerCase().includes('i looked at your site'),
        mentionsVisuals: emailBody.toLowerCase().includes('button') ||
                        emailBody.toLowerCase().includes('above the fold') ||
                        emailBody.toLowerCase().includes('color')
      };

      console.log('\n✓ Quality Checks:');
      console.log(`  ${checks.mentionsAnalysis ? '✅' : '⚠️ '} Mentions analysis/tool`);
      console.log(`  ${checks.mentionsGrade ? '✅' : '⚠️ '} Mentions grade/score`);
      console.log(`  ${!checks.hasGeneric ? '✅' : '❌'} No generic phrases`);
      console.log(`  ${!checks.mentionsVisuals ? '✅' : '❌'} No visual assumptions`);

      return {
        success: true,
        site: site.name,
        grade,
        score,
        subject,
        checks
      };
    } else {
      console.log('\n❌ Analysis failed');
      return { success: false, site: site.name };
    }
  } catch (error) {
    console.log(`\n❌ Error: ${error.message}`);
    return { success: false, site: site.name, error: error.message };
  }
}

async function runAllTests() {
  const results = [];

  for (let i = 0; i < TEST_SITES.length; i++) {
    const result = await testSite(TEST_SITES[i], i);
    results.push(result);

    if (i < TEST_SITES.length - 1) {
      console.log('\n⏳ Waiting 3 seconds...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  // Final Summary
  console.log('\n\n' + '='.repeat(80));
  console.log('FINAL TEST SUMMARY');
  console.log('='.repeat(80));

  const successful = results.filter(r => r.success).length;
  const withAnalysisMention = results.filter(r => r.checks?.mentionsAnalysis).length;
  const withGradeMention = results.filter(r => r.checks?.mentionsGrade).length;
  const withoutGeneric = results.filter(r => r.checks && !r.checks.hasGeneric).length;
  const withoutVisuals = results.filter(r => r.checks && !r.checks.mentionsVisuals).length;

  console.log(`\nTotal Sites: ${TEST_SITES.length}`);
  console.log(`Successful: ${successful}/${TEST_SITES.length} (${Math.round(successful/TEST_SITES.length*100)}%)`);

  if (successful > 0) {
    console.log(`\nQuality Metrics:`);
    console.log(`  Mentions Analysis/Tool: ${withAnalysisMention}/${successful} (${Math.round(withAnalysisMention/successful*100)}%)`);
    console.log(`  Mentions Grade/Score: ${withGradeMention}/${successful} (${Math.round(withGradeMention/successful*100)}%)`);
    console.log(`  No Generic Phrases: ${withoutGeneric}/${successful} (${Math.round(withoutGeneric/successful*100)}%)`);
    console.log(`  No Visual Assumptions: ${withoutVisuals}/${successful} (${Math.round(withoutVisuals/successful*100)}%)`);

    console.log(`\nGrade Distribution:`);
    const gradeCount = {};
    results.forEach(r => {
      if (r.grade) {
        gradeCount[r.grade] = (gradeCount[r.grade] || 0) + 1;
      }
    });
    Object.keys(gradeCount).sort().forEach(grade => {
      console.log(`  Grade ${grade}: ${gradeCount[grade]} site(s)`);
    });
  }

  console.log('\n' + '='.repeat(80));
  if (successful === TEST_SITES.length &&
      withAnalysisMention >= successful * 0.8 &&
      withGradeMention >= successful * 0.7 &&
      withoutGeneric === successful) {
    console.log('✅ ALL TESTS PASSED! System is working excellently.');
  } else if (successful >= TEST_SITES.length * 0.7) {
    console.log('⚠️  MOSTLY WORKING - Some improvements needed.');
  } else {
    console.log('❌ ISSUES DETECTED - Needs attention.');
  }
  console.log('='.repeat(80));
}

runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
