#!/usr/bin/env node
/**
 * Cleanup "- Copy" files that cause module resolution issues
 * These are created by Windows during file conflicts
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

const BOLD = '\x1b[1m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

console.log(`\n${BOLD}🧹 MaxantAgency Copy File Cleanup${RESET}\n`);
console.log('='.repeat(70));

/**
 * Count "- Copy" files
 */
async function countCopyFiles() {
  try {
    console.log(`\n${YELLOW}Scanning for "- Copy" files...${RESET}\n`);
    
    const { stdout } = await execAsync(
      'powershell -Command "(Get-ChildItem -Path . -Recurse -File -Filter \'*- Copy*\' -ErrorAction SilentlyContinue | Measure-Object).Count"'
    );
    
    return parseInt(stdout.trim());
  } catch (error) {
    console.error(`${RED}Error counting files:${RESET}`, error.message);
    return 0;
  }
}

/**
 * Delete "- Copy" files
 */
async function deleteCopyFiles() {
  try {
    console.log(`${YELLOW}Deleting "- Copy" files...${RESET}\n`);
    
    // Use PowerShell to delete all "- Copy" files
    await execAsync(
      'powershell -Command "Get-ChildItem -Path . -Recurse -File -Filter \'*- Copy*\' -ErrorAction SilentlyContinue | Remove-Item -Force"'
    );
    
    return true;
  } catch (error) {
    console.error(`${RED}Error deleting files:${RESET}`, error.message);
    return false;
  }
}

/**
 * Main cleanup process
 */
async function main() {
  try {
    // Count files before
    const beforeCount = await countCopyFiles();
    console.log(`${YELLOW}Found ${beforeCount} "- Copy" files${RESET}\n`);
    
    if (beforeCount === 0) {
      console.log(`${GREEN}✓ No "- Copy" files found. System is clean!${RESET}\n`);
      return;
    }
    
    // Delete files
    const success = await deleteCopyFiles();
    
    if (!success) {
      console.log(`${RED}✗ Failed to delete files${RESET}\n`);
      process.exit(1);
    }
    
    // Count files after
    const afterCount = await countCopyFiles();
    const deleted = beforeCount - afterCount;
    
    console.log('='.repeat(70));
    console.log(`\n${GREEN}${BOLD}✓ Cleanup complete!${RESET}`);
    console.log(`${GREEN}Deleted ${deleted} files${RESET}\n`);
    
    if (afterCount > 0) {
      console.log(`${YELLOW}⚠ ${afterCount} files could not be deleted (possibly in use)${RESET}\n`);
    }
    
    console.log(`\n${BOLD}Next steps:${RESET}`);
    console.log(`1. Reinstall node_modules: ${YELLOW}npm run reinstall${RESET}`);
    console.log(`2. Start services: ${YELLOW}node start-all.js${RESET}\n`);
    
  } catch (error) {
    console.error(`\n${RED}${BOLD}✗ Cleanup failed:${RESET}`, error.message);
    process.exit(1);
  }
}

main();
