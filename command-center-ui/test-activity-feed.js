/**
 * Activity Feed Integration Test
 * Verifies the /api/activity endpoint returns properly formatted data with pagination
 */

async function testActivityFeed() {
  console.log('🧪 Testing Activity Feed API with Pagination...\n');

  try {
    // Test 1: Fetch activity with pagination
    console.log('Test 1: Fetching activity feed (page=1, limit=3)');
    const response = await fetch('http://localhost:3000/api/activity?page=1&limit=3');
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${data.error}`);
    }

    console.log(`✅ Success: ${data.success}`);
    console.log(`✅ Pagination data present: ${!!data.pagination}`);
    console.log(`✅ Total activities: ${data.pagination.total}`);
    console.log(`✅ Returned activities: ${data.data.length}`);
    console.log(`✅ Current page: ${data.pagination.page}`);
    console.log(`✅ Total pages: ${data.pagination.total_pages}\n`);

    // Test 2: Verify data structure
    console.log('Test 2: Verifying activity data structure');
    let hasProspects = false;
    let hasLeads = false;
    let hasEmails = false;

    data.data.forEach((activity, index) => {
      // Check required fields
      if (!activity.id || !activity.type || !activity.message || !activity.timestamp) {
        throw new Error(`Activity #${index} missing required fields`);
      }

      // Track activity types
      if (activity.type === 'prospect_generated') hasProspects = true;
      if (activity.type === 'analysis_completed') hasLeads = true;
      if (activity.type === 'email_sent' || activity.type === 'social_sent') hasEmails = true;

      // Validate timestamp format
      const timestamp = new Date(activity.timestamp);
      if (isNaN(timestamp.getTime())) {
        throw new Error(`Activity #${index} has invalid timestamp: ${activity.timestamp}`);
      }
    });

    console.log(`✅ Data structure valid`);
    console.log(`✅ Has prospects: ${hasProspects}`);
    console.log(`✅ Has leads: ${hasLeads}`);
    console.log(`✅ Has emails: ${hasEmails}\n`);

    // Test 3: Verify activities are sorted by timestamp (newest first)
    console.log('Test 3: Verifying sort order (newest first)');
    let isSorted = true;
    for (let i = 1; i < data.data.length; i++) {
      const current = new Date(data.data[i].timestamp);
      const previous = new Date(data.data[i - 1].timestamp);
      if (current > previous) {
        isSorted = false;
        break;
      }
    }

    if (!isSorted) {
      throw new Error('Activities are not sorted by timestamp DESC');
    }

    console.log(`✅ Activities sorted correctly\n`);

    // Test 4: Display sample activities
    console.log('Test 4: Sample activities (most recent 3)');
    data.data.slice(0, 3).forEach((activity, index) => {
      const timestamp = new Date(activity.timestamp);
      const timeAgo = Math.round((Date.now() - timestamp.getTime()) / 1000 / 60);
      console.log(`\n  Activity #${index + 1}:`);
      console.log(`    Type: ${activity.type}`);
      console.log(`    Message: ${activity.message}`);
      console.log(`    Time: ${timeAgo} minutes ago`);
      if (activity.details) {
        console.log(`    Details: ${JSON.stringify(activity.details)}`);
      }
    });

    // Test 5: Test pagination navigation
    console.log('\n\nTest 5: Testing pagination navigation');

    // Fetch page 2
    const page2Response = await fetch('http://localhost:3000/api/activity?page=2&limit=3');
    const page2Data = await page2Response.json();

    console.log(`✅ Page 2 has ${page2Data.data.length} activities`);
    console.log(`✅ Page 2 has_previous: ${page2Data.pagination.has_previous}`);
    console.log(`✅ Page 2 has_more: ${page2Data.pagination.has_more}`);

    // Verify different data on different pages
    const page1Ids = data.data.map(a => a.id);
    const page2Ids = page2Data.data.map(a => a.id);
    const hasOverlap = page1Ids.some(id => page2Ids.includes(id));

    if (hasOverlap) {
      throw new Error('Pages should not have overlapping activities');
    }

    console.log(`✅ Pages have different activities (no overlap)`);

    console.log('\n\n✅ All tests passed!');
    console.log('📊 Activity feed pagination is working correctly\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testActivityFeed();
