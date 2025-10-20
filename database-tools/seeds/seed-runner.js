/**
 * Seed runner
 * Loads and inserts seed data from JSON files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../shared/logger.js';
import { initSupabase } from '../runners/supabase-runner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get all seed files
 * @returns {string[]} Array of seed file paths
 */
function getSeedFiles() {
  const seedsDir = __dirname;

  if (!fs.existsSync(seedsDir)) {
    return [];
  }

  return fs.readdirSync(seedsDir)
    .filter(f => f.endsWith('.json') && f !== 'seed-runner.js')
    .map(f => path.join(seedsDir, f));
}

/**
 * Load a seed file
 * @param {string} filePath - Path to seed file
 * @returns {object} Seed data
 */
function loadSeedFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    logger.error(`Failed to load seed file ${filePath}: ${error.message}`);
    return null;
  }
}

/**
 * Insert seed data for a table
 * @param {string} table - Table name
 * @param {object[]} data - Array of rows to insert
 * @param {object} options - Insert options
 * @returns {Promise<number>} Number of rows inserted
 */
export async function insertSeedData(table, data, options = {}) {
  const { reset = false } = options;
  const supabase = initSupabase();

  // Reset table if requested
  if (reset) {
    logger.info(`Clearing existing data from ${table}...`);
    const { error: deleteError } = await supabase
      .from(table)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteError) {
      logger.warning(`Failed to clear ${table}: ${deleteError.message}`);
    }
  }

  // Insert data
  let inserted = 0;

  for (const row of data) {
    const { error } = await supabase
      .from(table)
      .insert(row);

    if (error) {
      logger.warning(`Failed to insert row into ${table}: ${error.message}`);
    } else {
      inserted++;
    }
  }

  return inserted;
}

/**
 * Run all seed files
 * @param {object} options - Seed options
 * @returns {Promise<object>} Summary of seeding
 */
export async function runSeeds(options = {}) {
  const { reset = false, verbose = false } = options;

  const seedFiles = getSeedFiles();

  if (seedFiles.length === 0) {
    logger.warning('No seed files found');
    return { totalFiles: 0, totalRows: 0 };
  }

  logger.info(`Found ${seedFiles.length} seed file(s)`);
  logger.newline();

  let totalRows = 0;

  for (const filePath of seedFiles) {
    const fileName = path.basename(filePath);
    logger.info(`Processing ${fileName}...`);

    const seed = loadSeedFile(filePath);

    if (!seed || !seed.table || !seed.data) {
      logger.error(`Invalid seed file format: ${fileName}`);
      continue;
    }

    try {
      const inserted = await insertSeedData(seed.table, seed.data, { reset });

      logger.success(`  Inserted ${inserted} row(s) into ${seed.table}`);
      totalRows += inserted;
    } catch (error) {
      logger.error(`  Failed to seed ${seed.table}: ${error.message}`);
    }
  }

  return {
    totalFiles: seedFiles.length,
    totalRows
  };
}
