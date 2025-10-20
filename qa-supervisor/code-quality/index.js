/**
 * Code Quality Checks Runner
 *
 * Runs all code quality and static analysis checks
 */

import { runSecurityCheck } from './check-security.js';
import { runErrorHandlingCheck } from './check-error-handling.js';
import { getAgentDirectory } from '../shared/test-utils.js';
import logger from '../shared/logger.js';

const AGENTS = [
  { key: 'agent1', name: 'Agent 1 - Prospecting Engine' },
  { key: 'agent2', name: 'Agent 2 - Analysis Engine' },
  { key: 'agent3', name: 'Agent 3 - Outreach Engine' },
  { key: 'agent4', name: 'Agent 4 - Command Center UI' },
  { key: 'agent5', name: 'Agent 5 - Database Setup Tool' },
  { key: 'agent6', name: 'Agent 6 - Pipeline Orchestrator' }
];

/**
 * Run all code quality checks
 */
export async function runCodeQualityChecks() {
  logger.header('🔍 CODE QUALITY CHECKS');

  const results = {
    agents: [],
    totalIssues: 0,
    criticalIssues: 0,
    warnings: 0
  };

  for (const agent of AGENTS) {
    logger.section(agent.name);

    try {
      const agentDir = getAgentDirectory(agent.key);

      // Security check
      const securityResult = await runSecurityCheck(agent.name, agentDir);

      // Error handling check
      const errorHandlingResult = await runErrorHandlingCheck(agent.name, agentDir);

      const agentResult = {
        name: agent.name,
        security: securityResult,
        errorHandling: errorHandlingResult
      };

      results.agents.push(agentResult);

      // Count issues
      if (!securityResult.passed) {
        results.totalIssues += securityResult.issues.length;
        results.criticalIssues += securityResult.critical || 0;
      }

      if (!errorHandlingResult.passed) {
        results.warnings++;
      }

    } catch (error) {
      logger.error(`  Failed to check ${agent.name}: ${error.message}`);
    }

    logger.separator();
  }

  // Final summary
  console.log('\n' + '═'.repeat(67));
  logger.section('CODE QUALITY SUMMARY');

  console.log(`Total Agents Scanned: ${AGENTS.length}`);
  console.log(`Security Issues: ${results.totalIssues}`);
  console.log(`  Critical: ${results.criticalIssues}`);
  console.log(`Error Handling Warnings: ${results.warnings}`);

  console.log('═'.repeat(67));

  if (results.criticalIssues > 0) {
    logger.error(`\n❌ CRITICAL: ${results.criticalIssues} security issues found`);
  } else if (results.totalIssues > 0) {
    logger.warning(`\n⚠️  ${results.totalIssues} security warnings found`);
  } else {
    logger.success(`\n✅ No security issues found`);
  }

  logger.separator();

  return results;
}

export default {
  runCodeQualityChecks
};
