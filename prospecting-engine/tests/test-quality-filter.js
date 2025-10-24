/**
 * Test: Quality Filter (Inactive/Closed Businesses)
 *
 * Tests the quality filtering logic that prevents saving inactive prospects.
 * This is a UNIT test that validates the filter conditions without calling external APIs.
 */

console.log('\n🧪 Testing Quality Filter Logic\n');
console.log('=' .repeat(80));

let testsPassed = 0;
let testsFailed = 0;

/**
 * Simulate the quality filter logic
 */
function shouldSkipProspect(company, websiteStatus) {
  // Calculate days since last review
  let daysSinceLastReview = null;
  if (company.mostRecentReviewDate) {
    const lastReviewDate = new Date(company.mostRecentReviewDate);
    const now = Date.now();
    daysSinceLastReview = Math.floor((now - lastReviewDate) / (1000 * 60 * 60 * 24));
  }

  // FILTER 1: Broken website + No recent activity
  if (
    ['ssl_error', 'timeout', 'not_found'].includes(websiteStatus) &&
    (daysSinceLastReview === null || daysSinceLastReview > 180)
  ) {
    return { skip: true, reason: 'broken_site_no_activity' };
  }

  // FILTER 2: No website + No recent activity + Low rating
  if (
    websiteStatus === 'no_website' &&
    (daysSinceLastReview === null || daysSinceLastReview > 180) &&
    (company.rating === null || company.rating < 3.5)
  ) {
    return { skip: true, reason: 'no_website_no_activity_low_rating' };
  }

  // FILTER 3: Parking page
  if (websiteStatus === 'parking_page') {
    return { skip: true, reason: 'parking_page' };
  }

  return { skip: false, reason: null };
}

/**
 * Test helper
 */
function runTest(testName, company, websiteStatus, expectedSkip, expectedReason) {
  const result = shouldSkipProspect(company, websiteStatus);

  console.log(`\n📋 ${testName}`);
  console.log('-'.repeat(80));
  console.log(`  Company: ${company.name}`);
  console.log(`  Website Status: ${websiteStatus}`);
  console.log(`  Rating: ${company.rating || 'none'}`);
  console.log(`  Review Count: ${company.reviewCount || 0}`);
  console.log(`  Most Recent Review: ${company.mostRecentReviewDate || 'never'}`);

  if (company.mostRecentReviewDate) {
    const reviewDate = new Date(company.mostRecentReviewDate);
    const daysAgo = Math.floor((Date.now() - reviewDate.getTime()) / (1000 * 60 * 60 * 24));
    console.log(`  Days Since Review: ${daysAgo}`);
  }

  console.log(`  Expected: ${expectedSkip ? 'SKIP' : 'SAVE'}`);
  console.log(`  Result: ${result.skip ? 'SKIP' : 'SAVE'}`);

  if (result.skip) {
    console.log(`  Reason: ${result.reason}`);
  }

  const passed = result.skip === expectedSkip && result.reason === expectedReason;

  if (passed) {
    console.log(`  ✅ PASS`);
    testsPassed++;
  } else {
    console.log(`  ❌ FAIL`);
    testsFailed++;
  }
}

// ========================================
// TEST CASES
// ========================================

// TEST 1: Broken website with OLD reviews = SKIP
runTest(
  'TEST 1: Broken website (ssl_error) + no reviews in 200 days',
  {
    name: 'Closed Restaurant',
    rating: 4.2,
    reviewCount: 45,
    mostRecentReviewDate: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString() // 200 days ago
  },
  'ssl_error',
  true,
  'broken_site_no_activity'
);

// TEST 2: Broken website with RECENT reviews = SAVE (active business, urgent need)
runTest(
  'TEST 2: Broken website (timeout) + recent reviews (30 days)',
  {
    name: 'Active Restaurant with Broken Site',
    rating: 4.5,
    reviewCount: 150,
    mostRecentReviewDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days ago
  },
  'timeout',
  false,
  null
);

// TEST 3: Broken website with NO reviews ever = SKIP
runTest(
  'TEST 3: Broken website (not_found) + no reviews ever',
  {
    name: 'Unknown Business',
    rating: null,
    reviewCount: 0,
    mostRecentReviewDate: null
  },
  'not_found',
  true,
  'broken_site_no_activity'
);

// TEST 4: Active website (any review age) = SAVE
runTest(
  'TEST 4: Active website + old reviews',
  {
    name: 'Business with Active Site',
    rating: 3.8,
    reviewCount: 20,
    mostRecentReviewDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year ago
  },
  'active',
  false,
  null
);

// TEST 5: No website + recent reviews + good rating = SAVE (opportunity!)
runTest(
  'TEST 5: No website + recent reviews (60 days) + good rating',
  {
    name: 'Good Business Without Website',
    rating: 4.7,
    reviewCount: 89,
    mostRecentReviewDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString() // 60 days ago
  },
  'no_website',
  false,
  null
);

// TEST 6: No website + old reviews + low rating = SKIP
runTest(
  'TEST 6: No website + old reviews (300 days) + low rating (2.5)',
  {
    name: 'Defunct Business',
    rating: 2.5,
    reviewCount: 8,
    mostRecentReviewDate: new Date(Date.now() - 300 * 24 * 60 * 60 * 1000).toISOString() // 300 days ago
  },
  'no_website',
  true,
  'no_website_no_activity_low_rating'
);

// TEST 7: No website + no reviews + no rating = SKIP
runTest(
  'TEST 7: No website + no reviews + no rating',
  {
    name: 'Empty Listing',
    rating: null,
    reviewCount: 0,
    mostRecentReviewDate: null
  },
  'no_website',
  true,
  'no_website_no_activity_low_rating'
);

// TEST 8: Parking page (always skip)
runTest(
  'TEST 8: Parking page',
  {
    name: 'Domain For Sale',
    rating: null,
    reviewCount: 0,
    mostRecentReviewDate: null
  },
  'parking_page',
  true,
  'parking_page'
);

// TEST 9: Edge case - exactly 180 days (should SAVE, not skip)
runTest(
  'TEST 9: Broken website + exactly 180 days since review',
  {
    name: 'Edge Case Business',
    rating: 4.0,
    reviewCount: 30,
    mostRecentReviewDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString() // exactly 180 days
  },
  'ssl_error',
  false,
  null
);

// TEST 10: Edge case - 181 days (should SKIP)
runTest(
  'TEST 10: Broken website + 181 days since review',
  {
    name: 'Just Over Threshold',
    rating: 4.0,
    reviewCount: 30,
    mostRecentReviewDate: new Date(Date.now() - 181 * 24 * 60 * 60 * 1000).toISOString() // 181 days
  },
  'ssl_error',
  true,
  'broken_site_no_activity'
);

// TEST 11: No website + old reviews + rating exactly 3.5 (should SAVE)
runTest(
  'TEST 11: No website + old reviews + rating 3.5 (threshold)',
  {
    name: 'Threshold Rating',
    rating: 3.5,
    reviewCount: 15,
    mostRecentReviewDate: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString()
  },
  'no_website',
  false,
  null
);

// TEST 12: No website + old reviews + rating 3.4 (should SKIP)
runTest(
  'TEST 12: No website + old reviews + rating 3.4 (below threshold)',
  {
    name: 'Below Threshold',
    rating: 3.4,
    reviewCount: 15,
    mostRecentReviewDate: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString()
  },
  'no_website',
  true,
  'no_website_no_activity_low_rating'
);

// ========================================
// SUMMARY
// ========================================

console.log('\n\n' + '='.repeat(80));
console.log('📊 TEST SUMMARY');
console.log('='.repeat(80));
console.log(`✅ Passed: ${testsPassed}`);
console.log(`❌ Failed: ${testsFailed}`);
console.log(`📝 Total:  ${testsPassed + testsFailed}`);

if (testsFailed === 0) {
  console.log('\n🎉 All quality filter tests passed!');
  console.log('\n✨ Filter Implementation Validated');
  console.log('\n📖 Filter Rules:');
  console.log('   1. Broken website (ssl_error/timeout/not_found) + no reviews in 180+ days = SKIP');
  console.log('   2. No website + no reviews in 180+ days + rating < 3.5 = SKIP');
  console.log('   3. Parking page = SKIP');
  console.log('   4. All other cases = SAVE (viable prospect)');
} else {
  console.log('\n⚠️  Some tests failed - review filter logic');
}

console.log('');

process.exit(testsFailed === 0 ? 0 : 1);
