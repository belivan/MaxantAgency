/**
 * Project Configuration Database Operations
 *
 * Operations for managing project ICP briefs, prompts, and model selections.
 * Extracted from supabase-client.js for modularity.
 */

import { supabase } from './supabase-client.js';
import { logError, logInfo } from '../shared/logger.js';

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

export default {
  getProjectIcpBrief,
  saveProjectIcpBrief,
  saveProjectProspectingPrompts,
  saveProjectModelSelections,
  saveProjectIcpAndPrompts,
  saveProspectingConfig
};
