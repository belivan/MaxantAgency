import { analyzeWebsites } from './analyzer.js';
import dotenv from 'dotenv';

dotenv.config();

console.log('═══════════════════════════════════════════════════════════════');
console.log('TESTING WITH REAL PHILADELPHIA BUSINESS');
console.log('═══════════════════════════════════════════════════════════════\n');

// Real Philadelphia local businesses to test
const phillyBusinesses = [
  'https://www.mcdevittlawfirm.com',  // Philadelphia law firm - likely has testimonials, blog
];

async function testRealBusiness() {
  try {
    console.log('🔍 Analyzing real Philadelphia business...\n');

    const results = await analyzeWebsites(phillyBusinesses, {
      enrichSocial: true,
      analyzeSocial: true,
      analyzeContent: true,
      skipEmail: true,
      skipQA: true,
      textModel: 'grok-4-fast',
      socialModel: 'grok-4-fast',
      contentModel: 'grok-4-fast'
    }, (progress) => {
      console.log(`[${new Date().toLocaleTimeString()}] ${progress.message || JSON.stringify(progress)}`);
    });

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('RESULTS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    for (const result of results) {
      if (result.error) {
        console.log('❌ Error:', result.error);
        continue;
      }

      console.log(`✅ ${result.companyName || result.url}`);
      console.log(`   Website Grade: ${result.websiteGrade}`);
      console.log(`   Website Score: ${result.websiteScore}`);

      if (result.grokData?.socialProfiles) {
        const profiles = result.grokData.socialProfiles;
        console.log(`\n   📱 Social Profiles Found:`);
        if (profiles.instagram) console.log(`      Instagram: ✅`);
        if (profiles.facebook) console.log(`      Facebook: ✅`);
        if (profiles.linkedIn) console.log(`      LinkedIn: ✅`);
        if (profiles.twitter) console.log(`      Twitter: ✅`);
      }

      if (result.grokData?.achievements) {
        console.log(`\n   🏆 Achievements:`);
        const ach = result.grokData.achievements;
        if (ach.awards?.length) console.log(`      Awards: ${ach.awards.length}`);
        if (ach.certifications?.length) console.log(`      Certifications: ${ach.certifications.length}`);
        if (ach.yearsInBusiness) console.log(`      Years in Business: ${ach.yearsInBusiness}`);
      }

      if (result.grokData?.socialProof?.testimonials?.length) {
        console.log(`\n   💬 Testimonials: ${result.grokData.socialProof.testimonials.length}`);
      }

      if (result.contentInsights) {
        console.log(`\n   📝 Content Analysis:`);
        console.log(`      Has Blog: ${result.contentInsights.hasActiveBlog || false}`);
        if (result.contentInsights.contentThemes?.length) {
          console.log(`      Themes: ${result.contentInsights.contentThemes.join(', ')}`);
        }
        if (result.contentInsights.engagementHook) {
          console.log(`      Hook: "${result.contentInsights.engagementHook}"`);
        }
      }

      console.log(`\n   💰 Cost: $${result.cost?.toFixed(4) || '0.0000'}`);
      console.log(`   ⏱️  Time: ${result.analysisTime || 'N/A'}`);
    }

    console.log('\n✅ Test complete!\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

testRealBusiness();
