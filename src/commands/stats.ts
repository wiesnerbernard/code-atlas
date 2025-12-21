/**
 * Stats command - displays registry statistics
 */

import Table from 'cli-table3';
import chalk from 'chalk';
import { loadRegistry } from '../core/registry.js';
import { logger } from '../utils/logger.js';

interface StatsOptions {
  format?: 'table' | 'json';
}

/**
 * Executes the stats command
 *
 * Displays statistics about the current registry.
 *
 * @example
 * ```typescript
 * await statsCommand();
 * await statsCommand({ format: 'json' });
 * ```
 */
export async function statsCommand(options: StatsOptions = {}): Promise<void> {
  try {
    const registry = await loadRegistry();
    const format = options.format || 'table';

    // Calculate complexity distribution
    const complexityBuckets = {
      simple: 0, // 1-5
      moderate: 0, // 6-10
      complex: 0, // 11-20
      veryComplex: 0, // 21+
    };

    for (const func of registry.functions) {
      if (func.complexity <= 5) complexityBuckets.simple++;
      else if (func.complexity <= 10) complexityBuckets.moderate++;
      else if (func.complexity <= 20) complexityBuckets.complex++;
      else complexityBuckets.veryComplex++;
    }

    // Get top complex functions
    const topComplex = [...registry.functions]
      .sort((a, b) => b.complexity - a.complexity)
      .slice(0, 10);

    // Calculate average complexity
    const avgComplexity =
      registry.functions.length > 0
        ? registry.functions.reduce((sum, f) => sum + f.complexity, 0) / registry.functions.length
        : 0;

    if (format === 'json') {
      // JSON output for CI/CD
      const output = {
        version: registry.version,
        generatedAt: registry.generatedAt,
        scannedPaths: registry.scannedPaths,
        totalFiles: registry.totalFiles,
        totalFunctions: registry.totalFunctions,
        averageComplexity: parseFloat(avgComplexity.toFixed(2)),
        duplicateGroups: registry.duplicates.length,
        complexityDistribution: complexityBuckets,
        topComplexFunctions: topComplex.map((f) => ({
          name: f.name,
          file: f.filePath,
          line: f.line,
          complexity: f.complexity,
        })),
      };
      console.log(JSON.stringify(output, null, 2));
      return;
    }

    // Table output (default)
    console.log(chalk.bold('\n📊 Code-Atlas Statistics\n'));

    // Overview stats
    console.log(chalk.blue('Registry Version:'), registry.version);
    console.log(chalk.blue('Generated:'), new Date(registry.generatedAt).toLocaleString());
    console.log(chalk.blue('Scanned Paths:'), registry.scannedPaths.join(', '));
    console.log(chalk.blue('Total Files:'), registry.totalFiles);
    console.log(chalk.blue('Total Functions:'), registry.totalFunctions);
    console.log(chalk.blue('Average Complexity:'), avgComplexity.toFixed(2));

    // Duplicates
    if (registry.duplicates.length > 0) {
      console.log(chalk.yellow(`\n⚠️  Duplicate Groups: ${registry.duplicates.length}\n`));

      const table = new Table({
        head: ['Functions', 'Locations', 'Similarity'],
        colWidths: [30, 50, 12],
      });

      for (const group of registry.duplicates) {
        const names = group.functions.map((f) => f.name).join(', ');
        const locations = group.functions.map((f) => `${f.filePath}:${f.line}`).join('\n');

        table.push([names, locations, `${(group.similarity * 100).toFixed(0)}%`]);
      }

      console.log(table.toString());
    }

    console.log(chalk.bold('\n📈 Complexity Distribution\n'));
    console.log(chalk.green('Simple (1-5):'), complexityBuckets.simple);
    console.log(chalk.blue('Moderate (6-10):'), complexityBuckets.moderate);
    console.log(chalk.yellow('Complex (11-20):'), complexityBuckets.complex);
    console.log(chalk.red('Very Complex (21+):'), complexityBuckets.veryComplex);

    // Top 10 most complex functions
    if (topComplex.length > 0) {
      console.log(chalk.bold('\n🔥 Most Complex Functions\n'));

      const complexTable = new Table({
        head: ['Name', 'File', 'Complexity'],
        colWidths: [30, 45, 12],
      });

      for (const func of topComplex) {
        complexTable.push([func.name, `${func.filePath}:${func.line}`, func.complexity.toString()]);
      }

      console.log(complexTable.toString());
    }

    console.log(); // Empty line at end
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Stats command failed: ${message}`);
    throw error;
  }
}
