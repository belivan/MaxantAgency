import { getActiveCampaigns } from './database/supabase-client.js';
import { scheduleAllCampaigns, stopAllTasks } from './schedulers/index.js';
import { log } from './shared/logger.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load environment variables from root .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });

/**
 * Main Orchestrator
 * Manages the lifecycle of the pipeline orchestration system
 */
class Orchestrator {
  constructor() {
    this.isRunning = false;
    this.campaignsLoaded = 0;
  }

  /**
   * Initialize the orchestrator
   * Loads active campaigns and schedules them
   */
  async initialize() {
    try {
      log.info('Initializing Pipeline Orchestrator...');

      // Check if database credentials are configured
      const hasDatabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY;

      if (!hasDatabase) {
        log.warn('Supabase credentials not configured - running in API-only mode');
        log.warn('To enable database features, set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env');
        this.isRunning = true;
        return;
      }

      // Check if cron is enabled
      const cronEnabled = process.env.ENABLE_CRON_ON_STARTUP !== 'false';

      if (!cronEnabled) {
        log.warn('Cron scheduling disabled in environment config');
        this.isRunning = true;
        return;
      }

      // Load active campaigns from database
      const campaigns = await getActiveCampaigns();

      log.info('Active campaigns loaded from database', {
        count: campaigns.length
      });

      // Schedule all active campaigns
      if (campaigns.length > 0) {
        this.campaignsLoaded = scheduleAllCampaigns(campaigns);

        log.info('Orchestrator initialized', {
          campaignsScheduled: this.campaignsLoaded
        });
      } else {
        log.info('No active campaigns found - orchestrator ready to receive campaigns');
      }

      this.isRunning = true;

    } catch (error) {
      log.error('Failed to initialize orchestrator', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Shutdown the orchestrator gracefully
   */
  async shutdown() {
    try {
      log.info('Shutting down Pipeline Orchestrator...');

      // Stop all scheduled tasks
      const stopped = stopAllTasks();

      log.info('Orchestrator shut down successfully', {
        tasksStopped: stopped
      });

      this.isRunning = false;

    } catch (error) {
      log.error('Error during shutdown', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Reload campaigns (refresh schedules)
   */
  async reload() {
    try {
      log.info('Reloading campaigns...');

      // Stop all current tasks
      stopAllTasks();

      // Reload from database
      const campaigns = await getActiveCampaigns();
      this.campaignsLoaded = scheduleAllCampaigns(campaigns);

      log.info('Campaigns reloaded', {
        campaignsScheduled: this.campaignsLoaded
      });

    } catch (error) {
      log.error('Error reloading campaigns', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get orchestrator status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      campaignsLoaded: this.campaignsLoaded,
      service: 'pipeline-orchestrator',
      version: '1.0.0'
    };
  }
}

// Create singleton instance
const orchestrator = new Orchestrator();

// Handle process signals for graceful shutdown
process.on('SIGINT', async () => {
  log.info('Received SIGINT signal');
  await orchestrator.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  log.info('Received SIGTERM signal');
  await orchestrator.shutdown();
  process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  log.error('Uncaught exception', {
    error: error.message,
    stack: error.stack
  });
  // Don't exit - log and continue
});

process.on('unhandledRejection', (reason, promise) => {
  log.error('Unhandled promise rejection', {
    reason,
    promise
  });
  // Don't exit - log and continue
});

export default orchestrator;
