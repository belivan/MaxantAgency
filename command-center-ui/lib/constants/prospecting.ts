/**
 * Prospecting Engine - AI Models and Modules Configuration
 */

import type { AIModel, ProspectingModule } from '@/components/prospecting/model-selector';

/**
 * Available AI models for prospecting tasks
 * ACTUAL MODELS AS OF JAN 2025
 */
export const PROSPECTING_MODELS: readonly AIModel[] = [
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
  },

  // OpenAI GPT models
  {
    value: 'gpt-4o-mini',
    label: 'GPT-4o Mini',
    provider: 'OpenAI',
    description: 'Budget model with vision - $0.15/$0.60 per 1M tokens',
    cost: '$',
    speed: 'Very Fast'
  },
  {
    value: 'gpt-4o',
    label: 'GPT-4o',
    provider: 'OpenAI',
    description: 'Latest OpenAI with vision - $5/$15 per 1M tokens',
    cost: '$$',
    speed: 'Fast'
  },

  // Anthropic Claude 3.5 models
  {
    value: 'claude-3.5-haiku',
    label: 'Claude 3.5 Haiku',
    provider: 'Anthropic',
    description: 'Fast & cheap - $0.80/$4 per 1M tokens',
    cost: '$',
    speed: 'Very Fast'
  },
  {
    value: 'claude-3.5-sonnet',
    label: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    description: 'Best for coding - $3/$15 per 1M tokens',
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
    defaultModel: 'gpt-4o'
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
    model: 'grok-4-fast',    // Default text model (cheapest)
    visionModel: 'gpt-4o'    // Default vision model (highest quality)
  };
}