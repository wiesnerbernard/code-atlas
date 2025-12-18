/**
 * Dependency graph analyzer
 * 
 * Analyzes function calls to build a dependency graph showing
 * which functions call other functions.
 */

import { SyntaxKind, type SourceFile } from 'ts-morph';
import type { FunctionMetadata } from '../types/index.js';

export interface FunctionCall {
  /** Function being called */
  callee: string;
  /** Location of the call */
  line: number;
}

export interface DependencyNode {
  /** Function metadata */
  function: FunctionMetadata;
  /** Functions this one calls */
  calls: FunctionCall[];
  /** Functions that call this one */
  calledBy: string[];
  /** Whether this function is called by any other function */
  isUsed: boolean;
  /** Whether this function calls other functions */
  hasDependencies: boolean;
}

export interface DependencyGraph {
  /** All nodes in the graph */
  nodes: Map<string, DependencyNode>;
  /** Orphaned functions (never called) */
  orphans: DependencyNode[];
  /** Entry points (exported, never call others) */
  entryPoints: DependencyNode[];
  /** Circular dependencies detected */
  circularDependencies: string[][];
}

/**
 * Analyzes a source file to extract function calls
 * 
 * @param sourceFile - Source file to analyze
 * @param functionName - Name of function to analyze
 * @returns Array of function calls
 */
export function extractFunctionCalls(
  sourceFile: SourceFile,
  functionName: string
): FunctionCall[] {
  const calls: FunctionCall[] = [];
  
  // Find the function declaration
  const func = sourceFile.getFunction(functionName);
  if (!func) return calls;

  // Get all call expressions in this function
  const callExpressions = func.getDescendantsOfKind(SyntaxKind.CallExpression);
  
  for (const call of callExpressions) {
    const expression = call.getExpression();
    const calleeName = expression.getText();
    
    // Only track simple function calls (not method calls)
    if (!calleeName.includes('.') && !calleeName.includes('(')) {
      calls.push({
        callee: calleeName,
        line: call.getStartLineNumber(),
      });
    }
  }

  return calls;
}

/**
 * Builds a dependency graph from function metadata
 * 
 * @param functions - Array of function metadata
 * @param sourceFiles - Map of file paths to source files
 * @returns Complete dependency graph
 */
export function buildDependencyGraph(
  functions: FunctionMetadata[],
  sourceFiles: Map<string, SourceFile>
): DependencyGraph {
  const nodes = new Map<string, DependencyNode>();

  // Initialize nodes
  for (const func of functions) {
    const sourceFile = sourceFiles.get(func.filePath);
    const calls = sourceFile ? extractFunctionCalls(sourceFile, func.name) : [];

    nodes.set(func.name, {
      function: func,
      calls,
      calledBy: [],
      isUsed: false,
      hasDependencies: calls.length > 0,
    });
  }

  // Build reverse edges (calledBy)
  for (const [functionName, node] of nodes.entries()) {
    for (const call of node.calls) {
      const calledNode = nodes.get(call.callee);
      if (calledNode) {
        calledNode.calledBy.push(functionName);
        calledNode.isUsed = true;
      }
    }
  }

  // Find orphans (never called)
  const orphans = Array.from(nodes.values()).filter(
    node => !node.isUsed && !node.function.isExported
  );

  // Find entry points (exported and don't call other tracked functions)
  const entryPoints = Array.from(nodes.values()).filter(
    node => node.function.isExported && !node.hasDependencies
  );

  // Detect circular dependencies
  const circularDependencies = detectCircularDependencies(nodes);

  return {
    nodes,
    orphans,
    entryPoints,
    circularDependencies,
  };
}

/**
 * Detects circular dependencies using DFS
 * 
 * @param nodes - Dependency graph nodes
 * @returns Array of circular dependency chains
 */
function detectCircularDependencies(
  nodes: Map<string, DependencyNode>
): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(functionName: string, path: string[]): void {
    if (recursionStack.has(functionName)) {
      // Found a cycle
      const cycleStart = path.indexOf(functionName);
      if (cycleStart >= 0) {
        cycles.push([...path.slice(cycleStart), functionName]);
      }
      return;
    }

    if (visited.has(functionName)) {
      return;
    }

    visited.add(functionName);
    recursionStack.add(functionName);
    path.push(functionName);

    const node = nodes.get(functionName);
    if (node) {
      for (const call of node.calls) {
        if (nodes.has(call.callee)) {
          dfs(call.callee, [...path]);
        }
      }
    }

    recursionStack.delete(functionName);
  }

  for (const functionName of nodes.keys()) {
    if (!visited.has(functionName)) {
      dfs(functionName, []);
    }
  }

  // Remove duplicate cycles
  const uniqueCycles = cycles.filter((cycle, index) => {
    const cycleStr = cycle.sort().join('->');
    return cycles.findIndex(c => c.sort().join('->') === cycleStr) === index;
  });

  return uniqueCycles;
}

/**
 * Generates a Mermaid diagram of the dependency graph
 * 
 * @param graph - Dependency graph
 * @param maxNodes - Maximum nodes to include (default: 50)
 * @returns Mermaid diagram string
 */
export function generateMermaidDiagram(
  graph: DependencyGraph,
  maxNodes = 50
): string {
  const lines: string[] = [];
  lines.push('```mermaid');
  lines.push('graph TD');

  // Limit nodes to most connected ones
  const sortedNodes = Array.from(graph.nodes.values())
    .sort((a, b) => 
      (b.calls.length + b.calledBy.length) - (a.calls.length + a.calledBy.length)
    )
    .slice(0, maxNodes);

  const nodeNames = new Set(sortedNodes.map(n => n.function.name));

  // Add nodes with styling
  for (const node of sortedNodes) {
    const name = node.function.name;
    const safeName = name.replace(/[^a-zA-Z0-9_]/g, '_');
    
    let style = '';
    if (node.function.isExported) {
      style = ':::exported';
    } else if (!node.isUsed) {
      style = ':::orphan';
    }

    lines.push(`  ${safeName}["${name}"]${style}`);
  }

  // Add edges
  for (const node of sortedNodes) {
    const from = node.function.name.replace(/[^a-zA-Z0-9_]/g, '_');
    
    for (const call of node.calls) {
      if (nodeNames.has(call.callee)) {
        const to = call.callee.replace(/[^a-zA-Z0-9_]/g, '_');
        lines.push(`  ${from} --> ${to}`);
      }
    }
  }

  // Add styling
  lines.push('');
  lines.push('  classDef exported fill:#9f9,stroke:#060,stroke-width:2px');
  lines.push('  classDef orphan fill:#f99,stroke:#900,stroke-width:2px');
  lines.push('```');

  return lines.join('\n');
}

/**
 * Generates a DOT graph (GraphViz format)
 * 
 * @param graph - Dependency graph
 * @param maxNodes - Maximum nodes to include
 * @returns DOT format string
 */
export function generateDOTGraph(
  graph: DependencyGraph,
  maxNodes = 50
): string {
  const lines: string[] = [];
  lines.push('digraph Dependencies {');
  lines.push('  rankdir=LR;');
  lines.push('  node [shape=box];');

  // Limit nodes
  const sortedNodes = Array.from(graph.nodes.values())
    .sort((a, b) => 
      (b.calls.length + b.calledBy.length) - (a.calls.length + a.calledBy.length)
    )
    .slice(0, maxNodes);

  const nodeNames = new Set(sortedNodes.map(n => n.function.name));

  // Add nodes
  for (const node of sortedNodes) {
    const name = JSON.stringify(node.function.name);
    let style = '';
    
    if (node.function.isExported) {
      style = ' [color=green, style=filled, fillcolor=lightgreen]';
    } else if (!node.isUsed) {
      style = ' [color=red, style=filled, fillcolor=lightpink]';
    }

    lines.push(`  ${name}${style};`);
  }

  // Add edges
  for (const node of sortedNodes) {
    const from = JSON.stringify(node.function.name);
    
    for (const call of node.calls) {
      if (nodeNames.has(call.callee)) {
        const to = JSON.stringify(call.callee);
        lines.push(`  ${from} -> ${to};`);
      }
    }
  }

  lines.push('}');
  return lines.join('\n');
}
