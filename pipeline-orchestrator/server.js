import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { log } from './shared/logger.js';
import orchestrator from './orchestrator.js';
import {
  createCampaign,
  getCampaigns,
  getCampaignById,
  updateCampaign,
  deleteCampaign,
  getCampaignRuns
} from './database/supabase-client.js';
import {
  runCampaign,
  scheduleCampaign,
  unscheduleCampaign,
  rescheduleCampaign,
  getActiveTasks
} from './schedulers/index.js';

// Load environment variables from root .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 3020;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  log.info('API Request', {
    method: req.method,
    path: req.path,
    ip: req.ip
  });
  next();
});

// ============================================================================
// API ENDPOINTS
// ============================================================================

/**
 * POST /api/campaigns
 * Create a new campaign
 */
app.post('/api/campaigns', async (req, res) => {
  try {
    const campaignConfig = req.body;

    log.info('Creating new campaign', { name: campaignConfig.name });

    // Validate required fields
    if (!campaignConfig.name) {
      return res.status(400).json({
        success: false,
        error: 'Campaign name is required'
      });
    }

    if (!campaignConfig.steps || campaignConfig.steps.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one step is required'
      });
    }

    // Create campaign record
    const campaign = await createCampaign({
      name: campaignConfig.name,
      description: campaignConfig.description,
      config: campaignConfig,
      schedule_cron: campaignConfig.schedule?.cron,
      status: 'active'
    });

    // Schedule the campaign if it has a cron schedule
    if (campaignConfig.schedule?.cron && campaignConfig.schedule?.enabled) {
      try {
        scheduleCampaign(campaign);
        log.info('Campaign scheduled', { campaignId: campaign.id });
      } catch (error) {
        log.error('Failed to schedule campaign', {
          campaignId: campaign.id,
          error: error.message
        });
        // Don't fail the request, campaign is created but not scheduled
      }
    }

    res.status(201).json({
      success: true,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        schedule: campaignConfig.schedule?.cron,
        nextRun: campaign.next_run_at
      }
    });

  } catch (error) {
    log.error('Error creating campaign', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/campaigns
 * List all campaigns
 */
app.get('/api/campaigns', async (req, res) => {
  try {
    const { status, project_id } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (project_id) filters.project_id = project_id;

    const campaigns = await getCampaigns(filters);

    // Format response
    const formatted = campaigns.map(c => ({
      id: c.id,
      name: c.name,
      description: c.description,
      schedule: c.schedule_cron,
      status: c.status,
      lastRun: c.last_run_at,
      nextRun: c.next_run_at,
      totalRuns: c.total_runs,
      totalCost: parseFloat(c.total_cost || 0).toFixed(2),
      createdAt: c.created_at
    }));

    res.json({
      success: true,
      campaigns: formatted,
      count: formatted.length
    });

  } catch (error) {
    log.error('Error listing campaigns', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/campaigns/:id
 * Get single campaign details
 */
app.get('/api/campaigns/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await getCampaignById(id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    res.json({
      success: true,
      campaign
    });

  } catch (error) {
    log.error('Error getting campaign', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/campaigns/:id/run
 * Manually trigger a campaign run
 */
app.post('/api/campaigns/:id/run', async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await getCampaignById(id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    log.info('Manually triggering campaign', {
      campaignId: id,
      name: campaign.name
    });

    // Run campaign asynchronously (don't wait for completion)
    runCampaign(campaign, 'manual').catch(error => {
      log.error('Manual campaign run failed', {
        campaignId: id,
        error: error.message
      });
    });

    res.json({
      success: true,
      message: 'Campaign started',
      campaignId: id
    });

  } catch (error) {
    log.error('Error triggering campaign', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/campaigns/:id/runs
 * Get campaign run history
 */
app.get('/api/campaigns/:id/runs', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50 } = req.query;

    const runs = await getCampaignRuns(id, parseInt(limit));

    // Format response
    const formatted = runs.map(r => ({
      id: r.id,
      startedAt: r.started_at,
      completedAt: r.completed_at,
      status: r.status,
      stepsCompleted: r.steps_completed,
      stepsFailed: r.steps_failed,
      totalCost: parseFloat(r.total_cost || 0).toFixed(2),
      triggerType: r.trigger_type,
      errors: r.errors,
      results: r.results
    }));

    res.json({
      success: true,
      runs: formatted,
      count: formatted.length
    });

  } catch (error) {
    log.error('Error getting campaign runs', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/campaigns/:id/pause
 * Pause a campaign
 */
app.put('/api/campaigns/:id/pause', async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await getCampaignById(id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    // Update status to paused
    await updateCampaign(id, { status: 'paused' });

    // Unschedule the campaign
    unscheduleCampaign(id);

    log.info('Campaign paused', { campaignId: id, name: campaign.name });

    res.json({
      success: true,
      status: 'paused'
    });

  } catch (error) {
    log.error('Error pausing campaign', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/campaigns/:id/resume
 * Resume a paused campaign
 */
app.put('/api/campaigns/:id/resume', async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await getCampaignById(id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    // Update status to active
    const updated = await updateCampaign(id, { status: 'active' });

    // Reschedule the campaign
    if (updated.config.schedule?.cron && updated.config.schedule?.enabled) {
      scheduleCampaign(updated);
    }

    log.info('Campaign resumed', { campaignId: id, name: campaign.name });

    res.json({
      success: true,
      status: 'active'
    });

  } catch (error) {
    log.error('Error resuming campaign', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/campaigns/:id
 * Delete a campaign
 */
app.delete('/api/campaigns/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await getCampaignById(id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    // Unschedule first
    unscheduleCampaign(id);

    // Delete from database (cascade will delete runs too)
    await deleteCampaign(id);

    log.info('Campaign deleted', { campaignId: id, name: campaign.name });

    res.json({
      success: true,
      message: 'Campaign deleted'
    });

  } catch (error) {
    log.error('Error deleting campaign', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  const status = orchestrator.getStatus();
  const activeTasks = getActiveTasks();

  res.json({
    status: 'healthy',
    service: 'pipeline-orchestrator',
    version: '1.0.0',
    orchestrator: status,
    activeCampaigns: activeTasks.size,
    scheduledRuns: activeTasks.size,
    uptime: process.uptime()
  });
});

/**
 * GET /api/stats
 * Get system statistics
 */
app.get('/api/stats', async (req, res) => {
  try {
    const allCampaigns = await getCampaigns();
    const activeTasks = getActiveTasks();

    const stats = {
      totalCampaigns: allCampaigns.length,
      activeCampaigns: allCampaigns.filter(c => c.status === 'active').length,
      pausedCampaigns: allCampaigns.filter(c => c.status === 'paused').length,
      scheduledCampaigns: activeTasks.size,
      totalRuns: allCampaigns.reduce((sum, c) => sum + (c.total_runs || 0), 0),
      totalCost: allCampaigns.reduce((sum, c) => sum + parseFloat(c.total_cost || 0), 0).toFixed(2)
    };

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    log.error('Error getting stats', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  log.error('Unhandled error', {
    error: err.message,
    stack: err.stack
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

async function startServer() {
  try {
    // Initialize orchestrator
    await orchestrator.initialize();

    // Start Express server
    app.listen(PORT, () => {
      log.info('Pipeline Orchestrator API started', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development'
      });

      console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║           PIPELINE ORCHESTRATOR - Agent 6                    ║
║                                                               ║
║   Status: ONLINE                                             ║
║   Port:   ${PORT}                                            ║
║   Health: http://localhost:${PORT}/api/health                ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
      `);
    });

  } catch (error) {
    log.error('Failed to start server', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

// Start the server
startServer();
