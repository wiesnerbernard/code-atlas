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
import { watchCommand } from './commands/watch.js';
import { reportCommand } from './commands/report.js';
import { graphCommand } from './commands/graph.js';
import { exportCommand } from './commands/export.js';
import { initCommand } from './commands/init.js';
import { diffCommand } from './commands/diff.js';
import { DEFAULT_REGISTRY_PATH } from './core/registry.js';
import { logger } from './utils/logger.js';

const program = new Command();

program
  .name('code-atlas')
  .description('CLI tool to scan and index utility functions in codebases')
  .version('0.5.2');

// Init command
program
  .command('init')
  .description('Interactive setup wizard for code-atlas')
  .action(async () => {
    try {
      await initCommand();
    } catch (error) {
      logger.error('Init command failed');
      process.exit(1);
    }
  });

// Scan command
program
  .command('scan')
  .description('Scan codebase and build function registry')
  .argument('[paths...]', 'Directories to scan', ['./src'])
  .option('-i, --ignore <patterns...>', 'Glob patterns to ignore')
  .option('-o, --output <path>', 'Output registry file path', DEFAULT_REGISTRY_PATH)
  .option('--include-tests', 'Include test files in scan', false)
  .option('--include-git', 'Include Git metadata (author, dates, churn)', false)
  .option('--max-complexity <number>', 'Maximum cyclomatic complexity threshold', parseInt)
  .option('--no-cache', 'Disable caching for fresh parse')
  .action(async (paths: string[], options) => {
    try {
      await scanCommand(paths, {
        ignore: options.ignore,
        output: options.output,
        includeTests: options.includeTests,
        includeGit: options.includeGit,
        maxComplexity: options.maxComplexity,
        noCache: options.cache === false, // commander sets to false when --no-cache is used
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
  .option('-f, --format <format>', 'Output format (table, json)', 'table')
  .action(async (options) => {
    try {
      await statsCommand({ format: options.format as 'table' | 'json' });
    } catch (error) {
      logger.error('Stats command failed');
      process.exit(1);
    }
  });

// Diff command
program
  .command('diff')
  .description('Compare two registries to detect function changes')
  .requiredOption('-b, --base <path>', 'Path to base registry file')
  .requiredOption('-h, --head <path>', 'Path to head registry file')
  .option('-o, --output <path>', 'Output file path for diff report')
  .option('-f, --format <format>', 'Output format (json, markdown, table)', 'table')
  .action(async (options) => {
    try {
      await diffCommand({
        base: options.base,
        head: options.head,
        output: options.output,
        format: options.format as 'json' | 'markdown' | 'table',
      });
    } catch (error) {
      logger.error('Diff command failed');
      process.exit(1);
    }
  });

// Report command
program
  .command('report')
  .description('Generate interactive HTML report')
  .option('-o, --output <path>', 'Output HTML file path', './code-atlas-report.html')
  .action(async (options) => {
    try {
      await reportCommand({ output: options.output });
    } catch (error) {
      logger.error('Report command failed');
      process.exit(1);
    }
  });

// Watch command
program
  .command('watch')
  .description('Watch for file changes and update registry automatically')
  .argument('[paths...]', 'Directories to watch', ['./src'])
  .option('-i, --ignore <patterns...>', 'Glob patterns to ignore')
  .option('-o, --output <path>', 'Output registry file path', DEFAULT_REGISTRY_PATH)
  .option('--include-tests', 'Include test files in scan', false)
  .option('--max-complexity <number>', 'Maximum cyclomatic complexity threshold', parseInt)
  .action(async (paths: string[], options) => {
    try {
      await watchCommand(paths, {
        ignore: options.ignore,
        output: options.output,
        includeTests: options.includeTests,
        maxComplexity: options.maxComplexity,
      });
    } catch (error) {
      logger.error('Watch command failed');
      process.exit(1);
    }
  });

// Graph command
program
  .command('graph')
  .description('Generate dependency graph visualization')
  .option('-f, --format <format>', 'Output format (mermaid, dot, json)', 'mermaid')
  .option('-o, --output <path>', 'Output file path')
  .option('--max-nodes <number>', 'Maximum nodes to include in graph', parseInt, 50)
  .option('--show-orphans', 'Show orphaned functions details', false)
  .option('--show-circular', 'Show circular dependencies details', false)
  .action(async (options) => {
    try {
      await graphCommand({
        format: options.format as 'mermaid' | 'dot' | 'json',
        output: options.output,
        maxNodes: options.maxNodes,
        showOrphans: options.showOrphans,
        showCircular: options.showCircular,
      });
    } catch (error) {
      logger.error('Graph command failed');
      process.exit(1);
    }
  });

// Export command
program
  .command('export')
  .description('Export registry in various formats')
  .option('-f, --format <format>', 'Export format (json, csv, markdown)', 'json')
  .option('-o, --output <path>', 'Output file path')
  .option('--include-duplicates', 'Include duplicate detection in export', false)
  .action(async (options) => {
    try {
      await exportCommand({
        format: options.format as 'json' | 'csv' | 'markdown',
        output: options.output,
        includeDuplicates: options.includeDuplicates,
      });
    } catch (error) {
      logger.error('Export command failed');
      process.exit(1);
    }
  });

// Parse arguments
program.parse();
