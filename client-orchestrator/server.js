#!/usr/bin/env node
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';
import { runProspector } from './index.js';
import { createLogger, requestLogger } from '../shared/logger.js';
import { createProject } from './supabase.js';

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
      verify = true,
      projectName
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

    // Create a project to track this generation run
    let project = null;
    try {
      const industryName = brief?.icp?.industry || 'prospects';
      const locationName = city || brief?.geo?.city || '';
      const timestamp = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      const autoProjectName = projectName ||
        `${locationName ? locationName + ' ' : ''}${industryName} - ${timestamp}`;

      project = await createProject({
        name: autoProjectName,
        description: `Generated ${count} prospects for ${industryName}${locationName ? ' in ' + locationName : ''}`,
        icp_data: brief
      });

      logger.info('Project created', {
        projectId: project?.id,
        projectName: autoProjectName
      });
    } catch (projectError) {
      logger.warn('Failed to create project, continuing without project tracking', {
        error: projectError.message
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
      projectId: project?.id || null,
      logger
    });

    const duration = Date.now() - startTime;
    logger.info('Prospect generation completed', {
      companiesFound: result.companies.length,
      urlsVerified: result.urls.length,
      runId: result.runId,
      projectId: project?.id,
      duration: `${duration}ms`
    });

    res.json({
      success: true,
      companies: result.companies,
      urls: result.urls,
      runId: result.runId,
      project: project ? {
        id: project.id,
        name: project.name,
        description: project.description
      } : null
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

// Analyze websites
app.post('/api/analyze', async (req, res) => {
  const startTime = Date.now();

  try {
    const { urls, options = {} } = req.body;

    if (!Array.isArray(urls) || urls.length === 0) {
      logger.warn('No URLs provided for analysis');
      return res.status(400).json({
        success: false,
        error: 'No URLs provided'
      });
    }

    logger.info('Website analysis started', {
      urlCount: urls.length,
      tier: options.tier || 'tier1',
      modules: options.modules || ['seo']
    });

    // Import analyzer dynamically (it's already in the same codebase)
    const { analyzeWebsites } = await import('../website-audit-tool/analyzer.js');
    const { markProspectStatus } = await import('./supabase.js');

    const moduleSet = new Set(options.modules || ['seo']);
    const analyzerOptions = {
      textModel: options.textModel || process.env.DEFAULT_TEXT_MODEL || 'gpt-5-mini',
      visionModel: options.visionModel || process.env.DEFAULT_VISION_MODEL || 'gpt-4o',
      depthTier: options.tier || 'tier1',
      modules: {
        basic: true,
        seo: moduleSet.has('seo'),
        visual: moduleSet.has('visual'),
        industry: moduleSet.has('industry'),
        competitor: moduleSet.has('competitor')
      },
      emailType: options.emailType || 'local',
      metadata: {
        runId: options.runId || randomUUID(),
        sourceApp: 'command-center-ui',
        campaignId: options.metadata?.campaignId || null,
        projectId: options.metadata?.projectId || null,
        clientName: options.metadata?.clientName || null
      }
    };

    const logs = [];
    const onProgress = (payload) => {
      logs.push({
        type: payload?.type,
        message: payload?.message,
        url: payload?.url
      });

      // Log progress
      if (payload?.type === 'complete') {
        logger.info('Analysis completed for URL', { url: payload.url });
      }
    };

    // Mark as queued
    if (typeof markProspectStatus === 'function') {
      await markProspectStatus(urls, 'queued');
    }

    // Run analyzer
    const results = await analyzeWebsites(urls, analyzerOptions, onProgress);

    // Mark as analyzed
    if (typeof markProspectStatus === 'function') {
      await markProspectStatus(urls, 'analyzed');
    }

    const duration = Date.now() - startTime;
    logger.info('Website analysis completed', {
      urlCount: urls.length,
      resultsCount: results.length,
      duration: `${duration}ms`
    });

    res.json({
      success: true,
      results,
      logs
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Website analysis failed', {
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`
    });

    res.status(500).json({
      success: false,
      error: error.message || 'Analysis failed'
    });
  }
});

app.listen(PORT, () => {
  logger.info('Client Orchestrator API started', {
    port: PORT,
    healthCheck: `http://localhost:${PORT}/health`,
    prospectsAPI: `http://localhost:${PORT}/api/prospects`,
    analyzeAPI: `http://localhost:${PORT}/api/analyze`
  });
});
