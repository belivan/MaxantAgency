/**
 * BATCH OUTREACH GENERATOR - Generate all email and social variations for all leads
 *
 * This script generates:
 * - 3 email variations per lead (free_value, portfolio_building, problem_first)
 * - 9 social DM variations per lead (3 variations × 3 platforms)
 * - Saves everything to Supabase composed_emails table
 * - Provides detailed progress tracking and cost estimation
 *
 * Usage:
 *   node batch-generate-all-variations.js
 *   node batch-generate-all-variations.js --limit=10
 *   node batch-generate-all-variations.js --project-id=abc-123
 */

import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { loadPrompt, fillTemplate, validateContext } from './shared/prompt-loader.js';
import { buildPersonalizationContext, buildSocialContext } from './shared/personalization-builder.js';
import { getLeads, saveComposedEmail } from './integrations/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Configuration
const EMAIL_VARIATIONS = [
  { name: 'free-value-delivery', type: 'free_value' },
  { name: 'portfolio-building', type: 'portfolio_building' },
  { name: 'problem-first-urgent', type: 'problem_first' }
];

const SOCIAL_VARIATIONS = {
  instagram: [
    { name: 'instagram-free-value', type: 'free_value' },
    { name: 'instagram-portfolio-building', type: 'portfolio_building' },
    { name: 'instagram-problem-first', type: 'problem_first' }
  ],
  linkedin: [
    { name: 'linkedin-free-value', type: 'free_value' },
    { name: 'linkedin-portfolio-building', type: 'portfolio_building' },
    { name: 'linkedin-problem-first', type: 'problem_first' }
  ],
  facebook: [
    { name: 'facebook-free-value', type: 'free_value' },
    { name: 'facebook-portfolio-building', type: 'portfolio_building' },
    { name: 'facebook-problem-first', type: 'problem_first' }
  ]
};

// Stats tracking
const stats = {
  totalLeads: 0,
  processedLeads: 0,
  emailsGenerated: 0,
  socialDMsGenerated: 0,
  errors: [],
  totalCost: 0,
  totalTime: 0,
  startTime: Date.now()
};

/**
 * Main batch generation function
 */
async function batchGenerateAll(options = {}) {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 BATCH OUTREACH GENERATION - All Variations');
  console.log('='.repeat(60) + '\n');

  const {
    limit = null,
    projectId = null,
    status = 'ready_for_outreach',
    dryRun = false
  } = options;

  try {
    // Fetch leads
    console.log('📥 Fetching leads from database...');
    const filters = {};
    if (projectId) filters.project_id = projectId;
    if (status) filters.status = status;
    if (limit) filters.limit = limit;

    const leads = await getLeads(filters);
    stats.totalLeads = leads.length;

    if (leads.length === 0) {
      console.log('⚠️  No leads found matching criteria');
      return;
    }

    console.log(`✅ Found ${leads.length} leads\n`);
    console.log(`📊 Generation plan:`);
    console.log(`   - ${leads.length} leads`);
    console.log(`   - ${leads.length * 3} email variations (3 per lead)`);
    console.log(`   - ${leads.length * 9} social DM variations (9 per lead)`);
    console.log(`   - ${leads.length * 12} total pieces of content\n`);

    if (dryRun) {
      console.log('🔍 DRY RUN MODE - No content will be generated or saved\n');
      return;
    }

    // Process each lead
    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];
      console.log(`\n${'─'.repeat(60)}`);
      console.log(`📍 Lead ${i + 1}/${leads.length}: ${lead.company_name || lead.url}`);
      console.log(`   Grade: ${lead.website_grade} | Priority: ${lead.priority_tier || 'N/A'}`);
      console.log(`${'─'.repeat(60)}\n`);

      try {
        await processLead(lead);
        stats.processedLeads++;
      } catch (error) {
        console.error(`❌ Failed to process lead: ${error.message}`);
        stats.errors.push({
          lead: lead.company_name || lead.url,
          error: error.message
        });
      }

      // Progress update
      const progress = ((i + 1) / leads.length * 100).toFixed(1);
      console.log(`\n📊 Progress: ${progress}% (${i + 1}/${leads.length} leads)`);
    }

    // Final summary
    printFinalSummary();

  } catch (error) {
    console.error(`\n❌ Batch generation failed: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Process a single lead - generate all variations
 */
async function processLead(lead) {
  const leadStats = {
    emailsGenerated: 0,
    socialGenerated: 0,
    errors: []
  };

  // Build personalization context
  const context = buildPersonalizationContext(lead);

  // Generate 3 email variations
  console.log('📧 Generating email variations...');
  for (const variation of EMAIL_VARIATIONS) {
    try {
      await generateAndSaveEmail(lead, context, variation);
      leadStats.emailsGenerated++;
      stats.emailsGenerated++;
    } catch (error) {
      console.error(`   ❌ ${variation.type}: ${error.message}`);
      leadStats.errors.push({ type: 'email', variation: variation.type, error: error.message });
    }
  }

  console.log(`   ✅ Generated ${leadStats.emailsGenerated}/3 email variations\n`);

  // Generate 9 social DM variations (3 per platform)
  console.log('💬 Generating social DM variations...');
  for (const [platform, variations] of Object.entries(SOCIAL_VARIATIONS)) {
    for (const variation of variations) {
      try {
        await generateAndSaveSocialDM(lead, context, platform, variation);
        leadStats.socialGenerated++;
        stats.socialDMsGenerated++;
      } catch (error) {
        console.error(`   ❌ ${platform} ${variation.type}: ${error.message}`);
        leadStats.errors.push({ type: 'social', platform, variation: variation.type, error: error.message });
      }
    }
  }

  console.log(`   ✅ Generated ${leadStats.socialGenerated}/9 social DM variations\n`);

  if (leadStats.errors.length > 0) {
    console.log(`⚠️  ${leadStats.errors.length} errors occurred for this lead`);
  }
}

/**
 * Generate and save a single email variation
 */
async function generateAndSaveEmail(lead, context, variation) {
  const { name, type } = variation;

  // Load prompt
  const prompt = loadPrompt('email-strategies', name);
  if (!prompt) {
    throw new Error(`Prompt '${name}' not found`);
  }

  // Validate context
  const validation = validateContext(prompt, context);
  if (!validation.valid) {
    console.warn(`   ⚠️  Missing context variables for ${type}: ${validation.missing.join(', ')}`);
    // Continue anyway with available context
  }

  // Fill template
  const filledPrompt = fillTemplate(prompt.userPromptTemplate, context);

  // Generate with Claude
  const startTime = Date.now();
  const response = await callClaude(
    prompt.model || 'claude-haiku-4-5',
    prompt.systemPrompt,
    filledPrompt,
    prompt.temperature || 0.7
  );
  const duration = Date.now() - startTime;

  // Calculate cost
  const cost = calculateCost(prompt.model || 'claude-haiku-4-5', response.usage);
  stats.totalCost += cost;
  stats.totalTime += duration;

  // Extract subject line (if generated)
  const emailBody = response.content;
  const subjectLine = extractSubjectLine(emailBody) || generateDefaultSubject(lead, context, type);

  // Track which data sources were used
  const dataSources = {
    used_executive_summary: !!context.has_executive_summary,
    used_consolidated_issues: context.consolidated_issues_count > 0,
    used_quick_wins: context.quick_wins_count > 0,
    priority_tier: context.priority_tier,
    urgency_score: context.urgency_score
  };

  // Save to database
  const emailRecord = {
    lead_id: lead.id,
    url: lead.url,
    company_name: lead.company_name,
    industry: lead.industry,
    contact_email: lead.contact_email,
    contact_name: lead.contact_name,
    contact_title: lead.contact_title,

    email_subject: subjectLine,
    email_body: emailBody,
    email_strategy: name,
    variation_type: type,
    platform: 'email',

    data_sources_used: dataSources,

    ai_model: prompt.model || 'claude-haiku-4-5',
    generation_cost: cost,
    generation_time_ms: duration,
    usage_input_tokens: response.usage.input_tokens,
    usage_output_tokens: response.usage.output_tokens,

    status: 'ready',
    project_id: lead.project_id
  };

  await saveComposedEmail(emailRecord);
  console.log(`   ✓ ${type} (${duration}ms, $${cost.toFixed(6)})`);
}

/**
 * Generate and save a single social DM variation
 */
async function generateAndSaveSocialDM(lead, baseContext, platform, variation) {
  const { name, type } = variation;

  // Load prompt
  const prompt = loadPrompt('social-strategies', name);
  if (!prompt) {
    throw new Error(`Prompt '${name}' not found`);
  }

  // Build platform-specific context
  const context = buildSocialContext(lead, platform);

  // Validate context
  const validation = validateContext(prompt, context);
  if (!validation.valid) {
    console.warn(`   ⚠️  Missing context for ${platform} ${type}: ${validation.missing.join(', ')}`);
  }

  // Fill template
  const filledPrompt = fillTemplate(prompt.userPromptTemplate, context);

  // Generate with Claude
  const startTime = Date.now();
  const response = await callClaude(
    prompt.model || 'claude-haiku-4-5',
    prompt.systemPrompt,
    filledPrompt,
    prompt.temperature || 0.8
  );
  const duration = Date.now() - startTime;

  // Calculate cost
  const cost = calculateCost(prompt.model || 'claude-haiku-4-5', response.usage);
  stats.totalCost += cost;
  stats.totalTime += duration;

  const dmBody = response.content;

  // Track data sources
  const dataSources = {
    platform,
    used_analysis_data: !!(context.one_liner || context.top_issue),
    used_scores: !!(context.website_grade || context.design_score_mobile),
    variation_type: type
  };

  // Save to database
  const dmRecord = {
    lead_id: lead.id,
    url: lead.url,
    company_name: lead.company_name,
    industry: lead.industry,
    contact_name: lead.contact_name,

    email_body: dmBody, // Using email_body field for DM content
    email_strategy: name,
    variation_type: type,
    platform,

    character_count: dmBody.length,
    social_profile_url: context.social_profile_url,

    data_sources_used: dataSources,

    ai_model: prompt.model || 'claude-haiku-4-5',
    generation_cost: cost,
    generation_time_ms: duration,
    usage_input_tokens: response.usage.input_tokens,
    usage_output_tokens: response.usage.output_tokens,

    status: 'ready',
    project_id: lead.project_id
  };

  await saveComposedEmail(dmRecord);
  console.log(`   ✓ ${platform} ${type} (${dmBody.length} chars, ${duration}ms, $${cost.toFixed(6)})`);
}

/**
 * Call Claude AI
 */
async function callClaude(model, systemPrompt, userPrompt, temperature = 0.7) {
  const response = await anthropic.messages.create({
    model,
    max_tokens: 1024,
    temperature,
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: userPrompt
    }]
  });

  return {
    content: response.content[0].text,
    usage: response.usage
  };
}

/**
 * Calculate API cost
 */
function calculateCost(model, usage) {
  const pricing = {
    'claude-haiku-4-5': { input: 0.80 / 1000000, output: 4.00 / 1000000 },
    'claude-sonnet-4': { input: 3.00 / 1000000, output: 15.00 / 1000000 },
    'claude-3-5-sonnet-20241022': { input: 3.00 / 1000000, output: 15.00 / 1000000 }
  };

  const rates = pricing[model] || pricing['claude-haiku-4-5'];
  return (usage.input_tokens * rates.input) + (usage.output_tokens * rates.output);
}

/**
 * Extract subject line from email body (if present)
 */
function extractSubjectLine(emailBody) {
  const match = emailBody.match(/^Subject:\s*(.+)$/im);
  return match ? match[1].trim() : null;
}

/**
 * Generate default subject line based on variation type
 */
function generateDefaultSubject(lead, context, variationType) {
  const company = context.company_name;

  switch (variationType) {
    case 'free_value':
      return `Free website analysis for ${company}`;
    case 'portfolio_building':
      return `Website audit for ${company}`;
    case 'problem_first':
      return `Quick question about ${company}'s website`;
    default:
      return `Analysis for ${company}`;
  }
}

/**
 * Print final summary
 */
function printFinalSummary() {
  const totalDuration = ((Date.now() - stats.startTime) / 1000).toFixed(1);

  console.log('\n' + '='.repeat(60));
  console.log('✨ BATCH GENERATION COMPLETE');
  console.log('='.repeat(60) + '\n');

  console.log('📊 SUMMARY:');
  console.log(`   Leads processed: ${stats.processedLeads}/${stats.totalLeads}`);
  console.log(`   Emails generated: ${stats.emailsGenerated}`);
  console.log(`   Social DMs generated: ${stats.socialDMsGenerated}`);
  console.log(`   Total content pieces: ${stats.emailsGenerated + stats.socialDMsGenerated}\n`);

  console.log('💰 COST:');
  console.log(`   Total API cost: $${stats.totalCost.toFixed(4)}`);
  console.log(`   Cost per lead: $${(stats.totalCost / stats.processedLeads).toFixed(4)}`);
  console.log(`   Cost per piece: $${(stats.totalCost / (stats.emailsGenerated + stats.socialDMsGenerated)).toFixed(6)}\n`);

  console.log('⏱️  TIME:');
  console.log(`   Total generation time: ${(stats.totalTime / 1000).toFixed(1)}s`);
  console.log(`   Total elapsed time: ${totalDuration}s`);
  console.log(`   Avg time per lead: ${(stats.totalTime / stats.processedLeads / 1000).toFixed(1)}s\n`);

  if (stats.errors.length > 0) {
    console.log(`⚠️  ERRORS (${stats.errors.length}):`);
    stats.errors.forEach((err, idx) => {
      console.log(`   ${idx + 1}. ${err.lead}: ${err.error}`);
    });
    console.log('');
  }

  console.log('✅ All variations saved to Supabase composed_emails table');
  console.log('📥 Ready to export as CSV\n');
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {};

args.forEach(arg => {
  if (arg.startsWith('--limit=')) {
    options.limit = parseInt(arg.split('=')[1]);
  } else if (arg.startsWith('--project-id=')) {
    options.projectId = arg.split('=')[1];
  } else if (arg === '--dry-run') {
    options.dryRun = true;
  }
});

// Run batch generation
batchGenerateAll(options);
