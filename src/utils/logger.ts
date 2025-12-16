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
};
