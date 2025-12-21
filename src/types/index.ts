/**
 * Type definitions for Code-Atlas
 *
 * This module contains all shared TypeScript interfaces and types
 * used across the application.
 */

/**
 * Metadata extracted from a utility function
 */
export interface FunctionMetadata {
  /** Function name (or 'anonymous' for unnamed functions) */
  name: string;

  /** Absolute file path */
  filePath: string;

  /** Line number where function is declared (1-indexed) */
  line: number;

  /** Function parameters with types */
  params: Parameter[];

  /** Return type as string */
  returnType: string;

  /** JSDoc documentation (null if not present) */
  jsdoc: string | null;

  /** Whether function is exported */
  isExported: boolean;

  /** Cyclomatic complexity score */
  complexity: number;

  /** SHA256 hash of normalized AST structure */
  astHash: string;
}

/**
 * Function parameter metadata
 */
export interface Parameter {
  /** Parameter name */
  name: string;

  /** Parameter type as string */
  type: string;

  /** Whether parameter is optional */
  optional: boolean;

  /** Default value if present */
  defaultValue?: string;
}

/**
 * Complete registry structure
 */
export interface Registry {
  /** Registry schema version */
  version: string;

  /** ISO timestamp when registry was generated */
  generatedAt: string;

  /** Root directories that were scanned */
  scannedPaths: string[];

  /** Total number of files scanned */
  totalFiles: number;

  /** Total number of functions indexed */
  totalFunctions: number;

  /** Array of all function metadata */
  functions: FunctionMetadata[];

  /** Detected duplicate function groups */
  duplicates: DuplicateGroup[];

  /** Dependency graph data (optional) */
  dependencies?: {
    orphanCount: number;
    circularCount: number;
    avgDependencies: number;
  };
}

/**
 * Group of functions with similar or identical logic
 */
export interface DuplicateGroup {
  /** AST hash that these functions share */
  astHash: string;

  /** Array of function references */
  functions: DuplicateReference[];

  /** Similarity score (0.0 to 1.0) */
  similarity: number;
}

/**
 * Reference to a function in a duplicate group
 */
export interface DuplicateReference {
  /** Function name */
  name: string;

  /** File path */
  filePath: string;

  /** Line number */
  line: number;
}

/**
 * Options for the scan command
 */
export interface ScanOptions {
  /** Glob patterns to ignore */
  ignore?: string[];

  /** Output file path for registry */
  output?: string;

  /** Include test files in scan */
  includeTests?: boolean;

  /** Maximum cyclomatic complexity threshold */
  maxComplexity?: number;

  /** Include Git metadata (author, dates, churn) */
  includeGit?: boolean;

  /** Disable caching for fresh parse */
  noCache?: boolean;
}

/**
 * Options for the search command
 */
export interface SearchOptions {
  /** Output format (table, json, markdown) */
  format?: 'table' | 'json' | 'markdown';

  /** Interactive mode with fuzzy search */
  interactive?: boolean;

  /** Maximum number of results */
  limit?: number;
}

/**
 * Search result with relevance score
 */
export interface SearchResult {
  /** The matched function metadata */
  metadata: FunctionMetadata;

  /** Relevance score (higher is better) */
  score: number;

  /** Matched fields (name, jsdoc, path) */
  matchedFields: string[];
}

/**
 * Result of a file crawl operation
 */
export interface CrawlResult {
  /** Absolute file paths found */
  files: string[];

  /** Files that were skipped (with reasons) */
  skipped: SkippedFile[];

  /** Time taken in milliseconds */
  duration: number;
}

/**
 * Information about a skipped file
 */
export interface SkippedFile {
  /** File path */
  path: string;

  /** Reason for skipping */
  reason: string;
}

/**
 * Result of parsing a single file
 */
export interface ParseResult {
  /** File path */
  filePath: string;

  /** Extracted metadata (empty if parse failed) */
  metadata: FunctionMetadata[];

  /** Error message if parsing failed */
  error?: string;
}

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
