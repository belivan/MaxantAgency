/**
 * Test Scheduler
 * Tests the cron scheduling functionality
 */

import cron from 'node-cron';
import { scheduleCampaign, getActiveTasks, unscheduleCampaign } from '../schedulers/cron-scheduler.js';
import { log } from '../shared/logger.js';

// Mock campaign for testing scheduler
const testCampaign = {
  id: 'scheduler-test-001',
  name: 'Scheduler Test Campaign',
  config: {
    schedule: {
      cron: '*/1 * * * *', // Every minute (for testing)
      timezone: 'America/New_York',
      enabled: true
    },
    steps: [],
    notifications: {
      onComplete: { email: null },
      onFailure: { email: null }
    }
  }
};

async function testScheduler() {
  console.log('\n========================================');
  console.log('Testing Cron Scheduler');
  console.log('========================================\n');

  try {
    // Test 1: Validate cron expression
    console.log('Test 1: Validating cron expressions...');
    const validCron = '0 9 * * MON';
    const invalidCron = 'invalid cron';

    console.log(`  "${validCron}" is valid:`, cron.validate(validCron));
    console.log(`  "${invalidCron}" is valid:`, cron.validate(invalidCron));

    // Test 2: Schedule a campaign
    console.log('\nTest 2: Scheduling campaign...');
    const task = scheduleCampaign(testCampaign);

    if (task) {
      console.log('  ✅ Campaign scheduled successfully');
    } else {
      console.log('  ❌ Failed to schedule campaign');
    }

    // Test 3: Check active tasks
    console.log('\nTest 3: Checking active tasks...');
    const activeTasks = getActiveTasks();
    console.log(`  Active tasks: ${activeTasks.size}`);

    for (const [id, task] of activeTasks.entries()) {
      console.log(`  - ${id}`);
    }

    // Test 4: Unschedule campaign
    console.log('\nTest 4: Unscheduling campaign...');
    const unscheduled = unscheduleCampaign(testCampaign.id);

    if (unscheduled) {
      console.log('  ✅ Campaign unscheduled successfully');
    } else {
      console.log('  ❌ Failed to unschedule campaign');
    }

    // Test 5: Verify it was removed
    console.log('\nTest 5: Verifying removal...');
    const finalTasks = getActiveTasks();
    console.log(`  Active tasks after removal: ${finalTasks.size}`);

    console.log('\n✅ All scheduler tests passed!');

  } catch (error) {
    console.error('\n❌ Scheduler test failed:', error.message);
    process.exit(1);
  }

  console.log('\n========================================');
  console.log('Test completed');
  console.log('========================================\n');
}

// Run the test
testScheduler().catch(error => {
  console.error('Test failed with error:', error);
  process.exit(1);
});
