#!/usr/bin/env node

/**
 * Test Script: Full Pipeline (Steps 1-3)
 *
 * Tests the complete prospecting pipeline:
 * - Step 1: Query Understanding
 * - Step 2: Google Maps Discovery
 * - Step 3: Website Verification
 * - Database saving
 *
 * Usage:
 *   node tests/test-full-pipeline.js
 */

import dotenv from 'dotenv';
import { runProspectingPipeline } from '../orchestrator.js';

dotenv.config();

console.log('\n═══════════════════════════════════════════════════════');
console.log('   TEST: Full Prospecting Pipeline (Phase 2)');
console.log('═══════════════════════════════════════════════════════\n');

async function runTest() {
  try {
    // Validate environment
    console.log('🔍 Checking environment variables...\n');

    const required = [
      'GOOGLE_MAPS_API_KEY',
      'SUPABASE_URL',
      'SUPABASE_SERVICE_KEY'
    ];

    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
      console.error(`❌ Missing required environment variables: ${missing.join(', ')}\n`);
      console.log('Please add them to your .env file.\n');
      process.exit(1);
    }

    console.log('✅ All required environment variables found\n');

    // Define test brief
    const brief = {
      industry: 'Italian restaurants',
      city: 'Philadelphia, PA',
      target: 'Italian restaurants with high ratings',
      count: 5
    };

    const options = {
      minRating: 4.0,
      verifyWebsites: true
    };

    console.log('─────────────────────────────────────────────────────');
    console.log('Test Brief:');
    console.log('─────────────────────────────────────────────────────');
    console.log(JSON.stringify(brief, null, 2));
    console.log('\nOptions:');
    console.log(JSON.stringify(options, null, 2));
    console.log('\n');

    // Progress callback
    const onProgress = (event) => {
      if (event.type === 'step') {
        if (event.status === 'started') {
          console.log(`\n🔄 Step ${event.step}: ${event.name} - Started`);
        } else if (event.status === 'completed') {
          console.log(`✅ Step ${event.step}: ${event.name} - Completed`);
          if (event.query) {
            console.log(`   Search Query: "${event.query}"`);
          }
          if (event.found) {
            console.log(`   Found: ${event.found} companies`);
          }
        }
      } else if (event.type === 'progress') {
        console.log(`   [${event.current}/${event.total}] Processing: ${event.company}`);
      }
    };

    console.log('─────────────────────────────────────────────────────');
    console.log('Starting Pipeline...');
    console.log('─────────────────────────────────────────────────────');

    const startTime = Date.now();

    // Run pipeline
    const results = await runProspectingPipeline(brief, options, onProgress);

    const duration = Date.now() - startTime;

    console.log('\n─────────────────────────────────────────────────────');
    console.log('Pipeline Results:');
    console.log('─────────────────────────────────────────────────────');
    console.log(`Run ID:          ${results.runId}`);
    console.log(`Found:           ${results.found} companies`);
    console.log(`Verified:        ${results.verified} websites`);
    console.log(`Saved:           ${results.saved} prospects`);
    console.log(`Skipped:         ${results.skipped} (already exist)`);
    console.log(`Failed:          ${results.failed}`);
    console.log(`Total Cost:      $${results.cost.toFixed(4)}`);
    console.log(`Duration:        ${duration}ms (${(duration / 1000).toFixed(2)}s)`);
    console.log('');

    // Display saved prospects
    if (results.prospects && results.prospects.length > 0) {
      console.log('─────────────────────────────────────────────────────');
      console.log('Saved Prospects:');
      console.log('─────────────────────────────────────────────────────\n');

      results.prospects.forEach((prospect, index) => {
        console.log(`${index + 1}. ${prospect.company_name}`);
        console.log(`   ID: ${prospect.id}`);
        console.log(`   Industry: ${prospect.industry}`);
        console.log(`   Rating: ${prospect.google_rating} ⭐`);
        console.log(`   Website: ${prospect.website || 'N/A'} (${prospect.website_status})`);
        console.log(`   City: ${prospect.city}, ${prospect.state}`);
        console.log(`   Status: ${prospect.status}`);
        console.log('');
      });
    }

    // Validation
    console.log('─────────────────────────────────────────────────────');
    console.log('Validation:');
    console.log('─────────────────────────────────────────────────────\n');

    const assertions = [
      {
        name: 'Found at least 1 company',
        passed: results.found >= 1
      },
      {
        name: 'Saved at least 1 prospect to database',
        passed: results.saved >= 1
      },
      {
        name: 'Pipeline completed in under 2 minutes',
        passed: duration < 120000
      },
      {
        name: 'Cost tracked correctly',
        passed: results.cost > 0
      },
      {
        name: 'No errors occurred',
        passed: results.failed === 0
      }
    ];

    let allPassed = true;

    assertions.forEach(assertion => {
      const icon = assertion.passed ? '✅' : '❌';
      console.log(`${icon} ${assertion.name}`);
      if (!assertion.passed) allPassed = false;
    });

    console.log('\n═══════════════════════════════════════════════════════');
    if (allPassed) {
      console.log('   ✅ ALL TESTS PASSED - Phase 2 Complete!');
    } else {
      console.log('   ⚠️  SOME TESTS FAILED');
    }
    console.log('═══════════════════════════════════════════════════════\n');

    if (!allPassed) {
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Pipeline test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run test
runTest();
