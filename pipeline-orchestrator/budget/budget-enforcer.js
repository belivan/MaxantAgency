import { getCurrentSpending } from './cost-tracker.js';
import { log } from '../shared/logger.js';

/**
 * Check if budget limits are exceeded for a campaign
 *
 * @param {string} campaignId - Campaign ID
 * @param {Object} budgetConfig - Budget configuration from campaign
 * @param {number} budgetConfig.daily - Daily budget limit
 * @param {number} budgetConfig.weekly - Weekly budget limit
 * @param {number} budgetConfig.monthly - Monthly budget limit
 * @param {number} budgetConfig.perLead - Max cost per lead
 * @returns {Promise<Object>} { exceeded: boolean, reason: string, period: string }
 */
export async function isBudgetExceeded(campaignId, budgetConfig = {}) {
  if (!budgetConfig || Object.keys(budgetConfig).length === 0) {
    // No budget limits set - allow execution
    return { exceeded: false, reason: null, period: null };
  }

  try {
    const spending = await getCurrentSpending(campaignId);

    // Check daily budget
    if (budgetConfig.daily && spending.daily >= budgetConfig.daily) {
      log.budgetExceeded({ id: campaignId }, 'daily', spending.daily, budgetConfig.daily);

      return {
        exceeded: true,
        reason: `Daily budget exceeded: $${spending.daily} / $${budgetConfig.daily}`,
        period: 'daily',
        spent: spending.daily,
        limit: budgetConfig.daily
      };
    }

    // Check weekly budget
    if (budgetConfig.weekly && spending.weekly >= budgetConfig.weekly) {
      log.budgetExceeded({ id: campaignId }, 'weekly', spending.weekly, budgetConfig.weekly);

      return {
        exceeded: true,
        reason: `Weekly budget exceeded: $${spending.weekly} / $${budgetConfig.weekly}`,
        period: 'weekly',
        spent: spending.weekly,
        limit: budgetConfig.weekly
      };
    }

    // Check monthly budget
    if (budgetConfig.monthly && spending.monthly >= budgetConfig.monthly) {
      log.budgetExceeded({ id: campaignId }, 'monthly', spending.monthly, budgetConfig.monthly);

      return {
        exceeded: true,
        reason: `Monthly budget exceeded: $${spending.monthly} / $${budgetConfig.monthly}`,
        period: 'monthly',
        spent: spending.monthly,
        limit: budgetConfig.monthly
      };
    }

    // Budget OK
    log.budgetCheck(
      { id: campaignId },
      spending,
      {
        daily: budgetConfig.daily,
        weekly: budgetConfig.weekly,
        monthly: budgetConfig.monthly
      }
    );

    return { exceeded: false, reason: null, period: null };

  } catch (error) {
    log.error('Error checking budget', {
      campaignId,
      error: error.message
    });

    // On error, allow execution (fail open)
    // Alternatively, you could fail closed by returning exceeded: true
    return { exceeded: false, reason: 'Error checking budget', period: null };
  }
}

/**
 * Check if a single step would exceed per-lead budget
 *
 * @param {number} stepCost - Estimated cost for the step
 * @param {number} leadCount - Number of leads
 * @param {number} perLeadLimit - Max cost per lead
 * @returns {boolean} True if per-lead budget would be exceeded
 */
export function wouldExceedPerLeadBudget(stepCost, leadCount, perLeadLimit) {
  if (!perLeadLimit || leadCount === 0) {
    return false;
  }

  const costPerLead = stepCost / leadCount;

  if (costPerLead > perLeadLimit) {
    log.warn('Per-lead budget would be exceeded', {
      stepCost,
      leadCount,
      costPerLead: costPerLead.toFixed(2),
      perLeadLimit
    });
    return true;
  }

  return false;
}

/**
 * Get remaining budget for a campaign
 *
 * @param {string} campaignId - Campaign ID
 * @param {Object} budgetConfig - Budget limits
 * @returns {Promise<Object>} Remaining budget { daily, weekly, monthly }
 */
export async function getRemainingBudget(campaignId, budgetConfig = {}) {
  const spending = await getCurrentSpending(campaignId);

  return {
    daily: budgetConfig.daily
      ? Math.max(0, budgetConfig.daily - spending.daily).toFixed(2)
      : null,
    weekly: budgetConfig.weekly
      ? Math.max(0, budgetConfig.weekly - spending.weekly).toFixed(2)
      : null,
    monthly: budgetConfig.monthly
      ? Math.max(0, budgetConfig.monthly - spending.monthly).toFixed(2)
      : null
  };
}

/**
 * Get budget utilization percentage
 *
 * @param {string} campaignId - Campaign ID
 * @param {Object} budgetConfig - Budget limits
 * @returns {Promise<Object>} Utilization percentages { daily, weekly, monthly }
 */
export async function getBudgetUtilization(campaignId, budgetConfig = {}) {
  const spending = await getCurrentSpending(campaignId);

  return {
    daily: budgetConfig.daily
      ? ((spending.daily / budgetConfig.daily) * 100).toFixed(1)
      : null,
    weekly: budgetConfig.weekly
      ? ((spending.weekly / budgetConfig.weekly) * 100).toFixed(1)
      : null,
    monthly: budgetConfig.monthly
      ? ((spending.monthly / budgetConfig.monthly) * 100).toFixed(1)
      : null
  };
}

/**
 * Check if campaign should be paused due to budget
 * Returns true if budget is exceeded and campaign should pause
 *
 * @param {string} campaignId - Campaign ID
 * @param {Object} budgetConfig - Budget configuration
 * @returns {Promise<boolean>}
 */
export async function shouldPauseCampaign(campaignId, budgetConfig) {
  const check = await isBudgetExceeded(campaignId, budgetConfig);
  return check.exceeded;
}

/**
 * Estimate if a campaign run would exceed budget
 * Useful for pre-flight checks before starting a run
 *
 * @param {string} campaignId - Campaign ID
 * @param {Object} budgetConfig - Budget limits
 * @param {number} estimatedCost - Estimated cost for the run
 * @returns {Promise<boolean>}
 */
export async function wouldRunExceedBudget(campaignId, budgetConfig, estimatedCost) {
  const spending = await getCurrentSpending(campaignId);

  // Check if adding estimated cost would exceed any limit
  if (budgetConfig.daily && (spending.daily + estimatedCost) > budgetConfig.daily) {
    return true;
  }

  if (budgetConfig.weekly && (spending.weekly + estimatedCost) > budgetConfig.weekly) {
    return true;
  }

  if (budgetConfig.monthly && (spending.monthly + estimatedCost) > budgetConfig.monthly) {
    return true;
  }

  return false;
}

export default {
  isBudgetExceeded,
  wouldExceedPerLeadBudget,
  getRemainingBudget,
  getBudgetUtilization,
  shouldPauseCampaign,
  wouldRunExceedBudget
};
