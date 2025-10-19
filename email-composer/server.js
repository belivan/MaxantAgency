/**
 * MAKSANT EMAIL COMPOSER - Main Server
 *
 * Express server providing API endpoints for email composition.
 * Pulls leads from Supabase and generates personalized emails using AI.
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import modules
import {
  getLeads,
  getLeadByUrl,
  getLeadsReadyForOutreach,
  getLeadsByGrade,
  getLeadsByIndustry,
  getLeadStats,
  updateLead,
  supabase,
} from './modules/supabase-client.js';

import {
  generateEmail,
  validateEmail,
  STRATEGIES,
} from './modules/email-generator.js';

import {
  generateOutreachMessage,
  generateOutreachVariants,
  validateOutreachMessage,
  OUTREACH_STRATEGIES,
} from './modules/social-media-generator.js';

import {
  verifyWebsite,
  quickAccessibilityCheck,
} from './modules/website-verifier.js';

import {
  generateCompleteReasoning,
} from './modules/reasoning-generator.js';

import {
  saveComposedEmail,
  saveSocialOutreach,
  getComposedEmails,
  getApprovedEmails,
  updateComposedEmailStatus,
} from './modules/composed-emails-client.js';

import {
  syncToNotion,
} from './modules/notion-sync.js';

import {
  syncFromNotion,
} from './modules/notion-to-supabase-sync.js';

import {
  getAuthUrl,
  getTokensFromCode,
  isAuthorized,
  getUserEmail,
  testEmailConfig,
  sendEmail,
  sendTestEmail,
  validateSMTPConfig,
  batchSendEmails,
} from './modules/email-sender.js';

// Setup
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ============================================================================
// API ENDPOINTS
// ============================================================================

/**
 * GET /api/stats
 * Get summary statistics for all leads in database
 */
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await getLeadStats();
    res.json({ success: true, stats });
  } catch (error) {
    console.error('L Error fetching stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/leads
 * Get leads with optional filters
 * Query params: grade, industry, hasEmail, minScore, limit
 */
app.get('/api/leads', async (req, res) => {
  try {
    const { grade, industry, hasEmail, minScore, limit } = req.query;

    const filters = {};
    if (grade) filters.grade = grade;
    if (industry) filters.industry = industry;
    if (hasEmail === 'true') filters.hasEmail = true;
    if (minScore) filters.minScore = parseInt(minScore);
    if (limit) filters.limit = parseInt(limit);

    const leads = await getLeads(filters);

    res.json({
      success: true,
      count: leads.length,
      leads,
    });
  } catch (error) {
    console.error('L Error fetching leads:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/leads/ready
 * Get leads ready for outreach (grade A/B, has email)
 */
app.get('/api/leads/ready', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const leads = await getLeadsReadyForOutreach(limit);

    res.json({
      success: true,
      count: leads.length,
      leads,
    });
  } catch (error) {
    console.error('L Error fetching leads ready for outreach:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/leads/grade/:grade
 * Get leads by grade (A, B, C, D, F)
 */
app.get('/api/leads/grade/:grade', async (req, res) => {
  try {
    const { grade } = req.params;
    const limit = parseInt(req.query.limit) || 20;

    const leads = await getLeadsByGrade(grade.toUpperCase(), limit);

    res.json({
      success: true,
      grade: grade.toUpperCase(),
      count: leads.length,
      leads,
    });
  } catch (error) {
    console.error(`L Error fetching grade ${req.params.grade} leads:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/leads/industry/:industry
 * Get leads by industry
 */
app.get('/api/leads/industry/:industry', async (req, res) => {
  try {
    const { industry } = req.params;
    const limit = parseInt(req.query.limit) || 20;

    const leads = await getLeadsByIndustry(industry, limit);

    res.json({
      success: true,
      industry,
      count: leads.length,
      leads,
    });
  } catch (error) {
    console.error(`L Error fetching ${req.params.industry} leads:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/lead/:url
 * Get a single lead by URL
 */
app.get('/api/lead/:url', async (req, res) => {
  try {
    const url = decodeURIComponent(req.params.url);
    const lead = await getLeadByUrl(url);

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found',
      });
    }

    res.json({
      success: true,
      lead,
    });
  } catch (error) {
    console.error('L Error fetching lead:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/compose
 * Compose a personalized email for a lead
 * Body: { url, strategy, generateVariants, verify, model }
 */
app.post('/api/compose', async (req, res) => {
  try {
    const {
      url,
      strategy = STRATEGIES.COMPLIMENT_SANDWICH,
      generateVariants = true,
      verify = process.env.ENABLE_REVERIFICATION === 'true',
      model = process.env.DEFAULT_EMAIL_MODEL || 'haiku', // Default to cheap model!
    } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required',
      });
    }

    console.log(`\n=� ============================================`);
    console.log(`=� COMPOSING EMAIL FOR: ${url}`);
    console.log(`=� ============================================\n`);

    // 1. Fetch lead from database
    console.log('1� Fetching lead from database...');
    const lead = await getLeadByUrl(url);

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found in database',
      });
    }

    console.log(`    Lead found: ${lead.company_name || lead.url}`);

    // Check if this lead requires social outreach instead of email
    if (lead.requires_social_outreach) {
      console.warn(`   ⚠️  This lead requires social media outreach (broken website)`);
      return res.status(400).json({
        success: false,
        error: 'This lead has a broken website and requires social media outreach (Instagram/Facebook/LinkedIn DMs), not email. Use /api/compose-social instead.',
        lead: {
          url: lead.url,
          company_name: lead.company_name,
          website_status: lead.website_status,
          requires_social_outreach: true,
          social_profiles: lead.social_profiles,
        },
        recommendation: 'Use POST /api/compose-social with platform: instagram|facebook|linkedin',
      });
    }

    // 2. Optionally verify website is still live and get fresh data
    let verificationResult = null;
    if (verify) {
      console.log('\n2� Verifying website...');
      verificationResult = await verifyWebsite(url, lead);

      if (!verificationResult.success) {
        console.warn(`   � Verification failed: ${verificationResult.error}`);
      } else {
        console.log('    Website verified');
      }
    } else {
      console.log('\n2� Skipping verification (disabled)');
    }

    // 3. Generate email
    console.log('\n3� Generating email...');
    const emailResult = await generateEmail(lead, {
      strategy,
      generateVariants,
      model,
    });

    console.log('    Email generated');

    // 4. Validate email quality
    console.log('\n4� Validating email quality...');
    let validationResults;

    if (emailResult.subjects && emailResult.bodies) {
      // Validate all variants
      validationResults = {
        subjects: emailResult.subjects.map((subject, i) => ({
          subject,
          validation: validateEmail({ subject, body: emailResult.bodies[0] }),
        })),
        bodies: emailResult.bodies.map((body, i) => ({
          body,
          validation: validateEmail({ subject: emailResult.subjects[0], body }),
        })),
      };

      console.log(`    Validated ${emailResult.subjects.length} subject variants and ${emailResult.bodies.length} body variants`);
    } else {
      validationResults = validateEmail(emailResult);
      console.log(`    Email score: ${validationResults.score}/100`);
    }

    // 5. Calculate quality score
    let qualityScore = 0;
    if (emailResult.subjects && emailResult.bodies) {
      const recSubject = emailResult.recommended?.subject || 0;
      const recBody = emailResult.recommended?.body || 0;
      qualityScore = validateEmail({
        subject: emailResult.subjects[recSubject],
        body: emailResult.bodies[recBody]
      }).score;
    } else {
      qualityScore = validationResults.score;
    }

    // 6. Generate technical reasoning
    console.log('\n5 Generating technical reasoning...');
    const email = emailResult.subjects ? {
      subject: emailResult.subjects[emailResult.recommended?.subject || 0],
      body: emailResult.bodies[emailResult.recommended?.body || 0],
    } : emailResult;

    const reasoning = await generateCompleteReasoning(lead, email, {});
    console.log('   Technical reasoning complete');

    // 7. Save to Supabase composed_emails table
    console.log('\n6 Saving to Supabase...');
    const composedEmail = await saveComposedEmail({
      lead_id: lead.id,
      url: lead.url,
      company_name: lead.company_name,
      contact_email: lead.contact_email,
      contact_name: lead.contact_name,
      contact_title: lead.contact_title,
      industry: lead.industry,

      email_subject: email.subject,
      email_body: email.body,
      email_strategy: strategy,

      has_variants: !!emailResult.subjects,
      subject_variants: emailResult.subjects || null,
      body_variants: emailResult.bodies || null,
      recommended_variant: emailResult.recommended || null,
      variant_reasoning: emailResult.reasoning || null,

      technical_reasoning: reasoning.technical_reasoning,
      business_summary: reasoning.business_summary,
      verification_checklist: reasoning.verification_checklist,
      screenshot_urls: null,

      website_verified: !!verificationResult?.success,
      verification_data: verificationResult || null,

      ai_model: process.env.DEFAULT_EMAIL_MODEL || 'claude-sonnet-4-5',
      quality_score: qualityScore,
      validation_issues: validationResults.issues || null,

      // Project tracking (from lead)
      project_id: lead.project_id || null,
      campaign_id: lead.campaign_id || null,
      client_name: lead.client_name || null,
      source_app: 'email-composer',
    });

    console.log(`   Saved to Supabase: ${composedEmail.id}`);

    // 8. Sync to Notion
    console.log('\n7 Syncing to Notion...');
    let notionPageId = null;
    try {
      notionPageId = await syncToNotion(composedEmail);
      if (notionPageId) {
        console.log(`   Synced to Notion: ${notionPageId}`);

        // Update Supabase with notion_page_id
        await supabase
          .from('composed_emails')
          .update({
            notion_page_id: notionPageId,
            synced_to_notion: true,
            notion_sync_at: new Date().toISOString(),
          })
          .eq('id', composedEmail.id);
      }
    } catch (error) {
      console.warn(`   Notion sync failed: ${error.message}`);
    }

    // 9. Return result
    console.log('\n Email composition complete!\n');

    res.json({
      success: true,
      lead: {
        url: lead.url,
        company: lead.company_name,
        industry: lead.industry,
        grade: lead.lead_grade,
      },
      email: emailResult,
      validation: validationResults,
      verification: verificationResult,
      supabase_id: composedEmail.id,
      notion_page_id: notionPageId,
      generatedAt: new Date().toISOString(),
    });


  } catch (error) {
    console.error('L Error composing email:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

/**
 * POST /api/compose-social
 * Generate social media outreach DMs and save to database
 * Body: { url, platform, strategy, model, variants }
 */
app.post('/api/compose-social', async (req, res) => {
  try {
    const {
      url,
      platform = 'linkedin', // linkedin, facebook, instagram
      strategy = OUTREACH_STRATEGIES.VALUE_FIRST, // value-first, common-ground, compliment-question, quick-win
      model = 'haiku', // 'haiku' or 'gpt-4o-mini'
      variants = null, // Number of variants for A/B testing
    } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required',
      });
    }

    console.log(`\n\n📱 ============================================`);
    console.log(`📱 GENERATING ${platform.toUpperCase()} OUTREACH DM`);
    console.log(`📱 ============================================\n`);

    // 1. Fetch lead from database
    console.log(`1️⃣ Fetching lead from database...`);
    const lead = await getLeadByUrl(url);

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: `Lead not found for URL: ${url}`,
      });
    }

    console.log(`   Lead found: ${lead.company_name}`);

    // 2. Get social profile URL from lead's social_profiles object
    const socialProfiles = lead.social_profiles || {};

    // Extract URLs from nested structure
    const socialProfileUrls = {
      linkedin: socialProfiles.linkedIn?.company || socialProfiles.linkedIn?.personal?.[0] || null,
      facebook: socialProfiles.facebook || null,
      instagram: socialProfiles.instagram?.url || null,
    };

    const social_profile_url = socialProfileUrls[platform];
    if (!social_profile_url) {
      console.log(`   ⚠️  Warning: No ${platform} URL in lead data (social_profiles.${platform})`);
    } else {
      console.log(`   ✅ ${platform} URL found: ${social_profile_url}`);
    }

    // 3. Generate outreach DM
    let result;
    let savedRecords = [];

    if (variants && variants > 1) {
      // Generate multiple variants for A/B testing
      console.log(`2️⃣ Generating ${variants} DM variants...`);

      result = await generateOutreachVariants({
        lead,
        platform,
        variants,
        model,
      });

      // Save each variant to database
      console.log(`\n3️⃣ Saving variants to database...`);
      for (const variant of result.variants) {
        const validation = validateOutreachMessage(variant);

        const savedRecord = await saveSocialOutreach({
          lead_id: lead.id,
          url: lead.url, // NOTE: it's 'url' not 'website_url'
          company_name: lead.company_name,
          contact_name: lead.contact_name,
          industry: lead.industry,

          outreach_type: platform,
          platform,
          message_body: variant.message,
          character_count: variant.character_count,
          social_profile_url,

          strategy: variant.strategy,
          ai_model: variant.model_used,
          quality_score: validation.score,

          project_id: lead.project_id,
          campaign_id: lead.campaign_id,
          client_name: lead.client_name,
        });

        savedRecords.push(savedRecord);
      }
    } else {
      // Generate single DM
      console.log(`2️⃣ Generating ${platform} DM...`);

      result = await generateOutreachMessage({
        lead,
        platform,
        strategy,
        model,
      });

      // Validate DM
      const validation = validateOutreachMessage(result);
      result.validation = validation;

      // Save to database
      console.log(`\n3️⃣ Saving DM to database...`);
      const savedRecord = await saveSocialOutreach({
        lead_id: lead.id,
        url: lead.url, // NOTE: it's 'url' not 'website_url'
        company_name: lead.company_name,
        contact_name: lead.contact_name,
        industry: lead.industry,

        outreach_type: platform,
        platform,
        message_body: result.message,
        character_count: result.character_count,
        social_profile_url,

        strategy,
        ai_model: result.model_used,
        quality_score: validation.score,

        project_id: lead.project_id,
        campaign_id: lead.campaign_id,
        client_name: lead.client_name,
      });

      savedRecords.push(savedRecord);
    }

    console.log(`\n✅ ${platform.toUpperCase()} outreach DM generated and saved!`);
    console.log(`   Database ID(s): ${savedRecords.map(r => r.id).join(', ')}`);
    console.log(`   Cost: $${(result.cost || result.total_cost || 0).toFixed(4)}`);

    // 4. Sync to Notion (optional - same as email workflow)
    if (process.env.NOTION_ENABLED === 'true') {
      console.log(`\n4️⃣ Syncing to Notion...`);
      for (const record of savedRecords) {
        await syncToNotion(record);
      }
    }

    res.json({
      success: true,
      lead: {
        url: lead.url, // NOTE: it's 'url' not 'website_url'
        company: lead.company_name,
        industry: lead.industry,
      },
      ...result,
      saved_records: savedRecords,
      generatedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Error generating social outreach:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

/**
 * POST /api/verify
 * Verify a website is still accessible
 * Body: { url, fullVerification }
 */
app.post('/api/verify', async (req, res) => {
  try {
    const { url, fullVerification = false } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required',
      });
    }

    if (fullVerification) {
      const lead = await getLeadByUrl(url);
      const result = await verifyWebsite(url, lead || {});
      res.json(result);
    } else {
      const result = await quickAccessibilityCheck(url);
      res.json(result);
    }

  } catch (error) {
    console.error('L Error verifying website:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/strategies
 * Get available email generation strategies
 */
app.get('/api/strategies', (req, res) => {
  res.json({
    success: true,
    strategies: Object.values(STRATEGIES),
    descriptions: {
      [STRATEGIES.PROBLEM_FIRST]: 'Identify problem � impact � solution (direct, helpful)',
      [STRATEGIES.ACHIEVEMENT_FOCUSED]: 'Compliment � opportunity � offer (encouraging, positive)',
      [STRATEGIES.QUESTION_BASED]: 'Question � insight � value offer (curious, collaborative)',
      [STRATEGIES.COMPLIMENT_SANDWICH]: 'Compliment � problem + fixes � encouragement (recommended)',
    },
  });
});

/**
 * GET /api/emails
 * Get composed emails with optional filters
 * Query params: status, project_id, campaign_id, client_name, limit
 */
app.get('/api/emails', async (req, res) => {
  try {
    const { status, project_id, campaign_id, client_name, limit } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (project_id) filters.project_id = project_id;
    if (campaign_id) filters.campaign_id = campaign_id;
    if (client_name) filters.client_name = client_name;
    if (limit) filters.limit = parseInt(limit);

    const emails = await getComposedEmails(filters);

    res.json({
      success: true,
      count: emails.length,
      emails,
    });
  } catch (error) {
    console.error('L Error fetching composed emails:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/emails/project/:project_id
 * Get all composed emails for a specific project
 */
app.get('/api/emails/project/:project_id', async (req, res) => {
  try {
    const { project_id } = req.params;
    const limit = parseInt(req.query.limit) || 100;

    const emails = await getComposedEmails({
      project_id,
      limit,
    });

    res.json({
      success: true,
      project_id,
      count: emails.length,
      emails,
    });
  } catch (error) {
    console.error('L Error fetching project emails:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/sync-from-notion
 * Sync status changes from Notion back to Supabase
 */
app.post('/api/sync-from-notion', async (req, res) => {
  try {
    const result = await syncFromNotion();
    res.json(result);
  } catch (error) {
    console.error('Error syncing from Notion:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// GMAIL OAUTH ENDPOINTS
// ============================================================================

/**
 * GET /api/oauth/google
 * Start Gmail OAuth flow
 */
app.get('/api/oauth/google', (req, res) => {
  try {
    const authUrl = getAuthUrl();
    res.redirect(authUrl);
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).send('Error starting OAuth flow');
  }
});

/**
 * GET /api/oauth/google/callback
 * OAuth callback endpoint
 */
app.get('/api/oauth/google/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send('Missing authorization code');
  }

  try {
    await getTokensFromCode(code);
    const email = await getUserEmail();

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Gmail OAuth Success</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
            text-align: center;
          }
          .success {
            color: #22c55e;
            font-size: 48px;
            margin-bottom: 20px;
          }
          h1 { color: #333; }
          p { color: #666; line-height: 1.6; }
          .email { color: #0066cc; font-weight: bold; }
          .close-btn {
            margin-top: 30px;
            padding: 12px 24px;
            background: #0066cc;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
          }
          .close-btn:hover { background: #0052a3; }
        </style>
      </head>
      <body>
        <div class="success">✅</div>
        <h1>Gmail OAuth Successful!</h1>
        <p>Successfully authorized Gmail for <span class="email">${email}</span></p>
        <p>You can now close this window and return to the application.</p>
        <button class="close-btn" onclick="window.close()">Close Window</button>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Gmail OAuth Error</title>
        <style>
          body {
            font-family: sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
            text-align: center;
          }
          .error { color: #ef4444; font-size: 48px; margin-bottom: 20px; }
          h1 { color: #333; }
          p { color: #666; }
        </style>
      </head>
      <body>
        <div class="error">❌</div>
        <h1>OAuth Error</h1>
        <p>${error.message}</p>
      </body>
      </html>
    `);
  }
});

/**
 * GET /api/oauth/status
 * Check Gmail OAuth status
 */
app.get('/api/oauth/status', async (req, res) => {
  try {
    const authorized = isAuthorized();

    if (authorized) {
      const email = await getUserEmail();
      res.json({
        authorized: true,
        email,
      });
    } else {
      res.json({
        authorized: false,
        authUrl: '/api/oauth/google',
      });
    }
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
});

// ============================================================================
// SMTP EMAIL SENDING
// ============================================================================

/**
 * POST /api/send-test-email
 * Send a test email to verify SMTP configuration
 */
app.post('/api/send-test-email', async (req, res) => {
  try {
    const { provider = 'gmail', actualSend = false } = req.body;

    console.log('\n🧪 API: Sending test email...');

    const result = await sendTestEmail({ provider, actualSend });

    res.json({
      success: true,
      message: actualSend ? 'Test email sent via SMTP!' : 'Test .eml file created',
      result,
    });
  } catch (error) {
    console.error('❌ Error sending test email:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      hint: error.message.includes('GMAIL_APP_PASSWORD')
        ? 'Get your Gmail App Password from https://myaccount.google.com/apppasswords'
        : null,
    });
  }
});

/**
 * POST /api/validate-smtp
 * Validate SMTP configuration
 */
app.post('/api/validate-smtp', async (req, res) => {
  try {
    const { provider = 'gmail' } = req.body;

    console.log('\n🔍 API: Validating SMTP configuration...');

    const valid = await validateSMTPConfig(provider);

    res.json({
      success: true,
      valid,
      message: 'SMTP configuration is valid!',
    });
  } catch (error) {
    console.error('❌ SMTP validation failed:', error);
    res.status(500).json({
      success: false,
      valid: false,
      error: error.message,
      hint: error.message.includes('GMAIL_APP_PASSWORD')
        ? 'Get your Gmail App Password from https://myaccount.google.com/apppasswords'
        : null,
    });
  }
});

/**
 * POST /api/send-email
 * Send a composed email via SMTP
 *
 * Body:
 * - email_id: ID of composed email to send (fetches from database)
 * - OR provide full email data: { company_name, contact_email, email_subject, email_body }
 * - provider: 'gmail' or custom SMTP config object (optional, default: 'gmail')
 * - actualSend: true/false (optional, default: false for safety)
 */
app.post('/api/send-email', async (req, res) => {
  try {
    const {
      email_id,
      email_data,
      provider = 'gmail',
      actualSend = false,
    } = req.body;

    console.log('\n📧 API: Sending email...');

    let emailToSend;

    // Fetch from database if email_id provided
    if (email_id) {
      const { data, error } = await supabase
        .from('composed_emails')
        .select('*')
        .eq('id', email_id)
        .single();

      if (error || !data) {
        throw new Error(`Email not found: ${email_id}`);
      }

      emailToSend = {
        company_name: data.company_name,
        contact_email: data.recipient_email,
        email_subject: data.email_subject,
        email_body: data.email_body,
      };
    } else if (email_data) {
      emailToSend = email_data;
    } else {
      throw new Error('Must provide either email_id or email_data');
    }

    const result = await sendEmail(emailToSend, { provider, actualSend });

    // Update database if email_id provided and actualSend was true
    if (email_id && actualSend && result.smtpSent) {
      await supabase
        .from('composed_emails')
        .update({
          status: 'sent',
          sent_at: result.sentAt,
        })
        .eq('id', email_id);

      console.log(`   ✅ Updated database: email ${email_id} marked as sent`);
    }

    res.json({
      success: true,
      message: actualSend ? 'Email sent via SMTP!' : '.eml file created',
      result,
    });
  } catch (error) {
    console.error('❌ Error sending email:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/send-batch
 * Batch send approved emails via SMTP
 *
 * Body:
 * - email_ids: Array of composed email IDs
 * - provider: 'gmail' or custom SMTP config (optional)
 * - actualSend: true/false (optional, default: false)
 * - delayMs: Delay between emails in ms (optional, default: 1000)
 */
app.post('/api/send-batch', async (req, res) => {
  try {
    const {
      email_ids,
      provider = 'gmail',
      actualSend = false,
      delayMs = 1000,
    } = req.body;

    if (!email_ids || !Array.isArray(email_ids) || email_ids.length === 0) {
      throw new Error('Must provide array of email_ids');
    }

    console.log(`\n📬 API: Batch sending ${email_ids.length} emails...`);

    // Fetch emails from database
    const { data: emails, error } = await supabase
      .from('composed_emails')
      .select('*')
      .in('id', email_ids);

    if (error || !emails || emails.length === 0) {
      throw new Error('No emails found for provided IDs');
    }

    // Convert to email format
    const emailsData = emails.map(e => ({
      id: e.id,
      company_name: e.company_name,
      contact_email: e.recipient_email,
      email_subject: e.email_subject,
      email_body: e.email_body,
    }));

    const results = await batchSendEmails(emailsData, {
      provider,
      actualSend,
      delayMs,
    });

    // Update database for successfully sent emails
    if (actualSend && results.sent.length > 0) {
      const sentIds = results.sent.map(r => {
        const email = emailsData.find(e => e.company_name === r.company_name);
        return email?.id;
      }).filter(Boolean);

      if (sentIds.length > 0) {
        await supabase
          .from('composed_emails')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
          })
          .in('id', sentIds);

        console.log(`   ✅ Updated database: ${sentIds.length} emails marked as sent`);
      }
    }

    res.json({
      success: true,
      message: `Batch complete: ${results.sent.length} sent, ${results.failed.length} failed`,
      results,
    });
  } catch (error) {
    console.error('❌ Error in batch sending:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'maksant-email-composer',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  console.log(`\n( ============================================`);
  console.log(`( MAKSANT EMAIL COMPOSER`);
  console.log(`( ============================================`);
  console.log(`=� Server running on port ${PORT}`);
  console.log(`=� Dashboard: http://localhost:${PORT}`);
  console.log(`= API Endpoints:`);
  console.log(`   - GET  /api/stats - Database statistics`);
  console.log(`   - GET  /api/leads - Get all leads (with filters)`);
  console.log(`   - GET  /api/leads/ready - Get leads ready for outreach`);
  console.log(`   - GET  /api/leads/grade/:grade - Get leads by grade`);
  console.log(`   - POST /api/compose - Compose email for a lead`);
  console.log(`   - POST /api/verify - Verify website accessibility`);
  console.log(`   - GET  /api/strategies - Get email strategies`);
  console.log(`   - POST /api/sync-from-notion - Sync status changes from Notion`);
  console.log(`   - POST /api/compose-social - Generate social media content`);
  console.log(`   - POST /api/send-test-email - Test SMTP configuration`);
  console.log(`   - POST /api/validate-smtp - Validate SMTP settings`);
  console.log(`   - POST /api/send-email - Send email via SMTP`);
  console.log(`   - POST /api/send-batch - Batch send emails via SMTP`);
  console.log(`   - GET  /api/oauth/google - Authorize Gmail (one-time setup)`);
  console.log(`   - GET  /api/oauth/status - Check Gmail authorization status`);
  console.log(`\n=� Environment:`);
  console.log(`   - Default model: ${process.env.DEFAULT_EMAIL_MODEL || 'claude-sonnet-4-5'}`);
  console.log(`   - Generate variants: ${process.env.GENERATE_VARIANTS || 'true'}`);
  console.log(`   - Reverification: ${process.env.ENABLE_REVERIFICATION || 'true'}`);
  console.log(`\n( ============================================\n`);
});
