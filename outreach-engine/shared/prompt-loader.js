/**
 * PROMPT LOADER - Load and validate JSON prompt configurations
 *
 * Loads prompt configs from config/prompts/ directory
 * Validates structure and required fields
 * Fills template variables with context data
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Map prompt path to environment variable name for model override
 *
 * @param {string} category - Prompt category
 * @param {string} name - Prompt name
 * @returns {string|null} Environment variable name or null if no mapping
 */
function getEnvVarNameForPrompt(category, name) {
  const fullPath = `${category}/${name}`;

  // Map of prompt paths to environment variable names
  const envVarMap = {
    // Current Email Strategies
    'email-strategies/free-value-delivery': 'EMAIL_COMPOSER_MODEL',
    'email-strategies/portfolio-building': 'EMAIL_COMPOSER_MODEL',
    'email-strategies/problem-first-urgent': 'EMAIL_COMPOSER_MODEL',
    'email-strategies/subject-line-generator': 'SUBJECT_LINE_MODEL',

    // Current Social Strategies - Instagram
    'social-strategies/instagram-free-value': 'SOCIAL_COMPOSER_MODEL',
    'social-strategies/instagram-portfolio-building': 'SOCIAL_COMPOSER_MODEL',
    'social-strategies/instagram-problem-first': 'SOCIAL_COMPOSER_MODEL',

    // Current Social Strategies - LinkedIn
    'social-strategies/linkedin-free-value': 'SOCIAL_COMPOSER_MODEL',
    'social-strategies/linkedin-portfolio-building': 'SOCIAL_COMPOSER_MODEL',
    'social-strategies/linkedin-problem-first': 'SOCIAL_COMPOSER_MODEL',

    // Current Social Strategies - Facebook
    'social-strategies/facebook-free-value': 'SOCIAL_COMPOSER_MODEL',
    'social-strategies/facebook-portfolio-building': 'SOCIAL_COMPOSER_MODEL',
    'social-strategies/facebook-problem-first': 'SOCIAL_COMPOSER_MODEL',

    // Archived Email Strategies (for backward compatibility)
    'email-strategies/compliment-sandwich': 'EMAIL_COMPOSER_MODEL',
    'email-strategies/problem-first': 'EMAIL_COMPOSER_MODEL',
    'email-strategies/achievement-focused': 'EMAIL_COMPOSER_MODEL',
    'email-strategies/question-based': 'EMAIL_COMPOSER_MODEL',

    // Reasoning/composer
    'reasoning/email-composer': 'EMAIL_COMPOSER_MODEL',
    'reasoning/social-composer': 'SOCIAL_COMPOSER_MODEL'
  };

  return envVarMap[fullPath] || null;
}

/**
 * Load a prompt configuration from JSON file
 * @param {string} category - Prompt category ('email-strategies', 'social-strategies', 'reasoning')
 * @param {string} name - Prompt name (e.g., 'compliment-sandwich')
 * @returns {object} Prompt configuration
 */
export function loadPrompt(category, name) {
  try {
    const promptPath = join(__dirname, '..', 'config', 'prompts', category, `${name}.json`);
    const promptData = readFileSync(promptPath, 'utf-8');
    const prompt = JSON.parse(promptData);

    // Validate required fields
    validatePrompt(prompt);

    // Resolve model from environment variable if set
    const envVarName = getEnvVarNameForPrompt(category, name);
    if (envVarName && process.env[envVarName]) {
      prompt.model = process.env[envVarName];
      console.log(`[Prompt Loader] Using model '${prompt.model}' from ${envVarName} for ${category}/${name}`);
    }

    return prompt;
  } catch (error) {
    throw new Error(`Failed to load prompt '${category}/${name}': ${error.message}`);
  }
}

/**
 * Validate prompt configuration structure
 * @param {object} prompt - Prompt configuration
 */
function validatePrompt(prompt) {
  if (!prompt || typeof prompt !== 'object') {
    throw new Error('Prompt must be an object');
  }

  const required = ['version', 'name', 'description', 'model', 'systemPrompt', 'userPromptTemplate', 'variables'];

  for (const field of required) {
    if (!prompt[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // Validate variables array
  if (!Array.isArray(prompt.variables)) {
    throw new Error('Field "variables" must be an array');
  }

  try {
    // Validate that template uses declared variables
    const template = prompt.userPromptTemplate;
    const declaredVars = new Set(prompt.variables);
    const usedVars = extractTemplateVariables(template);

    for (const usedVar of usedVars) {
      if (!declaredVars.has(usedVar)) {
        console.warn(`⚠️  Template uses undeclared variable: {{${usedVar}}}`);
      }
    }
  } catch (error) {
    console.error('Error validating template variables:', error.message);
  }
}

/**
 * Extract variable names from template string
 * @param {string} template - Template string with {{variables}}
 * @returns {Set<string>} Set of variable names
 */
function extractTemplateVariables(template) {
  if (!template || typeof template !== 'string') {
    throw new Error('Template must be a string');
  }

  try {
    const regex = /\{\{(\w+)\}\}/g;
    const variables = new Set();
    let match;

    while ((match = regex.exec(template)) !== null) {
      variables.add(match[1]);
    }

    return variables;
  } catch (error) {
    throw new Error(`Failed to extract template variables: ${error.message}`);
  }
}

/**
 * Fill template with context data
 * @param {string} template - Template string with {{variables}}
 * @param {object} context - Context data (key-value pairs)
 * @returns {string} Filled template
 */
export function fillTemplate(template, context) {
  if (!template || typeof template !== 'string') {
    throw new Error('Template must be a string');
  }
  if (!context || typeof context !== 'object') {
    throw new Error('Context must be an object');
  }

  try {
    let filled = template;

    // Replace each variable with its value
    for (const [key, value] of Object.entries(context)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      filled = filled.replace(regex, value || '');
    }

    // Check for unfilled variables
    const unfilled = filled.match(/\{\{\w+\}\}/g);
    if (unfilled) {
      console.warn(`⚠️  Unfilled variables in template: ${unfilled.join(', ')}`);
    }

    return filled;
  } catch (error) {
    throw new Error(`Failed to fill template: ${error.message}`);
  }
}

/**
 * Get all available prompts in a category
 * @param {string} category - Prompt category
 * @returns {string[]} Array of prompt names
 */
export function listPrompts(category) {
  try {
    const categoryPath = join(__dirname, '..', 'config', 'prompts', category);
    const files = readdirSync(categoryPath);

    return files
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
  } catch (error) {
    console.error(`Failed to list prompts in category '${category}':`, error.message);
    return [];
  }
}

/**
 * Validate that all required context variables are present
 * @param {object} prompt - Prompt configuration
 * @param {object} context - Context data
 * @returns {object} { valid: boolean, missing: string[] }
 */
export function validateContext(prompt, context) {
  if (!prompt) throw new Error('Prompt is required for validation');
  if (!context) throw new Error('Context is required for validation');

  try {
    const missing = [];

    if (!prompt.variables || !Array.isArray(prompt.variables)) {
      throw new Error('Prompt must have variables array');
    }

    for (const variable of prompt.variables) {
      if (context[variable] === undefined || context[variable] === null) {
        missing.push(variable);
      }
    }

    return {
      valid: missing.length === 0,
      missing
    };
  } catch (error) {
    throw new Error(`Failed to validate context: ${error.message}`);
  }
}
