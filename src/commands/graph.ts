/**
 * Graph command - visualizes function dependencies
 */

import { writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';
import chalk from 'chalk';
import { Project } from 'ts-morph';
import { loadRegistry } from '../core/registry.js';
import {
  buildDependencyGraph,
  generateMermaidDiagram,
  generateDOTGraph,
} from '../core/dependencies.js';
import { logger } from '../utils/logger.js';

export interface GraphOptions {
  /** Output file path */
  output?: string;
  /** Graph format (mermaid, dot, json) */
  format?: 'mermaid' | 'dot' | 'json';
  /** Maximum nodes to include */
  maxNodes?: number;
  /** Show orphaned functions */
  showOrphans?: boolean;
  /** Show circular dependencies */
  showCircular?: boolean;
}

/**
 * Executes the graph command
 *
 * Analyzes function dependencies and generates visualizations.
 *
 * @param options - Graph options
 *
 * @example
 * ```typescript
 * await graphCommand({ format: 'mermaid', output: './DEPENDENCIES.md' });
 * await graphCommand({ format: 'dot', output: './deps.dot' });
 * await graphCommand({ format: 'json', showOrphans: true });
 * ```
 */
export async function graphCommand(options: GraphOptions): Promise<void> {
  try {
    const registry = await loadRegistry();

    if (registry.functions.length === 0) {
      logger.warn('Registry is empty. Run "code-atlas scan" first.');
      return;
    }

    logger.info('Building dependency graph...');

    // Load source files for call analysis
    const project = new Project({
      skipAddingFilesFromTsConfig: true,
      compilerOptions: {
        target: 99,
        module: 199,
        allowJs: true,
      },
    });

    const sourceFiles = new Map();
    const uniquePaths = new Set(registry.functions.map((f) => f.filePath));

    for (const filePath of uniquePaths) {
      try {
        const sourceFile = project.addSourceFileAtPath(filePath);
        sourceFiles.set(filePath, sourceFile);
      } catch {
        logger.warn(`Failed to load ${filePath}`);
      }
    }

    // Build dependency graph
    const graph = buildDependencyGraph(registry.functions, sourceFiles);

    // Generate output
    const format = options.format || 'mermaid';
    const maxNodes = options.maxNodes || 50;

    let content: string;
    let defaultOutput: string;

    switch (format) {
      case 'mermaid':
        content = generateMermaidDiagram(graph, maxNodes);
        defaultOutput = './DEPENDENCIES.md';
        break;
      case 'dot':
        content = generateDOTGraph(graph, maxNodes);
        defaultOutput = './dependencies.dot';
        break;
      case 'json':
        content = JSON.stringify(
          {
            orphans: graph.orphans.map((n) => ({
              name: n.function.name,
              file: n.function.filePath,
              line: n.function.line,
            })),
            circularDependencies: graph.circularDependencies,
            entryPoints: graph.entryPoints.map((n) => ({
              name: n.function.name,
              file: n.function.filePath,
            })),
            stats: {
              totalFunctions: graph.nodes.size,
              orphanedFunctions: graph.orphans.length,
              circularDependencies: graph.circularDependencies.length,
              entryPoints: graph.entryPoints.length,
            },
          },
          null,
          2
        );
        defaultOutput = './dependency-graph.json';
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    const outputPath = options.output || defaultOutput;

    // Ensure output directory exists
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, content, 'utf-8');

    // Print stats
    logger.success(`Dependency graph generated: ${chalk.blue(outputPath)}`);
    logger.info(`Format: ${format.toUpperCase()}`);
    logger.info(`Functions: ${graph.nodes.size}`);

    if (options.showOrphans || graph.orphans.length > 0) {
      logger.warn(`Orphaned functions: ${chalk.red(graph.orphans.length.toString())}`);

      if (options.showOrphans && graph.orphans.length > 0) {
        console.log(chalk.yellow('\nOrphaned functions (never called):'));
        for (const orphan of graph.orphans.slice(0, 10)) {
          console.log(
            chalk.dim(
              `  - ${orphan.function.name} (${orphan.function.filePath}:${orphan.function.line})`
            )
          );
        }
        if (graph.orphans.length > 10) {
          console.log(chalk.dim(`  ... and ${graph.orphans.length - 10} more`));
        }
      }
    }

    if (options.showCircular || graph.circularDependencies.length > 0) {
      logger.warn(
        `Circular dependencies: ${chalk.red(graph.circularDependencies.length.toString())}`
      );

      if (options.showCircular && graph.circularDependencies.length > 0) {
        console.log(chalk.yellow('\nCircular dependencies detected:'));
        for (const cycle of graph.circularDependencies.slice(0, 5)) {
          console.log(chalk.dim(`  ${cycle.join(' → ')}`));
        }
        if (graph.circularDependencies.length > 5) {
          console.log(chalk.dim(`  ... and ${graph.circularDependencies.length - 5} more`));
        }
      }
    }

    logger.info(`Entry points: ${graph.entryPoints.length}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Graph generation failed: ${message}`);
    throw error;
  }
}
