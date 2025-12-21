# Code-Atlas 🗺️

[![CI](https://github.com/wiesnerbernard/code-atlas/actions/workflows/ci.yml/badge.svg)](https://github.com/wiesnerbernard/code-atlas/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/@bernardwiesner%2Fcode-atlas.svg)](https://www.npmjs.com/package/@bernardwiesner/code-atlas)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Stop duplicating utilities. Start discovering them.**

Code-Atlas is a CLI tool that scans your codebase, analyzes the AST (Abstract Syntax Tree), and builds a searchable local registry of utility functions. Say goodbye to "utility rot" where developers duplicate functions because they don't know they already exist.

## The Problem

In large codebases:
- 🔍 **Utilities are invisible** — Developers don't know what utility functions already exist
- 📦 **Duplication proliferates** — The same date formatter, validator, or helper gets written 5 different ways
- 🕰️ **Time is wasted** — Teams spend hours recreating functionality that's already there
- 🐛 **Bugs multiply** — Each duplicate introduces its own edge cases and bugs

## The Solution

Code-Atlas automatically:
1. **Scans** your codebase using fast file traversal
2. **Parses** TypeScript/JavaScript files via AST analysis
3. **Extracts** metadata (function signatures, JSDoc, parameters, return types)
4. **Indexes** everything into a searchable local registry
5. **Discovers** duplicate logic using AST-based hashing
6. **Visualizes** dependencies and identifies code quality issues
7. **Tracks** code history with Git integration

## ✨ Features

- 🔍 **Smart Search** - Fuzzy finding with interactive or JSON output
- 📊 **Stats & Analytics** - Complexity analysis and duplicate detection
- 📈 **Dependency Graphs** - Visualize function relationships (Mermaid, DOT, JSON)
- 📤 **Multi-Format Export** - JSON, CSV, and Markdown for CI/CD and documentation
- 🔥 **Git Integration** - Track authors, churn metrics, and identify hot spots
- 📝 **HTML Reports** - Interactive visual function maps
- ⚡ **Watch Mode** - Auto-update registry on file changes
- 🎯 **Dead Code Detection** - Find orphaned and unused functions

## Installation

### Global Installation (Recommended)
```bash
npm install -g @bernardwiesner/code-atlas
```

### Local Installation
```bash
npm install --save-dev @bernardwiesner/code-atlas
```

### Usage via npx
```bash
npx @bernardwiesner/code-atlas scan ./src
```

## Usage

### Scan Your Codebase
Generate a registry of all utility functions:
```bash
code-atlas scan ./src
```

Options:
```bash
# Ignore patterns and set output path
code-atlas scan ./src --ignore "**/*.test.ts" --output .code-atlas/registry.json

# Include test files
code-atlas scan ./src --include-tests

# Filter by complexity threshold
code-atlas scan ./src --max-complexity 10

# Include Git metadata (author, dates, churn)
code-atlas scan ./src --include-git

# Disable cache for fresh parse
code-atlas scan ./src --no-cache
```

### Configuration File

Create a `.code-atlasrc.json` file in your project root to configure default settings:

```json
{
  "paths": ["./src"],
  "ignore": [
    "**/legacy/**",
    "**/vendor/**",
    "**/__mocks__/**"
  ],
  "includeTests": false,
  "maxComplexity": 20,
  "output": ".code-atlas/registry.json"
}
```

**Configuration Options:**
- `paths`: Directories to scan (default: `["./src"]`)
- `ignore`: Additional glob patterns to ignore (always excludes `node_modules`, `dist`, `build`, `.git`)
- `includeTests`: Include test files in scan (default: `false`)
- `maxComplexity`: Maximum cyclomatic complexity threshold
- `output`: Output file path for registry

**Note:** `node_modules`, `dist`, `build`, `.git`, and `coverage` are **always ignored** and cannot be overridden. The `ignore` option allows you to add additional patterns specific to your project.

### Export Registry
Export your function registry in multiple formats:

```bash
# Export to JSON (default)
code-atlas export

# Export to CSV for spreadsheet analysis
code-atlas export --format csv --output functions.csv

# Export to Markdown with duplicates
code-atlas export --format markdown --include-duplicates --output FUNCTIONS.md
```

**Export formats:**
- **JSON**: Full registry for CI/CD pipelines
- **CSV**: Spreadsheet-friendly with proper escaping
- **Markdown**: GitHub-flavored with tables and statistics

### Visualize Dependencies
Generate dependency graphs to understand code structure:

```bash
# Generate Mermaid diagram (works in GitHub markdown)
code-atlas graph --format mermaid --output deps.md

# Generate DOT graph for GraphViz
code-atlas graph --format dot --output deps.dot

# JSON with orphan and circular dependency details
code-atlas graph --format json --show-orphans --show-circular

# Limit graph size for large codebases
code-atlas graph --max-nodes 50
```

The graph command identifies:
- 🔴 **Orphaned functions** - Never called (potential dead code)
- 🔄 **Circular dependencies** - Functions that call each other
- 🎯 **Entry points** - Exported functions with no dependencies

### Search for Functions
Find utilities interactively:
```bash
code-atlas search "date"
```

This opens an interactive fuzzy finder showing:
- Function names
- File locations
- Parameters and return types
- JSDoc descriptions

### Search Non-Interactively
```bash
code-atlas search "formatDate" --json
```

Output:
```json
{
  "results": [
    {
      "name": "formatDate",
      "file": "src/utils/date.ts",
      "line": 10,
      "params": [{"name": "date", "type": "Date"}, {"name": "format", "type": "string"}],
      "returnType": "string",
      "jsdoc": "Formats a date according to the specified format string"
    }
  ]
}
```

### View Stats
```bash
code-atlas stats
```

Shows:
- Total functions indexed
- Complexity distribution (simple, moderate, complex, very complex)
- Most complex functions
- Potential duplicates (by AST hash)
- Git metadata (if scanned with `--include-git`)

### Generate HTML Report
Create an interactive visual report:
```bash
code-atlas report --output report.html
```

### Watch Mode
Automatically update registry on file changes:
```bash
code-atlas watch ./src
```

## Registry Storage

By default, Code-Atlas stores the registry in `.code-atlas/registry.json` within your project root. This keeps the index local to each codebase.

**Tip:** Add `.code-atlas/` to your `.gitignore` unless you want to commit the registry.

## What Gets Indexed?

Code-Atlas identifies "utilities" using heuristics:
- ✅ Exported functions (named exports, default exports)
- ✅ Pure functions (no side effects detected)
- ✅ Helper functions in `utils/`, `helpers/`, `lib/` directories
- ✅ Functions with JSDoc annotations
- ❌ React components, classes, and framework-specific code
- ❌ Test files (`*.test.ts`, `*.spec.ts`) - unless `--include-tests` is used

## What Gets Ignored?

Code-Atlas **always** excludes these directories (cannot be overridden):
- `node_modules/` - Third-party dependencies
- `dist/`, `build/` - Build outputs
- `.git/` - Version control
- `coverage/` - Test coverage reports
- Test files - `*.test.*`, `*.spec.*` (unless `--include-tests`)
- Type definitions - `*.d.ts`

You can add additional ignore patterns via the config file or `--ignore` flag.

## Use Cases

### For Developers
- 🔍 **Discovery**: Find existing utilities before writing duplicates
- 📊 **Refactoring**: Identify complex functions that need simplification
- 🔥 **Hot Spots**: Find high-risk code (complex + frequently changing)
- 🎯 **Dead Code**: Detect orphaned functions that are never called

### For Teams
- 📈 **Code Review**: Export to Markdown for PR documentation
- 📉 **Tech Debt**: Track complexity trends over time
- 🤝 **Onboarding**: Help new developers discover existing utilities
- 📊 **Metrics**: Export to CSV for team dashboards

### For CI/CD
- ✅ **Quality Gates**: Fail builds if complexity exceeds thresholds
- 📤 **Documentation**: Auto-generate function catalogs
- 🔄 **Change Detection**: Track which utilities changed in each PR

## Roadmap

### ✅ v0.4.0 (Current)
- ✅ Export command (JSON, CSV, Markdown)
- ✅ Dependency graph visualization (Mermaid, DOT, JSON)
- ✅ Git integration (author, dates, churn metrics, hot spots)
- ✅ Orphan and circular dependency detection

### v0.5.0
- [ ] VS Code extension for inline function search
- [ ] Hot spot command with risk scoring
- [ ] Custom metrics and plugin system
- [ ] Performance improvements for large codebases

### v0.6.0
- [ ] Web UI dashboard for interactive browsing
- [ ] Team collaboration features
- [ ] API analysis (unused exports, breaking changes)
- [ ] Integration with documentation generators

### v1.0.0
- [ ] Multi-language support (Python, Go, Rust)
- [ ] Cloud sync for team-wide registries
- [ ] AI-powered function recommendations
- [ ] GitHub Action for automated PR comments

## Architecture

Code-Atlas follows a pipeline architecture:

```
Crawler (fast-glob) 
  → Parser (ts-morph AST) 
    → Metadata Extractor 
      → Registry Builder (JSON)
        → Search Index
```

See [SPECS.md](SPECS.md) for detailed technical specifications.

## Contributing

We welcome contributions! Please read [INSTRUCTIONS.md](INSTRUCTIONS.md) for code quality standards and development practices.

### Development Setup
```bash
git clone https://github.com/wiesnerbernard/code-atlas.git
cd code-atlas
npm install
npm run dev -- scan ./examples
```

## License

MIT © Bernard Wiesner

## Credits

Built with:
- [ts-morph](https://github.com/dsherret/ts-morph) — TypeScript AST manipulation
- [commander](https://github.com/tj/commander.js) — CLI framework
- [inquirer](https://github.com/SBoudrias/Inquirer.js) — Interactive prompts
- [chalk](https://github.com/chalk/chalk) — Terminal styling
- [fast-glob](https://github.com/mrmlnc/fast-glob) — Fast file traversal
