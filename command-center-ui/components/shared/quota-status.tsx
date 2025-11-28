'use client';

import { useQuota } from '@/lib/hooks/use-quota';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Crown, AlertTriangle, Loader2 } from 'lucide-react';
import { TRIAL_LIMITS, QuotaType } from '@/lib/constants/quotas';

const QUOTA_LABELS: Record<QuotaType, string> = {
  prospects: 'Prospects',
  analyses: 'Analyses',
  reports: 'Reports',
  outreach: 'Outreach',
};

export function QuotaStatus() {
  const { tier, usage, remaining, isLoading, isNearLimit, isExceeded } = useQuota();

  if (isLoading) {
    return (
      <Badge variant="outline" className="gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Loading...</span>
      </Badge>
    );
  }

  // Full tier - show badge only
  if (tier === 'full') {
    return (
      <Badge variant="default" className="gap-1 bg-amber-500 hover:bg-amber-600">
        <Crown className="h-3 w-3" />
        <span>Full</span>
      </Badge>
    );
  }

  // Trial tier - show usage with tooltip
  const quotaItems = (Object.keys(TRIAL_LIMITS) as QuotaType[]).map((key) => ({
    key,
    label: QUOTA_LABELS[key],
    used: usage[key],
    limit: TRIAL_LIMITS[key],
    remaining: remaining[key],
    percentage: Math.min(100, (usage[key] / TRIAL_LIMITS[key]) * 100),
  }));

  const badgeVariant = isExceeded()
    ? 'destructive'
    : isNearLimit()
    ? 'secondary'
    : 'outline';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={badgeVariant} className="gap-1 cursor-pointer">
            {isExceeded() ? (
              <AlertTriangle className="h-3 w-3" />
            ) : isNearLimit() ? (
              <AlertTriangle className="h-3 w-3 text-amber-500" />
            ) : null}
            <span>Trial</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end" className="w-64 p-3">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Trial Usage</span>
              <a
                href="/upgrade"
                className="text-xs text-primary hover:underline"
              >
                Upgrade
              </a>
            </div>
            <div className="space-y-2">
              {quotaItems.map((item) => (
                <div key={item.key} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span
                      className={
                        item.percentage >= 100
                          ? 'text-destructive font-medium'
                          : item.percentage >= 80
                          ? 'text-amber-500'
                          : ''
                      }
                    >
                      {item.used}/{item.limit}
                    </span>
                  </div>
                  <Progress
                    value={item.percentage}
                    className={`h-1.5 ${
                      item.percentage >= 100
                        ? '[&>div]:bg-destructive'
                        : item.percentage >= 80
                        ? '[&>div]:bg-amber-500'
                        : ''
                    }`}
                  />
                </div>
              ))}
            </div>
            {isExceeded() && (
              <p className="text-xs text-destructive mt-2">
                One or more limits reached. Upgrade to continue.
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
