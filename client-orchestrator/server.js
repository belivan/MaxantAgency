#!/usr/bin/env node
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { runProspector } from './index.js';
import { createLogger, requestLogger } from '../shared/logger.js';

dotenv.config();

const app = express();
const PORT = process.env.ORCHESTRATOR_PORT || 3010;
const logger = createLogger('orchestrator', {
  level: process.env.LOG_LEVEL || 'info',
  console: true,
  file: true
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(requestLogger(logger));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'client-orchestrator' });
});

// Generate prospects
app.post('/api/prospects', async (req, res) => {
  const startTime = Date.now();

  try {
    const {
      brief,
      count = 20,
      city,
      model = 'grok-4-fast',
      verify = true
    } = req.body;

    logger.info('Prospect generation started', {
      count,
      city: city || 'none',
      model,
      verify
    });

    if (!brief) {
      logger.warn('Missing brief data in request');
      return res.status(400).json({
        success: false,
        error: 'Brief data required in request body'
      });
    }

    const result = await runProspector({
      briefData: brief,
      count,
      city,
      model,
      verify,
      saveToFile: false,
      saveSupabase: true,
      supabaseStatus: 'pending_analysis',
      source: 'command-center-ui',
      logger
    });

    const duration = Date.now() - startTime;
    logger.info('Prospect generation completed', {
      companiesFound: result.companies.length,
      urlsVerified: result.urls.length,
      runId: result.runId,
      duration: `${duration}ms`
    });

    res.json({
      success: true,
      companies: result.companies,
      urls: result.urls,
      runId: result.runId
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Prospect generation failed', {
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`
    });

    res.status(500).json({
      success: false,
      error: error.message || 'Prospect generation failed'
    });
  }
});

app.listen(PORT, () => {
  logger.info('Client Orchestrator API started', {
    port: PORT,
    healthCheck: `http://localhost:${PORT}/health`,
    prospectsAPI: `http://localhost:${PORT}/api/prospects`
  });
});
