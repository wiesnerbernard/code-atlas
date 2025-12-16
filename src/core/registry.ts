/**
 * Registry management
 * 
 * Handles reading, writing, and querying the function registry.
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import type { Registry, FunctionMetadata, DuplicateGroup } from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * Default registry file path
 */
export const DEFAULT_REGISTRY_PATH = '.code-atlas/registry.json';

/**
 * Current registry schema version
 */
export const REGISTRY_VERSION = '0.1.0';

/**
 * Creates a new registry from function metadata
 * 
 * @param functions - Array of function metadata
 * @param scannedPaths - Paths that were scanned
 * @param totalFiles - Number of files scanned
 * @returns Complete registry object
 */
export function createRegistry(
  functions: FunctionMetadata[],
  scannedPaths: string[],
  totalFiles: number
): Registry {
  const duplicates = detectDuplicates(functions);

  return {
    version: REGISTRY_VERSION,
    generatedAt: new Date().toISOString(),
    scannedPaths,
    totalFiles,
    totalFunctions: functions.length,
    functions,
    duplicates,
  };
}

/**
 * Saves a registry to disk
 * 
 * @param registry - Registry to save
 * @param outputPath - Output file path (default: .code-atlas/registry.json)
 * 
 * @example
 * ```typescript
 * await saveRegistry(registry, '.code-atlas/registry.json');
 * ```
 */
export async function saveRegistry(
  registry: Registry,
  outputPath: string = DEFAULT_REGISTRY_PATH
): Promise<void> {
  try {
    // Ensure directory exists
    const dir = dirname(outputPath);
    await mkdir(dir, { recursive: true });

    // Write registry with pretty formatting
    const json = JSON.stringify(registry, null, 2);
    await writeFile(outputPath, json, 'utf-8');

    logger.success(`Registry saved to ${outputPath}`);
    logger.info(`Indexed ${registry.totalFunctions} functions from ${registry.totalFiles} files`);

    if (registry.duplicates.length > 0) {
      logger.warn(`Found ${registry.duplicates.length} potential duplicate groups`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to save registry: ${message}`);
    throw error;
  }
}

/**
 * Loads a registry from disk
 * 
 * @param inputPath - Path to registry file
 * @returns Loaded registry
 * 
 * @throws Error if file doesn't exist or is invalid
 */
export async function loadRegistry(inputPath: string = DEFAULT_REGISTRY_PATH): Promise<Registry> {
  try {
    const content = await readFile(inputPath, 'utf-8');
    const registry = JSON.parse(content) as Registry;

    // Validate schema version
    if (registry.version !== REGISTRY_VERSION) {
      logger.warn(
        `Registry version mismatch: expected ${REGISTRY_VERSION}, got ${registry.version}`
      );
    }

    logger.debug(`Loaded registry with ${registry.totalFunctions} functions`);
    return registry;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to load registry: ${message}`);
    throw error;
  }
}

/**
 * Detects duplicate functions based on AST hash
 * 
 * Groups functions with identical or similar AST hashes.
 * 
 * @param functions - Array of function metadata
 * @returns Array of duplicate groups
 */
function detectDuplicates(functions: FunctionMetadata[]): DuplicateGroup[] {
  const hashMap = new Map<string, FunctionMetadata[]>();

  // Group by AST hash
  for (const func of functions) {
    const existing = hashMap.get(func.astHash) ?? [];
    existing.push(func);
    hashMap.set(func.astHash, existing);
  }

  // Find groups with multiple functions
  const duplicates: DuplicateGroup[] = [];

  for (const [astHash, group] of hashMap.entries()) {
    if (group.length > 1) {
      duplicates.push({
        astHash,
        functions: group.map((f) => ({
          name: f.name,
          filePath: f.filePath,
          line: f.line,
        })),
        similarity: 1.0, // Exact match for now
      });
    }
  }

  return duplicates;
}

/**
 * Gets the default registry path for a project
 * 
 * @param projectRoot - Project root directory
 * @returns Full path to registry file
 */
export function getRegistryPath(projectRoot: string): string {
  return join(projectRoot, DEFAULT_REGISTRY_PATH);
}
