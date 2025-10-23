/**
 * VARIANT GENERATOR - Generate A/B test variants for emails
 *
 * Generates multiple subject line and body variants for testing.
 * Uses AI to recommend best combination.
 */

import { loadPrompt, fillTemplate } from '../shared/prompt-loader.js';
import { buildPersonalizationContext } from '../shared/personalization-builder.js';
import { generateEmail } from './email-generator.js';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Generate email variants for A/B testing
 * @param {object} lead - Lead data
 * @param {object} options - Options
 * @returns {Promise<object>} All variants with recommendations
 */
export async function generateEmailVariants(lead, options = {}) {
  // Validate inputs
  if (!lead) {
    throw new Error('Lead data is required for variant generation');
  }

  const {
    strategy = 'compliment-sandwich',
    subjectVariants = 3,
    bodyVariants = 2,
    model = 'claude-haiku-3-5'
  } = options;

  // Validate variant counts
  if (subjectVariants < 1 || subjectVariants > 5) {
    throw new Error('Subject variants must be between 1 and 5');
  }
  if (bodyVariants < 1 || bodyVariants > 3) {
    throw new Error('Body variants must be between 1 and 3');
  }

  console.log(`\n🔀 Generating email variants...`);
  console.log(`   Strategy: ${strategy}`);
  console.log(`   Subject variants: ${subjectVariants}`);
  console.log(`   Body variants: ${bodyVariants}`);

  const results = {
    subjects: [],
    bodies: [],
    recommended: { subject: 0, body: 0 },
    reasoning: '',
    total_cost: 0,
    generation_time_ms: 0
  };

  const startTime = Date.now();

  try {
    // Generate subject and body variants IN PARALLEL to save time
    const [subjectResult, bodyResult] = await Promise.all([
      generateSubjectVariants(lead, { count: subjectVariants, model }),
      generateBodyVariants(lead, { strategy, count: bodyVariants, model })
    ]);

    results.subjects = subjectResult.subjects;
    results.bodies = bodyResult.bodies;
    results.total_cost += subjectResult.cost + bodyResult.cost;

    // Get AI recommendation (must wait for variants to complete)
    const recommendation = await getVariantRecommendation(
      results.subjects,
      results.bodies,
      lead,
      model
    );

    results.recommended = recommendation.recommended;
    results.reasoning = recommendation.reasoning;
    results.total_cost += recommendation.cost;

    results.generation_time_ms = Date.now() - startTime;

    console.log(`   ✅ Generated ${subjectVariants} subjects + ${bodyVariants} bodies`);
    console.log(`   💡 Recommended: Subject ${results.recommended.subject + 1}, Body ${results.recommended.body + 1}`);
    console.log(`   💰 Total cost: $${results.total_cost.toFixed(6)}`);

    return results;

  } catch (error) {
    console.error(`   ❌ Variant generation failed: ${error.message}`);
    throw error;
  }
}

/**
 * Generate multiple subject line variants
 * @param {object} lead - Lead data
 * @param {object} options - Options
 * @returns {Promise<object>} Subject variants
 */
async function generateSubjectVariants(lead, options = {}) {
  if (!lead) throw new Error('Lead is required for subject variant generation');

  const { count = 3, model = 'claude-haiku-3-5' } = options;

  try {
    console.log(`   Generating ${count} subject variants...`);

    const prompt = loadPrompt('email-strategies', 'subject-line-generator');
    const context = buildPersonalizationContext(lead);
    context.variant_count = count;

    const filledPrompt = fillTemplate(prompt.userPromptTemplate, context);

    const response = await callClaude(
      model,
      prompt.systemPrompt,
      filledPrompt,
      prompt.temperature || 0.9
    );

    // Parse JSON array
    let subjects;
    try {
      subjects = JSON.parse(response.content);
    } catch {
      // Fallback: split by newlines
      subjects = response.content
        .split('\n')
        .filter(line => line.trim())
        .map(line => line.replace(/^["'`]|["'`]$/g, '').trim())
        .slice(0, count);
    }

    // Ensure we have exactly 'count' subjects
    while (subjects.length < count) {
      subjects.push(`quick fix for ${context.domain}`);
    }

    const cost = calculateCost(model, response.usage);

    subjects.forEach((subj, i) => {
      console.log(`      ${i + 1}. "${subj}" (${subj.length} chars)`);
    });

    return {
      subjects: subjects.slice(0, count),
      cost,
      usage: response.usage
    };
  } catch (error) {
    throw new Error(`Failed to generate subject variants: ${error.message}`);
  }
}

/**
 * Generate multiple body variants
 * @param {object} lead - Lead data
 * @param {object} options - Options
 * @returns {Promise<object>} Body variants
 */
async function generateBodyVariants(lead, options = {}) {
  if (!lead) throw new Error('Lead is required for body variant generation');

  const { strategy = 'compliment-sandwich', count = 2, model = 'claude-haiku-3-5' } = options;

  try {
    console.log(`   Generating ${count} body variants...`);

    const bodies = [];
    let totalCost = 0;
    let totalUsage = { input_tokens: 0, output_tokens: 0 };

    for (let i = 0; i < count; i++) {
      const result = await generateEmail(lead, { strategy, model });
      bodies.push(result.body);
      totalCost += result.cost;
      totalUsage.input_tokens += result.usage.input_tokens;
      totalUsage.output_tokens += result.usage.output_tokens;
    }

    return {
      bodies,
      cost: totalCost,
      usage: totalUsage
    };
  } catch (error) {
    throw new Error(`Failed to generate body variants: ${error.message}`);
  }
}

/**
 * Get AI recommendation for best variant combination
 * @param {string[]} subjects - Subject variants
 * @param {string[]} bodies - Body variants
 * @param {object} lead - Lead data
 * @param {string} model - Model to use
 * @returns {Promise<object>} Recommendation
 */
async function getVariantRecommendation(subjects, bodies, lead, model) {
  if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
    throw new Error('Subjects array is required for recommendation');
  }
  if (!bodies || !Array.isArray(bodies) || bodies.length === 0) {
    throw new Error('Bodies array is required for recommendation');
  }
  if (!lead) throw new Error('Lead is required for recommendation');
  if (!model) throw new Error('Model is required for recommendation');

  try {
    console.log(`   Getting AI recommendation...`);

    const systemPrompt = `You are an email marketing expert analyzing email variants to recommend the best combination.

Evaluate based on:
1. Subject line specificity (mentions domain/company/specific finding)
2. Subject line length (50-70 chars optimal)
3. Body personalization (uses specific data)
4. Body clarity and conciseness
5. Overall conversion potential

Return ONLY a JSON object:
{
  "recommended": {"subject": 0, "body": 0},
  "reasoning": "Brief explanation why this combination will work best"
}`;

    const userPrompt = `Analyze these email variants for ${lead.company_name || lead.url}:

SUBJECT VARIANTS:
${subjects.map((s, i) => `${i}. "${s}"`).join('\n')}

BODY VARIANTS:
${bodies.map((b, i) => `${i}. ${b.substring(0, 200)}...`).join('\n\n')}

Which combination (subject index + body index) will have highest conversion?
Return JSON only.`;

    const response = await callClaude(model, systemPrompt, userPrompt, 0.3);

    // Parse JSON
    let result;
    try {
      result = JSON.parse(response.content);
    } catch {
      // Fallback
      result = {
        recommended: { subject: 0, body: 0 },
        reasoning: 'Unable to parse AI recommendation'
      };
    }

    const cost = calculateCost(model, response.usage);

    return {
      recommended: result.recommended,
      reasoning: result.reasoning,
      cost,
      usage: response.usage
    };
  } catch (error) {
    throw new Error(`Failed to get variant recommendation: ${error.message}`);
  }
}

/**
 * Call Claude AI
 * @param {string} model - Model name
 * @param {string} systemPrompt - System prompt
 * @param {string} userPrompt - User prompt
 * @param {number} temperature - Temperature
 * @returns {Promise<object>} Response
 */
async function callClaude(model, systemPrompt, userPrompt, temperature = 0.7) {
  if (!model) throw new Error('Model is required');
  if (!systemPrompt) throw new Error('System prompt is required');
  if (!userPrompt) throw new Error('User prompt is required');

  try {
    const modelMap = {
      'claude-haiku-3-5': 'claude-3-5-haiku-20241022',
      'claude-sonnet-4-5': 'claude-sonnet-4-5-20250929'
    };

    const actualModel = modelMap[model] || model;

    const response = await anthropic.messages.create({
      model: actualModel,
      max_tokens: 1024,
      temperature,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    });

    if (!response || !response.content || !response.content[0]) {
      throw new Error('Invalid response from Claude API');
    }

    return {
      content: response.content[0].text,
      usage: response.usage
    };
  } catch (error) {
    throw new Error(`Claude API call failed: ${error.message}`);
  }
}

/**
 * Calculate cost
 * @param {string} model - Model name
 * @param {object} usage - Usage object
 * @returns {number} Cost in dollars
 */
function calculateCost(model, usage) {
  if (!model) {
    throw new Error('Model is required for cost calculation');
  }
  if (!usage) {
    throw new Error('Usage object is required for cost calculation');
  }
  if (typeof usage.input_tokens !== 'number' || typeof usage.output_tokens !== 'number') {
    throw new Error('Usage must have input_tokens and output_tokens as numbers');
  }

  try {
    const pricing = {
      'claude-haiku-3-5': { input: 0.25, output: 1.25 },
      'claude-3-5-haiku-20241022': { input: 0.25, output: 1.25 },
      'claude-sonnet-4-5': { input: 3.00, output: 15.00 },
      'claude-sonnet-4-5-20250929': { input: 3.00, output: 15.00 }
    };

    const rates = pricing[model] || { input: 0.25, output: 1.25 };

    return (usage.input_tokens / 1_000_000) * rates.input +
           (usage.output_tokens / 1_000_000) * rates.output;
  } catch (error) {
    throw new Error(`Failed to calculate cost: ${error.message}`);
  }
}
