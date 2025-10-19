import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

// Initialize AI clients
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Grok/xAI client (OpenAI-compatible API)
const grok = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: 'https://api.x.ai/v1',
});

/**
 * Model Configuration
 */
export const MODELS = {
  // OpenAI Models
  'gpt-5': {
    provider: 'openai',
    id: 'gpt-5',
    name: 'GPT-5',
    inputCost: 1.25,   // per 1M tokens
    outputCost: 10,
    supportsVision: true,
    description: 'Latest OpenAI model with best reasoning'
  },
  'gpt-5-mini': {
    provider: 'openai',
    id: 'gpt-5-mini',
    name: 'GPT-5 Mini',
    inputCost: 0.25,
    outputCost: 2,
    supportsVision: true,
    description: 'Balanced cost & quality (Recommended)'
  },
  'gpt-4o': {
    provider: 'openai',
    id: 'gpt-4o',
    name: 'GPT-4o',
    inputCost: 5,
    outputCost: 15,
    supportsVision: true,
    description: 'Best for vision & design analysis'
  },
  'gpt-4o-mini': {
    provider: 'openai',
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    inputCost: 0.15,
    outputCost: 0.60,
    supportsVision: true,
    description: 'Cheapest OpenAI model'
  },

  // Anthropic Models
  'claude-sonnet-4-5': {
    provider: 'anthropic',
    id: 'claude-sonnet-4-5-20250929',
    name: 'Claude Sonnet 4.5',
    inputCost: 3,
    outputCost: 15,
    supportsVision: true,
    description: 'Best for technical analysis'
  },
  'claude-haiku-4-5': {
    provider: 'anthropic',
    id: 'claude-haiku-4-5-20251001',
    name: 'Claude Haiku 4.5',
    inputCost: 0.25,
    outputCost: 1.25,
    supportsVision: true,
    description: 'Fastest & cheapest'
  },

  // xAI Models
  'grok-4': {
    provider: 'grok',
    id: 'grok-4',
    name: 'Grok 4',
    inputCost: 3,
    outputCost: 15,
    supportsVision: false,
    supportsSearch: true,
    description: 'Most intelligent Grok model'
  },
  'grok-4-fast': {
    provider: 'grok',
    id: 'grok-4-fast',
    name: 'Grok 4 Fast',
    inputCost: 0.20,
    outputCost: 0.50,
    supportsVision: false,
    supportsSearch: true,
    description: 'Fast with real-time web search'
  }
};

/**
 * Unified AI call function
 */
export async function callAI({ model, prompt, systemPrompt, image, enableSearch = false }) {
  const modelConfig = MODELS[model];

  if (!modelConfig) {
    console.error(`Unknown model requested: ${model}`);
    console.error(`Available models:`, Object.keys(MODELS));
    throw new Error(`Unknown model: ${model}`);
  }

  const provider = modelConfig.provider;

  try {
    if (provider === 'anthropic') {
      return await callClaude(modelConfig.id, prompt, systemPrompt, image);
    } else if (provider === 'openai') {
      return await callOpenAI(modelConfig.id, prompt, systemPrompt, image);
    } else if (provider === 'grok') {
      return await callGrok(modelConfig.id, prompt, systemPrompt, enableSearch);
    } else {
      throw new Error(`Unknown provider: ${provider}`);
    }
  } catch (error) {
    console.error(`AI call failed for ${model} (${provider}):`, error.message);
    throw error;
  }
}

/**
 * Call Claude (Anthropic)
 */
async function callClaude(modelId, prompt, systemPrompt, image) {
  const messages = [];

  if (image) {
    // Vision request
    messages.push({
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/png',
            data: image, // base64 string
          }
        },
        {
          type: 'text',
          text: prompt
        }
      ]
    });
  } else {
    // Text-only request
    messages.push({
      role: 'user',
      content: prompt
    });
  }

  const response = await anthropic.messages.create({
    model: modelId,
    max_tokens: 8000, // Increased from 2048 to allow full JSON responses
    system: systemPrompt || undefined,
    messages
  });

  // Check if response was truncated due to token limit
  if (response.stop_reason === 'max_tokens') {
    console.warn('⚠️ AI response was truncated due to max_tokens limit. Consider increasing max_tokens.');
  }

  // Validate response structure
  if (!response || !response.content || !response.content[0]) {
    console.error('Invalid Anthropic response structure:', JSON.stringify(response, null, 2));
    throw new Error('Invalid response from Anthropic API');
  }

  const responseText = response.content[0].text || '';
  
  // If text is empty but we got a response, log for debugging
  if (!responseText && response.content[0]) {
    console.error('AI returned empty text. Full response:', JSON.stringify(response, null, 2));
  }

  return {
    text: responseText,
    usage: {
      inputTokens: response.usage?.input_tokens || 0,
      outputTokens: response.usage?.output_tokens || 0
    }
  };
}

/**
 * Call OpenAI (GPT-4o, GPT-5)
 */
async function callOpenAI(modelId, prompt, systemPrompt, image) {
  const messages = [];

  if (systemPrompt) {
    messages.push({
      role: 'system',
      content: systemPrompt
    });
  }

  if (image) {
    // Vision request
    messages.push({
      role: 'user',
      content: [
        {
          type: 'text',
          text: prompt
        },
        {
          type: 'image_url',
          image_url: {
            url: `data:image/png;base64,${image}`
          }
        }
      ]
    });
  } else {
    // Text-only request
    messages.push({
      role: 'user',
      content: prompt
    });
  }

  // GPT-5 models use max_completion_tokens, older models use max_tokens
  const requestParams = {
    model: modelId,
    messages
  };

  if (modelId.startsWith('gpt-5')) {
    requestParams.max_completion_tokens = 8000; // Increased from 2048
  } else {
    requestParams.max_tokens = 8000; // Increased from 2048
  }

  const response = await openai.chat.completions.create(requestParams);

  // Check if response was truncated
  if (response.choices[0].finish_reason === 'length') {
    console.warn('⚠️ OpenAI response was truncated due to token limit. Consider increasing max_tokens.');
  }

  return {
    text: response.choices[0].message.content || '',
    usage: {
      inputTokens: response.usage?.prompt_tokens || 0,
      outputTokens: response.usage?.completion_tokens || 0
    }
  };
}

/**
 * Call Grok (xAI) - OpenAI-compatible API
 */
async function callGrok(modelId, prompt, systemPrompt, enableSearch) {
  const messages = [];

  if (systemPrompt) {
    messages.push({
      role: 'system',
      content: systemPrompt
    });
  }

  messages.push({
    role: 'user',
    content: prompt
  });

  const requestBody = {
    model: modelId,
    messages,
    max_tokens: 8000 // Increased from 2048
  };

  // Enable live search if requested (Grok's web search feature)
  if (enableSearch) {
    requestBody.search_parameters = {
      mode: 'auto',
      max_search_results: 10,
      sources: [
        { type: 'web' },      // Web search
        { type: 'news' }      // News search
      ]
    };
  }

  const response = await grok.chat.completions.create(requestBody);

  // Check if response was truncated
  if (response.choices[0].finish_reason === 'length') {
    console.warn('⚠️ Grok response was truncated due to token limit. Consider increasing max_tokens.');
  }

  return {
    text: response.choices[0].message.content || '',
    usage: {
      inputTokens: response.usage?.prompt_tokens || 0,
      outputTokens: response.usage?.completion_tokens || 0
    }
  };
}

/**
 * Calculate estimated cost
 */
export function calculateCost(model, inputTokens, outputTokens) {
  const modelConfig = MODELS[model];

  if (!modelConfig) return 0;

  const inputCost = (inputTokens / 1_000_000) * modelConfig.inputCost;
  const outputCost = (outputTokens / 1_000_000) * modelConfig.outputCost;

  return inputCost + outputCost;
}

/**
 * Estimate tokens from text length
 */
export function estimateTokens(text) {
  // Rough estimate: ~4 characters per token
  return Math.ceil(text.length / 4);
}
