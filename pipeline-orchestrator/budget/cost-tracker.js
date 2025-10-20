import { getSpending } from '../database/supabase-client.js';
import { log } from '../shared/logger.js';

/**
 * Get start of day (midnight)
 */
function getStartOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get start of week (Sunday)
 */
function getStartOfWeek(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day; // Sunday is 0
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get start of month
 */
function getStartOfMonth(date = new Date()) {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get current spending for a campaign across different time periods
 *
 * @param {string} campaignId - Campaign ID
 * @returns {Promise<Object>} Spending totals { daily, weekly, monthly }
 */
export async function getCurrentSpending(campaignId) {
  const now = new Date();

  try {
    // Get spending for each period
    const [daily, weekly, monthly] = await Promise.all([
      getSpending(campaignId, {
        startDate: getStartOfDay(now).toISOString(),
        endDate: now.toISOString()
      }),
      getSpending(campaignId, {
        startDate: getStartOfWeek(now).toISOString(),
        endDate: now.toISOString()
      }),
      getSpending(campaignId, {
        startDate: getStartOfMonth(now).toISOString(),
        endDate: now.toISOString()
      })
    ]);

    return {
      daily: parseFloat(daily.toFixed(2)),
      weekly: parseFloat(weekly.toFixed(2)),
      monthly: parseFloat(monthly.toFixed(2))
    };

  } catch (error) {
    log.error('Error getting current spending', {
      campaignId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Get spending for all campaigns (system-wide)
 *
 * @returns {Promise<Object>} System-wide spending { daily, weekly, monthly }
 */
export async function getSystemSpending() {
  // This would query all campaigns
  // For now, we'll implement per-campaign tracking
  // System-wide tracking can be added later if needed

  log.warn('System-wide spending tracking not yet implemented');
  return {
    daily: 0,
    weekly: 0,
    monthly: 0
  };
}

/**
 * Calculate cost for a step result
 * Extracts cost information from step results
 *
 * @param {Object} stepResult - Result from step execution
 * @returns {number} Cost in dollars
 */
export function extractCostFromStepResult(stepResult) {
  // Different engines might return cost in different formats
  if (stepResult.cost !== undefined) {
    return parseFloat(stepResult.cost);
  }

  if (stepResult.totalCost !== undefined) {
    return parseFloat(stepResult.totalCost);
  }

  if (stepResult.total_cost !== undefined) {
    return parseFloat(stepResult.total_cost);
  }

  // Some engines might return detailed cost breakdown
  if (stepResult.costs) {
    const total = Object.values(stepResult.costs).reduce(
      (sum, cost) => sum + parseFloat(cost || 0),
      0
    );
    return total;
  }

  // Default to 0 if no cost info found
  return 0;
}

/**
 * Format cost for display
 *
 * @param {number} cost - Cost in dollars
 * @returns {string} Formatted cost string (e.g., "$12.34")
 */
export function formatCost(cost) {
  return `$${parseFloat(cost).toFixed(2)}`;
}

/**
 * Get spending summary for a campaign
 *
 * @param {string} campaignId - Campaign ID
 * @param {Object} budgetLimits - Budget limits { daily, weekly, monthly }
 * @returns {Promise<Object>} Spending summary with percentages
 */
export async function getSpendingSummary(campaignId, budgetLimits = {}) {
  const spending = await getCurrentSpending(campaignId);

  const summary = {
    daily: {
      spent: spending.daily,
      limit: budgetLimits.daily || null,
      percentage: budgetLimits.daily
        ? ((spending.daily / budgetLimits.daily) * 100).toFixed(1)
        : null,
      remaining: budgetLimits.daily
        ? Math.max(0, budgetLimits.daily - spending.daily).toFixed(2)
        : null
    },
    weekly: {
      spent: spending.weekly,
      limit: budgetLimits.weekly || null,
      percentage: budgetLimits.weekly
        ? ((spending.weekly / budgetLimits.weekly) * 100).toFixed(1)
        : null,
      remaining: budgetLimits.weekly
        ? Math.max(0, budgetLimits.weekly - spending.weekly).toFixed(2)
        : null
    },
    monthly: {
      spent: spending.monthly,
      limit: budgetLimits.monthly || null,
      percentage: budgetLimits.monthly
        ? ((spending.monthly / budgetLimits.monthly) * 100).toFixed(1)
        : null,
      remaining: budgetLimits.monthly
        ? Math.max(0, budgetLimits.monthly - spending.monthly).toFixed(2)
        : null
    }
  };

  return summary;
}

export default {
  getCurrentSpending,
  getSystemSpending,
  extractCostFromStepResult,
  formatCost,
  getSpendingSummary
};
