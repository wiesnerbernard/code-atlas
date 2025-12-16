#!/usr/bin/env node

/**
 * Code-Atlas CLI entry point
 * 
 * Defines CLI commands and options using Commander.
 */

import { Command } from 'commander';
import { scanCommand } from './commands/scan.js';
import { searchCommand } from './commands/search.js';
import { statsCommand } from './commands/stats.js';
import { DEFAULT_REGISTRY_PATH } from './core/registry.js';
import { logger } from './utils/logger.js';

const program = new Command();

program
  .name('code-atlas')
  .description('CLI tool to scan and index utility functions in codebases')
  .version('0.1.0');

// Scan command
program
  .command('scan')
  .description('Scan codebase and build function registry')
  .argument('[paths...]', 'Directories to scan', ['./src'])
  .option('-i, --ignore <patterns...>', 'Glob patterns to ignore')
  .option('-o, --output <path>', 'Output registry file path', DEFAULT_REGISTRY_PATH)
  .option('--include-tests', 'Include test files in scan', false)
  .option('--max-complexity <number>', 'Maximum cyclomatic complexity threshold', parseInt)
  .action(async (paths: string[], options) => {
    try {
      await scanCommand(paths, {
        ignore: options.ignore,
        output: options.output,
        includeTests: options.includeTests,
        maxComplexity: options.maxComplexity,
      });
    } catch (error) {
      logger.error('Scan command failed');
      process.exit(1);
    }
  });

// Search command
program
  .command('search')
  .description('Search for functions in the registry')
  .argument('<query>', 'Search query')
  .option('-f, --format <format>', 'Output format (table, json, markdown)', 'table')
  .option('-i, --interactive', 'Interactive mode with fuzzy search', false)
  .option('-l, --limit <number>', 'Maximum number of results', parseInt, 20)
  .action(async (query: string, options) => {
    try {
      await searchCommand(query, {
        format: options.format as 'table' | 'json' | 'markdown',
        interactive: options.interactive,
        limit: options.limit,
      });
    } catch (error) {
      logger.error('Search command failed');
      process.exit(1);
    }
  });

// Stats command
program
  .command('stats')
  .description('Display registry statistics')
  .action(async () => {
    try {
      await statsCommand();
    } catch (error) {
      logger.error('Stats command failed');
      process.exit(1);
    }
  });

// Parse arguments
program.parse();
