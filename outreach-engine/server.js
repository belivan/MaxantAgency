/**
 * MAKSANT OUTREACH ENGINE - API SERVER
 * Version: 2.0
 * Port: 3002 (runs alongside email-composer:3001)
 *
 * Spec-compliant outreach engine with externalized prompts & validation.
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Generators
import { generateEmail, generateCompleteEmail } from './generators/email-generator.js';
import { generateEmailVariants } from './generators/variant-generator.js';
import { generateSocialDM } from './generators/social-generator.js';

// Validators
import { validateEmail } from './validators/email-validator.js';
import { validateSocialDM } from './validators/social-validator.js';

// Integrations
import {
  getRegularLeads,
  getSocialLeads,
  getLeadByUrl,
  getLeadById,
  saveComposedEmail,
  getReadyEmails,
  getComposedEmailById,
  updateEmailStatus,
  markLeadProcessed,
  getStats
} from './integrations/database.js';

import {
  syncEmailToNotion,
  getNotionPages,
  testNotionConnection
} from './integrations/notion.js';

import {
  sendEmail,
  sendBulkEmails,
  testSMTPConnection,
  getRateLimitStatus
} from './integrations/smtp-sender.js';

// Shared utilities
import { buildPersonalizationContext } from './shared/personalization-builder.js';
import { loadPrompt, listPrompts } from './shared/prompt-loader.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

/**
 * ═══════════════════════════════════════════════════════════════════
 * HEALTH & STATUS ENDPOINTS
 * ═══════════════════════════════════════════════════════════════════
 */

/**
 * GET /health - Health check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'outreach-engine',
    version: '2.0',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/stats - Get statistics
 */
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await getStats();
    const rateLimits = getRateLimitStatus();

    res.json({
      success: true,
      stats,
      rateLimits
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * ═══════════════════════════════════════════════════════════════════
 * EMAIL COMPOSITION ENDPOINTS
 * ═══════════════════════════════════════════════════════════════════
 */

/**
 * POST /api/compose - Compose email for single lead
 * Body: { url, strategy?, generateVariants?, model? }
 */
app.post('/api/compose', async (req, res) => {
  try {
    const {
      url,
      lead: providedLead,
      strategy_id,
      strategy = strategy_id || 'compliment-sandwich',
      generateVariants = false,
      model = 'claude-haiku-3-5'
    } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'url is required'
      });
    }

    console.log(`\n📧 Composing email for ${url}...`);
    console.log(`   Strategy: ${strategy}`);
    console.log(`   Variants: ${generateVariants}`);

    // Get lead data (either from request or database)
    let lead;
    if (providedLead) {
      console.log(`   Using provided lead data (test mode)`);
      lead = providedLead;
    } else {
      lead = await getLeadByUrl(url);
      if (!lead) {
        return res.status(404).json({
          success: false,
          error: `Lead not found for URL: ${url}`
        });
      }
    }

    let result;

    if (generateVariants) {
      // Generate with A/B variants
      result = await generateEmailVariants(lead, {
        strategy,
        subjectVariants: 3,
        bodyVariants: 2,
        model
      });

      // Validate recommended email
      const recommendedSubject = result.subjects[result.recommended.subject];
      const recommendedBody = result.bodies[result.recommended.body];

      const validation = validateEmail({
        subject: recommendedSubject,
        body: recommendedBody
      });

      result.validation = validation;

    } else {
      // Generate single email
      result = await generateCompleteEmail(lead, {
        strategy,
        model
      });

      // Validate
      const validation = validateEmail({
        subject: result.subject,
        body: result.body
      });

      result.validation = validation;
    }

    // Save to database (skip for test leads)
    let savedEmail = null;
    if (!providedLead) {
      // Only save if lead came from database (not provided in request)
      savedEmail = await saveComposedEmail({
        lead_id: lead.id,
        url: lead.url,
        company_name: lead.company_name,
        contact_email: lead.contact_email,
        subject: generateVariants ? result.subjects[result.recommended.subject] : result.subject,
        body: generateVariants ? result.bodies[result.recommended.body] : result.body,
        strategy,
        model_used: model,
        generation_time_ms: result.total_time || result.generation_time,
        cost: result.total_cost || result.cost,
        status: 'pending', // All emails start as pending for review
        has_variants: generateVariants,
        subject_variants: generateVariants ? result.subjects : null,
        body_variants: generateVariants ? result.bodies : null,
        recommended_variant: generateVariants ? result.recommended : null,
        variant_reasoning: generateVariants ? result.reasoning : null
    });
    } else {
      console.log(`   ⚠️  Test mode - skipping database save`);
    }

    if (savedEmail) {
      console.log(`   ✅ Email composed (ID: ${savedEmail.id})`);

      // AUTO-SYNC TO NOTION
      try {
        console.log(`   🔄 Auto-syncing to Notion...`);

        const notionEmail = {
          ...savedEmail,
          subject: savedEmail.email_subject || savedEmail.subject,
          body: savedEmail.email_body || savedEmail.body,
          platform: 'email',
          validation_score: result.validation.score,
          model_used: model,
          generation_time_ms: result.total_time || result.generation_time_ms || result.generation_time,
          cost: result.total_cost || result.cost,
          created_at: savedEmail.created_at || new Date().toISOString(),
          // Include variants if generated
          has_variants: generateVariants,
          subject_variants: generateVariants ? result.subjects : null,
          body_variants: generateVariants ? result.bodies : null,
          recommended_variant: generateVariants ? result.recommended : null,
          variant_reasoning: generateVariants ? result.reasoning : null
        };

        await syncEmailToNotion(notionEmail, lead);
        console.log(`   ✅ Synced to Notion successfully`);
      } catch (notionError) {
        console.error(`   ⚠️  Notion sync failed (non-fatal): ${notionError.message}`);
        // Don't fail the whole request if Notion sync fails
      }
    } else {
      console.log(`   ✅ Email composed (test mode - not saved)`);
    }
    console.log(`   💰 Cost: $${(result.total_cost || result.cost).toFixed(6)}`);
    console.log(`   📊 Validation: ${result.validation.score}/100 (${result.validation.rating})`);

    // Build response email object
    const emailResponse = savedEmail || {
      id: 'test-' + Date.now(),
      subject: generateVariants ? result.subjects[result.recommended.subject] : result.subject,
      body: generateVariants ? result.bodies[result.recommended.body] : result.body,
      strategy,
      model_used: model,
      total_cost: result.total_cost || result.cost,
      generation_time_ms: result.total_time || result.generation_time_ms,
      validation_score: result.validation.score,
      company_name: lead.company_name,
      url: lead.url,
      has_variants: generateVariants,
      subject_variants: generateVariants ? result.subjects : null,
      body_variants: generateVariants ? result.bodies : null,
      recommended_variant: generateVariants ? result.recommended : null
    };

    res.json({
      success: true,
      email: emailResponse,
      result,
      lead: {
        id: lead.id || 'test-lead',
        url: lead.url,
        company_name: lead.company_name
      }
    });

  } catch (error) {
    console.error('Error composing email:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/compose-social - Generate social DM
 * Body: { url, platform, strategy?, model? }
 */
app.post('/api/compose-social', async (req, res) => {
  try {
    const {
      url,
      platform = 'instagram',
      strategy = 'value-first',
      model = 'claude-haiku-3-5'
    } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'url is required'
      });
    }

    if (!['instagram', 'facebook', 'linkedin'].includes(platform)) {
      return res.status(400).json({
        success: false,
        error: 'platform must be instagram, facebook, or linkedin'
      });
    }

    console.log(`\n💬 Generating ${platform} DM for ${url}...`);

    // Get lead data
    const lead = await getLeadByUrl(url);
    if (!lead) {
      return res.status(404).json({
        success: false,
        error: `Lead not found for URL: ${url}`
      });
    }

    // Check if lead has social profile for platform
    if (!lead.social_profiles || !lead.social_profiles[platform]) {
      return res.status(400).json({
        success: false,
        error: `Lead does not have ${platform} profile`
      });
    }

    // Generate DM
    const result = await generateSocialDM(lead, {
      platform,
      strategy,
      model
    });

    console.log(`   ✅ DM generated (${result.character_count} chars)`);
    console.log(`   💰 Cost: $${result.cost.toFixed(6)}`);
    console.log(`   📊 Validation: ${result.validation.score}/100 (${result.validation.rating})`);

    res.json({
      success: true,
      result,
      lead: {
        id: lead.id,
        url: lead.url,
        company_name: lead.company_name,
        social_profile: lead.social_profiles[platform]
      }
    });

  } catch (error) {
    console.error('Error generating social DM:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/compose-batch - Compose emails for multiple leads
 * Body: { limit?, grade?, strategy?, model? }
 * Returns: Server-Sent Events
 */
app.post('/api/compose-batch', async (req, res) => {
  try {
    const {
      limit = 10,
      grade = null,
      projectId = null,
      strategy = 'compliment-sandwich',
      model = 'claude-haiku-3-5'
    } = req.body;

    console.log(`\n📦 Starting batch email composition...`);
    console.log(`   Limit: ${limit}`);
    console.log(`   Grade: ${grade || 'all'}`);
    console.log(`   Project: ${projectId || 'global'}`);
    console.log(`   Strategy: ${strategy}`);

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Get leads (filtered by project if specified)
    const leads = await getRegularLeads({
      limit,
      grade,
      projectId
    });

    res.write(`data: ${JSON.stringify({
      type: 'start',
      total: leads.length
    })}\n\n`);

    let completed = 0;
    let failed = 0;

    for (const lead of leads) {
      try {
        // Generate email
        const result = await generateCompleteEmail(lead, {
          strategy,
          model
        });

        // Validate
        const validation = validateEmail({
          subject: result.subject,
          body: result.body
        });

        // Save
        const savedEmail = await saveComposedEmail({
          lead_id: lead.id,
          url: lead.url,
          company_name: lead.company_name,
          contact_email: lead.contact_email,
          subject: result.subject,
          body: result.body,
          strategy,
          model_used: model,
          generation_time_ms: result.generation_time,
          cost: result.cost,
          project_id: projectId || lead.project_id || null,  // Use projectId from request or lead
          status: 'pending' // All emails start as pending for review
        });

        completed++;

        res.write(`data: ${JSON.stringify({
          type: 'progress',
          completed,
          failed,
          total: leads.length,
          current: {
            company: lead.company_name || lead.url,
            email_id: savedEmail.id,
            validation_score: validation.score
          }
        })}\n\n`);

      } catch (error) {
        failed++;
        console.error(`   ❌ Failed for ${lead.url}:`, error.message);

        res.write(`data: ${JSON.stringify({
          type: 'error',
          completed,
          failed,
          total: leads.length,
          error: {
            url: lead.url,
            message: error.message
          }
        })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({
      type: 'complete',
      completed,
      failed,
      total: leads.length
    })}\n\n`);

    res.end();

  } catch (error) {
    console.error('Error in batch composition:', error);
    res.write(`data: ${JSON.stringify({
      type: 'fatal_error',
      error: error.message
    })}\n\n`);
    res.end();
  }
});

/**
 * ═══════════════════════════════════════════════════════════════════
 * EMAIL SENDING ENDPOINTS
 * ═══════════════════════════════════════════════════════════════════
 */

/**
 * POST /api/send-email - Send single email via SMTP
 * Body: { email_id, actualSend? }
 */
app.post('/api/send-email', async (req, res) => {
  try {
    const {
      email_id,
      actualSend = false
    } = req.body;

    if (!email_id) {
      return res.status(400).json({
        success: false,
        error: 'email_id is required'
      });
    }

    console.log(`\n📤 Sending email ${email_id}...`);
    console.log(`   Mode: ${actualSend ? 'LIVE' : 'DRY RUN'}`);

    // Get email with lead data
    const composedEmail = await getComposedEmailById(email_id);

    if (!composedEmail) {
      return res.status(404).json({
        success: false,
        error: `Email not found: ${email_id}`
      });
    }

    if (!composedEmail.leads || !composedEmail.leads.contact_email) {
      return res.status(400).json({
        success: false,
        error: 'Lead has no contact email'
      });
    }

    if (!actualSend) {
      // Dry run
      return res.json({
        success: true,
        dry_run: true,
        would_send_to: composedEmail.leads.contact_email,
        subject: composedEmail.email_subject,
        message: 'Dry run completed. Set actualSend=true to send.'
      });
    }

    // Send email
    const result = await sendEmail({
      to: composedEmail.leads.contact_email,
      subject: composedEmail.email_subject,
      body: composedEmail.email_body,
      trackingId: email_id
    });

    // Update status
    await updateEmailStatus(email_id, 'sent', {
      sent_at: new Date().toISOString(),
      email_message_id: result.messageId
    });

    // Mark lead as contacted
    await markLeadProcessed(composedEmail.lead_id, 'emailed');

    console.log(`   ✅ Email sent successfully`);

    res.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/send-batch - Batch send approved emails
 * Body: { email_ids?, limit?, actualSend?, delayMs? }
 */
app.post('/api/send-batch', async (req, res) => {
  try {
    const {
      email_ids = null,
      limit = 10,
      actualSend = false,
      delayMs = 2000
    } = req.body;

    console.log(`\n📨 Batch sending emails...`);
    console.log(`   Mode: ${actualSend ? 'LIVE' : 'DRY RUN'}`);

    let emails;

    if (email_ids) {
      // Send specific emails
      emails = await Promise.all(
        email_ids.map(id => getComposedEmailById(id))
      );
    } else {
      // Send ready emails
      emails = await getReadyEmails({ limit });
    }

    if (!actualSend) {
      return res.json({
        success: true,
        dry_run: true,
        would_send: emails.length,
        emails: emails.map(e => ({
          id: e.id,
          to: e.leads?.contact_email,
          subject: e.email_subject
        })),
        message: 'Dry run completed. Set actualSend=true to send.'
      });
    }

    // Prepare emails for sending
    const emailsToSend = emails
      .filter(e => e.leads && e.leads.contact_email)
      .map(e => ({
        id: e.id,
        to: e.leads.contact_email,
        subject: e.email_subject,
        body: e.email_body,
        trackingId: e.id
      }));

    // Send with rate limiting
    const results = await sendBulkEmails(emailsToSend, {
      delayBetween: delayMs,
      stopOnError: false
    });

    // Update statuses
    for (const sent of results.sent) {
      await updateEmailStatus(sent.id, 'sent', {
        sent_at: new Date().toISOString(),
        email_message_id: sent.result.messageId
      });
    }

    for (const failed of results.failed) {
      await updateEmailStatus(failed.id, 'failed', {
        error_message: failed.error
      });
    }

    res.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('Error in batch send:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * ═══════════════════════════════════════════════════════════════════
 * QUERY & UTILITY ENDPOINTS
 * ═══════════════════════════════════════════════════════════════════
 */

/**
 * GET /api/strategies - Get available email strategies
 */
app.get('/api/strategies', (req, res) => {
  try {
    const emailStrategies = listPrompts('email-strategies');
    const socialStrategies = listPrompts('social-strategies');

    res.json({
      success: true,
      email: emailStrategies,
      social: socialStrategies
    });
  } catch (error) {
    console.error('Error listing strategies:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/leads/ready - Get leads ready for outreach
 */
app.get('/api/leads/ready', async (req, res) => {
  try {
    const {
      type = 'regular', // regular or social
      limit = 50
    } = req.query;

    const leads = type === 'social'
      ? await getSocialLeads({ limit: parseInt(limit) })
      : await getRegularLeads({ limit: parseInt(limit) });

    res.json({
      success: true,
      count: leads.length,
      leads
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/emails - Get composed emails with filters
 */
app.get('/api/emails', async (req, res) => {
  try {
    const {
      status = 'pending',
      limit = 50
    } = req.query;

    const emails = await getReadyEmails({
      status,
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      count: emails.length,
      emails: emails || []
    });
  } catch (error) {
    console.error('Error fetching emails:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/sync-from-notion - Sync status changes from Notion
 * Auto-sends emails marked "Approved"
 */
app.post('/api/sync-from-notion', async (req, res) => {
  try {
    const {
      autoSend = false,
      dryRun = true
    } = req.body;

    console.log(`\n🔄 Syncing from Notion...`);
    console.log(`   Auto-send: ${autoSend}`);
    console.log(`   Dry run: ${dryRun}`);

    // Get approved pages from Notion
    const approvedPages = await getNotionPages({ status: 'approved' });

    console.log(`   Found ${approvedPages.length} approved pages in Notion`);

    const results = {
      synced: [],
      sent: [],
      failed: [],
      skipped: []
    };

    for (const page of approvedPages) {
      try {
        // Extract company name from page title
        const companyName = page.properties.Company?.rich_text?.[0]?.plain_text ||
                           page.properties.Company?.title?.[0]?.plain_text;

        if (!companyName) {
          console.log(`   ⚠️  Skipping page: No company name`);
          results.skipped.push({ page_id: page.id, reason: 'No company name' });
          continue;
        }

        console.log(`   Processing: ${companyName}`);

        // Find email in database by company name
        // Note: This is a simplified lookup - in production you'd store notion_page_id
        const emails = await getReadyEmails({ status: 'pending', limit: 100 });
        const matchingEmail = emails.find(e =>
          e.company_name === companyName ||
          e.leads?.company_name === companyName
        );

        if (!matchingEmail) {
          console.log(`   ⚠️  No matching email found for ${companyName}`);
          results.skipped.push({ company: companyName, reason: 'Email not found' });
          continue;
        }

        if (!dryRun) {
          // Update email status to approved
          await updateEmailStatus(matchingEmail.id, 'approved', {
            reviewed_at: new Date().toISOString(),
            notion_page_id: page.id,
            synced_to_notion: true,
            notion_sync_at: new Date().toISOString()
          });

          console.log(`   ✅ Synced: ${companyName} (${matchingEmail.id})`);
          results.synced.push({
            company: companyName,
            email_id: matchingEmail.id,
            notion_page_id: page.id
          });

          // Auto-send if enabled
          if (autoSend && matchingEmail.leads?.contact_email) {
            try {
              const sendResult = await sendEmail({
                to: matchingEmail.leads.contact_email,
                subject: matchingEmail.email_subject,
                body: matchingEmail.email_body,
                trackingId: matchingEmail.id
              });

              await updateEmailStatus(matchingEmail.id, 'sent', {
                sent_at: new Date().toISOString(),
                email_message_id: sendResult.messageId
              });

              await markLeadProcessed(matchingEmail.lead_id, 'emailed');

              console.log(`   📤 Sent: ${companyName} → ${matchingEmail.leads.contact_email}`);
              results.sent.push({
                company: companyName,
                email_id: matchingEmail.id,
                to: matchingEmail.leads.contact_email
              });

            } catch (sendError) {
              console.error(`   ❌ Send failed: ${companyName}`, sendError.message);
              results.failed.push({
                company: companyName,
                email_id: matchingEmail.id,
                error: sendError.message
              });
            }
          }
        } else {
          console.log(`   🔍 Dry run: Would sync ${companyName}`);
          results.synced.push({
            company: companyName,
            email_id: matchingEmail.id,
            dry_run: true
          });
        }

      } catch (error) {
        console.error(`   ❌ Error processing page:`, error.message);
        results.failed.push({
          page_id: page.id,
          error: error.message
        });
      }
    }

    console.log(`\n   ✅ Sync complete!`);
    console.log(`      Synced: ${results.synced.length}`);
    console.log(`      Sent: ${results.sent.length}`);
    console.log(`      Failed: ${results.failed.length}`);
    console.log(`      Skipped: ${results.skipped.length}`);

    res.json({
      success: true,
      dry_run: dryRun,
      results
    });

  } catch (error) {
    console.error('Error syncing from Notion:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * ═══════════════════════════════════════════════════════════════════
 * SERVER START
 * ═══════════════════════════════════════════════════════════════════
 */

app.listen(PORT, () => {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║      MAKSANT OUTREACH ENGINE v2.0 - RUNNING          ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`\n📋 Available endpoints:`);
  console.log(`   POST   /api/compose`);
  console.log(`   POST   /api/compose-social`);
  console.log(`   POST   /api/compose-batch`);
  console.log(`   POST   /api/send-email`);
  console.log(`   POST   /api/send-batch`);
  console.log(`   POST   /api/sync-from-notion`);
  console.log(`   GET    /api/strategies`);
  console.log(`   GET    /api/leads/ready`);
  console.log(`   GET    /api/emails`);
  console.log(`   GET    /api/stats`);
  console.log(`   GET    /health`);
  console.log(`\n💡 Tip: Use http://localhost:${PORT}/health to check status\n`);
});
