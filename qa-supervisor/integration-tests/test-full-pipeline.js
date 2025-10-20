/**
 * Integration Test: Full Pipeline
 *
 * Tests the complete flow: Prospect → Analyze → Compose → Send
 */

import { testProspectToLead } from './test-prospect-to-lead.js';
import { testLeadToEmail } from './test-lead-to-email.js';
import logger from '../shared/logger.js';

/**
 * Test full pipeline end-to-end
 */
export async function testFullPipeline() {
  logger.section('FULL PIPELINE TEST');
  logger.info('Testing: Prospect → Analyze → Compose → Send');

  const results = {
    tests: [],
    passed: 0,
    failed: 0,
    skipped: 0
  };

  try {
    // Test 1: Agent 1 → Agent 2
    logger.info('\n=== Test 1: Prospecting → Analysis ===');
    const prospect2Lead = await testProspectToLead();

    results.tests.push({
      name: 'Agent 1 → Agent 2',
      ...prospect2Lead
    });

    if (prospect2Lead.skipped) {
      results.skipped++;
      logger.warning('Test skipped: ' + prospect2Lead.error);
    } else if (prospect2Lead.passed) {
      results.passed++;
    } else {
      results.failed++;
      logger.error('Pipeline test aborted due to Agent 1 → Agent 2 failure');
      return results;
    }

    // Test 2: Agent 2 → Agent 3
    logger.info('\n=== Test 2: Analysis → Email Composition ===');
    const lead2Email = await testLeadToEmail();

    results.tests.push({
      name: 'Agent 2 → Agent 3',
      ...lead2Email
    });

    if (lead2Email.skipped) {
      results.skipped++;
      logger.warning('Test skipped: ' + lead2Email.error);
    } else if (lead2Email.passed) {
      results.passed++;
    } else {
      results.failed++;
      logger.error('Pipeline test aborted due to Agent 2 → Agent 3 failure');
      return results;
    }

    // All tests completed
    logger.separator();

    if (results.failed === 0 && results.skipped === 0) {
      logger.success('✅ FULL PIPELINE TEST PASSED');
    } else if (results.failed === 0 && results.skipped > 0) {
      logger.warning(`⚠️  PIPELINE TEST INCOMPLETE (${results.skipped} skipped)`);
    } else {
      logger.error('❌ FULL PIPELINE TEST FAILED');
    }

    return results;

  } catch (error) {
    logger.error(`Fatal error during pipeline test: ${error.message}`);
    return {
      ...results,
      fatal: true,
      error: error.message
    };
  }
}

export default {
  testFullPipeline
};
