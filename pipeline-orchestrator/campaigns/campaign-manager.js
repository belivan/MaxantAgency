/**
 * Campaign Manager
 * High-level orchestration for managing campaign lifecycle
 */

import { runCampaign } from '../schedulers/campaign-runner.js';
import { scheduleCampaign, unscheduleCampaign } from '../schedulers/cron-scheduler.js';
import { getCampaignById, updateCampaign } from '../database/supabase-client.js';
import { isBudgetExceeded } from '../budget/budget-enforcer.js';
import { log } from '../shared/logger.js';

/**
 * Execute a campaign with full error handling
 *
 * @param {string} campaignId - Campaign ID
 * @param {string} triggerType - 'manual' or 'scheduled'
 * @returns {Promise<Object>} Execution results
 */
export async function executeCampaign(campaignId, triggerType = 'manual') {
  try {
    const campaign = await getCampaignById(campaignId);

    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    if (campaign.status !== 'active') {
      throw new Error(`Campaign is ${campaign.status}, cannot execute`);
    }

    log.info('Executing campaign', { campaignId, name: campaign.name, triggerType });

    // Check budget before execution
    const budgetCheck = await isBudgetExceeded(campaignId, campaign.config.budget);
    if (budgetCheck.exceeded) {
      await pauseCampaign(campaignId, `Budget exceeded: ${budgetCheck.reason}`);
      throw new Error(`Campaign paused: ${budgetCheck.reason}`);
    }

    // Execute the campaign
    const results = await runCampaign(campaign, triggerType);

    log.info('Campaign executed successfully', {
      campaignId,
      runId: results.runId,
      cost: results.total_cost
    });

    return results;

  } catch (error) {
    log.error('Campaign execution failed', { campaignId, error: error.message });
    throw error;
  }
}

/**
 * Pause a campaign
 *
 * @param {string} campaignId - Campaign ID
 * @param {string} reason - Reason for pausing
 * @returns {Promise<Object>} Updated campaign
 */
export async function pauseCampaign(campaignId, reason = 'Manual pause') {
  try {
    log.info('Pausing campaign', { campaignId, reason });

    const campaign = await updateCampaign(campaignId, { status: 'paused' });
    unscheduleCampaign(campaignId);

    log.info('Campaign paused', { campaignId });
    return campaign;

  } catch (error) {
    log.error('Failed to pause campaign', { campaignId, error: error.message });
    throw error;
  }
}

/**
 * Resume a paused campaign
 *
 * @param {string} campaignId - Campaign ID
 * @returns {Promise<Object>} Updated campaign
 */
export async function resumeCampaign(campaignId) {
  try {
    log.info('Resuming campaign', { campaignId });

    const campaign = await updateCampaign(campaignId, { status: 'active' });

    if (campaign.config.schedule?.cron && campaign.config.schedule?.enabled) {
      scheduleCampaign(campaign);
    }

    log.info('Campaign resumed', { campaignId });
    return campaign;

  } catch (error) {
    log.error('Failed to resume campaign', { campaignId, error: error.message });
    throw error;
  }
}

export default { executeCampaign, pauseCampaign, resumeCampaign };
