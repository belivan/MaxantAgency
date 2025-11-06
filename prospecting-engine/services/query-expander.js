/**
 * Query Expander Service
 *
 * Generates specialized query variations from an ICP description using AI.
 * Supports progressive strategies for iterative discovery.
 */

import { callAI } from '../../database-tools/shared/ai-client.js';

/**
 * Generates multiple targeted query variations from a single ICP
 *
 * @param {string} icp - Original ICP description (e.g., "dental clinics in Philadelphia")
 * @param {Object} options - Configuration options
 * @param {number} options.maxVariations - Maximum query variations to generate (default: 7)
 * @param {Array<string>} options.previousQueries - Queries to avoid duplicating (default: [])
 * @param {number} options.targetProspectCount - Total target prospect count (default: 50)
 * @param {number} options.currentProspectCount - Current prospect count (default: 0)
 * @param {number} options.iteration - Current iteration number (default: 1)
 * @param {boolean} options.allowGeographicExpansion - Allow geographic expansion (default: false)
 * @param {string} options.model - AI model to use (default: 'grok-4-fast')
 * @returns {Promise<Object>} - { originalQuery, variations: [], reasoning: string, strategy: string, location: string }
 */
export async function expandQuery(icp, options = {}) {
  const {
    maxVariations = 7,
    previousQueries = [],
    targetProspectCount = 50,
    currentProspectCount = 0,
    iteration = 1,
    allowGeographicExpansion = false,
    model = 'grok-4-fast'
  } = options;

  const remaining = targetProspectCount - currentProspectCount;

  const systemPrompt = `You are a business prospecting expert specializing in search query optimization.

Your task: Generate multiple specialized search query variations to maximize prospect discovery on Google Maps.

**CONTEXT:**
- Target: Find ${targetProspectCount} total prospects
- Current: Already have ${currentProspectCount} prospects
- Remaining needed: ${remaining} MORE prospects
- Iteration: #${iteration}
- Previous queries tried: ${previousQueries.length}

**IMPORTANT CONSTRAINTS:**
1. All queries MUST stay relevant to the original ICP
2. Do NOT generate these queries (already tried):
${previousQueries.length > 0 ? previousQueries.map(q => `   - "${q}"`).join('\n') : '   (none yet)'}
3. Each query should target a DIFFERENT segment than previous queries
4. Queries should be concise and Google Maps-friendly (2-6 words)

**PROGRESSIVE STRATEGY (based on iteration):**

${iteration === 1 ? `
ITERATION 1 - SPECIALTY VARIATIONS:
Focus on specialty/niche variations:
- Different specialties (e.g., "family dentistry", "cosmetic dentistry")
- Different service types (e.g., "emergency dental", "dental implants")
- Different practice types (e.g., "pediatric dentists", "orthodontists")
` : ''}

${iteration === 2 ? `
ITERATION 2 - SERVICE & DEMOGRAPHIC:
Go deeper into services and demographics:
- Service-specific (e.g., "teeth whitening", "root canal specialists")
- Demographic-specific (e.g., "affordable dentists", "luxury dental spa")
- Alternative terms (e.g., "oral health", "dental wellness")
` : ''}

${iteration >= 3 && allowGeographicExpansion ? `
ITERATION ${iteration} - GEOGRAPHIC EXPANSION:
Previous specialty variations exhausted. Expand geographically:
- Specific neighborhoods (e.g., "dentists in Center City Philadelphia")
- Nearby suburbs (e.g., "dentists in Bensalem PA", "dentists in King of Prussia")
- Regional searches (e.g., "dentists within 20 miles of Philadelphia")
- Border cities (e.g., "dentists in Cherry Hill NJ")

Extract the primary city from the ICP and expand to surrounding areas.
` : ''}

**OUTPUT FORMAT:**
{
  "originalQuery": "exact text to search",
  "variations": ["query1", "query2", ...],
  "reasoning": "explain your strategy for this iteration",
  "strategy": "specialty|service|demographic|geographic",
  "location": "primary location from ICP"
}

IMPORTANT: Return valid JSON only. No markdown, no code blocks.`;

  const userPrompt = `ICP: "${icp}"

Iteration: ${iteration}
Previous queries: ${previousQueries.length}
Target remaining: ${remaining} prospects

Generate ${maxVariations} NEW query variations that have NOT been tried before.`;

  try {
    const response = await callAI({
      model,
      systemPrompt,
      userPrompt,
      jsonMode: true,
      temperature: 0.7 + (iteration * 0.05) // Increase creativity with each iteration
    });

    const content = response.content;
    const result = typeof content === 'string' ? JSON.parse(content) : content;

    if (!result.originalQuery || !Array.isArray(result.variations)) {
      throw new Error('Invalid AI response structure');
    }

    // Filter out any queries that match previous ones (safety check)
    const filteredVariations = result.variations.filter(q =>
      !previousQueries.some(prev => prev.toLowerCase() === q.toLowerCase())
    );

    // Limit to maxVariations
    if (filteredVariations.length > maxVariations) {
      result.variations = filteredVariations.slice(0, maxVariations);
    } else {
      result.variations = filteredVariations;
    }

    return {
      ...result,
      iteration,
      filteredCount: result.variations.length - filteredVariations.length
    };
  } catch (error) {
    console.error('Error expanding query:', error);
    throw new Error(`Failed to expand query: ${error.message}`);
  }
}
