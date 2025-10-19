/**
 * Quick test to verify:
 * 1. Grade-based folder organization
 * 2. Blog post data collection
 */

import fetch from 'node-fetch';

const TEST_URL = 'https://maksant.com';

console.log('🧪 Testing Grade Folders & Blog Data Collection');
console.log('='.repeat(80));
console.log(`Testing: ${TEST_URL}\n`);

try {
  const response = await fetch('http://localhost:3000/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      urls: [TEST_URL],
      emailType: 'local',
      depthTier: 'tier1'
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

    console.log('✅ Analysis Complete\n');
    console.log('📊 QUALITY GRADE:', analysis.qualityGrade || 'Not set');
    console.log('📊 QUALITY SCORE:', analysis.qualityScore || 'Not set');

    console.log('\n📝 BLOG DATA:');
    if (analysis.grokData?.contentInfo?.hasActiveBlog) {
      console.log('  ✅ Has active blog');
      const posts = analysis.grokData.contentInfo.recentPosts || [];
      console.log(`  📄 Recent posts found: ${posts.length}`);

      if (posts.length > 0) {
        console.log('\n  Latest post:');
        console.log(`    Title: ${posts[0].title}`);
        console.log(`    Date: ${posts[0].date}`);
        console.log(`    URL: ${posts[0].url}`);
        console.log(`    Summary: ${posts[0].summary}`);
      }
    } else {
      console.log('  ⚠️  No active blog detected');
    }

    console.log('\n📁 Check folder structure:');
    console.log(`  Look in: analysis-results/grade-${analysis.qualityGrade || 'X'}/maksant.com/`);

  } else {
    console.log('❌ No results received');
  }

} catch (error) {
  console.error('❌ Error:', error.message);
}
