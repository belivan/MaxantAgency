/**
 * Prospecting Engine - AI Models and Modules Configuration
 */

import type { AIModel, ProspectingModule } from '@/components/prospecting/model-selector';

/**
 * Available AI models for prospecting tasks
 * OCTOBER 2025 MODELS - Matching backend ai-client.js
 */
export const PROSPECTING_MODELS: readonly AIModel[] = [
  // OpenAI GPT-5 series (Released August 2025)
  {
    value: 'gpt-5',
    label: 'GPT-5',
    provider: 'OpenAI',
    description: 'Latest flagship with vision - $1.25/$10 per 1M tokens',
    cost: '$$',
    speed: 'Fast'
  },
  {
    value: 'gpt-5-mini',
    label: 'GPT-5 Mini',
    provider: 'OpenAI',
    description: 'Budget GPT-5 with vision - $0.25/$2 per 1M tokens',
    cost: '$',
    speed: 'Very Fast'
  },
  {
    value: 'gpt-5-nano',
    label: 'GPT-5 Nano',
    provider: 'OpenAI',
    description: 'Ultra budget - $0.10/$0.80 per 1M tokens',
    cost: '$',
    speed: 'Very Fast'
  },

  // Anthropic Claude 4.5 series (Sept-Oct 2025)
  {
    value: 'claude-sonnet-4-5',
    label: 'Claude Sonnet 4.5',
    provider: 'Anthropic',
    description: 'Latest Claude - $3/$15 per 1M tokens',
    cost: '$$',
    speed: 'Fast'
  },
  {
    value: 'claude-haiku-4-5',
    label: 'Claude Haiku 4.5',
    provider: 'Anthropic',
    description: 'Fast Claude 4.5 - $0.80/$4 per 1M tokens',
    cost: '$',
    speed: 'Very Fast'
  },

  // xAI Grok models
  {
    value: 'grok-4-fast',
    label: 'Grok 4 Fast',
    provider: 'xAI',
    description: 'Fast & cheap - $0.20/$0.50 per 1M tokens',
    cost: '$',
    speed: 'Very Fast'
  },
  {
    value: 'grok-4',
    label: 'Grok 4',
    provider: 'xAI',
    description: 'Full Grok - $3/$15 per 1M tokens',
    cost: '$$',
    speed: 'Fast'
  }
] as const;


/**
 * Prospecting modules that use AI models
 * Each module can have its own model selection
 */
export const PROSPECTING_MODULES: readonly ProspectingModule[] = [
  {
    value: 'queryUnderstanding',
    label: 'Query Understanding',
    description: 'Converts ICP brief into optimized Google Maps search query',
    defaultModel: 'grok-4-fast'
  },
  {
    value: 'websiteExtraction',
    label: 'Website Extraction',
    description: 'Extracts business data from website screenshots and HTML',
    defaultModel: 'gpt-5-mini'  // Updated to GPT-5 Mini for better vision at lower cost
  },
  {
    value: 'relevanceCheck',
    label: 'Relevance Check',
    description: 'Scores how well prospect matches ICP (0-100)',
    defaultModel: 'grok-4-fast'
  }
] as const;

/**
 * Get default model selections
 */
export function getDefaultProspectingModels(): Record<string, string> {
  const defaults: Record<string, string> = {};
  PROSPECTING_MODULES.forEach(module => {
    defaults[module.value] = module.defaultModel;
  });
  return defaults;
}

/**
 * Get default text and vision models
 */
export function getDefaultModels(): { model: string; visionModel: string } {
  return {
    model: 'grok-4-fast',      // Default text model (cheapest)
    visionModel: 'gpt-5-mini'   // Default vision model (balanced quality/cost)
  };
}