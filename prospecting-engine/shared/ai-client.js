/**
 * AI Client - Unified client for OpenAI, Grok (xAI), and Claude (Anthropic)
 *
 * Handles API calls to different AI providers with consistent interface
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from the root .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

// Initialize clients lazily to avoid errors during import when API keys not set
let openai = null;
let grok = null;
let anthropic = null;

function getOpenAIClient() {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable not set');
    }
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  return openai;
}

function getGrokClient() {
  if (!grok) {
    if (!process.env.XAI_API_KEY) {
      throw new Error('XAI_API_KEY environment variable not set');
    }
    grok = new OpenAI({
      apiKey: process.env.XAI_API_KEY,
      baseURL: 'https://api.x.ai/v1'
    });
  }
  return grok;
}

function getAnthropicClient() {
  if (!anthropic) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable not set');
    }
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
  }
  return anthropic;
}

/**
 * Normalize model ID for API calls
 * Strips UI-specific suffixes like '-vision' which are used for model selection UI
 */
function normalizeModelId(modelId) {
  // Strip '-vision' suffix (used in UI to differentiate vision models)
  return modelId.replace(/-vision$/, '');
}

/**
 * Call AI model with text or vision prompt
 *
 * @param {object} options - Call options
 * @param {string} options.model - Model ID (e.g., 'gpt-4o', 'grok-4-fast', 'claude-3-5-sonnet-20241022')
 * @param {string} options.systemPrompt - System prompt
 * @param {string} options.userPrompt - User prompt
 * @param {number} options.temperature - Temperature (0-1)
 * @param {string|Buffer} options.image - Optional image (base64 string or Buffer)
 * @param {boolean} options.jsonMode - Enable JSON output mode
 * @param {number} options.maxTokens - Maximum tokens to generate
 * @returns {Promise<object>} {content, usage, cost}
 */
export async function callAI({
  model,
  systemPrompt,
  userPrompt,
  temperature = 0.3,
  image = null,
  jsonMode = false,
  maxTokens = 4096
}) {
  // Normalize model ID (strip UI-specific suffixes)
  const normalizedModel = normalizeModelId(model);

  // Determine provider from model ID
  const provider = getProvider(normalizedModel);

  if (provider === 'anthropic') {
    return callClaude({ model: normalizedModel, systemPrompt, userPrompt, temperature, image, maxTokens });
  } else {
    return callOpenAICompatible({ model: normalizedModel, systemPrompt, userPrompt, temperature, image, jsonMode, maxTokens, provider });
  }
}

/**
 * Call OpenAI-compatible API (OpenAI, Grok)
 */
async function callOpenAICompatible({
  model,
  systemPrompt,
  userPrompt,
  temperature,
  image,
  jsonMode,
  maxTokens,
  provider
}) {
  const client = provider === 'grok' ? getGrokClient() : getOpenAIClient();

  try {
    // Build user message content
    const userContent = [];

    // Add text
    userContent.push({
      type: 'text',
      text: userPrompt
    });

    // Add image if provided
    if (image) {
      // Convert Buffer to base64 if needed
      let base64Image;
      if (Buffer.isBuffer(image)) {
        base64Image = image.toString('base64');
      } else if (typeof image === 'string') {
        base64Image = image.replace(/^data:image\/\w+;base64,/, '');
      } else {
        throw new Error('Image must be Buffer or base64 string');
      }

      userContent.push({
        type: 'image_url',
        image_url: {
          url: `data:image/png;base64,${base64Image}`,
          detail: 'high'
        }
      });
    }

    // Build request
    const requestBody = {
      model,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userContent.length === 1 ? userPrompt : userContent
        }
      ]
    };

    // GPT-5 uses max_completion_tokens instead of max_tokens
    if (model.includes('gpt-5')) {
      requestBody.max_completion_tokens = maxTokens;
      // GPT-5 only supports temperature=1 (default), so don't set it
    } else {
      requestBody.max_tokens = maxTokens;
      requestBody.temperature = temperature;
    }

    // Enable JSON mode if requested (not supported by GPT-5)
    if (jsonMode && !model.includes('gpt-5')) {
      requestBody.response_format = { type: 'json_object' };
    }

    // Make API call
    const response = await client.chat.completions.create(requestBody);

    // Calculate cost
    const cost = calculateCost(model, response.usage);

    return {
      content: response.choices[0].message.content,
      usage: response.usage,
      cost,
      model,
      provider
    };

  } catch (error) {
    console.error(`AI call failed (${model}):`, error.message);
    throw new Error(`AI API call failed: ${error.message}`);
  }
}

/**
 * Call Claude (Anthropic) API
 */
async function callClaude({
  model,
  systemPrompt,
  userPrompt,
  temperature,
  image,
  maxTokens
}) {
  const client = getAnthropicClient();

  try {
    // Build user message content
    const content = [];

    // Add text
    content.push({
      type: 'text',
      text: userPrompt
    });

    // Add image if provided
    if (image) {
      // Convert Buffer to base64 if needed
      let base64Image;
      let mediaType = 'image/png';

      if (Buffer.isBuffer(image)) {
        base64Image = image.toString('base64');
      } else if (typeof image === 'string') {
        // Extract media type from data URL if present
        const dataUrlMatch = image.match(/^data:(image\/\w+);base64,/);
        if (dataUrlMatch) {
          mediaType = dataUrlMatch[1];
          base64Image = image.replace(/^data:image\/\w+;base64,/, '');
        } else {
          base64Image = image;
        }
      } else {
        throw new Error('Image must be Buffer or base64 string');
      }

      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaType,
          data: base64Image
        }
      });
    }

    // Make API call
    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content
        }
      ]
    });

    // Calculate cost
    const usage = {
      prompt_tokens: response.usage.input_tokens,
      completion_tokens: response.usage.output_tokens,
      total_tokens: response.usage.input_tokens + response.usage.output_tokens
    };

    const cost = calculateCost(model, usage);

    return {
      content: response.content[0].text,
      usage,
      cost,
      model,
      provider: 'anthropic'
    };

  } catch (error) {
    console.error(`Claude API call failed (${model}):`, error.message);
    throw new Error(`Claude API call failed: ${error.message}`);
  }
}

/**
 * Get provider from model ID
 */
function getProvider(modelId) {
  // Ensure modelId is a string
  if (typeof modelId !== 'string') {
    console.error('[AI Client] getProvider received non-string modelId:', typeof modelId, modelId);
    throw new Error(`Model ID must be a string, got ${typeof modelId}: ${JSON.stringify(modelId)}`);
  }

  // Normalize before checking (strip -vision suffix)
  const normalized = normalizeModelId(modelId);

  if (normalized.includes('grok')) return 'grok';
  if (normalized.includes('gpt')) return 'openai';
  if (normalized.includes('claude')) return 'anthropic';

  // Default to OpenAI
  return 'openai';
}

/**
 * Calculate cost of API call
 */
function calculateCost(modelId, usage) {
  if (!usage) return 0;

  // Pricing per 1M tokens (as of October 2025)
  const pricing = {
    // OpenAI - GPT-5 series (released August 2025)
    'gpt-5': { input: 1.25, output: 10 },
    'gpt-5-mini': { input: 0.25, output: 2 },
    'gpt-5-nano': { input: 0.10, output: 0.80 },
    // OpenAI - GPT-4o series (still available)
    'gpt-4o': { input: 5, output: 15 },
    'gpt-4o-mini': { input: 0.15, output: 0.60 },

    // Grok (xAI)
    'grok-beta': { input: 5, output: 15 },
    'grok-4': { input: 3, output: 15 },
    'grok-4-fast': { input: 0.20, output: 0.50 },
    'grok-vision-beta': { input: 1, output: 3 },

    // Claude (Anthropic) - Claude 4.5 series (Sept-Oct 2025)
    'claude-sonnet-4-5': { input: 3, output: 15 },
    'claude-sonnet-4-5-20250929': { input: 3, output: 15 },
    'claude-haiku-4-5': { input: 0.80, output: 4 },
    'claude-haiku-4-5-20251001': { input: 0.80, output: 4 },
    // Claude 3.x (older models still available)
    'claude-3-5-sonnet-20241022': { input: 3, output: 15 },
    'claude-3-5-haiku-20241022': { input: 0.80, output: 4 },
    'claude-3-opus-20240229': { input: 15, output: 75 }
  };

  const modelPricing = pricing[modelId] || { input: 0, output: 0 };

  const inputCost = (usage.prompt_tokens / 1_000_000) * modelPricing.input;
  const outputCost = (usage.completion_tokens / 1_000_000) * modelPricing.output;

  return inputCost + outputCost;
}

/**
 * Parse JSON response with error handling
 */
export function parseJSONResponse(content) {
  try {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) ||
                     content.match(/```\n([\s\S]*?)\n```/) ||
                     [null, content];

    return JSON.parse(jsonMatch[1] || content);
  } catch (error) {
    console.error('Failed to parse JSON response:', content.substring(0, 200));
    throw new Error(`Invalid JSON response: ${error.message}`);
  }
}

export default {
  callAI,
  parseJSONResponse
};
