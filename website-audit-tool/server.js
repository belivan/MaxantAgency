import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { analyzeWebsites, analyzeProspectsFromSupabase } from './analyzer.js';
import { generateAuthUrl, getTokenFromCode } from './modules/drafts-gmail.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Maksant Website Audit Tool API' });
});

// Main analysis endpoint with Server-Sent Events for real-time progress
app.post('/api/analyze', async (req, res) => {
  try {
    const { urls, textModel, visionModel, depthTier, modules, emailType, metadata } = req.body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({
        error: 'Please provide an array of URLs to analyze'
      });
    }

    if (urls.length > 10) {
      return res.status(400).json({
        error: 'Maximum 10 URLs per batch'
      });
    }

    // Set up Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    console.log(`Analyzing ${urls.length} website(s)...`);

    // Progress callback function
    const sendProgress = (progressData) => {
      res.write(`data: ${JSON.stringify(progressData)}\n\n`);
    };

    try {
      // Send initial progress
      sendProgress({
        type: 'start',
        totalSites: urls.length,
        timestamp: Date.now()
      });

      // Run analysis with progress updates
      const options = {
        textModel: textModel || 'gpt-5-mini',
        visionModel: visionModel || 'gpt-4o',
        depthTier: depthTier || 'tier1',
        modules: modules || { basic: true },
        emailType: emailType || 'local',
        metadata: metadata || null  // Multi-tenant tracking (projectId, campaignId, clientName, sourceApp)
      };

      // Env-driven defaults (can be overridden by request body)
      options.saveToDrafts = (req.body.saveToDrafts !== undefined)
        ? req.body.saveToDrafts
        : (process.env.SAVE_TO_DRAFTS === 'true');

      options.dryRun = (req.body.dryRun !== undefined)
        ? req.body.dryRun
        : (process.env.DRY_RUN === 'true');

      const results = await analyzeWebsites(urls, options, sendProgress);

      // Send final results
      sendProgress({
        type: 'complete',
        success: true,
        count: results.length,
        results,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('Analysis error:', error);

      // Send error via SSE
      sendProgress({
        type: 'error',
        error: error.message,
        timestamp: Date.now()
      });
    }

    res.end();

  } catch (error) {
    console.error('Server error:', error);

    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to start analysis',
        message: error.message
      });
    }
  }
});

// Gmail OAuth: return URL for user to visit and consent
app.get('/api/oauth/google', (req, res) => {
  try {
    const url = generateAuthUrl();
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// OAuth callback: exchange code for tokens
app.get('/api/oauth/google/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send('Missing code');

  try {
    const tokens = await getTokenFromCode(code);
    res.json({ success: true, tokens });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Drafts status endpoint - reports whether Gmail credentials are present
app.get('/api/drafts/status', (req, res) => {
  const fs = require('fs');
  const credsExists = fs.existsSync('./.credentials.json');
  const hasRefresh = !!process.env.GMAIL_REFRESH_TOKEN;
  res.json({ connected: credsExists || hasRefresh, credsExists, hasRefresh });
});

// ═══════════════════════════════════════════════════════════════
// PROSPECT-DRIVEN ANALYSIS ENDPOINT
// ═══════════════════════════════════════════════════════════════

/**
 * Analyze prospects from Supabase with social media enrichment
 * POST /api/analyze-prospects
 *
 * Body parameters:
 * - limit (number): Max prospects to fetch (default: 10)
 * - industry (string): Filter by industry (optional)
 * - city (string): Filter by city (optional)
 * - runId (string): Filter by run_id (optional)
 * - enrichSocial (boolean): Scrape social media (default: true)
 * - analyzeSocial (boolean): AI analysis of social presence (default: true)
 * - textModel (string): AI model for analysis (default: 'grok-4-fast')
 * - depthTier (string): Analysis depth tier1/tier2/tier3 (default: 'tier1')
 */
app.post('/api/analyze-prospects', async (req, res) => {
  try {
    const {
      limit = 10,
      industry = null,
      city = null,
      runId = null,
      enrichSocial = true,
      analyzeSocial = true,
      textModel = 'grok-4-fast',
      depthTier = 'tier1'
    } = req.body;

    // Validate limit
    if (limit > 50) {
      return res.status(400).json({
        error: 'Maximum 50 prospects per batch'
      });
    }

    // Set up Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    console.log(`📥 Analyzing up to ${limit} prospects from Supabase...`);

    // Progress callback
    const sendProgress = (progressData) => {
      res.write(`data: ${JSON.stringify(progressData)}\n\n`);
    };

    try {
      // Send initial progress
      sendProgress({
        type: 'start',
        limit,
        filters: { industry, city, runId },
        timestamp: Date.now()
      });

      // Run prospect analysis
      const result = await analyzeProspectsFromSupabase({
        limit,
        industry,
        city,
        runId,
        enrichSocial,
        analyzeSocial,
        textModel,
        depthTier,
        modules: {
          basic: true,
          industry: true,
          seo: false, // Skip SEO for speed
          visual: false, // Skip visual for speed
          competitor: false // Skip competitor for speed
        }
      }, sendProgress);

      // Send final results
      sendProgress({
        type: 'complete',
        success: true,
        prospectsFound: result.prospectsFound,
        analyzed: result.analyzed,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('Prospect analysis error:', error);

      // Send error via SSE
      sendProgress({
        type: 'error',
        error: error.message,
        timestamp: Date.now()
      });
    }

    res.end();

  } catch (error) {
    console.error('Server error:', error);

    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to start prospect analysis',
        message: error.message
      });
    }
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Maksant Website Audit Tool running on http://localhost:${PORT}`);
  console.log(`📊 API endpoint: http://localhost:${PORT}/api/analyze`);
});
