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
import { mkdir, writeFile } from 'fs/promises';
import { getCachedResponse, cacheResponse } from './ai-cache.js';

// Load environment variables from the root .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

// Debug configuration
const DEBUG_AI_CALLS = process.env.DEBUG_AI_CALLS === 'true';
const DEBUG_AI_SAVE_TO_FILE = process.env.DEBUG_AI_SAVE_TO_FILE === 'true';
const DEBUG_OUTPUT_DIR = process.env.DEBUG_OUTPUT_DIR || './debug-logs';

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
 * Debug Utilities - Log AI calls for transparency
 */
let debugCallCounter = 0;

function truncateForDisplay(text, maxLength = 500) {
  if (!text) return '[empty]';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + `...[${text.length - maxLength} more chars]`;
}

function logDebugCall(model, systemPrompt, userPrompt, hasImage, temperature, jsonMode) {
  if (!DEBUG_AI_CALLS) return;

  debugCallCounter++;

  console.log('\n' + '='.repeat(80));
  console.log(`🤖 AI CALL #${debugCallCounter} - ${model}`);
  console.log('='.repeat(80));
  console.log(`Temperature: ${temperature} | JSON Mode: ${jsonMode} | Has Image: ${hasImage}`);
  console.log('\n📝 SYSTEM PROMPT:');
  console.log('-'.repeat(80));
  console.log(truncateForDisplay(systemPrompt, 1000));
  console.log('\n📝 USER PROMPT:');
  console.log('-'.repeat(80));
  console.log(truncateForDisplay(userPrompt, 1000));
  console.log('='.repeat(80) + '\n');
}

function logDebugResponse(content, usage, cost, cached = false) {
  if (!DEBUG_AI_CALLS) return;

  console.log('\n' + '='.repeat(80));
  console.log(`✅ AI RESPONSE #${debugCallCounter} ${cached ? '(CACHED)' : ''}`);
  console.log('='.repeat(80));
  console.log(`Tokens: ${usage?.prompt_tokens || 0} input + ${usage?.completion_tokens || 0} output = ${usage?.total_tokens || 0} total`);
  console.log(`Cost: $${cost?.toFixed(4) || '0.0000'}`);
  console.log('\n📄 RESPONSE CONTENT:');
  console.log('-'.repeat(80));
  console.log(truncateForDisplay(content, 2000));
  console.log('='.repeat(80) + '\n');
}

async function saveDebugToFile(callData) {
  if (!DEBUG_AI_SAVE_TO_FILE) return;

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `ai-call-${debugCallCounter}-${timestamp}.json`;
    const dir = join(process.cwd(), DEBUG_OUTPUT_DIR, 'ai-calls');

    await mkdir(dir, { recursive: true });

    const filepath = join(dir, filename);
    await writeFile(filepath, JSON.stringify(callData, null, 2), 'utf8');

    if (DEBUG_AI_CALLS) {
      console.log(`💾 Debug data saved to: ${filepath}\n`);
    }
  } catch (error) {
    console.error('Failed to save debug file:', error.message);
  }
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
 * @param {number} options.maxTokens - Maximum tokens to generate (default: 16384 for generous limits)
 * @param {boolean} options.autoFallback - Auto-fallback to GPT-4o if GPT-5 fails with length error (default: false)
 * @returns {Promise<object>} {content, usage, cost}
 */
export async function callAI({
  model,
  systemPrompt,
  userPrompt,
  temperature = 0.3,
  image = null,
  jsonMode = false,
  maxTokens = 16384,  // Increased default to 16k tokens
  autoFallback = false
}) {
  const callStartTime = Date.now();

  // Log the AI call for debugging
  logDebugCall(model, systemPrompt, userPrompt, !!image, temperature, jsonMode);
  // ⚡ Check cache first (only for non-image requests)
  if (!image) {
    const cached = getCachedResponse(model, systemPrompt, userPrompt, temperature, jsonMode);
    if (cached) {
      logDebugResponse(cached.content, cached.usage, cached.cost, true);
      return cached;
    }
  }

  // Determine provider from model ID
  const provider = getProvider(model);

  let response;
  if (provider === 'anthropic') {
    response = await callClaude({ model, systemPrompt, userPrompt, temperature, image, maxTokens });
  } else {
    try {
      response = await callOpenAICompatible({ model, systemPrompt, userPrompt, temperature, image, jsonMode, maxTokens, provider });
    } catch (error) {
      const message = (error?.message || '').toLowerCase();
      // Auto-fallback to GPT-4o if GPT-5 hits token limits (only when explicitly enabled)
      if (autoFallback && model.startsWith('gpt-5') && message.includes('token limit')) {
        console.warn('[AI Client] GPT-5 hit token limits. Falling back to gpt-4o.');
        response = await callOpenAICompatible({
          model: 'gpt-4o',
          systemPrompt,
          userPrompt,
          temperature,
          image,
          jsonMode,
          maxTokens,
          provider: 'openai'
        });
      } else {
        throw error;
      }
    }
  }

  const callDuration = Date.now() - callStartTime;

  // Log the response for debugging
  logDebugResponse(response.content, response.usage, response.cost, false);

  // Save debug data to file if enabled
  if (DEBUG_AI_SAVE_TO_FILE) {
    await saveDebugToFile({
      callNumber: debugCallCounter,
      timestamp: new Date().toISOString(),
      request: {
        model,
        systemPrompt,
        userPrompt,
        temperature,
        hasImage: !!image,
        jsonMode,
        maxTokens
      },
      response: {
        content: response.content,
        usage: response.usage,
        cost: response.cost,
        provider: response.provider
      },
      metadata: {
        durationMs: callDuration,
        cached: false
      }
    });
  }

  // ⚡ Cache successful response (only for non-image requests)
  if (!image) {
    cacheResponse(model, systemPrompt, userPrompt, temperature, jsonMode, response);
  }

  return response;
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
  if (!model) {
    throw new Error('[AI Client] Model parameter is required but was undefined');
  }

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

    // MAXIMUM token limits for all models - let them generate complete responses!
    // Each model gets its documented maximum output token limit
    let adjustedMaxTokens = maxTokens;
    
    if (model.startsWith('gpt-5')) {
      // GPT-5 & GPT-5 Mini: 128,000 MAX OUTPUT TOKENS! 🚀
      // Context window: 400,000 tokens total
      // Max input: 272,000 tokens
      // Max output: 128,000 tokens (includes reasoning tokens)
      // Both gpt-5 and gpt-5-mini have the same limits
      adjustedMaxTokens = 128000;
    } else if (model.startsWith('gpt-4o')) {
      // GPT-4o and GPT-4o-mini: 16,384 max output tokens
      adjustedMaxTokens = 16384;
    } else if (model.includes('grok')) {
      // Grok models: 32,768 max output tokens
      adjustedMaxTokens = 32768;
    } else {
      // Default: Use provided maxTokens or set to reasonable high limit
      adjustedMaxTokens = Math.max(maxTokens, 16384);
    }


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
    if (model.startsWith('gpt-5')) {
      requestBody.max_completion_tokens = adjustedMaxTokens;
    } else {
      requestBody.max_tokens = adjustedMaxTokens;
    }

    // GPT-5 only supports temperature=1 (default), so skip it for GPT-5
    if (!model.startsWith('gpt-5')) {
      requestBody.temperature = temperature;
    }

    // Enable JSON mode if requested
    // Note: GPT-5 doesn't support response_format parameter, relies on prompt instructions
    if (jsonMode && !model.startsWith('gpt-5')) {
      requestBody.response_format = { type: 'json_object' };
    }

    // Make API call
    const response = await client.chat.completions.create(requestBody);

    // Calculate cost
    const cost = calculateCost(model, response.usage);

    // Validate response has content
    const responseContent = response.choices[0]?.message?.content;
    const finishReason = response.choices[0]?.finish_reason;
    
    if (!responseContent) {
      // If GPT-5 hit the length limit even with increased tokens, provide helpful error
      if (model.startsWith('gpt-5') && finishReason === 'length') {
        const reasoningTokens = response.usage?.completion_tokens_details?.reasoning_tokens || 0;
        console.error(`GPT-5 exhausted token limit with ${reasoningTokens} reasoning tokens and empty output.`);
        console.error('Consider: 1) Increasing max_completion_tokens further, 2) Simplifying the prompt, 3) Using GPT-4o instead');
        throw new Error(`GPT-5 returned empty content (used ${reasoningTokens} reasoning tokens, hit ${adjustedMaxTokens} token limit). Try increasing maxTokens or using a different model.`);
      }
      
      console.error('Empty response from OpenAI:', JSON.stringify(response, null, 2));
      throw new Error('OpenAI returned empty content');
    }

    return {
      content: responseContent,
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
    // Set maximum tokens for Claude models
    // Claude 3.5 Sonnet/Haiku: 8,192 max output tokens
    // Claude 3 Opus: 4,096 max output tokens
    const adjustedMaxTokens = Math.max(maxTokens, 8192);
    
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
      max_tokens: adjustedMaxTokens,
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

    // Validate response has content
    const responseContent = response.content[0]?.text;
    if (!responseContent) {
      console.error('Empty response from Claude:', JSON.stringify(response, null, 2));
      throw new Error('Claude returned empty content');
    }

    return {
      content: responseContent,
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
  if (!modelId || typeof modelId !== 'string') {
    console.warn('[AI Client] Model ID is undefined or invalid, defaulting to OpenAI');
    return 'openai';
  }

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

  // Pricing per 1M tokens (as of October 2025)
  const pricing = {
    // OpenAI GPT-5 (verified pricing Oct 2025)
    'gpt-5': { input: 1.25, output: 10 },
    'gpt-5-2025-08-07': { input: 1.25, output: 10 },
    'gpt-5-mini': { input: 0.25, output: 2 },
    'gpt-5-nano': { input: 0.05, output: 0.40 },
    'gpt-5-pro': { input: 15, output: 120 },
    
    // OpenAI GPT-4 (verified pricing Oct 2024)
    'gpt-4o': { input: 5, output: 15 },
    'gpt-4o-mini': { input: 0.15, output: 0.60 },

    // Grok (xAI)
    'grok-beta': { input: 5, output: 15 },
    'grok-4': { input: 3, output: 15 },
    'grok-4-fast': { input: 0.20, output: 0.50 },
    'grok-vision-beta': { input: 1, output: 3 },

    // Claude (Anthropic) - Current Claude 3.5 models
    'claude-3-5-sonnet': { input: 3, output: 15 },
    'claude-3-5-sonnet-20241022': { input: 3, output: 15 },
    'claude-3.5-sonnet': { input: 3, output: 15 }, // Alternative naming
    'claude-3-5-haiku': { input: 0.80, output: 4 },
    'claude-3-5-haiku-20241022': { input: 0.80, output: 4 },
    'claude-3.5-haiku': { input: 0.80, output: 4 }, // Alternative naming
    // Claude 3.x (older models)
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
    // Handle null or undefined content
    if (!content) {
      throw new Error('AI response content is null or empty');
    }

    // Try to extract JSON from markdown code blocks
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) ||
                     content.match(/```\n([\s\S]*?)\n```/) ||
                     [null, content];

    return JSON.parse(jsonMatch[1] || content);
  } catch (error) {
    const preview = content ? content.substring(0, 200) : '[null or empty response]';
    console.error('Failed to parse JSON response:', preview);
    throw new Error(`Invalid JSON response: ${error.message}`);
  }
}

export default {
  callAI,
  parseJSONResponse
};


