# Function Registry

Generated: 12/17/2025, 12:47:15 PM

## Summary

- **Total Functions**: 52
- **Total Files**: 18
- **Scanned Paths**: ./src

### Complexity Distribution

- 🟢 Simple (≤5): 40 (76.9%)
- 🟡 Moderate (6-10): 9 (17.3%)
- 🔴 Complex (>10): 3 (5.8%)

## Functions

| Name | File | Line | Params | Return Type | Complexity | Exported |
|------|------|------|--------|-------------|------------|----------|
| `exportCommand` | /Users/bernardwiesner/Documents/dev/personal/code-atlas/src/commands/export.ts:35 | 35 | options: import("/Users/bernardwiesner/Documents/dev/personal/code-atlas/src/commands/export").ExportOptions | `Promise<void>` | 🟡 7 | ✓ |
| `getDefaultOutputPath` | /Users/bernardwiesner/Documents/dev/personal/code-atlas/src/commands/export.ts:78 | 78 | format: string | `string` | 🟢 4 | ✓ |
| `exportToJSON` | /Users/bernardwiesner/Documents/dev/personal/code-atlas/src/commands/export.ts:94 | 94 | registry: import("/Users/bernardwiesner/Documents/dev/personal/code-atlas/src/types/index").Registry, includeDuplicates: boolean | `string` | 🟢 2 | ✓ |
| `exportToCSV` | /Users/bernardwiesner/Documents/dev/personal/code-atlas/src/commands/export.ts:105 | 105 | functions: import("/Users/bernardwiesner/Documents/dev/personal/code-atlas/src/types/index").FunctionMetadata[] | `string` | 🟢 3 | ✓ |
| `escapeCSV` | /Users/bernardwiesner/Documents/dev/personal/code-atlas/src/commands/export.ts:137 | 137 | value: string | `string` | 🟢 2 | ✓ |
| `exportToMarkdown` | /Users/bernardwiesner/Documents/dev/personal/code-atlas/src/commands/export.ts:147 | 147 | registry: import("/Users/bernardwiesner/Documents/dev/personal/code-atlas/src/types/index").Registry, includeDuplicates: boolean | `string` | 🔴 14 | ✓ |
| `reportCommand` | /Users/bernardwiesner/Documents/dev/personal/code-atlas/src/commands/report.ts:28 | 28 | options: import("/Users/bernardwiesner/Documents/dev/personal/code-atlas/src/commands/report").ReportOptions | `Promise<void>` | 🟢 4 | ✓ |
| `generateHTML` | /Users/bernardwiesner/Documents/dev/personal/code-atlas/src/commands/report.ts:57 | 57 | registry: any | `string` | 🟢 3 | ✓ |
| `scanCommand` | /Users/bernardwiesner/Documents/dev/personal/code-atlas/src/commands/scan.ts:29 | 29 | cliPaths: string[], cliOptions: import("/Users/bernardwiesner/Documents/dev/personal/code-atlas/src/types/index").ScanOptions | `Promise<void>` | 🟡 8 | ✓ |
| `searchCommand` | /Users/bernardwiesner/Documents/dev/personal/code-atlas/src/commands/search.ts:28 | 28 | query: string, options: import("/Users/bernardwiesner/Documents/dev/personal/code-atlas/src/types/index").SearchOptions | `Promise<void>` | 🟡 8 | ✓ |
| `searchFunctions` | /Users/bernardwiesner/Documents/dev/personal/code-atlas/src/commands/search.ts:71 | 71 | query: string, functions: import("/Users/bernardwiesner/Documents/dev/personal/code-atlas/src/types/index").FunctionMetadata[], limit: number | `import("/Users/bernardwiesner/Documents/dev/personal/code-atlas/src/types/index").SearchResult[]` | 🟡 8 | ✓ |
| `displayTable` | /Users/bernardwiesner/Documents/dev/personal/code-atlas/src/commands/search.ts:127 | 127 | results: import("/Users/bernardwiesner/Documents/dev/personal/code-atlas/src/types/index").SearchResult[] | `void` | 🟢 4 | ✓ |
| `simplifyType` | /Users/bernardwiesner/Documents/dev/personal/code-atlas/src/commands/search.ts:172 | 172 | type: string | `string` | 🟢 2 | ✓ |
| `displayJSON` | /Users/bernardwiesner/Documents/dev/personal/code-atlas/src/commands/search.ts:192 | 192 | results: import("/Users/bernardwiesner/Documents/dev/personal/code-atlas/src/types/index").SearchResult[] | `void` | 🟢 1 | ✓ |
| `displayMarkdown` | /Users/bernardwiesner/Documents/dev/personal/code-atlas/src/commands/search.ts:199 | 199 | results: import("/Users/bernardwiesner/Documents/dev/personal/code-atlas/src/types/index").SearchResult[] | `void` | 🟢 3 | ✓ |
| `displayInteractive` | /Users/bernardwiesner/Documents/dev/personal/code-atlas/src/commands/search.ts:221 | 221 | results: import("/Users/bernardwiesner/Documents/dev/personal/code-atlas/src/types/index").SearchResult[] | `Promise<void>` | 🟢 2 | ✓ |
| `statsCommand` | /Users/bernardwiesner/Documents/dev/personal/code-atlas/src/commands/stats.ts:20 | 20 | _none_ | `Promise<void>` | 🔴 11 | ✓ |
| `watchCommand` | /Users/bernardwiesner/Documents/dev/personal/code-atlas/src/commands/watch.ts:27 | 27 | cliPaths: string[], options: import("/Users/bernardwiesner/Documents/dev/personal/code-atlas/src/types/index").ScanOptions | `Promise<void>` | 🟢 4 | ✓ |
| `loadCache` | /Users/bernardwiesner/Documents/dev/personal/code-atlas/src/core/cache.ts:31 | 31 | _none_ | `Promise<import("/Users/bernardwiesner/Documents/dev/personal/code-atlas/src/core/cache").Cache>` | 🟢 3 | ✓ |
| `saveCache` | /Users/bernardwiesner/Documents/dev/personal/code-atlas/src/core/cache.ts:53 | 53 | cache: import("/Users/bernardwiesner/Documents/dev/personal/code-atlas/src/core/cache").Cache | `Promise<void>` | 🟢 2 | ✓ |
| `isFileCached` | /Users/bernardwiesner/Documents/dev/personal/code-atlas/src/core/cache.ts:71 | 71 | filePath: string, cache: import("/Users/bernardwiesner/Documents/dev/personal/code-atlas/src/core/cache").Cache | `Promise<boolean>` | 🟢 3 | ✓ |
| `getCachedFunctions` | /Users/bernardwiesner/Documents/dev/personal/code-atlas/src/core/cache.ts:89 | 89 | filePath: string, cache: import("/Users/bernardwiesner/Documents/dev/personal/code-atlas/src/core/cache").Cache | `import("/Users/bernardwiesner/Documents/dev/personal/code-atlas/src/types/index").FunctionMetadata[]` | 🟢 2 | ✓ |
| `updateCacheEntry` | /Users/bernardwiesner/Documents/dev/personal/code-atlas/src/core/cache.ts:100 | 100 | filePath: string, functions: import("/Users/bernardwiesner/Documents/dev/personal/code-atlas/src/types/index").FunctionMetadata[], cache: import("/Users/bernardwiesner/Documents/dev/personal/code-atlas/src/core/cache").Cache | `Promise<void>` | 🟢 2 | ✓ |
| `crawl` | /Users/bernardwiesner/Documents/dev/personal/code-atlas/src/core/crawler.ts:50 | 50 | rootPaths: string[], options: { ignore?: string[]; includeTests?: boolean; } | `Promise<import("/Users/bernardwiesner/Documents/dev/personal/code-atlas/src/types/index").CrawlResult>` | 🟢 5 | ✓ |
| `validatePaths` | /Users/bernardwiesner/Documents/dev/personal/code-atlas/src/core/crawler.ts:105 | 105 | paths: string[] | `string[]` | 🟢 1 | ✓ |
| `extractMetadata` | /Users/bernardwiesner/Documents/dev/personal/code-atlas/src/core/extractor.ts:26 | 26 | sourceFile: import("/Users/bernardwiesner/Documents/dev/personal/code-atlas/node_modules/ts-morph/lib/ts-morph").SourceFile | `import("/Users/bernardwiesner/Documents/dev/personal/code-atlas/src/types/index").FunctionMetadata[]` | 🟡 6 | ✓ |
| `extractFunctionMetadata` | /Users/bernardwiesner/Documents/dev/personal/code-atlas/src/core/extractor.ts:61 | 61 | func: import("/Users/bernardwiesner/Documents/dev/personal/code-atlas/node_modules/ts-morph/lib/ts-morph").FunctionDeclaration, sourceFile: import("/Users/bernardwiesner/Documents/dev/personal/code-atlas/node_modules/ts-morph/lib/ts-morph").SourceFile | `import("/Users/bernardwiesner/Documents/dev/personal/code-atlas/src/types/index").FunctionMetadata` | 🟢 2 | ✓ |
| `isExported` | /Users/bernardwiesner/Documents/dev/personal/code-atlas/src/core/extractor.ts:108 | 108 | func: import("/Users/bernardwiesner/Documents/dev/personal/code-atlas/node_modules/ts-morph/lib/ts-morph").FunctionDeclaration | `boolean` | 🟢 1 | ✓ |
| `extractParameters` | /Users/bernardwiesner/Documents/dev/personal/code-atlas/src/core/extractor.ts:118 | 118 | func: import("/Users/bernardwiesner/Documents/dev/personal/code-atlas/node_modules/ts-morph/lib/ts-morph").FunctionDeclaration | `import("/Users/bernardwiesner/Documents/dev/personal/code-atlas/src/types/index").Parameter[]` | 🟢 1 | ✓ |
| `extractJSDoc` | /Users/bernardwiesner/Documents/dev/personal/code-atlas/src/core/extractor.ts:140 | 140 | func: import("/Users/bernardwiesner/Documents/dev/personal/code-atlas/node_modules/ts-morph/lib/ts-morph").FunctionDeclaration | `string` | 🟢 2 | ✓ |
| `calculateComplexity` | /Users/bernardwiesner/Documents/dev/personal/code-atlas/src/core/extractor.ts:158 | 158 | func: import("/Users/bernardwiesner/Documents/dev/personal/code-atlas/node_modules/ts-morph/lib/ts-morph").FunctionDeclaration | `number` | 🟢 2 | ✓ |
| `generateASTHash` | /Users/bernardwiesner/Documents/dev/personal/code-atlas/src/core/extractor.ts:192 | 192 | func: import("/Users/bernardwiesner/Documents/dev/personal/code-atlas/node_modules/ts-morph/lib/ts-morph").FunctionDeclaration | `string` | 🟢 1 | ✓ |
| `normalizeAST` | /Users/bernardwiesner/Documents/dev/personal/code-atlas/src/core/extractor.ts:206 | 206 | func: import("/Users/bernardwiesner/Documents/dev/personal/code-atlas/node_modules/ts-morph/lib/ts-morph").FunctionDeclaration | `string` | 🟢 2 | ✓ |
| `escapeRegex` | /Users/bernardwiesner/Documents/dev/personal/code-atlas/src/core/extractor.ts:249 | 249 | str: string | `string` | 🟢 1 | ✓ |
| `getProject` | /Users/bernardwiesner/Documents/dev/personal/code-atlas/src/core/parser.ts:35 | 35 | _none_ | `import("/Users/bernardwiesner/Documents/dev/personal/code-atlas/node_modules/ts-morph/lib/ts-morph").Project` | 🟢 2 | ✓ |
| `parseFile` | /Users/bernardwiesner/Documents/dev/personal/code-atlas/src/core/parser.ts:67 | 67 | filePath: string | `Promise<import("/Users/bernardwiesner/Documents/dev/personal/code-atlas/node_modules/ts-morph/lib/ts-morph").SourceFile>` | 🟢 3 | ✓ |
| `parseFiles` | /Users/bernardwiesner/Documents/dev/personal/code-atlas/src/core/parser.ts:98 | 98 | filePaths: string[], useCache: boolean | `Promise<import("/Users/bernardwiesner/Documents/dev/personal/code-atlas/src/types/index").ParseResult[]>` | 🔴 13 | ✓ |
| `parseFilesInWorker` | /Users/bernardwiesner/Documents/dev/personal/code-atlas/src/core/parser.ts:203 | 203 | filePaths: string[], progressBar: import("/Users/bernardwiesner/Documents/dev/personal/code-atlas/node_modules/@types/cli-progress/index").SingleBar, offset: number | `Promise<{ functions: Map<string, import("/Users/bernardwiesner/Documents/dev/personal/code-atlas/src/types/index").FunctionMetadata[]>; errors: { filePath: string; error: string; }[]; }>` | 🟡 6 | ✓ |
| `resetProject` | /Users/bernardwiesner/Documents/dev/personal/code-atlas/src/core/parser.ts:263 | 263 | _none_ | `void` | 🟢 1 | ✓ |
| `createRegistry` | /Users/bernardwiesner/Documents/dev/personal/code-atlas/src/core/registry.ts:30 | 30 | functions: import("/Users/bernardwiesner/Documents/dev/personal/code-atlas/src/types/index").FunctionMetadata[], scannedPaths: string[], totalFiles: number | `import("/Users/bernardwiesner/Documents/dev/personal/code-atlas/src/types/index").Registry` | 🟢 1 | ✓ |
| `saveRegistry` | /Users/bernardwiesner/Documents/dev/personal/code-atlas/src/core/registry.ts:59 | 59 | registry: import("/Users/bernardwiesner/Documents/dev/personal/code-atlas/src/types/index").Registry, outputPath: string | `Promise<void>` | 🟢 4 | ✓ |
| `loadRegistry` | /Users/bernardwiesner/Documents/dev/personal/code-atlas/src/core/registry.ts:93 | 93 | inputPath: string | `Promise<import("/Users/bernardwiesner/Documents/dev/personal/code-atlas/src/types/index").Registry>` | 🟢 4 | ✓ |
| `detectDuplicates` | /Users/bernardwiesner/Documents/dev/personal/code-atlas/src/core/registry.ts:122 | 122 | functions: import("/Users/bernardwiesner/Documents/dev/personal/code-atlas/src/types/index").FunctionMetadata[] | `import("/Users/bernardwiesner/Documents/dev/personal/code-atlas/src/types/index").DuplicateGroup[]` | 🟢 4 | ✓ |
| `findNearDuplicates` | /Users/bernardwiesner/Documents/dev/personal/code-atlas/src/core/registry.ts:164 | 164 | functions: import("/Users/bernardwiesner/Documents/dev/personal/code-atlas/src/types/index").FunctionMetadata[] | `import("/Users/bernardwiesner/Documents/dev/personal/code-atlas/src/types/index").DuplicateGroup[]` | 🟡 8 | ✓ |
| `calculateSimilarity` | /Users/bernardwiesner/Documents/dev/personal/code-atlas/src/core/registry.ts:220 | 220 | str1: string, str2: string | `number` | 🟢 4 | ✓ |
| `levenshteinDistance` | /Users/bernardwiesner/Documents/dev/personal/code-atlas/src/core/registry.ts:237 | 237 | str1: string, str2: string | `number` | 🟡 9 | ✓ |
| `getRegistryPath` | /Users/bernardwiesner/Documents/dev/personal/code-atlas/src/core/registry.ts:276 | 276 | projectRoot: string | `string` | 🟢 1 | ✓ |
| `parseFilesInWorker` | /Users/bernardwiesner/Documents/dev/personal/code-atlas/src/core/worker.ts:24 | 24 | filePaths: string[] | `Promise<WorkerResult>` | 🟡 6 | ✓ |
| `loadConfig` | /Users/bernardwiesner/Documents/dev/personal/code-atlas/src/utils/config.ts:49 | 49 | startDir: string | `Promise<import("/Users/bernardwiesner/Documents/dev/personal/code-atlas/src/utils/config").ConfigFile>` | 🟢 4 | ✓ |
| `findConfigFile` | /Users/bernardwiesner/Documents/dev/personal/code-atlas/src/utils/config.ts:76 | 76 | startDir: string | `string` | 🟢 4 | ✓ |
| `mergeConfig` | /Users/bernardwiesner/Documents/dev/personal/code-atlas/src/utils/config.ts:108 | 108 | config: import("/Users/bernardwiesner/Documents/dev/personal/code-atlas/src/utils/config").ConfigFile, options: import("/Users/bernardwiesner/Documents/dev/personal/code-atlas/src/types/index").ScanOptions | `import("/Users/bernardwiesner/Documents/dev/personal/code-atlas/src/types/index").ScanOptions` | 🟢 2 | ✓ |
| `getPathsFromConfig` | /Users/bernardwiesner/Documents/dev/personal/code-atlas/src/utils/config.ts:131 | 131 | config: import("/Users/bernardwiesner/Documents/dev/personal/code-atlas/src/utils/config").ConfigFile, cliPaths: string[] | `string[]` | 🟢 3 | ✓ |

## High Complexity Functions

Top 10 most complex functions:

- **`exportToMarkdown`** (complexity: 14) - /Users/bernardwiesner/Documents/dev/personal/code-atlas/src/commands/export.ts:147
  > Exports registry to GitHub-flavored Markdown format
- **`parseFiles`** (complexity: 13) - /Users/bernardwiesner/Documents/dev/personal/code-atlas/src/core/parser.ts:98
  > Parses multiple files using worker threads and caching for optimal performance
- **`statsCommand`** (complexity: 11) - /Users/bernardwiesner/Documents/dev/personal/code-atlas/src/commands/stats.ts:20
  > Executes the stats command

## Exported Functions

52 of 52 functions are exported (100.0%)
