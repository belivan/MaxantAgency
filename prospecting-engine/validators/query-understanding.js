import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { loadPrompt } from '../shared/prompt-loader.js';
import { logInfo, logError, logDebug } from '../shared/logger.js';
import { costTracker } from '../shared/cost-tracker.js';

// Load env from this package then fall back to website-audit-tool/.env
dotenv.config();
try {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const auditEnv = path.resolve(__dirname, '../../website-audit-tool/.env');
  if (fs.existsSync(auditEnv)) {
    dotenv.config({ path: auditEnv, override: false });
  }
} catch {}

const GROK_API_ENDPOINT = 'https://api.x.ai/v1/chat/completions';

/**
 * Convert ICP brief into optimized Google Maps search query using AI
 *
 * @param {object} brief - ICP brief
 * @returns {Promise<string>} Optimized search query
 */
export async function understandQuery(brief) {
  const apiKey = process.env.XAI_API_KEY;

  if (!apiKey) {
    // Fallback to simple template-based query
    logDebug('XAI_API_KEY not set, using template-based query');
    return buildTemplateQuery(brief);
  }

  try {
    logInfo('Converting ICP brief to search query with AI', {
      industry: brief.industry,
      city: brief.city
    });

    // Load prompt template
    const prompt = loadPrompt('01-query-understanding', {
      industry: brief.industry || 'business',
      city: brief.city || '',
      target_description: brief.target || brief.industry || 'business'
    });

    // Call Grok API
    const response = await fetch(GROK_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: prompt.model,
        messages: [
          {
            role: 'system',
            content: prompt.systemPrompt
          },
          {
            role: 'user',
            content: prompt.userPrompt
          }
        ],
        temperature: prompt.temperature,
        max_tokens: 100
      })
    });

    if (!response.ok) {
      throw new Error(`Grok API error: ${response.status}`);
    }

    const data = await response.json();

    // Track cost
    if (data.usage) {
      costTracker.trackGrokAi(data.usage);
    }

    // Extract query from response
    const query = data.choices?.[0]?.message?.content?.trim() || buildTemplateQuery(brief);

    logInfo('Search query generated', { query });

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
