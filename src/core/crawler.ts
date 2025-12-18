/**
 * File system crawler using fast-glob
 *
 * Responsible for discovering source files in the codebase
 * that should be analyzed.
 */

import fg from 'fast-glob';
import type { CrawlResult, SkippedFile } from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * Default glob patterns for source files
 */
const DEFAULT_PATTERNS = ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'];

/**
 * Default ignore patterns
 */
const DEFAULT_IGNORE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.git/**',
  '**/coverage/**',
  '**/*.test.ts',
  '**/*.test.tsx',
  '**/*.test.js',
  '**/*.test.jsx',
  '**/*.spec.ts',
  '**/*.spec.tsx',
  '**/*.spec.js',
  '**/*.spec.jsx',
  '**/*.d.ts',
];

/**
 * Crawls the file system to find source files for analysis
 *
 * @param rootPaths - Root directories to scan
 * @param options - Crawl options
 * @returns CrawlResult with found files and metadata
 *
 * @example
 * ```typescript
 * const result = await crawl(['./src'], { ignore: ['**\/legacy/**'] });
 * console.log(`Found ${result.files.length} files`);
 * ```
 */
export async function crawl(
  rootPaths: string[],
  options?: {
    ignore?: string[];
    includeTests?: boolean;
  }
): Promise<CrawlResult> {
  const startTime = Date.now();
  const skipped: SkippedFile[] = [];

  logger.debug(`Starting crawl of paths: ${rootPaths.join(', ')}`);

  // Build ignore patterns
  const ignorePatterns = options?.includeTests
    ? DEFAULT_IGNORE.filter((pattern) => !pattern.includes('.test.') && !pattern.includes('.spec.'))
    : DEFAULT_IGNORE;

  if (options?.ignore) {
    ignorePatterns.push(...options.ignore);
  }

  logger.debug(`Using ignore patterns: ${ignorePatterns.join(', ')}`);

  try {
    // Run fast-glob on all root paths
    const files = await fg(DEFAULT_PATTERNS, {
      cwd: process.cwd(),
      absolute: true,
      ignore: ignorePatterns,
      onlyFiles: true,
      followSymbolicLinks: false,
    });

    const duration = Date.now() - startTime;

    logger.debug(`Crawl completed in ${duration}ms`);
    logger.success(`Found ${files.length} files to analyze`);

    return {
      files,
      skipped,
      duration,
    };
  } catch (error) {
    logger.error(`Crawl failed: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * Validates that all root paths exist and are accessible
 *
 * @param paths - Paths to validate
 * @returns Array of valid paths
 */
export function validatePaths(paths: string[]): string[] {
  // TODO: Implement path validation
  return paths;
}
