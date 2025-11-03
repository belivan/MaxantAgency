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
 * Map prompt path to environment variable name for model override
 *
 * @param {string} promptPath - Prompt path (e.g., 'report-synthesis/issue-deduplication')
 * @returns {string|null} Environment variable name or null if no mapping
 */
function getEnvVarNameForPrompt(promptPath) {
  // Map of prompt paths to environment variable names
  const envVarMap = {
    // Synthesis prompts
    'report-synthesis/issue-deduplication': 'SYNTHESIS_DEDUP_MODEL',
    'report-synthesis/executive-insights-generator': 'SYNTHESIS_EXECUTIVE_MODEL',

    // Analysis prompts
    'web-design/unified-visual-analysis': 'UNIFIED_VISUAL_MODEL',
    'web-design/unified-technical-analysis': 'UNIFIED_TECHNICAL_MODEL',
    'web-design/seo-analysis': 'SEO_ANALYZER_MODEL',
    'web-design/content-analysis': 'CONTENT_ANALYZER_MODEL',
    'web-design/desktop-visual-analysis': 'DESKTOP_VISUAL_MODEL',
    'web-design/mobile-visual-analysis': 'MOBILE_VISUAL_MODEL',
    'web-design/social-analysis': 'SOCIAL_ANALYZER_MODEL',
    'web-design/accessibility-analysis': 'ACCESSIBILITY_MODEL',

    // Lead scoring
    'lead-qualification/lead-priority-scorer': 'LEAD_SCORER_MODEL',

    // Benchmark prompts
    'benchmarking/visual-strengths': 'BENCHMARK_VISUAL_MODEL',
    'benchmarking/technical-strengths': 'BENCHMARK_TECHNICAL_MODEL',
    'benchmarking/social-strengths': 'BENCHMARK_SOCIAL_MODEL',
    'benchmarking/accessibility-strengths': 'BENCHMARK_ACCESSIBILITY_MODEL',

    // Page selection
    'page-analysis/page-selector': 'PAGE_SELECTOR_MODEL'
  };

  return envVarMap[promptPath] || null;
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

  // Resolve model from environment variable
  // Priority: 1. Explicit env override, 2. env: prefix in JSON, 3. JSON model field
  let resolvedModel = promptConfig.model;
  let modelSource = 'config';

  // Check for environment variable override based on prompt path
  const envVarName = getEnvVarNameForPrompt(promptPath);
  if (envVarName && process.env[envVarName]) {
    resolvedModel = process.env[envVarName];
    modelSource = `env:${envVarName}`;
    console.log(`[Prompt Loader] Using model '${resolvedModel}' from ${envVarName}`);
  }
  // Legacy support: Check if JSON uses env: prefix
  else if (typeof resolvedModel === 'string' && resolvedModel.startsWith('env:')) {
    const envVar = resolvedModel.substring(4); // Remove 'env:' prefix
    if (process.env[envVar]) {
      resolvedModel = process.env[envVar];
      modelSource = `env:${envVar}`;
      console.log(`[Prompt Loader] Using model '${resolvedModel}' from ${envVar}`);
    } else {
      console.warn(`[Prompt Loader] Environment variable ${envVar} not set, using default: ${promptConfig.model}`);
      resolvedModel = promptConfig.model; // Fallback to original
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
      unifiedVisualPrompt,
      unifiedTechnicalPrompt,
      socialPrompt,
      accessibilityPrompt,
      industryPrompt,
      leadScorerPrompt,
      issueDeduplicationPrompt,
      executiveInsightsPrompt
    ] = await Promise.all([
      getRawPromptConfig('web-design/unified-visual-analysis'),
      getRawPromptConfig('web-design/unified-technical-analysis'),
      getRawPromptConfig('web-design/social-analysis'),
      getRawPromptConfig('web-design/accessibility-analysis'),
      getRawPromptConfig('web-design/industry-critique'),
      getRawPromptConfig('lead-qualification/lead-priority-scorer'),
      getRawPromptConfig('report-synthesis/issue-deduplication'),
      getRawPromptConfig('report-synthesis/executive-insights-generator')
    ]);

    return {
      unifiedVisual: unifiedVisualPrompt,
      unifiedTechnical: unifiedTechnicalPrompt,
      social: socialPrompt,
      accessibility: accessibilityPrompt,
      industry: industryPrompt,
      leadScorer: leadScorerPrompt,
      issueDeduplication: issueDeduplicationPrompt,
      executiveInsights: executiveInsightsPrompt,
      _meta: {
        collectedAt: new Date().toISOString(),
        version: '2.0'  // Updated version to reflect unified analyzers
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
