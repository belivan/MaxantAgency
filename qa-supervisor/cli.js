#!/usr/bin/env node

/**
 * QA Supervisor CLI
 *
 * Command-line interface for running QA checks on all agents
 */

import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { validateAgent1 } from './validators/agent1-validator.js';
import { validateAgent2 } from './validators/agent2-validator.js';
import { validateAgent3 } from './validators/agent3-validator.js';
import { validateAgent4 } from './validators/agent4-validator.js';
import { validateAgent5 } from './validators/agent5-validator.js';
import { validateAgent6 } from './validators/agent6-validator.js';
import { validateAgent7 } from './validators/agent7-validator.js';
import logger from './shared/logger.js';

const program = new Command();

program
  .name('qa-supervisor')
  .description('QA & Integration Supervisor for all engines')
  .version('1.0.0');

// Main check command
program
  .command('check')
  .description('Run all QA checks')
  .option('-a, --agent <number>', 'Check specific engine only (1-7)')
  .action(async (options) => {
    logger.header('🔍 QA SUPERVISOR - Checking All Engines');

    const results = {
      agents: [],
      totalPassed: 0,
      totalWarnings: 0,
      totalErrors: 0
    };

    try {
      // Map of engine validators
      const validators = {
        '1': { name: 'Prospecting Engine', validate: validateAgent1 },
        '2': { name: 'Analysis Engine', validate: validateAgent2 },
        '3': { name: 'Outreach Engine', validate: validateAgent3 },
        '4': { name: 'Command Center UI', validate: validateAgent4 },
        '5': { name: 'Database Tools', validate: validateAgent5 },
        '6': { name: 'Pipeline Orchestrator', validate: validateAgent6 },
        '7': { name: 'QA Supervisor', validate: validateAgent7 }
      };

      // Determine which engines to check
      const enginesToCheck = options.agent
        ? [options.agent]
        : Object.keys(validators);

      // Validate each engine
      for (const agentNum of enginesToCheck) {
        const validator = validators[agentNum];

        if (!validator) {
          logger.error(`Unknown engine: ${agentNum}`);
          continue;
        }

        const spinner = ora(`Validating ${validator.name}...`).start();

        try {
          const agentResults = await validator.validate();
          spinner.succeed(`${validator.name} validation complete`);

          results.agents.push(agentResults);
          results.totalPassed += agentResults.passed;
          results.totalWarnings += agentResults.warnings;
          results.totalErrors += agentResults.errors;
        } catch (error) {
          spinner.fail(`${validator.name} validation failed: ${error.message}`);
          console.error(chalk.gray(error.stack));
          results.totalErrors++;
        }
      }

      // Summary
      logger.summary({
        total: results.totalPassed + results.totalWarnings + results.totalErrors,
        passed: results.totalPassed,
        warnings: results.totalWarnings,
        errors: results.totalErrors
      });

      // Critical issues
      if (results.totalErrors > 0) {
        console.log('\n' + chalk.bold.red('Critical Issues:'));

        for (const engine of results.agents) {
          const errors = engine.details.filter(d => d.status === 'fail');
          for (const error of errors) {
            console.log(chalk.red(`  ❌ ${engine.agent}: ${error.name}`));
            if (error.message) {
              console.log(chalk.gray(`     ${error.message}`));
            }
          }
        }
      }

      // Warnings
      if (results.totalWarnings > 0) {
        console.log('\n' + chalk.bold.yellow('Warnings:'));

        for (const engine of results.agents) {
          const warnings = engine.details.filter(d => d.status === 'warn');
          for (const warning of warnings) {
            console.log(chalk.yellow(`  ⚠️  ${engine.agent}: ${warning.name}`));
            if (warning.message) {
              console.log(chalk.gray(`     ${warning.message}`));
            }
          }
        }
      }

      console.log('\n' + '═'.repeat(67) + '\n');

      // Exit with error if there are critical issues
      if (results.totalErrors > 0) {
        process.exit(1);
      }

    } catch (error) {
      console.error(chalk.red('Fatal error during QA check:'), error);
      process.exit(1);
    }
  });

// Integration tests
program
  .command('integration')
  .description('Run integration tests')
  .action(async () => {
    try {
      const { runIntegrationTests } = await import('./integration-tests/index.js');
      const results = await runIntegrationTests();

      // Exit with error if tests failed
      if (results.failed > 0) {
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('Integration tests failed:'), error);
      process.exit(1);
    }
  });

// Performance tests
program
  .command('performance')
  .description('Run performance tests')
  .action(async () => {
    try {
      const { runPerformanceTests } = await import('./performance-tests/index.js');
      const results = await runPerformanceTests();

      // Exit with error if tests failed
      if (results.failed > 0) {
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('Performance tests failed:'), error);
      process.exit(1);
    }
  });

// Generate report
program
  .command('report')
  .description('Generate comprehensive HTML report')
  .action(async () => {
    try {
      const { generateQAReport } = await import('./reports/index.js');
      const result = await generateQAReport();

      if (result.success) {
        console.log('\n' + chalk.green('✅ Report generation successful!'));
        console.log(chalk.cyan(`📄 View report at: ${result.path}`));
      }
    } catch (error) {
      console.error(chalk.red('Report generation failed:'), error);
      process.exit(1);
    }
  });

// Code quality checks
program
  .command('quality')
  .description('Run code quality and security checks')
  .action(async () => {
    try {
      const { runCodeQualityChecks } = await import('./code-quality/index.js');
      const results = await runCodeQualityChecks();

      // Exit with error if critical issues found
      if (results.criticalIssues > 0) {
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('Code quality checks failed:'), error);
      process.exit(1);
    }
  });

// Watch mode
program
  .command('watch')
  .description('Watch for changes and re-run checks')
  .option('--agent <number>', 'Watch specific engine only (1-7)')
  .action(async (options) => {
    try {
      const path = await import('path');
      const { FileWatcher } = await import('./shared/watcher.js');
      const { quickValidateAgent } = await import('./shared/quick-validator.js');

      logger.header('👀 WATCH MODE');

      const projectRoot = path.resolve(process.cwd(), '..');

      const engineDirs = {
        'Engine 1': path.join(projectRoot, 'prospecting-engine'),
        'Engine 2': path.join(projectRoot, 'analysis-engine'),
        'Engine 3': path.join(projectRoot, 'outreach-engine'),
        'Engine 4': path.join(projectRoot, 'command-center-ui'),
        'Engine 5': path.join(projectRoot, 'database-tools'),
        'Engine 6': path.join(projectRoot, 'pipeline-orchestrator'),
        'Engine 7': path.join(projectRoot, 'qa-supervisor')
      };

      // Filter to single engine if specified
      let watchDirs = engineDirs;
      if (options.agent) {
        const engineKey = `Engine ${options.agent}`;
        if (engineDirs[engineKey]) {
          watchDirs = { [engineKey]: engineDirs[engineKey] };
        } else {
          logger.error(`Unknown engine: ${options.agent}`);
          process.exit(1);
        }
      }

      const watcher = new FileWatcher(watchDirs, async (engineName, filename) => {
        // Extract engine number from name
        const engineNum = engineName.match(/Engine (\d)/)?.[1];
        if (engineNum) {
          const agentKey = `agent${engineNum}`;

          try {
            const result = await quickValidateAgent(agentKey);

            if (result.passed) {
              logger.success(`${engineName} - All checks passed ✓`);
            } else {
              logger.error(`${engineName} - ${result.issues.length} issue(s) found`);
              for (const issue of result.issues) {
                if (issue.type === 'security') {
                  logger.error(`  🔒 Security: ${issue.count} potential issue(s)`);
                }
              }
            }
          } catch (error) {
            logger.error(`${engineName} - Check failed: ${error.message}`);
          }
        }
      });

      watcher.start();

      // Handle Ctrl+C gracefully
      process.on('SIGINT', () => {
        watcher.stop();
        process.exit(0);
      });

      // Keep process alive
      await new Promise(() => {});

    } catch (error) {
      console.error(chalk.red('Watch mode failed:'), error);
      process.exit(1);
    }
  });

// Pre-commit hook
program
  .command('pre-commit')
  .description('Quick validation before commit')
  .action(async () => {
    try {
      logger.header('🔒 PRE-COMMIT CHECKS');

      const { quickValidateAll } = await import('./shared/quick-validator.js');

      logger.info('Running quick security scan on all engines...');
      console.log('');

      const result = await quickValidateAll();

      console.log('');

      if (result.passed) {
        logger.success('✅ All pre-commit checks passed!');
        logger.info('Safe to commit.');
        process.exit(0);
      } else {
        logger.error('❌ Pre-commit checks failed!');

        const failedEngines = result.results.filter(r => !r.passed);
        for (const engine of failedEngines) {
          logger.error(`  ${engine.agent}: ${engine.issues.length} issue(s)`);
        }

        console.log('');
        logger.warning('Fix issues before committing, or use --no-verify to skip.');
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('Pre-commit checks failed:'), error);
      process.exit(1);
    }
  });

// Parse arguments
program.parse(process.argv);

// If no command specified, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
