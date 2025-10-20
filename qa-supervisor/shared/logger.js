/**
 * Logger - Formatted console output for QA Supervisor
 */

import chalk from 'chalk';

export const logger = {
  header(text) {
    console.log('\n' + '═'.repeat(67));
    console.log(chalk.bold.cyan(text));
    console.log('═'.repeat(67) + '\n');
  },

  section(text) {
    console.log(chalk.bold.white(`\n📦 ${text}`));
    console.log('─'.repeat(67));
  },

  success(text) {
    console.log(chalk.green(`   ✅ ${text}`));
  },

  error(text) {
    console.log(chalk.red(`   ❌ ${text}`));
  },

  warning(text) {
    console.log(chalk.yellow(`   ⚠️  ${text}`));
  },

  info(text) {
    console.log(chalk.blue(`   ℹ️  ${text}`));
  },

  result(label, value, status = 'neutral') {
    const statusIcon = {
      pass: chalk.green('✓'),
      fail: chalk.red('✗'),
      warn: chalk.yellow('⚠'),
      neutral: ' '
    }[status];

    console.log(`   ${statusIcon} ${chalk.bold(label)}: ${value}`);
  },

  summary(stats) {
    console.log('\n' + '═'.repeat(67));
    console.log(chalk.bold.white('📊 SUMMARY'));
    console.log('═'.repeat(67) + '\n');

    console.log(`Total Checks: ${stats.total}`);
    console.log(chalk.green(`✅ Passed: ${stats.passed}`));
    if (stats.warnings > 0) {
      console.log(chalk.yellow(`⚠️  Warnings: ${stats.warnings}`));
    }
    if (stats.errors > 0) {
      console.log(chalk.red(`❌ Errors: ${stats.errors}`));
    }
  },

  separator() {
    console.log('');
  }
};

export default logger;
