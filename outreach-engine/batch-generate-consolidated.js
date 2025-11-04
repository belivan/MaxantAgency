import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { supabase } from './integrations/database.js';
import { buildPersonalizationContext, buildSocialContext } from './shared/personalization-builder.js';
import { loadPrompt, fillTemplate, validateContext } from './shared/prompt-loader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const EMAIL_VARIATIONS = [
  { name: 'free-value-delivery', type: 'free_value', field: 'email_free_value' },
  { name: 'portfolio-building', type: 'portfolio_building', field: 'email_portfolio_building' },
  { name: 'problem-first-urgent', type: 'problem_first', field: 'email_problem_first' }
];

const SOCIAL_VARIATIONS = {
  instagram: [
    { name: 'instagram-free-value', type: 'free_value', field: 'instagram_free_value' },
    { name: 'instagram-portfolio-building', type: 'portfolio_building', field: 'instagram_portfolio_building' },
    { name: 'instagram-problem-first', type: 'problem_first', field: 'instagram_problem_first' }
  ],
  linkedin: [
    { name: 'linkedin-free-value', type: 'free_value', field: 'linkedin_free_value' },
    { name: 'linkedin-portfolio-building', type: 'portfolio_building', field: 'linkedin_portfolio_building' },
    { name: 'linkedin-problem-first', type: 'problem_first', field: 'linkedin_problem_first' }
  ],
  facebook: [
    { name: 'facebook-free-value', type: 'free_value', field: 'facebook_free_value' },
    { name: 'facebook-portfolio-building', type: 'portfolio_building', field: 'facebook_portfolio_building' },
    { name: 'facebook-problem-first', type: 'problem_first', field: 'facebook_problem_first' }
  ]
};

/**
 * Fetch leads with necessary analysis data
 */
async function getLeads(filters = {}) {
  const { limit, status, project_id, priority_tier, website_grade } = filters;

  let query = supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);
  if (project_id) query = query.eq('project_id', project_id);
  if (priority_tier) query = query.eq('priority_tier', priority_tier);
  if (website_grade) query = query.eq('website_grade', website_grade);
  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Call Claude API
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
    'claude-4-5-haiku': { input: 1.00 / 1000000, output: 5.00 / 1000000 },
    'claude-sonnet-4': { input: 3.00 / 1000000, output: 15.00 / 1000000 },
    'claude-4-5-sonnet': { input: 3.00 / 1000000, output: 15.00 / 1000000 },
    'claude-sonnet-4-5': { input: 3.00 / 1000000, output: 15.00 / 1000000 }
  };

  const rates = pricing[model] || pricing['claude-haiku-4-5'];
  return (usage.input_tokens * rates.input) + (usage.output_tokens * rates.output);
}

/**
 * Extract subject line from email body and remove it from body
 * Returns { subject, cleanBody }
 */
function extractSubjectLine(emailBody) {
  const match = emailBody.match(/^Subject:\s*(.+)$/im);
  if (match) {
    const subject = match[1].trim();
    // Remove the subject line and any following blank lines
    const cleanBody = emailBody.replace(/^Subject:\s*.+\n+/im, '').trim();
    return { subject, body: cleanBody };
  }
  return { subject: null, body: emailBody };
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
 * Main batch generation - ONE ROW PER LEAD
 */
export async function batchGenerateConsolidated(options = {}) {
  const {
    projectId,
    status,
    limit,
    dryRun = false
  } = options;

  const stats = {
    totalLeads: 0,
    processedLeads: 0,
    totalCost: 0,
    totalTime: 0,
    errors: []
  };

  const startTime = Date.now();

  console.log('\n' + '='.repeat(60));
  console.log('🚀 CONSOLIDATED OUTREACH GENERATION');
  console.log('   ONE ROW PER LEAD - ALL 12 VARIATIONS');
  console.log('='.repeat(60) + '\n');

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
    console.log(`   - 12 variations per lead (3 email + 9 social)`);
    console.log(`   - ${leads.length} database rows (one per lead)\n`);

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
        const result = await processLeadConsolidated(lead);
        stats.totalCost += result.totalCost;
        stats.totalTime += result.totalTime;
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
    const totalElapsed = Date.now() - startTime;
    console.log('\n' + '='.repeat(60));
    console.log('✨ BATCH GENERATION COMPLETE');
    console.log('='.repeat(60) + '\n');
    console.log(`📊 SUMMARY:`);
    console.log(`   Leads processed: ${stats.processedLeads}/${stats.totalLeads}`);
    console.log(`   Database rows: ${stats.processedLeads} (one per lead)`);
    console.log(`   Total variations: ${stats.processedLeads * 12}`);
    console.log(`\n💰 COST:`);
    console.log(`   Total API cost: $${stats.totalCost.toFixed(4)}`);
    console.log(`   Cost per lead: $${(stats.totalCost / stats.processedLeads).toFixed(4)}`);
    console.log(`   Cost per variation: $${(stats.totalCost / (stats.processedLeads * 12)).toFixed(6)}`);
    console.log(`\n⏱️  TIME:`);
    console.log(`   Total generation time: ${(stats.totalTime / 1000).toFixed(1)}s`);
    console.log(`   Total elapsed time: ${(totalElapsed / 1000).toFixed(1)}s`);
    console.log(`   Avg time per lead: ${(stats.totalTime / stats.processedLeads / 1000).toFixed(1)}s`);

    if (stats.errors.length > 0) {
      console.log(`\n⚠️  ERRORS: ${stats.errors.length}`);
      stats.errors.forEach(err => {
        console.log(`   - ${err.lead}: ${err.error}`);
      });
    }

    console.log(`\n✅ All variations saved to Supabase composed_outreach table`);
    console.log(`📥 Ready to export as CSV\n`);

  } catch (error) {
    console.error(`\n❌ Batch generation failed: ${error.message}`);
    throw error;
  }
}

/**
 * Process a single lead - generate all 12 variations and save as ONE ROW
 */
async function processLeadConsolidated(lead) {
  // Check if lead already has outreach generated
  const { data: existing } = await supabase
    .from('composed_outreach')
    .select('id')
    .eq('lead_id', lead.id)
    .single();

  if (existing) {
    console.log('⏭️  Skipping - already exists in database\n');
    return { totalCost: 0, totalTime: 0 };
  }

  const consolidatedRow = {
    lead_id: lead.id,
    url: lead.url,
    company_name: lead.company_name,
    industry: lead.industry,
    contact_email: lead.contact_email,
    contact_name: lead.contact_name,
    contact_title: lead.contact_title,
    project_id: lead.project_id
  };

  const metadata = {
    total_cost: 0,
    total_time_ms: 0,
    total_tokens: { input: 0, output: 0 },
    per_variation: {}
  };

  const dataSources = {
    used_executive_summary: !!lead.executive_summary,
    used_consolidated_issues: (lead.consolidated_issues || []).length > 0,
    used_quick_wins: (lead.quick_wins || []).length > 0,
    priority_tier: lead.priority_tier,
    urgency_score: lead.urgency_score
  };

  // Build personalization context once
  const context = buildPersonalizationContext(lead);

  // Generate 3 email variations
  console.log('📧 Generating 3 email variations...');
  for (const variation of EMAIL_VARIATIONS) {
    try {
      const result = await generateEmail(lead, context, variation);
      consolidatedRow[variation.field] = {
        subject: result.subject,
        body: result.body
      };
      metadata.per_variation[variation.field] = result.metadata;
      metadata.total_cost += result.metadata.cost;
      metadata.total_time_ms += result.metadata.duration;
      metadata.total_tokens.input += result.metadata.input_tokens;
      metadata.total_tokens.output += result.metadata.output_tokens;
      console.log(`   ✓ ${variation.type} (${result.metadata.duration}ms, $${result.metadata.cost.toFixed(6)})`);
    } catch (error) {
      console.error(`   ✗ ${variation.type}: ${error.message}`);
      consolidatedRow[variation.field] = null;
    }
  }

  // Generate 9 social DM variations
  console.log('\n💬 Generating 9 social DM variations...');
  for (const [platform, variations] of Object.entries(SOCIAL_VARIATIONS)) {
    for (const variation of variations) {
      try {
        const result = await generateSocialDM(lead, platform, variation);
        consolidatedRow[variation.field] = result.body;

        // Store profile URLs
        if (!consolidatedRow[`${platform}_profile_url`] && result.profile_url) {
          consolidatedRow[`${platform}_profile_url`] = result.profile_url;
        }

        metadata.per_variation[variation.field] = result.metadata;
        metadata.total_cost += result.metadata.cost;
        metadata.total_time_ms += result.metadata.duration;
        metadata.total_tokens.input += result.metadata.input_tokens;
        metadata.total_tokens.output += result.metadata.output_tokens;
        console.log(`   ✓ ${platform} ${variation.type} (${result.body.length} chars, ${result.metadata.duration}ms, $${result.metadata.cost.toFixed(6)})`);
      } catch (error) {
        console.error(`   ✗ ${platform} ${variation.type}: ${error.message}`);
        consolidatedRow[variation.field] = null;
      }
    }
  }

  // Add metadata
  consolidatedRow.generation_metadata = metadata;
  consolidatedRow.data_sources_used = dataSources;
  consolidatedRow.status = 'ready';

  // Save to database as ONE ROW
  console.log('\n💾 Saving consolidated row to database...');
  const { data, error } = await supabase
    .from('composed_outreach')
    .insert(consolidatedRow)
    .select()
    .single();

  if (error) throw error;

  console.log(`✅ Saved: ${data.id}`);

  return {
    totalCost: metadata.total_cost,
    totalTime: metadata.total_time_ms
  };
}

/**
 * Generate a single email variation
 */
async function generateEmail(lead, context, variation) {
  const { name, type } = variation;

  // Load prompt
  const prompt = loadPrompt('email-strategies', name);
  if (!prompt) {
    throw new Error(`Prompt '${name}' not found`);
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

  // Extract subject line and clean body
  const { subject, body } = extractSubjectLine(response.content);
  const finalSubject = subject || generateDefaultSubject(lead, context, type);

  return {
    subject: finalSubject,
    body: body,
    metadata: {
      model: prompt.model || 'claude-haiku-4-5',
      cost,
      duration,
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens
    }
  };
}

/**
 * Generate a single social DM variation
 */
async function generateSocialDM(lead, platform, variation) {
  const { name, type } = variation;

  // Load prompt
  const prompt = loadPrompt('social-strategies', name);
  if (!prompt) {
    throw new Error(`Prompt '${name}' not found`);
  }

  // Build platform-specific context
  const context = buildSocialContext(lead, platform);

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

  return {
    body: response.content,
    profile_url: context.social_profile_url,
    metadata: {
      model: prompt.model || 'claude-haiku-4-5',
      cost,
      duration,
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens
    }
  };
}

// CLI execution
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  const options = {
    limit: process.argv[2] ? parseInt(process.argv[2]) : undefined,
    dryRun: process.argv.includes('--dry-run')
  };

  batchGenerateConsolidated(options)
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}
