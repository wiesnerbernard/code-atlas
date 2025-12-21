/**
 * Registry comparison utilities for detecting function changes
 *
 * This module provides functionality to compare two registries
 * and identify added, modified, and deleted functions.
 */

import type { Registry, FunctionMetadata } from '../types/index.js';

/**
 * Result of comparing two registries
 */
export interface RegistryDiff {
  /** Functions added in head (not in base) */
  added: FunctionMetadata[];

  /** Functions modified in head (different astHash) */
  modified: ModifiedFunction[];

  /** Functions deleted from base (not in head) */
  deleted: FunctionMetadata[];

  /** Functions unchanged between base and head */
  unchanged: FunctionMetadata[];
}

/**
 * Metadata for a modified function with before/after details
 */
export interface ModifiedFunction {
  /** Function metadata from base */
  before: FunctionMetadata;

  /** Function metadata from head */
  after: FunctionMetadata;

  /** Complexity change (positive = increased, negative = decreased) */
  complexityDelta: number;

  /** Whether the function signature changed */
  signatureChanged: boolean;
}

/**
 * Generate a unique key for a function based on name and file path
 */
function getFunctionKey(fn: FunctionMetadata): string {
  return `${fn.name}:${fn.filePath}`;
}

/**
 * Check if function signature changed
 */
function hasSignatureChanged(before: FunctionMetadata, after: FunctionMetadata): boolean {
  // Check parameter count
  if (before.params.length !== after.params.length) {
    return true;
  }

  // Check each parameter
  for (let i = 0; i < before.params.length; i++) {
    const beforeParam = before.params[i];
    const afterParam = after.params[i];

    if (
      beforeParam &&
      afterParam &&
      (beforeParam.name !== afterParam.name ||
        beforeParam.type !== afterParam.type ||
        beforeParam.optional !== afterParam.optional)
    ) {
      return true;
    }
  }

  // Check return type
  if (before.returnType !== after.returnType) {
    return true;
  }

  return false;
}

/**
 * Compare two registries and identify changes
 *
 * @param baseRegistry - The baseline registry (e.g., main branch)
 * @param headRegistry - The comparison registry (e.g., PR branch)
 * @returns Categorized differences between registries
 */
export function compareRegistries(baseRegistry: Registry, headRegistry: Registry): RegistryDiff {
  // Create maps for O(1) lookup
  const baseMap = new Map<string, FunctionMetadata>();
  const headMap = new Map<string, FunctionMetadata>();

  // Index base registry
  for (const fn of baseRegistry.functions) {
    const key = getFunctionKey(fn);
    baseMap.set(key, fn);
  }

  // Index head registry
  for (const fn of headRegistry.functions) {
    const key = getFunctionKey(fn);
    headMap.set(key, fn);
  }

  const added: FunctionMetadata[] = [];
  const modified: ModifiedFunction[] = [];
  const deleted: FunctionMetadata[] = [];
  const unchanged: FunctionMetadata[] = [];

  // Find added and modified functions
  for (const [key, headFn] of headMap) {
    const baseFn = baseMap.get(key);

    if (!baseFn) {
      // Function exists in head but not in base = added
      added.push(headFn);
    } else if (baseFn.astHash !== headFn.astHash) {
      // Function exists in both but has different hash = modified
      modified.push({
        before: baseFn,
        after: headFn,
        complexityDelta: headFn.complexity - baseFn.complexity,
        signatureChanged: hasSignatureChanged(baseFn, headFn),
      });
    } else {
      // Function unchanged
      unchanged.push(headFn);
    }
  }

  // Find deleted functions
  for (const [key, baseFn] of baseMap) {
    if (!headMap.has(key)) {
      // Function exists in base but not in head = deleted
      deleted.push(baseFn);
    }
  }

  return {
    added,
    modified,
    deleted,
    unchanged,
  };
}

/**
 * Check if a diff has any changes
 */
export function hasChanges(diff: RegistryDiff): boolean {
  return diff.added.length > 0 || diff.modified.length > 0 || diff.deleted.length > 0;
}

/**
 * Get summary statistics for a diff
 */
export interface DiffSummary {
  added: number;
  modified: number;
  deleted: number;
  unchanged: number;
  total: number;
  complexityIncreases: number;
  complexityDecreases: number;
  signatureChanges: number;
}

/**
 * Generate summary statistics from a diff
 */
export function getDiffSummary(diff: RegistryDiff): DiffSummary {
  const complexityIncreases = diff.modified.filter((m) => m.complexityDelta > 0).length;
  const complexityDecreases = diff.modified.filter((m) => m.complexityDelta < 0).length;
  const signatureChanges = diff.modified.filter((m) => m.signatureChanged).length;

  return {
    added: diff.added.length,
    modified: diff.modified.length,
    deleted: diff.deleted.length,
    unchanged: diff.unchanged.length,
    total: diff.added.length + diff.modified.length + diff.deleted.length + diff.unchanged.length,
    complexityIncreases,
    complexityDecreases,
    signatureChanges,
  };
}
