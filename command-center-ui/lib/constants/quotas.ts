/**
 * User tier quota limits
 * Trial users have lifetime limits, full users have unlimited access
 */

export const TRIAL_LIMITS = {
  prospects: 25,
  analyses: 15,
  reports: 5,
  outreach: 15,
} as const;

export const FULL_LIMITS = {
  prospects: Infinity,
  analyses: Infinity,
  reports: Infinity,
  outreach: Infinity,
} as const;

export type QuotaType = keyof typeof TRIAL_LIMITS;
export type UserTier = 'trial' | 'full';

export function getQuotaLimits(tier: UserTier) {
  return tier === 'full' ? FULL_LIMITS : TRIAL_LIMITS;
}

export function isQuotaExceeded(tier: UserTier, quotaType: QuotaType, currentUsage: number, requestedCount: number = 1): boolean {
  if (tier === 'full') return false;
  return currentUsage + requestedCount > TRIAL_LIMITS[quotaType];
}

export function getRemainingQuota(tier: UserTier, quotaType: QuotaType, currentUsage: number): number {
  if (tier === 'full') return Infinity;
  return Math.max(0, TRIAL_LIMITS[quotaType] - currentUsage);
}
