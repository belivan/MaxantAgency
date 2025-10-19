/**
 * Phase 3 Personalization Test
 * Tests that emails are using Grok data for personalization
 */

import fetch from 'node-fetch';
import fs from 'fs/promises';

const TEST_SITES = [
  {
    url: 'https://www.emergefitnessllc.com/',
    description: 'Emerge Fitness - Strength & conditioning gym'
  },
  {
    url: 'https://www.grindcorehouse.com/',
    description: 'Grindcore House - West Philly vegan coffee house'
  }
];

console.log('🧪 PHASE 3 PERSONALIZATION TEST');
console.log('='.repeat(80));
console.log('Testing that emails use Grok data for personalization\n');

async function testWebsite(testCase) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Testing: ${testCase.url}`);
  console.log(`Business: ${testCase.description}`);
  console.log('='.repeat(80));

  try {
    const startTime = Date.now();

    const response = await fetch('http://localhost:3000/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        urls: [testCase.url],
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

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    if (result?.results?.[0]) {
      const analysis = result.results[0];
      const emailText = analysis.email?.body || '';
      const subject = analysis.email?.subject || '';

      console.log(`\n✅ Analysis Complete (${duration}s)`);
      console.log('-'.repeat(80));

      console.log('\n📧 GENERATED EMAIL:');
      console.log('Subject:', subject);
      console.log('\nBody:\n', emailText);

      console.log('\n📊 PERSONALIZATION CHECK:');

      // Check for generic phrases (should be avoided)
      const genericPhrases = [
        'I checked out your website',
        'I looked at your site',
        'I visited your website',
        'I reviewed your website'
      ];

      let hasGeneric = false;
      for (const phrase of genericPhrases) {
        if (emailText.toLowerCase().includes(phrase.toLowerCase())) {
          console.log(`  ⚠️  Found generic phrase: "${phrase}"`);
          hasGeneric = true;
        }
      }

      if (!hasGeneric) {
        console.log('  ✅ No generic phrases found');
      }

      // Check for personalization elements
      const grokData = analysis.grokData;

      if (grokData?.businessIntel?.services?.length > 0) {
        const services = grokData.businessIntel.services;
        const mentionsService = services.some(s =>
          emailText.toLowerCase().includes(s.toLowerCase())
        );
        console.log(`  ${mentionsService ? '✅' : '⚠️ '} Services mention: ${mentionsService ? services[0] : 'None'}`);
      }

      if (grokData?.companyInfo?.location) {
        const location = grokData.companyInfo.location;
        const mentionsLocation = emailText.toLowerCase().includes(location.toLowerCase()) ||
                                 subject.toLowerCase().includes(location.toLowerCase());
        console.log(`  ${mentionsLocation ? '✅' : '⚠️ '} Location mention: ${mentionsLocation ? location : 'Not mentioned'}`);
      }

      if (grokData?.contentInfo?.recentPosts?.length > 0) {
        const post = grokData.contentInfo.recentPosts[0];
        const mentionsBlog = emailText.toLowerCase().includes('post') ||
                            emailText.toLowerCase().includes('blog') ||
                            emailText.toLowerCase().includes(post.title.toLowerCase().slice(0, 20));
        console.log(`  ${mentionsBlog ? '✅' : '⚠️ '} Blog post reference: ${mentionsBlog ? 'Yes' : 'No'}`);
      }

      const socialCount = [
        grokData?.socialProfiles?.linkedIn?.company,
        grokData?.socialProfiles?.instagram?.url,
        grokData?.socialProfiles?.twitter?.url,
        grokData?.socialProfiles?.facebook,
        grokData?.socialProfiles?.youtube
      ].filter(Boolean).length;

      if (socialCount > 0) {
        const mentionsSocial = emailText.toLowerCase().includes('instagram') ||
                              emailText.toLowerCase().includes('linkedin') ||
                              emailText.toLowerCase().includes('social') ||
                              emailText.toLowerCase().includes('twitter') ||
                              emailText.toLowerCase().includes('facebook');
        console.log(`  ${mentionsSocial ? '✅' : '⚠️ '} Social media mention: ${mentionsSocial ? 'Yes' : 'No'}`);
      }

      // Calculate personalization score
      let score = 0;
      let checks = 0;

      if (grokData?.businessIntel?.services?.length > 0) {
        checks++;
        if (grokData.businessIntel.services.some(s => emailText.toLowerCase().includes(s.toLowerCase()))) score++;
      }
      if (grokData?.companyInfo?.location) {
        checks++;
        if (emailText.toLowerCase().includes(grokData.companyInfo.location.toLowerCase())) score++;
      }
      if (grokData?.contentInfo?.recentPosts?.length > 0) {
        checks++;
        const post = grokData.contentInfo.recentPosts[0];
        if (emailText.toLowerCase().includes('post') || emailText.toLowerCase().includes('blog')) score++;
      }
      if (socialCount > 0) {
        checks++;
        if (emailText.toLowerCase().includes('instagram') || emailText.toLowerCase().includes('social')) score++;
      }

      const percentage = checks > 0 ? Math.round((score / checks) * 100) : 0;
      console.log(`\n📊 Personalization Score: ${score}/${checks} (${percentage}%)`);

      if (percentage >= 70) {
        console.log('  ✅ EXCELLENT - Email is well personalized');
      } else if (percentage >= 40) {
        console.log('  ⚠️  GOOD - Some personalization, could be better');
      } else {
        console.log('  ❌ POOR - Not enough personalization');
      }

      return { success: true, score: percentage, url: testCase.url };

    } else {
      console.log('❌ No results returned');
      return { success: false, url: testCase.url };
    }

  } catch (error) {
    console.log(`\n❌ ERROR: ${error.message}`);
    return { success: false, url: testCase.url, error: error.message };
  }
}

async function runTests() {
  const results = [];

  for (const testCase of TEST_SITES) {
    const result = await testWebsite(testCase);
    results.push(result);

    if (TEST_SITES.indexOf(testCase) < TEST_SITES.length - 1) {
      console.log('\n⏳ Waiting 3 seconds before next test...\n');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  // Final summary
  console.log('\n\n' + '='.repeat(80));
  console.log('PHASE 3 PERSONALIZATION TEST SUMMARY');
  console.log('='.repeat(80));

  const successful = results.filter(r => r.success).length;
  const avgScore = results.filter(r => r.score).reduce((sum, r) => sum + r.score, 0) / successful;

  console.log(`\nTotal Tests: ${results.length}`);
  console.log(`Successful: ${successful} ✅`);
  if (successful > 0) {
    console.log(`Average Personalization: ${avgScore.toFixed(0)}%`);
  }

  console.log('\nResults:');
  results.forEach(r => {
    const status = r.success ? '✅' : '❌';
    const scoreText = r.score ? ` (${r.score}% personalized)` : '';
    console.log(`  ${status} ${r.url}${scoreText}`);
  });

  console.log('\n' + '='.repeat(80));
  if (avgScore >= 70) {
    console.log('✅ PHASE 3: PASSED');
    console.log('\nPersonalization is working excellently!');
    console.log('Emails are using Grok data for blog posts, services, location, and social proof.');
  } else if (avgScore >= 40) {
    console.log('⚠️  PHASE 3: PARTIAL');
    console.log(`\nPersonalization is working but could be improved (${avgScore.toFixed(0)}%).`);
  } else {
    console.log('❌ PHASE 3: FAILED');
    console.log('\nPersonalization is not working properly.');
  }
  console.log('='.repeat(80));
  console.log('\n✅ Test complete!\n');
}

runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
