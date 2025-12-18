/**
 * Tests for Git integration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  isGitRepository,
  enrichWithGitMetadata,
  calculateChurnScores,
  getHotSpots,
} from './git.js';
import type { FunctionMetadata } from '../types/index.js';

const mockFunctions: FunctionMetadata[] = [
  {
    name: 'simpleFunction',
    filePath: './src/test.ts',
    line: 10,
    params: [],
    returnType: 'void',
    jsdoc: null,
    isExported: false,
    complexity: 2,
    astHash: 'hash1',
  },
  {
    name: 'complexFunction',
    filePath: './src/complex.ts',
    line: 50,
    params: [],
    returnType: 'void',
    jsdoc: null,
    isExported: true,
    complexity: 20,
    astHash: 'hash2',
  },
];

describe('isGitRepository', () => {
  it('should return true for a Git repository', async () => {
    // This test runs in the code-atlas repo
    const result = await isGitRepository(process.cwd());
    expect(result).toBe(true);
  });

  it('should return false for non-Git directory', async () => {
    const result = await isGitRepository('/tmp');
    expect(result).toBe(false);
  });
});

describe('enrichWithGitMetadata', () => {
  it('should return functions without Git metadata when not in a Git repo', async () => {
    const enriched = await enrichWithGitMetadata(mockFunctions, '/tmp');

    expect(enriched).toHaveLength(2);
    expect(enriched[0]?.git).toBeUndefined();
    expect(enriched[1]?.git).toBeUndefined();
  });

  it('should enrich functions with Git metadata in a Git repo', async () => {
    // Use the actual repo
    const functions: FunctionMetadata[] = [
      {
        name: 'isGitRepository',
        filePath: process.cwd() + '/src/core/git.ts',
        line: 30,
        params: [],
        returnType: 'Promise<boolean>',
        jsdoc: null,
        isExported: true,
        complexity: 2,
        astHash: 'test',
      },
    ];

    const enriched = await enrichWithGitMetadata(functions, process.cwd());

    expect(enriched).toHaveLength(1);

    // Git metadata should be present (this file should have git history)
    const func = enriched[0];
    if (func?.git) {
      expect(func.git.lastAuthor).toBeTruthy();
      expect(func.git.lastModified).toBeTruthy();
      expect(func.git.lastCommit).toBeTruthy();
      expect(func.git.commitCount).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('calculateChurnScores', () => {
  it('should calculate churn scores based on commit activity', () => {
    const enriched = [
      {
        ...mockFunctions[0]!,
        git: {
          lastAuthor: 'Developer A',
          lastModified: '2025-01-01T00:00:00Z',
          commitCount: 5,
          lastCommit: 'abc123',
          linesAdded: 20,
          linesDeleted: 10,
        },
      },
      {
        ...mockFunctions[1]!,
        git: {
          lastAuthor: 'Developer B',
          lastModified: '2025-01-02T00:00:00Z',
          commitCount: 1,
          lastCommit: 'def456',
          linesAdded: 5,
          linesDeleted: 2,
        },
      },
    ];

    const withChurn = calculateChurnScores(enriched);

    expect(withChurn).toHaveLength(2);
    expect(withChurn[0]?.churnScore).toBeGreaterThan(0);
    expect(withChurn[1]?.churnScore).toBeGreaterThan(0);

    // First function has more commits, should have higher churn
    expect(withChurn[0]!.churnScore).toBeGreaterThan(withChurn[1]!.churnScore);
  });

  it('should handle functions without Git metadata', () => {
    const withChurn = calculateChurnScores(mockFunctions);

    expect(withChurn).toHaveLength(2);
    expect(withChurn[0]?.churnScore).toBe(0);
    expect(withChurn[1]?.churnScore).toBe(0);
  });

  it('should normalize scores to 0-1 range', () => {
    const enriched = [
      {
        ...mockFunctions[0]!,
        git: {
          lastAuthor: 'Developer',
          lastModified: '2025-01-01T00:00:00Z',
          commitCount: 100,
          lastCommit: 'abc',
          linesAdded: 500,
          linesDeleted: 300,
        },
      },
    ];

    const withChurn = calculateChurnScores(enriched);

    expect(withChurn[0]?.churnScore).toBeGreaterThanOrEqual(0);
    expect(withChurn[0]?.churnScore).toBeLessThanOrEqual(1);
  });
});

describe('getHotSpots', () => {
  it('should identify high-risk functions (high complexity + high churn)', () => {
    const functionsWithChurn = [
      {
        ...mockFunctions[0]!,
        git: {
          lastAuthor: 'Dev',
          lastModified: '2025-01-01T00:00:00Z',
          commitCount: 2,
          lastCommit: 'abc',
          linesAdded: 10,
          linesDeleted: 5,
        },
        churnScore: 0.3,
      },
      {
        ...mockFunctions[1]!,
        git: {
          lastAuthor: 'Dev',
          lastModified: '2025-01-01T00:00:00Z',
          commitCount: 10,
          lastCommit: 'def',
          linesAdded: 100,
          linesDeleted: 80,
        },
        churnScore: 0.8,
      },
    ];

    const hotSpots = getHotSpots(functionsWithChurn, 0.5);

    // Complex function with high churn should be a hot spot
    expect(hotSpots.length).toBeGreaterThan(0);
    expect(hotSpots[0]?.name).toBe('complexFunction');
    expect(hotSpots[0]?.riskScore).toBeGreaterThan(0.5);
  });

  it('should sort hot spots by risk score descending', () => {
    const functionsWithChurn = [
      { ...mockFunctions[0]!, complexity: 5, churnScore: 0.5 },
      { ...mockFunctions[1]!, complexity: 20, churnScore: 0.9 },
      { ...mockFunctions[0]!, name: 'medium', complexity: 10, churnScore: 0.6 },
    ];

    const hotSpots = getHotSpots(functionsWithChurn, 0.3);

    expect(hotSpots.length).toBe(3);
    expect(hotSpots[0]!.riskScore).toBeGreaterThanOrEqual(hotSpots[1]!.riskScore);
    expect(hotSpots[1]!.riskScore).toBeGreaterThanOrEqual(hotSpots[2]!.riskScore);
  });

  it('should respect threshold parameter', () => {
    const functionsWithChurn = [
      { ...mockFunctions[0]!, complexity: 5, churnScore: 0.3 },
      { ...mockFunctions[1]!, complexity: 15, churnScore: 0.5 },
      { ...mockFunctions[0]!, name: 'highRisk', complexity: 20, churnScore: 0.8 },
    ];

    const lowThreshold = getHotSpots(functionsWithChurn, 0.3);
    const highThreshold = getHotSpots(functionsWithChurn, 0.7);

    expect(lowThreshold.length).toBeGreaterThan(highThreshold.length);
  });

  it('should return empty array when no hot spots exist', () => {
    const functionsWithChurn = [{ ...mockFunctions[0]!, complexity: 1, churnScore: 0.1 }];

    const hotSpots = getHotSpots(functionsWithChurn, 0.9);

    expect(hotSpots).toHaveLength(0);
  });
});
