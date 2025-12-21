/**
 * Diff command - compares two registries to detect function changes
 */

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import chalk from 'chalk';
import Table from 'cli-table3';
import { compareRegistries, hasChanges, getDiffSummary } from '../core/comparison.js';
import type { Registry, RegistryDiff } from '../types/index.js';
import { logger } from '../utils/logger.js';

interface DiffOptions {
  /** Path to base registry file */
  base: string;

  /** Path to head registry file */
  head: string;

  /** Output file path for diff report */
  output?: string;

  /** Output format */
  format?: 'json' | 'markdown' | 'table';
}

/**
 * Load a registry from a file path
 */
async function loadRegistryFromFile(filePath: string): Promise<Registry> {
  try {
    const absolutePath = resolve(filePath);
    const content = await readFile(absolutePath, 'utf-8');
    return JSON.parse(content) as Registry;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load registry from ${filePath}: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Format diff as JSON
 */
function formatAsJson(diff: RegistryDiff): string {
  const summary = getDiffSummary(diff);
  return JSON.stringify(
    {
      summary,
      added: diff.added.map((fn) => ({
        name: fn.name,
        filePath: fn.filePath,
        line: fn.line,
        complexity: fn.complexity,
        isExported: fn.isExported,
      })),
      modified: diff.modified.map((m) => ({
        name: m.after.name,
        filePath: m.after.filePath,
        line: m.after.line,
        complexityBefore: m.before.complexity,
        complexityAfter: m.after.complexity,
        complexityDelta: m.complexityDelta,
        signatureChanged: m.signatureChanged,
        isExported: m.after.isExported,
      })),
      deleted: diff.deleted.map((fn) => ({
        name: fn.name,
        filePath: fn.filePath,
        line: fn.line,
        complexity: fn.complexity,
      })),
    },
    null,
    2
  );
}

/**
 * Format diff as Markdown
 */
function formatAsMarkdown(diff: RegistryDiff): string {
  const summary = getDiffSummary(diff);
  let output = '# Function Changes\n\n';

  output += '## Summary\n\n';
  output += `- **Added:** ${summary.added} functions\n`;
  output += `- **Modified:** ${summary.modified} functions\n`;
  output += `- **Deleted:** ${summary.deleted} functions\n`;
  output += `- **Unchanged:** ${summary.unchanged} functions\n\n`;

  if (summary.complexityIncreases > 0) {
    output += `**Warning:** ${summary.complexityIncreases} functions increased in complexity\n\n`;
  }

  if (summary.signatureChanges > 0) {
    output += `**Warning:** ${summary.signatureChanges} functions changed signatures\n\n`;
  }

  if (diff.added.length > 0) {
    output += '## Added Functions\n\n';
    output += '| Function | File | Line | Complexity |\n';
    output += '|----------|------|------|------------|\n';
    for (const fn of diff.added) {
      output += `| \`${fn.name}\` | ${fn.filePath} | ${fn.line} | ${fn.complexity} |\n`;
    }
    output += '\n';
  }

  if (diff.modified.length > 0) {
    output += '## Modified Functions\n\n';
    output += '| Function | File | Line | Complexity | Change |\n';
    output += '|----------|------|------|------------|--------|\n';
    for (const m of diff.modified) {
      const delta =
        m.complexityDelta > 0
          ? `+${m.complexityDelta}`
          : m.complexityDelta < 0
            ? `${m.complexityDelta}`
            : '0';
      const warning = m.complexityDelta > 5 ? ' ⚠️' : '';
      output += `| \`${m.after.name}\` | ${m.after.filePath} | ${m.after.line} | ${m.before.complexity} → ${m.after.complexity} | ${delta}${warning} |\n`;
    }
    output += '\n';
  }

  if (diff.deleted.length > 0) {
    output += '## Deleted Functions\n\n';
    output += '| Function | File | Line | Complexity |\n';
    output += '|----------|------|------|------------|\n';
    for (const fn of diff.deleted) {
      output += `| \`${fn.name}\` | ${fn.filePath} | ${fn.line} | ${fn.complexity} |\n`;
    }
    output += '\n';
  }

  return output;
}

/**
 * Format diff as table for console output
 */
function formatAsTable(diff: RegistryDiff): string {
  const summary = getDiffSummary(diff);
  let output = '';

  // Summary table
  const summaryTable = new Table({
    head: [chalk.cyan('Metric'), chalk.cyan('Count')],
  });

  summaryTable.push(
    ['Added', chalk.green(summary.added.toString())],
    ['Modified', chalk.yellow(summary.modified.toString())],
    ['Deleted', chalk.red(summary.deleted.toString())],
    ['Unchanged', chalk.gray(summary.unchanged.toString())],
    ['Total', summary.total.toString()]
  );

  if (summary.complexityIncreases > 0) {
    summaryTable.push([
      'Complexity Increases',
      chalk.yellow(summary.complexityIncreases.toString()),
    ]);
  }

  if (summary.signatureChanges > 0) {
    summaryTable.push(['Signature Changes', chalk.yellow(summary.signatureChanges.toString())]);
  }

  output += summaryTable.toString() + '\n\n';

  // Added functions
  if (diff.added.length > 0) {
    output += chalk.bold.green('Added Functions:\n');
    const addedTable = new Table({
      head: ['Function', 'File', 'Line', 'Complexity'].map((h) => chalk.cyan(h)),
    });

    for (const fn of diff.added.slice(0, 10)) {
      addedTable.push([fn.name, fn.filePath, fn.line.toString(), fn.complexity.toString()]);
    }

    output += addedTable.toString() + '\n';
    if (diff.added.length > 10) {
      output += chalk.gray(`... and ${diff.added.length - 10} more\n`);
    }
    output += '\n';
  }

  // Modified functions
  if (diff.modified.length > 0) {
    output += chalk.bold.yellow('Modified Functions:\n');
    const modifiedTable = new Table({
      head: ['Function', 'File', 'Complexity', 'Change'].map((h) => chalk.cyan(h)),
    });

    for (const m of diff.modified.slice(0, 10)) {
      const delta =
        m.complexityDelta > 0
          ? chalk.red(`+${m.complexityDelta}`)
          : m.complexityDelta < 0
            ? chalk.green(`${m.complexityDelta}`)
            : '0';
      const warning = m.complexityDelta > 5 ? ' ⚠️' : '';
      modifiedTable.push([
        m.after.name,
        m.after.filePath,
        `${m.before.complexity} → ${m.after.complexity}`,
        delta + warning,
      ]);
    }

    output += modifiedTable.toString() + '\n';
    if (diff.modified.length > 10) {
      output += chalk.gray(`... and ${diff.modified.length - 10} more\n`);
    }
    output += '\n';
  }

  // Deleted functions
  if (diff.deleted.length > 0) {
    output += chalk.bold.red('Deleted Functions:\n');
    const deletedTable = new Table({
      head: ['Function', 'File', 'Line', 'Complexity'].map((h) => chalk.cyan(h)),
    });

    for (const fn of diff.deleted.slice(0, 10)) {
      deletedTable.push([fn.name, fn.filePath, fn.line.toString(), fn.complexity.toString()]);
    }

    output += deletedTable.toString() + '\n';
    if (diff.deleted.length > 10) {
      output += chalk.gray(`... and ${diff.deleted.length - 10} more\n`);
    }
    output += '\n';
  }

  return output;
}

/**
 * Executes the diff command
 *
 * Compares two registries and reports changes.
 *
 * @example
 * ```typescript
 * await diffCommand({
 *   base: '.code-atlas/base-registry.json',
 *   head: '.code-atlas/head-registry.json'
 * });
 * ```
 */
export async function diffCommand(options: DiffOptions): Promise<void> {
  try {
    logger.info(`Loading base registry from ${options.base}`);
    const baseRegistry = await loadRegistryFromFile(options.base);

    logger.info(`Loading head registry from ${options.head}`);
    const headRegistry = await loadRegistryFromFile(options.head);

    logger.info('Comparing registries...');
    const diff = compareRegistries(baseRegistry, headRegistry);

    if (!hasChanges(diff)) {
      logger.info(chalk.green('No function changes detected'));
      return;
    }

    const format = options.format || 'table';
    let output: string;

    switch (format) {
      case 'json':
        output = formatAsJson(diff);
        break;
      case 'markdown':
        output = formatAsMarkdown(diff);
        break;
      case 'table':
      default:
        output = formatAsTable(diff);
        break;
    }

    if (options.output) {
      await writeFile(options.output, output, 'utf-8');
      logger.success(`Diff report saved to ${options.output}`);
    } else {
      console.log(output);
    }
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Diff failed: ${error.message}`);
    }
    process.exit(1);
  }
}
