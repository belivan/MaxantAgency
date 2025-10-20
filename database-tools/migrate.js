/**
 * Migrate command
 * Applies database migrations from migration files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from './shared/logger.js';
import { executeSQL } from './runners/supabase-runner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const HISTORY_FILE = path.join(MIGRATIONS_DIR, 'history.json');

/**
 * Load migration history
 * @returns {object} Migration history
 */
function loadMigrationHistory() {
  if (!fs.existsSync(HISTORY_FILE)) {
    return { migrations: [] };
  }

  try {
    const content = fs.readFileSync(HISTORY_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    logger.warning('Failed to load migration history, starting fresh');
    return { migrations: [] };
  }
}

/**
 * Save migration history
 * @param {object} history - History to save
 */
function saveMigrationHistory(history) {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf-8');
}

/**
 * Get list of migration files
 * @returns {string[]} Sorted array of migration file names
 */
function getMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    return [];
  }

  return fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();
}

/**
 * Run the migrate command
 * @param {object} options - Command options
 */
export async function runMigrate(options = {}) {
  const { version = null, rollback = false, verbose = false } = options;

  logger.heading('🔄 Running migrations...');
  logger.newline();

  // Load history
  const history = loadMigrationHistory();
  const appliedMigrations = new Set(history.migrations.map(m => m.version));

  logger.info(`Previously applied: ${appliedMigrations.size} migrations`);
  logger.newline();

  // Get migration files
  const files = getMigrationFiles();

  if (files.length === 0) {
    logger.warning('No migration files found');
    logger.info(`Expected location: ${MIGRATIONS_DIR}/*.sql`);
    return;
  }

  logger.info(`Found ${files.length} migration file(s)`);
  logger.newline();

  // Find migrations to run
  const toRun = [];

  for (const file of files) {
    const versionMatch = file.match(/^(\d+)_/);
    if (!versionMatch) {
      logger.warning(`Skipping ${file} - invalid filename format (expected: 001_name.sql)`);
      continue;
    }

    const fileVersion = versionMatch[1];

    // Skip if already applied
    if (appliedMigrations.has(fileVersion)) {
      logger.debug(`Skipping ${file} - already applied`, verbose);
      continue;
    }

    // If specific version requested, only run that one
    if (version && fileVersion !== version) {
      continue;
    }

    toRun.push({ file, version: fileVersion });
  }

  if (toRun.length === 0) {
    logger.success('✅ Database is up to date - no migrations to run');
    return;
  }

  logger.info(`Will apply ${toRun.length} migration(s):`);
  for (const migration of toRun) {
    logger.indent(`  - ${migration.file}`);
  }
  logger.newline();

  // Run migrations
  for (const migration of toRun) {
    const filePath = path.join(MIGRATIONS_DIR, migration.file);

    logger.info(`Applying ${migration.file}...`);

    try {
      const sql = fs.readFileSync(filePath, 'utf-8');

      // Split into individual statements (simple split on semicolon)
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        const result = await executeSQL(statement + ';', verbose);

        if (!result.success) {
          logger.error(`Migration failed: ${result.error}`);
          logger.error('Aborting migration');
          return;
        }
      }

      // Record in history
      history.migrations.push({
        version: migration.version,
        name: migration.file,
        applied_at: new Date().toISOString()
      });

      saveMigrationHistory(history);

      logger.success(`✅ Applied ${migration.file}`);
    } catch (error) {
      logger.error(`Failed to apply ${migration.file}: ${error.message}`);
      logger.error('Aborting migration');
      return;
    }

    logger.newline();
  }

  logger.summary('✅ Migrations complete!', {
    'Migrations applied': toRun.length,
    'Total applied': history.migrations.length
  });
}
