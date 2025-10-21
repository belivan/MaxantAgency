#!/usr/bin/env node

/**
 * MaxantAgency Security Audit Script
 * Scans for hardcoded secrets, exposed credentials, and security issues
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

let issues = 0;
let warnings = 0;
let passed = 0;

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(text) {
  console.log(`\n${colors.bold}${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}${text}${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
}

function check(description, status, details = '') {
  if (status === 'pass') {
    log(`✅ ${description}`, 'green');
    if (details) log(`   ${details}`, 'cyan');
    passed++;
  } else if (status === 'warn') {
    log(`⚠️  ${description}`, 'yellow');
    if (details) log(`   ${details}`, 'yellow');
    warnings++;
  } else {
    log(`❌ ${description}`, 'red');
    if (details) log(`   ${details}`, 'red');
    issues++;
  }
}

// Check 1: Verify .env files are NOT tracked by git
function checkGitTrackedEnvFiles() {
  header('1. Git Tracking - Environment Files');

  try {
    const tracked = execSync('git ls-files | grep -E "\\.env$|\\.env\\.local$"', { encoding: 'utf-8' }).trim();
    if (tracked) {
      check('No .env files tracked in git', 'fail', `Found: ${tracked}`);
    } else {
      check('No .env files tracked in git', 'pass');
    }
  } catch (error) {
    // grep returns exit code 1 when no matches found
    check('No .env files tracked in git', 'pass');
  }
}

// Check 2: Verify .gitignore contains proper exclusions
function checkGitignoreConfiguration() {
  header('2. .gitignore Configuration');

  const rootGitignore = path.join(process.cwd(), '.gitignore');

  if (!fs.existsSync(rootGitignore)) {
    check('.gitignore exists', 'fail', 'No .gitignore found in root');
    return;
  }

  const content = fs.readFileSync(rootGitignore, 'utf-8');
  const requiredPatterns = [
    { pattern: '.env', description: '.env files' },
    { pattern: '.env.*', description: '.env variant files' },
    { pattern: '**/.env', description: 'nested .env files' }
  ];

  check('.gitignore exists', 'pass');

  requiredPatterns.forEach(({ pattern, description }) => {
    if (content.includes(pattern)) {
      check(`${description} excluded in .gitignore`, 'pass');
    } else {
      check(`${description} excluded in .gitignore`, 'fail', `Pattern "${pattern}" not found`);
    }
  });
}

// Check 3: Scan for hardcoded secrets in source code
function scanForHardcodedSecrets() {
  header('3. Hardcoded Secrets Scan');

  const secretPatterns = [
    { name: 'OpenAI API Keys', regex: /sk-[a-zA-Z0-9_-]{40,}/, severity: 'critical' },
    { name: 'xAI API Keys', regex: /xai-[a-zA-Z0-9_-]{40,}/, severity: 'critical' },
    { name: 'Anthropic API Keys', regex: /sk-ant-[a-zA-Z0-9_-]{40,}/, severity: 'critical' },
    { name: 'AWS Access Keys', regex: /AKIA[A-Z0-9]{16}/, severity: 'critical' },
    { name: 'JWT Tokens', regex: /eyJhbGc[a-zA-Z0-9_-]{100,}/, severity: 'high' },
    { name: 'Generic API Keys', regex: /(api[_-]?key|apikey)[\s]*[=:][\s]*['"][a-zA-Z0-9_-]{20,}['"]/, severity: 'high' }
  ];

  const extensions = ['.js', '.ts', '.tsx', '.jsx', '.json'];
  const excludeDirs = ['node_modules', '.next', 'dist', 'build', '.git'];

  function scanDirectory(dir) {
    const findings = [];

    try {
      const items = fs.readdirSync(dir);

      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          if (!excludeDirs.includes(item)) {
            findings.push(...scanDirectory(fullPath));
          }
        } else if (extensions.some(ext => item.endsWith(ext))) {
          // Skip .env.example, SECURITY.md, and security checker files (they contain example patterns)
          if (item.includes('.example') ||
              item === 'SECURITY.md' ||
              item === 'security-audit.js' ||
              item === 'check-security.js' ||
              fullPath.includes('qa-supervisor')) {
            continue;
          }

          const content = fs.readFileSync(fullPath, 'utf-8');

          for (const { name, regex, severity } of secretPatterns) {
            const matches = content.match(regex);
            if (matches) {
              findings.push({
                file: fullPath.replace(process.cwd(), '.'),
                type: name,
                severity,
                sample: matches[0].substring(0, 20) + '...'
              });
            }
          }
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }

    return findings;
  }

  const findings = scanDirectory(process.cwd());

  if (findings.length === 0) {
    check('No hardcoded secrets found in source code', 'pass');
  } else {
    check('No hardcoded secrets found in source code', 'fail', `Found ${findings.length} potential secrets`);
    findings.forEach(f => {
      log(`   📄 ${f.file}`, 'red');
      log(`      Type: ${f.type} (${f.severity})`, 'red');
      log(`      Sample: ${f.sample}`, 'red');
    });
  }
}

// Check 4: Verify .env files exist but are ignored
function checkEnvFileStatus() {
  header('4. Environment File Status');

  const engines = [
    'analysis-engine',
    'command-center-ui',
    'database-tools',
    'outreach-engine',
    'pipeline-orchestrator',
    'prospecting-engine'
  ];

  engines.forEach(engine => {
    const envPath = path.join(process.cwd(), engine, '.env');
    const examplePath = path.join(process.cwd(), engine, '.env.example');

    if (fs.existsSync(envPath)) {
      try {
        execSync(`git check-ignore ${envPath}`, { encoding: 'utf-8' });
        check(`${engine}/.env is ignored by git`, 'pass');
      } catch (error) {
        check(`${engine}/.env is ignored by git`, 'fail', 'File exists but not in .gitignore');
      }
    }

    if (!fs.existsSync(examplePath)) {
      check(`${engine}/.env.example exists`, 'warn', 'Consider adding example file for documentation');
    }
  });
}

// Check 5: Scan git history for accidentally committed secrets
function checkGitHistory() {
  header('5. Git History Audit');

  try {
    // Check if any .env files were ever committed
    const history = execSync('git log --all --full-history --oneline -- "**/.env" "**/.env.local" 2>&1 || true', { encoding: 'utf-8' }).trim();

    if (history && !history.includes('fatal')) {
      check('No .env files in git history', 'fail', 'Found .env files in git history - rotation needed');
      log(`   ${history}`, 'red');
    } else {
      check('No .env files in git history', 'pass');
    }
  } catch (error) {
    check('No .env files in git history', 'pass');
  }
}

// Check 6: Verify example files don't contain real secrets
function checkExampleFiles() {
  header('6. Example Files Verification');

  const exampleFiles = [];

  function findExampleFiles(dir) {
    try {
      const items = fs.readdirSync(dir);

      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory() && !['node_modules', '.next', '.git'].includes(item)) {
          findExampleFiles(fullPath);
        } else if (item.includes('.example') || item.includes('.template')) {
          exampleFiles.push(fullPath);
        }
      }
    } catch (error) {
      // Skip
    }
  }

  findExampleFiles(process.cwd());

  const realSecretPatterns = [
    /sk-[a-zA-Z0-9]{40,}/,
    /xai-[a-zA-Z0-9]{40,}/,
    /eyJhbGc[a-zA-Z0-9]{100,}/,
    /supabase\.co\/[a-zA-Z0-9]{20,}/
  ];

  let foundRealSecrets = false;

  exampleFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');

    for (const pattern of realSecretPatterns) {
      if (pattern.test(content)) {
        check(`${file.replace(process.cwd(), '.')} contains only placeholders`, 'warn', 'May contain real secret');
        foundRealSecrets = true;
        break;
      }
    }
  });

  if (!foundRealSecrets) {
    check('Example files contain only placeholders', 'pass');
  }
}

// Main execution
function runAudit() {
  log(`\n${colors.bold}${colors.blue}╔════════════════════════════════════════════════════════╗${colors.reset}`);
  log(`${colors.bold}${colors.blue}║     MaxantAgency - Security Audit Report              ║${colors.reset}`);
  log(`${colors.bold}${colors.blue}╚════════════════════════════════════════════════════════╝${colors.reset}`);

  checkGitTrackedEnvFiles();
  checkGitignoreConfiguration();
  scanForHardcodedSecrets();
  checkEnvFileStatus();
  checkGitHistory();
  checkExampleFiles();

  // Summary
  header('Summary');
  log(`✅ Passed: ${passed}`, 'green');
  log(`⚠️  Warnings: ${warnings}`, 'yellow');
  log(`❌ Issues: ${issues}`, 'red');

  console.log('\n' + '='.repeat(60) + '\n');

  if (issues > 0) {
    log('❌ SECURITY AUDIT FAILED', 'red');
    log('   Critical security issues found. Fix immediately before committing!', 'red');
    process.exit(1);
  } else if (warnings > 0) {
    log('⚠️  SECURITY AUDIT PASSED WITH WARNINGS', 'yellow');
    log('   Review warnings and consider addressing them.', 'yellow');
    process.exit(0);
  } else {
    log('✅ SECURITY AUDIT PASSED', 'green');
    log('   All security checks passed!', 'green');
    process.exit(0);
  }
}

// Run the audit
runAudit();
