/**
 * AST parser using ts-morph
 * 
 * Responsible for parsing TypeScript/JavaScript files into
 * Abstract Syntax Trees for analysis.
 */

import { Project, type SourceFile } from 'ts-morph';
import type { ParseResult } from '../types/index.js';
import { logger } from '../utils/logger.js';

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
 * Parses multiple files in parallel
 * 
 * Processes files in batches to avoid overwhelming the system.
 * 
 * @param filePaths - Array of absolute file paths
 * @param batchSize - Number of files to process concurrently (default: 50)
 * @returns Array of ParseResult objects
 * 
 * @example
 * ```typescript
 * const results = await parseFiles(files);
 * const successCount = results.filter(r => !r.error).length;
 * ```
 */
export async function parseFiles(
  filePaths: string[],
  batchSize = 50
): Promise<ParseResult[]> {
  const results: ParseResult[] = [];
  
  logger.info(`Parsing ${filePaths.length} files...`);

  for (let i = 0; i < filePaths.length; i += batchSize) {
    const batch = filePaths.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (filePath) => {
        const sourceFile = await parseFile(filePath);
        
        if (!sourceFile) {
          return {
            filePath,
            metadata: [],
            error: 'Parse failed',
          };
        }

        return {
          filePath,
          metadata: [], // Will be populated by extractor
          error: undefined,
        };
      })
    );

    results.push(...batchResults);

    // Progress update
    const progress = Math.min(i + batchSize, filePaths.length);
    logger.debug(`Progress: ${progress}/${filePaths.length} files parsed`);
  }

  const errorCount = results.filter((r) => r.error).length;
  if (errorCount > 0) {
    logger.warn(`${errorCount} files failed to parse`);
  }

  return results;
}

/**
 * Resets the project instance (useful for testing)
 */
export function resetProject(): void {
  projectInstance = null;
}
