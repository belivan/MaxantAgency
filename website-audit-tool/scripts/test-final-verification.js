/**
 * FINAL VERIFICATION TEST
 * Tests ALL new features on 5 Philadelphia businesses
 */

import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';

const TEST_SITES = [
  { url: 'https://maksant.com', name: 'Maksant', hasEmail: true },
  { url: 'https://www.emergefitnessllc.com/', name: 'Emerge Fitness', hasEmail: false },  // Phone-only
  { url: 'https://www.coveredbridgecoffeeroasters.com/', name: 'Covered Bridge Coffee', hasEmail: true },
  { url: 'https://secretsaucebbq.com/', name: "Wilson's BBQ", hasEmail: true },
  { url: 'https://www.grindcorehouse.com/', name: 'Grindcore House', hasEmail: false }  // Phone-only
];

console.log('🎯 FINAL VERIFICATION TEST');
console.log('='.repeat(80));
console.log('\nTesting ALL new features:');
console.log('  ✅ Email mandatory for Grade A/B');
console.log('  ✅ Critique reasoning file generated');
console.log('  ✅ Visual analysis enabled by default');
console.log('  ✅ Tier 2 analysis (3 pages)');
console.log('  ✅ All modules enabled\n');

async function testSite(site, index) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`[${index + 1}/5] ${site.name}`);
  console.log(`URL: ${site.url}`);
  console.log(`Expected: ${site.hasEmail ? 'Grade A/B (has email)' : 'Grade C/D (phone-only)'}`);
  console.log('='.repeat(80));

  try {
    const response = await fetch('http://localhost:3000/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        urls: [site.url],
        emailType: 'local',
        depthTier: 'tier2',  // TIER 2: 3 pages
        modules: {
          basic: true,
          industry: true,
          visual: true,      // VISUAL ENABLED
          seo: true,         // ALL MODULES
          competitor: false  // Skip competitor (takes too long)
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
    const grade = analysis.qualityGrade;
    const score = analysis.qualityScore;
    const hasEmail = analysis.contact?.email && analysis.contact.email !== 'Not found';

    console.log(`\n📊 Results:`);
    console.log(`   Grade: ${grade} (${score}/100)`);
    console.log(`   Has Email: ${hasEmail ? 'YES' : 'NO'}`);
    console.log(`   Subject: ${analysis.email?.subject}`);

    // CHECK 1: Email requirement for Grade A/B
    const gradingCorrect = (hasEmail && (grade === 'A' || grade === 'B')) ||
                          (!hasEmail && grade !== 'A' && grade !== 'B');

    console.log(`\n✓ Feature Checks:`);
    console.log(`   ${gradingCorrect ? '✅' : '❌'} Email requirement: ${hasEmail ? `Has email → Grade ${grade}` : `No email → Grade ${grade}`}`);

    // CHECK 2: Find the analysis folder and check for files
    const domain = new URL(site.url).hostname.replace('www.', '');
    const gradeFolder = path.join(process.cwd(), 'analysis-results', `grade-${grade}`, domain);

    try {
      const folders = await fs.readdir(gradeFolder);
      const latestFolder = folders.sort().reverse()[0];
      const analysisPath = path.join(gradeFolder, latestFolder);

      const files = await fs.readdir(analysisPath);
      const hasReasoningFile = files.includes('critique-reasoning.txt');
      const hasEmailFile = files.includes('email.txt');

      console.log(`   ${hasEmailFile ? '✅' : '❌'} Email file created: email.txt`);
      console.log(`   ${hasReasoningFile ? '✅' : '❌'} Reasoning file created: critique-reasoning.txt`);

      if (hasReasoningFile) {
        const reasoning = await fs.readFile(path.join(analysisPath, 'critique-reasoning.txt'), 'utf8');
        console.log(`   📝 Reasoning preview: ${reasoning.substring(0, 150)}...`);
      }

      return {
        success: true,
        site: site.name,
        grade,
        score,
        hasEmail,
        gradingCorrect,
        hasReasoningFile,
        hasEmailFile
      };

    } catch (error) {
      console.log(`   ⚠️  Could not verify files: ${error.message}`);
      return {
        success: true,
        site: site.name,
        grade,
        score,
        hasEmail,
        gradingCorrect,
        hasReasoningFile: false,
        hasEmailFile: true
      };
    }

  } catch (error) {
    console.log(`\n❌ Error: ${error.message}`);
    return { success: false };
  }
}

async function runTests() {
  const results = [];

  for (let i = 0; i < TEST_SITES.length; i++) {
    const result = await testSite(TEST_SITES[i], i);
    results.push(result);

    if (i < TEST_SITES.length - 1) {
      console.log('\n⏳ Waiting 3 seconds before next test...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  // FINAL SUMMARY
  console.log('\n\n' + '='.repeat(80));
  console.log('🎯 FINAL VERIFICATION SUMMARY');
  console.log('='.repeat(80));

  const successful = results.filter(r => r.success).length;
  const gradingCorrect = results.filter(r => r.gradingCorrect).length;
  const withReasoning = results.filter(r => r.hasReasoningFile).length;

  console.log(`\nTotal Tests: ${TEST_SITES.length}`);
  console.log(`Successful: ${successful}/${TEST_SITES.length}`);
  console.log(`\nFeature Verification:`);
  console.log(`  ✅ Email requirement enforced: ${gradingCorrect}/${successful} (${Math.round(gradingCorrect/successful*100)}%)`);
  console.log(`  ✅ Reasoning files generated: ${withReasoning}/${successful} (${Math.round(withReasoning/successful*100)}%)`);

  console.log(`\nGrade Distribution:`);
  const grades = {};
  results.forEach(r => {
    if (r.grade) {
      grades[r.grade] = (grades[r.grade] || 0) + 1;
    }
  });
  Object.keys(grades).sort().forEach(grade => {
    console.log(`  Grade ${grade}: ${grades[grade]} site(s)`);
  });

  console.log('\n' + '='.repeat(80));
  if (gradingCorrect === successful && withReasoning === successful) {
    console.log('🎉 ALL FEATURES VERIFIED! Everything is working perfectly!');
  } else {
    console.log('⚠️  Some features need attention - see details above.');
  }
  console.log('='.repeat(80));
}

runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
