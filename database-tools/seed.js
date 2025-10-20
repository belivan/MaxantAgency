/**
 * Seed command
 * Inserts example/test data into the database
 */

import { logger } from './shared/logger.js';
import { runSeeds } from './seeds/seed-runner.js';
import { testConnection } from './runners/supabase-runner.js';

/**
 * Run the seed command
 * @param {object} options - Command options
 */
export async function runSeed(options = {}) {
  const { reset = false, verbose = false } = options;

  logger.heading('🌱 Seeding database...');
  logger.newline();

  // Test connection
  const connectionOk = await testConnection();

  if (!connectionOk) {
    logger.error('Failed to connect to Supabase');
    logger.info('Please check your .env file and ensure SUPABASE_URL and SUPABASE_SERVICE_KEY are set');
    return;
  }

  if (reset) {
    logger.warning('Reset mode enabled - existing data will be cleared');
    logger.newline();
  }

  // Run seeds
  const result = await runSeeds({ reset, verbose });

  logger.newline();

  if (result.totalRows === 0) {
    logger.warning('No data was seeded');
  } else {
    logger.summary('✅ Seeding complete!', {
      'Files processed': result.totalFiles,
      'Rows inserted': result.totalRows
    });
  }
}
