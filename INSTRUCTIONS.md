# Development Instructions & Code Quality Standards

This document defines the coding standards, best practices, and architectural patterns for Code-Atlas. All contributors (including AI agents) must follow these guidelines.

---

## Core Principles

### 1. **Functional Programming Patterns**

Prefer **pure functions**, **immutability**, and **composition** over imperative code.

#### ✅ DO:
```typescript
// Pure function - no side effects
function calculateComplexity(node: Node): number {
  return node.getChildCount() + 1;
}

// Immutable data transformations
const utilities = functions
  .filter(isExported)
  .map(extractMetadata)
  .sort(byComplexity);
```

#### ❌ DON'T:
```typescript
// Mutation and side effects
function processFiles(files: string[]): void {
  globalRegistry.length = 0; // Mutation!
  files.forEach(file => {
    console.log(file); // Side effect in processing logic
    globalRegistry.push(parseFile(file));
  });
}
```

**Why:** Pure functions are easier to test, reason about, and parallelize.

---

### 2. **Strict Typing (No `any`)**

All functions, parameters, and return values **must be explicitly typed**. Use `unknown` if type is truly unknown.

#### ✅ DO:
```typescript
function extractMetadata(sourceFile: SourceFile): FunctionMetadata[] {
  const functions = sourceFile.getFunctions();
  return functions.map(fn => ({
    name: fn.getName() ?? 'anonymous',
    params: extractParams(fn.getParameters()),
    returnType: fn.getReturnType().getText()
  }));
}

interface FunctionMetadata {
  name: string;
  params: Parameter[];
  returnType: string;
}
```

#### ❌ DON'T:
```typescript
function extractMetadata(sourceFile: any): any {
  return sourceFile.getFunctions().map((fn: any) => ({
    name: fn.getName(),
    stuff: fn.getOtherStuff() // What is this?
  }));
}
```

**Why:** TypeScript's type system prevents bugs at compile time. `any` disables this safety.

---

### 3. **Comprehensive JSDoc**

All **public functions** and **complex internal logic** must have JSDoc comments.

#### Required Fields:
- `@description` — What does this function do?
- `@param` — Document each parameter
- `@returns` — What does it return?
- `@throws` — What errors can it throw?
- `@example` — Provide usage examples

#### ✅ DO:
```typescript
/**
 * Extracts metadata from a TypeScript source file by parsing its AST.
 * 
 * This function analyzes all exported functions in the file and extracts:
 * - Function name and signature
 * - Parameters with types
 * - Return type
 * - JSDoc documentation
 * - Cyclomatic complexity
 * 
 * @param sourceFile - The ts-morph SourceFile to analyze
 * @returns Array of extracted function metadata
 * @throws {Error} If the file cannot be parsed
 * 
 * @example
 * ```typescript
 * const sourceFile = project.addSourceFileAtPath('./utils/date.ts');
 * const metadata = extractMetadata(sourceFile);
 * console.log(metadata[0].name); // "formatDate"
 * ```
 */
export function extractMetadata(sourceFile: SourceFile): FunctionMetadata[] {
  // Implementation
}
```

#### ❌ DON'T:
```typescript
// Extracts stuff from files
function extractMetadata(sourceFile: SourceFile): FunctionMetadata[] {
  // Implementation
}
```

**Why:** Documentation is critical for maintainability and onboarding.

---

### 4. **Error Handling: Fail Gracefully**

Code-Atlas scans **user codebases**, which may contain:
- Syntax errors
- Malformed files
- Unsupported constructs

**Never crash the entire scan for one bad file.**

#### ✅ DO:
```typescript
async function parseFile(filePath: string): Promise<SourceFile | null> {
  try {
    return project.addSourceFileAtPath(filePath);
  } catch (error) {
    logger.warn(`Failed to parse ${filePath}: ${error.message}`);
    return null; // Continue processing other files
  }
}

const results = await Promise.all(
  files.map(file => parseFile(file))
);
const validFiles = results.filter(isNotNull);
```

#### ❌ DON'T:
```typescript
async function parseFile(filePath: string): Promise<SourceFile> {
  return project.addSourceFileAtPath(filePath); // Throws on error, crashes scan
}
```

**Strategy:**
1. **Catch errors** at the **lowest level** (file parsing, AST traversal)
2. **Log warnings** with context (file path, error message)
3. **Return `null` or default values** to continue processing
4. **Collect errors** and display summary at end

---

### 5. **Modular Architecture**

Each module should have a **single responsibility** and **minimal dependencies**.

**Dependency Flow (no circular dependencies):**
```
cli.ts → commands/ → core/ → types/
                      ↓
                    utils/
```

#### Module Guidelines:

**`src/types/`** — Type definitions only (no logic)
```typescript
// types/metadata.ts
export interface FunctionMetadata {
  name: string;
  filePath: string;
  // ...
}
```

**`src/core/`** — Core business logic (pure functions)
```typescript
// core/parser.ts
export function parseFile(path: string): SourceFile | null { }
export function extractFunctions(sourceFile: SourceFile): FunctionDeclaration[] { }
```

**`src/commands/`** — CLI command handlers (orchestration)
```typescript
// commands/scan.ts
export async function scanCommand(paths: string[], options: ScanOptions): Promise<void> {
  const files = await crawl(paths, options.ignore);
  const metadata = await processFiles(files);
  await saveRegistry(metadata, options.output);
}
```

**`src/utils/`** — Shared utilities (logger, file I/O, formatting)
```typescript
// utils/logger.ts
export const logger = {
  info: (msg: string) => console.log(chalk.blue(msg)),
  error: (msg: string) => console.error(chalk.red(msg))
};
```

---

## Code Style

### Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Files | kebab-case | `ast-parser.ts` |
| Functions | camelCase | `extractMetadata()` |
| Classes | PascalCase | `RegistryBuilder` |
| Interfaces | PascalCase | `FunctionMetadata` |
| Constants | UPPER_SNAKE_CASE | `DEFAULT_IGNORE_PATTERNS` |
| Private vars | prefix `_` | `_cache` |

### File Structure

```typescript
// 1. Imports (grouped: external, internal, types)
import { Project } from 'ts-morph';
import { extractMetadata } from './extractor.js';
import type { FunctionMetadata } from '../types/index.js';

// 2. Constants
const DEFAULT_COMPLEXITY_THRESHOLD = 20;

// 3. Types (if not in types/)
interface ParserOptions {
  skipTests: boolean;
}

// 4. Main logic (exported first, then private)
export function parseFiles(paths: string[]): FunctionMetadata[] {
  return paths.flatMap(_parseFile);
}

function _parseFile(path: string): FunctionMetadata[] {
  // Private helper
}
```

---

## Testing Requirements

### Unit Tests

Every **core module** must have tests:
```
src/core/parser.ts
src/core/parser.test.ts  ← Tests here
```

#### Test Structure:
```typescript
import { describe, it, expect } from 'vitest';
import { extractMetadata } from './extractor';

describe('extractMetadata', () => {
  it('should extract function name and parameters', () => {
    const sourceFile = createMockSourceFile(`
      export function add(a: number, b: number): number {
        return a + b;
      }
    `);
    
    const result = extractMetadata(sourceFile);
    
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('add');
    expect(result[0].params).toEqual([
      { name: 'a', type: 'number' },
      { name: 'b', type: 'number' }
    ]);
  });

  it('should handle files with no exported functions', () => {
    const sourceFile = createMockSourceFile(`const x = 10;`);
    expect(extractMetadata(sourceFile)).toEqual([]);
  });
});
```

### Coverage Target

- **Core logic:** 80% minimum
- **CLI commands:** 60% (harder to test)
- **Types:** No coverage needed

---

## Performance Guidelines

### File I/O

- Use **streaming** for large files
- **Parallelize** independent operations (Promise.all)
- **Limit concurrency** (don't open 10,000 files at once)

```typescript
// ✅ Process in batches
async function processFiles(files: string[]): Promise<Metadata[]> {
  const batchSize = 50;
  const results: Metadata[] = [];
  
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(parseFile));
    results.push(...batchResults);
  }
  
  return results;
}
```

### AST Parsing

- **Reuse Project instance** (don't create new Project per file)
- **Skip type checking** if not needed (`skipAddingFilesFromTsConfig: true`)

---

## Git Workflow

### Commit Messages

Follow **Conventional Commits**:
```
feat: add duplicate detection algorithm
fix: handle files with syntax errors gracefully
docs: update SPECS.md with deduplication strategy
refactor: extract metadata extraction to separate module
test: add tests for AST parser edge cases
```

### Branch Naming

```
feature/duplicate-detection
fix/parser-crash
docs/update-readme
```

---

## Security Checklist

- [ ] Never execute user code (`eval`, `Function()`)
- [ ] Validate file paths (prevent directory traversal)
- [ ] Limit resource usage (max file size, timeout)
- [ ] Sanitize output (escape HTML if generating reports)
- [ ] Handle malicious input gracefully (don't crash)

---

## Common Pitfalls

### ❌ Antipattern 1: Mixing I/O and Logic
```typescript
// BAD: File I/O mixed with parsing logic
function analyzeFile(path: string): Metadata {
  const content = fs.readFileSync(path, 'utf-8'); // I/O
  const ast = parseAST(content); // Logic
  return extractData(ast); // Logic
}
```

✅ **Solution:** Separate I/O from logic
```typescript
function readFile(path: string): string {
  return fs.readFileSync(path, 'utf-8');
}

function analyzeContent(content: string): Metadata {
  const ast = parseAST(content);
  return extractData(ast);
}

// Caller combines them
const content = readFile(path);
const metadata = analyzeContent(content);
```

### ❌ Antipattern 2: God Objects
```typescript
class CodeAnalyzer {
  scanFiles() { }
  parseAST() { }
  extractMetadata() { }
  searchFunctions() { }
  generateReport() { }
}
```

✅ **Solution:** Single-responsibility modules
```typescript
// Separate concerns
import { crawl } from './crawler.js';
import { parse } from './parser.js';
import { extract } from './extractor.js';
```

---

## Questions?

When in doubt:
1. Check existing code for patterns
2. Refer to SPECS.md for architecture
3. Favor simplicity over cleverness
4. Ask "Can this be a pure function?"
