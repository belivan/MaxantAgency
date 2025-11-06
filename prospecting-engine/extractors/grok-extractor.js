import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { loadPrompt } from '../shared/prompt-loader.js';
import { callAI, parseJSONResponse } from '../../database-tools/shared/ai-client.js';
import { logInfo, logError } from '../shared/logger.js';
import { costTracker } from '../shared/cost-tracker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

/**
 * Extract business data from website screenshot using Vision AI
 *
 * @param {string} url - Website URL
 * @param {Buffer|string} screenshot - PNG screenshot buffer or base64 string
 * @param {string} companyName - Company name for context
 * @param {object} options - Options object
 * @param {string} options.modelOverride - Optional model to use instead of prompt default
 * @param {object} options.customPrompt - Optional custom prompt configuration
 * @returns {Promise<object>} Extracted data
 */
export async function extractWebsiteData(url, screenshot, companyName, options = {}) {
  // Support legacy signature: extractWebsiteData(url, screenshot, companyName, visionModel)
  const opts = typeof options === 'string' ? { modelOverride: options } : options;
  const { modelOverride, customPrompt } = opts;

  const startTime = Date.now();

  logInfo('Extracting website data with Vision AI', {
    url,
    company: companyName,
    model: modelOverride || (customPrompt?.model) || 'default'
  });

  try {
    // Variables for prompt substitution
    const variables = {
      company_name: companyName
    };

    // Use custom prompt if provided, otherwise load default
    let prompt;
    if (customPrompt) {
      logInfo('Using custom prompt for website extraction');
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
      prompt = loadPrompt('04-website-extraction', variables);
    }

    // Use model override if provided, otherwise use prompt model
    const modelToUse = modelOverride || prompt.model;

    // Call Vision AI using unified client
    const result = await callAI({
      model: modelToUse,
      systemPrompt: prompt.systemPrompt,
      userPrompt: prompt.userPrompt,
      temperature: prompt.temperature,
      image: screenshot,
      maxTokens: 1000,
      jsonMode: true
    });

    const duration = Date.now() - startTime;

    // Track cost
    if (result.usage) {
      costTracker.trackGrokAi(result.usage);
    }

    // Parse JSON response
    let extractedData;
    try {
      extractedData = await parseJSONResponse(result.content);
    } catch (e) {
      logError('Failed to parse Vision AI response as JSON', e, {
        content: result.content.slice(0, 200)
      });

      // Return default structure
      extractedData = {
        contact_email: null,
        contact_phone: null,
        contact_name: null,
        description: null,
        services: [],
        social_links: {
          instagram: null,
          facebook: null,
          linkedin: null,
          twitter: null
        }
      };
    }

    logInfo('Website data extracted successfully', {
      url,
      company: companyName,
      model: modelToUse,
      hasEmail: !!extractedData.contact_email,
      hasPhone: !!extractedData.contact_phone,
      servicesCount: extractedData.services?.length || 0,
      duration_ms: duration,
      cost: result.cost
    });

    return {
      url,
      companyName,
      ...extractedData,
      extractionStatus: 'success',
      extractionTime: duration
    };

  } catch (error) {
    logError('Vision extraction failed', error, {
      url,
      company: companyName,
      model: visionModel || 'default'
    });

    return {
      url,
      companyName,
      contact_email: null,
      contact_phone: null,
      contact_name: null,
      description: null,
      services: [],
      social_links: {
        instagram: null,
        facebook: null,
        linkedin: null,
        twitter: null
      },
      extractionStatus: 'failed',
      extractionError: error.message
    };
  }
}

/**
 * Extract data from multiple screenshots in batch
 *
 * @param {Array} items - Array of {url, screenshot, companyName}
 * @param {object} options - Options
 * @param {string} options.visionModel - Vision model to use
 * @returns {Promise<Array>} Extracted data for each
 */
export async function extractBatch(items, options = {}) {
  const { maxConcurrent = 3, visionModel = null } = options;

  logInfo('Starting batch extraction', { count: items.length });

  const results = [];

  // Process in batches to avoid rate limits
  for (let i = 0; i < items.length; i += maxConcurrent) {
    const batch = items.slice(i, i + maxConcurrent);

    logInfo(`Processing extraction batch`, {
      batch: Math.floor(i / maxConcurrent) + 1,
      start: i + 1,
      end: Math.min(i + maxConcurrent, items.length),
      total: items.length
    });

    const batchResults = await Promise.all(
      batch.map(item => extractWebsiteData(item.url, item.screenshot, item.companyName, visionModel))
    );

    results.push(...batchResults);

    // Add delay between batches to avoid rate limiting
    if (i + maxConcurrent < items.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  const successful = results.filter(r => r.extractionStatus === 'success').length;
  logInfo('Batch extraction complete', {
    total: items.length,
    successful,
    failed: items.length - successful
  });

  return results;
}

export default { extractWebsiteData, extractBatch };
