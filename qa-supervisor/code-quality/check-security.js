/**
 * Code Quality Check: Security Scanner
 *
 * Scans for hardcoded secrets and security vulnerabilities
 */

import fs from 'fs';
import { getAllJSFiles } from '../shared/test-utils.js';
import logger from '../shared/logger.js';

/**
 * Dangerous patterns to detect
 */
const SECURITY_PATTERNS = [
  {
    pattern: /sk-[a-zA-Z0-9]{20,}/,
    name: 'OpenAI API Key',
    severity: 'CRITICAL',
    example: 'sk-proj-abc123...'
  },
  {
    pattern: /xai-[a-zA-Z0-9]{20,}/,
    name: 'XAI API Key',
    severity: 'CRITICAL',
    example: 'xai-abc123...'
  },
  {
    pattern: /AKIA[A-Z0-9]{16}/,
    name: 'AWS Access Key',
    severity: 'CRITICAL',
    example: 'AKIAIOSFODNN7EXAMPLE'
  },
  {
    pattern: /eyJhbGc[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/,
    name: 'JWT Token',
    severity: 'HIGH',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  },
  {
    pattern: /password\s*=\s*['"][^'"]{3,}['"]/i,
    name: 'Hardcoded Password',
    severity: 'HIGH',
    example: 'password = "mypass123"'
  },
  {
    pattern: /api[_-]?key\s*=\s*['"][^'"]{10,}['"]/i,
    name: 'API Key Assignment',
    severity: 'HIGH',
    example: 'api_key = "abc123xyz"'
  },
  {
    pattern: /secret\s*=\s*['"][^'"]{10,}['"]/i,
    name: 'Hardcoded Secret',
    severity: 'HIGH',
    example: 'secret = "mysecret123"'
  },
  {
    pattern: /postgresql:\/\/[^:]+:[^@]+@/,
    name: 'Database Connection String with Password',
    severity: 'CRITICAL',
    example: 'postgresql://user:password@host'
  }
];

/**
 * Check for hardcoded secrets in directory
 */
export function checkForHardcodedSecrets(agentDir) {
  const files = getAllJSFiles(agentDir);
  const issues = [];

  for (const file of files) {
    // Skip node_modules and test files
    if (file.includes('node_modules') || file.includes('.test.') || file.includes('__tests__')) {
      continue;
    }

    try {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Skip comments and obvious examples
        const isComment = line.trim().startsWith('//') ||
                         line.trim().startsWith('*') ||
                         line.trim().startsWith('/*');

        const isExample = line.includes('example') ||
                         line.includes('EXAMPLE') ||
                         line.includes('placeholder') ||
                         line.includes('your_');

        if (isComment || isExample) {
          continue;
        }

        // Check each security pattern
        for (const { pattern, name, severity } of SECURITY_PATTERNS) {
          if (pattern.test(line)) {
            issues.push({
              file: file.replace(agentDir + '/', '').replace(agentDir + '\\', ''),
              line: i + 1,
              type: name,
              severity,
              snippet: line.trim().substring(0, 80)
            });
          }
        }
      }
    } catch (error) {
      // Skip files we can't read
      continue;
    }
  }

  return issues;
}

/**
 * Run security check on an agent
 */
export async function runSecurityCheck(agentName, agentDir) {
  logger.info(`Security Scan: ${agentName}`);

  const issues = checkForHardcodedSecrets(agentDir);

  if (issues.length === 0) {
    logger.success('  No hardcoded secrets found');
    return {
      passed: true,
      issues: []
    };
  }

  // Categorize by severity
  const critical = issues.filter(i => i.severity === 'CRITICAL');
  const high = issues.filter(i => i.severity === 'HIGH');

  logger.error(`  Found ${issues.length} potential security issue(s):`);
  logger.error(`    CRITICAL: ${critical.length}`);
  logger.error(`    HIGH: ${high.length}`);

  // Show details
  for (const issue of issues.slice(0, 5)) { // Show first 5
    logger.error(`    ${issue.file}:${issue.line} - ${issue.type}`);
  }

  if (issues.length > 5) {
    logger.warning(`    ... and ${issues.length - 5} more`);
  }

  return {
    passed: false,
    issues,
    critical: critical.length,
    high: high.length
  };
}

export default {
  checkForHardcodedSecrets,
  runSecurityCheck
};
