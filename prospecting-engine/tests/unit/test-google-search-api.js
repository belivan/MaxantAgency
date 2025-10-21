#!/usr/bin/env node

/**
 * Google Custom Search API Test
 *
 * This script tests if your Google Search API credentials are working correctly.
 * It will make a real API call and show you exactly what's happening.
 */

import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
const ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;

console.log('\n═══════════════════════════════════════════════════════');
console.log('   GOOGLE CUSTOM SEARCH API TEST');
console.log('═══════════════════════════════════════════════════════\n');

// Step 1: Check if credentials are loaded
console.log('📋 Step 1: Checking credentials...\n');

if (!API_KEY || API_KEY === 'your-google-search-api-key-here') {
  console.log('❌ GOOGLE_SEARCH_API_KEY is missing or still using placeholder');
  console.log(`   Current value: ${API_KEY || '(not set)'}`);
  console.log('\n   Fix: Set real API key in .env file\n');
  process.exit(1);
}

if (!ENGINE_ID || ENGINE_ID === 'your-search-engine-id-here') {
  console.log('❌ GOOGLE_SEARCH_ENGINE_ID is missing or still using placeholder');
  console.log(`   Current value: ${ENGINE_ID || '(not set)'}`);
  console.log('\n   Fix: Set real Search Engine ID in .env file\n');
  process.exit(1);
}

console.log('✅ API Key loaded:', API_KEY.substring(0, 10) + '...' + API_KEY.substring(API_KEY.length - 4));
console.log('✅ Engine ID loaded:', ENGINE_ID);

// Step 2: Test API call
console.log('\n📡 Step 2: Making test API call...\n');

const testQuery = 'Càphê Roasters Philadelphia twitter';
const url = `https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${ENGINE_ID}&q=${encodeURIComponent(testQuery)}`;

console.log('Query:', testQuery);
console.log('URL:', url.replace(API_KEY, 'API_KEY_HIDDEN'));

try {
  console.log('\n⏳ Sending request...\n');

  const response = await fetch(url);
  const status = response.status;

  console.log('Response Status:', status);

  if (status === 200) {
    const data = await response.json();

    console.log('\n✅ SUCCESS! Google Search API is working!\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('   SEARCH RESULTS');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log(`Total results: ${data.searchInformation?.totalResults || 0}`);
    console.log(`Search time: ${data.searchInformation?.searchTime || 0}s\n`);

    if (data.items && data.items.length > 0) {
      console.log('Top 3 results:\n');
      data.items.slice(0, 3).forEach((item, i) => {
        console.log(`${i + 1}. ${item.title}`);
        console.log(`   URL: ${item.link}`);
        console.log(`   Snippet: ${item.snippet?.substring(0, 100)}...`);
        console.log('');
      });

      // Check if Twitter was found
      const twitterResult = data.items.find(item =>
        item.link.includes('twitter.com') || item.link.includes('x.com')
      );

      if (twitterResult) {
        console.log('🎯 Twitter profile found:', twitterResult.link);
      } else {
        console.log('⚠️  No Twitter result in top results (this is OK, depends on query)');
      }
    } else {
      console.log('⚠️  No results returned (this might indicate a config issue)');
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('   VERDICT: ✅ API is configured correctly!');
    console.log('═══════════════════════════════════════════════════════\n');

  } else if (status === 400) {
    const errorData = await response.json();

    console.log('\n❌ ERROR 400: Bad Request\n');
    console.log('Error details:', JSON.stringify(errorData, null, 2));
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('   COMMON CAUSES:');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('1. Search Engine ID is incorrect');
    console.log('   - Check: https://programmablesearchengine.google.com/controlpanel/all');
    console.log('   - Your ID:', ENGINE_ID);
    console.log('');
    console.log('2. API Key doesn\'t have Custom Search API enabled');
    console.log('   - Check: https://console.cloud.google.com/apis/api/customsearch.googleapis.com');
    console.log('   - Make sure it\'s ENABLED');
    console.log('');
    console.log('3. Search engine isn\'t set to "Search the entire web"');
    console.log('   - Edit your search engine and enable this option');
    console.log('');
    console.log('4. API key restrictions blocking the request');
    console.log('   - Check API key restrictions in Google Cloud Console');
    console.log('\n');

  } else if (status === 403) {
    const errorData = await response.json();

    console.log('\n❌ ERROR 403: Forbidden\n');
    console.log('Error details:', JSON.stringify(errorData, null, 2));
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('   COMMON CAUSES:');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('1. Custom Search API not enabled for this project');
    console.log('   - Go to: https://console.cloud.google.com/apis/library/customsearch.googleapis.com');
    console.log('   - Click "ENABLE"');
    console.log('');
    console.log('2. Daily quota exceeded (100 searches/day on free tier)');
    console.log('   - Check: https://console.cloud.google.com/apis/api/customsearch.googleapis.com/quotas');
    console.log('');
    console.log('3. Billing required (if you\'ve exceeded free tier)');
    console.log('   - Enable billing in Google Cloud Console');
    console.log('\n');

  } else {
    const text = await response.text();

    console.log('\n❌ Unexpected error\n');
    console.log('Status:', status);
    console.log('Response:', text.substring(0, 500));
    console.log('\n');
  }

} catch (error) {
  console.log('\n❌ Network or connection error\n');
  console.log('Error:', error.message);
  console.log('\nThis usually means:');
  console.log('- No internet connection');
  console.log('- Firewall blocking the request');
  console.log('- DNS issues');
  console.log('\n');
}

console.log('═══════════════════════════════════════════════════════\n');
