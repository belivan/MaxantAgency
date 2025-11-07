/**
 * Syntax Validation Utility
 *
 * Validates JavaScript files for syntax errors, especially template literal corruption.
 *
 * Usage:
 *   node validate-syntax.js <file1> <file2> ...
 *   node validate-syntax.js ../shared/prompt-loader.js
 *   node validate-syntax.js services/*.js
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Check if a file has valid JavaScript syntax
 * @param {string} filePath - Path to the JavaScript file
 * @returns {Promise<object>} Result object with { valid, file, error }
 */
async function validateFile(filePath) {
  try {
    // Run node --check to validate syntax
    await execAsync(`node --check "${filePath}"`);

    // Also check for common template literal corruption patterns
    const content = await fs.readFile(filePath, 'utf-8');
    const issues = [];

    // Check for escaped backticks (corruption pattern)
    if (content.includes('\\`')) {
      issues.push('Found escaped backticks (\\`) - possible template literal corruption');
    }

    // Check for escaped dollar signs in what looks like template strings
    if (/\\\\?\$\{/.test(content) && content.includes('console.log')) {
      issues.push('Found escaped ${} syntax - possible template literal corruption');
    }

    return {
      valid: issues.length === 0,
      file: filePath,
      issues: issues.length > 0 ? issues : null
    };

  } catch (error) {
    return {
      valid: false,
      file: filePath,
      error: error.stderr || error.message
    };
  }
}

/**
 * Validate multiple files
 * @param {string[]} filePaths - Array of file paths to validate
 * @returns {Promise<object>} Summary object
 */
async function validateFiles(filePaths) {
  console.log(`\n🔍 Validating ${filePaths.length} file(s)...\n`);

  const results = await Promise.all(filePaths.map(validateFile));

  const passed = results.filter(r => r.valid);
  const failed = results.filter(r => !r.valid);

  // Print results
  passed.forEach(result => {
    console.log(`✅ ${result.file}`);
  });

  failed.forEach(result => {
    console.log(`\n❌ ${result.file}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    if (result.issues) {
      result.issues.forEach(issue => {
        console.log(`   ⚠️  ${issue}`);
      });
    }
  });

  // Summary
  console.log(`\n${'='.repeat(70)}`);
  console.log(`✅ Passed: ${passed.length}`);
  console.log(`❌ Failed: ${failed.length}`);
  console.log('='.repeat(70));

  return {
    passed: passed.length,
    failed: failed.length,
    results
  };
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('❌ Error: No files specified\n');
    console.log('Usage:');
    console.log('  node validate-syntax.js <file1> <file2> ...');
    console.log('\nExamples:');
    console.log('  node validate-syntax.js ../shared/prompt-loader.js');
    console.log('  node validate-syntax.js services/*.js');
    console.log('  node validate-syntax.js review-optimizations.js test-system.js');
    console.log('\nValidate all optimization files:');
    console.log('  node validate-syntax.js *.js services/*.js');
    process.exit(1);
  }

  // Resolve file paths
  const filePaths = args.map(arg => {
    // If relative path, resolve from current directory
    return path.isAbsolute(arg) ? arg : path.resolve(process.cwd(), arg);
  });

  // Check that files exist
  const existingFiles = [];
  for (const filePath of filePaths) {
    try {
      await fs.access(filePath);
      existingFiles.push(filePath);
    } catch (error) {
      console.warn(`⚠️  File not found: ${filePath}`);
    }
  }

  if (existingFiles.length === 0) {
    console.error('\n❌ No valid files found to validate\n');
    process.exit(1);
  }

  // Validate files
  const summary = await validateFiles(existingFiles);

  // Exit with error code if any failed
  if (summary.failed > 0) {
    console.log('\n❌ Syntax validation failed!\n');
    process.exit(1);
  } else {
    console.log('\n✅ All files passed syntax validation!\n');
    process.exit(0);
  }
}

main();
