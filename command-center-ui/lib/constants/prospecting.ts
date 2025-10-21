/**
 * Prospecting Engine - AI Models and Modules Configuration
 */

import type { AIModel, ProspectingModule } from '@/components/prospecting/model-selector';

/**
 * Available AI models for text-based prospecting tasks
 * (Query Understanding, Relevance Check)
 */
export const TEXT_MODELS: readonly AIModel[] = [
  // xAI Grok models
  {
    value: 'grok-4-fast',
    label: 'Grok 4 Fast',
    provider: 'xAI',
    description: 'Fast & cheap - $0.20/$0.50 per 1M tokens',
    cost: '$',
    speed: 'Very Fast'
  },

  // OpenAI GPT models
  {
    value: 'gpt-4o',
    label: 'GPT-4o',
    provider: 'OpenAI',
    description: 'Balanced - $5/$15 per 1M tokens',
    cost: '$$',
    speed: 'Fast'
  },
  {
    value: 'gpt-5',
    label: 'GPT-5',
    provider: 'OpenAI',
    description: 'Latest OpenAI - $1.25/$10 per 1M tokens',
    cost: '$$',
    speed: 'Fast'
  },

  // Anthropic Claude 4.x models
  {
    value: 'claude-sonnet-4-5',
    label: 'Claude Sonnet 4.5',
    provider: 'Anthropic',
    description: 'Best coding model - $3/$15 per 1M tokens',
    cost: '$$',
    speed: 'Fast'
  },
  {
    value: 'claude-haiku-4-5',
    label: 'Claude Haiku 4.5',
    provider: 'Anthropic',
    description: 'Fast & cheap - $0.80/$4 per 1M tokens',
    cost: '$',
    speed: 'Very Fast'
  }
] as const;

/**
 * Available AI models for vision-based prospecting tasks
 * (Website Extraction from screenshots)
 */
export const VISION_MODELS: readonly AIModel[] = [
  // OpenAI GPT models
  {
    value: 'gpt-4o',
    label: 'GPT-4o Vision',
    provider: 'OpenAI',
    description: 'Best vision model - $5/$15 per 1M tokens',
    cost: '$$',
    speed: 'Fast'
  },
  {
    value: 'gpt-5',
    label: 'GPT-5 Vision',
    provider: 'OpenAI',
    description: 'Latest OpenAI multimodal - $1.25/$10 per 1M tokens',
    cost: '$$',
    speed: 'Fast'
  },

  // Anthropic Claude 4.x models
  {
    value: 'claude-sonnet-4-5',
    label: 'Claude Sonnet 4.5',
    provider: 'Anthropic',
    description: 'High quality vision - $3/$15 per 1M tokens',
    cost: '$$',
    speed: 'Fast'
  },
  {
    value: 'claude-haiku-4-5',
    label: 'Claude Haiku 4.5',
    provider: 'Anthropic',
    description: 'Fast vision - $0.80/$4 per 1M tokens',
    cost: '$',
    speed: 'Very Fast'
  }
] as const;

/**
 * Legacy: All models combined (for backward compatibility)
 */
export const PROSPECTING_MODELS: readonly AIModel[] = [
  ...TEXT_MODELS,
  ...VISION_MODELS
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
    model: 'grok-4-fast',     // Default text model (cheapest)
    visionModel: 'gpt-4o'     // Default vision model (highest quality)
  };
}