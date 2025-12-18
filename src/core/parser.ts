/**
 * AST parser using ts-morph with parallel processing
 *
 * Responsible for parsing TypeScript/JavaScript files into
 * Abstract Syntax Trees for analysis.
 */

import { Project, type SourceFile } from 'ts-morph';
import { Worker } from 'worker_threads';
import { cpus } from 'os';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cliProgress from 'cli-progress';
import type { ParseResult, FunctionMetadata } from '../types/index.js';
import { logger } from '../utils/logger.js';
import {
  loadCache,
  saveCache,
  isFileCached,
  getCachedFunctions,
  updateCacheEntry,
} from './cache.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Singleton project instance for reuse across all file parsing
let projectInstance: Project | null = null;

/**
 * Gets or creates the shared Project instance
 *
 * @returns Project instance
 */
function getProject(): Project {
  if (!projectInstance) {
    projectInstance = new Project({
      skipAddingFilesFromTsConfig: true,
      compilerOptions: {
        target: 99, // ES2022
        module: 199, // NodeNext
        allowJs: true,
        esModuleInterop: true,
        skipLibCheck: true,
      },
    });
  }
  return projectInstance;
}

/**
 * Parses a single file and returns its SourceFile representation
 *
 * Gracefully handles parse errors by logging a warning and returning null.
 *
 * @param filePath - Absolute path to file
 * @returns SourceFile or null if parsing failed
 *
 * @example
 * ```typescript
 * const sourceFile = await parseFile('/path/to/file.ts');
 * if (sourceFile) {
 *   const functions = sourceFile.getFunctions();
 * }
 * ```
 */
export async function parseFile(filePath: string): Promise<SourceFile | null> {
  try {
    const project = getProject();
    const sourceFile = project.addSourceFileAtPath(filePath);
    logger.debug(`Parsed: ${filePath}`);
    return sourceFile;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`Failed to parse ${filePath}: ${message}`);
    return null;
  }
}

/**
 * Parses multiple files using worker threads and caching for optimal performance
 *
 * Uses:
 * - Cache to skip unchanged files
 * - Worker threads for parallel parsing
 * - Progress bar for feedback
 *
 * @param filePaths - Array of absolute file paths
 * @param useCache - Whether to use cache (default: true)
 * @returns Array of ParseResult objects
 *
 * @example
 * ```typescript
 * const results = await parseFiles(files);
 * const successCount = results.filter(r => !r.error).length;
 * ```
 */
export async function parseFiles(filePaths: string[], useCache = true): Promise<ParseResult[]> {
  const results: ParseResult[] = [];
  const cache = useCache ? await loadCache() : { version: '0.1.0', entries: new Map() };

  logger.info(`Parsing ${filePaths.length} files...`);

  // Create progress bar
  const progressBar = new cliProgress.SingleBar({
    format: 'Progress |{bar}| {percentage}% | {value}/{total} files',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true,
  });

  progressBar.start(filePaths.length, 0);

  // Separate cached and uncached files
  const cachedFiles: string[] = [];
  const uncachedFiles: string[] = [];

  for (const filePath of filePaths) {
    if (useCache && (await isFileCached(filePath, cache))) {
      cachedFiles.push(filePath);
    } else {
      uncachedFiles.push(filePath);
    }
  }

  // Process cached files instantly
  for (const filePath of cachedFiles) {
    const functions = getCachedFunctions(filePath, cache) || [];
    results.push({
      filePath,
      metadata: functions,
      error: undefined,
    });
  }

  progressBar.update(cachedFiles.length);

  if (uncachedFiles.length === 0) {
    progressBar.stop();
    logger.info(`Used cache for all ${cachedFiles.length} files`);
    return results;
  }

  logger.info(`Cache hit: ${cachedFiles.length}, Cache miss: ${uncachedFiles.length}`);

  // Parse uncached files in parallel using workers
  const numWorkers = Math.min(cpus().length, Math.ceil(uncachedFiles.length / 10));
  const chunkSize = Math.ceil(uncachedFiles.length / numWorkers);
  const chunks: string[][] = [];

  for (let i = 0; i < uncachedFiles.length; i += chunkSize) {
    chunks.push(uncachedFiles.slice(i, i + chunkSize));
  }

  const workerResults = await Promise.all(
    chunks.map((chunk) => parseFilesInWorker(chunk, progressBar, cachedFiles.length))
  );

  // Aggregate worker results and update cache
  for (const workerResult of workerResults) {
    for (const [filePath, functions] of workerResult.functions) {
      results.push({
        filePath,
        metadata: functions,
        error: undefined,
      });

      if (useCache) {
        await updateCacheEntry(filePath, functions, cache);
      }
    }

    for (const { filePath, error } of workerResult.errors) {
      results.push({
        filePath,
        metadata: [],
        error,
      });
    }
  }

  progressBar.stop();

  const errorCount = results.filter((r) => r.error).length;
  if (errorCount > 0) {
    logger.warn(`${errorCount} files failed to parse`);
  }

  // Save updated cache
  if (useCache) {
    await saveCache(cache);
  }

  return results;
}

/**
 * Parses files in a worker thread
 */
async function parseFilesInWorker(
  filePaths: string[],
  progressBar: cliProgress.SingleBar,
  offset: number
): Promise<{
  functions: Map<string, FunctionMetadata[]>;
  errors: Array<{ filePath: string; error: string }>;
}> {
  return new Promise((resolve, reject) => {
    const workerPath = join(__dirname, 'worker.js');
    const worker = new Worker(workerPath, {
      workerData: { filePaths },
    });

    let processedCount = 0;

    worker.on(
      'message',
      (result: {
        functions: FunctionMetadata[];
        errors: Array<{ filePath: string; error: string }>;
      }) => {
        // Group functions by file path
        const functionsByFile = new Map<string, FunctionMetadata[]>();
        for (const func of result.functions) {
          if (!functionsByFile.has(func.filePath)) {
            functionsByFile.set(func.filePath, []);
          }
          functionsByFile.get(func.filePath)!.push(func);
        }

        // Fill in empty arrays for files with no functions
        for (const filePath of filePaths) {
          if (!functionsByFile.has(filePath)) {
            functionsByFile.set(filePath, []);
          }
        }

        processedCount = filePaths.length;
        progressBar.update(offset + processedCount);

        resolve({
          functions: functionsByFile,
          errors: result.errors,
        });
      }
    );

    worker.on('error', (error) => {
      reject(error);
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
}

/**
 * Resets the project instance (useful for testing)
 */
export function resetProject(): void {
  projectInstance = null;
}
