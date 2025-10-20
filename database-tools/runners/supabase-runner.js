/**
 * Supabase runner
 * Executes SQL statements on Supabase database
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { logger } from '../shared/logger.js';

// Load environment variables
dotenv.config();

let supabaseClient = null;

/**
 * Initialize Supabase client
 * @returns {object} Supabase client
 */
export function initSupabase() {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env file'
    );
  }

  supabaseClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  return supabaseClient;
}

/**
 * Execute a single SQL statement
 * @param {string} sql - SQL statement to execute
 * @param {boolean} verbose - Whether to log details
 * @returns {Promise<object>} Result of execution
 */
export async function executeSQL(sql, verbose = false) {
  const supabase = initSupabase();

  logger.debug(`Executing SQL: ${sql.substring(0, 60)}...`, verbose);

  try {
    // Use RPC to execute raw SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    logger.debug(`SQL Error: ${error.message}`, verbose);
    return { success: false, error: error.message };
  }
}

/**
 * Execute multiple SQL statements in sequence
 * @param {string[]} statements - Array of SQL statements
 * @param {object} options - Execution options
 * @returns {Promise<object>} Execution results
 */
export async function executeSQLBatch(statements, options = {}) {
  const { verbose = false, stopOnError = true } = options;

  const results = [];
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const sql = statements[i];

    logger.debug(`Executing statement ${i + 1}/${statements.length}`, verbose);

    const result = await executeSQL(sql, verbose);

    results.push({
      index: i,
      sql: sql.substring(0, 50) + '...',
      ...result
    });

    if (result.success) {
      successCount++;
    } else {
      errorCount++;

      if (stopOnError) {
        logger.error(`Stopped at statement ${i + 1} due to error: ${result.error}`);
        break;
      }
    }
  }

  return {
    total: statements.length,
    executed: results.length,
    success: successCount,
    errors: errorCount,
    results
  };
}

/**
 * Check if a table exists
 * @param {string} tableName - Name of table to check
 * @returns {Promise<boolean>} Whether table exists
 */
export async function tableExists(tableName) {
  const sql = `
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = '${tableName}'
    );
  `;

  const result = await executeSQL(sql);
  return result.success && result.data?.[0]?.exists === true;
}

/**
 * List all tables in the database
 * @returns {Promise<string[]>} Array of table names
 */
export async function listTables() {
  const sql = `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `;

  const result = await executeSQL(sql);

  if (result.success && result.data) {
    return result.data.map(row => row.table_name);
  }

  return [];
}

/**
 * Drop a table
 * @param {string} tableName - Name of table to drop
 * @param {boolean} cascade - Whether to use CASCADE
 * @returns {Promise<object>} Result
 */
export async function dropTable(tableName, cascade = false) {
  const cascadeClause = cascade ? ' CASCADE' : '';
  const sql = `DROP TABLE IF EXISTS ${tableName}${cascadeClause};`;

  return await executeSQL(sql);
}

/**
 * Test database connection
 * @returns {Promise<boolean>} Whether connection is successful
 */
export async function testConnection() {
  try {
    const result = await executeSQL('SELECT 1 as test;');
    return result.success;
  } catch (error) {
    return false;
  }
}
