#!/usr/bin/env node

/**
 * Backup Validation Script
 *
 * Scans all backup directories and validates JSON backup files for:
 * - Valid JSON syntax
 * - Required fields
 * - Valid timestamps
 * - Filename consistency
 *
 * Usage:
 *   node validate-existing-backups.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const BACKUP_ROOT = path.join(__dirname, '..', '..', 'local-backups');

// Required fields for different backup types
const REQUIRED_FIELDS = {
  common: ['saved_at', 'company_name', 'uploaded_to_db'],
  prospect: ['prospect_data'],
  lead: ['lead_data', 'analysis_result']
};

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

// Validation results storage
const results = {
  engines: {},
  totalFiles: 0,
  totalValid: 0,
  totalInvalid: 0,
  errors: []
};

/**
 * Sanitize company name for filename validation
 * Matches the sanitization used in backup scripts
 */
function sanitizeCompanyName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Validate a single backup file
 */
function validateBackupFile(filePath, engineName, subdirectory) {
  const validation = {
    valid: true,
    errors: [],
    warnings: []
  };

  try {
    // 1. Check file exists and is readable
    if (!fs.existsSync(filePath)) {
      validation.valid = false;
      validation.errors.push('File does not exist');
      return validation;
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');

    // 2. Validate JSON syntax
    let data;
    try {
      data = JSON.parse(fileContent);
    } catch (parseError) {
      validation.valid = false;
      validation.errors.push(`Invalid JSON: ${parseError.message}`);
      return validation;
    }

    // 3. Check required common fields
    for (const field of REQUIRED_FIELDS.common) {
      if (!data.hasOwnProperty(field)) {
        validation.valid = false;
        validation.errors.push(`Missing required field: ${field}`);
      }
    }

    // 4. Check engine-specific required fields
    const isProspect = engineName === 'prospecting-engine' || subdirectory === 'prospects';
    const isLead = engineName === 'analysis-engine' || subdirectory === 'leads';

    if (isProspect && !data.hasOwnProperty('prospect_data')) {
      validation.errors.push('Missing prospect_data field (expected for prospect backup)');
      validation.warnings.push('May be a different backup type');
    }

    if (isLead && !data.hasOwnProperty('lead_data')) {
      validation.errors.push('Missing lead_data field (expected for lead backup)');
      validation.warnings.push('May be a different backup type');
    }

    // 5. Validate timestamp fields
    if (data.saved_at) {
      const savedAt = new Date(data.saved_at);
      if (isNaN(savedAt.getTime())) {
        validation.valid = false;
        validation.errors.push(`Invalid saved_at timestamp: ${data.saved_at}`);
      }
    }

    if (data.analyzed_at) {
      const analyzedAt = new Date(data.analyzed_at);
      if (isNaN(analyzedAt.getTime())) {
        validation.warnings.push(`Invalid analyzed_at timestamp: ${data.analyzed_at}`);
      }
    }

    if (data.failed_at) {
      const failedAt = new Date(data.failed_at);
      if (isNaN(failedAt.getTime())) {
        validation.warnings.push(`Invalid failed_at timestamp: ${data.failed_at}`);
      }
    }

    // 6. Validate filename matches content
    if (data.company_name) {
      const sanitized = sanitizeCompanyName(data.company_name);
      const filename = path.basename(filePath);

      if (!filename.startsWith(sanitized)) {
        validation.warnings.push(
          `Filename doesn't match company name. Expected to start with: ${sanitized}, got: ${filename}`
        );
      }
    }

    // 7. Check upload status fields
    if (subdirectory === 'failed-uploads') {
      if (!data.upload_failed && !data.upload_error) {
        validation.warnings.push('In failed-uploads directory but missing upload_failed/upload_error fields');
      }
    }

    // 8. Validate upload_status if present
    if (data.upload_status && !['pending', 'success', 'failed'].includes(data.upload_status)) {
      validation.warnings.push(`Unknown upload_status value: ${data.upload_status}`);
    }

  } catch (error) {
    validation.valid = false;
    validation.errors.push(`Validation error: ${error.message}`);
  }

  return validation;
}

/**
 * Scan a directory for backup files
 */
function scanDirectory(dirPath, engineName, subdirectory) {
  const dirResults = {
    total: 0,
    valid: 0,
    invalid: 0,
    files: []
  };

  if (!fs.existsSync(dirPath)) {
    return dirResults;
  }

  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    if (!file.endsWith('.json')) continue;

    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);

    if (!stat.isFile()) continue;

    dirResults.total++;
    results.totalFiles++;

    const validation = validateBackupFile(filePath, engineName, subdirectory);

    dirResults.files.push({
      filename: file,
      path: filePath,
      validation
    });

    if (validation.valid) {
      dirResults.valid++;
      results.totalValid++;
    } else {
      dirResults.invalid++;
      results.totalInvalid++;
      results.errors.push({
        file: path.relative(BACKUP_ROOT, filePath),
        errors: validation.errors,
        warnings: validation.warnings
      });
    }
  }

  return dirResults;
}

/**
 * Scan all backup directories
 */
function scanAllBackups() {
  const engines = ['prospecting-engine', 'analysis-engine'];

  for (const engineName of engines) {
    const enginePath = path.join(BACKUP_ROOT, engineName);

    if (!fs.existsSync(enginePath)) {
      continue;
    }

    results.engines[engineName] = {};

    // Check for standard subdirectories
    const subdirectories = ['prospects', 'leads', 'failed-uploads'];

    for (const subdir of subdirectories) {
      const subdirPath = path.join(enginePath, subdir);

      if (fs.existsSync(subdirPath)) {
        results.engines[engineName][subdir] = scanDirectory(
          subdirPath,
          engineName,
          subdir
        );
      }
    }

    // Also scan root of engine directory
    const rootFiles = scanDirectory(enginePath, engineName, 'root');
    if (rootFiles.total > 0) {
      results.engines[engineName]['root'] = rootFiles;
    }
  }
}

/**
 * Print formatted validation report
 */
function printReport() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  BACKUP VALIDATION REPORT                                      ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  // Print results by engine and subdirectory
  for (const [engineName, subdirs] of Object.entries(results.engines)) {
    const engineLabel = engineName.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
    console.log(`${colors.bright}${engineLabel}:${colors.reset}`);

    const subdirNames = Object.keys(subdirs);
    if (subdirNames.length === 0) {
      console.log(`  ${colors.gray}No backup files found${colors.reset}\n`);
      continue;
    }

    for (const [subdirName, dirResults] of Object.entries(subdirs)) {
      const label = subdirName === 'root' ? '(root directory)' : `${subdirName}/`;
      console.log(`  ${label}: ${dirResults.total} files`);

      if (dirResults.total > 0) {
        const validIcon = dirResults.valid === dirResults.total ? '✅' : '✓';
        const invalidIcon = dirResults.invalid > 0 ? '❌' : '✗';

        console.log(`    ${colors.green}${validIcon} Valid: ${dirResults.valid}${colors.reset}`);

        if (dirResults.invalid > 0) {
          console.log(`    ${colors.red}${invalidIcon} Invalid: ${dirResults.invalid}${colors.reset}`);
        } else {
          console.log(`    ${colors.gray}${invalidIcon} Invalid: 0${colors.reset}`);
        }
      }
      console.log();
    }
  }

  // Print summary
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`TOTAL: ${results.totalFiles} files scanned`);

  if (results.totalValid === results.totalFiles) {
    console.log(`${colors.green}✅ VALID: ${results.totalValid} (100%)${colors.reset}`);
    console.log(`${colors.gray}❌ INVALID: 0${colors.reset}`);
  } else {
    const validPercent = ((results.totalValid / results.totalFiles) * 100).toFixed(1);
    const invalidPercent = ((results.totalInvalid / results.totalFiles) * 100).toFixed(1);

    console.log(`${colors.green}✅ VALID: ${results.totalValid} (${validPercent}%)${colors.reset}`);
    console.log(`${colors.red}❌ INVALID: ${results.totalInvalid} (${invalidPercent}%)${colors.reset}`);
  }
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Print detailed errors if any
  if (results.errors.length > 0) {
    console.log(`\n${colors.bright}${colors.red}VALIDATION ERRORS:${colors.reset}\n`);

    for (const error of results.errors) {
      console.log(`${colors.yellow}File: ${error.file}${colors.reset}`);

      if (error.errors.length > 0) {
        console.log(`  ${colors.red}Errors:${colors.reset}`);
        for (const err of error.errors) {
          console.log(`    - ${err}`);
        }
      }

      if (error.warnings.length > 0) {
        console.log(`  ${colors.yellow}Warnings:${colors.reset}`);
        for (const warn of error.warnings) {
          console.log(`    - ${warn}`);
        }
      }

      console.log();
    }
  }
}

/**
 * Main execution
 */
function main() {
  console.log(`${colors.cyan}Scanning backup directories...${colors.reset}`);
  console.log(`${colors.gray}Root: ${BACKUP_ROOT}${colors.reset}\n`);

  // Check if backup root exists
  if (!fs.existsSync(BACKUP_ROOT)) {
    console.log(`${colors.red}Error: Backup root directory not found: ${BACKUP_ROOT}${colors.reset}`);
    console.log(`${colors.yellow}No backups to validate.${colors.reset}\n`);
    process.exit(0);
  }

  // Scan all backups
  scanAllBackups();

  // Print report
  printReport();

  // Exit with appropriate code
  if (results.totalInvalid > 0) {
    process.exit(1);
  } else if (results.totalFiles === 0) {
    console.log(`${colors.yellow}No backup files found to validate.${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${colors.green}All backup files are valid!${colors.reset}\n`);
    process.exit(0);
  }
}

// Run the script
main();