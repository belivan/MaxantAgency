#!/usr/bin/env node
/**
 * Reinstall all dependencies for all engines
 * Cleans and reinstalls to avoid "- Copy" file issues
 */

import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';

const execAsync = promisify(exec);

const SERVICES = [
  { name: 'Root', dir: '.', color: '\x1b[37m' },
  { name: 'Command Center UI', dir: 'command-center-ui', color: '\x1b[36m' },
  { name: 'Prospecting Engine', dir: 'prospecting-engine', color: '\x1b[32m' },
  { name: 'Analysis Engine', dir: 'analysis-engine', color: '\x1b[33m' },
  { name: 'Outreach Engine', dir: 'outreach-engine', color: '\x1b[35m' },
  { name: 'Pipeline Orchestrator', dir: 'pipeline-orchestrator', color: '\x1b[34m' },
  { name: 'Database Tools', dir: 'database-tools', color: '\x1b[90m' },
  { name: 'QA Supervisor', dir: 'qa-supervisor', color: '\x1b[95m' }
];

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';

console.log(`\n${BOLD}📦 MaxantAgency Dependency Reinstaller${RESET}\n`);
console.log('='.repeat(70));
console.log(`${YELLOW}This will clean and reinstall all node_modules${RESET}\n`);

/**
 * Check if directory has package.json
 */
async function hasPackageJson(dir) {
  try {
    await fs.access(`${dir}/package.json`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Remove node_modules directory
 */
async function removeNodeModules(dir) {
  try {
    const fullPath = `${dir}/node_modules`;
    console.log(`  Removing ${fullPath}...`);
    
    // Use PowerShell for faster recursive delete
    await execAsync(`powershell -Command "if (Test-Path '${fullPath}') { Remove-Item -Path '${fullPath}' -Recurse -Force }"`);
    
    return true;
  } catch (error) {
    console.log(`  ${YELLOW}⚠ Could not remove node_modules: ${error.message}${RESET}`);
    return false;
  }
}

/**
 * Install dependencies
 */
async function installDependencies(dir) {
  return new Promise((resolve) => {
    console.log(`  Installing dependencies...`);
    
    const child = spawn('npm', ['install'], {
      cwd: dir,
      shell: true,
      stdio: 'pipe'
    });

    let output = '';
    
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      output += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`  ${GREEN}✓ Install complete${RESET}`);
        resolve(true);
      } else {
        console.log(`  ${RED}✗ Install failed${RESET}`);
        console.log(output);
        resolve(false);
      }
    });
  });
}

/**
 * Process a single service
 */
async function processService(service) {
  console.log(`\n${service.color}${BOLD}${service.name}${RESET}`);
  
  // Check if has package.json
  const hasPackage = await hasPackageJson(service.dir);
  
  if (!hasPackage) {
    console.log(`  ${YELLOW}⚠ No package.json found, skipping${RESET}`);
    return { name: service.name, success: true, skipped: true };
  }
  
  // Remove node_modules
  await removeNodeModules(service.dir);
  
  // Install dependencies
  const success = await installDependencies(service.dir);
  
  return { name: service.name, success, skipped: false };
}

/**
 * Main reinstall process
 */
async function main() {
  try {
    console.log(`${BOLD}Step 1: Cleaning node_modules${RESET}\n`);
    console.log('='.repeat(70));
    
    const results = [];
    
    // Process each service sequentially to avoid overwhelming the system
    for (const service of SERVICES) {
      const result = await processService(service);
      results.push(result);
    }
    
    // Summary
    console.log('\n' + '='.repeat(70));
    console.log(`\n${BOLD}📊 Reinstall Summary${RESET}\n`);
    
    let successCount = 0;
    let failCount = 0;
    let skipCount = 0;
    
    for (const result of results) {
      if (result.skipped) {
        console.log(`${YELLOW}⊘${RESET} ${result.name}: Skipped`);
        skipCount++;
      } else if (result.success) {
        console.log(`${GREEN}✓${RESET} ${result.name}: Success`);
        successCount++;
      } else {
        console.log(`${RED}✗${RESET} ${result.name}: Failed`);
        failCount++;
      }
    }
    
    console.log('\n' + '='.repeat(70));
    console.log(`\n${GREEN}Success: ${successCount}${RESET} | ${RED}Failed: ${failCount}${RESET} | ${YELLOW}Skipped: ${skipCount}${RESET}\n`);
    
    if (failCount === 0) {
      console.log(`${GREEN}${BOLD}✓ All dependencies reinstalled successfully!${RESET}\n`);
      console.log(`${BOLD}Next step:${RESET} Start services with ${YELLOW}node start-all.js${RESET}\n`);
    } else {
      console.log(`${RED}${BOLD}✗ Some installations failed${RESET}\n`);
      console.log(`Check the output above for details\n`);
      process.exit(1);
    }
    
  } catch (error) {
    console.error(`\n${RED}${BOLD}✗ Reinstall failed:${RESET}`, error.message);
    process.exit(1);
  }
}

main();
