/**
 * EMAIL GENERATOR - Generate personalized emails using prompt configs
 *
 * Uses externalized JSON prompt configurations to generate emails.
 * Calls Claude AI with filled templates from prompt configs.
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { loadPrompt, fillTemplate, validateContext } from '../shared/prompt-loader.js';
import { buildPersonalizationContext } from '../shared/personalization-builder.js';
import { callAI } from '../../database-tools/shared/ai-client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

/**
 * Generate personalized email for a lead
 * @param {object} lead - Lead data from database
 * @param {object} options - Generation options
 * @returns {Promise<object>} Generated email with metadata
 */
export async function generateEmail(lead, options = {}) {
  // Validate inputs
  if (!lead) {
    throw new Error('Lead data is required');
  }
  if (!lead.url && !lead.company_name) {
    throw new Error('Lead must have either url or company_name');
  }

  const {
    strategy = 'compliment-sandwich',
    model = null,
    generateVariants = false
  } = options;

  console.log(`📧 Generating email for ${lead.company_name || lead.url}`);
  console.log(`   Strategy: ${strategy}`);

  try {
    // Load prompt configuration
    const prompt = loadPrompt('email-strategies', strategy);
    if (!prompt) {
      throw new Error(`Strategy '${strategy}' not found`);
    }

    // Build personalization context
    const context = buildPersonalizationContext(lead);

    // Validate context has all required variables
    const validation = validateContext(prompt, context);
    if (!validation.valid) {
      throw new Error(`Missing required context variables: ${validation.missing.join(', ')}`);
    }

    // Fill template with context
    const filledPrompt = fillTemplate(prompt.userPromptTemplate, context);

    // Determine model to use
    const modelToUse = model || prompt.model || 'claude-haiku-4-5';

    // Let the centralized AI client handle model resolution - no mapping needed
    // The AI client supports both naming conventions and knows the correct API-specific IDs

    // Call centralized AI client
    const startTime = Date.now();
    const response = await callAI({
      model: modelToUse,
      systemPrompt: prompt.systemPrompt,
      userPrompt: filledPrompt,
      temperature: prompt.temperature || 0.7,
      maxTokens: 1024,
      engine: 'outreach',
      module: 'email-generator'
    });

    const duration = Date.now() - startTime;

    // Cost is already calculated by centralized client
    const cost = response.cost;

    console.log(`   ✅ Generated in ${duration}ms`);
    console.log(`   💰 Cost: $${cost.toFixed(6)}`);

    return {
      body: response.content,
      strategy,
      model_used: modelToUse,
      generation_time_ms: duration,
      cost,
      usage: response.usage,
      context_used: {
        company_name: context.company_name,
        industry: context.industry,
        grade: context.grade,
        top_issue: context.top_issue
      }
    };

  } catch (error) {
    console.error(`   ❌ Email generation failed: ${error.message}`);
    throw error;
  }
}

// Note: callClaude and calculateCost functions removed - now using centralized AI client

/**
 * Generate email with subject line
 * @param {object} lead - Lead data
 * @param {object} options - Options
 * @returns {Promise<object>} Complete email (subject + body)
 */
export async function generateCompleteEmail(lead, options = {}) {
  console.log(`\n📧 Generating complete email (subject + body in parallel)...`);

  try {
    // Validate lead
    if (!lead) {
      throw new Error('Lead data is required');
    }

    // Generate body and subject IN PARALLEL to save time (~3 seconds faster)
    const [emailBody, subjectLine] = await Promise.all([
      generateEmail(lead, options),
      generateSubjectLine(lead, { model: options.model })
    ]);

    return {
      subject: subjectLine.subject,
      body: emailBody.body,
      strategy: emailBody.strategy,
      model_used: emailBody.model_used,
      total_cost: emailBody.cost + subjectLine.cost,
      generation_time_ms: Math.max(emailBody.generation_time_ms, subjectLine.generation_time_ms), // Use max since parallel
      usage: {
        body: emailBody.usage,
        subject: subjectLine.usage
      }
    };
  } catch (error) {
    console.error(`❌ Complete email generation failed: ${error.message}`);
    throw error;
  }
}

/**
 * Generate subject line separately
 * @param {object} lead - Lead data
 * @param {object} options - Options
 * @returns {Promise<object>} Generated subject line
 */
async function generateSubjectLine(lead, options = {}) {
  console.log(`   Generating subject line...`);

  try {
    const prompt = loadPrompt('email-strategies', 'subject-line-generator');
    const context = buildPersonalizationContext(lead);
    context.variant_count = 1; // Single subject for now

    const filledPrompt = fillTemplate(prompt.userPromptTemplate, context);
    const modelToUse = options.model || prompt.model || 'claude-haiku-4-5';

    // Let the centralized AI client handle model resolution - no mapping needed
    // The AI client supports both naming conventions and knows the correct API-specific IDs

    const startTime = Date.now();
    const response = await callAI({
      model: modelToUse,
      systemPrompt: prompt.systemPrompt,
      userPrompt: filledPrompt,
      temperature: prompt.temperature || 0.9,
      maxTokens: 1024,
      engine: 'outreach',
      module: 'email-generator-subject'
    });

    const duration = Date.now() - startTime;
    const cost = response.cost;

    // Parse JSON response (should be array of subjects)
    let subjects;
    try {
      subjects = JSON.parse(response.content);
    } catch {
      // If not valid JSON, treat as single subject
      subjects = [response.content.trim()];
    }

    console.log(`   ✅ Subject generated: "${subjects[0]}"`);

    return {
      subject: subjects[0],
      all_variants: subjects,
      model_used: modelToUse,
      generation_time_ms: duration,
      cost,
      usage: response.usage
    };

  } catch (error) {
    console.error(`   ❌ Subject generation failed: ${error.message}`);
    throw error;
  }
}

/**
 * Generate single email (legacy compatibility)
 * @param {object} lead - Lead data
 * @param {object} context - Pre-built context (optional)
 * @param {string} strategy - Strategy name
 * @param {string} model - Model name
 * @returns {Promise<object>} Generated email
 */
export async function generateSingleEmail(lead, context = null, strategy = 'compliment-sandwich', model = null) {
  try {
    if (!lead) {
      throw new Error('Lead data is required');
    }
    return await generateCompleteEmail(lead, { strategy, model });
  } catch (error) {
    throw new Error(`Single email generation failed: ${error.message}`);
  }
}
