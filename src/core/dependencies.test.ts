/**
 * Tests for dependency graph analyzer
 */

import { describe, it, expect } from 'vitest';
import { Project } from 'ts-morph';
import {
  extractFunctionCalls,
  buildDependencyGraph,
  generateMermaidDiagram,
  generateDOTGraph,
} from './dependencies.js';
import type { FunctionMetadata } from '../types/index.js';

describe('extractFunctionCalls', () => {
  it('should extract function calls from a function', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile('test.ts', `
      function helper() {
        return 42;
      }
      
      function test() {
        helper();
        helper();
        const result = helper();
        return result;
      }
    `);

    const calls = extractFunctionCalls(sourceFile, 'test');

    expect(calls).toHaveLength(3);
    expect(calls.every(c => c.callee === 'helper')).toBe(true);
  });

  it('should ignore method calls', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile('test.ts', `
      function test() {
        console.log('test');
        array.map(x => x);
        return obj.method();
      }
    `);

    const calls = extractFunctionCalls(sourceFile, 'test');

    expect(calls).toHaveLength(0);
  });

  it('should return empty array for non-existent function', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile('test.ts', 'function test() {}');

    const calls = extractFunctionCalls(sourceFile, 'nonExistent');

    expect(calls).toHaveLength(0);
  });
});

describe('buildDependencyGraph', () => {
  it('should build a dependency graph', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile('test.ts', `
      function helper() {
        return 42;
      }
      
      export function main() {
        return helper();
      }
      
      function unused() {
        return 0;
      }
    `);

    const functions: FunctionMetadata[] = [
      {
        name: 'helper',
        filePath: 'test.ts',
        line: 2,
        params: [],
        returnType: 'number',
        jsdoc: null,
        isExported: false,
        complexity: 1,
        astHash: 'hash1',
      },
      {
        name: 'main',
        filePath: 'test.ts',
        line: 6,
        params: [],
        returnType: 'number',
        jsdoc: null,
        isExported: true,
        complexity: 1,
        astHash: 'hash2',
      },
      {
        name: 'unused',
        filePath: 'test.ts',
        line: 10,
        params: [],
        returnType: 'number',
        jsdoc: null,
        isExported: false,
        complexity: 1,
        astHash: 'hash3',
      },
    ];

    const sourceFiles = new Map([['test.ts', sourceFile]]);
    const graph = buildDependencyGraph(functions, sourceFiles);

    expect(graph.nodes.size).toBe(3);
    expect(graph.orphans).toHaveLength(1);
    expect(graph.orphans[0]?.function.name).toBe('unused');
    expect(graph.entryPoints).toHaveLength(0); // main calls helper, so not an entry point
  });

  it('should detect orphaned functions', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile('test.ts', `
      export function exported() {}
      function orphan() {}
    `);

    const functions: FunctionMetadata[] = [
      {
        name: 'exported',
        filePath: 'test.ts',
        line: 2,
        params: [],
        returnType: 'void',
        jsdoc: null,
        isExported: true,
        complexity: 1,
        astHash: 'hash1',
      },
      {
        name: 'orphan',
        filePath: 'test.ts',
        line: 3,
        params: [],
        returnType: 'void',
        jsdoc: null,
        isExported: false,
        complexity: 1,
        astHash: 'hash2',
      },
    ];

    const sourceFiles = new Map([['test.ts', sourceFile]]);
    const graph = buildDependencyGraph(functions, sourceFiles);

    expect(graph.orphans).toHaveLength(1);
    expect(graph.orphans[0]?.function.name).toBe('orphan');
  });

  it('should identify entry points', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile('test.ts', `
      export function entryPoint() {
        return 42;
      }
    `);

    const functions: FunctionMetadata[] = [
      {
        name: 'entryPoint',
        filePath: 'test.ts',
        line: 2,
        params: [],
        returnType: 'number',
        jsdoc: null,
        isExported: true,
        complexity: 1,
        astHash: 'hash1',
      },
    ];

    const sourceFiles = new Map([['test.ts', sourceFile]]);
    const graph = buildDependencyGraph(functions, sourceFiles);

    expect(graph.entryPoints).toHaveLength(1);
    expect(graph.entryPoints[0]?.function.name).toBe('entryPoint');
  });

  it('should detect circular dependencies', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile('test.ts', `
      function a() {
        b();
      }
      
      function b() {
        c();
      }
      
      function c() {
        a();
      }
    `);

    const functions: FunctionMetadata[] = [
      {
        name: 'a',
        filePath: 'test.ts',
        line: 2,
        params: [],
        returnType: 'void',
        jsdoc: null,
        isExported: false,
        complexity: 1,
        astHash: 'hash1',
      },
      {
        name: 'b',
        filePath: 'test.ts',
        line: 6,
        params: [],
        returnType: 'void',
        jsdoc: null,
        isExported: false,
        complexity: 1,
        astHash: 'hash2',
      },
      {
        name: 'c',
        filePath: 'test.ts',
        line: 10,
        params: [],
        returnType: 'void',
        jsdoc: null,
        isExported: false,
        complexity: 1,
        astHash: 'hash3',
      },
    ];

    const sourceFiles = new Map([['test.ts', sourceFile]]);
    const graph = buildDependencyGraph(functions, sourceFiles);

    expect(graph.circularDependencies.length).toBeGreaterThan(0);
  });
});

describe('generateMermaidDiagram', () => {
  it('should generate a Mermaid diagram', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile('test.ts', `
      function helper() { return 42; }
      export function main() { return helper(); }
    `);

    const functions: FunctionMetadata[] = [
      {
        name: 'helper',
        filePath: 'test.ts',
        line: 2,
        params: [],
        returnType: 'number',
        jsdoc: null,
        isExported: false,
        complexity: 1,
        astHash: 'hash1',
      },
      {
        name: 'main',
        filePath: 'test.ts',
        line: 3,
        params: [],
        returnType: 'number',
        jsdoc: null,
        isExported: true,
        complexity: 1,
        astHash: 'hash2',
      },
    ];

    const sourceFiles = new Map([['test.ts', sourceFile]]);
    const graph = buildDependencyGraph(functions, sourceFiles);
    const diagram = generateMermaidDiagram(graph, 10);

    expect(diagram).toContain('```mermaid');
    expect(diagram).toContain('graph TD');
    expect(diagram).toContain('helper');
    expect(diagram).toContain('main');
    expect(diagram).toContain('-->');
    expect(diagram).toContain('classDef exported');
  });

  it('should limit nodes to maxNodes', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile('test.ts', `
      function a() {}
      function b() {}
      function c() {}
    `);

    const functions: FunctionMetadata[] = [
      { name: 'a', filePath: 'test.ts', line: 2, params: [], returnType: 'void', jsdoc: null, isExported: false, complexity: 1, astHash: 'h1' },
      { name: 'b', filePath: 'test.ts', line: 3, params: [], returnType: 'void', jsdoc: null, isExported: false, complexity: 1, astHash: 'h2' },
      { name: 'c', filePath: 'test.ts', line: 4, params: [], returnType: 'void', jsdoc: null, isExported: false, complexity: 1, astHash: 'h3' },
    ];

    const sourceFiles = new Map([['test.ts', sourceFile]]);
    const graph = buildDependencyGraph(functions, sourceFiles);
    const diagram = generateMermaidDiagram(graph, 2);

    const nodeCount = (diagram.match(/\["/g) || []).length;
    expect(nodeCount).toBeLessThanOrEqual(2);
  });
});

describe('generateDOTGraph', () => {
  it('should generate a DOT graph', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile('test.ts', `
      function helper() { return 42; }
      export function main() { return helper(); }
    `);

    const functions: FunctionMetadata[] = [
      {
        name: 'helper',
        filePath: 'test.ts',
        line: 2,
        params: [],
        returnType: 'number',
        jsdoc: null,
        isExported: false,
        complexity: 1,
        astHash: 'hash1',
      },
      {
        name: 'main',
        filePath: 'test.ts',
        line: 3,
        params: [],
        returnType: 'number',
        jsdoc: null,
        isExported: true,
        complexity: 1,
        astHash: 'hash2',
      },
    ];

    const sourceFiles = new Map([['test.ts', sourceFile]]);
    const graph = buildDependencyGraph(functions, sourceFiles);
    const dot = generateDOTGraph(graph, 10);

    expect(dot).toContain('digraph Dependencies');
    expect(dot).toContain('rankdir=LR');
    expect(dot).toContain('"helper"');
    expect(dot).toContain('"main"');
    expect(dot).toContain('->');
  });

  it('should style exported and orphaned nodes', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile('test.ts', `
      export function exported() {}
      function orphan() {}
    `);

    const functions: FunctionMetadata[] = [
      {
        name: 'exported',
        filePath: 'test.ts',
        line: 2,
        params: [],
        returnType: 'void',
        jsdoc: null,
        isExported: true,
        complexity: 1,
        astHash: 'hash1',
      },
      {
        name: 'orphan',
        filePath: 'test.ts',
        line: 3,
        params: [],
        returnType: 'void',
        jsdoc: null,
        isExported: false,
        complexity: 1,
        astHash: 'hash2',
      },
    ];

    const sourceFiles = new Map([['test.ts', sourceFile]]);
    const graph = buildDependencyGraph(functions, sourceFiles);
    const dot = generateDOTGraph(graph, 10);

    expect(dot).toContain('lightgreen'); // exported
    expect(dot).toContain('lightpink'); // orphan
  });
});
