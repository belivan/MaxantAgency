#!/usr/bin/env node

/**
 * Prospecting Engine - API Server
 *
 * Express server providing REST API endpoints for prospecting operations.
 *
 * Endpoints:
 * - POST /api/prospect - Generate prospects from ICP brief (SSE)
 * - GET /api/prospects - List prospects with filters
 * - GET /api/health - Health check
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { runProspectingPipeline } from './orchestrator.js';
import { getProspects, getProspectById, getProspectStats } from './database/supabase-client.js';
import { logInfo, logError } from './shared/logger.js';

dotenv.config();

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
// ═══════════════════════════════════════════════════════════════════

app.post('/api/prospect', async (req, res) => {
  const { brief, options = {} } = req.body;

  // Validate request
  if (!brief) {
    return res.status(400).json({
      success: false,
      error: 'Missing "brief" in request body'
    });
  }

  if (!brief.industry && !brief.target) {
    return res.status(400).json({
      success: false,
      error: 'Brief must include "industry" or "target"'
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

    // Run pipeline
    const results = await runProspectingPipeline(brief, options, onProgress);

    // Send final results
    onProgress({
      type: 'complete',
      results,
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
      minRating: req.query.minRating ? parseFloat(req.query.minRating) : undefined,
      projectId: req.query.projectId,
      runId: req.query.runId,
      limit: req.query.limit ? parseInt(req.query.limit) : 50
    };

    // Remove undefined filters
    Object.keys(filters).forEach(key =>
      filters[key] === undefined && delete filters[key]
    );

    const prospects = await getProspects(filters);

    res.json({
      success: true,
      count: prospects.length,
      prospects,
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
// GET /api/health - Health check
// ═══════════════════════════════════════════════════════════════════

app.get('/api/health', (req, res) => {
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
      listProspects: 'GET /api/prospects',
      getProspect: 'GET /api/prospects/:id',
      stats: 'GET /api/stats',
      health: 'GET /api/health'
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
  console.log(`   Health:      http://localhost:${PORT}/api/health`);
  console.log('═══════════════════════════════════════════════════════\n');

  logInfo('Prospecting Engine started', { port: PORT });
});

export default app;
