#!/usr/bin/env node

/**
 * Test Script: Website Extraction (Steps 4-6)
 *
 * Tests:
 * - Website scraping with Playwright
 * - Data extraction with Grok Vision
 * - Social profile discovery
 * - Social metadata scraping
 *
 * Usage:
 *   node tests/test-extraction.js
 */

import dotenv from 'dotenv';
import { scrapeWebsite, closeBrowser as closeScraperBrowser } from '../extractors/website-scraper.js';
import { extractWebsiteData } from '../extractors/grok-extractor.js';
import { findSocialProfiles } from '../enrichers/social-finder.js';
import { scrapeSocialMetadata, closeBrowser as closeSocialBrowser } from '../enrichers/social-scraper.js';

dotenv.config();

console.log('\n═══════════════════════════════════════════════════════');
console.log('   TEST: Website Extraction & Enrichment (Phase 3)');
console.log('═══════════════════════════════════════════════════════\n');

async function runTest() {
  try {
    // Check API keys
    console.log('🔍 Checking environment variables...\n');

    const required = ['XAI_API_KEY'];
    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
      console.error(`❌ Missing required environment variables: ${missing.join(', ')}\n`);
      console.log('Please add them to your .env file.\n');
      process.exit(1);
    }

    console.log('✅ All required environment variables found\n');

    // Test data
    const testCompany = {
      name: 'Example Restaurant',
      website: 'https://example.com'
    };

    console.log('─────────────────────────────────────────────────────');
    console.log('Test 1: Website Scraping with Playwright');
    console.log('─────────────────────────────────────────────────────\n');
    console.log(`URL: ${testCompany.website}\n`);

    const websiteData = await scrapeWebsite(testCompany.website, {
      timeout: 30000,
      screenshotDir: './screenshots'
    });

    if (websiteData.status === 'success') {
      console.log('✅ Website scraped successfully');
      console.log(`   Title: ${websiteData.title}`);
      console.log(`   Screenshot size: ${websiteData.screenshot.length} bytes`);
      console.log(`   Text content: ${websiteData.textContent?.length || 0} characters`);
      console.log(`   Social links found: ${Object.keys(websiteData.socialLinks).filter(k => websiteData.socialLinks[k]).length}`);

      Object.keys(websiteData.socialLinks).forEach(platform => {
        if (websiteData.socialLinks[platform]) {
          console.log(`      - ${platform}: ${websiteData.socialLinks[platform]}`);
        }
      });
      console.log('');

      // Test 2: Extract data with Grok Vision
      console.log('─────────────────────────────────────────────────────');
      console.log('Test 2: Data Extraction with Grok Vision');
      console.log('─────────────────────────────────────────────────────\n');

      const extractedData = await extractWebsiteData(
        testCompany.website,
        websiteData.screenshot,
        testCompany.name
      );

      if (extractedData.extractionStatus === 'success') {
        console.log('✅ Data extracted successfully\n');
        console.log(`   Contact Email: ${extractedData.contact_email || 'N/A'}`);
        console.log(`   Contact Phone: ${extractedData.contact_phone || 'N/A'}`);
        console.log(`   Contact Name: ${extractedData.contact_name || 'N/A'}`);
        console.log(`   Description: ${extractedData.description ? extractedData.description.slice(0, 100) + '...' : 'N/A'}`);
        console.log(`   Services: ${extractedData.services?.length || 0}`);

        if (extractedData.services && extractedData.services.length > 0) {
          extractedData.services.forEach((service, i) => {
            console.log(`      ${i + 1}. ${service}`);
          });
        }
        console.log('');
      } else {
        console.log(`⚠️  Extraction failed: ${extractedData.extractionError}\n`);
      }

      // Test 3: Find social profiles
      console.log('─────────────────────────────────────────────────────');
      console.log('Test 3: Social Profile Discovery');
      console.log('─────────────────────────────────────────────────────\n');

      const socialProfiles = await findSocialProfiles(testCompany, {
        socialLinks: websiteData.socialLinks,
        social_links: extractedData.social_links
      });

      const foundCount = Object.keys(socialProfiles).filter(k => socialProfiles[k]).length;
      console.log(`✅ Found ${foundCount} social profile(s)\n`);

      Object.keys(socialProfiles).forEach(platform => {
        if (socialProfiles[platform]) {
          console.log(`   ${platform}: ${socialProfiles[platform]}`);
        }
      });
      console.log('');

      // Test 4: Scrape social metadata
      if (foundCount > 0) {
        console.log('─────────────────────────────────────────────────────');
        console.log('Test 4: Social Metadata Scraping');
        console.log('─────────────────────────────────────────────────────\n');

        const socialMetadata = await scrapeSocialMetadata(socialProfiles);

        const scrapedCount = Object.keys(socialMetadata).length;
        console.log(`✅ Scraped ${scrapedCount} social profile(s)\n`);

        Object.keys(socialMetadata).forEach(platform => {
          const data = socialMetadata[platform];
          console.log(`   ${platform}:`);
          console.log(`      Name: ${data.name || 'N/A'}`);
          console.log(`      Description: ${data.description ? data.description.slice(0, 60) + '...' : 'N/A'}`);
          console.log('');
        });
      } else {
        console.log('⏭️  Skipping social metadata scraping (no profiles found)\n');
      }

    } else {
      console.log(`❌ Website scraping failed: ${websiteData.error}\n`);
    }

    // Close browsers
    await closeScraperBrowser();
    await closeSocialBrowser();

    console.log('═══════════════════════════════════════════════════════');
    console.log('   ✅ EXTRACTION TESTS COMPLETE');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('📝 Note: This test uses a real website (example.com).');
    console.log('   For more comprehensive testing, try with your target industry websites.\n');

  } catch (error) {
    console.error('\n❌ Extraction test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run test
runTest();
