import dotenv from 'dotenv';
import { loadPrompt } from '../shared/prompt-loader.js';
import { callAI } from '../shared/ai-client.js';
import { logInfo, logError, logDebug } from '../shared/logger.js';
import { costTracker } from '../shared/cost-tracker.js';

dotenv.config();

/**
 * Convert ICP brief into optimized Google Maps search query using AI
 *
 * @param {object} brief - ICP brief
 * @param {object} options - Options object
 * @param {string} options.modelOverride - Optional model to use instead of prompt default
 * @param {object} options.customPrompt - Optional custom prompt configuration
 * @returns {Promise<string>} Optimized search query
 */
export async function understandQuery(brief, options = {}) {
  // Support legacy signature: understandQuery(brief, modelOverride)
  const opts = typeof options === 'string' ? { modelOverride: options } : options;
  const { modelOverride, customPrompt } = opts;

  try {
    logInfo('Converting ICP brief to search query with AI', {
      industry: brief.industry,
      city: brief.city,
      model: modelOverride || (customPrompt?.model) || 'default'
    });

    // Variables for prompt substitution
    const variables = {
      industry: brief.industry || 'business',
      city: brief.city || '',
      target_description: brief.target || brief.industry || 'business'
    };

    // Use custom prompt if provided, otherwise load default
    let prompt;
    if (customPrompt) {
      logInfo('Using custom prompt for query understanding');
      const { substituteVariables } = await import('../shared/prompt-loader.js');
      prompt = {
        name: customPrompt.name,
        model: customPrompt.model,
        temperature: customPrompt.temperature,
        systemPrompt: customPrompt.systemPrompt,
        userPrompt: substituteVariables(customPrompt.userPromptTemplate, variables, customPrompt.variables)
      };
    } else {
      // Load default prompt from file
      prompt = loadPrompt('01-query-understanding', variables);
    }

    // Use model override if provided, otherwise use prompt model
    const model = modelOverride || prompt.model;

    // Call AI
    const result = await callAI({
      model,
      systemPrompt: prompt.systemPrompt,
      userPrompt: prompt.userPrompt,
      temperature: prompt.temperature,
      maxTokens: 100
    });

    // Track cost
    if (result.usage) {
      costTracker.trackGrokAi(result.usage);
    }

    // Extract query from response
    const query = result.content?.trim() || buildTemplateQuery(brief);

    logInfo('Search query generated', { query, model });

    return query;

  } catch (error) {
    logError('Query understanding failed, using fallback', error, {
      industry: brief.industry,
      city: brief.city
    });

    // Fallback to template-based query
    return buildTemplateQuery(brief);
  }
}

/**
 * Build search query from template (fallback when AI is not available)
 *
 * @param {object} brief - ICP brief
 * @returns {string} Search query
 */
function buildTemplateQuery(brief) {
  const { industry, city, target } = brief;

  // If target is provided, use it directly
  if (target) {
    return city ? `${target} in ${city}` : target;
  }

  // Otherwise build from industry and city
  if (city) {
    return `${industry} in ${city}`;
  }

  return industry;
}

export default { understandQuery };
