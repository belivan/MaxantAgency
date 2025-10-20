/**
 * Code Quality Check: Error Handling Coverage
 *
 * Analyzes error handling coverage in code
 */

import fs from 'fs';
import { getAllJSFiles } from '../shared/test-utils.js';
import logger from '../shared/logger.js';

/**
 * Analyze error handling in directory
 */
export function analyzeErrorHandling(agentDir) {
  const files = getAllJSFiles(agentDir);

  let totalFunctions = 0;
  let functionsWithErrorHandling = 0;
  const uncoveredFunctions = [];

  for (const file of files) {
    if (file.includes('node_modules') || file.includes('.test.')) {
      continue;
    }

    try {
      const content = fs.readFileSync(file, 'utf-8');

      // Count functions
      const functionMatches = [
        ...content.matchAll(/(?:async\s+)?function\s+(\w+)/g),
        ...content.matchAll(/(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(/g),
        ...content.matchAll(/(\w+)\s*:\s*(?:async\s+)?function/g)
      ];

      for (const match of functionMatches) {
        totalFunctions++;
        const functionName = match[1];

        // Find function body
        const functionStart = match.index;
        const bodyStart = content.indexOf('{', functionStart);

        if (bodyStart !== -1) {
          const functionBody = extractFunctionBody(content, bodyStart);

          // Check for error handling
          const hasTryCatch = functionBody.includes('try') && functionBody.includes('catch');
          const hasErrorParameter = /catch\s*\(\s*\w+\s*\)/.test(functionBody);
          const hasThrows = functionBody.includes('throw');

          if (hasTryCatch || hasErrorParameter || hasThrows) {
            functionsWithErrorHandling++;
          } else {
            // Check if it's a trivial function
            const isTrivial = functionBody.length < 100 ||
                            functionName?.startsWith('get') ||
                            functionName?.startsWith('is') ||
                            functionName?.startsWith('render');

            if (!isTrivial) {
              uncoveredFunctions.push({
                file: file.replace(agentDir + '/', '').replace(agentDir + '\\', ''),
                function: functionName || 'anonymous',
                lines: functionBody.split('\n').length
              });
            }
          }
        }
      }
    } catch (error) {
      continue;
    }
  }

  const coverage = totalFunctions > 0
    ? (functionsWithErrorHandling / totalFunctions) * 100
    : 0;

  return {
    coverage: coverage.toFixed(1),
    passed: coverage >= 80,
    totalFunctions,
    functionsWithErrorHandling,
    uncoveredFunctions: uncoveredFunctions.slice(0, 10) // Top 10
  };
}

/**
 * Extract function body (simple brace matching)
 */
function extractFunctionBody(content, startIndex) {
  let braceCount = 1;
  let endIndex = startIndex + 1;

  while (braceCount > 0 && endIndex < content.length) {
    if (content[endIndex] === '{') braceCount++;
    if (content[endIndex] === '}') braceCount--;
    endIndex++;
  }

  return content.substring(startIndex, endIndex);
}

/**
 * Run error handling check on an agent
 */
export async function runErrorHandlingCheck(agentName, agentDir) {
  logger.info(`Error Handling Check: ${agentName}`);

  const result = analyzeErrorHandling(agentDir);

  logger.info(`  Functions analyzed: ${result.totalFunctions}`);
  logger.info(`  With error handling: ${result.functionsWithErrorHandling}`);
  logger.info(`  Coverage: ${result.coverage}%`);

  if (result.passed) {
    logger.success(`  ✅ PASS (>= 80% target)`);
  } else {
    logger.warning(`  ⚠️  Below target (target: 80%)`);

    if (result.uncoveredFunctions.length > 0) {
      logger.info('  Functions missing error handling:');
      for (const fn of result.uncoveredFunctions.slice(0, 5)) {
        logger.info(`    - ${fn.file}: ${fn.function}()`);
      }
    }
  }

  return result;
}

export default {
  analyzeErrorHandling,
  runErrorHandlingCheck
};
