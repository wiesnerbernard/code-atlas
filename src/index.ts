/**
 * Code-Atlas main index
 * 
 * Exports the core API for programmatic usage.
 */

// Core modules
export { crawl, validatePaths } from './core/crawler.js';
export { parseFile, parseFiles, resetProject } from './core/parser.js';
export { extractMetadata } from './core/extractor.js';
export {
  createRegistry,
  saveRegistry,
  loadRegistry,
  getRegistryPath,
  DEFAULT_REGISTRY_PATH,
  REGISTRY_VERSION,
} from './core/registry.js';

// Commands
export { scanCommand } from './commands/scan.js';
export { searchCommand } from './commands/search.js';
export { statsCommand } from './commands/stats.js';

// Types
export type {
  FunctionMetadata,
  Parameter,
  Registry,
  DuplicateGroup,
  DuplicateReference,
  ScanOptions,
  SearchOptions,
  SearchResult,
  CrawlResult,
  SkippedFile,
  ParseResult,
} from './types/index.js';

// Utilities
export { logger } from './utils/logger.js';
