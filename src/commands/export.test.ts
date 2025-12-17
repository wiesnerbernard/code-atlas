/**
 * Tests for export command
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFile, mkdir, rm, readFile } from 'fs/promises';
import { join } from 'path';
import { exportCommand } from './export.js';
import type { Registry } from '../types/index.js';

const TEST_DIR = '.test-exports';
const REGISTRY_PATH = '.code-atlas/registry.json';

// Mock registry data
const mockRegistry: Registry = {
  version: '0.1.0',
  generatedAt: '2025-12-17T00:00:00.000Z',
  scannedPaths: ['./src'],
  totalFiles: 3,
  totalFunctions: 5,
  functions: [
    {
      name: 'testFunction',
      filePath: './src/test.ts',
      line: 10,
      params: [
        { name: 'arg1', type: 'string', optional: false },
        { name: 'arg2', type: 'number', optional: true, defaultValue: '42' },
      ],
      returnType: 'boolean',
      jsdoc: 'Test function documentation',
      isExported: true,
      complexity: 3,
      astHash: 'abc123',
    },
    {
      name: 'simpleFunc',
      filePath: './src/utils.ts',
      line: 5,
      params: [],
      returnType: 'void',
      jsdoc: null,
      isExported: false,
      complexity: 1,
      astHash: 'def456',
    },
    {
      name: 'complexFunc',
      filePath: './src/complex.ts',
      line: 100,
      params: [
        { name: 'data', type: 'any', optional: false },
      ],
      returnType: 'Promise<void>',
      jsdoc: 'Complex function with high complexity',
      isExported: true,
      complexity: 15,
      astHash: 'ghi789',
    },
    {
      name: 'csvTest',
      filePath: './src/csv.ts',
      line: 20,
      params: [
        { name: 'value', type: 'string', optional: false },
      ],
      returnType: 'string',
      jsdoc: 'Tests CSV escaping with "quotes", commas',
      isExported: true,
      complexity: 2,
      astHash: 'jkl012',
    },
    {
      name: 'duplicate',
      filePath: './src/dup.ts',
      line: 1,
      params: [],
      returnType: 'void',
      jsdoc: null,
      isExported: false,
      complexity: 1,
      astHash: 'same123',
    },
  ],
  duplicates: [
    {
      astHash: 'same123',
      functions: [
        { name: 'duplicate', filePath: './src/dup.ts', line: 1 },
        { name: 'duplicate', filePath: './src/dup2.ts', line: 1 },
      ],
      similarity: 1.0,
    },
  ],
};

describe('exportCommand', () => {
  beforeEach(async () => {
    // Create test directory and mock registry
    await mkdir('.code-atlas', { recursive: true });
    await mkdir(TEST_DIR, { recursive: true });
    await writeFile(REGISTRY_PATH, JSON.stringify(mockRegistry, null, 2));
  });

  afterEach(async () => {
    // Clean up test files
    await rm('.code-atlas', { recursive: true, force: true });
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  describe('JSON export', () => {
    it('should export registry to JSON format', async () => {
      const outputPath = join(TEST_DIR, 'test.json');
      
      await exportCommand({
        format: 'json',
        output: outputPath,
        includeDuplicates: true,
      });

      const content = await readFile(outputPath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.totalFunctions).toBe(5);
      expect(parsed.functions).toHaveLength(5);
      expect(parsed.duplicates).toHaveLength(1);
    });

    it('should exclude duplicates when includeDuplicates is false', async () => {
      const outputPath = join(TEST_DIR, 'test-no-dups.json');
      
      await exportCommand({
        format: 'json',
        output: outputPath,
        includeDuplicates: false,
      });

      const content = await readFile(outputPath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.duplicates).toBeUndefined();
      expect(parsed.functions).toHaveLength(5);
    });
  });

  describe('CSV export', () => {
    it('should export functions to CSV format', async () => {
      const outputPath = join(TEST_DIR, 'test.csv');
      
      await exportCommand({
        format: 'csv',
        output: outputPath,
      });

      const content = await readFile(outputPath, 'utf-8');
      const lines = content.split('\n');

      // Check header
      expect(lines[0]).toContain('Name,File Path,Line,Parameters');
      
      // Check data rows
      expect(lines).toHaveLength(6); // header + 5 functions
      expect(lines[1]).toContain('testFunction');
      expect(lines[2]).toContain('simpleFunc');
    });

    it('should properly escape CSV special characters', async () => {
      const outputPath = join(TEST_DIR, 'test-escape.csv');
      
      await exportCommand({
        format: 'csv',
        output: outputPath,
      });

      const content = await readFile(outputPath, 'utf-8');
      const lines = content.split('\n');
      
      // Check that the csvTest function line exists and has proper values
      const csvTestLine = lines.find(l => l.startsWith('csvTest'));
      expect(csvTestLine).toBeDefined();
      expect(csvTestLine).toContain('csvTest,./src/csv.ts,20');
    });

    it('should handle functions with no parameters', async () => {
      const outputPath = join(TEST_DIR, 'test-no-params.csv');
      
      await exportCommand({
        format: 'csv',
        output: outputPath,
      });

      const content = await readFile(outputPath, 'utf-8');
      const lines = content.split('\n');
      
      // simpleFunc has no parameters
      const simpleFuncLine = lines.find(l => l.startsWith('simpleFunc'));
      expect(simpleFuncLine).toBeDefined();
      expect(simpleFuncLine).toContain(',,'); // Empty parameters field
    });
  });

  describe('Markdown export', () => {
    it('should export registry to Markdown format', async () => {
      const outputPath = join(TEST_DIR, 'test.md');
      
      await exportCommand({
        format: 'markdown',
        output: outputPath,
        includeDuplicates: true,
      });

      const content = await readFile(outputPath, 'utf-8');

      // Check structure
      expect(content).toContain('# Function Registry');
      expect(content).toContain('## Summary');
      expect(content).toContain('## Functions');
      expect(content).toContain('## Potential Duplicates');
      expect(content).toContain('## High Complexity Functions');
      
      // Check data
      expect(content).toContain('**Total Functions**: 5');
      expect(content).toContain('testFunction');
      expect(content).toContain('complexFunc');
    });

    it('should exclude duplicates section when includeDuplicates is false', async () => {
      const outputPath = join(TEST_DIR, 'test-no-dups.md');
      
      await exportCommand({
        format: 'markdown',
        output: outputPath,
        includeDuplicates: false,
      });

      const content = await readFile(outputPath, 'utf-8');
      
      expect(content).not.toContain('## Potential Duplicates');
      expect(content).toContain('## Functions');
    });

    it('should show complexity distribution with percentages', async () => {
      const outputPath = join(TEST_DIR, 'test-complexity.md');
      
      await exportCommand({
        format: 'markdown',
        output: outputPath,
      });

      const content = await readFile(outputPath, 'utf-8');
      
      expect(content).toContain('### Complexity Distribution');
      expect(content).toContain('🟢 Simple (≤5):');
      expect(content).toContain('🟡 Moderate (6-10):');
      expect(content).toContain('🔴 Complex (>10):');
      expect(content).toMatch(/\d+\.\d+%/); // Contains percentage
    });

    it('should list high complexity functions', async () => {
      const outputPath = join(TEST_DIR, 'test-high-complexity.md');
      
      await exportCommand({
        format: 'markdown',
        output: outputPath,
      });

      const content = await readFile(outputPath, 'utf-8');
      
      expect(content).toContain('## High Complexity Functions');
      expect(content).toContain('complexFunc');
      expect(content).toContain('(complexity: 15)');
    });

    it('should format function table correctly', async () => {
      const outputPath = join(TEST_DIR, 'test-table.md');
      
      await exportCommand({
        format: 'markdown',
        output: outputPath,
      });

      const content = await readFile(outputPath, 'utf-8');
      
      // Check table structure
      expect(content).toContain('| Name | File | Line | Params | Return Type | Complexity | Exported |');
      expect(content).toContain('|------|------|------|--------|-------------|------------|----------|');
      
      // Check complexity emojis
      expect(content).toContain('🟢'); // Simple
      expect(content).toContain('🔴'); // Complex
    });
  });

  describe('Error handling', () => {
    it('should handle missing registry gracefully', async () => {
      // Remove registry file
      await rm(REGISTRY_PATH, { force: true });
      
      await expect(
        exportCommand({
          format: 'json',
          output: join(TEST_DIR, 'test.json'),
        })
      ).rejects.toThrow();
    });

    it('should use default output paths when not specified', async () => {
      await exportCommand({
        format: 'json',
      });

      // Default path is ./code-atlas-export.json
      const content = await readFile('./code-atlas-export.json', 'utf-8');
      expect(content).toBeTruthy();
      
      // Clean up
      await rm('./code-atlas-export.json', { force: true });
    });
  });
});
