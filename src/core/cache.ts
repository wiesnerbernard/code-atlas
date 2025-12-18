/**
 * File cache for incremental parsing
 *
 * Tracks file modification times to avoid re-parsing unchanged files.
 */

import { readFile, writeFile, mkdir, stat } from 'fs/promises';
import { dirname } from 'path';
import type { FunctionMetadata } from '../types/index.js';

export interface CacheEntry {
  /** File path */
  filePath: string;
  /** Last modification time (ms since epoch) */
  mtime: number;
  /** Cached function metadata */
  functions: FunctionMetadata[];
}

export interface Cache {
  version: string;
  entries: Map<string, CacheEntry>;
}

const CACHE_VERSION = '0.1.0';
const CACHE_PATH = '.code-atlas/cache.json';

/**
 * Loads cache from disk
 */
export async function loadCache(): Promise<Cache> {
  try {
    const content = await readFile(CACHE_PATH, 'utf-8');
    const data = JSON.parse(content);

    if (data.version !== CACHE_VERSION) {
      return { version: CACHE_VERSION, entries: new Map() };
    }

    const entries = new Map<string, CacheEntry>(
      Object.entries(data.entries as Record<string, CacheEntry>)
    );

    return { version: CACHE_VERSION, entries };
  } catch {
    return { version: CACHE_VERSION, entries: new Map() };
  }
}

/**
 * Saves cache to disk
 */
export async function saveCache(cache: Cache): Promise<void> {
  try {
    await mkdir(dirname(CACHE_PATH), { recursive: true });

    const data = {
      version: cache.version,
      entries: Object.fromEntries(cache.entries),
    };

    await writeFile(CACHE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch {
    // Silent fail - cache is optional
  }
}

/**
 * Checks if a file has been modified since last cache
 */
export async function isFileCached(filePath: string, cache: Cache): Promise<boolean> {
  const entry = cache.entries.get(filePath);
  if (!entry) return false;

  try {
    const stats = await stat(filePath);
    return stats.mtimeMs === entry.mtime;
  } catch {
    return false;
  }
}

/**
 * Gets cached functions for a file
 */
export function getCachedFunctions(filePath: string, cache: Cache): FunctionMetadata[] | null {
  const entry = cache.entries.get(filePath);
  return entry ? entry.functions : null;
}

/**
 * Updates cache entry for a file
 */
export async function updateCacheEntry(
  filePath: string,
  functions: FunctionMetadata[],
  cache: Cache
): Promise<void> {
  try {
    const stats = await stat(filePath);
    cache.entries.set(filePath, {
      filePath,
      mtime: stats.mtimeMs,
      functions,
    });
  } catch {
    // Ignore stat errors
  }
}
