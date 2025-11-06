/**
 * Database-First Prompt Loader
 *
 * Loads prompts with support for optimized variants:
 * 1. Checks database for active variant
 * 2. If found, loads variant file
 * 3. Otherwise, loads base prompt
 *
 * Usage:
 *   import { loadPrompt } from './shared/prompt-loader.js';
 *   const prompt = await loadPrompt('desktop-visual-analyzer');
 */

import { supabase } from '../database/supabase-client.js';
import fs from 'fs/promises';
import path from 'path';

const PROMPTS_BASE_DIR = path.join(process.cwd(), 'config', 'prompts', 'web-design');

// Map analyzer names to prompt folder names
const ANALYZER_TO_PROMPT_MAP = {
  'desktop-visual-analyzer': 'desktop-visual-analysis',
  'mobile-visual-analyzer': 'mobile-visual-analysis',
  'unified-visual-analyzer': 'unified-visual-analysis',
  'seo-analyzer': 'seo-analysis',
  'content-analyzer': 'content-analysis',
  'unified-technical-analyzer': 'unified-technical-analysis',
  'social-analyzer': 'social-analysis',
  'accessibility-analyzer': 'accessibility-analysis'
};

/**
 * Load prompt for an analyzer (with variant support)
 * @param {string} analyzerName - Name of the analyzer
 * @returns {Promise<object>} Prompt object
 */
export async function loadPrompt(analyzerName) {
  try {
    // 1. Check database for active variant
    const activeVariant = await getActiveVariant(analyzerName);

    if (activeVariant && activeVariant.file_path) {
      // 2. Load from variant file
      console.log(\`[Prompt Loader] Loading active variant for \${analyzerName}: \${activeVariant.file_path}\`);
      const promptPath = path.join(process.cwd(), activeVariant.file_path);
      const promptData = await fs.readFile(promptPath, 'utf-8');
      return JSON.parse(promptData);
    }

    // 3. Fall back to base prompt
    console.log(\`[Prompt Loader] Loading base prompt for \${analyzerName}\`);
    return await loadBasePrompt(analyzerName);

  } catch (error) {
    console.error(\`[Prompt Loader] Error loading prompt for \${analyzerName}:\`, error.message);
    console.log('[Prompt Loader] Falling back to base prompt');
    return await loadBasePrompt(analyzerName);
  }
}

/**
 * Get active variant from database
 * @param {string} analyzerName - Name of the analyzer
 * @returns {Promise<object|null>} Active variant or null
 */
async function getActiveVariant(analyzerName) {
  try {
    const { data, error } = await supabase
      .from('prompt_variants')
      .select('*')
      .eq('analyzer_name', analyzerName)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No active variant found
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error(\`[Prompt Loader] Error fetching active variant:\`, error.message);
    return null;
  }
}

/**
 * Load base prompt from file
 * @param {string} analyzerName - Name of the analyzer
 * @returns {Promise<object>} Base prompt object
 */
async function loadBasePrompt(analyzerName) {
  const promptFolder = ANALYZER_TO_PROMPT_MAP[analyzerName];

  if (!promptFolder) {
    throw new Error(\`Unknown analyzer: \${analyzerName}\`);
  }

  // Try new folder structure first
  let promptPath = path.join(PROMPTS_BASE_DIR, promptFolder, 'base.json');
  let exists = await fs.access(promptPath).then(() => true).catch(() => false);

  // Fall back to old flat structure if needed
  if (!exists) {
    promptPath = path.join(PROMPTS_BASE_DIR, \`\${promptFolder}.json\`);
    exists = await fs.access(promptPath).then(() => true).catch(() => false);

    if (!exists) {
      throw new Error(\`Prompt file not found for \${analyzerName}\`);
    }
  }

  const promptData = await fs.readFile(promptPath, 'utf-8');
  return JSON.parse(promptData);
}

/**
 * List all available variants for an analyzer
 * @param {string} analyzerName - Name of the analyzer
 * @returns {Promise<Array>} Array of variants
 */
export async function listVariants(analyzerName) {
  const { data, error} = await supabase
    .from('prompt_variants')
    .select('*')
    .eq('analyzer_name', analyzerName)
    .order('version_number', { ascending: false });

  if (error) {
    console.error(\`Error listing variants for \${analyzerName}:\`, error);
    return [];
  }

  return data || [];
}

/**
 * Get variant by ID
 * @param {string} variantId - UUID of variant
 * @returns {Promise<object>} Variant data
 */
export async function getVariant(variantId) {
  const { data, error } = await supabase
    .from('prompt_variants')
    .select('*')
    .eq('id', variantId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Activate a specific variant
 * @param {string} variantId - UUID of variant to activate
 * @returns {Promise<object>} Updated variant
 */
export async function activateVariant(variantId) {
  // Get the variant to know which analyzer it belongs to
  const variant = await getVariant(variantId);

  // Deactivate all other variants for this analyzer
  await supabase
    .from('prompt_variants')
    .update({ is_active: false })
    .eq('analyzer_name', variant.analyzer_name);

  // Activate the specified variant
  const { data, error } = await supabase
    .from('prompt_variants')
    .update({
      is_active: true,
      applied_at: new Date().toISOString()
    })
    .eq('id', variantId)
    .select()
    .single();

  if (error) throw error;

  console.log(\`✅ Activated variant \${variantId} for \${variant.analyzer_name}\`);
  return data;
}

/**
 * Deactivate all variants for an analyzer (revert to base)
 * @param {string} analyzerName - Name of the analyzer
 */
export async function revertToBase(analyzerName) {
  await supabase
    .from('prompt_variants')
    .update({ is_active: false })
    .eq('analyzer_name', analyzerName);

  console.log(\`✅ Reverted \${analyzerName} to base prompt\`);
}
