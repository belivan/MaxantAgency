import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_DIR = path.resolve(__dirname, '../config/prompts');

/**
 * Load and render AI prompt from JSON configuration files
 *
 * This enables:
 * - Centralized prompt management
 * - Version control for prompts
 * - Template variable substitution
 * - Prompt validation
 *
 * @param {string} promptPath - Name of prompt file (e.g., "01-query-understanding")
 * @param {object} variables - Template variables to substitute
 * @returns {object} Rendered prompt ready for AI API
 *
 * @example
 * const prompt = loadPrompt('01-query-understanding', {
 *   industry: 'restaurants',
 *   city: 'Philadelphia',
 *   target_description: 'Italian restaurants'
 * });
 * // Returns: { model, temperature, systemPrompt, userPrompt }
 */
export function loadPrompt(promptPath, variables = {}) {
  const promptFile = path.join(CONFIG_DIR, `${promptPath}.json`);

  // Check if file exists
  if (!fs.existsSync(promptFile)) {
    throw new Error(`Prompt file not found: ${promptFile}`);
  }

  // Load and parse JSON
  const promptConfig = JSON.parse(fs.readFileSync(promptFile, 'utf-8'));

  // Validate required fields
  if (!promptConfig.systemPrompt || !promptConfig.userPromptTemplate) {
    throw new Error(`Invalid prompt config: ${promptPath} - missing systemPrompt or userPromptTemplate`);
  }

  // Check all required variables are provided
  if (promptConfig.variables) {
    const missingVars = promptConfig.variables.filter(v => !(v in variables));
    if (missingVars.length > 0) {
      throw new Error(`Missing required variables for ${promptPath}: ${missingVars.join(', ')}`);
    }
  }

  // Render user prompt by replacing {{variable}} placeholders
  let userPrompt = promptConfig.userPromptTemplate;
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    userPrompt = userPrompt.replace(regex, variables[key]);
  });

  // Check if any variables were not replaced (indicates typo in template)
  const unreplacedVars = userPrompt.match(/{{(\w+)}}/g);
  if (unreplacedVars) {
    console.warn(`Warning: Unreplaced variables in ${promptPath}: ${unreplacedVars.join(', ')}`);
  }

  // Return rendered prompt
  return {
    name: promptConfig.name,
    version: promptConfig.version,
    model: promptConfig.model || 'grok-4-fast',
    temperature: promptConfig.temperature || 0.3,
    systemPrompt: promptConfig.systemPrompt,
    userPrompt: userPrompt,
    metadata: {
      description: promptConfig.description,
      examples: promptConfig.examples || []
    }
  };
}

/**
 * List all available prompts in the config directory
 *
 * @returns {Array<string>} List of prompt names
 */
export function listPrompts() {
  if (!fs.existsSync(CONFIG_DIR)) {
    return [];
  }

  return fs.readdirSync(CONFIG_DIR)
    .filter(file => file.endsWith('.json'))
    .map(file => file.replace('.json', ''));
}

/**
 * Load raw prompt configuration without variable substitution
 * Used for saving prompts to database for historical tracking
 *
 * @param {string} promptPath - Name of prompt file (e.g., "01-query-understanding")
 * @returns {object} Raw prompt configuration
 */
export function loadRawPrompt(promptPath) {
  const promptFile = path.join(CONFIG_DIR, `${promptPath}.json`);

  if (!fs.existsSync(promptFile)) {
    throw new Error(`Prompt file not found: ${promptFile}`);
  }

  return JSON.parse(fs.readFileSync(promptFile, 'utf-8'));
}

/**
 * Load all prospecting prompts as raw configurations
 * Used for saving the complete prompt set to a project
 *
 * @returns {object} Object with all prompt configurations
 */
export function loadAllProspectingPrompts() {
  return {
    queryUnderstanding: loadRawPrompt('01-query-understanding'),
    websiteExtraction: loadRawPrompt('04-website-extraction'),
    relevanceCheck: loadRawPrompt('07-relevance-check')
  };
}

/**
 * Validate a prompt configuration file
 *
 * @param {string} promptPath - Name of prompt file
 * @returns {object} Validation result
 */
export function validatePrompt(promptPath) {
  try {
    const promptFile = path.join(CONFIG_DIR, `${promptPath}.json`);
    const promptConfig = JSON.parse(fs.readFileSync(promptFile, 'utf-8'));

    const errors = [];
    const warnings = [];

    // Required fields
    if (!promptConfig.name) errors.push('Missing "name" field');
    if (!promptConfig.systemPrompt) errors.push('Missing "systemPrompt" field');
    if (!promptConfig.userPromptTemplate) errors.push('Missing "userPromptTemplate" field');

    // Optional but recommended fields
    if (!promptConfig.version) warnings.push('Missing "version" field');
    if (!promptConfig.description) warnings.push('Missing "description" field');
    if (!promptConfig.model) warnings.push('Missing "model" field (will default to grok-4-fast)');

    // Check for variables in template
    const templateVars = (promptConfig.userPromptTemplate.match(/{{(\w+)}}/g) || [])
      .map(v => v.replace(/{{|}}/g, ''));

    const declaredVars = promptConfig.variables || [];

    // Variables in template but not declared
    const undeclaredVars = templateVars.filter(v => !declaredVars.includes(v));
    if (undeclaredVars.length > 0) {
      warnings.push(`Variables used in template but not declared: ${undeclaredVars.join(', ')}`);
    }

    // Variables declared but not used in template
    const unusedVars = declaredVars.filter(v => !templateVars.includes(v));
    if (unusedVars.length > 0) {
      warnings.push(`Variables declared but not used in template: ${unusedVars.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      variables: templateVars
    };
  } catch (error) {
    return {
      valid: false,
      errors: [error.message],
      warnings: []
    };
  }
}
