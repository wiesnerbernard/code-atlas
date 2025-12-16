/**
 * Scan command - scans codebase and builds registry
 */

import type { ScanOptions } from '../types/index.js';
import { crawl } from '../core/crawler.js';
import { parseFile } from '../core/parser.js';
import { extractMetadata } from '../core/extractor.js';
import { createRegistry, saveRegistry } from '../core/registry.js';
import { logger } from '../utils/logger.js';

/**
 * Executes the scan command
 * 
 * Crawls the specified paths, parses files, extracts metadata,
 * and builds a registry.
 * 
 * @param paths - Root directories to scan
 * @param options - Scan options
 * 
 * @example
 * ```typescript
 * await scanCommand(['./src'], { 
 *   ignore: ['**\/legacy/**'],
 *   output: '.code-atlas/registry.json'
 * });
 * ```
 */
export async function scanCommand(paths: string[], options: ScanOptions): Promise<void> {
  const startTime = Date.now();

  logger.info(`Starting scan of: ${paths.join(', ')}`);

  try {
    // Step 1: Crawl file system
    const crawlResult = await crawl(paths, {
      ignore: options.ignore,
      includeTests: options.includeTests,
    });

    if (crawlResult.files.length === 0) {
      logger.warn('No files found to scan');
      return;
    }

    // Step 2: Parse files and extract metadata
    logger.info('Parsing files and extracting metadata...');
    const allMetadata = [];

    for (const filePath of crawlResult.files) {
      const sourceFile = await parseFile(filePath);
      if (sourceFile) {
        const metadata = extractMetadata(sourceFile);
        allMetadata.push(...metadata);
      }
    }

    // Filter by complexity if specified
    const filteredMetadata = options.maxComplexity
      ? allMetadata.filter((m) => m.complexity <= (options.maxComplexity ?? Infinity))
      : allMetadata;

    if (filteredMetadata.length < allMetadata.length) {
      const filtered = allMetadata.length - filteredMetadata.length;
      logger.info(`Filtered ${filtered} functions exceeding complexity threshold`);
    }

    // Step 3: Build and save registry
    const registry = createRegistry(filteredMetadata, paths, crawlResult.files.length);

    await saveRegistry(registry, options.output);

    // Summary
    const duration = Date.now() - startTime;
    logger.success(`Scan completed in ${(duration / 1000).toFixed(2)}s`);
    
    if (registry.duplicates.length > 0) {
      logger.info(`\nDuplicate groups found: ${registry.duplicates.length}`);
      logger.info('Run "code-atlas stats" to view details');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Scan failed: ${message}`);
    throw error;
  }
}
