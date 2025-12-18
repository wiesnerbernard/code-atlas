/**
 * Export command - exports registry in various formats
 */

import { writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';
import chalk from 'chalk';
import { loadRegistry } from '../core/registry.js';
import { logger } from '../utils/logger.js';
import type { Registry, FunctionMetadata } from '../types/index.js';

export interface ExportOptions {
  /** Output file path */
  output?: string;
  /** Export format */
  format: 'json' | 'csv' | 'markdown';
  /** Include duplicates in export */
  includeDuplicates?: boolean;
}

/**
 * Executes the export command
 *
 * Exports the registry in JSON, CSV, or Markdown format.
 *
 * @param options - Export options
 *
 * @example
 * ```typescript
 * await exportCommand({ format: 'json', output: './functions.json' });
 * await exportCommand({ format: 'csv', output: './functions.csv' });
 * await exportCommand({ format: 'markdown', output: './FUNCTIONS.md' });
 * ```
 */
export async function exportCommand(options: ExportOptions): Promise<void> {
  try {
    const registry = await loadRegistry();

    if (registry.functions.length === 0) {
      logger.warn('Registry is empty. Run "code-atlas scan" first.');
      return;
    }

    const outputPath = options.output || getDefaultOutputPath(options.format);
    let content: string;

    switch (options.format) {
      case 'json':
        content = exportToJSON(registry, options.includeDuplicates);
        break;
      case 'csv':
        content = exportToCSV(registry.functions);
        break;
      case 'markdown':
        content = exportToMarkdown(registry, options.includeDuplicates);
        break;
      default:
        throw new Error(`Unsupported format: ${options.format}`);
    }

    // Ensure output directory exists
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, content, 'utf-8');

    logger.success(`Exported to ${chalk.blue(outputPath)}`);
    logger.info(`Format: ${options.format.toUpperCase()}`);
    logger.info(`Functions: ${registry.functions.length}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Export failed: ${message}`);
    throw error;
  }
}

/**
 * Gets default output path for format
 */
function getDefaultOutputPath(format: string): string {
  switch (format) {
    case 'json':
      return './code-atlas-export.json';
    case 'csv':
      return './code-atlas-export.csv';
    case 'markdown':
      return './FUNCTIONS.md';
    default:
      return './code-atlas-export.txt';
  }
}

/**
 * Exports registry to JSON format
 */
function exportToJSON(registry: Registry, includeDuplicates = false): string {
  const data = includeDuplicates ? registry : { ...registry, duplicates: undefined };

  return JSON.stringify(data, null, 2);
}

/**
 * Exports functions to CSV format
 */
function exportToCSV(functions: FunctionMetadata[]): string {
  const headers = [
    'Name',
    'File Path',
    'Line',
    'Parameters',
    'Return Type',
    'Exported',
    'Complexity',
    'Has JSDoc',
  ];

  const rows = functions.map((func) => [
    escapeCSV(func.name),
    escapeCSV(func.filePath),
    func.line.toString(),
    escapeCSV(func.params.map((p) => `${p.name}: ${p.type}`).join(', ')),
    escapeCSV(func.returnType),
    func.isExported ? 'Yes' : 'No',
    func.complexity.toString(),
    func.jsdoc ? 'Yes' : 'No',
  ]);

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
}

/**
 * Escapes CSV field value
 */
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Exports registry to GitHub-flavored Markdown format
 */
function exportToMarkdown(registry: Registry, includeDuplicates = false): string {
  const lines: string[] = [];

  // Header
  lines.push('# Function Registry\n');
  lines.push(`Generated: ${new Date(registry.generatedAt).toLocaleString()}\n`);

  // Summary
  lines.push('## Summary\n');
  lines.push(`- **Total Functions**: ${registry.totalFunctions}`);
  lines.push(`- **Total Files**: ${registry.totalFiles}`);
  lines.push(`- **Scanned Paths**: ${registry.scannedPaths.join(', ')}`);

  if (includeDuplicates && registry.duplicates.length > 0) {
    lines.push(`- **Duplicate Groups**: ${registry.duplicates.length}`);
  }

  lines.push('');

  // Complexity distribution
  const simple = registry.functions.filter((f) => f.complexity <= 5).length;
  const moderate = registry.functions.filter((f) => f.complexity > 5 && f.complexity <= 10).length;
  const complex = registry.functions.filter((f) => f.complexity > 10).length;

  lines.push('### Complexity Distribution\n');
  lines.push(
    `- 🟢 Simple (≤5): ${simple} (${((simple / registry.totalFunctions) * 100).toFixed(1)}%)`
  );
  lines.push(
    `- 🟡 Moderate (6-10): ${moderate} (${((moderate / registry.totalFunctions) * 100).toFixed(1)}%)`
  );
  lines.push(
    `- 🔴 Complex (>10): ${complex} (${((complex / registry.totalFunctions) * 100).toFixed(1)}%)`
  );
  lines.push('');

  // Functions table
  lines.push('## Functions\n');
  lines.push('| Name | File | Line | Params | Return Type | Complexity | Exported |');
  lines.push('|------|------|------|--------|-------------|------------|----------|');

  for (const func of registry.functions) {
    const params =
      func.params.length > 0 ? func.params.map((p) => `${p.name}: ${p.type}`).join(', ') : '_none_';

    const complexity =
      func.complexity <= 5
        ? `🟢 ${func.complexity}`
        : func.complexity <= 10
          ? `🟡 ${func.complexity}`
          : `🔴 ${func.complexity}`;

    lines.push(
      `| \`${func.name}\` | ${func.filePath}:${func.line} | ${func.line} | ${params} | \`${func.returnType}\` | ${complexity} | ${func.isExported ? '✓' : ''} |`
    );
  }

  lines.push('');

  // Duplicates section
  if (includeDuplicates && registry.duplicates.length > 0) {
    lines.push('## Potential Duplicates\n');

    for (let i = 0; i < registry.duplicates.length; i++) {
      const group = registry.duplicates[i];
      if (!group) continue;

      lines.push(`### Group ${i + 1} (${(group.similarity * 100).toFixed(0)}% similar)\n`);

      for (const func of group.functions) {
        lines.push(`- \`${func.name}\` in ${func.filePath}:${func.line}`);
      }

      lines.push('');
    }
  }

  // Functions by complexity
  lines.push('## High Complexity Functions\n');
  const highComplexity = registry.functions
    .filter((f) => f.complexity > 10)
    .sort((a, b) => b.complexity - a.complexity)
    .slice(0, 10);

  if (highComplexity.length > 0) {
    lines.push('Top 10 most complex functions:\n');
    for (const func of highComplexity) {
      lines.push(
        `- **\`${func.name}\`** (complexity: ${func.complexity}) - ${func.filePath}:${func.line}`
      );
      if (func.jsdoc) {
        const firstLine = func.jsdoc.split('\n')[0];
        lines.push(`  > ${firstLine}`);
      }
    }
  } else {
    lines.push('_No functions with complexity > 10_');
  }

  lines.push('');

  // Exported functions
  const exported = registry.functions.filter((f) => f.isExported);
  lines.push('## Exported Functions\n');
  lines.push(
    `${exported.length} of ${registry.totalFunctions} functions are exported (${((exported.length / registry.totalFunctions) * 100).toFixed(1)}%)\n`
  );

  return lines.join('\n');
}
