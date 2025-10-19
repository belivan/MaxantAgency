/**
 * Test that emails mention the grade/software analysis
 */

import fetch from 'node-fetch';

const TEST_URL = 'https://www.emergefitnessllc.com/';

console.log('🧪 Testing Grade Mention in Email');
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
    const emailBody = analysis.email?.body || '';
    const subject = analysis.email?.subject || '';

    console.log('\n📊 QUALITY GRADE:', analysis.qualityGrade || 'Not set');
    console.log('📊 QUALITY SCORE:', analysis.qualityScore || 'Not set');

    console.log('\n📧 GENERATED EMAIL:');
    console.log('Subject:', subject);
    console.log('\nBody:');
    console.log(emailBody);

    console.log('\n\n🔍 CHECKING FOR GRADE MENTION:');

    const mentionsAnalysis = emailBody.toLowerCase().includes('analysis') ||
                            emailBody.toLowerCase().includes('analyzed') ||
                            emailBody.toLowerCase().includes('tool') ||
                            emailBody.toLowerCase().includes('software');

    const mentionsScore = emailBody.toLowerCase().includes('scored') ||
                         emailBody.toLowerCase().includes('score');

    const mentionsGrade = emailBody.match(/grade\s+[a-f]/i) ||
                         emailBody.match(/scored\s+an?\s+[a-f]/i);

    console.log(`${mentionsAnalysis ? '✅' : '❌'} Mentions analysis/tool: ${mentionsAnalysis ? 'Yes' : 'No'}`);
    console.log(`${mentionsScore ? '✅' : '⚠️ '} Mentions score/scored: ${mentionsScore ? 'Yes' : 'No'}`);
    console.log(`${mentionsGrade ? '✅' : '⚠️ '} Mentions specific grade: ${mentionsGrade ? 'Yes' : 'No'}`);

    if (mentionsAnalysis) {
      console.log('\n✅ SUCCESS: Email mentions the software analysis!');
      console.log('This builds credibility by showing you used professional tools.');
    } else {
      console.log('\n⚠️  Email does not mention analysis/tool');
    }

  } else {
    console.log('❌ No results returned');
  }

} catch (error) {
  console.error('❌ Error:', error.message);
}
