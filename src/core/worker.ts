/**
 * Worker thread for parallel file parsing
 *
 * Parses files in isolation to avoid memory bloat from ts-morph.
 */

import { parentPort, workerData } from 'worker_threads';
import { Project } from 'ts-morph';
import { extractFunctionMetadata } from './extractor.js';
import type { FunctionMetadata } from '../types/index.js';

interface WorkerData {
  filePaths: string[];
}

interface WorkerResult {
  functions: FunctionMetadata[];
  errors: Array<{ filePath: string; error: string }>;
}

/**
 * Parses a batch of files in this worker thread
 */
async function parseFilesInWorker(filePaths: string[]): Promise<WorkerResult> {
  const project = new Project({
    skipAddingFilesFromTsConfig: true,
    compilerOptions: {
      target: 99, // ES2022
      module: 199, // NodeNext
      allowJs: true,
      esModuleInterop: true,
      skipLibCheck: true,
    },
  });

  const functions: FunctionMetadata[] = [];
  const errors: Array<{ filePath: string; error: string }> = [];

  for (const filePath of filePaths) {
    try {
      const sourceFile = project.addSourceFileAtPath(filePath);

      // Extract functions from this file
      for (const func of sourceFile.getFunctions()) {
        const metadata = extractFunctionMetadata(func, sourceFile);
        if (metadata) {
          functions.push(metadata);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push({ filePath, error: message });
    }
  }

  return { functions, errors };
}

// Execute worker task
if (parentPort && workerData) {
  const { filePaths } = workerData as WorkerData;

  parseFilesInWorker(filePaths)
    .then((result) => {
      parentPort!.postMessage(result);
    })
    .catch((error) => {
      parentPort!.postMessage({
        functions: [],
        errors: [{ filePath: 'worker', error: error.message }],
      });
    });
}
