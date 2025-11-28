/**
 * Query History Database Operations
 *
 * Operations for tracking discovery queries to enable intelligent iteration.
 * Extracted from supabase-client.js for modularity.
 */

import { supabase } from './supabase-client.js';
import { logError, logInfo } from '../shared/logger.js';

/**
 * Save a discovery query to history
 *
 * @param {string} projectId - Project ID (null for non-project searches)
 * @param {string} query - The search query executed
 * @param {object} stats - Query statistics
 * @param {number} stats.totalResults - Total raw results
 * @param {number} stats.uniqueResults - Unique results after dedup
 * @param {number} stats.newProspects - New prospects added to project
 * @param {number} stats.iteration - Which iteration this belongs to
 * @param {string} stats.strategy - Strategy used (specialty, geographic, etc.)
 * @param {string} stats.location - Primary search location
 * @returns {Promise<object>} Saved query record
 */
export async function saveQueryHistory(projectId, query, stats = {}) {
  try {
    const queryData = {
      project_id: projectId,
      query,
      search_location: stats.location || null,
      total_results: stats.totalResults || 0,
      unique_results: stats.uniqueResults || 0,
      new_prospects_added: stats.newProspects || 0,
      iteration: stats.iteration || 1,
      strategy: stats.strategy || null,
      executed_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('discovery_queries')
      .insert(queryData)
      .select()
      .single();

    if (error) {
      // Log but don't throw - query history is not critical to discovery
      logError('Failed to save query history', error, { query, projectId });
      return null;
    }

    logInfo('Query history saved', {
      query,
      projectId,
      iteration: stats.iteration,
      newProspects: stats.newProspects
    });

    return data;
  } catch (error) {
    logError('Error saving query history', error, { query, projectId });
    return null; // Fail silently
  }
}

/**
 * Get previous queries for a project
 *
 * @param {string} projectId - Project ID
 * @param {object} options - Query options
 * @param {number} options.limit - Maximum queries to return
 * @param {boolean} options.includeStats - Include full stats
 * @returns {Promise<Array>} Array of query strings or full records
 */
export async function getPreviousQueries(projectId, options = {}) {
  try {
    const { limit = 100, includeStats = false } = options;

    const query = supabase
      .from('discovery_queries')
      .select(includeStats ? '*' : 'query, iteration, strategy, executed_at')
      .eq('project_id', projectId)
      .order('executed_at', { ascending: false })
      .limit(limit);

    const { data, error } = await query;

    if (error) {
      logError('Failed to get previous queries', error, { projectId });
      return [];
    }

    // Return just query strings if stats not requested
    if (!includeStats) {
      return data.map(row => row.query);
    }

    return data;
  } catch (error) {
    logError('Error getting previous queries', error, { projectId });
    return [];
  }
}

/**
 * Check if a query already exists for a project
 *
 * @param {string} projectId - Project ID
 * @param {string} query - Query string to check
 * @returns {Promise<boolean>} True if query exists
 */
export async function queryExists(projectId, query) {
  try {
    const { data, error } = await supabase
      .from('discovery_queries')
      .select('id')
      .eq('project_id', projectId)
      .eq('query', query)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is expected
      logError('Error checking query existence', error, { projectId, query });
    }

    return !!data;
  } catch (error) {
    logError('Error checking query existence', error, { projectId, query });
    return false;
  }
}

/**
 * Get query statistics for a project
 *
 * @param {string} projectId - Project ID
 * @returns {Promise<object>} Query statistics
 */
export async function getQueryStats(projectId) {
  try {
    const { data, error } = await supabase
      .from('discovery_queries')
      .select('*')
      .eq('project_id', projectId);

    if (error) {
      logError('Failed to get query stats', error, { projectId });
      return null;
    }

    // Calculate stats
    const totalQueries = data.length;
    const totalProspects = data.reduce((sum, q) => sum + (q.new_prospects_added || 0), 0);
    const maxIteration = Math.max(...data.map(q => q.iteration || 1), 0);
    const uniqueLocations = [...new Set(data.map(q => q.search_location).filter(Boolean))];

    // Group by strategy
    const strategyCounts = data.reduce((acc, q) => {
      const strategy = q.strategy || 'unknown';
      acc[strategy] = (acc[strategy] || 0) + 1;
      return acc;
    }, {});

    return {
      totalQueries,
      totalProspects,
      maxIteration,
      uniqueLocations,
      strategyCounts,
      avgProspectsPerQuery: totalQueries > 0 ? Math.round(totalProspects / totalQueries) : 0,
      lastQueryAt: data[0]?.executed_at || null
    };
  } catch (error) {
    logError('Error getting query stats', error, { projectId });
    return null;
  }
}

export default {
  saveQueryHistory,
  getPreviousQueries,
  queryExists,
  getQueryStats
};
