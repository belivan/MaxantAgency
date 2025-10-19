/**
 * Test Script: Prospect-Driven Analysis with Social Media Enrichment
 *
 * Tests the complete workflow:
 * 1. Fetch prospects from Supabase
 * 2. Analyze websites
 * 3. Scrape social media profiles
 * 4. Save enriched data to leads table
 * 5. Link prospects to leads
 */

import dotenv from 'dotenv';
import { analyzeProspectsFromSupabase } from '../analyzer.js';

dotenv.config();

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('TEST: Prospect-Driven Analysis with Social Media Enrichment');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Check for Supabase credentials
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing Supabase credentials');
    console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env');
    process.exit(1);
  }

  console.log('✅ Supabase credentials found');
  console.log(`📍 Supabase URL: ${process.env.SUPABASE_URL}\n`);

  // Progress callback
  const sendProgress = (data) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${data.message || JSON.stringify(data)}`);
  };

  try {
    // Test with 10 prospects for full end-to-end test
    const result = await analyzeProspectsFromSupabase({
      limit: 10, // 10 prospects for comprehensive test
      enrichSocial: true, // Enable social media scraping
      analyzeSocial: true, // Enable AI social analysis
      analyzeContent: true, // Enable content analysis (NEW!)
      textModel: 'grok-4-fast', // Cheapest model
      socialModel: 'grok-4-fast', // Cheapest model for social analysis
      contentModel: 'grok-4-fast', // Cheapest model for content analysis
      depthTier: 'tier1', // Fast analysis
      modules: {
        basic: true,
        industry: true,
        seo: false, // Skip for speed
        visual: false, // Skip for speed
        competitor: false // Skip for speed
      }
    }, sendProgress);

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('RESULTS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log(`✅ Prospects Found: ${result.prospectsFound}`);
    console.log(`✅ Analyzed: ${result.analyzed}`);
    console.log(`✅ Success: ${result.success}`);

    if (result.results && result.results.length > 0) {
      console.log('\nSample Result:');
      const sample = result.results[0];
      console.log(`  Company: ${sample.companyName || 'Unknown'}`);
      console.log(`  URL: ${sample.url}`);
      console.log(`  Website Grade: ${sample.websiteGrade}`);
      console.log(`  Social Profiles Found: ${JSON.stringify(sample.grokData?.socialProfiles, null, 2)}`);
      if (sample.socialAnalysis) {
        console.log(`  Social Analysis: ${sample.socialAnalysis.insights}`);
      }
    }

    console.log('\n✅ Test complete!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
