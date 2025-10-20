/**
 * Test Campaign Runner
 * Tests the core campaign execution logic
 */

import { runCampaign } from '../schedulers/campaign-runner.js';
import { log } from '../shared/logger.js';

// Mock campaign for testing
const mockCampaign = {
  id: 'test-campaign-001',
  name: 'Test Campaign',
  total_runs: 0,
  total_cost: 0,
  config: {
    budget: {
      daily: 100,
      weekly: 500,
      monthly: 2000
    },
    steps: [
      {
        name: 'mock-step-1',
        engine: 'prospecting',
        endpoint: 'http://localhost:9999/mock', // Non-existent endpoint
        method: 'POST',
        params: { test: true },
        timeout: 5000,
        retry: {
          attempts: 1,
          delay: 1000
        },
        onSuccess: 'continue',
        onFailure: 'continue' // Continue even if it fails
      }
    ],
    notifications: {
      onComplete: { email: null },
      onFailure: { email: null }
    }
  }
};

async function testCampaignRunner() {
  console.log('\n========================================');
  console.log('Testing Campaign Runner');
  console.log('========================================\n');

  try {
    console.log('Starting mock campaign run...');
    console.log('Note: This will fail because the endpoint does not exist');
    console.log('But it should handle the error gracefully\n');

    const result = await runCampaign(mockCampaign, 'manual');

    console.log('\n✅ Campaign run completed');
    console.log('Result:', JSON.stringify(result, null, 2));

  } catch (error) {
    console.log('\n⚠️ Campaign run failed (expected for this test)');
    console.log('Error:', error.message);
  }

  console.log('\n========================================');
  console.log('Test completed');
  console.log('========================================\n');
}

// Run the test
testCampaignRunner().catch(error => {
  console.error('Test failed with error:', error);
  process.exit(1);
});
