import chalk from 'chalk';

/**
 * Logger utility for colored console output
 * Provides consistent formatting across the CLI tool
 */

export const logger = {
  /**
   * Log informational message
   * @param {string} message - Message to log
   */
  info(message) {
    console.log(chalk.blue('ℹ'), message);
  },

  /**
   * Log success message
   * @param {string} message - Message to log
   */
  success(message) {
    console.log(chalk.green('✅'), message);
  },

  /**
   * Log error message
   * @param {string} message - Message to log
   */
  error(message) {
    console.log(chalk.red('❌'), message);
  },

  /**
   * Log warning message
   * @param {string} message - Message to log
   */
  warning(message) {
    console.log(chalk.yellow('⚠️'), message);
  },

  /**
   * Log heading with decorative line
   * @param {string} message - Heading text
   */
  heading(message) {
    console.log('\n' + chalk.bold.cyan(message));
  },

  /**
   * Log indented message (for nested output)
   * @param {string} message - Message to log
   */
  indent(message) {
    console.log('  ', message);
  },

  /**
   * Log debug message (only shown in verbose mode)
   * @param {string} message - Message to log
   * @param {boolean} verbose - Whether verbose mode is enabled
   */
  debug(message, verbose = false) {
    if (verbose) {
      console.log(chalk.gray('🔍'), chalk.gray(message));
    }
  },

  /**
   * Log empty line for spacing
   */
  newline() {
    console.log();
  },

  /**
   * Log a summary box
   * @param {string} title - Box title
   * @param {object} stats - Key-value pairs to display
   */
  summary(title, stats) {
    console.log('\n' + chalk.bold.green(title));
    for (const [key, value] of Object.entries(stats)) {
      console.log(`   ${chalk.cyan(key + ':')} ${value}`);
    }
  }
};
