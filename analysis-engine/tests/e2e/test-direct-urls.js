import dotenv from 'dotenv';
import { analyzeWebsiteIntelligent } from './analysis-engine/orchestrator.js';

dotenv.config({ path: './analysis-engine/.env' });

const testUrls = [
  { name: 'The Dandelion', url: 'https://thedandelionpub.com', industry: 'restaurant' },
  { name: 'Wilder', url: 'https://wilderphilly.com', industry: 'restaurant' },
  { name: 'Pike Street Coffee', url: 'https://pikestreetcoffee.com', industry: 'coffee shop' },
  { name: 'Milstead & Co.', url: 'https://milsteadandco.com', industry: 'coffee shop' },
  { name: 'Olympia Coffee', url: 'https://olympiacoffee.com', industry: 'coffee shop' }
];

async function testDirectUrls() {
  console.log('🧪 Testing Intelligent Multi-Page Analysis (Direct URLs)');
  console.log('\n============================================================\n');

  const startTime = Date.now();
  const results = [];

  for (let i = 0; i < testUrls.length; i++) {
    const test = testUrls[i];
    console.log(`\n[${i + 1}/${testUrls.length}] Analyzing ${test.name}...`);
    console.log(`URL: ${test.url}`);
    console.log(`Industry: ${test.industry}`);
    console.log('------------------------------------------------------------');

    const testStart = Date.now();

    try {
      const result = await analyzeWebsiteIntelligent(test.url, {
        company_name: test.name,
        industry: test.industry,
        project_id: null
      });

      const testDuration = ((Date.now() - testStart) / 1000).toFixed(1);

      if (result.success) {
        results.push({
          name: test.name,
          success: true,
          grade: result.grade,
          score: result.overall_score,
          duration: testDuration
        });

        console.log(`✅ SUCCESS - Grade: ${result.grade} (${result.overall_score}/100)`);
        console.log(`   Design: ${result.design_score}/100`);
        console.log(`   SEO: ${result.seo_score}/100`);
        console.log(`   Content: ${result.content_score}/100`);
        console.log(`   Social: ${result.social_score}/100`);
        console.log(`   Accessibility: ${result.accessibility_score}/100`);
        console.log(`   Duration: ${testDuration}s`);
      } else {
        results.push({
          name: test.name,
          success: false,
          error: result.error,
          duration: testDuration
        });

        console.log(`❌ FAILED - ${result.error}`);
        console.log(`   Duration: ${testDuration}s`);
      }
    } catch (error) {
      const testDuration = ((Date.now() - testStart) / 1000).toFixed(1);
      results.push({
        name: test.name,
        success: false,
        error: error.message,
        duration: testDuration
      });

      console.log(`❌ ERROR - ${error.message}`);
      console.log(`   Duration: ${testDuration}s`);
    }
  }

  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n\n============================================================');
  console.log('📊 TEST SUMMARY');
  console.log('============================================================\n');

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`Total: ${results.length}`);
  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);
  console.log(`⏱️  Total Time: ${totalDuration}s`);

  if (successful.length > 0) {
    console.log('\n✅ Successful Analyses:');
    successful.forEach(r => {
      console.log(`   ${r.name}: Grade ${r.grade} (${r.score}/100) in ${r.duration}s`);
    });

    const avgScore = (successful.reduce((sum, r) => sum + r.score, 0) / successful.length).toFixed(1);
    const grades = successful.map(r => r.grade);
    const gradeCounts = {};
    grades.forEach(g => gradeCounts[g] = (gradeCounts[g] || 0) + 1);

    console.log(`\n   Average Score: ${avgScore}/100`);
    console.log(`   Grade Distribution: ${Object.entries(gradeCounts).map(([g, c]) => `${g}(${c})`).join(', ')}`);
  }

  if (failed.length > 0) {
    console.log('\n❌ Failed Analyses:');
    failed.forEach(r => {
      console.log(`   ${r.name}: ${r.error}`);
    });
  }

  console.log('\n============================================================\n');

  process.exit(failed.length === 0 ? 0 : 1);
}

testDirectUrls().catch(error => {
  console.error('\n============================================================');
  console.error('❌ TEST CRASHED!');
  console.error('============================================================\n');
  console.error(error);
  process.exit(1);
});