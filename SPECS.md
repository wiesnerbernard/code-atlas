# Technical Specifications

## Architecture Overview

Code-Atlas follows a **pipeline architecture** where each stage transforms data and passes it to the next:

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Crawler   │───▶│   Parser    │───▶│  Extractor  │───▶│  Registry   │
│ (fast-glob) │    │  (ts-morph) │    │  (metadata) │    │   (JSON)    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                  │                  │                  │
       │                  │                  │                  │
   Find files       Build AST          Extract info        Store index
```

---

## Pipeline Stages

### 1. Crawler (File Discovery)

**Responsibility:** Traverse the file system and find relevant source files.

**Technology:** `fast-glob` (10x faster than native glob)

**Input:** 
- Root directory path(s)
- Ignore patterns (e.g., `node_modules`, `dist`, `*.test.ts`)

**Output:** 
- Array of absolute file paths

**Logic:**
```typescript
const patterns = [
  '**/*.ts',
  '**/*.tsx',
  '**/*.js',
  '**/*.jsx'
];

const ignore = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/*.test.ts',
  '**/*.spec.ts'
];

const files = await glob(patterns, { 
  cwd: rootDir, 
  ignore, 
  absolute: true 
});
```

**Performance Target:** Scan 10,000 files in < 1 second

---

### 2. Parser (AST Generation)

**Responsibility:** Parse source files into Abstract Syntax Trees for analysis.

**Technology:** `ts-morph` (wrapper around TypeScript Compiler API)

**Input:** 
- File path

**Output:** 
- `SourceFile` object (AST representation)

**Logic:**
```typescript
import { Project } from 'ts-morph';

const project = new Project({
  skipAddingFilesFromTsConfig: true,
  compilerOptions: {
    allowJs: true,
    target: ts.ScriptTarget.ES2022
  }
});

const sourceFile = project.addSourceFileAtPath(filePath);
```

**Error Handling:**
- If a file fails to parse (syntax errors), **log warning and skip** (fail gracefully)
- Do not crash the entire scan for one bad file

---

### 3. Metadata Extractor

**Responsibility:** Extract structured information about functions from the AST.

**Input:** 
- `SourceFile` (AST)

**Output:** 
- Array of `FunctionMetadata` objects

**Extracted Metadata:**
| Field | Type | Description | Source |
|-------|------|-------------|--------|
| `name` | string | Function name | Node identifier |
| `filePath` | string | Absolute file path | SourceFile path |
| `line` | number | Line number (1-indexed) | Node location |
| `params` | Array<{name, type}> | Parameters | Function signature |
| `returnType` | string | Return type | Type annotation or `void` |
| `jsdoc` | string \| null | Documentation | JSDoc comment |
| `isExported` | boolean | Export status | Export declaration |
| `complexity` | number | Cyclomatic complexity | AST analysis |
| `astHash` | string | AST structure hash | SHA256 of normalized AST |

**Utility Identification Heuristics:**
1. **Exported functions** — Must have `export` keyword
2. **Directory hints** — Functions in `utils/`, `helpers/`, `lib/` are prioritized
3. **JSDoc presence** — Functions with documentation are likely utilities
4. **Pure function detection** — No side effects (no `console.log`, `fetch`, DOM access)
5. **Complexity threshold** — Cyclomatic complexity < 20 (not too complex to be a utility)

**Example:**
```typescript
/**
 * Formats a date according to ISO 8601 standard
 * @param date - The date to format
 * @returns ISO 8601 string
 */
export function formatDateISO(date: Date): string {
  return date.toISOString();
}
```

Extracted metadata:
```json
{
  "name": "formatDateISO",
  "filePath": "/project/src/utils/date.ts",
  "line": 10,
  "params": [{"name": "date", "type": "Date"}],
  "returnType": "string",
  "jsdoc": "Formats a date according to ISO 8601 standard",
  "isExported": true,
  "complexity": 1,
  "astHash": "a3f5e9c..."
}
```

---

### 4. Registry Builder (Storage)

**Responsibility:** Store extracted metadata in a searchable JSON file.

**Output Location:** `.code-atlas/registry.json`

**Schema:**
```typescript
interface Registry {
  version: string;          // Registry schema version
  generatedAt: string;      // ISO timestamp
  scannedPaths: string[];   // Root directories scanned
  totalFiles: number;       // Number of files scanned
  totalFunctions: number;   // Number of functions indexed
  functions: FunctionMetadata[];
  duplicates: DuplicateGroup[];
}

interface FunctionMetadata {
  name: string;
  filePath: string;
  line: number;
  params: Parameter[];
  returnType: string;
  jsdoc: string | null;
  isExported: boolean;
  complexity: number;
  astHash: string;
}

interface Parameter {
  name: string;
  type: string;
  optional: boolean;
  defaultValue?: string;
}

interface DuplicateGroup {
  astHash: string;
  functions: Array<{ name: string; filePath: string; line: number }>;
  similarity: number;  // 0.0 to 1.0
}
```

**Example Registry:**
```json
{
  "version": "0.1.0",
  "generatedAt": "2025-12-16T10:30:00Z",
  "scannedPaths": ["/project/src"],
  "totalFiles": 432,
  "totalFunctions": 89,
  "functions": [
    {
      "name": "formatDateISO",
      "filePath": "/project/src/utils/date.ts",
      "line": 10,
      "params": [{"name": "date", "type": "Date", "optional": false}],
      "returnType": "string",
      "jsdoc": "Formats a date according to ISO 8601 standard",
      "isExported": true,
      "complexity": 1,
      "astHash": "a3f5e9c..."
    }
  ],
  "duplicates": [
    {
      "astHash": "b2d8f1a...",
      "functions": [
        {"name": "capitalize", "filePath": "/src/utils/string.ts", "line": 5},
        {"name": "capitalizeString", "filePath": "/src/helpers/text.ts", "line": 12}
      ],
      "similarity": 0.98
    }
  ]
}
```

---

## Deduplication Strategy

**Goal:** Identify functions with identical or nearly-identical logic.

**Method:** AST-based structural hashing

### Algorithm

1. **Normalize the AST:**
   - Remove variable names (replace with placeholders: `_var1`, `_var2`)
   - Remove comments and whitespace
   - Standardize formatting

2. **Generate Hash:**
   - Serialize normalized AST to string
   - Compute SHA256 hash

3. **Compare Hashes:**
   - Functions with **identical hashes** → exact duplicates
   - Functions with **similar hashes** (Levenshtein distance < 10%) → potential duplicates

**Example:**
```typescript
// Function 1
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Function 2 (different name, same logic)
export function capitalizeString(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
```

Normalized AST (both functions):
```
FunctionDeclaration {
  params: [{ name: "_var1", type: "string" }]
  returnType: "string"
  body: {
    return: BinaryExpression {
      left: CallExpression(MemberAccess(_var1, "charAt"), [0]).toUpperCase()
      right: CallExpression(MemberAccess(_var1, "slice"), [1])
    }
  }
}
```

**Hash:** `b2d8f1a...` (identical for both)

**Result:** Flagged as duplicate in registry

---

## Search Implementation

### Indexing Strategy

For fast search, create an inverted index:
```typescript
interface SearchIndex {
  byName: Map<string, FunctionMetadata[]>;      // "formatDate" → [...]
  byKeyword: Map<string, FunctionMetadata[]>;   // "date" → [...]
  byFile: Map<string, FunctionMetadata[]>;      // "/utils/date.ts" → [...]
}
```

### Search Algorithm

1. **Tokenize query:** `"format date"` → `["format", "date"]`
2. **Match tokens** against:
   - Function names (exact, prefix, fuzzy)
   - JSDoc content (full-text search)
   - File paths
3. **Rank results** by relevance:
   - Exact match in name: +10
   - Prefix match in name: +5
   - Match in JSDoc: +2
   - Match in file path: +1
4. **Sort** by score (descending)

---

## Performance Targets

| Operation | Target | Notes |
|-----------|--------|-------|
| Scan 1,000 files | < 5 seconds | Including AST parsing |
| Scan 10,000 files | < 30 seconds | Large monorepo |
| Search query | < 100ms | Interactive fuzzy search |
| Registry size | < 5MB | For 10,000 functions |

---

## Extensibility Points

### Plugin System (Future)

Allow custom extractors:
```typescript
interface Extractor {
  name: string;
  match: (filePath: string) => boolean;
  extract: (sourceFile: SourceFile) => Metadata[];
}

// Example: React Hook extractor
const reactHookExtractor: Extractor = {
  name: 'react-hooks',
  match: (path) => path.includes('hooks/'),
  extract: (sf) => {
    // Find functions starting with "use"
    return sf.getFunctions()
      .filter(fn => fn.getName()?.startsWith('use'))
      .map(extractMetadata);
  }
};
```

### Export Formats (Future)

- **JSON** (default)
- **Markdown** (human-readable)
- **HTML** (interactive report with graph visualization)
- **SQLite** (for advanced querying)

---

## Security Considerations

1. **Sandbox execution:** Never `eval()` or execute scanned code
2. **Path traversal:** Validate all file paths are within scanned directory
3. **Resource limits:** Cap max file size (10MB), max files (100,000)
4. **Malicious AST:** Handle maliciously crafted files that crash the parser

---

## Testing Strategy

1. **Unit tests:** Each pipeline stage isolated
2. **Integration tests:** Full scan on sample codebases
3. **Snapshot tests:** Registry output for known inputs
4. **Performance tests:** Benchmark on large repos (10K+ files)
5. **Edge cases:**
   - Syntax errors in files
   - Circular dependencies
   - Unicode in function names
   - Extremely complex functions (1000+ lines)

---

## Open Questions

1. **Should we index class methods?** (Currently only standalone functions)
2. **How to handle overloaded functions?** (Multiple signatures)
3. **Should we support configuration files?** (`.code-atlasrc.json`)
4. **Watch mode for continuous indexing?** (`--watch` flag)
