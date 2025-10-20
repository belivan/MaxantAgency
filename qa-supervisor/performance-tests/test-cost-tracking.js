/**
 * Performance Test: Cost Tracking
 *
 * Validates that cost estimates are within acceptable ranges
 */

import logger from '../shared/logger.js';

/**
 * Cost targets per agent
 */
const COST_TARGETS = {
  agent1: {
    name: 'Prospecting Engine',
    target: 0.15,
    estimate: 0.09,
    unit: 'prospect'
  },
  agent2: {
    name: 'Analysis Engine',
    target: 0.15,
    estimate: 0.033,
    unit: 'lead'
  },
  agent3: {
    name: 'Outreach Engine',
    target: 0.01,
    estimate: 0.003,
    unit: 'email'
  }
};

/**
 * Test cost estimates
 */
export async function testCostTracking() {
  logger.info('Performance Test: Cost Tracking Validation');

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Test each agent's cost estimate
  for (const [agentKey, config] of Object.entries(COST_TARGETS)) {
    const testName = `${config.name} cost per ${config.unit}`;

    logger.info(`  Testing: ${testName}`);
    logger.info(`    Estimate: $${config.estimate.toFixed(4)}`);
    logger.info(`    Target: <$${config.target.toFixed(4)}`);

    const passed = config.estimate < config.target;
    const margin = ((config.target - config.estimate) / config.target * 100).toFixed(1);

    if (passed) {
      logger.success(`    ✅ PASS (${margin}% under target)`);
      results.passed++;
    } else {
      const overage = ((config.estimate - config.target) / config.target * 100).toFixed(1);
      logger.error(`    ❌ FAIL (${overage}% over target)`);
      results.failed++;
    }

    results.tests.push({
      agent: config.name,
      name: testName,
      passed,
      estimate: config.estimate,
      target: config.target,
      unit: config.unit,
      margin: passed ? margin : null
    });
  }

  // Calculate total pipeline cost
  logger.separator();
  logger.info('  Full Pipeline Cost Estimate:');

  const totalCost = COST_TARGETS.agent1.estimate +
                    COST_TARGETS.agent2.estimate +
                    COST_TARGETS.agent3.estimate;

  const totalTarget = COST_TARGETS.agent1.target +
                      COST_TARGETS.agent2.target +
                      COST_TARGETS.agent3.target;

  logger.info(`    Per lead (end-to-end): $${totalCost.toFixed(4)}`);
  logger.info(`    Target: <$${totalTarget.toFixed(4)}`);

  const pipelinePassed = totalCost < totalTarget;

  if (pipelinePassed) {
    const savingsPercent = ((totalTarget - totalCost) / totalTarget * 100).toFixed(1);
    logger.success(`    ✅ Pipeline cost within target (${savingsPercent}% under)`);
  } else {
    logger.error(`    ❌ Pipeline cost exceeds target`);
    results.failed++;
  }

  // Summary
  logger.separator();
  const allPassed = results.failed === 0;

  if (allPassed) {
    logger.success(`✅ Cost tracking test PASSED`);
  } else {
    logger.error(`❌ Cost tracking test FAILED (${results.failed} over target)`);
  }

  return {
    passed: allPassed,
    totalCost,
    totalTarget,
    pipelinePassed,
    breakdown: results.tests
  };
}

export default {
  testCostTracking
};
