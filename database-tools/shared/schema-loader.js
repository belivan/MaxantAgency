import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Schema loader utility
 * Scans all agent directories for database schema JSON files
 */

/**
 * Load all schemas from all agents
 * @param {boolean} verbose - Whether to show detailed logs
 * @returns {Promise<object[]>} Array of loaded schemas with metadata
 */
export async function loadAllSchemas(verbose = false) {
  const schemas = [];

  // Shared schemas directory (in database-tools/shared/schemas)
  const sharedSchemasDir = path.resolve(__dirname, 'schemas');

  // Agent directories to scan (relative to database-tools/)
  const agentDirs = [
    '../prospecting-engine',
    '../analysis-engine',
    '../outreach-engine',
    '../pipeline-orchestrator'
  ];

  logger.debug('Starting schema scan...', verbose);

  // Load shared schemas first
  if (fs.existsSync(sharedSchemasDir)) {
    logger.debug(`Checking ${sharedSchemasDir}`, verbose);

    const files = fs.readdirSync(sharedSchemasDir)
      .filter(f => f.endsWith('.json'));

    logger.debug(`  Found ${files.length} shared schema file(s)`, verbose);

    for (const file of files) {
      const filePath = path.join(sharedSchemasDir, file);

      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const schema = JSON.parse(content);

        schemas.push({
          ...schema,
          _metadata: {
            source: 'database-tools',
            file: file,
            path: filePath
          }
        });

        logger.debug(`    Loaded ${file}`, verbose);
      } catch (error) {
        logger.error(`Failed to load ${file}: ${error.message}`);
      }
    }
  }

  // Load agent schemas
  for (const dir of agentDirs) {
    const agentPath = path.resolve(__dirname, '..', dir);
    const schemaPath = path.join(agentPath, 'database', 'schemas');

    logger.debug(`Checking ${schemaPath}`, verbose);

    // Skip if directory doesn't exist
    if (!fs.existsSync(schemaPath)) {
      logger.debug(`  Directory not found, skipping`, verbose);
      continue;
    }

    // Find all JSON files
    const files = fs.readdirSync(schemaPath)
      .filter(f => f.endsWith('.json'));

    logger.debug(`  Found ${files.length} schema file(s)`, verbose);

    // Load each schema
    for (const file of files) {
      const filePath = path.join(schemaPath, file);

      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const schema = JSON.parse(content);

        schemas.push({
          ...schema,
          _metadata: {
            source: dir.replace('../', ''),
            file: file,
            path: filePath
          }
        });

        logger.debug(`    Loaded ${file}`, verbose);
      } catch (error) {
        logger.error(`Failed to load ${file}: ${error.message}`);
      }
    }
  }

  return schemas;
}

/**
 * Load a single schema by table name
 * @param {string} tableName - Name of table to find
 * @returns {Promise<object|null>} Schema object or null if not found
 */
export async function loadSchema(tableName) {
  const schemas = await loadAllSchemas();
  return schemas.find(s => s.table === tableName) || null;
}

/**
 * Get list of all agent directories that exist
 * @returns {string[]} Array of agent directory paths
 */
export function getAgentDirectories() {
  const agentDirs = [
    '../prospecting-engine',
    '../analysis-engine',
    '../outreach-engine',
    '../pipeline-orchestrator'
  ];

  return agentDirs
    .map(dir => path.resolve(__dirname, '..', dir))
    .filter(dir => fs.existsSync(dir));
}

/**
 * Check if a schema file exists for a given table
 * @param {string} tableName - Table name to check
 * @returns {Promise<boolean>} Whether schema exists
 */
export async function schemaExists(tableName) {
  const schema = await loadSchema(tableName);
  return schema !== null;
}
