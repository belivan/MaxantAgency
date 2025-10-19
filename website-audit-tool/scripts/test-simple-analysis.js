/**
 * Simple Test: Website Analysis (No Prospect Fetching)
 * Tests basic website analysis without Supabase dependencies
 */

import dotenv from 'dotenv';
import { analyzeWebsites } from '../analyzer.js';

dotenv.config();

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('TEST: Simple Website Analysis');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Progress callback
  const sendProgress = (data) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${data.message || data.type}`);
  };

  try {
    // Test with a single URL
    const urls = ['https://www.example.com'];

    console.log('🔍 Analyzing:', urls[0]);
    console.log('');

    const results = await analyzeWebsites(urls, {
      textModel: 'grok-4-fast',
      depthTier: 'tier1',
      modules: {
        basic: true,
        industry: true,
        seo: false,
        visual: false,
        competitor: false
      },
      skipEmail: true,
      skipQA: true
    }, sendProgress);

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('RESULTS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    if (results && results.length > 0) {
      const result = results[0];
      console.log(`✅ Company: ${result.companyName || 'Unknown'}`);
      console.log(`✅ URL: ${result.url}`);
      console.log(`✅ Website Grade: ${result.websiteGrade}`);
      console.log(`✅ Load Time: ${result.loadTime}ms`);

      if (result.grokData?.companyInfo) {
        console.log(`\n📋 Company Info:`);
        console.log(`   Name: ${result.grokData.companyInfo.name}`);
        console.log(`   Location: ${result.grokData.companyInfo.location}`);
        console.log(`   Industry: ${result.grokData.companyInfo.industry}`);
        console.log(`   Founding Year: ${result.grokData.companyInfo.foundingYear}`);
      }

      if (result.grokData?.socialProfiles) {
        console.log(`\n🔗 Social Profiles:`);
        console.log(JSON.stringify(result.grokData.socialProfiles, null, 2));
      }

      if (result.grokData?.achievements) {
        console.log(`\n🏆 Achievements:`);
        console.log(JSON.stringify(result.grokData.achievements, null, 2));
      }

      if (result.grokData?.socialProof) {
        console.log(`\n💬 Social Proof:`);
        console.log(`   Brand Voice: ${result.grokData.socialProof.brandVoice}`);
        console.log(`   Testimonials: ${result.grokData.socialProof.testimonials?.length || 0}`);
      }

      console.log('\n✅ Test complete!\n');
    } else {
      console.log('❌ No results returned');
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
