/**
 * Prompt Loader - Loads and processes JSON prompt configurations
 *
 * Loads prompts from config/prompts/ directory and handles variable substitution
 */

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cache loaded prompts to avoid repeated file reads
const promptCache = new Map();

/**
 * Remove BOM and other unsupported leading characters from JSON content.
 *
 * @param {string} content - Raw file content
 * @returns {string} Sanitized JSON string safe for parsing
 */
function sanitizeJSON(content) {
  if (!content) return content;
  // Strip UTF-8 BOM if present
  if (content.charCodeAt(0) === 0xFEFF) {
    return content.slice(1);
  }
  return content;
}

/**
 * Load a prompt configuration from JSON file
 *
 * @param {string} promptPath - Path relative to config/prompts/ (e.g., 'web-design/design-critique')
 * @param {object} variables - Object with variables to substitute
 * @returns {Promise<object>} Processed prompt ready for AI
 */
export async function loadPrompt(promptPath, variables = {}) {
  // Build full path to JSON file
  const fullPath = join(__dirname, '../config/prompts', `${promptPath}.json`);

  // Check cache first
  const cacheKey = promptPath;
  let promptConfig;

  if (promptCache.has(cacheKey)) {
    promptConfig = promptCache.get(cacheKey);
  } else {
    // Load JSON file
    try {
      const fileContent = await readFile(fullPath, 'utf-8');
      promptConfig = JSON.parse(sanitizeJSON(fileContent));

      // Validate prompt config
      validatePromptConfig(promptConfig, promptPath);

      // Cache it
      promptCache.set(cacheKey, promptConfig);
    } catch (error) {
      throw new Error(`Failed to load prompt '${promptPath}': ${error.message}`);
    }
  }

  // Substitute variables in user prompt template
  const userPrompt = await substituteVariables(
    promptConfig.userPromptTemplate,
    variables,
    promptConfig.variables
  );

  // Resolve model from environment variable if using env: prefix
  let resolvedModel = promptConfig.model;
  if (typeof resolvedModel === 'string' && resolvedModel.startsWith('env:')) {
    const envVar = resolvedModel.substring(4); // Remove 'env:' prefix
    resolvedModel = process.env[envVar] || promptConfig.model; // Fallback to original if not set
    if (!process.env[envVar]) {
      console.warn(`[Prompt Loader] Environment variable ${envVar} not set, using default: ${promptConfig.model}`);
    }
  }

  return {
    name: promptConfig.name,
    model: resolvedModel,
    temperature: promptConfig.temperature,
    systemPrompt: promptConfig.systemPrompt,
    userPrompt,
    outputFormat: promptConfig.outputFormat,
    variables: promptConfig.variables,
    costEstimate: promptConfig.costEstimate
  };
}

/**
 * Substitute variables in template string using Handlebars
 *
 * @param {string} template - Template with {{variable}} placeholders and Handlebars syntax
 * @param {object} variables - Values to substitute
 * @param {array} requiredVars - List of required variable names
 * @returns {Promise<string>} Template with variables substituted
 */
export async function substituteVariables(template, variables, requiredVars = []) {
  // Check all required variables are provided
  const missingVars = requiredVars.filter(varName => !(varName in variables));
  if (missingVars.length > 0) {
    throw new Error(`Missing required variables: ${missingVars.join(', ')}`);
  }

  // Use Handlebars for template processing
  const Handlebars = (await import('handlebars')).default;

  // Compile and execute template
  const compiledTemplate = Handlebars.compile(template);
  const result = compiledTemplate(variables);

  return result;
}

/**
 * Validate prompt configuration structure
 *
 * @param {object} config - Prompt config to validate
 * @param {string} promptPath - Path for error messages
 * @throws {Error} If config is invalid
 */
function validatePromptConfig(config, promptPath) {
  const required = [
    'version',
    'name',
    'description',
    'model',
    'temperature',
    'systemPrompt',
    'userPromptTemplate',
    'outputFormat'
  ];

  for (const field of required) {
    if (!config[field]) {
      throw new Error(`Prompt '${promptPath}' missing required field: ${field}`);
    }
  }

  // Validate temperature is in valid range
  if (config.temperature < 0 || config.temperature > 1) {
    throw new Error(`Prompt '${promptPath}' has invalid temperature: ${config.temperature} (must be 0-1)`);
  }

  // Validate output format has required fields
  if (!config.outputFormat.type || !config.outputFormat.schema) {
    throw new Error(`Prompt '${promptPath}' has invalid outputFormat (missing type or schema)`);
  }
}

/**
 * Get all available prompts in a category
 *
 * @param {string} category - Category name (e.g., 'web-design')
 * @returns {Promise<string[]>} List of available prompt names
 */
export async function listPrompts(category) {
  const { readdir } = await import('fs/promises');
  const categoryPath = join(__dirname, '../config/prompts', category);

  try {
    const files = await readdir(categoryPath);
    return files
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
  } catch (error) {
    throw new Error(`Failed to list prompts in category '${category}': ${error.message}`);
  }
}

/**
 * Clear the prompt cache (useful for development/testing)
 */
export function clearPromptCache() {
  promptCache.clear();
}

/**
 * Get prompt metadata without loading full prompt
 *
 * @param {string} promptPath - Path to prompt
 * @returns {Promise<object>} Metadata (name, description, model, cost estimate)
 */
export async function getPromptMetadata(promptPath) {
  const fullPath = join(__dirname, '../config/prompts', `${promptPath}.json`);

  try {
      const fileContent = await readFile(fullPath, 'utf-8');
      const config = JSON.parse(sanitizeJSON(fileContent));

    return {
      name: config.name,
      description: config.description,
      model: config.model,
      temperature: config.temperature,
      variables: config.variables,
      costEstimate: config.costEstimate
    };
  } catch (error) {
    throw new Error(`Failed to load prompt metadata '${promptPath}': ${error.message}`);
  }
}

/**
 * Get raw prompt configuration (for saving to project config)
 * Returns the complete prompt config without variable substitution
 *
 * @param {string} promptPath - Path to prompt
 * @returns {Promise<object>} Complete prompt configuration
 */
export async function getRawPromptConfig(promptPath) {
  const fullPath = join(__dirname, '../config/prompts', `${promptPath}.json`);

  try {
      const fileContent = await readFile(fullPath, 'utf-8');
      const config = JSON.parse(sanitizeJSON(fileContent));

    // Validate before returning
    validatePromptConfig(config, promptPath);

    return config;
  } catch (error) {
    throw new Error(`Failed to load raw prompt config '${promptPath}': ${error.message}`);
  }
}

/**
 * Collect all analysis prompts (for saving to project)
 * Returns a snapshot of all prompts used in website analysis
 *
 * @returns {Promise<object>} Object with all prompt configurations
 */
export async function collectAnalysisPrompts() {
  try {
    const [
      designPrompt,
      desktopVisualPrompt,
      mobileVisualPrompt,
      seoPrompt,
      contentPrompt,
      socialPrompt,
      accessibilityPrompt,
      industryPrompt,
      leadScorerPrompt,
      issueDeduplicationPrompt,
      executiveInsightsPrompt
    ] = await Promise.all([
      getRawPromptConfig('web-design/design-critique'),
      getRawPromptConfig('web-design/desktop-visual-analysis'),
      getRawPromptConfig('web-design/mobile-visual-analysis'),
      getRawPromptConfig('web-design/seo-analysis'),
      getRawPromptConfig('web-design/content-analysis'),
      getRawPromptConfig('web-design/social-analysis'),
      getRawPromptConfig('web-design/accessibility-analysis'),
      getRawPromptConfig('web-design/industry-critique'),
      getRawPromptConfig('lead-qualification/lead-priority-scorer'),
      getRawPromptConfig('report-synthesis/issue-deduplication'),
      getRawPromptConfig('report-synthesis/executive-insights-generator')
    ]);

    return {
      design: designPrompt,
      desktopVisual: desktopVisualPrompt,
      mobileVisual: mobileVisualPrompt,
      seo: seoPrompt,
      content: contentPrompt,
      social: socialPrompt,
      accessibility: accessibilityPrompt,
      industry: industryPrompt,
      leadScorer: leadScorerPrompt,
      issueDeduplication: issueDeduplicationPrompt,
      executiveInsights: executiveInsightsPrompt,
      _meta: {
        collectedAt: new Date().toISOString(),
        version: '1.0'
      }
    };
  } catch (error) {
    throw new Error(`Failed to collect analysis prompts: ${error.message}`);
  }
}

// Export helper for easy usage
export default {
  loadPrompt,
  listPrompts,
  clearPromptCache,
  getPromptMetadata,
  getRawPromptConfig,
  collectAnalysisPrompts,
  substituteVariables
};
