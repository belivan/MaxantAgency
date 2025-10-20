/**
 * Performance Test: Prospecting Speed
 *
 * Tests that Agent 1 can generate 20 prospects in under 3 minutes
 */

import { waitForSSEComplete, checkEndpointAvailable, isSupabaseConfigured } from '../integration-tests/utils.js';
import logger from '../shared/logger.js';
import { formatDuration } from '../shared/test-utils.js';

const AGENT1_URL = 'http://localhost:3010';
const TARGET_COUNT = 20;
const TARGET_TIME = 180000; // 3 minutes in ms

/**
 * Test prospecting speed
 */
export async function testProspectingSpeed() {
  logger.info('Performance Test: Generate 20 prospects in <3 minutes');

  try {
    // Check prerequisites
    const agent1Available = await checkEndpointAvailable(`${AGENT1_URL}/api/health`);

    if (!agent1Available) {
      return {
        passed: false,
        skipped: true,
        error: 'Agent 1 not running (port 3010)'
      };
    }

    if (!isSupabaseConfigured()) {
      logger.warning('  Supabase not configured - cannot verify database saves');
    }

    // Start timing
    logger.info(`  Starting: Generate ${TARGET_COUNT} prospects...`);
    const startTime = Date.now();

    // Make request to Agent 1
    const response = await fetch(`${AGENT1_URL}/api/prospect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brief: {
          icp: { industry: "Restaurant" },
          geo: { city: "Philadelphia, PA" }
        },
        count: TARGET_COUNT,
        verify: true
      })
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    // Wait for completion
    const result = await waitForSSEComplete(response, TARGET_TIME + 30000);
    const duration = Date.now() - startTime;

    // Check results
    if (!result) {
      throw new Error('No result received from SSE stream');
    }

    const found = result.found || 0;
    const durationFormatted = formatDuration(duration);
    const targetFormatted = formatDuration(TARGET_TIME);

    // Log results
    logger.info(`  Found: ${found} prospects`);
    logger.info(`  Duration: ${durationFormatted}`);
    logger.info(`  Target: <${targetFormatted}`);

    // Determine pass/fail
    const meetsCount = found >= TARGET_COUNT;
    const meetsTime = duration < TARGET_TIME;
    const passed = meetsCount && meetsTime;

    if (passed) {
      logger.success(`✅ Speed test PASSED (${found} prospects in ${durationFormatted})`);
    } else if (!meetsCount) {
      logger.error(`❌ Speed test FAILED: Only found ${found}/${TARGET_COUNT} prospects`);
    } else {
      logger.error(`❌ Speed test FAILED: Too slow (${durationFormatted} > ${targetFormatted})`);
    }

    return {
      passed,
      duration,
      durationFormatted,
      found,
      target: TARGET_COUNT,
      timeTarget: TARGET_TIME,
      meetsCount,
      meetsTime
    };

  } catch (error) {
    logger.error(`❌ Speed test ERROR: ${error.message}`);
    return {
      passed: false,
      error: error.message
    };
  }
}

export default {
  testProspectingSpeed
};
