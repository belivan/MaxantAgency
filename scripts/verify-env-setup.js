#!/usr/bin/env node

/**
 * Environment Setup Verification Script
 *
 * Verifies that all services can successfully load environment variables from root .env
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load root .env
dotenv.config({ path: resolve(__dirname, '.env') });

console.log(chalk.bold.cyan('\n🔍 Environment Configuration Verification\n'));
console.log(chalk.gray('=' .repeat(60)));

// Critical environment variables to check
const criticalVars = [
  { name: 'SUPABASE_URL', required: true, type: 'Database' },
  { name: 'SUPABASE_SERVICE_KEY', required: true, type: 'Database' },
  { name: 'ANTHROPIC_API_KEY', required: true, type: 'AI' },
  { name: 'OPENAI_API_KEY', required: true, type: 'AI' },
  { name: 'XAI_API_KEY', required: true, type: 'AI' },
  { name: 'GOOGLE_MAPS_API_KEY', required: false, type: 'Google' },
  { name: 'GOOGLE_SEARCH_API_KEY', required: false, type: 'Google' },
  { name: 'SENDER_NAME', required: true, type: 'Contact' },
  { name: 'SENDER_EMAIL', required: false, type: 'Contact' },
  { name: 'SENDER_WEBSITE', required: false, type: 'Contact' },
];

const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  total: 0
};

console.log('\n📋 Checking Environment Variables:\n');

criticalVars.forEach(({ name, required, type }) => {
  results.total++;
  const value = process.env[name];

  if (value) {
    // Mask sensitive values
    const displayValue = value.length > 20
      ? `${value.substring(0, 10)}...${value.substring(value.length - 4)}`
      : `${value.substring(0, 8)}...`;

    console.log(chalk.green('  ✓'), `${name.padEnd(30)} ${chalk.gray(`[${type}]`)} ${chalk.dim(displayValue)}`);
    results.passed++;
  } else {
    if (required) {
      console.log(chalk.red('  ✗'), `${name.padEnd(30)} ${chalk.gray(`[${type}]`)} ${chalk.red('MISSING (Required)')}`);
      results.failed++;
    } else {
      console.log(chalk.yellow('  ⚠'), `${name.padEnd(30)} ${chalk.gray(`[${type}]`)} ${chalk.yellow('Not set (Optional)')}`);
      results.warnings++;
    }
  }
});

console.log(chalk.gray('\n' + '='.repeat(60)));

// Check if .env file exists
console.log('\n📁 File Checks:\n');

const envPath = resolve(__dirname, '.env');
if (fs.existsSync(envPath)) {
  console.log(chalk.green('  ✓'), '.env file exists in root directory');
} else {
  console.log(chalk.red('  ✗'), '.env file NOT FOUND in root directory');
  console.log(chalk.yellow('      Run: cp .env.example .env'));
  results.failed++;
}

// Check if old .env files still exist (they shouldn't)
console.log('\n🗑️  Checking for old .env files (should be removed):\n');

const oldEnvPaths = [
  'analysis-engine/.env',
  'prospecting-engine/.env',
  'outreach-engine/.env',
  'pipeline-orchestrator/.env',
  'database-tools/.env',
  'command-center-ui/.env',
  'command-center-ui/.env.local'
];

oldEnvPaths.forEach(path => {
  if (fs.existsSync(resolve(__dirname, path))) {
    console.log(chalk.yellow('  ⚠'), `${path} still exists (should be removed)`);
    results.warnings++;
  } else {
    console.log(chalk.green('  ✓'), `${path} removed ✓`);
  }
});

// Final summary
console.log(chalk.gray('\n' + '='.repeat(60)));
console.log(chalk.bold('\n📊 Summary:\n'));

console.log(`  Total Variables Checked: ${results.total}`);
console.log(chalk.green(`  ✓ Passed: ${results.passed}`));
if (results.warnings > 0) {
  console.log(chalk.yellow(`  ⚠ Warnings: ${results.warnings}`));
}
if (results.failed > 0) {
  console.log(chalk.red(`  ✗ Failed: ${results.failed}`));
}

console.log(chalk.gray('\n' + '='.repeat(60)));

// Final result
if (results.failed > 0) {
  console.log(chalk.red.bold('\n❌ FAILED: Please fix the issues above\n'));
  process.exit(1);
} else if (results.warnings > 0) {
  console.log(chalk.yellow.bold('\n⚠️  WARNING: Some optional variables are not set\n'));
  console.log(chalk.gray('   This is OK if you don\'t need those features.\n'));
  process.exit(0);
} else {
  console.log(chalk.green.bold('\n✅ SUCCESS: All environment variables are properly configured!\n'));
  console.log(chalk.gray('   You can now run: npm run dev\n'));
  process.exit(0);
}
