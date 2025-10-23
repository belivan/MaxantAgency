#!/usr/bin/env node
/**
 * Check for corruption in MaxantAgency codebase
 */

import fs from 'fs/promises';
import path from 'path';

const BOLD = '\x1b[1m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

console.log(`\n${BOLD}🔍 MaxantAgency Corruption Check${RESET}\n`);
console.log('='.repeat(70));

const checks = [];

/**
 * Check if file exists and is not empty
 */
async function checkFile(filePath, name) {
  try {
    const stats = await fs.stat(filePath);
    if (stats.size === 0) {
      return { name, status: 'empty', path: filePath };
    }
    return { name, status: 'ok', size: stats.size };
  } catch (error) {
    return { name, status: 'missing', path: filePath };
  }
}

/**
 * Check if directory exists and has contents
 */
async function checkDirectory(dirPath, name) {
  try {
    const files = await fs.readdir(dirPath);
    if (files.length === 0) {
      return { name, status: 'empty', path: dirPath };
    }
    return { name, status: 'ok', count: files.length };
  } catch (error) {
    return { name, status: 'missing', path: dirPath };
  }
}

/**
 * Check if JSON file is valid
 */
async function checkJSON(filePath, name) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    JSON.parse(content);
    return { name, status: 'ok', size: content.length };
  } catch (error) {
    return { name, status: 'corrupted', error: error.message, path: filePath };
  }
}

/**
 * Main checks
 */
async function runChecks() {
  console.log(`\n${BOLD}1. Critical Server Files${RESET}\n`);
  
  const serverFiles = [
    ['prospecting-engine/server.js', 'Prospecting Server'],
    ['analysis-engine/server.js', 'Analysis Server'],
    ['outreach-engine/server.js', 'Outreach Server'],
    ['pipeline-orchestrator/server.js', 'Pipeline Server']
  ];
  
  for (const [file, name] of serverFiles) {
    const result = await checkFile(file, name);
    checks.push(result);
    
    if (result.status === 'ok') {
      console.log(`${GREEN}✓${RESET} ${name}: ${result.size} bytes`);
    } else if (result.status === 'missing') {
      console.log(`${RED}✗${RESET} ${name}: MISSING`);
    } else {
      console.log(`${YELLOW}⚠${RESET} ${name}: EMPTY FILE`);
    }
  }
  
  console.log(`\n${BOLD}2. Package.json Files${RESET}\n`);
  
  const packageFiles = [
    ['package.json', 'Root package.json'],
    ['prospecting-engine/package.json', 'Prospecting package.json'],
    ['analysis-engine/package.json', 'Analysis package.json'],
    ['outreach-engine/package.json', 'Outreach package.json'],
    ['pipeline-orchestrator/package.json', 'Pipeline package.json'],
    ['command-center-ui/package.json', 'UI package.json']
  ];
  
  for (const [file, name] of packageFiles) {
    const result = await checkJSON(file, name);
    checks.push(result);
    
    if (result.status === 'ok') {
      console.log(`${GREEN}✓${RESET} ${name}`);
    } else {
      console.log(`${RED}✗${RESET} ${name}: ${result.status.toUpperCase()}`);
      if (result.error) console.log(`  Error: ${result.error}`);
    }
  }
  
  console.log(`\n${BOLD}3. Node Modules${RESET}\n`);
  
  const nodeModules = [
    ['node_modules', 'Root node_modules'],
    ['prospecting-engine/node_modules', 'Prospecting node_modules'],
    ['analysis-engine/node_modules', 'Analysis node_modules'],
    ['outreach-engine/node_modules', 'Outreach node_modules'],
    ['pipeline-orchestrator/node_modules', 'Pipeline node_modules'],
    ['command-center-ui/node_modules', 'UI node_modules']
  ];
  
  for (const [dir, name] of nodeModules) {
    const result = await checkDirectory(dir, name);
    checks.push(result);
    
    if (result.status === 'ok') {
      console.log(`${GREEN}✓${RESET} ${name}: ${result.count} packages`);
    } else if (result.status === 'missing') {
      console.log(`${RED}✗${RESET} ${name}: MISSING`);
    } else {
      console.log(`${YELLOW}⚠${RESET} ${name}: EMPTY`);
    }
  }
  
  console.log(`\n${BOLD}4. Configuration Files${RESET}\n`);
  
  const configFiles = [
    ['.env', 'Root .env'],
    ['analysis-engine/config/report-config.js', 'Analysis report config'],
    ['analysis-engine/config/scraper-config.json', 'Analysis scraper config']
  ];
  
  for (const [file, name] of configFiles) {
    const result = await checkFile(file, name);
    checks.push(result);
    
    if (result.status === 'ok') {
      console.log(`${GREEN}✓${RESET} ${name}`);
    } else if (result.status === 'missing') {
      console.log(`${YELLOW}⚠${RESET} ${name}: Missing (may use root .env)`);
    } else {
      console.log(`${RED}✗${RESET} ${name}: ${result.status.toUpperCase()}`);
    }
  }
  
  console.log(`\n${BOLD}5. Critical Directories${RESET}\n`);
  
  const criticalDirs = [
    ['prospecting-engine/discoverers', 'Prospecting discoverers'],
    ['analysis-engine/analyzers', 'Analysis analyzers'],
    ['outreach-engine/generators', 'Outreach generators'],
    ['command-center-ui/app', 'UI app directory']
  ];
  
  for (const [dir, name] of criticalDirs) {
    const result = await checkDirectory(dir, name);
    checks.push(result);
    
    if (result.status === 'ok') {
      console.log(`${GREEN}✓${RESET} ${name}: ${result.count} files`);
    } else if (result.status === 'missing') {
      console.log(`${RED}✗${RESET} ${name}: MISSING`);
    } else {
      console.log(`${YELLOW}⚠${RESET} ${name}: EMPTY`);
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(70));
  
  const okCount = checks.filter(c => c.status === 'ok').length;
  const errorCount = checks.filter(c => c.status === 'corrupted' || c.status === 'empty').length;
  const missingCount = checks.filter(c => c.status === 'missing').length;
  
  console.log(`\n${BOLD}Summary:${RESET}`);
  console.log(`${GREEN}✓ OK: ${okCount}${RESET} | ${RED}✗ Errors: ${errorCount}${RESET} | ${YELLOW}⚠ Missing: ${missingCount}${RESET}\n`);
  
  if (errorCount > 0) {
    console.log(`${RED}${BOLD}⚠ CORRUPTION DETECTED${RESET}\n`);
    console.log('Corrupted/Empty files:');
    checks.filter(c => c.status === 'corrupted' || c.status === 'empty').forEach(c => {
      console.log(`  - ${c.name}: ${c.path}`);
    });
    console.log(`\n${YELLOW}Run: npm run reinstall${RESET}\n`);
    process.exit(1);
  } else if (missingCount > 3) {
    console.log(`${YELLOW}${BOLD}⚠ MISSING FILES${RESET}\n`);
    console.log('Missing files (may be optional):');
    checks.filter(c => c.status === 'missing').forEach(c => {
      console.log(`  - ${c.name}`);
    });
    console.log();
  } else {
    console.log(`${GREEN}${BOLD}✓ NO CORRUPTION DETECTED${RESET}\n`);
    console.log('All critical files are intact and valid.\n');
  }
}

runChecks().catch(error => {
  console.error(`\n${RED}${BOLD}✗ Check failed:${RESET}`, error.message);
  process.exit(1);
});
