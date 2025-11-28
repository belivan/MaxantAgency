'use client';

import { ReactNode } from 'react';
import { useQuota } from '@/lib/hooks/use-quota';
import { Button } from '@/components/ui/button';
import { Lock, Crown, Loader2 } from 'lucide-react';
import { QuotaType } from '@/lib/constants/quotas';

interface QuotaGateProps {
  /** The type of quota to check */
  quotaType: QuotaType;
  /** Number of quota units this action will consume */
  count?: number;
  /** Content to show when quota is available */
  children: ReactNode;
  /** Optional custom message when quota is exceeded */
  exceededMessage?: string;
  /** If true, shows a disabled state instead of blocking overlay */
  disableOnly?: boolean;
  /** Class name for the wrapper */
  className?: string;
}

/**
 * QuotaGate - Wraps content that requires quota
 *
 * Shows the children if user has sufficient quota, otherwise shows
 * an upgrade prompt overlay or disables the content.
 *
 * Usage:
 * ```tsx
 * <QuotaGate quotaType="analyses" count={5}>
 *   <Button onClick={runAnalysis}>Analyze 5 websites</Button>
 * </QuotaGate>
 * ```
 */
export function QuotaGate({
  quotaType,
  count = 1,
  children,
  exceededMessage,
  disableOnly = false,
  className = '',
}: QuotaGateProps) {
  const { tier, canUse, remaining, isLoading } = useQuota();

  // Show loading state
  if (isLoading) {
    return (
      <div className={`relative ${className}`}>
        <div className="opacity-50 pointer-events-none">{children}</div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Full tier or has quota - show content
  if (tier === 'full' || canUse(quotaType, count)) {
    return <div className={className}>{children}</div>;
  }

  // Disable only mode - render children as disabled
  if (disableOnly) {
    return (
      <div className={`opacity-50 pointer-events-none ${className}`} title="Quota exceeded">
        {children}
      </div>
    );
  }

  // Quota exceeded - show upgrade overlay
  const remainingCount = remaining[quotaType];
  const message =
    exceededMessage ||
    `${quotaType.charAt(0).toUpperCase() + quotaType.slice(1)} limit reached (${remainingCount} remaining)`;

  return (
    <div className={`relative ${className}`}>
      <div className="opacity-30 pointer-events-none blur-[1px]">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-md">
        <div className="text-center p-4 max-w-xs">
          <Lock className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-3">{message}</p>
          <Button size="sm" asChild>
            <a href="/upgrade">
              <Crown className="h-4 w-4 mr-2" />
              Upgrade to Full
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * useCanUseQuota - Hook version for programmatic checks
 *
 * Usage:
 * ```tsx
 * const { canUse, showUpgradePrompt } = useCanUseQuota('analyses', 5);
 *
 * const handleClick = () => {
 *   if (!canUse) {
 *     showUpgradePrompt();
 *     return;
 *   }
 *   // ... proceed with action
 * };
 * ```
 */
export function useCanUseQuota(quotaType: QuotaType, count: number = 1) {
  const { tier, canUse, remaining } = useQuota();

  const showUpgradePrompt = () => {
    // TODO: Could open a modal instead
    window.location.href = '/upgrade';
  };

  return {
    canUse: tier === 'full' || canUse(quotaType, count),
    remaining: remaining[quotaType],
    tier,
    showUpgradePrompt,
  };
}
