/**
 * Git integration module
 *
 * Extracts Git metadata for functions including last author,
 * modification dates, and churn metrics.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import type { FunctionMetadata } from '../types/index.js';

const execAsync = promisify(exec);

export interface GitMetadata {
  /** Last author who modified this function */
  lastAuthor: string;
  /** Last commit date (ISO string) */
  lastModified: string;
  /** Number of commits touching this function */
  commitCount: number;
  /** Commit hash of last modification */
  lastCommit: string;
  /** Lines added in git history */
  linesAdded: number;
  /** Lines deleted in git history */
  linesDeleted: number;
}

export interface EnrichedFunctionMetadata extends FunctionMetadata {
  git?: GitMetadata;
}

/**
 * Checks if directory is a Git repository
 */
export async function isGitRepository(cwd: string = process.cwd()): Promise<boolean> {
  try {
    await execAsync('git rev-parse --git-dir', { cwd });
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets Git blame information for a specific line range
 *
 * @param filePath - Relative path to file
 * @param startLine - Start line number
 * @param endLine - End line number (optional, defaults to startLine)
 * @param cwd - Working directory
 * @returns Git metadata or null if unavailable
 */
export async function getGitBlame(
  filePath: string,
  startLine: number,
  endLine?: number,
  cwd: string = process.cwd()
): Promise<GitMetadata | null> {
  try {
    const range = endLine ? `${startLine},${endLine}` : `${startLine}`;
    const { stdout } = await execAsync(`git blame -L ${range} --line-porcelain "${filePath}"`, {
      cwd,
      maxBuffer: 1024 * 1024,
    });

    // Parse porcelain format
    const lines = stdout.split('\n');
    const commits = new Set<string>();
    let lastAuthor = '';
    let lastDate = '';
    let lastCommit = '';

    for (const line of lines) {
      if (line.match(/^[0-9a-f]{40}/)) {
        const commit = line.split(' ')[0];
        if (commit) {
          commits.add(commit);
          if (!lastCommit) lastCommit = commit;
        }
      } else if (line.startsWith('author ')) {
        const author = line.substring(7);
        if (!lastAuthor) lastAuthor = author;
      } else if (line.startsWith('author-time ')) {
        const timestamp = parseInt(line.substring(12));
        if (!lastDate) lastDate = new Date(timestamp * 1000).toISOString();
      }
    }

    // Get commit stats
    const stats = await getCommitStats(filePath, startLine, endLine, cwd);

    return {
      lastAuthor,
      lastModified: lastDate,
      commitCount: commits.size,
      lastCommit,
      ...stats,
    };
  } catch {
    return null;
  }
}

/**
 * Gets commit statistics for a file/line range
 */
async function getCommitStats(
  filePath: string,
  startLine: number,
  endLine?: number,
  cwd: string = process.cwd()
): Promise<{ linesAdded: number; linesDeleted: number }> {
  try {
    const range = endLine ? `${startLine},${endLine}` : `${startLine}`;
    const { stdout } = await execAsync(
      `git log --numstat -L ${range}:"${filePath}" --pretty=format:''`,
      { cwd, maxBuffer: 1024 * 1024 }
    );

    let linesAdded = 0;
    let linesDeleted = 0;

    const lines = stdout.split('\n');
    for (const line of lines) {
      const match = line.match(/^(\d+)\s+(\d+)/);
      if (match) {
        linesAdded += parseInt(match[1] || '0');
        linesDeleted += parseInt(match[2] || '0');
      }
    }

    return { linesAdded, linesDeleted };
  } catch {
    return { linesAdded: 0, linesDeleted: 0 };
  }
}

/**
 * Enriches function metadata with Git information
 *
 * @param functions - Array of function metadata
 * @param cwd - Working directory
 * @returns Enriched function metadata with Git info
 */
export async function enrichWithGitMetadata(
  functions: FunctionMetadata[],
  cwd: string = process.cwd()
): Promise<EnrichedFunctionMetadata[]> {
  // Check if Git is available
  const hasGit = await isGitRepository(cwd);
  if (!hasGit) {
    return functions.map((f) => ({ ...f, git: undefined }));
  }

  // Process functions in parallel (but limit concurrency)
  const BATCH_SIZE = 10;
  const enriched: EnrichedFunctionMetadata[] = [];

  for (let i = 0; i < functions.length; i += BATCH_SIZE) {
    const batch = functions.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (func) => {
        // Make path relative to cwd
        const relativePath = func.filePath.startsWith(cwd)
          ? func.filePath.substring(cwd.length + 1)
          : func.filePath;

        const git = await getGitBlame(relativePath, func.line, undefined, cwd);
        return { ...func, git: git || undefined };
      })
    );
    enriched.push(...batchResults);
  }

  return enriched;
}

/**
 * Calculates churn metrics for functions
 *
 * High churn (frequent changes) might indicate:
 * - Active development
 * - Bug-prone code
 * - Unclear requirements
 *
 * @param functions - Enriched function metadata
 * @returns Functions with churn score (0-1)
 */
export function calculateChurnScores(
  functions: EnrichedFunctionMetadata[]
): Array<EnrichedFunctionMetadata & { churnScore: number }> {
  // Find max commit count for normalization
  const maxCommits = Math.max(...functions.map((f) => f.git?.commitCount || 0), 1);

  return functions.map((func) => {
    const commitCount = func.git?.commitCount || 0;
    const totalChanges = (func.git?.linesAdded || 0) + (func.git?.linesDeleted || 0);

    // Churn score: normalized combination of commit frequency and line changes
    const commitScore = commitCount / maxCommits;
    const changeScore = Math.min(totalChanges / 100, 1); // Cap at 100 lines
    const churnScore = (commitScore + changeScore) / 2;

    return { ...func, churnScore };
  });
}

/**
 * Gets hot spots (high complexity + high churn)
 *
 * These are risky areas that change frequently and are complex.
 *
 * @param functions - Enriched functions with churn scores
 * @param threshold - Minimum score to be considered a hot spot (0-1)
 * @returns Array of hot spot functions
 */
export function getHotSpots(
  functions: Array<EnrichedFunctionMetadata & { churnScore: number }>,
  threshold = 0.5
): Array<EnrichedFunctionMetadata & { churnScore: number; riskScore: number }> {
  const maxComplexity = Math.max(...functions.map((f) => f.complexity), 1);

  return functions
    .map((func) => {
      const complexityScore = func.complexity / maxComplexity;
      const riskScore = (complexityScore + func.churnScore) / 2;
      return { ...func, riskScore };
    })
    .filter((func) => func.riskScore >= threshold)
    .sort((a, b) => b.riskScore - a.riskScore);
}
