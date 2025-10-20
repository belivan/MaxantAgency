/**
 * AI Client - Unified client for OpenAI and Grok (xAI)
 *
 * Handles API calls to different AI providers with consistent interface
 */

import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

// Initialize clients lazily to avoid errors during import when API keys not set
let openai = null;
let grok = null;

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

/**
 * Call AI model with text or vision prompt
 *
 * @param {object} options - Call options
 * @param {string} options.model - Model ID (e.g., 'gpt-4o', 'grok-4-fast')
 * @param {string} options.systemPrompt - System prompt
 * @param {string} options.userPrompt - User prompt
 * @param {number} options.temperature - Temperature (0-1)
 * @param {string|Buffer} options.image - Optional image (base64 string or Buffer)
 * @param {boolean} options.jsonMode - Enable JSON output mode
 * @returns {Promise<object>} {content, usage, cost}
 */
export async function callAI({
  model,
  systemPrompt,
  userPrompt,
  temperature = 0.3,
  image = null,
  jsonMode = false
}) {
  // Determine provider from model ID and get appropriate client
  const provider = getProvider(model);
  const client = provider === 'grok' ? getGrokClient() : getOpenAIClient();

  try {
    // Build user message content
    const userContent = [];

    // Add text
    userContent.push({
      type: 'text',
      text: userPrompt
    });

    // Add image if provided (only for OpenAI vision models)
    if (image) {
      if (provider === 'grok') {
        throw new Error('Grok models do not support vision - use GPT-4o for image analysis');
      }

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
      temperature,
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

    // Enable JSON mode if requested
    if (jsonMode) {
      requestBody.response_format = { type: 'json_object' };
    }

    // Make API call
    const response = await client.chat.completions.create(requestBody);

    // Debug logging
    console.log(`[AI Client] Model: ${model}`);
    console.log(`[AI Client] Response received - choices: ${response.choices?.length}`);
    console.log(`[AI Client] Content type: ${typeof response.choices?.[0]?.message?.content}`);
    console.log(`[AI Client] Content length: ${response.choices?.[0]?.message?.content?.length || 0}`);
    console.log(`[AI Client] First 200 chars: ${response.choices?.[0]?.message?.content?.substring(0, 200) || 'null'}`);

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
 * Get provider from model ID
 */
function getProvider(modelId) {
  if (modelId.includes('grok')) return 'grok';
  if (modelId.includes('gpt')) return 'openai';
  if (modelId.includes('claude')) return 'anthropic';

  // Default to OpenAI
  return 'openai';
}

/**
 * Calculate cost of API call
 */
function calculateCost(modelId, usage) {
  if (!usage) return 0;

  // Pricing per 1M tokens
  const pricing = {
    // OpenAI
    'gpt-4o': { input: 5, output: 15 },
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'gpt-5': { input: 1.25, output: 10 },
    'gpt-5-mini': { input: 0.25, output: 2 },

    // Grok
    'grok-4': { input: 3, output: 15 },
    'grok-4-fast': { input: 0.20, output: 0.50 }
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
    return JSON.parse(content);
  } catch (error) {
    console.error('Failed to parse JSON response:', content);
    throw new Error(`Invalid JSON response: ${error.message}`);
  }
}

export default {
  callAI,
  parseJSONResponse
};
