/**
 * Logger utility for consistent console output with colors
 */

import chalk from 'chalk';

export const logger = {
  /**
   * Log an informational message in blue
   */
  info(message: string): void {
    console.log(chalk.blue('ℹ'), message);
  },

  /**
   * Log a success message in green
   */
  success(message: string): void {
    console.log(chalk.green('✓'), message);
  },

  /**
   * Log a warning message in yellow
   */
  warn(message: string): void {
    console.warn(chalk.yellow('⚠'), message);
  },

  /**
   * Log an error message in red
   */
  error(message: string): void {
    console.error(chalk.red('✗'), message);
  },

  /**
   * Log a debug message in gray (only if DEBUG env var is set)
   */
  debug(message: string): void {
    if (process.env.DEBUG) {
      console.log(chalk.gray('→'), message);
    }
  },

  /**
   * Log a verbose message with additional details
   */
  verbose(message: string, details?: Record<string, unknown>): void {
    if (process.env.VERBOSE) {
      console.log(chalk.cyan('▸'), message);
      if (details) {
        console.log(chalk.gray(JSON.stringify(details, null, 2)));
      }
    }
  },
};
