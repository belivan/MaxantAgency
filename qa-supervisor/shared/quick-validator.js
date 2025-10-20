/**
 * Quick Validator - Fast validation for watch mode and pre-commit
 *
 * Runs only critical checks for speed
 */

import { runSecurityCheck } from '../code-quality/check-security.js';
import { getAgentDirectory } from './test-utils.js';
import logger from './logger.js';

/**
 * Run quick validation on a single agent
 */
export async function quickValidateAgent(agentKey) {
  const agentName = getAgentName(agentKey);
  const agentDir = getAgentDirectory(agentKey);

  const results = {
    agent: agentName,
    passed: true,
    checks: 0,
    issues: []
  };

  // Only run security check (fastest and most critical)
  try {
    const securityResult = await runSecurityCheck(agentName, agentDir);

    results.checks++;

    if (!securityResult.passed) {
      results.passed = false;
      results.issues.push({
        type: 'security',
        count: securityResult.issues?.length || 0,
        severity: 'critical'
      });
    }
  } catch (error) {
    results.passed = false;
    results.issues.push({
      type: 'error',
      message: error.message
    });
  }

  return results;
}

/**
 * Run quick validation on all agents
 */
export async function quickValidateAll() {
  const agents = ['agent1', 'agent2', 'agent3', 'agent4', 'agent5', 'agent6'];
  const results = [];
  let allPassed = true;

  for (const agentKey of agents) {
    try {
      const result = await quickValidateAgent(agentKey);
      results.push(result);

      if (!result.passed) {
        allPassed = false;
      }
    } catch (error) {
      logger.warning(`Failed to validate ${agentKey}: ${error.message}`);
      allPassed = false;
    }
  }

  return {
    passed: allPassed,
    results
  };
}

/**
 * Get human-readable agent name
 */
function getAgentName(agentKey) {
  const names = {
    'agent1': 'Agent 1 - Prospecting Engine',
    'agent2': 'Agent 2 - Analysis Engine',
    'agent3': 'Agent 3 - Outreach Engine',
    'agent4': 'Agent 4 - Command Center UI',
    'agent5': 'Agent 5 - Database Setup Tool',
    'agent6': 'Agent 6 - Pipeline Orchestrator'
  };
  return names[agentKey] || agentKey;
}

/**
 * Determine which agent a file belongs to
 */
export function getAgentFromPath(filename) {
  if (filename.includes('prospecting-engine')) return 'agent1';
  if (filename.includes('analysis-engine')) return 'agent2';
  if (filename.includes('outreach-engine')) return 'agent3';
  if (filename.includes('command-center-ui')) return 'agent4';
  if (filename.includes('database-tools')) return 'agent5';
  if (filename.includes('pipeline-orchestrator')) return 'agent6';
  return null;
}

export default {
  quickValidateAgent,
  quickValidateAll,
  getAgentFromPath
};
