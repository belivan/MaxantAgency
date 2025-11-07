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
import { fileURLToPath } from 'url';

// Get directory of this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Always resolve prompts directory relative to this file's location
const PROMPTS_BASE_DIR = path.join(__dirname, '..', 'config', 'prompts');

// Map analyzer names to category + prompt folder names
const ANALYZER_TO_PROMPT_MAP = {
  'desktop-visual-analyzer': 'web-design/desktop-visual-analysis',
  'mobile-visual-analyzer': 'web-design/mobile-visual-analysis',
  'unified-visual-analyzer': 'web-design/unified-visual-analysis',
  'seo-analyzer': 'web-design/seo-analysis',
  'content-analyzer': 'web-design/content-analysis',
  'unified-technical-analyzer': 'web-design/unified-technical-analysis',
  'social-analyzer': 'web-design/social-analysis',
  'accessibility-analyzer': 'web-design/accessibility-analysis',
  'qa-validator': 'validation/qa-validation'
};

// In-memory cache for loaded prompts (prevents redundant file reads)
const promptCache = new Map();

/**
 * Load prompt for an analyzer (with variant support)
 * @param {string} analyzerNameOrPath - Analyzer name (e.g., 'unified-visual-analyzer') OR path (e.g., 'web-design/unified-visual-analysis')
 * @returns {Promise<object>} Prompt object
 */
export async function loadPrompt(analyzerNameOrPath) {
  // Handle backward compatibility: detect if this is a path or analyzer name
  let analyzerName = analyzerNameOrPath;

  // If it contains a slash, it's the old path format - convert it
  if (analyzerNameOrPath.includes('/')) {
    // Old format: 'web-design/unified-visual-analysis' -> 'unified-visual-analyzer'
    const pathPart = analyzerNameOrPath.split('/')[1]; // Get 'unified-visual-analysis'
    analyzerName = pathPart.replace('-analysis', '-analyzer'); // Convert to 'unified-visual-analyzer'
  }

  try {
    // 1. Check database for active variant
    const activeVariant = await getActiveVariant(analyzerName);

    if (activeVariant && activeVariant.file_path) {
      // 2. Load from variant file
      console.log(`[Prompt Loader] Loading active variant for ${analyzerName}: ${activeVariant.file_path}`);
      const promptPath = path.join(PROMPTS_BASE_DIR, activeVariant.file_path);
      const promptData = await fs.readFile(promptPath, 'utf-8');
      return JSON.parse(promptData);
    }

    // 3. Fall back to base prompt
    // Pass original parameter to support both old path format and new analyzer name
    return await loadBasePrompt(analyzerNameOrPath);

  } catch (error) {
    console.error(`[Prompt Loader] Error loading prompt for ${analyzerName}:`, error.message);
    // Pass original parameter to support both old path format and new analyzer name (loadBasePrompt will log)
    return await loadBasePrompt(analyzerNameOrPath);
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
    console.error(`[Prompt Loader] Error fetching active variant:`, error.message);
    return null;
  }
}

/**
 * Load base prompt from file
 * @param {string} analyzerNameOrPath - Analyzer name or path
 * @returns {Promise<object}> Base prompt object
 */
async function loadBasePrompt(analyzerNameOrPath) {
  // Check cache first
  const cacheKey = `base:${analyzerNameOrPath}`;
  if (promptCache.has(cacheKey)) {
    return promptCache.get(cacheKey);
  }

  let promptFolder;

  // Check if it's a direct path (backward compatibility)
  if (analyzerNameOrPath.includes('/')) {
    // Old format: 'web-design/unified-visual-analysis'
    promptFolder = analyzerNameOrPath;
  } else {
    // New format: 'unified-visual-analyzer' -> lookup in map
    promptFolder = ANALYZER_TO_PROMPT_MAP[analyzerNameOrPath];

    if (!promptFolder) {
      throw new Error(`Unknown analyzer: ${analyzerNameOrPath}`);
    }
  }

  // Try new folder structure first
  let promptPath = path.join(PROMPTS_BASE_DIR, promptFolder, 'base.json');
  let exists = await fs.access(promptPath).then(() => true).catch(() => false);

  // Fall back to old flat structure if needed
  if (!exists) {
    promptPath = path.join(PROMPTS_BASE_DIR, `${promptFolder}.json`);
    exists = await fs.access(promptPath).then(() => true).catch(() => false);

    if (!exists) {
      throw new Error(`Prompt file not found for ${analyzerNameOrPath}`);
    }
  }

  console.log(`[Prompt Loader] Loading base prompt for ${analyzerNameOrPath}`);
  const promptData = await fs.readFile(promptPath, 'utf-8');
  const prompt = JSON.parse(promptData);

  // Store in cache
  promptCache.set(cacheKey, prompt);

  return prompt;
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
    console.error(`Error listing variants for ${analyzerName}:`, error);
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

  console.log(`✅ Activated variant ${variantId} for ${variant.analyzer_name}`);
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

  console.log(`✅ Reverted ${analyzerName} to base prompt`);
}

/**
 * Clear prompt cache (useful for development/testing)
 * @param {string} analyzerName - Optional specific analyzer to clear, or clear all if not specified
 */
export function clearPromptCache(analyzerName = null) {
  if (analyzerName) {
    // Clear specific analyzer
    const cacheKey = `base:${analyzerName}`;
    if (promptCache.has(cacheKey)) {
      promptCache.delete(cacheKey);
      console.log(`[Prompt Loader] Cleared cache for ${analyzerName}`);
    }
  } else {
    // Clear all
    const count = promptCache.size;
    promptCache.clear();
    console.log(`[Prompt Loader] Cleared ${count} cached prompts`);
  }
}

/**
 * Substitute variables in a prompt template
 * @param {string} template - Template string with {{variable}} placeholders
 * @param {object} values - Object with variable values
 * @param {array} expectedVars - Optional array of expected variable definitions
 * @returns {Promise<string>} Template with variables substituted
 */
export async function substituteVariables(template, values, expectedVars) {
  if (!template) return '';

  let result = template;

  // Replace all {{variable}} placeholders with actual values
  for (const [key, value] of Object.entries(values)) {
    const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(placeholder, value || '');
  }

  return result;
}

/**
 * Collect all analysis prompts for all analyzers
 * @returns {Promise<object>} Object with all prompts
 */
export async function collectAnalysisPrompts() {
  const prompts = {};

  for (const [analyzerName, promptPath] of Object.entries(ANALYZER_TO_PROMPT_MAP)) {
    try {
      prompts[analyzerName] = await loadPrompt(analyzerName);
    } catch (error) {
      console.error(`Error loading prompt for ${analyzerName}:`, error.message);
      prompts[analyzerName] = null;
    }
  }

  return prompts;
}
