/**
 * Validate command
 * Validates all schema files for errors and warnings
 */

import { logger } from './shared/logger.js';
import { loadAllSchemas } from './shared/schema-loader.js';
import { validateAllSchemas } from './validators/schema-validator.js';
import { checkCircularDependencies } from './runners/dependency-resolver.js';

/**
 * Run the validate command
 * @param {object} options - Command options
 */
export async function runValidate(options = {}) {
  const { verbose = false } = options;

  logger.heading('🔍 Validating schemas...');
  logger.newline();

  // Load all schemas
  const schemas = await loadAllSchemas(verbose);

  if (schemas.length === 0) {
    logger.error('No schema files found');
    logger.info('Expected location: {agent}/database/schemas/*.json');
    return;
  }

  logger.info(`Found ${schemas.length} schema(s) to validate`);
  logger.newline();

  // Check for circular dependencies
  logger.heading('🔄 Checking for circular dependencies...');
  const circularCheck = checkCircularDependencies(schemas);

  if (circularCheck.hasCircular) {
    logger.error('Circular dependencies detected!');
    for (const cycle of circularCheck.cycles) {
      logger.indent(`  ${cycle}`);
    }
    logger.newline();
  } else {
    logger.success('No circular dependencies found');
    logger.newline();
  }

  // Validate each schema
  logger.heading('📋 Schema validation results:');
  logger.newline();

  const validationResults = validateAllSchemas(schemas);

  let totalErrors = 0;
  let totalWarnings = 0;
  let validCount = 0;

  for (const [tableName, result] of Object.entries(validationResults)) {
    const schema = schemas.find(s => s.table === tableName);
    const source = schema?._metadata?.source || 'unknown';
    const file = schema?._metadata?.file || 'unknown';

    if (!result.valid) {
      logger.error(`${file} (${source}) - ERROR`);

      for (const error of result.errors) {
        logger.indent(`  ❌ ${error}`);
        totalErrors++;
      }

      for (const warning of result.warnings) {
        logger.indent(`  ⚠️  ${warning}`);
        totalWarnings++;
      }

      logger.newline();
    } else if (result.warnings.length > 0) {
      logger.warning(`${file} (${source}) - WARNING`);

      for (const warning of result.warnings) {
        logger.indent(`  ⚠️  ${warning}`);
        totalWarnings++;
      }

      logger.newline();
    } else {
      logger.success(`${file} (${source}) - Valid`);
      validCount++;
    }
  }

  logger.newline();

  // Summary
  if (totalErrors > 0) {
    logger.summary('❌ Validation failed', {
      'Valid schemas': validCount,
      'Errors': totalErrors,
      'Warnings': totalWarnings
    });

    process.exit(1);
  } else if (totalWarnings > 0) {
    logger.summary('⚠️  Validation passed with warnings', {
      'Valid schemas': validCount,
      'Warnings': totalWarnings
    });
  } else {
    logger.summary('✅ All schemas valid!', {
      'Valid schemas': validCount
    });
  }
}
