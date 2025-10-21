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
 * @returns {Promise<{data: Array, total: number}>} Array of prospects and total count
 */
export async function getProspects(filters = {}) {
  try {
    // Build query - use INNER join when filtering by project, LEFT join otherwise
    const joinType = filters.projectId ? '!inner' : '';

    let query = supabase
      .from('prospects')
      .select(`
        *,
        project_prospects${joinType}(
          project_id,
          projects(
            id,
            name
          )
        )
      `, { count: 'exact' });

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

    if (filters.runId) {
      query = query.eq('run_id', filters.runId);
    }

    if (filters.projectId) {
      query = query.eq('project_prospects.project_id', filters.projectId);
    }

    // Order first (before limit/offset)
    query = query.order('created_at', { ascending: false });

    // Apply limit and offset for pagination
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      logError('Failed to fetch prospects', error, filters);
      throw error;
    }

    // Transform data to flatten project info
    const prospects = data?.map(prospect => ({
      ...prospect,
      project_name: prospect.project_prospects?.[0]?.projects?.name || null,
      project_id: prospect.project_prospects?.[0]?.project_id || null,
      project_prospects: undefined // Remove the nested structure
    })) || [];

    logInfo('Prospects fetched', { count: prospects.length, total: count, filters });

    return {
      data: prospects,
      total: count || 0
    };
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
 * Check if a prospect already exists by Google Place ID (globally)
 *
 * @param {string} googlePlaceId - Google Place ID
 * @returns {Promise<object|null>} Prospect object if exists, null otherwise
 */
export async function prospectExists(googlePlaceId) {
  try {
    const { data, error } = await supabase
      .from('prospects')
      .select('*')
      .eq('google_place_id', googlePlaceId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }

    return data || null;
  } catch (error) {
    return null;
  }
}

/**
 * Check if a prospect exists in a specific project
 *
 * @param {string} googlePlaceId - Google Place ID
 * @param {string} projectId - Project ID (optional)
 * @returns {Promise<boolean>} True if prospect exists in project
 */
export async function prospectExistsInProject(googlePlaceId, projectId) {
  try {
    // If no project specified, check global existence
    if (!projectId) {
      const prospect = await prospectExists(googlePlaceId);
      return !!prospect;
    }

    // Check if prospect exists globally
    const { data: prospect, error: prospectError } = await supabase
      .from('prospects')
      .select('id')
      .eq('google_place_id', googlePlaceId)
      .single();

    if (prospectError && prospectError.code !== 'PGRST116') {
      throw prospectError;
    }

    if (!prospect) {
      return false; // Prospect doesn't exist at all
    }

    // Check if it's linked to this project
    const { data: link, error: linkError } = await supabase
      .from('project_prospects')
      .select('id')
      .eq('project_id', projectId)
      .eq('prospect_id', prospect.id)
      .single();

    if (linkError && linkError.code !== 'PGRST116') {
      throw linkError;
    }

    return !!link;
  } catch (error) {
    logError('Error checking prospect in project', error, { googlePlaceId, projectId });
    return false;
  }
}

/**
 * Link a prospect to a project
 *
 * @param {string} prospectId - Prospect ID
 * @param {string} projectId - Project ID
 * @param {object} metadata - Optional metadata (run_id, notes, etc.)
 * @returns {Promise<object>} Created link
 */
export async function linkProspectToProject(prospectId, projectId, metadata = {}) {
  try {
    const { data, error } = await supabase
      .from('project_prospects')
      .insert({
        prospect_id: prospectId,
        project_id: projectId,
        run_id: metadata.run_id || null,
        notes: metadata.notes || null,
        custom_score: metadata.custom_score || null,
        status: metadata.status || 'active',
        // AI metadata fields (new columns)
        discovery_query: metadata.discovery_query || null,
        query_generation_model: metadata.query_generation_model || null,
        icp_brief_snapshot: metadata.icp_brief_snapshot || null,
        prompts_snapshot: metadata.prompts_snapshot || null,
        model_selections_snapshot: metadata.model_selections_snapshot || null,
        relevance_reasoning: metadata.relevance_reasoning || null,
        discovery_cost_usd: metadata.discovery_cost_usd || null,
        discovery_time_ms: metadata.discovery_time_ms || null
      })
      .select()
      .single();

    if (error) {
      // Ignore duplicate errors (prospect already in project)
      if (error.code === '23505') { // PostgreSQL unique violation
        logInfo('Prospect already linked to project', { prospectId, projectId });
        return null;
      }
      logError('Failed to link prospect to project', error, { prospectId, projectId });
      throw error;
    }

    logInfo('Prospect linked to project', { prospectId, projectId });
    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * Save or link a prospect (project-aware)
 * If prospect exists globally, link it to the project
 * If not, create it and link it
 *
 * @param {object} prospectData - Prospect data
 * @param {string} projectId - Project ID (optional)
 * @param {object} metadata - Link metadata (run_id, etc.)
 * @returns {Promise<object>} Prospect object
 */
export async function saveOrLinkProspect(prospectData, projectId = null, metadata = {}) {
  try {
    // Check if prospect exists globally
    let prospect = null;
    if (prospectData.google_place_id) {
      prospect = await prospectExists(prospectData.google_place_id);
    }

    // If prospect doesn't exist, create it
    if (!prospect) {
      prospect = await saveProspect(prospectData);
      logInfo('New prospect created', {
        id: prospect.id,
        company: prospect.company_name
      });
    } else {
      logInfo('Prospect already exists globally', {
        id: prospect.id,
        company: prospect.company_name
      });
    }

    // Link to project if specified
    if (projectId) {
      await linkProspectToProject(prospect.id, projectId, {
        ...metadata,
        run_id: prospectData.run_id || metadata.run_id
      });
    }

    return prospect;
  } catch (error) {
    logError('Failed to save or link prospect', error, {
      company: prospectData.company_name,
      projectId
    });
    throw error;
  }
}

/**
 * Get prospects for a specific project
 *
 * @param {string} projectId - Project ID
 * @param {object} filters - Additional filters
 * @returns {Promise<Array>} Array of prospects with project-specific data
 */
export async function getProspectsByProject(projectId, filters = {}) {
  try {
    let query = supabase
      .from('project_prospects')
      .select(`
        id,
        added_at,
        notes,
        custom_score,
        status,
        run_id,
        prospects (*)
      `)
      .eq('project_id', projectId);

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.runId) {
      query = query.eq('run_id', filters.runId);
    }

    // Limit and order
    const limit = filters.limit || 50;
    query = query.limit(limit).order('added_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      logError('Failed to fetch prospects by project', error, { projectId, filters });
      throw error;
    }

    // Flatten the structure
    const prospects = data.map(item => ({
      ...item.prospects,
      project_link_id: item.id,
      project_status: item.status,
      project_notes: item.notes,
      project_custom_score: item.custom_score,
      added_to_project_at: item.added_at,
      project_run_id: item.run_id
    }));

    logInfo('Prospects fetched by project', {
      projectId,
      count: prospects.length
    });

    return prospects;
  } catch (error) {
    throw error;
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
 * Delete multiple prospects by IDs
 *
 * @param {string[]} ids - Array of prospect IDs
 * @returns {Promise<number>} Number of deleted prospects
 */
export async function deleteProspects(ids) {
  try {
    const { error, count } = await supabase
      .from('prospects')
      .delete()
      .in('id', ids);

    if (error) {
      logError('Failed to delete prospects', error, { count: ids.length });
      throw error;
    }

    logInfo('Prospects deleted', { count: ids.length });
    return ids.length;
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

    // Note: For project-specific stats, query project_prospects and join with prospects
    // The project_id column has been removed from prospects table

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

/**
 * Get a project's ICP brief by project ID
 *
 * @param {string} projectId - Project ID
 * @returns {Promise<object|null>} ICP brief object or null
 */
export async function getProjectIcpBrief(projectId) {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('icp_brief')
      .eq('id', projectId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        logInfo('Project not found', { projectId });
        return null;
      }
      logError('Failed to fetch project ICP brief', error, { projectId });
      throw error;
    }

    return data?.icp_brief || null;
  } catch (error) {
    logError('Error fetching project ICP brief', error, { projectId });
    return null;
  }
}

/**
 * Save ICP brief to a project
 * Called BEFORE generating prospects to ensure ICP is saved while project is unlocked
 *
 * @param {string} projectId - Project ID
 * @param {object} icpBrief - ICP brief object
 * @returns {Promise<object>} Updated project data
 */
export async function saveProjectIcpBrief(projectId, icpBrief) {
  try {
    const { data, error } = await supabase
      .from('projects')
      .update({ icp_brief: icpBrief })
      .eq('id', projectId)
      .select()
      .single();

    if (error) {
      logError('Failed to save ICP brief to project', error, { projectId });
      throw error;
    }

    logInfo('ICP brief saved to project', {
      projectId,
      industry: icpBrief.industry
    });

    return data;
  } catch (error) {
    logError('Error saving ICP brief to project', error, { projectId });
    throw error;
  }
}

/**
 * Save prospecting prompts to a project
 * Called alongside ICP brief save to preserve AI prompts for historical tracking
 *
 * @param {string} projectId - Project ID
 * @param {object} prompts - Prospecting prompts object
 * @returns {Promise<object>} Updated project data
 */
export async function saveProjectProspectingPrompts(projectId, prompts) {
  try {
    const { data, error } = await supabase
      .from('projects')
      .update({ prospecting_prompts: prompts })
      .eq('id', projectId)
      .select()
      .single();

    if (error) {
      logError('Failed to save prospecting prompts to project', error, { projectId });
      throw error;
    }

    logInfo('Prospecting prompts saved to project', {
      projectId,
      promptCount: Object.keys(prompts).length
    });

    return data;
  } catch (error) {
    logError('Error saving prospecting prompts to project', error, { projectId });
    throw error;
  }
}

/**
 * Save model selections to a project
 * Called alongside prompts to preserve which AI models were used for historical tracking
 *
 * @param {string} projectId - Project ID
 * @param {object} modelSelections - Model selections object
 * @returns {Promise<object>} Updated project data
 */
export async function saveProjectModelSelections(projectId, modelSelections) {
  try {
    const { data, error } = await supabase
      .from('projects')
      .update({ prospecting_model_selections: modelSelections })
      .eq('id', projectId)
      .select()
      .single();

    if (error) {
      logError('Failed to save model selections to project', error, { projectId });
      throw error;
    }

    logInfo('Model selections saved to project', {
      projectId,
      modelCount: Object.keys(modelSelections).length
    });

    return data;
  } catch (error) {
    logError('Error saving model selections to project', error, { projectId });
    throw error;
  }
}

/**
 * Save both ICP brief and prospecting prompts in a single transaction
 *
 * @param {string} projectId - Project ID
 * @param {object} icpBrief - ICP brief object
 * @param {object} prompts - Prospecting prompts object
 * @returns {Promise<object>} Updated project data
 */
export async function saveProjectIcpAndPrompts(projectId, icpBrief, prompts) {
  try {
    const { data, error} = await supabase
      .from('projects')
      .update({
        icp_brief: icpBrief,
        prospecting_prompts: prompts
      })
      .eq('id', projectId)
      .select()
      .single();

    if (error) {
      logError('Failed to save ICP brief and prompts to project', error, { projectId });
      throw error;
    }

    logInfo('ICP brief and prompts saved to project', {
      projectId,
      industry: icpBrief.industry,
      promptCount: Object.keys(prompts).length
    });

    return data;
  } catch (error) {
    logError('Error saving ICP brief and prompts to project', error, { projectId });
    throw error;
  }
}

/**
 * Save complete prospecting configuration (prompts + model selections)
 * Used on first generation to preserve exactly what AI setup was used
 *
 * @param {string} projectId - Project ID
 * @param {object} prompts - Prospecting prompts object
 * @param {object} modelSelections - Model selections object
 * @returns {Promise<object>} Updated project data
 */
export async function saveProspectingConfig(projectId, prompts, modelSelections) {
  try {
    const updateData = {};
    if (prompts) updateData.prospecting_prompts = prompts;
    if (modelSelections) updateData.prospecting_model_selections = modelSelections;

    const { data, error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', projectId)
      .select()
      .single();

    if (error) {
      logError('Failed to save prospecting config to project', error, { projectId });
      throw error;
    }

    logInfo('Prospecting config saved to project', {
      projectId,
      hasPrompts: !!prompts,
      hasModels: !!modelSelections,
      modelCount: modelSelections ? Object.keys(modelSelections).length : 0
    });

    return data;
  } catch (error) {
    logError('Error saving prospecting config to project', error, { projectId });
    throw error;
  }
}

export default supabase;
