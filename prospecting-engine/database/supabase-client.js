import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { logError, logInfo } from '../shared/logger.js';

// Load env from this package then fall back to website-audit-tool/.env to reuse credentials
dotenv.config();

try {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const auditEnv = path.resolve(__dirname, '../../website-audit-tool/.env');
  if (fs.existsSync(auditEnv)) {
    dotenv.config({ path: auditEnv, override: false });
  }
} catch {}

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Save a prospect to the database
 *
 * @param {object} prospect - Prospect data
 * @returns {Promise<object>} Saved prospect with ID
 */
export async function saveProspect(prospect) {
  try {
    const { data, error } = await supabase
      .from('prospects')
      .insert(prospect)
      .select()
      .single();

    if (error) {
      logError('Failed to save prospect', error, { company: prospect.company_name });
      throw error;
    }

    logInfo('Prospect saved', {
      id: data.id,
      company: data.company_name,
      city: data.city
    });

    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * Update a prospect in the database
 *
 * @param {string} id - Prospect ID
 * @param {object} updates - Fields to update
 * @returns {Promise<object>} Updated prospect
 */
export async function updateProspect(id, updates) {
  try {
    const { data, error } = await supabase
      .from('prospects')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logError('Failed to update prospect', error, { id });
      throw error;
    }

    logInfo('Prospect updated', { id, fields: Object.keys(updates) });

    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * Get prospects with filters
 *
 * @param {object} filters - Query filters
 * @returns {Promise<Array>} Array of prospects
 */
export async function getProspects(filters = {}) {
  try {
    let query = supabase.from('prospects').select('*');

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.city) {
      query = query.eq('city', filters.city);
    }

    if (filters.industry) {
      query = query.eq('industry', filters.industry);
    }

    if (filters.minRating) {
      query = query.gte('google_rating', filters.minRating);
    }

    if (filters.projectId) {
      query = query.eq('project_id', filters.projectId);
    }

    if (filters.runId) {
      query = query.eq('run_id', filters.runId);
    }

    // Limit and order
    const limit = filters.limit || 50;
    query = query.limit(limit).order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      logError('Failed to fetch prospects', error, filters);
      throw error;
    }

    logInfo('Prospects fetched', { count: data.length, filters });

    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * Get a single prospect by ID
 *
 * @param {string} id - Prospect ID
 * @returns {Promise<object>} Prospect object
 */
export async function getProspectById(id) {
  try {
    const { data, error } = await supabase
      .from('prospects')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      logError('Failed to fetch prospect', error, { id });
      throw error;
    }

    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * Check if a prospect already exists by Google Place ID
 *
 * @param {string} googlePlaceId - Google Place ID
 * @returns {Promise<boolean>} True if exists
 */
export async function prospectExists(googlePlaceId) {
  try {
    const { data, error } = await supabase
      .from('prospects')
      .select('id')
      .eq('google_place_id', googlePlaceId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }

    return !!data;
  } catch (error) {
    return false;
  }
}

/**
 * Delete a prospect by ID
 *
 * @param {string} id - Prospect ID
 * @returns {Promise<void>}
 */
export async function deleteProspect(id) {
  try {
    const { error } = await supabase
      .from('prospects')
      .delete()
      .eq('id', id);

    if (error) {
      logError('Failed to delete prospect', error, { id });
      throw error;
    }

    logInfo('Prospect deleted', { id });
  } catch (error) {
    throw error;
  }
}

/**
 * Get prospect statistics
 *
 * @param {object} filters - Optional filters
 * @returns {Promise<object>} Statistics object
 */
export async function getProspectStats(filters = {}) {
  try {
    let query = supabase.from('prospects').select('status, industry, google_rating');

    if (filters.city) {
      query = query.eq('city', filters.city);
    }

    if (filters.projectId) {
      query = query.eq('project_id', filters.projectId);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Calculate statistics
    const stats = {
      total: data.length,
      byStatus: {},
      byIndustry: {},
      averageRating: 0,
      withWebsite: 0,
      withSocial: 0
    };

    data.forEach(prospect => {
      // Count by status
      stats.byStatus[prospect.status] = (stats.byStatus[prospect.status] || 0) + 1;

      // Count by industry
      stats.byIndustry[prospect.industry] = (stats.byIndustry[prospect.industry] || 0) + 1;
    });

    return stats;
  } catch (error) {
    logError('Failed to get prospect stats', error, filters);
    throw error;
  }
}

export default supabase;
