import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { supabase } from './integrations/database.js';
import { buildPersonalizationContext, buildSocialContext } from './shared/personalization-builder.js';
import { loadPrompt, fillTemplate, validateContext } from './shared/prompt-loader.js';
import { callAI } from '../database-tools/shared/ai-client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

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
    dryRun = false,
    progressCallback = null, // NEW: Optional callback for API/SSE streaming
    leadIds = null, // NEW: Optional specific lead IDs
    forceRegenerate = false // NEW: Force regeneration even if row exists
  } = options;

  const stats = {
    totalLeads: 0,
    processedLeads: 0,
    totalCost: 0,
    totalTime: 0,
    errors: []
  };

  const startTime = Date.now();

  const log = (msg) => {
    if (!progressCallback) console.log(msg);
  };

  log('\n' + '='.repeat(60));
  log('🚀 CONSOLIDATED OUTREACH GENERATION');
  log('   ONE ROW PER LEAD - ALL 12 VARIATIONS');
  log('='.repeat(60) + '\n');

  try {
    // Fetch leads
    log('📥 Fetching leads from database...');
    let leads;

    if (leadIds && leadIds.length > 0) {
      // Fetch specific leads by IDs
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .in('id', leadIds);

      if (error) throw error;
      leads = data || [];
    } else {
      // Fetch with filters
      const filters = {};
      if (projectId) filters.project_id = projectId;
      if (status) filters.status = status;
      if (limit) filters.limit = limit;
      leads = await getLeads(filters);
    }

    stats.totalLeads = leads.length;

    if (leads.length === 0) {
      log('⚠️  No leads found matching criteria');
      if (progressCallback) {
        progressCallback({ type: 'error', message: 'No leads found' });
      }
      return stats;
    }

    log(`✅ Found ${leads.length} leads\n`);
    log(`📊 Generation plan:`);
    log(`   - ${leads.length} leads`);
    log(`   - 12 variations per lead (3 email + 9 social)`);
    log(`   - ${leads.length} database rows (one per lead)\n`);

    if (progressCallback) {
      progressCallback({
        type: 'start',
        total: leads.length,
        message: `Starting generation for ${leads.length} leads`
      });
    }

    if (dryRun) {
      log('🔍 DRY RUN MODE - No content will be generated or saved\n');
      return stats;
    }

    // Process each lead
    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];
      log(`\n${'─'.repeat(60)}`);
      log(`📍 Lead ${i + 1}/${leads.length}: ${lead.company_name || lead.url}`);
      log(`   Grade: ${lead.website_grade} | Priority: ${lead.priority_tier || 'N/A'}`);
      log(`${'─'.repeat(60)}\n`);

      if (progressCallback) {
        progressCallback({
          type: 'lead_start',
          leadIndex: i,
          total: leads.length,
          lead: {
            id: lead.id,
            company_name: lead.company_name,
            url: lead.url
          },
          message: `Processing ${lead.company_name || lead.url}`
        });
      }

      try {
        const result = await processLeadConsolidated(lead, progressCallback, i, leads.length, forceRegenerate);
        stats.totalCost += result.totalCost;
        stats.totalTime += result.totalTime;
        stats.processedLeads++;

        if (progressCallback) {
          progressCallback({
            type: 'lead_complete',
            leadIndex: i,
            total: leads.length,
            cost: result.totalCost,
            message: `Completed ${lead.company_name || lead.url}`
          });
        }
      } catch (error) {
        console.error(`❌ Failed to process lead: ${error.message}`);
        stats.errors.push({
          lead: lead.company_name || lead.url,
          error: error.message
        });

        if (progressCallback) {
          progressCallback({
            type: 'lead_error',
            leadIndex: i,
            total: leads.length,
            error: error.message,
            message: `Failed: ${lead.company_name || lead.url}`
          });
        }
      }

      // Progress update
      const progress = ((i + 1) / leads.length * 100).toFixed(1);
      log(`\n📊 Progress: ${progress}% (${i + 1}/${leads.length} leads)`);
    }

    // Final summary
    const totalElapsed = Date.now() - startTime;
    log('\n' + '='.repeat(60));
    log('✨ BATCH GENERATION COMPLETE');
    log('='.repeat(60) + '\n');
    log(`📊 SUMMARY:`);
    log(`   Leads processed: ${stats.processedLeads}/${stats.totalLeads}`);
    log(`   Database rows: ${stats.processedLeads} (one per lead)`);
    log(`   Total variations: ${stats.processedLeads * 12}`);
    log(`\n💰 COST:`);
    log(`   Total API cost: $${stats.totalCost.toFixed(4)}`);
    log(`   Cost per lead: $${(stats.totalCost / stats.processedLeads).toFixed(4)}`);
    log(`   Cost per variation: $${(stats.totalCost / (stats.processedLeads * 12)).toFixed(6)}`);
    log(`\n⏱️  TIME:`);
    log(`   Total generation time: ${(stats.totalTime / 1000).toFixed(1)}s`);
    log(`   Total elapsed time: ${(totalElapsed / 1000).toFixed(1)}s`);
    log(`   Avg time per lead: ${(stats.totalTime / stats.processedLeads / 1000).toFixed(1)}s`);

    if (stats.errors.length > 0) {
      log(`\n⚠️  ERRORS: ${stats.errors.length}`);
      stats.errors.forEach(err => {
        log(`   - ${err.lead}: ${err.error}`);
      });
    }

    log(`\n✅ All variations saved to Supabase composed_outreach table`);
    log(`📥 Ready to export as CSV\n`);

    if (progressCallback) {
      progressCallback({
        type: 'complete',
        stats,
        message: `Generation complete: ${stats.processedLeads}/${stats.totalLeads} leads processed`
      });
    }

    return stats;

  } catch (error) {
    console.error(`\n❌ Batch generation failed: ${error.message}`);
    if (progressCallback) {
      progressCallback({
        type: 'error',
        error: error.message,
        message: 'Batch generation failed'
      });
    }
    throw error;
  }
}

/**
 * Process a single lead - generate all 12 variations and save as ONE ROW
 */
async function processLeadConsolidated(lead, progressCallback = null, leadIndex = 0, totalLeads = 1, forceRegenerate = false) {
  // Check if lead already has outreach generated
  const { data: existing } = await supabase
    .from('composed_outreach')
    .select('id')
    .eq('lead_id', lead.id)
    .single();

  if (existing && !forceRegenerate) {
    console.log('⏭️  Skipping - already exists in database (use forceRegenerate=true to override)\n');
    if (progressCallback) {
      progressCallback({
        type: 'variation_skip',
        leadIndex,
        message: 'Already exists in database'
      });
    }
    return { totalCost: 0, totalTime: 0 };
  }

  if (existing && forceRegenerate) {
    console.log('🔄 Force regenerating - deleting existing row...\n');
    await supabase
      .from('composed_outreach')
      .delete()
      .eq('lead_id', lead.id);
  }

  const consolidatedRow = {
    lead_id: lead.id,
    url: lead.url,
    company_name: lead.company_name,
    industry: lead.industry,
    contact_email: lead.contact_email,
    contact_name: lead.contact_name,
    contact_title: lead.contact_title,
    project_id: lead.project_id,
    user_id: lead.user_id  // Required for user data isolation
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

  let variationCount = 0;
  const totalVariations = 12;

  // Generate 3 email variations
  console.log('📧 Generating 3 email variations...');
  for (const variation of EMAIL_VARIATIONS) {
    try {
      if (progressCallback) {
        progressCallback({
          type: 'variation_start',
          leadIndex,
          variationIndex: variationCount,
          totalVariations,
          variation: `email_${variation.type}`,
          message: `Generating email: ${variation.type}`
        });
      }

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

      variationCount++;
      if (progressCallback) {
        progressCallback({
          type: 'variation_complete',
          leadIndex,
          variationIndex: variationCount,
          totalVariations,
          variation: `email_${variation.type}`,
          progress: Math.round((variationCount / totalVariations) * 100),
          message: `Email ${variation.type} complete`
        });
      }
    } catch (error) {
      console.error(`   ✗ ${variation.type}: ${error.message}`);
      consolidatedRow[variation.field] = null;
      variationCount++;
      if (progressCallback) {
        progressCallback({
          type: 'variation_error',
          leadIndex,
          variationIndex: variationCount,
          totalVariations,
          variation: `email_${variation.type}`,
          error: error.message,
          message: `Failed: email ${variation.type}`
        });
      }
    }
  }

  // Generate 9 social DM variations
  console.log('\n💬 Generating 9 social DM variations...');
  for (const [platform, variations] of Object.entries(SOCIAL_VARIATIONS)) {
    for (const variation of variations) {
      try {
        if (progressCallback) {
          progressCallback({
            type: 'variation_start',
            leadIndex,
            variationIndex: variationCount,
            totalVariations,
            variation: `${platform}_${variation.type}`,
            message: `Generating ${platform} DM: ${variation.type}`
          });
        }

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

        variationCount++;
        if (progressCallback) {
          progressCallback({
            type: 'variation_complete',
            leadIndex,
            variationIndex: variationCount,
            totalVariations,
            variation: `${platform}_${variation.type}`,
            progress: Math.round((variationCount / totalVariations) * 100),
            message: `${platform} ${variation.type} complete`
          });
        }
      } catch (error) {
        console.error(`   ✗ ${platform} ${variation.type}: ${error.message}`);
        consolidatedRow[variation.field] = null;
        variationCount++;
        if (progressCallback) {
          progressCallback({
            type: 'variation_error',
            leadIndex,
            variationIndex: variationCount,
            totalVariations,
            variation: `${platform}_${variation.type}`,
            error: error.message,
            message: `Failed: ${platform} ${variation.type}`
          });
        }
      }
    }
  }

  // Add metadata
  consolidatedRow.generation_metadata = metadata;
  consolidatedRow.data_sources_used = dataSources;
  consolidatedRow.status = 'ready';

  // Save to database as ONE ROW
  console.log('\n💾 Saving consolidated row to database...');

  if (progressCallback) {
    progressCallback({
      type: 'saving',
      leadIndex,
      message: 'Saving to database...'
    });
  }

  const { data, error } = await supabase
    .from('composed_outreach')
    .insert(consolidatedRow)
    .select()
    .single();

  if (error) {
    console.error('\n❌ Database INSERT failed:');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error hint:', error.hint);
    console.error('\nConsolidated row keys:', Object.keys(consolidatedRow));
    console.error('\nSample values:');
    console.error('  email_free_value:', typeof consolidatedRow.email_free_value, consolidatedRow.email_free_value);
    console.error('  instagram_free_value:', typeof consolidatedRow.instagram_free_value, consolidatedRow.instagram_free_value ? consolidatedRow.instagram_free_value.substring(0, 50) : 'null');
    throw error;
  }

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

  // Generate with centralized AI client (supports GPT, Claude, Grok)
  const startTime = Date.now();
  const response = await callAI({
    model: prompt.model || 'claude-haiku-4-5',
    systemPrompt: prompt.systemPrompt,
    userPrompt: filledPrompt,
    temperature: prompt.temperature || 0.7,
    module: 'batch-generate-consolidated/email'
  });
  const duration = Date.now() - startTime;

  // Extract subject line and clean body
  const { subject, body } = extractSubjectLine(response.content);
  const finalSubject = subject || generateDefaultSubject(lead, context, type);

  return {
    subject: finalSubject,
    body: body,
    metadata: {
      model: prompt.model || 'claude-haiku-4-5',
      cost: response.cost,
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

  // Generate with centralized AI client (supports GPT, Claude, Grok)
  const startTime = Date.now();
  const response = await callAI({
    model: prompt.model || 'claude-haiku-4-5',
    systemPrompt: prompt.systemPrompt,
    userPrompt: filledPrompt,
    temperature: prompt.temperature || 0.8,
    module: 'batch-generate-consolidated/social'
  });
  const duration = Date.now() - startTime;

  return {
    body: response.content,
    profile_url: context.social_profile_url,
    metadata: {
      model: prompt.model || 'claude-haiku-4-5',
      cost: response.cost,
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
