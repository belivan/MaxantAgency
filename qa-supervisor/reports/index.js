/**
 * Report Runner - Collects all QA data and generates HTML report
 */

import { ReportGenerator } from './generator.js';
import { validateAgent1 } from '../validators/agent1-validator.js';
import { validateAgent2 } from '../validators/agent2-validator.js';
import { validateAgent3 } from '../validators/agent3-validator.js';
import { validateAgent4 } from '../validators/agent4-validator.js';
import { validateAgent5 } from '../validators/agent5-validator.js';
import { validateAgent6 } from '../validators/agent6-validator.js';
import { runIntegrationTests } from '../integration-tests/index.js';
import { runPerformanceTests } from '../performance-tests/index.js';
import { runCodeQualityChecks } from '../code-quality/index.js';
import logger from '../shared/logger.js';
import ora from 'ora';

/**
 * Generate comprehensive QA report
 */
export async function generateQAReport() {
  logger.header('📄 GENERATING COMPREHENSIVE QA REPORT');

  const generator = new ReportGenerator();
  const validators = [
    { name: 'Agent 1 - Prospecting Engine', validate: validateAgent1 },
    { name: 'Agent 2 - Analysis Engine', validate: validateAgent2 },
    { name: 'Agent 3 - Outreach Engine', validate: validateAgent3 },
    { name: 'Agent 4 - Command Center UI', validate: validateAgent4 },
    { name: 'Agent 5 - Database Setup Tool', validate: validateAgent5 },
    { name: 'Agent 6 - Pipeline Orchestrator', validate: validateAgent6 }
  ];

  // Step 1: Run Agent Validations
  logger.section('Step 1: Validating Agents');

  for (const validator of validators) {
    const spinner = ora(`Validating ${validator.name}...`).start();

    try {
      const results = await validator.validate();
      generator.addAgentResults(results);
      spinner.succeed(`${validator.name} validated`);
    } catch (error) {
      spinner.fail(`${validator.name} failed: ${error.message}`);
    }
  }

  logger.separator();

  // Step 2: Run Integration Tests
  logger.section('Step 2: Running Integration Tests');

  try {
    const spinner = ora('Running integration tests...').start();
    const integrationResults = await runIntegrationTests();
    generator.addIntegrationResults(integrationResults);
    spinner.succeed('Integration tests complete');
  } catch (error) {
    logger.error(`Integration tests failed: ${error.message}`);
  }

  logger.separator();

  // Step 3: Run Performance Tests
  logger.section('Step 3: Running Performance Tests');

  try {
    const spinner = ora('Running performance tests...').start();
    const performanceResults = await runPerformanceTests();
    generator.addPerformanceResults(performanceResults);
    spinner.succeed('Performance tests complete');
  } catch (error) {
    logger.error(`Performance tests failed: ${error.message}`);
  }

  logger.separator();

  // Step 4: Run Code Quality Checks
  logger.section('Step 4: Running Code Quality Checks');

  try {
    const spinner = ora('Running code quality checks...').start();
    const qualityResults = await runCodeQualityChecks();
    generator.addCodeQualityResults(qualityResults);
    spinner.succeed('Code quality checks complete');
  } catch (error) {
    logger.error(`Code quality checks failed: ${error.message}`);
  }

  logger.separator();

  // Step 5: Generate HTML Report
  logger.section('Step 5: Generating HTML Report');

  const spinner = ora('Generating HTML report...').start();

  try {
    const reportPath = generator.generateHTML();
    spinner.succeed('HTML report generated');

    logger.success(`Report saved to: ${reportPath}`);

    // Try to open in browser
    try {
      const open = await import('open');
      await open.default(reportPath);
      logger.info('Report opened in browser');
    } catch {
      logger.info('To view report, open: ' + reportPath);
    }

    return {
      success: true,
      path: reportPath,
      summary: generator.data.summary
    };

  } catch (error) {
    spinner.fail('Failed to generate report');
    throw error;
  }
}

export default {
  generateQAReport
};
