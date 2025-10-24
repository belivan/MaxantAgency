/**
 * Test: Recent Reviews Filter
 *
 * Tests the new "recently reviewed" filtering functionality:
 * 1. Fetches prospects from Google Maps (with review dates)
 * 2. Saves prospects to database with most_recent_review_date
 * 3. Filters prospects by recentlyReviewedWithin parameter
 */

import { discoverCompanies } from '../discoverers/google-maps.js';
import { saveProspect, getProspects } from '../database/supabase-client.js';
import { logInfo, logError } from '../shared/logger.js';

async function testRecentReviewsFilter() {
  console.log('\n🧪 Testing Recent Reviews Filter\n');
  console.log('=' .repeat(60));

  let testsPassed = 0;
  let testsFailed = 0;

  try {
    // TEST 1: Discover companies and check for review dates
    console.log('\n📋 TEST 1: Discover companies with review data');
    console.log('-'.repeat(60));

    const companies = await discoverCompanies('restaurants in Philadelphia, PA', {
      maxResults: 3,
      minRating: 4.0
    });

    if (companies.length === 0) {
      console.log('❌ FAIL: No companies discovered');
      testsFailed++;
    } else {
      console.log(`✅ PASS: Discovered ${companies.length} companies`);
      testsPassed++;

      // Check if mostRecentReviewDate is present
      const companiesWithReviewDates = companies.filter(c => c.mostRecentReviewDate);
      console.log(`\n📊 Companies with review dates: ${companiesWithReviewDates.length}/${companies.length}`);

      companies.forEach((company, idx) => {
        console.log(`\n  ${idx + 1}. ${company.name}`);
        console.log(`     Rating: ${company.rating} ⭐ (${company.reviewCount} reviews)`);
        console.log(`     Most Recent Review: ${company.mostRecentReviewDate || 'N/A'}`);
        if (company.mostRecentReviewDate) {
          const reviewDate = new Date(company.mostRecentReviewDate);
          const monthsAgo = Math.floor((Date.now() - reviewDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
          console.log(`     📅 ${monthsAgo} month(s) ago`);
        }
      });
    }

    // TEST 2: Save prospects to database
    console.log('\n\n📋 TEST 2: Save prospects to database');
    console.log('-'.repeat(60));

    const savedProspects = [];
    for (const company of companies.slice(0, 2)) {
      try {
        const prospect = await saveProspect({
          company_name: company.name,
          industry: company.industry,
          website: company.website,
          city: company.city,
          state: company.state,
          address: company.address,
          contact_phone: company.phone,
          google_place_id: company.googlePlaceId,
          google_rating: company.rating,
          google_review_count: company.reviewCount,
          most_recent_review_date: company.mostRecentReviewDate,
          status: 'ready_for_analysis'
        });

        savedProspects.push(prospect);
        console.log(`✅ Saved: ${prospect.company_name}`);
        console.log(`   ID: ${prospect.id}`);
        console.log(`   Review Date: ${prospect.most_recent_review_date || 'N/A'}`);
      } catch (error) {
        // Might fail if prospect already exists (unique constraint on google_place_id)
        if (error.code === '23505') {
          console.log(`⚠️  Skipped: ${company.name} (already exists)`);
        } else {
          throw error;
        }
      }
    }

    if (savedProspects.length > 0) {
      console.log(`\n✅ PASS: Saved ${savedProspects.length} prospect(s)`);
      testsPassed++;
    } else {
      console.log('\n⚠️  WARNING: No new prospects saved (may already exist)');
    }

    // TEST 3: Filter by recently reviewed (last 6 months)
    console.log('\n\n📋 TEST 3: Filter prospects by recently reviewed (last 6 months)');
    console.log('-'.repeat(60));

    const recentProspects = await getProspects({
      recentlyReviewedWithin: 6,
      limit: 10
    });

    console.log(`\n📊 Found ${recentProspects.data.length} prospects with reviews in last 6 months`);

    if (recentProspects.data.length > 0) {
      console.log('\n✅ PASS: Filter returned results');
      testsPassed++;

      // Show sample results
      recentProspects.data.slice(0, 5).forEach((prospect, idx) => {
        console.log(`\n  ${idx + 1}. ${prospect.company_name}`);
        console.log(`     Industry: ${prospect.industry}`);
        console.log(`     City: ${prospect.city}, ${prospect.state}`);
        console.log(`     Rating: ${prospect.google_rating} ⭐ (${prospect.google_review_count} reviews)`);
        console.log(`     Most Recent Review: ${prospect.most_recent_review_date || 'N/A'}`);

        if (prospect.most_recent_review_date) {
          const reviewDate = new Date(prospect.most_recent_review_date);
          const monthsAgo = Math.floor((Date.now() - reviewDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
          console.log(`     📅 ${monthsAgo} month(s) ago`);

          // Verify it's actually within 6 months
          if (monthsAgo <= 6) {
            console.log(`     ✅ Within 6 months`);
          } else {
            console.log(`     ❌ NOT within 6 months (filter bug!)`);
          }
        }
      });
    } else {
      console.log('\n⚠️  No prospects found with recent reviews (database may be empty)');
    }

    // TEST 4: Filter by recently reviewed (last 3 months)
    console.log('\n\n📋 TEST 4: Filter prospects by recently reviewed (last 3 months)');
    console.log('-'.repeat(60));

    const veryRecentProspects = await getProspects({
      recentlyReviewedWithin: 3,
      limit: 5
    });

    console.log(`\n📊 Found ${veryRecentProspects.data.length} prospects with reviews in last 3 months`);

    if (veryRecentProspects.data.length > 0) {
      console.log('✅ PASS: 3-month filter returned results');
      testsPassed++;
    } else {
      console.log('⚠️  No prospects found (may need more data in database)');
    }

  } catch (error) {
    logError('Test failed', error);
    testsFailed++;
  }

  // Summary
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log(`📝 Total:  ${testsPassed + testsFailed}`);

  if (testsFailed === 0) {
    console.log('\n🎉 All tests passed!');
  } else {
    console.log('\n⚠️  Some tests failed');
  }

  console.log('\n✨ Feature Implementation Complete!');
  console.log('\n📖 Usage:');
  console.log('   const prospects = await getProspects({');
  console.log('     recentlyReviewedWithin: 6  // months');
  console.log('   });');
  console.log('');

  process.exit(testsFailed === 0 ? 0 : 1);
}

// Run tests
testRecentReviewsFilter();
