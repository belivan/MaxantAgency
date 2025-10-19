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
} from './modules/supabase-client.js';

import {
  generateEmail,
  validateEmail,
  STRATEGIES,
} from './modules/email-generator.js';

import {
  verifyWebsite,
  quickAccessibilityCheck,
} from './modules/website-verifier.js';

import {
  generateCompleteReasoning,
} from './modules/reasoning-generator.js';

import {
  saveComposedEmail,
  getComposedEmails,
  getApprovedEmails,
  updateComposedEmailStatus,
} from './modules/composed-emails-client.js';

import {
  syncToNotion,
} from './modules/notion-sync.js';

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
 * Body: { url, strategy, generateVariants, verify }
 */
app.post('/api/compose', async (req, res) => {
  try {
    const {
      url,
      strategy = STRATEGIES.COMPLIMENT_SANDWICH,
      generateVariants = true,
      verify = process.env.ENABLE_REVERIFICATION === 'true',
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

    // 5. Return result
    console.log(`\n Email composition complete!\n`);

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
  console.log(`\n=� Environment:`);
  console.log(`   - Default model: ${process.env.DEFAULT_EMAIL_MODEL || 'claude-sonnet-4-5'}`);
  console.log(`   - Generate variants: ${process.env.GENERATE_VARIANTS || 'true'}`);
  console.log(`   - Reverification: ${process.env.ENABLE_REVERIFICATION || 'true'}`);
  console.log(`\n( ============================================\n`);
});
