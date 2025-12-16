/**
 * Search command - searches registry for functions
 */

import inquirer from 'inquirer';
import Table from 'cli-table3';
import chalk from 'chalk';
import type { SearchOptions, SearchResult, FunctionMetadata } from '../types/index.js';
import { loadRegistry } from '../core/registry.js';
import { logger } from '../utils/logger.js';

/**
 * Executes the search command
 * 
 * Searches the registry for functions matching the query.
 * 
 * @param query - Search query string
 * @param options - Search options
 * 
 * @example
 * ```typescript
 * await searchCommand('format date', { 
 *   interactive: true,
 *   limit: 10
 * });
 * ```
 */
export async function searchCommand(query: string, options: SearchOptions): Promise<void> {
  try {
    // Load registry
    const registry = await loadRegistry();

    if (registry.functions.length === 0) {
      logger.warn('Registry is empty. Run "code-atlas scan" first.');
      return;
    }

    // Perform search
    const results = searchFunctions(query, registry.functions, options.limit ?? 20);

    if (results.length === 0) {
      logger.warn(`No results found for "${query}"`);
      return;
    }

    // Display results based on format
    if (options.interactive) {
      await displayInteractive(results);
    } else if (options.format === 'json') {
      displayJSON(results);
    } else if (options.format === 'markdown') {
      displayMarkdown(results);
    } else {
      displayTable(results);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Search failed: ${message}`);
    throw error;
  }
}

/**
 * Searches functions using keyword matching and scoring
 * 
 * @param query - Search query
 * @param functions - Array of functions to search
 * @param limit - Maximum number of results
 * @returns Sorted search results
 */
function searchFunctions(
  query: string,
  functions: FunctionMetadata[],
  limit: number
): SearchResult[] {
  const queryLower = query.toLowerCase();
  const tokens = queryLower.split(/\s+/);

  const results: SearchResult[] = [];

  for (const func of functions) {
    let score = 0;
    const matchedFields: string[] = [];

    // Exact name match
    if (func.name.toLowerCase() === queryLower) {
      score += 10;
      matchedFields.push('name');
    }
    // Prefix match
    else if (func.name.toLowerCase().startsWith(queryLower)) {
      score += 5;
      matchedFields.push('name');
    }
    // Name contains any token
    else if (tokens.some((token) => func.name.toLowerCase().includes(token))) {
      score += 3;
      matchedFields.push('name');
    }

    // JSDoc match
    if (func.jsdoc && tokens.some((token) => func.jsdoc?.toLowerCase().includes(token))) {
      score += 2;
      matchedFields.push('jsdoc');
    }

    // File path match
    if (tokens.some((token) => func.filePath.toLowerCase().includes(token))) {
      score += 1;
      matchedFields.push('path');
    }

    if (score > 0) {
      results.push({ metadata: func, score, matchedFields });
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  return results.slice(0, limit);
}

/**
 * Displays results in table format
 */
function displayTable(results: SearchResult[]): void {
  const table = new Table({
    head: ['Name', 'File', 'Line', 'Params', 'Description'],
    colWidths: [25, 35, 6, 30, 40],
    wordWrap: true,
  });

  for (const result of results) {
    const { metadata } = result;
    const params = metadata.params.map((p) => `${p.name}: ${p.type}`).join(', ');
    const desc = metadata.jsdoc?.substring(0, 60) ?? '';

    table.push([
      chalk.blue(metadata.name),
      metadata.filePath,
      metadata.line.toString(),
      params,
      desc,
    ]);
  }

  console.log(table.toString());
  logger.info(`\nFound ${results.length} results`);
}

/**
 * Displays results in JSON format
 */
function displayJSON(results: SearchResult[]): void {
  console.log(JSON.stringify({ results }, null, 2));
}

/**
 * Displays results in Markdown format
 */
function displayMarkdown(results: SearchResult[]): void {
  console.log('# Search Results\n');

  for (const result of results) {
    const { metadata } = result;
    const params = metadata.params.map((p) => `${p.name}: ${p.type}`).join(', ');

    console.log(`## ${metadata.name}\n`);
    console.log(`**File:** ${metadata.filePath}:${metadata.line}\n`);
    console.log(`**Signature:** \`${metadata.name}(${params}): ${metadata.returnType}\`\n`);

    if (metadata.jsdoc) {
      console.log(`**Description:** ${metadata.jsdoc}\n`);
    }

    console.log('---\n');
  }
}

/**
 * Displays results with interactive selection
 */
async function displayInteractive(results: SearchResult[]): Promise<void> {
  const choices = results.map((result) => {
    const { metadata } = result;
    const params = metadata.params.map((p) => `${p.name}: ${p.type}`).join(', ');

    return {
      name: `${metadata.name}(${params}) - ${metadata.filePath}:${metadata.line}`,
      value: metadata,
    };
  });

  const answer = await inquirer.prompt<{ selected: FunctionMetadata }>([
    {
      type: 'list',
      name: 'selected',
      message: 'Select a function to view details:',
      choices,
      pageSize: 15,
    },
  ]);

  // Display detailed info about selected function
  console.log('\n' + chalk.bold('Function Details:'));
  console.log(chalk.blue('Name:'), answer.selected.name);
  console.log(chalk.blue('File:'), `${answer.selected.filePath}:${answer.selected.line}`);
  console.log(
    chalk.blue('Signature:'),
    `${answer.selected.name}(${answer.selected.params.map((p) => `${p.name}: ${p.type}`).join(', ')}): ${answer.selected.returnType}`
  );
  console.log(chalk.blue('Complexity:'), answer.selected.complexity);

  if (answer.selected.jsdoc) {
    console.log(chalk.blue('Documentation:'));
    console.log(answer.selected.jsdoc);
  }
}
