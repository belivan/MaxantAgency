#!/usr/bin/env node

/**
 * Test Script: Google Maps Discovery
 *
 * Tests the Google Maps API integration and company discovery.
 *
 * Usage:
 *   node tests/test-google-maps.js
 */

import dotenv from 'dotenv';
import { discoverCompanies } from '../discoverers/google-maps.js';
import { costTracker } from '../shared/cost-tracker.js';

dotenv.config();

console.log('\n═══════════════════════════════════════════════════════');
console.log('   TEST: Google Maps Discovery');
console.log('═══════════════════════════════════════════════════════\n');

async function runTest() {
  try {
    // Check API key
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      console.error('❌ GOOGLE_MAPS_API_KEY not set in .env file');
      console.log('\nPlease add your Google Maps API key to .env:');
      console.log('GOOGLE_MAPS_API_KEY=your-key-here\n');
      process.exit(1);
    }

    console.log('✅ Google Maps API key found\n');

    // Test 1: Search for restaurants in Philadelphia
    console.log('─────────────────────────────────────────────────────');
    console.log('Test 1: Italian restaurants in Philadelphia');
    console.log('─────────────────────────────────────────────────────\n');

    const startTime = Date.now();

    const companies = await discoverCompanies('Italian restaurants in Philadelphia, PA', {
      minRating: 4.0,
      maxResults: 5
    });

    const duration = Date.now() - startTime;

    console.log(`\n✅ Found ${companies.length} companies in ${duration}ms\n`);

    // Display results
    companies.forEach((company, index) => {
      console.log(`${index + 1}. ${company.name}`);
      console.log(`   Industry: ${company.industry}`);
      console.log(`   Rating: ${company.rating} ⭐ (${company.reviewCount} reviews)`);
      console.log(`   City: ${company.city}, ${company.state}`);
      console.log(`   Website: ${company.website || 'N/A'}`);
      console.log(`   Phone: ${company.phone || 'N/A'}`);
      console.log(`   Google Place ID: ${company.googlePlaceId}`);
      console.log('');
    });

    // Test 2: Search for plumbers
    console.log('─────────────────────────────────────────────────────');
    console.log('Test 2: Plumbers in Philadelphia');
    console.log('─────────────────────────────────────────────────────\n');

    const plumbers = await discoverCompanies('plumbers in Philadelphia, PA', {
      minRating: 3.5,
      maxResults: 3
    });

    console.log(`\n✅ Found ${plumbers.length} plumbers\n`);

    plumbers.forEach((company, index) => {
      console.log(`${index + 1}. ${company.name}`);
      console.log(`   Rating: ${company.rating} ⭐`);
      console.log(`   Website: ${company.website || 'N/A'}`);
      console.log('');
    });

    // Print cost summary
    console.log('─────────────────────────────────────────────────────');
    costTracker.printSummary();

    console.log('═══════════════════════════════════════════════════════');
    console.log('   ✅ ALL TESTS PASSED');
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
runTest();
