/**
 * EMAIL GENERATOR - Generate personalized emails using prompt configs
 *
 * Uses externalized JSON prompt configurations to generate emails.
 * Calls Claude AI with filled templates from prompt configs.
 */

import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { loadPrompt, fillTemplate, validateContext } from '../shared/prompt-loader.js';
import { buildPersonalizationContext } from '../shared/personalization-builder.js';

dotenv.config();

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Generate personalized email for a lead
 * @param {object} lead - Lead data from database
 * @param {object} options - Generation options
 * @returns {Promise<object>} Generated email with metadata
 */
export async function generateEmail(lead, options = {}) {
  // Validate inputs
  if (!lead) {
    throw new Error('Lead data is required');
  }
  if (!lead.url && !lead.company_name) {
    throw new Error('Lead must have either url or company_name');
  }

  const {
    strategy = 'compliment-sandwich',
    model = null,
    generateVariants = false
  } = options;

  console.log(`📧 Generating email for ${lead.company_name || lead.url}`);
  console.log(`   Strategy: ${strategy}`);

  try {
    // Load prompt configuration
    const prompt = loadPrompt('email-strategies', strategy);
    if (!prompt) {
      throw new Error(`Strategy '${strategy}' not found`);
    }

    // Build personalization context
    const context = buildPersonalizationContext(lead);

    // Validate context has all required variables
    const validation = validateContext(prompt, context);
    if (!validation.valid) {
      throw new Error(`Missing required context variables: ${validation.missing.join(', ')}`);
    }

    // Fill template with context
    const filledPrompt = fillTemplate(prompt.userPromptTemplate, context);

    // Determine model to use
    const modelToUse = model || prompt.model || 'claude-haiku-3-5';

    // Call Claude AI
    const startTime = Date.now();
    const response = await callClaude(
      modelToUse,
      prompt.systemPrompt,
      filledPrompt,
      prompt.temperature || 0.7
    );

    const duration = Date.now() - startTime;

    // Calculate cost
    const cost = calculateCost(modelToUse, response.usage);

    console.log(`   ✅ Generated in ${duration}ms`);
    console.log(`   💰 Cost: $${cost.toFixed(6)}`);

    return {
      body: response.content,
      strategy,
      model_used: modelToUse,
      generation_time_ms: duration,
      cost,
      usage: response.usage,
      context_used: {
        company_name: context.company_name,
        industry: context.industry,
        grade: context.grade,
        top_issue: context.top_issue
      }
    };

  } catch (error) {
    console.error(`   ❌ Email generation failed: ${error.message}`);
    throw error;
  }
}

/**
 * Call Claude AI with prompt
 * @param {string} model - Model name
 * @param {string} systemPrompt - System prompt
 * @param {string} userPrompt - User prompt
 * @param {number} temperature - Temperature (0-1)
 * @returns {Promise<object>} AI response
 */
async function callClaude(model, systemPrompt, userPrompt, temperature = 0.7) {
  // Validate API key
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set in environment variables');
  }

  // Validate inputs
  if (!model) throw new Error('Model is required');
  if (!systemPrompt) throw new Error('System prompt is required');
  if (!userPrompt) throw new Error('User prompt is required');

  // Map model names to actual Claude model IDs
  const modelMap = {
    'claude-haiku-3-5': 'claude-3-5-haiku-20241022',
    'claude-sonnet-4-5': 'claude-sonnet-4-5-20250929',
    'claude-sonnet-3-5': 'claude-3-5-sonnet-20241022'
  };

  const actualModel = modelMap[model] || model;

  try {
    const response = await anthropic.messages.create({
      model: actualModel,
      max_tokens: 1024,
      temperature,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt
        }
      ]
    });

    if (!response || !response.content || !response.content[0]) {
      throw new Error('Invalid response from Claude API');
    }

    return {
      content: response.content[0].text,
      usage: response.usage,
      model: actualModel
    };
  } catch (error) {
    if (error.status === 401) {
      throw new Error('Invalid API key. Please check ANTHROPIC_API_KEY');
    } else if (error.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later');
    } else if (error.status === 500) {
      throw new Error('Claude API server error. Please try again');
    }
    throw error;
  }
}

/**
 * Calculate cost based on model and token usage
 * @param {string} model - Model name
 * @param {object} usage - Token usage object
 * @returns {number} Cost in dollars
 */
function calculateCost(model, usage) {
  try {
    if (!model) throw new Error('Model is required for cost calculation');
    if (!usage) throw new Error('Usage object is required for cost calculation');
    if (typeof usage.input_tokens !== 'number' || typeof usage.output_tokens !== 'number') {
      throw new Error('Usage must have input_tokens and output_tokens as numbers');
    }

    // Pricing per million tokens (input / output)
    const pricing = {
      'claude-haiku-3-5': { input: 0.25, output: 1.25 },
      'claude-3-5-haiku-20241022': { input: 0.25, output: 1.25 },
      'claude-sonnet-4-5': { input: 3.00, output: 15.00 },
      'claude-sonnet-4-5-20250929': { input: 3.00, output: 15.00 },
      'claude-sonnet-3-5': { input: 3.00, output: 15.00 },
      'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 }
    };

    const rates = pricing[model] || { input: 0.25, output: 1.25 };

    const inputCost = (usage.input_tokens / 1_000_000) * rates.input;
    const outputCost = (usage.output_tokens / 1_000_000) * rates.output;

    return inputCost + outputCost;
  } catch (error) {
    throw new Error(`Cost calculation failed: ${error.message}`);
  }
}

/**
 * Generate email with subject line
 * @param {object} lead - Lead data
 * @param {object} options - Options
 * @returns {Promise<object>} Complete email (subject + body)
 */
export async function generateCompleteEmail(lead, options = {}) {
  console.log(`\n📧 Generating complete email (subject + body in parallel)...`);

  try {
    // Validate lead
    if (!lead) {
      throw new Error('Lead data is required');
    }

    // Generate body and subject IN PARALLEL to save time (~3 seconds faster)
    const [emailBody, subjectLine] = await Promise.all([
      generateEmail(lead, options),
      generateSubjectLine(lead, { model: options.model })
    ]);

    return {
      subject: subjectLine.subject,
      body: emailBody.body,
      strategy: emailBody.strategy,
      model_used: emailBody.model_used,
      total_cost: emailBody.cost + subjectLine.cost,
      generation_time_ms: Math.max(emailBody.generation_time_ms, subjectLine.generation_time_ms), // Use max since parallel
      usage: {
        body: emailBody.usage,
        subject: subjectLine.usage
      }
    };
  } catch (error) {
    console.error(`❌ Complete email generation failed: ${error.message}`);
    throw error;
  }
}

/**
 * Generate subject line separately
 * @param {object} lead - Lead data
 * @param {object} options - Options
 * @returns {Promise<object>} Generated subject line
 */
async function generateSubjectLine(lead, options = {}) {
  console.log(`   Generating subject line...`);

  try {
    const prompt = loadPrompt('email-strategies', 'subject-line-generator');
    const context = buildPersonalizationContext(lead);
    context.variant_count = 1; // Single subject for now

    const filledPrompt = fillTemplate(prompt.userPromptTemplate, context);
    const modelToUse = options.model || prompt.model || 'claude-haiku-3-5';

    const startTime = Date.now();
    const response = await callClaude(
      modelToUse,
      prompt.systemPrompt,
      filledPrompt,
      prompt.temperature || 0.9
    );

    const duration = Date.now() - startTime;
    const cost = calculateCost(modelToUse, response.usage);

    // Parse JSON response (should be array of subjects)
    let subjects;
    try {
      subjects = JSON.parse(response.content);
    } catch {
      // If not valid JSON, treat as single subject
      subjects = [response.content.trim()];
    }

    console.log(`   ✅ Subject generated: "${subjects[0]}"`);

    return {
      subject: subjects[0],
      all_variants: subjects,
      model_used: modelToUse,
      generation_time_ms: duration,
      cost,
      usage: response.usage
    };

  } catch (error) {
    console.error(`   ❌ Subject generation failed: ${error.message}`);
    throw error;
  }
}

/**
 * Generate single email (legacy compatibility)
 * @param {object} lead - Lead data
 * @param {object} context - Pre-built context (optional)
 * @param {string} strategy - Strategy name
 * @param {string} model - Model name
 * @returns {Promise<object>} Generated email
 */
export async function generateSingleEmail(lead, context = null, strategy = 'compliment-sandwich', model = null) {
  try {
    if (!lead) {
      throw new Error('Lead data is required');
    }
    return await generateCompleteEmail(lead, { strategy, model });
  } catch (error) {
    throw new Error(`Single email generation failed: ${error.message}`);
  }
}
