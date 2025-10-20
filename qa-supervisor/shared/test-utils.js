/**
 * Test Utilities - Helper functions for QA tests
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Check if file exists
 */
export function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

/**
 * Check if directory exists
 */
export function directoryExists(dirPath) {
  try {
    const stats = fs.statSync(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Get all JS files in a directory (recursive)
 */
export function getAllJSFiles(dir, files = []) {
  if (!directoryExists(dir)) {
    return files;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Skip node_modules and .git
      if (entry.name !== 'node_modules' && entry.name !== '.git') {
        getAllJSFiles(fullPath, files);
      }
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Read JSON file safely
 */
export function readJSON(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to read JSON from ${filePath}: ${error.message}`);
  }
}

/**
 * Check if file contains pattern
 */
export function fileContainsPattern(filePath, pattern) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return pattern.test(content);
  } catch {
    return false;
  }
}

/**
 * Count occurrences of pattern in file
 */
export function countPatternOccurrences(filePath, pattern) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const matches = content.match(new RegExp(pattern, 'g'));
    return matches ? matches.length : 0;
  } catch {
    return 0;
  }
}

/**
 * Get project root directory
 */
export function getProjectRoot() {
  // Go up two levels from shared/ to get to qa-supervisor/
  // Then one more level to get to project root
  return path.resolve(__dirname, '..', '..');
}

/**
 * Get agent directory
 */
export function getAgentDirectory(agentName) {
  const projectRoot = getProjectRoot();
  const agentDirs = {
    'agent1': 'prospecting-engine',
    'agent2': 'analysis-engine',
    'agent3': 'outreach-engine',
    'agent4': 'command-center-ui',
    'agent5': 'database-setup',
    'agent6': 'pipeline-orchestrator'
  };

  const dirName = agentDirs[agentName.toLowerCase()];
  if (!dirName) {
    throw new Error(`Unknown agent: ${agentName}`);
  }

  return path.join(projectRoot, dirName);
}

/**
 * Test API endpoint availability
 */
export async function testEndpoint(url, options = {}) {
  try {
    const response = await fetch(url, options);
    return {
      available: true,
      status: response.status,
      ok: response.ok
    };
  } catch (error) {
    return {
      available: false,
      error: error.message
    };
  }
}

/**
 * Wait for a condition to be true (with timeout)
 */
export async function waitFor(conditionFn, timeout = 5000, interval = 100) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await conditionFn()) {
      return true;
    }
    await sleep(interval);
  }

  return false;
}

/**
 * Sleep helper
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate percentage
 */
export function percentage(part, total) {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}

/**
 * Format duration (ms to human readable)
 */
export function formatDuration(ms) {
  if (ms < 1000) {
    return `${ms}ms`;
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  } else {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}m ${seconds}s`;
  }
}

/**
 * Format file size
 */
export function formatFileSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} bytes`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}

export default {
  fileExists,
  directoryExists,
  getAllJSFiles,
  readJSON,
  fileContainsPattern,
  countPatternOccurrences,
  getProjectRoot,
  getAgentDirectory,
  testEndpoint,
  waitFor,
  sleep,
  percentage,
  formatDuration,
  formatFileSize
};
