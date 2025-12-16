# Code-Atlas 🗺️

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
code-atlas scan ./src --ignore "**/*.test.ts" --output .code-atlas/registry.json
```

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
- Most used utilities
- Potential duplicates (by AST hash)

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
- ❌ Test files (`*.test.ts`, `*.spec.ts`)

## Roadmap

### v0.2.0
- [ ] HTML report generation with visual function map
- [ ] Duplicate detection based on AST similarity
- [ ] Support for JavaScript (not just TypeScript)

### v0.3.0
- [ ] AI-powered function descriptions (using local LLMs)
- [ ] VS Code extension for inline search
- [ ] GitHub Action for PR comments ("This PR adds 3 utilities, 2 are duplicates")

### v1.0.0
- [ ] Multi-language support (Python, Go, Rust)
- [ ] Cloud sync for team-wide registries
- [ ] API for programmatic access

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
