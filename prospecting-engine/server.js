#!/usr/bin/env node

/**
 * Prospecting Engine - API Server
 *
 * Express server providing REST API endpoints for prospecting operations.
 *
 * Endpoints:
 * - POST /api/prospect - Generate prospects from ICP brief (SSE)
 * - GET /api/prospects - List prospects with filters
 * - GET /health - Health check
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { existsSync } from 'fs';
import { runProspectingPipeline, lookupSingleBusiness } from './orchestrator.js';
import { getProspects, getProspectById, getProspectStats, deleteProspect, deleteProspects } from './database/supabase-client.js';
import { loadAllProspectingPrompts } from './shared/prompt-loader.js';
import { logInfo, logError } from './shared/logger.js';

// Load env from root .env (centralized configuration)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootEnv = resolve(__dirname, '../.env');

if (existsSync(rootEnv)) {
  dotenv.config({ path: rootEnv });
} else {
  dotenv.config(); // Fallback to local .env if root doesn't exist
}

const app = express();
const PORT = process.env.PORT || 3010;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  logInfo('HTTP Request', {
    method: req.method,
    path: req.path,
    ip: req.ip
  });
  next();
});

// ═══════════════════════════════════════════════════════════════════
// POST /api/prospect - Generate prospects
//
// Request body:
//   brief: { industry, city, target, count }
//   options: {
//     model: 'gpt-4o' | 'gpt-5' | 'grok-4-fast' | 'claude-sonnet-4-5' | 'claude-haiku-4-5' (optional) - for text-based AI
//     visionModel: 'gpt-4o' | 'claude-sonnet-4-5' | 'claude-haiku-4-5' (optional) - for vision-based extraction
//     projectId: string (optional)
//     minRating: number (optional)
//     checkRelevance: boolean (optional, default: true)
//     filterIrrelevant: boolean (optional, default: false)
//
//     // Iterative Discovery Options (requires projectId)
//     useIterativeDiscovery: boolean (optional, default: false) - Enable intelligent multi-query discovery
//     maxIterations: number (optional, default: 5) - Maximum discovery iterations
//     maxVariationsPerIteration: number (optional, default: 7) - Query variations per iteration
//   }
// ═══════════════════════════════════════════════════════════════════

app.post('/api/prospect', async (req, res) => {
  const { brief, options = {}, custom_prompts, model_selections } = req.body;

  // Validate request
  if (!brief) {
    return res.status(400).json({
      success: false,
      error: 'Missing "brief" in request body'
    });
  }

  // Normalize brief format to handle both simple and comprehensive ICP brief formats
  // Simple format: { industry: "...", target: "...", city: "..." }
  // Comprehensive format: { industries: [...], target_description: "...", location: {...} }
  let normalizedBrief = { ...brief };

  if (!brief.industry && brief.industries) {
    // Convert industries array to single industry string
    normalizedBrief.industry = Array.isArray(brief.industries)
      ? brief.industries.join(', ')
      : brief.industries;
  }

  if (!brief.target && brief.target_description) {
    normalizedBrief.target = brief.target_description;
  }

  if (!brief.city && brief.location) {
    // Extract city from location object
    normalizedBrief.city = brief.location.hq_city || brief.location.metro || '';
  }

  // Validate normalized brief
  if (!normalizedBrief.industry && !normalizedBrief.target) {
    return res.status(400).json({
      success: false,
      error: 'Brief must include "industry"/"industries" or "target"/"target_description"'
    });
  }

  try {
    // Set up Server-Sent Events (SSE)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Progress callback for SSE
    const onProgress = (event) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    // Send start event
    onProgress({
      type: 'started',
      timestamp: new Date().toISOString()
    });

    // Log if custom configuration is provided
    if (custom_prompts) {
      logInfo('Using custom prompts for prospecting', {
        promptKeys: Object.keys(custom_prompts)
      });
    }
    if (model_selections) {
      logInfo('Using custom model selections for prospecting', {
        models: model_selections
      });
    }

    // Run pipeline with custom prompts and normalized brief
    const results = await runProspectingPipeline(normalizedBrief, {
      ...options,
      customPrompts: custom_prompts
    }, onProgress);

    // Save prompts and model selections to project (first generation only)
    // This preserves what AI configuration was used for historical tracking
    if (options.projectId && (custom_prompts || model_selections)) {
      try {
        const { saveProspectingConfig } = await import('./database/supabase-client.js');
        await saveProspectingConfig(options.projectId, custom_prompts, model_selections);
        logInfo('Saved prospecting config to project', {
          projectId: options.projectId,
          hasPrompts: !!custom_prompts,
          hasModels: !!model_selections
        });
      } catch (saveError) {
        logError('Failed to save prospecting config', saveError, {
          projectId: options.projectId
        });
        // Don't fail the request if config save fails
      }
    }

    // Send final results
    onProgress({
      type: 'complete',
      data: results,
      timestamp: new Date().toISOString()
    });

    // Close SSE connection
    res.end();

  } catch (error) {
    logError('POST /api/prospect failed', error);

    // Send error event
    res.write(`data: ${JSON.stringify({
      type: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    })}\n\n`);

    res.end();
  }
});

// ═══════════════════════════════════════════════════════════════════
// GET /api/prospects - List prospects
// ═══════════════════════════════════════════════════════════════════

app.get('/api/prospects', async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      city: req.query.city,
      industry: req.query.industry,
      minRating: req.query.min_rating ? parseFloat(req.query.min_rating) : undefined,
      projectId: req.query.project_id || req.query.projectId, // Support both formats
      runId: req.query.runId,
      limit: req.query.limit ? parseInt(req.query.limit) : 50,
      offset: req.query.offset ? parseInt(req.query.offset) : 0
    };

    // Remove undefined filters
    Object.keys(filters).forEach(key =>
      filters[key] === undefined && delete filters[key]
    );

    const result = await getProspects(filters);

    res.json({
      success: true,
      count: result.data.length,
      total: result.total,
      prospects: result.data,
      filters
    });

  } catch (error) {
    logError('GET /api/prospects failed', error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════
// GET /api/prospects/:id - Get prospect by ID
// ═══════════════════════════════════════════════════════════════════

app.get('/api/prospects/:id', async (req, res) => {
  try {
    const prospect = await getProspectById(req.params.id);

    if (!prospect) {
      return res.status(404).json({
        success: false,
        error: 'Prospect not found'
      });
    }

    res.json({
      success: true,
      prospect
    });

  } catch (error) {
    logError('GET /api/prospects/:id failed', error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════
// DELETE /api/prospects/:id - Delete a prospect
// ═══════════════════════════════════════════════════════════════════

app.delete('/api/prospects/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await deleteProspect(id);

    res.json({
      success: true,
      message: 'Prospect deleted successfully'
    });

  } catch (error) {
    logError('DELETE /api/prospects/:id failed', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════
// POST /api/prospects/batch-delete - Delete multiple prospects
// ═══════════════════════════════════════════════════════════════════

app.post('/api/prospects/batch-delete', async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'An array of prospect IDs is required'
      });
    }

    console.log(`[Batch Delete] Deleting ${ids.length} prospects`);

    const deletedCount = await deleteProspects(ids);

    res.json({
      success: true,
      deleted: deletedCount,
      failed: 0,
      message: `${deletedCount} prospect(s) deleted successfully`
    });

  } catch (error) {
    logError('POST /api/prospects/batch-delete failed', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════
// GET /api/stats - Get prospect statistics
// ═══════════════════════════════════════════════════════════════════

app.get('/api/stats', async (req, res) => {
  try {
    const filters = {
      city: req.query.city,
      projectId: req.query.projectId
    };

    Object.keys(filters).forEach(key =>
      filters[key] === undefined && delete filters[key]
    );

    const stats = await getProspectStats(filters);

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    logError('GET /api/stats failed', error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════
// GET /api/prompts/default - Get default prospecting prompts
// ═══════════════════════════════════════════════════════════════════

app.get('/api/prompts/default', async (req, res) => {
  try {
    const prompts = loadAllProspectingPrompts();

    res.json({
      success: true,
      data: prompts
    });
  } catch (error) {
    logError('Failed to load default prompts', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to load default prompts'
    });
  }
});

// ═══════════════════════════════════════════════════════════════════
// POST /api/lookup-business - Look up a single business without ICP
//
// Request body:
//   query: string (business name, website URL, or Google Place ID)
//   options: {
//     projectId: string (optional)
//     scrapeWebsite: boolean (optional, default: true)
//     findSocial: boolean (optional, default: true)
//     scrapeSocial: boolean (optional, default: false for speed)
//     fullPageScreenshots: boolean (optional, default: false for speed)
//     visionModel: string (optional)
//   }
// ═══════════════════════════════════════════════════════════════════

app.post('/api/lookup-business', async (req, res) => {
  const { query, options = {} } = req.body;

  // Validate request
  if (!query) {
    return res.status(400).json({
      success: false,
      error: 'Missing "query" in request body. Provide a business name, website URL, or Google Place ID.'
    });
  }

  try {
    logInfo('Looking up single business', {
      query,
      projectId: options.projectId || 'none'
    });

    const result = await lookupSingleBusiness(query, options);

    res.json(result);

  } catch (error) {
    logError('POST /api/lookup-business failed', error);

    // Check if it's a "not found" error
    if (error.message === 'Business not found in Google Maps') {
      return res.status(404).json({
        success: false,
        error: error.message,
        query
      });
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════
// GET /health - Health check
// ═══════════════════════════════════════════════════════════════════

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'prospecting-engine',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

// ═══════════════════════════════════════════════════════════════════
// Root endpoint
// ═══════════════════════════════════════════════════════════════════

app.get('/', (req, res) => {
  res.json({
    name: 'Prospecting Engine',
    version: '2.0.0',
    description: 'Universal company discovery and enrichment system',
    endpoints: {
      prospect: 'POST /api/prospect',
      lookupBusiness: 'POST /api/lookup-business',
      listProspects: 'GET /api/prospects',
      getProspect: 'GET /api/prospects/:id',
      stats: 'GET /api/stats',
      health: 'GET /health'
    },
    documentation: 'See README.md for full API documentation'
  });
});

// ═══════════════════════════════════════════════════════════════════
// Error handling
// ═══════════════════════════════════════════════════════════════════

app.use((err, req, res, next) => {
  logError('Unhandled error', err);

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// ═══════════════════════════════════════════════════════════════════
// Start server
// ═══════════════════════════════════════════════════════════════════

app.listen(PORT, () => {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('   PROSPECTING ENGINE v2.0 - Server Running');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`   Port:        ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Health:      http://localhost:${PORT}/health`);
  console.log('═══════════════════════════════════════════════════════\n');

  logInfo('Prospecting Engine started', { port: PORT });
});

export default app;
