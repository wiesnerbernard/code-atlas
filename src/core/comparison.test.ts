/**
 * Tests for registry comparison utilities
 */

import { describe, it, expect } from 'vitest';
import { compareRegistries, hasChanges, getDiffSummary } from './comparison.js';
import type { Registry, FunctionMetadata } from '../types/index.js';

// Helper to create a minimal registry
function createRegistry(functions: FunctionMetadata[]): Registry {
  return {
    version: '0.1.0',
    generatedAt: new Date().toISOString(),
    scannedPaths: ['./src'],
    totalFiles: 1,
    totalFunctions: functions.length,
    functions,
    duplicates: [],
  };
}

// Helper to create minimal function metadata
function createFunction(
  name: string,
  filePath: string,
  complexity: number,
  astHash: string
): FunctionMetadata {
  return {
    name,
    filePath,
    line: 1,
    params: [],
    returnType: 'void',
    jsdoc: null,
    isExported: false,
    complexity,
    astHash,
  };
}

describe('compareRegistries', () => {
  it('should detect added functions', () => {
    const baseRegistry = createRegistry([createFunction('funcA', 'file.ts', 5, 'hash1')]);

    const headRegistry = createRegistry([
      createFunction('funcA', 'file.ts', 5, 'hash1'),
      createFunction('funcB', 'file.ts', 3, 'hash2'),
    ]);

    const diff = compareRegistries(baseRegistry, headRegistry);

    expect(diff.added).toHaveLength(1);
    expect(diff.added[0].name).toBe('funcB');
    expect(diff.modified).toHaveLength(0);
    expect(diff.deleted).toHaveLength(0);
    expect(diff.unchanged).toHaveLength(1);
  });

  it('should detect deleted functions', () => {
    const baseRegistry = createRegistry([
      createFunction('funcA', 'file.ts', 5, 'hash1'),
      createFunction('funcB', 'file.ts', 3, 'hash2'),
    ]);

    const headRegistry = createRegistry([createFunction('funcA', 'file.ts', 5, 'hash1')]);

    const diff = compareRegistries(baseRegistry, headRegistry);

    expect(diff.added).toHaveLength(0);
    expect(diff.modified).toHaveLength(0);
    expect(diff.deleted).toHaveLength(1);
    expect(diff.deleted[0].name).toBe('funcB');
    expect(diff.unchanged).toHaveLength(1);
  });

  it('should detect modified functions by astHash', () => {
    const baseRegistry = createRegistry([createFunction('funcA', 'file.ts', 5, 'hash1')]);

    const headRegistry = createRegistry([
      createFunction('funcA', 'file.ts', 8, 'hash2'), // Same name/file, different hash
    ]);

    const diff = compareRegistries(baseRegistry, headRegistry);

    expect(diff.added).toHaveLength(0);
    expect(diff.modified).toHaveLength(1);
    expect(diff.modified[0].before.complexity).toBe(5);
    expect(diff.modified[0].after.complexity).toBe(8);
    expect(diff.modified[0].complexityDelta).toBe(3);
    expect(diff.deleted).toHaveLength(0);
    expect(diff.unchanged).toHaveLength(0);
  });

  it('should identify unchanged functions', () => {
    const baseRegistry = createRegistry([
      createFunction('funcA', 'file.ts', 5, 'hash1'),
      createFunction('funcB', 'file.ts', 3, 'hash1'),
    ]);

    const headRegistry = createRegistry([
      createFunction('funcA', 'file.ts', 5, 'hash1'),
      createFunction('funcB', 'file.ts', 3, 'hash1'),
    ]);

    const diff = compareRegistries(baseRegistry, headRegistry);

    expect(diff.added).toHaveLength(0);
    expect(diff.modified).toHaveLength(0);
    expect(diff.deleted).toHaveLength(0);
    expect(diff.unchanged).toHaveLength(2);
  });

  it('should handle functions in different files as separate', () => {
    const baseRegistry = createRegistry([createFunction('funcA', 'file1.ts', 5, 'hash1')]);

    const headRegistry = createRegistry([createFunction('funcA', 'file2.ts', 5, 'hash1')]);

    const diff = compareRegistries(baseRegistry, headRegistry);

    // Same name but different file = treated as delete + add
    expect(diff.added).toHaveLength(1);
    expect(diff.added[0].filePath).toBe('file2.ts');
    expect(diff.deleted).toHaveLength(1);
    expect(diff.deleted[0].filePath).toBe('file1.ts');
    expect(diff.modified).toHaveLength(0);
  });

  it('should calculate complexity delta correctly', () => {
    const baseRegistry = createRegistry([createFunction('funcA', 'file.ts', 10, 'hash1')]);

    const headRegistry = createRegistry([createFunction('funcA', 'file.ts', 7, 'hash2')]);

    const diff = compareRegistries(baseRegistry, headRegistry);

    expect(diff.modified).toHaveLength(1);
    expect(diff.modified[0].complexityDelta).toBe(-3);
  });

  it('should detect signature changes', () => {
    const funcBefore: FunctionMetadata = {
      name: 'funcA',
      filePath: 'file.ts',
      line: 1,
      params: [
        { name: 'a', type: 'string', optional: false },
        { name: 'b', type: 'number', optional: false },
      ],
      returnType: 'void',
      jsdoc: null,
      isExported: false,
      complexity: 5,
      astHash: 'hash1',
    };

    const funcAfter: FunctionMetadata = {
      ...funcBefore,
      params: [
        { name: 'a', type: 'string', optional: false },
        { name: 'b', type: 'string', optional: false }, // Type changed
      ],
      astHash: 'hash2',
    };

    const baseRegistry = createRegistry([funcBefore]);
    const headRegistry = createRegistry([funcAfter]);

    const diff = compareRegistries(baseRegistry, headRegistry);

    expect(diff.modified).toHaveLength(1);
    expect(diff.modified[0].signatureChanged).toBe(true);
  });

  it('should handle empty registries', () => {
    const baseRegistry = createRegistry([]);
    const headRegistry = createRegistry([]);

    const diff = compareRegistries(baseRegistry, headRegistry);

    expect(diff.added).toHaveLength(0);
    expect(diff.modified).toHaveLength(0);
    expect(diff.deleted).toHaveLength(0);
    expect(diff.unchanged).toHaveLength(0);
  });
});

describe('hasChanges', () => {
  it('should return true when there are added functions', () => {
    const diff = {
      added: [createFunction('funcA', 'file.ts', 5, 'hash1')],
      modified: [],
      deleted: [],
      unchanged: [],
    };

    expect(hasChanges(diff)).toBe(true);
  });

  it('should return true when there are modified functions', () => {
    const diff = {
      added: [],
      modified: [
        {
          before: createFunction('funcA', 'file.ts', 5, 'hash1'),
          after: createFunction('funcA', 'file.ts', 8, 'hash2'),
          complexityDelta: 3,
          signatureChanged: false,
        },
      ],
      deleted: [],
      unchanged: [],
    };

    expect(hasChanges(diff)).toBe(true);
  });

  it('should return true when there are deleted functions', () => {
    const diff = {
      added: [],
      modified: [],
      deleted: [createFunction('funcA', 'file.ts', 5, 'hash1')],
      unchanged: [],
    };

    expect(hasChanges(diff)).toBe(true);
  });

  it('should return false when there are only unchanged functions', () => {
    const diff = {
      added: [],
      modified: [],
      deleted: [],
      unchanged: [createFunction('funcA', 'file.ts', 5, 'hash1')],
    };

    expect(hasChanges(diff)).toBe(false);
  });
});

describe('getDiffSummary', () => {
  it('should provide accurate summary statistics', () => {
    const diff = {
      added: [createFunction('funcA', 'file.ts', 5, 'hash1')],
      modified: [
        {
          before: createFunction('funcB', 'file.ts', 5, 'hash2'),
          after: createFunction('funcB', 'file.ts', 10, 'hash3'),
          complexityDelta: 5,
          signatureChanged: true,
        },
        {
          before: createFunction('funcC', 'file.ts', 10, 'hash4'),
          after: createFunction('funcC', 'file.ts', 7, 'hash5'),
          complexityDelta: -3,
          signatureChanged: false,
        },
      ],
      deleted: [createFunction('funcD', 'file.ts', 3, 'hash6')],
      unchanged: [
        createFunction('funcE', 'file.ts', 5, 'hash7'),
        createFunction('funcF', 'file.ts', 5, 'hash8'),
      ],
    };

    const summary = getDiffSummary(diff);

    expect(summary.added).toBe(1);
    expect(summary.modified).toBe(2);
    expect(summary.deleted).toBe(1);
    expect(summary.unchanged).toBe(2);
    expect(summary.total).toBe(6);
    expect(summary.complexityIncreases).toBe(1);
    expect(summary.complexityDecreases).toBe(1);
    expect(summary.signatureChanges).toBe(1);
  });

  it('should handle diff with no changes', () => {
    const diff = {
      added: [],
      modified: [],
      deleted: [],
      unchanged: [],
    };

    const summary = getDiffSummary(diff);

    expect(summary.added).toBe(0);
    expect(summary.modified).toBe(0);
    expect(summary.deleted).toBe(0);
    expect(summary.unchanged).toBe(0);
    expect(summary.total).toBe(0);
    expect(summary.complexityIncreases).toBe(0);
    expect(summary.complexityDecreases).toBe(0);
    expect(summary.signatureChanges).toBe(0);
  });
});
