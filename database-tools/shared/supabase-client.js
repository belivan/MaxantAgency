import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { logger } from './logger.js';

/**
 * Centralized Supabase Database Client
 *
 * This module provides a shared Supabase client instance and common utilities
 * for all engines. It follows the lazy initialization pattern to allow module
 * imports during testing without requiring credentials.
 *
 * Pattern: Similar to ai-client.js but focused on database operations
 *
 * Usage:
 *   import { getSupabaseClient, supabase } from '../../database-tools/shared/supabase-client.js';
 *
 *   // Option 1: Direct access (throws on use if missing credentials)
 *   const { data, error } = await supabase.from('table').select('*');
 *
 *   // Option 2: Explicit getter (allows null checks)
 *   const client = getSupabaseClient();
 *   if (client) {
 *     const { data, error } = await client.from('table').select('*');
 *   }
 */

// Load environment variables from root .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

// Create client only if credentials are available (allows module import during tests)
let supabaseClient = null;
let clientInitialized = false;

/**
 * Initialize Supabase client (lazy initialization)
 * @private
 */
function initializeClient() {
  if (clientInitialized) {
    return supabaseClient;
  }

  if (!supabaseUrl || !supabaseKey) {
    logger.warning('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY - client will throw on access');
    clientInitialized = true;
    return null;
  }

  try {
    supabaseClient = createClient(supabaseUrl, supabaseKey);
    clientInitialized = true;
    logger.debug('Supabase client initialized successfully', process.env.VERBOSE === 'true');
    return supabaseClient;
  } catch (error) {
    logger.error(`Failed to initialize Supabase client: ${error.message}`);
    clientInitialized = true;
    return null;
  }
}

/**
 * Get Supabase client instance (explicit getter)
 * @returns {object|null} Supabase client or null if credentials missing
 */
export function getSupabaseClient() {
  if (!clientInitialized) {
    initializeClient();
  }
  return supabaseClient;
}

/**
 * Export client with lazy validation (throws error only when accessed, not on import)
 * This pattern allows engines to import the module without requiring credentials
 * until the client is actually used.
 */
export const supabase = new Proxy({}, {
  get(target, prop) {
    if (!clientInitialized) {
      initializeClient();
    }

    if (!supabaseClient) {
      throw new Error(
        'Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment variables. ' +
        'Please ensure your .env file is configured correctly.'
      );
    }

    return supabaseClient[prop];
  }
});

/**
 * Common Utility Functions
 * These helpers reduce code duplication across engine database clients
 */

/**
 * Build a dynamic Supabase query with common filters
 * @param {string} table - Table name
 * @param {object} filters - Filter options
 * @param {number} filters.limit - Results limit (default: 50)
 * @param {number} filters.offset - Results offset (default: 0)
 * @param {string} filters.orderBy - Column to order by (default: 'created_at')
 * @param {boolean} filters.ascending - Order direction (default: false)
 * @param {object} filters.where - Key-value pairs for equality filters
 * @returns {object} Supabase query builder
 */
export function buildQuery(table, filters = {}) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase client not initialized');
  }

  let query = client.from(table).select('*');

  // Apply WHERE filters
  if (filters.where) {
    for (const [key, value] of Object.entries(filters.where)) {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    }
  }

  // Apply ordering
  const orderBy = filters.orderBy || 'created_at';
  const ascending = filters.ascending !== undefined ? filters.ascending : false;
  query = query.order(orderBy, { ascending });

  // Apply pagination
  if (filters.limit !== undefined) {
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    query = query.range(offset, offset + limit - 1);
  }

  return query;
}

/**
 * Format timestamp for database insertion
 * @param {Date|string|null} date - Date to format (defaults to now)
 * @returns {string} ISO timestamp string or null for invalid dates
 */
export function formatTimestamp(date = null) {
  const timestamp = date ? new Date(date) : new Date();

  // Check if date is valid
  if (isNaN(timestamp.getTime())) {
    return null;
  }

  return timestamp.toISOString();
}

/**
 * Normalize URL for consistent storage
 * Removes trailing slashes, lowercases, ensures https
 * @param {string} url - URL to normalize
 * @returns {string} Normalized URL
 */
export function normalizeUrl(url) {
  if (!url) return url;

  let normalized = url.trim().toLowerCase();

  // Add protocol if missing
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'https://' + normalized;
  }

  // Remove trailing slash
  normalized = normalized.replace(/\/$/, '');

  // Remove www. for consistency
  normalized = normalized.replace(/^(https?:\/\/)www\./, '$1');

  return normalized;
}

/**
 * Handle Supabase errors with consistent logging and context
 * @param {object} error - Supabase error object
 * @param {string} context - Descriptive context (e.g., "saving prospect")
 * @param {object} metadata - Additional metadata to log
 * @throws {Error} Rethrows the error after logging
 */
export function handleSupabaseError(error, context = '', metadata = {}) {
  const errorMessage = error?.message || 'Unknown database error';
  const errorDetails = {
    context,
    message: errorMessage,
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
    ...metadata
  };

  logger.error(`Database error ${context ? `(${context})` : ''}: ${errorMessage}`);

  if (process.env.VERBOSE === 'true') {
    console.error('Full error details:', errorDetails);
  }

  throw error;
}

/**
 * Test database connection
 * Useful for health checks and debugging
 * @returns {Promise<boolean>} True if connection successful
 */
export async function testConnection() {
  try {
    const client = getSupabaseClient();
    if (!client) {
      return false;
    }

    // Simple query to test connection
    const { error } = await client.from('projects').select('id').limit(1);

    if (error) {
      logger.error(`Connection test failed: ${error.message}`);
      return false;
    }

    return true;
  } catch (error) {
    logger.error(`Connection test error: ${error.message}`);
    return false;
  }
}

/**
 * Generic CRUD helper functions
 * These provide common database operations that can be reused across engines
 */

/**
 * Insert a record into any table
 * @param {string} table - Table name
 * @param {object} data - Data to insert
 * @returns {Promise<object>} Inserted record
 */
export async function insertRecord(table, data) {
  try {
    const { data: record, error } = await supabase
      .from(table)
      .insert([data])
      .select()
      .single();

    if (error) {
      handleSupabaseError(error, `inserting into ${table}`, { data });
    }

    return record;
  } catch (error) {
    handleSupabaseError(error, `inserting into ${table}`, { data });
  }
}

/**
 * Update a record in any table
 * @param {string} table - Table name
 * @param {string} id - Record ID
 * @param {object} updates - Fields to update
 * @returns {Promise<object>} Updated record
 */
export async function updateRecord(table, id, updates) {
  try {
    const { data: record, error } = await supabase
      .from(table)
      .update({
        ...updates,
        updated_at: formatTimestamp()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      handleSupabaseError(error, `updating ${table}`, { id, updates });
    }

    return record;
  } catch (error) {
    handleSupabaseError(error, `updating ${table}`, { id, updates });
  }
}

/**
 * Get a single record by ID
 * @param {string} table - Table name
 * @param {string} id - Record ID
 * @returns {Promise<object|null>} Record or null if not found
 */
export async function getRecordById(table, id) {
  try {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      // Don't throw on "not found" errors
      if (error.code === 'PGRST116') {
        return null;
      }
      handleSupabaseError(error, `getting ${table} by ID`, { id });
    }

    return data;
  } catch (error) {
    handleSupabaseError(error, `getting ${table} by ID`, { id });
  }
}

/**
 * Delete a record from any table
 * @param {string} table - Table name
 * @param {string} id - Record ID
 * @returns {Promise<boolean>} True if deleted successfully
 */
export async function deleteRecord(table, id) {
  try {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);

    if (error) {
      handleSupabaseError(error, `deleting from ${table}`, { id });
    }

    return true;
  } catch (error) {
    handleSupabaseError(error, `deleting from ${table}`, { id });
  }
}

/**
 * Get multiple records with filters
 * @param {string} table - Table name
 * @param {object} filters - Query filters (see buildQuery for options)
 * @returns {Promise<Array>} Array of records
 */
export async function getRecords(table, filters = {}) {
  try {
    const query = buildQuery(table, filters);
    const { data, error } = await query;

    if (error) {
      handleSupabaseError(error, `getting ${table} records`, { filters });
    }

    return data || [];
  } catch (error) {
    handleSupabaseError(error, `getting ${table} records`, { filters });
  }
}
