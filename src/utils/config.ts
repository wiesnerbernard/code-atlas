/**
 * Configuration file loader
 * 
 * Handles loading and parsing .code-atlasrc.json configuration files.
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import type { ScanOptions } from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * Configuration file schema
 */
export interface ConfigFile {
  /** Glob patterns to ignore */
  ignore?: string[];
  
  /** Include test files in scan */
  includeTests?: boolean;
  
  /** Maximum cyclomatic complexity threshold */
  maxComplexity?: number;
  
  /** Output file path for registry */
  output?: string;
  
  /** Paths to scan (default: ['./src']) */
  paths?: string[];
}

/**
 * Loads configuration from .code-atlasrc.json
 * 
 * Searches for config file in current directory and parent directories.
 * 
 * @param startDir - Directory to start searching from (default: cwd)
 * @returns Configuration object or null if not found
 * 
 * @example
 * ```typescript
 * const config = await loadConfig();
 * if (config) {
 *   console.log('Using config:', config);
 * }
 * ```
 */
export async function loadConfig(startDir: string = process.cwd()): Promise<ConfigFile | null> {
  const configPath = findConfigFile(startDir);
  
  if (!configPath) {
    logger.debug('No .code-atlasrc.json found');
    return null;
  }

  try {
    const content = await readFile(configPath, 'utf-8');
    const config = JSON.parse(content) as ConfigFile;
    
    logger.debug(`Loaded config from ${configPath}`);
    return config;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`Failed to load config file: ${message}`);
    return null;
  }
}

/**
 * Finds .code-atlasrc.json by walking up directory tree
 * 
 * @param startDir - Directory to start searching from
 * @returns Path to config file or null
 */
function findConfigFile(startDir: string): string | null {
  let currentDir = startDir;
  const configFileName = '.code-atlasrc.json';

  // Walk up directory tree
  while (true) {
    const configPath = join(currentDir, configFileName);
    
    if (existsSync(configPath)) {
      return configPath;
    }

    const parentDir = join(currentDir, '..');
    
    // Stop at filesystem root
    if (parentDir === currentDir) {
      return null;
    }
    
    currentDir = parentDir;
  }
}

/**
 * Merges config file with CLI options
 * 
 * CLI options take precedence over config file.
 * 
 * @param config - Config file settings
 * @param options - CLI options
 * @returns Merged options
 */
export function mergeConfig(
  config: ConfigFile | null,
  options: ScanOptions
): ScanOptions {
  if (!config) {
    return options;
  }

  return {
    ignore: options.ignore ?? config.ignore,
    includeTests: options.includeTests ?? config.includeTests,
    maxComplexity: options.maxComplexity ?? config.maxComplexity,
    output: options.output ?? config.output,
  };
}

/**
 * Gets default paths from config or returns default
 * 
 * @param config - Config file settings
 * @param cliPaths - Paths from CLI arguments
 * @returns Array of paths to scan
 */
export function getPathsFromConfig(
  config: ConfigFile | null,
  cliPaths: string[]
): string[] {
  // CLI paths take precedence
  if (cliPaths.length > 0) {
    return cliPaths;
  }
  
  // Use config paths if available
  if (config?.paths && config.paths.length > 0) {
    return config.paths;
  }
  
  // Default to ./src
  return ['./src'];
}
