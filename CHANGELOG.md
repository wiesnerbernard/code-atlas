# Changelog

All notable changes to Code-Atlas will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.1] - 2025-12-21

### Added

#### PR Integration Features (GitHub Actions)
- **Automatic PR Comments**: Posts analysis results directly on pull requests
  - Statistics summary (functions, complexity, etc.)
  - Warnings when thresholds are exceeded
  - Circular dependency detection and listing
  - Embedded Mermaid dependency graphs
  - Links to detailed artifact reports
- **GitHub Step Summary**: Displays stats and diagrams in workflow summary
- **Enhanced Artifacts**: Now includes `stats.txt` and `stats.json` for easier consumption

### Improved
- Better visibility of code quality metrics in PRs
- Streamlined review process with automatic reporting

## [0.5.0] - 2025-12-21

### Added

#### Interactive Setup Wizard
- New `init` command - Interactive setup wizard to configure code-atlas
- Automatically generates:
  - `.code-atlas.json` configuration file
  - CI/CD workflow files (GitHub Actions, GitLab CI, or CircleCI)
  - `.gitignore` entries for code-atlas outputs
- Interactive prompts for:
  - CI platform selection (GitHub, GitLab, CircleCI, or none)
  - Git metadata inclusion
  - Quality gates (circular dependencies, complexity thresholds)
  - Output formats (Mermaid, DOT, JSON)
  - HTML report generation
  - Test file inclusion
  - Custom ignore patterns
- Smart file handling with overwrite confirmation
- Platform-specific CI templates with customized checks

### Fixed
- CI workflow templates now use `--include-tests` flag correctly (not `--no-include-tests`)
- Fixed flag handling in all CI platform templates (GitHub Actions, GitLab CI, CircleCI)

### Dependencies
- Added `@inquirer/prompts` for interactive CLI prompts

## [0.4.0] - 2025-12-18

### Added

#### Export Command
- New `export` command to export registry in multiple formats
- **JSON format**: Full registry export for CI/CD pipelines and programmatic access
- **CSV format**: Spreadsheet-friendly format with proper escaping for data analysis
- **Markdown format**: GitHub-flavored markdown with tables, statistics, and complexity distribution
- `--include-duplicates` flag to optionally include duplicate detection in exports
- Comprehensive test suite with 12 test cases covering all export formats

#### Dependency Graph Visualization
- New `graph` command to analyze and visualize function dependencies
- **Mermaid format**: Interactive diagrams for GitHub/GitLab markdown
- **DOT format**: GraphViz-compatible graphs for advanced visualization tools
- **JSON format**: Machine-readable dependency data for programmatic analysis
- Automatic detection of:
  - Orphaned functions (potential dead code)
  - Circular dependencies
  - Entry points (exported functions with no dependencies)
- `--max-nodes` option to limit graph size for large codebases
- AST-based function call extraction using ts-morph
- DFS algorithm for circular dependency detection
- 11 comprehensive tests covering all graph functionality

#### Git Integration
- New `--include-git` flag for the `scan` command
- Enriches function metadata with Git history:
  - Last author and modification date
  - Commit count per function
  - Lines added/deleted
- **Churn metrics**: Identifies frequently changing code
- **Hot spot detection**: Finds high-risk functions using complexity × churn formula
- Batch processing of Git operations (10 concurrent) for performance
- 11 tests covering Git blame parsing, metadata enrichment, and hot spot detection

### Improved
- Enhanced scan command with Git metadata support
- Added caching support with `--no-cache` flag
- Better test infrastructure with Vitest
- Improved parser with concurrent file processing

### Technical
- Added `src/commands/export.ts` and `src/commands/export.test.ts`
- Added `src/commands/graph.ts` 
- Added `src/core/dependencies.ts` and `src/core/dependencies.test.ts`
- Added `src/core/git.ts` and `src/core/git.test.ts`
- Added `vitest.config.ts` for test configuration
- Updated `ScanOptions` interface with `includeGit` and `noCache` options
- Added dependency graph metadata to Registry interface

## [0.3.0] - 2025-12-16

### Added
- Interactive HTML report generation
- Watch mode for automatic registry updates
- Configuration file support (.code-atlas.json)
- Complexity filtering with `--max-complexity` flag

## [0.2.0] - 2025-12-15

### Added
- Initial release with core functionality
- Scan command for codebase analysis
- Search command with fuzzy finding
- Stats command for registry overview
- Duplicate detection based on AST hashing
- Support for TypeScript and JavaScript files

## [0.1.0] - 2025-12-14

### Added
- Project initialization
- Basic CLI structure
- AST parsing with ts-morph

[0.4.0]: https://github.com/wiesnerbernard/code-atlas/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/wiesnerbernard/code-atlas/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/wiesnerbernard/code-atlas/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/wiesnerbernard/code-atlas/releases/tag/v0.1.0
