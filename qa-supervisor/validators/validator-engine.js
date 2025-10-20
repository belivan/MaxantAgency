/**
 * Validator Engine - Generic checklist validation logic
 *
 * Used by all agent validators to run their checklists
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import {
  fileExists,
  directoryExists,
  readJSON,
  getAllJSFiles,
  fileContainsPattern
} from '../shared/test-utils.js';
import logger from '../shared/logger.js';

const execAsync = promisify(exec);

/**
 * Run checklist validation for any agent
 */
export async function runChecklistValidation(checklist, projectRoot) {
  const agentDir = path.join(projectRoot, checklist.agentDir);

  const results = {
    agent: checklist.agent,
    passed: 0,
    warnings: 0,
    errors: 0,
    details: []
  };

  // Run all check categories
  for (const category of checklist.checks) {
    console.log(`\n   ${category.category}:`);

    for (const item of category.items) {
      const result = await runCheck(item, agentDir, projectRoot);

      if (result.status === 'pass') {
        logger.success(item.name);
        results.passed++;
      } else if (result.status === 'warn') {
        logger.warning(`${item.name}${result.message ? ': ' + result.message : ''}`);
        results.warnings++;
      } else {
        logger.error(`${item.name}${result.message ? ': ' + result.message : ''}`);
        results.errors++;
      }

      results.details.push({
        category: category.category,
        name: item.name,
        status: result.status,
        message: result.message
      });
    }
  }

  return results;
}

/**
 * Run individual check
 */
async function runCheck(item, agentDir, projectRoot) {
  // File/directory existence checks
  if (item.type === 'file') {
    const filePath = path.join(projectRoot, item.path);
    const exists = fileExists(filePath);

    if (!exists) {
      if (item.required === false) {
        return { status: 'warn', message: 'Not yet implemented (expected in later phase)' };
      }
      return { status: 'fail', message: 'File does not exist' };
    }

    // Validate JSON if required
    if (item.validate === 'isValidJSON') {
      try {
        readJSON(filePath);
        return { status: 'pass' };
      } catch (error) {
        return { status: 'fail', message: `Invalid JSON: ${error.message}` };
      }
    }

    return { status: 'pass' };
  }

  if (item.type === 'directory') {
    const dirPath = path.join(projectRoot, item.path);
    const exists = directoryExists(dirPath);

    if (!exists) {
      if (item.required === false) {
        return { status: 'warn', message: 'Directory not created yet' };
      }
      return { status: 'fail', message: 'Directory does not exist' };
    }

    return { status: 'pass' };
  }

  // Test execution checks
  if (item.test === 'runTest') {
    try {
      const { stdout, stderr } = await execAsync(item.command, {
        cwd: projectRoot,
        timeout: 30000
      });

      // Check if output contains "ALL TESTS PASSED" or similar
      const output = stdout + stderr;
      const hasFailure = output.includes('FAILED') || output.includes('❌') || stderr.includes('Error:');

      if (hasFailure && item.expectSuccess) {
        return { status: 'fail', message: 'Tests failed' };
      }

      return { status: 'pass' };
    } catch (error) {
      return { status: 'fail', message: `Test execution failed: ${error.message}` };
    }
  }

  // Security checks
  if (item.test === 'checkSecurity') {
    const files = getAllJSFiles(agentDir);
    const dangerousPatterns = item.patterns.map(p => new RegExp(p));
    const violations = [];

    for (const file of files) {
      for (const pattern of dangerousPatterns) {
        if (fileContainsPattern(file, pattern)) {
          violations.push({
            file: path.relative(projectRoot, file),
            pattern: pattern.toString()
          });
        }
      }
    }

    if (violations.length > 0) {
      return {
        status: 'fail',
        message: `Found ${violations.length} potential hardcoded secrets`
      };
    }

    return { status: 'pass' };
  }

  // Error handling checks
  if (item.test === 'checkErrorHandling') {
    const files = getAllJSFiles(agentDir);
    let functionsWithTryCatch = 0;
    let totalFunctions = 0;

    for (const file of files) {
      const tryCatchCount = countPatternInFile(file, /try\s*{/g);
      const functionCount = countPatternInFile(file, /(async\s+)?function\s+\w+|=>\s*{|(async\s+)?\(\w*\)\s*=>/g);

      functionsWithTryCatch += tryCatchCount;
      totalFunctions += functionCount;
    }

    const coverage = totalFunctions > 0 ? (functionsWithTryCatch / totalFunctions) * 100 : 0;

    if (coverage < item.minCoverage) {
      return {
        status: 'warn',
        message: `Error handling coverage: ${coverage.toFixed(0)}% (target: ${item.minCoverage}%)`
      };
    }

    return { status: 'pass' };
  }

  // Export checks
  if (item.test === 'checkExports') {
    for (const modulePath of item.modules) {
      const fullPath = path.join(agentDir, modulePath);

      if (!fileExists(fullPath)) {
        return { status: 'fail', message: `Module not found: ${modulePath}` };
      }

      // Check if file has export statements
      const hasExports = fileContainsPattern(fullPath, /export\s+(async\s+)?function|export\s+{|export\s+default/);

      if (!hasExports) {
        return { status: 'fail', message: `No exports found in ${modulePath}` };
      }
    }

    return { status: 'pass' };
  }

  // Cost checks
  if (item.test === 'checkCost') {
    const estimate = item.estimate || 0;
    const target = item.target || 0;

    if (estimate > target) {
      return {
        status: 'warn',
        message: `Estimated cost $${estimate.toFixed(3)} exceeds target $${target.toFixed(3)}`
      };
    }

    return {
      status: 'pass',
      message: `Estimated cost $${estimate.toFixed(3)} within target $${target.toFixed(3)}`
    };
  }

  // Manual checks
  if (item.test === 'manual') {
    return {
      status: 'warn',
      message: item.note || 'Manual check required'
    };
  }

  // Unknown check type
  return { status: 'warn', message: 'Unknown check type' };
}

/**
 * Count pattern occurrences in file
 */
function countPatternInFile(filePath, pattern) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const matches = content.match(pattern);
    return matches ? matches.length : 0;
  } catch {
    return 0;
  }
}

export default {
  runChecklistValidation
};
