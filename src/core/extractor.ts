/**
 * Metadata extractor
 *
 * Responsible for extracting function metadata from parsed AST nodes.
 */

import type { FunctionDeclaration, SourceFile } from 'ts-morph';
import { SyntaxKind } from 'ts-morph';
import type { FunctionMetadata, Parameter } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { createHash } from 'crypto';

/**
 * Extracts metadata from all exported functions in a source file
 *
 * @param sourceFile - The ts-morph SourceFile to analyze
 * @returns Array of function metadata objects
 *
 * @example
 * ```typescript
 * const sourceFile = project.addSourceFileAtPath('./utils.ts');
 * const metadata = extractMetadata(sourceFile);
 * console.log(metadata.length); // Number of exported functions
 * ```
 */
export function extractMetadata(sourceFile: SourceFile): FunctionMetadata[] {
  const metadata: FunctionMetadata[] = [];

  try {
    // Get all function declarations
    const functions = sourceFile.getFunctions();

    for (const func of functions) {
      // Only process exported functions
      if (!isExported(func)) {
        continue;
      }

      const extracted = extractFunctionMetadata(func, sourceFile);
      if (extracted) {
        metadata.push(extracted);
      }
    }

    logger.debug(`Extracted ${metadata.length} functions from ${sourceFile.getFilePath()}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`Failed to extract metadata from ${sourceFile.getFilePath()}: ${message}`);
  }

  return metadata;
}

/**
 * Extracts metadata from a single function declaration
 *
 * @param func - Function declaration node
 * @param sourceFile - Parent source file
 * @returns Function metadata or null if extraction fails
 */
export function extractFunctionMetadata(
  func: FunctionDeclaration,
  sourceFile: SourceFile
): FunctionMetadata | null {
  try {
    const name = func.getName() ?? 'anonymous';
    const filePath = sourceFile.getFilePath();
    const line = func.getStartLineNumber();

    // Extract parameters
    const params = extractParameters(func);

    // Extract return type
    const returnType = func.getReturnType().getText();

    // Extract JSDoc
    const jsdoc = extractJSDoc(func);

    // Calculate complexity (simplified)
    const complexity = calculateComplexity(func);

    // Generate AST hash
    const astHash = generateASTHash(func);

    return {
      name,
      filePath,
      line,
      params,
      returnType,
      jsdoc,
      isExported: true,
      complexity,
      astHash,
    };
  } catch (error) {
    logger.debug(`Failed to extract metadata for function: ${error}`);
    return null;
  }
}

/**
 * Checks if a function is exported
 *
 * @param func - Function declaration to check
 * @returns True if function is exported
 */
function isExported(func: FunctionDeclaration): boolean {
  return func.isExported() || func.hasExportKeyword();
}

/**
 * Extracts parameter information from a function
 *
 * @param func - Function declaration
 * @returns Array of parameter metadata
 */
function extractParameters(func: FunctionDeclaration): Parameter[] {
  return func.getParameters().map((param) => {
    const name = param.getName();
    const type = param.getType().getText();
    const optional = param.isOptional();
    const defaultValue = param.getInitializer()?.getText();

    return {
      name,
      type,
      optional,
      defaultValue,
    };
  });
}

/**
 * Extracts JSDoc documentation from a function
 *
 * @param func - Function declaration
 * @returns JSDoc description or null
 */
function extractJSDoc(func: FunctionDeclaration): string | null {
  const jsDocs = func.getJsDocs();
  if (jsDocs.length === 0) {
    return null;
  }

  const description = jsDocs[0]?.getDescription().trim();
  return description || null;
}

/**
 * Calculates cyclomatic complexity (simplified version)
 *
 * Counts decision points: if, switch, loops, ternary, logical operators
 *
 * @param func - Function declaration
 * @returns Complexity score
 */
function calculateComplexity(func: FunctionDeclaration): number {
  let complexity = 1; // Base complexity

  func.forEachDescendant((node) => {
    const kind = node.getKind();

    // Decision points that increase complexity
    if (
      kind === SyntaxKind.IfStatement ||
      kind === SyntaxKind.ConditionalExpression ||
      kind === SyntaxKind.CaseClause ||
      kind === SyntaxKind.ForStatement ||
      kind === SyntaxKind.ForInStatement ||
      kind === SyntaxKind.ForOfStatement ||
      kind === SyntaxKind.WhileStatement ||
      kind === SyntaxKind.DoStatement ||
      kind === SyntaxKind.CatchClause
    ) {
      complexity++;
    }
  });

  return complexity;
}

/**
 * Generates a hash of the function's AST structure
 *
 * This is used for duplicate detection. The hash is based on the
 * normalized AST structure (with variable names replaced).
 *
 * @param func - Function declaration
 * @returns SHA256 hash of AST structure
 */
function generateASTHash(func: FunctionDeclaration): string {
  const normalized = normalizeAST(func);
  return createHash('sha256').update(normalized).digest('hex');
}

/**
 * Normalizes AST structure for duplicate detection
 *
 * Removes variable/parameter names, whitespace, and comments
 * to identify structurally similar functions.
 *
 * @param func - Function declaration
 * @returns Normalized AST string representation
 */
function normalizeAST(func: FunctionDeclaration): string {
  const body = func.getBody();
  if (!body) return '';

  let normalized = body.getText();

  // Replace all identifiers with placeholders
  const identifierMap = new Map<string, string>();

  // Get function parameters
  const params = func.getParameters();
  params.forEach((param, i) => {
    const name = param.getName();
    identifierMap.set(name, `_param${i}`);
  });

  // Replace parameter names in body
  identifierMap.forEach((placeholder, original) => {
    const regex = new RegExp(`\\b${escapeRegex(original)}\\b`, 'g');
    normalized = normalized.replace(regex, placeholder);
  });

  // Remove all comments
  normalized = normalized.replace(/\/\*[\s\S]*?\*\//g, '');
  normalized = normalized.replace(/\/\/.*/g, '');

  // Normalize whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();

  // Remove string literal content (keep quotes)
  normalized = normalized.replace(/"[^"]*"/g, '""');
  normalized = normalized.replace(/'[^']*'/g, "''");
  normalized = normalized.replace(/`[^`]*`/g, '``');

  // Remove number literals (replace with 0)
  normalized = normalized.replace(/\b\d+\.?\d*\b/g, '0');

  return normalized;
}

/**
 * Escapes special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
