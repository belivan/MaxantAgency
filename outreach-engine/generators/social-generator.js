/**
 * SOCIAL MEDIA DM GENERATOR - Generate platform-specific DMs
 *
 * Generates casual, authentic DMs for Instagram, Facebook, and LinkedIn.
 * Platform-aware with character limits and tone adjustments.
 */

import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { loadPrompt, fillTemplate, validateContext } from '../shared/prompt-loader.js';
import { buildSocialContext } from '../shared/personalization-builder.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Generate social media DM for a lead
 * @param {object} lead - Lead data
 * @param {object} options - Options
 * @returns {Promise<object>} Generated DM with metadata
 */
export async function generateSocialDM(lead, options = {}) {
  // Validate inputs
  if (!lead) {
    throw new Error('Lead data is required for social DM generation');
  }
  if (!lead.url && !lead.company_name) {
    throw new Error('Lead must have url or company_name for social DM generation');
  }

  const {
    platform = 'instagram',
    strategy = 'value-first',
    model = 'claude-haiku-3-5',
    variants = 1
  } = options;

  console.log(`\n💬 Generating ${platform} DM for ${lead.company_name || lead.url}`);
  console.log(`   Strategy: ${strategy}`);

  try {
    // Validate platform
    const validPlatforms = ['instagram', 'facebook', 'linkedin'];
    if (!validPlatforms.includes(platform)) {
      throw new Error(`Invalid platform: ${platform}. Must be one of: ${validPlatforms.join(', ')}`);
    }

    // Load prompt configuration
    const prompt = loadPrompt('social-strategies', strategy);

    // Verify platform is supported by this strategy
    if (!prompt.platforms.includes(platform)) {
      throw new Error(`Strategy "${strategy}" does not support ${platform}. Supported: ${prompt.platforms.join(', ')}`);
    }

    // Build social-specific context
    const context = buildSocialContext(lead, platform);

    // Validate context
    const validation = validateContext(prompt, context);
    if (!validation.valid) {
      console.warn(`   ⚠️  Missing context variables: ${validation.missing.join(', ')}`);
      // Continue anyway - we'll use defaults
    }

    // Fill template
    const filledPrompt = fillTemplate(prompt.userPromptTemplate, context);

    // Get platform specs
    const platformSpecs = prompt.platformSpecs[platform];

    // Call Claude AI
    const startTime = Date.now();
    const response = await callClaude(
      model,
      prompt.systemPrompt,
      filledPrompt,
      prompt.temperature || 0.8
    );

    const duration = Date.now() - startTime;
    const cost = calculateCost(model, response.usage);

    const message = response.content.trim();

    console.log(`   ✅ Generated DM (${message.length} chars)`);
    console.log(`   💰 Cost: $${cost.toFixed(6)}`);

    // Validate message against platform limits
    const platformValidation = validatePlatformMessage(message, platform, platformSpecs);

    if (!platformValidation.valid) {
      console.warn(`   ⚠️  Platform validation warnings:`);
      platformValidation.warnings.forEach(w => console.warn(`      - ${w}`));
    }

    return {
      message,
      platform,
      strategy,
      character_count: message.length,
      model_used: model,
      generation_time_ms: duration,
      cost,
      usage: response.usage,
      platform_spec: platformSpecs,
      validation: platformValidation
    };

  } catch (error) {
    console.error(`   ❌ Social DM generation failed: ${error.message}`);
    throw error;
  }
}

/**
 * Generate multiple social DM variants
 * @param {object} lead - Lead data
 * @param {object} options - Options
 * @returns {Promise<object>} Variants
 */
export async function generateSocialVariants(lead, options = {}) {
  if (!lead) throw new Error('Lead is required for social variant generation');

  const { platform = 'instagram', count = 3, model = 'claude-haiku-3-5' } = options;

  if (count < 1 || count > 5) {
    throw new Error('Count must be between 1 and 5');
  }

  try {
    console.log(`\n💬 Generating ${count} ${platform} DM variants in parallel...`);

    // Generate all variants IN PARALLEL for much faster generation
    const promises = Array.from({ length: count }, () =>
      generateSocialDM(lead, { platform, model })
    );

    const results = await Promise.all(promises);

    // Extract variants and calculate total cost
    const variants = results.map(result => ({
      message: result.message,
      characterCount: result.character_count,
      validation: result.validation
    }));

    const totalCost = results.reduce((sum, r) => sum + r.cost, 0);

    console.log(`   ✅ Generated ${count} variants`);
    console.log(`   💰 Total cost: $${totalCost.toFixed(6)}`);

    return {
      platform,
      variants,
      total_cost: totalCost
    };
  } catch (error) {
    throw new Error(`Failed to generate social variants: ${error.message}`);
  }
}

/**
 * Validate message against platform requirements
 * @param {string} message - DM message
 * @param {string} platform - Platform name
 * @param {object} specs - Platform specs
 * @returns {object} Validation result
 */
function validatePlatformMessage(message, platform, specs) {
  if (!message || typeof message !== 'string') {
    throw new Error('Message must be a string');
  }
  if (!platform) throw new Error('Platform is required for validation');
  if (!specs) throw new Error('Platform specs are required for validation');

  try {
    const warnings = [];
    const errors = [];

    // Check character limit
    if (message.length > specs.maxChars) {
      errors.push(`Message too long: ${message.length} chars (max: ${specs.maxChars})`);
    }

    // Check for banned words
    const messageLower = message.toLowerCase();
  for (const bannedWord of specs.bannedWords || []) {
    if (messageLower.includes(bannedWord.toLowerCase())) {
      warnings.push(`Contains banned word: "${bannedWord}"`);
    }
  }

  // Check for URLs (Instagram blocks these)
  if (platform === 'instagram') {
    const urlPattern = /https?:\/\/|www\.|\.com|\.net|\.org/i;
    if (urlPattern.test(message)) {
      errors.push('Message contains URL or domain (Instagram blocks these in DMs)');
    }
  }

  // Check optimal length
  if (specs.optimalLength) {
    const [min, max] = specs.optimalLength;
    if (message.length < min) {
      warnings.push(`Message shorter than optimal (${message.length} < ${min} chars)`);
    } else if (message.length > max) {
      warnings.push(`Message longer than optimal (${message.length} > ${max} chars)`);
    }
  }

    return {
      valid: errors.length === 0,
      withinCharLimit: message.length <= specs.maxChars,
      errors,
      warnings,
      score: errors.length === 0 && warnings.length === 0 ? 100 :
             errors.length > 0 ? 50 : 80
    };
  } catch (error) {
    throw new Error(`Failed to validate platform message: ${error.message}`);
  }
}

/**
 * Call Claude AI
 * @param {string} model - Model name
 * @param {string} systemPrompt - System prompt
 * @param {string} userPrompt - User prompt
 * @param {number} temperature - Temperature
 * @returns {Promise<object>} Response
 */
async function callClaude(model, systemPrompt, userPrompt, temperature = 0.8) {
  if (!model) throw new Error('Model is required');
  if (!systemPrompt) throw new Error('System prompt is required');
  if (!userPrompt) throw new Error('User prompt is required');

  try {
    const modelMap = {
      'claude-haiku-3-5': 'claude-3-5-haiku-20241022',
      'claude-sonnet-4-5': 'claude-sonnet-4-5-20250929'
    };

    const actualModel = modelMap[model] || model;

    const response = await anthropic.messages.create({
      model: actualModel,
      max_tokens: 512, // Social DMs are shorter
      temperature,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    });

    if (!response || !response.content || !response.content[0]) {
      throw new Error('Invalid response from Claude API');
    }

    return {
      content: response.content[0].text,
      usage: response.usage
    };
  } catch (error) {
    throw new Error(`Claude API call failed: ${error.message}`);
  }
}

/**
 * Calculate cost
 * @param {string} model - Model name
 * @param {object} usage - Usage object
 * @returns {number} Cost in dollars
 */
function calculateCost(model, usage) {
  if (!model) throw new Error('Model is required for cost calculation');
  if (!usage) throw new Error('Usage object is required for cost calculation');
  if (typeof usage.input_tokens !== 'number' || typeof usage.output_tokens !== 'number') {
    throw new Error('Usage must have input_tokens and output_tokens as numbers');
  }

  const pricing = {
    'claude-haiku-3-5': { input: 0.25, output: 1.25 },
    'claude-3-5-haiku-20241022': { input: 0.25, output: 1.25 },
    'claude-sonnet-4-5': { input: 3.00, output: 15.00 },
    'claude-sonnet-4-5-20250929': { input: 3.00, output: 15.00 }
  };

  const rates = pricing[model] || { input: 0.25, output: 1.25 };

  return (usage.input_tokens / 1_000_000) * rates.input +
         (usage.output_tokens / 1_000_000) * rates.output;
}
