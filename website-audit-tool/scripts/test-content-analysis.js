/**
 * Test Content Analysis on Working Sites
 * Tests blog/news content insights extraction
 */

import dotenv from 'dotenv';
import { analyzeWebsites } from '../analyzer.js';

dotenv.config();

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('TEST: Content Insights Analysis');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Progress callback
  const sendProgress = (data) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${data.message || data.type}`);
  };

  try {
    // Test with sites known to have blogs
    const urls = [
      'https://www.shopify.com/blog', // Shopify blog
      'https://blog.hubspot.com' // HubSpot blog
    ];

    console.log('🔍 Analyzing sites with content insights enabled...\n');

    const results = await analyzeWebsites(urls, {
      textModel: 'grok-4-fast',
      depthTier: 'tier1',
      analyzeContent: true, // Enable content analysis
      contentModel: 'grok-4-fast',
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
    console.log('CONTENT INSIGHTS RESULTS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    results.forEach((result, index) => {
      if (result.error) {
        console.log(`${index + 1}. ${result.url} - ERROR: ${result.error}\n`);
        return;
      }

      console.log(`${index + 1}. ${result.companyName || 'Unknown'}`);
      console.log(`   URL: ${result.url}`);
      console.log(`   Website Grade: ${result.websiteGrade}`);

      if (result.contentInsights) {
        console.log(`\n   📝 CONTENT INSIGHTS:`);
        console.log(`   ─────────────────────────────────────────────────────────`);

        if (result.contentInsights.analyzed) {
          console.log(`   ✅ Analysis: SUCCESS`);
          console.log(`   Blog Active: ${result.contentInsights.hasActiveBlog ? 'Yes' : 'No'}`);
          console.log(`   Posts Found: ${result.contentInsights.postCount || 0}`);
          console.log(`   News Found: ${result.contentInsights.newsCount || 0}`);

          if (result.contentInsights.contentThemes?.length > 0) {
            console.log(`\n   Content Themes:`);
            result.contentInsights.contentThemes.forEach(theme => {
              console.log(`     • ${theme}`);
            });
          }

          if (result.contentInsights.expertiseSignals?.length > 0) {
            console.log(`\n   Expertise Signals:`);
            result.contentInsights.expertiseSignals.forEach(signal => {
              console.log(`     • ${signal}`);
            });
          }

          if (result.contentInsights.recentAchievements?.length > 0) {
            console.log(`\n   Recent Achievements:`);
            result.contentInsights.recentAchievements.forEach(achievement => {
              console.log(`     • ${achievement}`);
            });
          }

          if (result.contentInsights.engagementHook) {
            console.log(`\n   💬 Engagement Hook:`);
            console.log(`     "${result.contentInsights.engagementHook}"`);
          }

          if (result.contentInsights.contentGaps?.length > 0) {
            console.log(`\n   ⚠️  Content Gaps:`);
            result.contentInsights.contentGaps.forEach(gap => {
              console.log(`     • ${gap}`);
            });
          }

          if (result.contentInsights.writingStyle) {
            console.log(`\n   Writing Style: ${result.contentInsights.writingStyle}`);
          }

          if (result.contentInsights.contentFrequency) {
            console.log(`   Posting Frequency: ${result.contentInsights.contentFrequency}`);
          }

        } else {
          console.log(`   ⚠️  Analysis: FAILED`);
          console.log(`   Reason: ${result.contentInsights.reason || result.contentInsights.error || 'Unknown'}`);
        }
      } else {
        console.log(`\n   ⚠️  No content insights (disabled or failed)`);
      }

      console.log('\n' + '═'.repeat(70) + '\n');
    });

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
