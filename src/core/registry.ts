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

  // Find groups with multiple functions (exact matches)
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
        similarity: 1.0, // Exact match
      });
    }
  }

  // Find near-duplicates using fuzzy matching
  const nearDuplicates = findNearDuplicates(functions);
  duplicates.push(...nearDuplicates);

  return duplicates;
}

/**
 * Finds near-duplicate functions using optimized hash-based pre-filtering
 *
 * Only compares functions with similar hash prefixes to reduce O(n²) comparisons.
 *
 * @param functions - Array of function metadata
 * @returns Array of near-duplicate groups
 */
function findNearDuplicates(functions: FunctionMetadata[]): DuplicateGroup[] {
  const nearDuplicates: DuplicateGroup[] = [];
  const SIMILARITY_THRESHOLD = 0.85; // 85% similar
  const HASH_PREFIX_LENGTH = 8; // Compare first 8 chars of hash

  // Group functions by hash prefix for faster comparison
  const hashPrefixMap = new Map<string, FunctionMetadata[]>();

  for (const func of functions) {
    const prefix = func.astHash.substring(0, HASH_PREFIX_LENGTH);
    const existing = hashPrefixMap.get(prefix) ?? [];
    existing.push(func);
    hashPrefixMap.set(prefix, existing);
  }

  // Only compare functions within same hash prefix groups
  for (const group of hashPrefixMap.values()) {
    if (group.length < 2) continue;

    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const func1 = group[i];
        const func2 = group[j];

        // Skip if already in exact match group
        if (func1?.astHash === func2?.astHash) continue;

        // Calculate similarity using Levenshtein distance
        const hash1 = func1?.astHash ?? '';
        const hash2 = func2?.astHash ?? '';
        const similarity = calculateSimilarity(hash1, hash2);

        if (similarity >= SIMILARITY_THRESHOLD) {
          nearDuplicates.push({
            astHash: `fuzzy_${hash1.substring(0, 8)}_${hash2.substring(0, 8)}`,
            functions: [
              { name: func1?.name ?? '', filePath: func1?.filePath ?? '', line: func1?.line ?? 0 },
              { name: func2?.name ?? '', filePath: func2?.filePath ?? '', line: func2?.line ?? 0 },
            ],
            similarity,
          });
        }
      }
    }
  }

  return nearDuplicates;
}

/**
 * Calculates similarity between two strings using Levenshtein distance
 *
 * @param str1 - First string
 * @param str2 - Second string
 * @returns Similarity score (0.0 to 1.0)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

/**
 * Calculates Levenshtein distance between two strings
 *
 * @param str1 - First string
 * @param str2 - Second string
 * @returns Edit distance
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    if (matrix[0]) matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2[i - 1] === str1[j - 1]) {
        const prevDiag = matrix[i - 1]?.[j - 1];
        if (prevDiag !== undefined && matrix[i]) {
          matrix[i]![j] = prevDiag;
        }
      } else {
        const prevDiag = matrix[i - 1]?.[j - 1];
        const prevRow = matrix[i - 1]?.[j];
        const prevCol = matrix[i]?.[j - 1];

        if (prevDiag !== undefined && prevRow !== undefined && prevCol !== undefined && matrix[i]) {
          matrix[i]![j] = Math.min(prevDiag + 1, prevRow + 1, prevCol + 1);
        }
      }
    }
  }

  return matrix[str2.length]?.[str1.length] ?? 0;
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
