/**
 * Setup command
 * Main database setup logic - creates all tables, indexes, and constraints
 */

import ora from 'ora';
import { logger } from './shared/logger.js';
import { loadAllSchemas } from './shared/schema-loader.js';
import { validateAllSchemas } from './validators/schema-validator.js';
import { resolveDependencies } from './runners/dependency-resolver.js';
import { generateAllSQL, countStatements, generateMigrationFile } from './generators/sql-generator.js';
import { executeSQL, testConnection, dropTable } from './runners/supabase-runner.js';
import fs from 'fs';
import path from 'path';

/**
 * Run the setup command
 * @param {object} options - Command options
 */
export async function runSetup(options = {}) {
  const {
    dryRun = false,
    verbose = false,
    skipConstraints = false,
    force = false
  } = options;

  const startTime = Date.now();

  logger.heading('🔍 Scanning for schema files...');

  // Load all schemas
  const spinner = ora('Loading schemas...').start();
  const schemas = await loadAllSchemas(verbose);

  if (schemas.length === 0) {
    spinner.fail('No schema files found');
    logger.error('No schemas found in agent directories');
    logger.info('Expected location: {agent}/database/schemas/*.json');
    return;
  }

  spinner.succeed(`Found ${schemas.length} schemas across ${getAgentCount(schemas)} agents`);
  logger.newline();

  // Show loaded schemas
  logger.heading('📄 Loading schemas...');
  for (const schema of schemas) {
    logger.success(`${schema._metadata.source}/database/schemas/${schema._metadata.file}`);
  }

  logger.newline();

  // Validate schemas
  logger.heading('🔍 Validating schemas...');
  const validationResults = validateAllSchemas(schemas);

  let hasErrors = false;
  let hasWarnings = false;

  for (const [tableName, result] of Object.entries(validationResults)) {
    if (!result.valid) {
      hasErrors = true;
      logger.error(`${tableName} - FAILED`);
      for (const error of result.errors) {
        logger.indent(`  ❌ ${error}`);
      }
    } else if (result.warnings.length > 0) {
      hasWarnings = true;
      logger.warning(`${tableName} - Warnings`);
      for (const warning of result.warnings) {
        logger.indent(`  ⚠️  ${warning}`);
      }
    } else {
      logger.success(`${tableName} - Valid`);
    }
  }

  if (hasErrors) {
    logger.newline();
    logger.error('❌ Validation failed - please fix errors before continuing');
    return;
  }

  logger.newline();

  // Resolve dependencies
  logger.heading('🔧 Resolving dependencies...');
  const orderedSchemas = resolveDependencies(schemas);

  for (const schema of orderedSchemas) {
    const deps = schema.foreignKeys?.map(fk => fk.references.split('.')[0]) || [];
    const depText = deps.length > 0 ? `depends on: ${deps.join(', ')}` : 'no dependencies';
    logger.indent(`${schema.table} (${depText})`);
  }

  logger.newline();

  // Generate SQL
  logger.heading('🏗️  Generating SQL...');
  const allSQL = generateAllSQL(orderedSchemas, { force, skipConstraints });
  const counts = countStatements(allSQL);

  logger.info(`Generated ${counts.tables} CREATE TABLE statements`);
  logger.info(`Generated ${counts.indexes} CREATE INDEX statements`);
  if (!skipConstraints) {
    logger.info(`Generated ${counts.constraints} ALTER TABLE (foreign keys)`);
  }

  logger.newline();

  // Dry run - just show SQL and exit
  if (dryRun) {
    logger.heading('📄 Generated SQL (Dry Run):');
    logger.newline();

    const migrationSQL = generateMigrationFile(orderedSchemas, { force, skipConstraints });
    console.log(migrationSQL);

    logger.newline();
    logger.success('✅ Dry run complete - no changes made to database');
    return;
  }

  // Test connection
  logger.heading('🔌 Testing database connection...');
  const connectionOk = await testConnection();

  if (!connectionOk) {
    logger.error('Failed to connect to Supabase');
    logger.info('Please check your .env file and ensure SUPABASE_URL and SUPABASE_SERVICE_KEY are set');
    return;
  }

  logger.success('Connected to Supabase');
  logger.newline();

  // Execute SQL
  logger.heading('🚀 Executing on Supabase...');

  // Drop tables if force mode
  if (force) {
    logger.warning('Force mode enabled - dropping existing tables...');
    // Drop in reverse order
    for (const schema of orderedSchemas.slice().reverse()) {
      const dropSpinner = ora(`Dropping table: ${schema.table}`).start();
      await dropTable(schema.table, true);
      dropSpinner.succeed(`Dropped table: ${schema.table}`);
    }
    logger.newline();
  }

  // Create tables
  for (const item of allSQL) {
    const tableSpinner = ora(`Creating table: ${item.table}`).start();

    const result = await executeSQL(item.sql.table, verbose);

    if (result.success) {
      tableSpinner.succeed(`Created table: ${item.table}`);
    } else {
      tableSpinner.fail(`Failed to create table: ${item.table}`);
      logger.error(`  Error: ${result.error}`);

      if (!force) {
        logger.error('Setup aborted due to error');
        return;
      }
    }
  }

  logger.newline();

  // Create indexes
  let indexCount = 0;
  const indexSpinner = ora('Creating indexes...').start();

  for (const item of allSQL) {
    for (const indexSQL of item.sql.indexes) {
      const result = await executeSQL(indexSQL, verbose);
      if (result.success) {
        indexCount++;
      } else {
        logger.debug(`Index creation failed: ${result.error}`, verbose);
      }
    }
  }

  indexSpinner.succeed(`Created ${indexCount} indexes`);
  logger.newline();

  // Create foreign keys
  if (!skipConstraints) {
    let constraintCount = 0;
    const constraintSpinner = ora('Creating foreign key constraints...').start();

    for (const item of allSQL) {
      for (const constraintSQL of item.sql.constraints) {
        const result = await executeSQL(constraintSQL, verbose);
        if (result.success) {
          constraintCount++;
        } else {
          logger.debug(`Constraint creation failed: ${result.error}`, verbose);
        }
      }
    }

    constraintSpinner.succeed(`Created ${constraintCount} foreign key constraints`);
  }

  logger.newline();

  // Summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  logger.summary('✅ Database setup complete!', {
    'Tables': counts.tables,
    'Indexes': indexCount,
    'Constraints': skipConstraints ? 'skipped' : constraintCount,
    'Duration': `${duration}s`
  });
}

/**
 * Get count of unique agents
 * @param {object[]} schemas - Array of schemas
 * @returns {number} Number of unique agents
 */
function getAgentCount(schemas) {
  const agents = new Set(schemas.map(s => s._metadata?.source));
  return agents.size;
}
