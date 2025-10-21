import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { loadPrompt } from '../shared/prompt-loader.js';
import { logInfo, logError, logApiRequest, logApiResponse } from '../shared/logger.js';
import { costTracker } from '../shared/cost-tracker.js';

dotenv.config();

const apiKey = process.env.XAI_API_KEY;
const GROK_VISION_ENDPOINT = 'https://api.x.ai/v1/chat/completions';

/**
 * Extract business data from website screenshot using Grok Vision AI
 *
 * @param {string} url - Website URL
 * @param {Buffer|string} screenshot - PNG screenshot buffer or base64 string
 * @param {string} companyName - Company name for context
 * @returns {Promise<object>} Extracted data
 */
export async function extractWebsiteData(url, screenshot, companyName) {
  const startTime = Date.now();

  if (!apiKey) {
    throw new Error('XAI_API_KEY not set in environment variables');
  }

  logInfo('Extracting website data with Grok Vision', {
    url,
    company: companyName
  });

  try {
    // Load prompt template
    const prompt = loadPrompt('04-website-extraction', {
      company_name: companyName
    });

    // Convert screenshot to base64 if it's a buffer
    const screenshotBase64 = Buffer.isBuffer(screenshot)
      ? screenshot.toString('base64')
      : screenshot;

    logApiRequest('Grok Vision API', GROK_VISION_ENDPOINT, {
      company: companyName,
      imageSize: screenshotBase64.length
    });

    // Call Grok Vision API
    const response = await fetch(GROK_VISION_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: prompt.model, // Use model from prompt config
        messages: [
          {
            role: 'system',
            content: prompt.systemPrompt
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt.userPrompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/png;base64,${screenshotBase64}`
                }
              }
            ]
          }
        ],
        temperature: prompt.temperature,
        max_tokens: 1000
      })
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Grok API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    logApiResponse('Grok Vision API', response.status, duration, {
      company: companyName
    });

    // Track cost
    if (data.usage) {
      costTracker.trackGrokAi(data.usage);
    }

    // Extract and parse response
    const content = data.choices?.[0]?.message?.content || '{}';

    // Try to parse JSON from response
    let extractedData;
    try {
      // Grok might wrap JSON in markdown code blocks, so clean it
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) ||
                       content.match(/```\n([\s\S]*?)\n```/) ||
                       [null, content];

      extractedData = JSON.parse(jsonMatch[1] || content);
    } catch (e) {
      logError('Failed to parse Grok response as JSON', e, {
        content: content.slice(0, 200)
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
      hasEmail: !!extractedData.contact_email,
      hasPhone: !!extractedData.contact_phone,
      servicesCount: extractedData.services?.length || 0,
      duration_ms: duration
    });

    return {
      url,
      companyName,
      ...extractedData,
      extractionStatus: 'success',
      extractionTime: duration
    };

  } catch (error) {
    logError('Grok vision extraction failed', error, {
      url,
      company: companyName
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
 * @returns {Promise<Array>} Extracted data for each
 */
export async function extractBatch(items, options = {}) {
  const { maxConcurrent = 3 } = options;

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
      batch.map(item => extractWebsiteData(item.url, item.screenshot, item.companyName))
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
