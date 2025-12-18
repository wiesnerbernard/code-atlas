/**
 * Watch command - monitors files and updates registry in real-time
 */

import chokidar from 'chokidar';
import chalk from 'chalk';
import type { ScanOptions } from '../types/index.js';
import { scanCommand } from './scan.js';
import { loadConfig, mergeConfig, getPathsFromConfig } from '../utils/config.js';
import { logger } from '../utils/logger.js';

/**
 * Executes the watch command
 *
 * Monitors file changes and automatically updates the registry.
 *
 * @param cliPaths - Root directories to watch
 * @param options - Watch options
 *
 * @example
 * ```typescript
 * await watchCommand(['./src'], {
 *   ignore: ['**\/legacy/**']
 * });
 * ```
 */
export async function watchCommand(cliPaths: string[], options: ScanOptions): Promise<void> {
  try {
    // Load config file
    const config = await loadConfig();
    const mergedOptions = mergeConfig(config, options);
    const paths = getPathsFromConfig(config, cliPaths);

    logger.info(chalk.bold('👀 Watch mode enabled'));
    logger.info(`Watching: ${paths.join(', ')}`);
    logger.info(chalk.dim('Press Ctrl+C to stop\n'));

    // Initial scan
    logger.info('Performing initial scan...');
    await scanCommand(cliPaths, options);
    logger.success('Initial scan complete\n');

    // Set up file watcher
    const watcher = chokidar.watch(paths, {
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/build/**',
        '**/.code-atlas/**',
        ...(mergedOptions.ignore || []),
      ],
      persistent: true,
      ignoreInitial: true,
    });

    let rescanTimer: NodeJS.Timeout | null = null;
    const DEBOUNCE_DELAY = 1000; // Wait 1 second after last change

    const scheduleRescan = (): void => {
      if (rescanTimer) {
        clearTimeout(rescanTimer);
      }

      rescanTimer = setTimeout(() => {
        logger.info(chalk.yellow('♻️  Changes detected, rescanning...'));
        scanCommand(cliPaths, options)
          .then(() => {
            logger.success('Rescan complete\n');
          })
          .catch((error) => {
            logger.error(`Rescan failed: ${error}`);
          });
      }, DEBOUNCE_DELAY);
    };

    // Watch for file changes
    watcher
      .on('add', (path) => {
        logger.debug(`File added: ${path}`);
        scheduleRescan();
      })
      .on('change', (path) => {
        logger.debug(`File changed: ${path}`);
        scheduleRescan();
      })
      .on('unlink', (path) => {
        logger.debug(`File removed: ${path}`);
        scheduleRescan();
      })
      .on('error', (error) => {
        logger.error(`Watcher error: ${error}`);
      });

    // Handle graceful shutdown
    const handleShutdown = async (): Promise<void> => {
      logger.info(chalk.yellow('\n\n👋 Stopping watch mode...'));
      await watcher.close();
      logger.success('Watch mode stopped');
      process.exit(0);
    };

    process.on('SIGINT', () => {
      void handleShutdown();
    });

    // Keep process alive
    await new Promise(() => {}); // Runs forever until SIGINT
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Watch command failed: ${message}`);
    throw error;
  }
}
