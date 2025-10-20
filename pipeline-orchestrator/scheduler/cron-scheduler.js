import cron from 'node-cron';
import { runCampaign } from './campaign-runner.js';
import { log } from '../shared/logger.js';
import { updateCampaign } from '../database/supabase-client.js';
import {
  sendCampaignCompletionNotification,
  sendCampaignFailureNotification
} from '../shared/notifier.js';

// Store active cron tasks
const activeTasks = new Map();

/**
 * Schedule a campaign to run on cron schedule
 *
 * @param {Object} campaign - Campaign object with schedule
 * @returns {Object} Scheduled task
 */
export function scheduleCampaign(campaign) {
  const { id, name, config } = campaign;
  const schedule = config.schedule;

  if (!schedule || !schedule.cron) {
    log.warn('Campaign has no schedule, skipping', { campaign: name });
    return null;
  }

  if (!schedule.enabled) {
    log.info('Campaign schedule disabled, skipping', { campaign: name });
    return null;
  }

  // Validate cron expression
  if (!cron.validate(schedule.cron)) {
    log.error('Invalid cron expression', {
      campaign: name,
      cron: schedule.cron
    });
    throw new Error(`Invalid cron expression: ${schedule.cron}`);
  }

  // Stop existing task if any
  if (activeTasks.has(id)) {
    log.info('Stopping existing scheduled task', { campaign: name });
    activeTasks.get(id).stop();
    activeTasks.delete(id);
  }

  // Create the scheduled task
  const task = cron.schedule(
    schedule.cron,
    async () => {
      log.info('Campaign triggered by schedule', {
        campaign: name,
        cron: schedule.cron
      });

      try {
        const result = await runCampaign(campaign, 'scheduled');

        log.info('Scheduled campaign completed', {
          campaign: name,
          runId: result.runId,
          status: result.status,
          cost: result.total_cost
        });

        // Send success notification
        await sendCampaignCompletionNotification(campaign, result);

      } catch (error) {
        log.error('Scheduled campaign failed', {
          campaign: name,
          error: error.message,
          stack: error.stack
        });

        // Check if it's a budget error
        if (error.budgetExceeded) {
          log.warn('Campaign paused due to budget', { campaign: name });
          // Campaign is already paused by campaign-runner
        }

        // Send failure notification
        await sendCampaignFailureNotification(campaign, error);
      }
    },
    {
      scheduled: true,
      timezone: schedule.timezone || 'America/New_York'
    }
  );

  // Store the task
  activeTasks.set(id, task);

  log.info('Campaign scheduled', {
    campaign: name,
    cron: schedule.cron,
    timezone: schedule.timezone || 'America/New_York'
  });

  return task;
}

/**
 * Unschedule a campaign
 *
 * @param {string} campaignId - Campaign ID
 * @returns {boolean} True if unscheduled successfully
 */
export function unscheduleCampaign(campaignId) {
  if (activeTasks.has(campaignId)) {
    const task = activeTasks.get(campaignId);
    task.stop();
    activeTasks.delete(campaignId);

    log.info('Campaign unscheduled', { campaignId });
    return true;
  }

  return false;
}

/**
 * Reschedule a campaign (updates existing schedule)
 *
 * @param {Object} campaign - Updated campaign object
 * @returns {Object} New scheduled task
 */
export function rescheduleCampaign(campaign) {
  log.info('Rescheduling campaign', { campaign: campaign.name });

  // Unschedule existing
  unscheduleCampaign(campaign.id);

  // Schedule with new config
  return scheduleCampaign(campaign);
}

/**
 * Get all active scheduled tasks
 *
 * @returns {Map} Map of campaign IDs to cron tasks
 */
export function getActiveTasks() {
  return activeTasks;
}

/**
 * Stop all scheduled tasks
 *
 * @returns {number} Number of tasks stopped
 */
export function stopAllTasks() {
  log.info('Stopping all scheduled tasks', { count: activeTasks.size });

  let stopped = 0;
  for (const [campaignId, task] of activeTasks.entries()) {
    task.stop();
    stopped++;
  }

  activeTasks.clear();

  log.info('All scheduled tasks stopped', { stopped });
  return stopped;
}

/**
 * Load and schedule all active campaigns from database
 *
 * @param {Array<Object>} campaigns - Array of campaign objects
 * @returns {number} Number of campaigns scheduled
 */
export function scheduleAllCampaigns(campaigns) {
  log.info('Scheduling all campaigns', { count: campaigns.length });

  let scheduled = 0;

  for (const campaign of campaigns) {
    try {
      if (campaign.status === 'active' && campaign.config.schedule) {
        scheduleCampaign(campaign);
        scheduled++;
      }
    } catch (error) {
      log.error('Error scheduling campaign', {
        campaign: campaign.name,
        error: error.message
      });
    }
  }

  log.info('Campaigns scheduled', { scheduled, total: campaigns.length });
  return scheduled;
}

/**
 * Calculate next run time for a cron expression
 *
 * @param {string} cronExpression - Cron expression
 * @param {string} timezone - Timezone (default: America/New_York)
 * @returns {Date|null} Next run date or null if invalid
 */
export function getNextRunTime(cronExpression, timezone = 'America/New_York') {
  try {
    if (!cron.validate(cronExpression)) {
      return null;
    }

    // This is a simplified version - in production you'd use a library like cron-parser
    // For now, we'll return null and let the database handle it
    return null;

  } catch (error) {
    log.error('Error calculating next run time', {
      cron: cronExpression,
      error: error.message
    });
    return null;
  }
}

export default {
  scheduleCampaign,
  unscheduleCampaign,
  rescheduleCampaign,
  getActiveTasks,
  stopAllTasks,
  scheduleAllCampaigns,
  getNextRunTime
};
