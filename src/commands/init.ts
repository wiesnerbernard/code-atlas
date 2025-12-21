/**
 * Init command - Interactive setup wizard for code-atlas
 *
 * Generates configuration files, CI workflows, and sets up the project
 */

import { input, select, confirm, checkbox } from '@inquirer/prompts';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { logger } from '../utils/logger.js';
import chalk from 'chalk';

interface SetupConfig {
  ciPlatform: 'github' | 'gitlab' | 'circleci' | 'none';
  enableGitMetadata: boolean;
  failOnCircularDeps: boolean;
  complexityThreshold: number | null;
  graphFormats: string[];
  generateReport: boolean;
  includeTests: boolean;
  customIgnorePatterns: string[];
  prCommentMode: 'full' | 'changes-only';
}

const GITHUB_ACTIONS_TEMPLATE = (config: SetupConfig): string => `name: Code Atlas Analysis

on:
  push:
    branches: [main, develop]
  pull_request:
    types: [opened, reopened, labeled]
  workflow_dispatch:

permissions:
  contents: read
  pull-requests: write
  issues: write

jobs:
  analyze:
    # Only run on: manual trigger, PR open/reopen, or when 'run-analysis' label is added
    if: |
      github.event_name == 'push' ||
      github.event_name == 'workflow_dispatch' ||
      github.event.action == 'opened' ||
      github.event.action == 'reopened' ||
      contains(github.event.pull_request.labels.*.name, 'run-analysis')
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for git metadata
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install code-atlas
        run: npm install -g @bernardwiesner/code-atlas
      
      - name: Scan codebase
        run: code-atlas scan${config.enableGitMetadata ? ' --include-git' : ''}${config.includeTests ? ' --include-tests' : ''}
${
  config.complexityThreshold
    ? `      
      - name: Check complexity threshold
        run: |
          MAX_COMPLEXITY=${config.complexityThreshold}
          ACTUAL=$(code-atlas stats --format json | jq -r '.averageComplexity // 0')
          echo "Average complexity: $ACTUAL (threshold: $MAX_COMPLEXITY)"
          if (( $(echo "$ACTUAL > $MAX_COMPLEXITY" | bc -l) )); then
            echo "❌ Code complexity exceeds threshold!"
            exit 1
          fi
`
    : ''
}${
  config.failOnCircularDeps
    ? `      
      - name: Check for circular dependencies
        run: |
          code-atlas graph --format json --output deps.json
          if grep -q '"circular":true' deps.json; then
            echo "❌ Circular dependencies detected!"
            code-atlas graph --format json | jq '.nodes[] | select(.circular==true) | .id'
            exit 1
          fi
          echo "✓ No circular dependencies found"
`
    : ''
}${
  config.graphFormats.length > 0
    ? `      
      - name: Generate dependency graphs
        run: |
${config.graphFormats.map((fmt) => `          code-atlas graph --format ${fmt} --output dependency-graph.${fmt === 'mermaid' ? 'md' : fmt}`).join('\n')}
`
    : ''
}${
  config.generateReport
    ? `      
      - name: Generate HTML report
        run: code-atlas report --output code-atlas-report.html
`
    : ''
}      
      - name: Collect statistics
        id: stats
        run: |
          code-atlas stats > stats.txt
          code-atlas stats --format json > stats.json
          cat stats.txt
          
          # Extract key metrics
          TOTAL_FUNCTIONS=$(jq -r '.totalFunctions // 0' stats.json)
          AVG_COMPLEXITY=$(jq -r '.averageComplexity // 0' stats.json)
          echo "total_functions=$TOTAL_FUNCTIONS" >> $GITHUB_OUTPUT
          echo "avg_complexity=$AVG_COMPLEXITY" >> $GITHUB_OUTPUT
${
  config.graphFormats.includes('mermaid')
    ? `      
      - name: Add reports to summary
        if: always()
        run: |
          echo "## 📊 Code Atlas Analysis" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          cat stats.txt >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          if [ -f dependency-graph.md ]; then
            echo "### Dependency Graph" >> $GITHUB_STEP_SUMMARY
            cat dependency-graph.md >> $GITHUB_STEP_SUMMARY
          fi
`
    : ''
}${
  config.graphFormats.length > 0 || config.generateReport
    ? `      
      - name: Upload artifacts
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: code-atlas-reports
          path: |
${config.generateReport ? '            code-atlas-report.html\n' : ''}${config.graphFormats.map((fmt) => `            dependency-graph.${fmt === 'mermaid' ? 'md' : fmt}`).join('\n')}
            registry.json
            stats.txt
            stats.json
`
    : ''
}      
      - name: Comment on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const { execSync } = require('child_process');
${
  config.prCommentMode === 'changes-only'
    ? `            
            // Changes-only mode: compare base and head branches
            try {
              // Checkout base branch and scan
              execSync('git fetch origin \${{ github.base_ref }}');
              execSync('git checkout origin/\${{ github.base_ref }}');
              execSync('code-atlas scan${config.enableGitMetadata ? ' --include-git' : ''}${config.includeTests ? ' --include-tests' : ''} --output base-registry.json');
              
              // Checkout PR branch and scan
              execSync('git checkout \${{ github.sha }}');
              execSync('code-atlas scan${config.enableGitMetadata ? ' --include-git' : ''}${config.includeTests ? ' --include-tests' : ''} --output head-registry.json');
              
              // Generate diff
              execSync('code-atlas diff --base base-registry.json --head head-registry.json --format json --output pr-diff.json');
              
              // Check if there are changes
              if (!fs.existsSync('pr-diff.json')) {
                console.log('No function changes detected, skipping comment');
                return;
              }
              
              const diff = JSON.parse(fs.readFileSync('pr-diff.json', 'utf8'));
              const summary = diff.summary;
              
              if (summary.added === 0 && summary.modified === 0 && summary.deleted === 0) {
                console.log('No function changes detected, skipping comment');
                return;
              }
              
              // Build comment with change summary
              let comment = \`## Code Atlas: Function Changes\\n\\n\`;
              comment += \`### Summary\\n\\n\`;
              comment += \`- **Added:** \${summary.added} functions\\n\`;
              comment += \`- **Modified:** \${summary.modified} functions\\n\`;
              comment += \`- **Deleted:** \${summary.deleted} functions\\n\\n\`;
              
              if (summary.complexityIncreases > 0) {
                comment += \`**Warning:** \${summary.complexityIncreases} functions increased in complexity\\n\\n\`;
              }
              
              if (summary.signatureChanges > 0) {
                comment += \`**Warning:** \${summary.signatureChanges} functions changed signatures\\n\\n\`;
              }
              
              // Check for duplicates in the head registry
              const headRegistry = JSON.parse(fs.readFileSync('head-registry.json', 'utf8'));
              if (headRegistry.duplicates && headRegistry.duplicates.length > 0) {
                comment += \`**Warning:** \${headRegistry.duplicates.length} duplicate/near-duplicate function pairs detected\\n\\n\`;
              }
              
              // Add top modified functions
              if (diff.modified && diff.modified.length > 0) {
                comment += \`### Modified Functions\\n\\n\`;
                comment += \`| Function | File | Complexity | Change |\\n\`;
                comment += \`|----------|------|------------|--------|\\n\`;
                diff.modified.slice(0, 10).forEach(m => {
                  const delta = m.complexityDelta > 0 ? \`+\${m.complexityDelta}\` : m.complexityDelta < 0 ? \`\${m.complexityDelta}\` : '0';
                  const warning = m.complexityDelta > 5 ? ' ⚠️' : '';
                  comment += \`| \\\`\${m.name}\\\` | \${m.filePath} | \${m.complexityBefore} → \${m.complexityAfter} | \${delta}\${warning} |\\n\`;
                });
                if (diff.modified.length > 10) {
                  comment += \`\\n*... and \${diff.modified.length - 10} more*\\n\`;
                }
                comment += \`\\n\`;
              }
              
              // Add duplicate detection results
              if (headRegistry.duplicates && headRegistry.duplicates.length > 0) {
                comment += \`### Duplicate Functions\\n\\n\`;
                headRegistry.duplicates.slice(0, 5).forEach(dup => {
                  comment += \`**\${dup.function1.name}** (\${dup.function1.filePath}:\${dup.function1.line}) ↔ **\${dup.function2.name}** (\${dup.function2.filePath}:\${dup.function2.line})\\n\`;
                  comment += \`- Similarity: \${(dup.similarity * 100).toFixed(1)}%\\n\\n\`;
                });
                if (headRegistry.duplicates.length > 5) {
                  comment += \`*... and \${headRegistry.duplicates.length - 5} more duplicate pairs*\\n\\n\`;
                }
              }
${
  config.graphFormats.includes('mermaid')
    ? `              
              // Generate focused impact graph
              const changedFunctions = [
                ...diff.added.map(f => f.name),
                ...diff.modified.map(m => m.name)
              ];
              
              if (changedFunctions.length > 0 && changedFunctions.length < 20) {
                try {
                  // Generate focused graph showing only changed functions and their immediate neighbors
                  execSync(\`code-atlas graph --focus "\${changedFunctions.join(',')}" --format mermaid --output focused-graph.md\`);
                  
                  if (fs.existsSync('focused-graph.md')) {
                    const diagram = fs.readFileSync('focused-graph.md', 'utf8');
                    comment += \`### Impact Graph\\n\\n\`;
                    comment += \`Showing changed functions and their immediate dependencies:\\n\\n\`;
                    comment += diagram + \`\\n\\n\`;
                  }
                } catch (e) {
                  console.log('Failed to generate focused graph:', e.message);
                }
              }
`
    : ''
}              
              comment += \`\\n[View detailed reports](\${process.env.GITHUB_SERVER_URL}/\${process.env.GITHUB_REPOSITORY}/actions/runs/\${process.env.GITHUB_RUN_ID})\\n\\n\`;
              comment += \`---\\n\`;
              comment += \`**Re-run this analysis:** Add the \\\`run-analysis\\\` label or use the [Actions tab](\${process.env.GITHUB_SERVER_URL}/\${process.env.GITHUB_REPOSITORY}/actions/workflows/code-atlas.yml) to manually trigger.\\n\`;
              
              // Post comment
              await github.rest.issues.createComment({
                issue_number: context.issue.number,
                owner: context.repo.owner,
                repo: context.repo.repo,
                body: comment
              });
              
            } catch (error) {
              console.error('Error in changes-only mode:', error);
              // Fall back to basic comment
              const stats = fs.readFileSync('stats.txt', 'utf8');
              await github.rest.issues.createComment({
                issue_number: context.issue.number,
                owner: context.repo.owner,
                repo: context.repo.repo,
                body: \`## Code Atlas Analysis\\n\\n\\\`\\\`\\\`\\n\${stats}\\\`\\\`\\\`\`
              });
            }
`
    : `            
            // Full mode: show complete analysis
            const stats = fs.readFileSync('stats.txt', 'utf8');
            const statsJson = JSON.parse(fs.readFileSync('stats.json', 'utf8'));
            
            let comment = \`## Code Atlas Analysis\\n\\n\`;
            comment += \`\\\`\\\`\\\`\\n\${stats}\\\`\\\`\\\`\\n\\n\`;
            
${
  config.complexityThreshold
    ? `            if (statsJson.averageComplexity > ${config.complexityThreshold}) {
              comment += \`**Warning**: Average complexity (\${statsJson.averageComplexity.toFixed(2)}) exceeds threshold (${config.complexityThreshold})\\n\\n\`;
            }
`
    : ''
}${
        config.failOnCircularDeps
          ? `            if (fs.existsSync('deps.json')) {
              const deps = JSON.parse(fs.readFileSync('deps.json', 'utf8'));
              const circularNodes = deps.nodes.filter(n => n.circular);
              if (circularNodes.length > 0) {
                comment += \`**Circular Dependencies**: \${circularNodes.length} detected\\n\`;
                comment += circularNodes.slice(0, 5).map(n => \`  - \${n.id}\`).join('\\n');
                if (circularNodes.length > 5) comment += \`\\n  - ... and \${circularNodes.length - 5} more\`;
                comment += \`\\n\\n\`;
              }
            }
`
          : ''
      }${
        config.graphFormats.includes('mermaid')
          ? `            if (fs.existsSync('dependency-graph.md')) {
              const diagram = fs.readFileSync('dependency-graph.md', 'utf8');
              comment += \`### Dependency Graph\\n\\n\`;
              comment += diagram + \`\\n\\n\`;
            }
`
          : ''
      }            
            comment += \`[View detailed reports](\${process.env.GITHUB_SERVER_URL}/\${process.env.GITHUB_REPOSITORY}/actions/runs/\${process.env.GITHUB_RUN_ID})\\n\\n\`;
            comment += \`---\\n\`;
            comment += \`**Re-run this analysis:** Add the \\\`run-analysis\\\` label or use the [Actions tab](\${process.env.GITHUB_SERVER_URL}/\${process.env.GITHUB_REPOSITORY}/actions/workflows/code-atlas.yml) to manually trigger.\\n\`;
            
            await github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });
`
}
`;

const GITLAB_CI_TEMPLATE = (config: SetupConfig): string => `code-atlas:
  stage: test
  image: node:20
  
  before_script:
    - npm install -g @bernardwiesner/code-atlas
  
  script:
    - code-atlas scan${config.enableGitMetadata ? ' --include-git' : ''}${config.includeTests ? ' --include-tests' : ''}
${
  config.complexityThreshold
    ? `    - |
      MAX_COMPLEXITY=${config.complexityThreshold}
      ACTUAL=$(code-atlas stats --format json | jq -r '.averageComplexity // 0')
      echo "Average complexity: $ACTUAL (threshold: $MAX_COMPLEXITY)"
      if (( $(echo "$ACTUAL > $MAX_COMPLEXITY" | bc -l) )); then
        echo "❌ Code complexity exceeds threshold!"
        exit 1
      fi
`
    : ''
}${
  config.failOnCircularDeps
    ? `    - code-atlas graph --format json --output deps.json
    - |
      if grep -q '"circular":true' deps.json; then
        echo "❌ Circular dependencies detected!"
        exit 1
      fi
`
    : ''
}${config.graphFormats.map((fmt) => `    - code-atlas graph --format ${fmt} --output dependency-graph.${fmt === 'mermaid' ? 'md' : fmt}`).join('\n')}
${config.generateReport ? '    - code-atlas report --output code-atlas-report.html\n' : ''}    - code-atlas stats
  
  artifacts:
    paths:
${config.generateReport ? '      - code-atlas-report.html\n' : ''}${config.graphFormats.map((fmt) => `      - dependency-graph.${fmt === 'mermaid' ? 'md' : fmt}`).join('\n')}
      - registry.json
    expire_in: 30 days
`;

const CIRCLECI_TEMPLATE = (config: SetupConfig): string => `version: 2.1

jobs:
  analyze:
    docker:
      - image: cimg/node:20.0
    
    steps:
      - checkout
      
      - run:
          name: Install code-atlas
          command: npm install -g @bernardwiesner/code-atlas
      
      - run:
          name: Scan codebase
          command: code-atlas scan${config.enableGitMetadata ? ' --include-git' : ''}${config.includeTests ? ' --include-tests' : ''}
${
  config.complexityThreshold
    ? `      
      - run:
          name: Check complexity threshold
          command: |
            MAX_COMPLEXITY=${config.complexityThreshold}
            ACTUAL=$(code-atlas stats --format json | jq -r '.averageComplexity // 0')
            echo "Average complexity: $ACTUAL (threshold: $MAX_COMPLEXITY)"
            if (( $(echo "$ACTUAL > $MAX_COMPLEXITY" | bc -l) )); then
              echo "❌ Code complexity exceeds threshold!"
              exit 1
            fi
`
    : ''
}${
  config.failOnCircularDeps
    ? `      
      - run:
          name: Check circular dependencies
          command: |
            code-atlas graph --format json --output deps.json
            if grep -q '"circular":true' deps.json; then
              echo "❌ Circular dependencies detected!"
              exit 1
            fi
`
    : ''
}${
  config.graphFormats.length > 0
    ? `      
      - run:
          name: Generate graphs
          command: |
${config.graphFormats.map((fmt) => `            code-atlas graph --format ${fmt} --output dependency-graph.${fmt === 'mermaid' ? 'md' : fmt}`).join('\n')}
`
    : ''
}${
  config.generateReport
    ? `      
      - run:
          name: Generate report
          command: code-atlas report --output code-atlas-report.html
`
    : ''
}      
      - run:
          name: Display stats
          command: code-atlas stats
${
  config.generateReport || config.graphFormats.length > 0
    ? `      
      - store_artifacts:
          path: code-atlas-report.html
${config.graphFormats.map((fmt) => `      - store_artifacts:\n          path: dependency-graph.${fmt === 'mermaid' ? 'md' : fmt}`).join('\n')}
`
    : ''
}
workflows:
  version: 2
  analyze:
    jobs:
      - analyze
`;

const CONFIG_TEMPLATE = (config: SetupConfig): string => `{
  "include": ["./src"],
  "ignore": [
    "node_modules",
    "dist",
    "build",
    "coverage",
    ".git"${config.customIgnorePatterns.length > 0 ? ',\n' + config.customIgnorePatterns.map((p) => `    "${p}"`).join(',\n') : ''}
  ],
  "includeTests": ${config.includeTests},
  "prCommentMode": "${config.prCommentMode}"
}
`;

export async function initCommand(): Promise<void> {
  console.log(chalk.bold.blue('\n🚀 Welcome to Code-Atlas Setup Wizard!\n'));
  console.log('This wizard will help you configure code-atlas for your project.\n');

  try {
    // Step 1: CI Platform
    const ciPlatform = await select<'github' | 'gitlab' | 'circleci' | 'none'>({
      message: 'Which CI platform do you use?',
      choices: [
        { name: 'GitHub Actions', value: 'github' },
        { name: 'GitLab CI', value: 'gitlab' },
        { name: 'CircleCI', value: 'circleci' },
        { name: 'None (skip CI setup)', value: 'none' },
      ],
    });

    // Step 2: Git metadata
    const enableGitMetadata = await confirm({
      message: 'Include Git metadata (author, dates, churn)?',
      default: true,
    });

    // Step 3: PR comment mode (only for GitHub)
    let prCommentMode: 'full' | 'changes-only' = 'full';
    if (ciPlatform === 'github') {
      prCommentMode = await select({
        message: 'How should PR comments work?',
        choices: [
          {
            name: 'Show only function changes (recommended)',
            value: 'changes-only',
            description:
              'Only comment when functions are added/modified/deleted, with focused impact graph',
          },
          {
            name: 'Show full analysis',
            value: 'full',
            description: 'Always show complete codebase statistics and dependency graph',
          },
        ],
        default: 'changes-only',
      });
    }

    // Step 4: Quality gates
    const failOnCircularDeps = await confirm({
      message: 'Fail CI on circular dependencies?',
      default: false,
    });

    const setComplexityThreshold = await confirm({
      message: 'Set a complexity threshold?',
      default: false,
    });

    let complexityThreshold: number | null = null;
    if (setComplexityThreshold) {
      const thresholdInput = await input({
        message: 'Maximum average complexity (recommended: 10-15)',
        default: '10',
        validate: (value) => {
          const num = parseFloat(value);
          return !isNaN(num) && num > 0 ? true : 'Please enter a valid positive number';
        },
      });
      complexityThreshold = parseFloat(thresholdInput);
    }

    // Step 4: Output formats
    const graphFormats = await checkbox<string>({
      message: 'Select graph output formats (for CI artifacts)',
      choices: [
        { name: 'Mermaid (for GitHub/GitLab)', value: 'mermaid', checked: true },
        { name: 'DOT (for GraphViz)', value: 'dot' },
        { name: 'JSON (for programmatic use)', value: 'json' },
      ],
    });

    const generateReport = await confirm({
      message: 'Generate interactive HTML report?',
      default: true,
    });

    // Step 6: Scan options
    const includeTests = await confirm({
      message: 'Include test files in analysis?',
      default: false,
    });

    const addCustomIgnores = await confirm({
      message: 'Add custom ignore patterns?',
      default: false,
    });

    let customIgnorePatterns: string[] = [];
    if (addCustomIgnores) {
      const ignoreInput = await input({
        message: 'Enter patterns separated by commas (e.g., "*.test.ts, tmp/, fixtures/")',
        default: '',
      });
      if (ignoreInput.trim()) {
        customIgnorePatterns = ignoreInput.split(',').map((p) => p.trim());
      }
    }

    const config: SetupConfig = {
      ciPlatform,
      enableGitMetadata,
      failOnCircularDeps,
      complexityThreshold,
      graphFormats,
      generateReport,
      includeTests,
      customIgnorePatterns,
      prCommentMode,
    };

    console.log(chalk.blue('\n📝 Generating files...\n'));

    // Create config file
    const configPath = '.code-atlas.json';
    if (existsSync(configPath)) {
      const overwrite = await confirm({
        message: `${configPath} already exists. Overwrite?`,
        default: false,
      });
      if (!overwrite) {
        logger.info(`Skipped ${configPath}`);
      } else {
        await writeFile(configPath, CONFIG_TEMPLATE(config));
        logger.success(`Created ${configPath}`);
      }
    } else {
      await writeFile(configPath, CONFIG_TEMPLATE(config));
      logger.success(`Created ${configPath}`);
    }

    // Generate CI workflow
    if (ciPlatform !== 'none') {
      let ciPath: string;
      let ciContent: string;

      switch (ciPlatform) {
        case 'github':
          ciPath = '.github/workflows/code-atlas.yml';
          ciContent = GITHUB_ACTIONS_TEMPLATE(config);
          break;
        case 'gitlab':
          ciPath = '.gitlab-ci.yml';
          ciContent = GITLAB_CI_TEMPLATE(config);
          // Check if file exists and append instead
          if (existsSync(ciPath)) {
            const append = await confirm({
              message: `${ciPath} exists. Append code-atlas job?`,
              default: true,
            });
            if (append) {
              const existing = await import('fs').then((fs) =>
                fs.promises.readFile(ciPath, 'utf-8')
              );
              ciContent = existing + '\n\n' + ciContent;
            }
          }
          break;
        case 'circleci':
          ciPath = '.circleci/config.yml';
          ciContent = CIRCLECI_TEMPLATE(config);
          break;
      }

      const ciDir = ciPath!.substring(0, ciPath!.lastIndexOf('/'));
      if (ciDir && !existsSync(ciDir)) {
        await mkdir(ciDir, { recursive: true });
      }

      if (existsSync(ciPath!) && ciPlatform !== 'gitlab') {
        const overwrite = await confirm({
          message: `${ciPath} already exists. Overwrite?`,
          default: false,
        });
        if (!overwrite) {
          logger.info(`Skipped ${ciPath}`);
        } else {
          await writeFile(ciPath!, ciContent!);
          logger.success(`Created ${ciPath}`);
        }
      } else {
        await writeFile(ciPath!, ciContent!);
        logger.success(`Created ${ciPath}`);
      }
    }

    // Update .gitignore
    const gitignorePath = '.gitignore';
    const gitignoreEntries = [
      '.code-atlas/',
      'registry.json',
      'code-atlas-report.html',
      'dependency-graph.*',
      'deps.json',
    ];

    if (existsSync(gitignorePath)) {
      const gitignoreContent = await import('fs').then((fs) =>
        fs.promises.readFile(gitignorePath, 'utf-8')
      );
      const missing = gitignoreEntries.filter((entry) => !gitignoreContent.includes(entry));

      if (missing.length > 0) {
        const update = await confirm({
          message: 'Add code-atlas outputs to .gitignore?',
          default: true,
        });

        if (update) {
          const updated =
            gitignoreContent + '\n\n# Code-Atlas outputs\n' + missing.join('\n') + '\n';
          await writeFile(gitignorePath, updated);
          logger.success('Updated .gitignore');
        }
      }
    } else {
      const create = await confirm({
        message: 'Create .gitignore with code-atlas outputs?',
        default: true,
      });

      if (create) {
        await writeFile(
          gitignorePath,
          '# Code-Atlas outputs\n' + gitignoreEntries.join('\n') + '\n'
        );
        logger.success('Created .gitignore');
      }
    }

    // Success message
    console.log(chalk.bold.green('\n✓ Setup complete!\n'));
    console.log(chalk.bold('Next steps:'));
    console.log(
      chalk.gray('  1. Run') +
        chalk.cyan(' code-atlas scan') +
        chalk.gray(' to analyze your codebase')
    );
    console.log(chalk.gray('  2. Review generated files and commit them'));
    if (ciPlatform !== 'none') {
      console.log(chalk.gray('  3. Push to trigger CI pipeline'));
    }
    console.log();
  } catch (error) {
    if (error instanceof Error && error.name === 'ExitPromptError') {
      logger.info('\nSetup cancelled');
      process.exit(0);
    }
    throw error;
  }
}
