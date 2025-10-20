/**
 * Performance Test: Analysis Speed
 *
 * Tests that Agent 2 can analyze 10 websites in under 5 minutes
 */

import { supabase, waitForSSEComplete, checkEndpointAvailable, isSupabaseConfigured } from '../integration-tests/utils.js';
import logger from '../shared/logger.js';
import { formatDuration } from '../shared/test-utils.js';

const AGENT2_URL = 'http://localhost:3000';
const TARGET_COUNT = 10;
const TARGET_TIME = 300000; // 5 minutes in ms

/**
 * Test analysis speed
 */
export async function testAnalysisSpeed() {
  logger.info('Performance Test: Analyze 10 websites in <5 minutes');

  try {
    // Check prerequisites
    if (!isSupabaseConfigured()) {
      return {
        passed: false,
        skipped: true,
        error: 'Supabase not configured (.env missing)'
      };
    }

    const agent2Available = await checkEndpointAvailable(`${AGENT2_URL}/api/health`);

    if (!agent2Available) {
      return {
        passed: false,
        skipped: true,
        error: 'Agent 2 not running (port 3000)'
      };
    }

    // Check if we have enough prospects to analyze
    logger.info('  Checking for prospects ready for analysis...');

    const { data: prospects, error: prospectError } = await supabase
      .from('prospects')
      .select('id')
      .eq('status', 'ready_for_analysis')
      .limit(TARGET_COUNT);

    if (prospectError) {
      throw new Error(`Database error: ${prospectError.message}`);
    }

    if (!prospects || prospects.length < TARGET_COUNT) {
      return {
        passed: false,
        skipped: true,
        error: `Not enough prospects (need ${TARGET_COUNT}, found ${prospects?.length || 0})`
      };
    }

    logger.success(`  Found ${prospects.length} prospects ready for analysis`);

    // Start timing
    logger.info(`  Starting: Analyze ${TARGET_COUNT} websites...`);
    const startTime = Date.now();

    // Make request to Agent 2
    const response = await fetch(`${AGENT2_URL}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filters: {
          status: 'ready_for_analysis',
          limit: TARGET_COUNT
        }
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

    const analyzed = result.analyzed || 0;
    const durationFormatted = formatDuration(duration);
    const targetFormatted = formatDuration(TARGET_TIME);

    // Log results
    logger.info(`  Analyzed: ${analyzed} websites`);
    logger.info(`  Duration: ${durationFormatted}`);
    logger.info(`  Target: <${targetFormatted}`);

    // Determine pass/fail
    const meetsCount = analyzed >= TARGET_COUNT;
    const meetsTime = duration < TARGET_TIME;
    const passed = meetsCount && meetsTime;

    if (passed) {
      logger.success(`✅ Speed test PASSED (${analyzed} sites in ${durationFormatted})`);
    } else if (!meetsCount) {
      logger.error(`❌ Speed test FAILED: Only analyzed ${analyzed}/${TARGET_COUNT} sites`);
    } else {
      logger.error(`❌ Speed test FAILED: Too slow (${durationFormatted} > ${targetFormatted})`);
    }

    return {
      passed,
      duration,
      durationFormatted,
      analyzed,
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
  testAnalysisSpeed
};
