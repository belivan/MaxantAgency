'use client';

import useSWR from 'swr';
import { useUser } from '@clerk/nextjs';
import { TRIAL_LIMITS, QuotaType, UserTier } from '@/lib/constants/quotas';

interface QuotaData {
  tier: UserTier;
  usage: {
    prospects: number;
    analyses: number;
    reports: number;
    outreach: number;
  };
  limits: {
    prospects: number | null;
    analyses: number | null;
    reports: number | null;
    outreach: number | null;
  };
  remaining: {
    prospects: number;
    analyses: number;
    reports: number;
    outreach: number;
  };
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useQuota() {
  const { user, isLoaded } = useUser();

  const { data, error, isLoading, mutate } = useSWR<QuotaData>(
    isLoaded && user ? '/api/user/quota' : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000, // Only refetch every 30 seconds
    }
  );

  // Default values for unauthenticated or loading state
  const defaultUsage = { prospects: 0, analyses: 0, reports: 0, outreach: 0 };
  const defaultLimits = TRIAL_LIMITS;
  const defaultRemaining = { ...TRIAL_LIMITS };

  const tier: UserTier = data?.tier || 'trial';
  const usage = data?.usage || defaultUsage;
  const limits = tier === 'full'
    ? { prospects: Infinity, analyses: Infinity, reports: Infinity, outreach: Infinity }
    : defaultLimits;
  const remaining = data?.remaining || defaultRemaining;

  /**
   * Check if user can perform an action with given quota type
   */
  const canUse = (quotaType: QuotaType, count: number = 1): boolean => {
    if (tier === 'full') return true;
    return remaining[quotaType] >= count;
  };

  /**
   * Get percentage of quota used (for progress bars)
   */
  const getUsagePercentage = (quotaType: QuotaType): number => {
    if (tier === 'full') return 0;
    const limit = TRIAL_LIMITS[quotaType];
    return Math.min(100, (usage[quotaType] / limit) * 100);
  };

  /**
   * Check if any quota is at or near limit (>80%)
   */
  const isNearLimit = (): boolean => {
    if (tier === 'full') return false;
    return Object.keys(TRIAL_LIMITS).some((key) => {
      const quotaType = key as QuotaType;
      return getUsagePercentage(quotaType) >= 80;
    });
  };

  /**
   * Check if any quota is exceeded (100%)
   */
  const isExceeded = (): boolean => {
    if (tier === 'full') return false;
    return Object.keys(TRIAL_LIMITS).some((key) => {
      const quotaType = key as QuotaType;
      return remaining[quotaType] <= 0;
    });
  };

  return {
    tier,
    usage,
    limits,
    remaining,
    canUse,
    getUsagePercentage,
    isNearLimit,
    isExceeded,
    isLoading: !isLoaded || isLoading,
    error,
    refresh: mutate,
  };
}
