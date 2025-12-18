/**
 * Report command - generates HTML report
 */

import { writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';
import chalk from 'chalk';
import { loadRegistry } from '../core/registry.js';
import { logger } from '../utils/logger.js';
import type { Registry } from '../types/index.js';

export interface ReportOptions {
  /** Output path for HTML report */
  output?: string;
}

/**
 * Executes the report command
 *
 * Generates an interactive HTML report from the registry.
 *
 * @param options - Report options
 *
 * @example
 * ```typescript
 * await reportCommand({ output: './docs/functions.html' });
 * ```
 */
export async function reportCommand(options: ReportOptions): Promise<void> {
  try {
    const registry = await loadRegistry();

    if (registry.functions.length === 0) {
      logger.warn('Registry is empty. Run "code-atlas scan" first.');
      return;
    }

    const outputPath = options.output || './code-atlas-report.html';
    const html = generateHTML(registry);

    // Ensure output directory exists
    await mkdir(dirname(outputPath), { recursive: true });

    await writeFile(outputPath, html, 'utf-8');

    logger.success(`HTML report generated: ${chalk.blue(outputPath)}`);
    logger.info(`Open in browser: file://${process.cwd()}/${outputPath}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Report generation failed: ${message}`);
    throw error;
  }
}

/**
 * Generates HTML report content
 */
function generateHTML(registry: Registry): string {
  const cwd = process.cwd() + '/';

  // Replace absolute paths with relative paths
  const functionsWithRelativePaths = registry.functions.map((func) => ({
    ...func,
    filePath: func.filePath.startsWith(cwd)
      ? './' + func.filePath.slice(cwd.length)
      : func.filePath,
  }));

  const functionsJSON = JSON.stringify(functionsWithRelativePaths, null, 2);
  const duplicatesJSON = JSON.stringify(registry.duplicates, null, 2);

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Code-Atlas Report</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            color: #333;
            line-height: 1.6;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }
        
        header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 20px;
            border-radius: 10px;
            margin-bottom: 30px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .stat-value {
            font-size: 2em;
            font-weight: bold;
            color: #667eea;
        }
        
        .stat-label {
            color: #666;
            font-size: 0.9em;
            margin-top: 5px;
        }
        
        .search-box {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        input[type="text"] {
            width: 100%;
            padding: 12px;
            font-size: 16px;
            border: 2px solid #e0e0e0;
            border-radius: 6px;
            transition: border-color 0.3s;
        }
        
        input[type="text"]:focus {
            outline: none;
            border-color: #667eea;
        }
        
        .functions-grid {
            display: grid;
            gap: 20px;
        }
        
        .function-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .function-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }
        
        .function-name {
            font-size: 1.3em;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 10px;
        }
        
        .function-signature {
            font-family: 'Monaco', 'Courier New', monospace;
            background: #f8f8f8;
            padding: 10px;
            border-radius: 4px;
            font-size: 0.9em;
            margin-bottom: 10px;
            overflow-x: auto;
        }
        
        .function-meta {
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
            margin-bottom: 10px;
        }
        
        .meta-item {
            display: flex;
            align-items: center;
            gap: 5px;
            font-size: 0.9em;
            color: #666;
        }
        
        .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.85em;
            font-weight: bold;
        }
        
        .badge-simple { background: #4caf50; color: white; }
        .badge-moderate { background: #ff9800; color: white; }
        .badge-complex { background: #f44336; color: white; }
        
        .function-description {
            color: #555;
            font-style: italic;
        }
        
        .duplicates-section {
            background: #fff3cd;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            border-left: 4px solid #ffc107;
        }
        
        .no-results {
            text-align: center;
            padding: 40px;
            color: #999;
        }
        
        .tabs {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
        }
        
        .tab {
            padding: 10px 20px;
            background: white;
            border: 2px solid #e0e0e0;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .tab.active {
            background: #667eea;
            color: white;
            border-color: #667eea;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🗺️ Code-Atlas Report</h1>
            <p>Generated: ${new Date(registry.generatedAt).toLocaleString()}</p>
        </header>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-value">${registry.totalFunctions}</div>
                <div class="stat-label">Total Functions</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${registry.totalFiles}</div>
                <div class="stat-label">Files Scanned</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${registry.duplicates.length}</div>
                <div class="stat-label">Duplicate Groups</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${registry.scannedPaths.length}</div>
                <div class="stat-label">Scanned Paths</div>
            </div>
        </div>
        
        ${
          registry.duplicates.length > 0
            ? `
        <div class="duplicates-section">
            <h2>⚠️ Duplicate Functions Detected</h2>
            <p>${registry.duplicates.length} group(s) of similar functions found. Consider consolidating these.</p>
        </div>
        `
            : ''
        }
        
        <div class="tabs">
            <div class="tab active" onclick="showTab('all')">All Functions</div>
            <div class="tab" onclick="showTab('simple')">Simple (1-5)</div>
            <div class="tab" onclick="showTab('moderate')">Moderate (6-10)</div>
            <div class="tab" onclick="showTab('complex')">Complex (11+)</div>
        </div>
        
        <div class="search-box">
            <input type="text" id="search" placeholder="🔍 Search functions by name, description, or file path...">
        </div>
        
        <div class="functions-grid" id="functions"></div>
        <div class="no-results" id="no-results" style="display: none;">
            No functions found matching your search.
        </div>
    </div>
    
    <script>
        const functions = ${functionsJSON};
        const duplicates = ${duplicatesJSON};
        let currentFilter = 'all';
        
        function getComplexityBadge(complexity) {
            if (complexity <= 5) return '<span class="badge badge-simple">Simple</span>';
            if (complexity <= 10) return '<span class="badge badge-moderate">Moderate</span>';
            return '<span class="badge badge-complex">Complex</span>';
        }
        
        function renderFunctions(filtered) {
            const container = document.getElementById('functions');
            const noResults = document.getElementById('no-results');
            
            if (filtered.length === 0) {
                container.style.display = 'none';
                noResults.style.display = 'block';
                return;
            }
            
            container.style.display = 'grid';
            noResults.style.display = 'none';
            
            container.innerHTML = filtered.map(func => {
                const params = func.params.map(p => \`\${p.name}: \${p.type}\`).join(', ');
                const signature = \`\${func.name}(\${params}): \${func.returnType}\`;
                
                return \`
                    <div class="function-card">
                        <div class="function-name">\${func.name}</div>
                        <div class="function-signature">\${signature}</div>
                        <div class="function-meta">
                            <div class="meta-item">📁 \${func.filePath}:\${func.line}</div>
                            <div class="meta-item">\${getComplexityBadge(func.complexity)} Complexity: \${func.complexity}</div>
                        </div>
                        \${func.jsdoc ? \`<div class="function-description">\${func.jsdoc}</div>\` : ''}
                    </div>
                \`;
            }).join('');
        }
        
        function filterFunctions() {
            const search = document.getElementById('search').value.toLowerCase();
            
            let filtered = functions;
            
            // Apply complexity filter
            if (currentFilter === 'simple') {
                filtered = filtered.filter(f => f.complexity <= 5);
            } else if (currentFilter === 'moderate') {
                filtered = filtered.filter(f => f.complexity >= 6 && f.complexity <= 10);
            } else if (currentFilter === 'complex') {
                filtered = filtered.filter(f => f.complexity > 10);
            }
            
            // Apply search filter
            if (search) {
                filtered = filtered.filter(f => 
                    f.name.toLowerCase().includes(search) ||
                    (f.jsdoc && f.jsdoc.toLowerCase().includes(search)) ||
                    f.filePath.toLowerCase().includes(search)
                );
            }
            
            renderFunctions(filtered);
        }
        
        function showTab(filter) {
            currentFilter = filter;
            document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
            event.target.classList.add('active');
            filterFunctions();
        }
        
        document.getElementById('search').addEventListener('input', filterFunctions);
        
        // Initial render
        renderFunctions(functions);
    </script>
</body>
</html>`;
}
