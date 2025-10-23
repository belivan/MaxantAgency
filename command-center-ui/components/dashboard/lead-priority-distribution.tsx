'use client';

/**
 * Lead Priority Distribution Component
 * Shows distribution of leads by priority tier (Hot/Warm/Cold/Unscored)
 * Based on lead_priority score (0-100) with 6 factors
 */

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Flame, TrendingUp, Snowflake, AlertCircle, HelpCircle } from 'lucide-react';

interface PriorityData {
  tier: string;
  count: number;
  percentage: number;
  description: string;
}

interface LeadPriorityDistributionProps {
  hot: number;
  warm: number;
  cold: number;
  unscored?: number;
  loading?: boolean;
  className?: string;
}

export function LeadPriorityDistribution({
  hot = 0,
  warm = 0,
  cold = 0,
  unscored = 0,
  loading = false,
  className
}: LeadPriorityDistributionProps) {
  const total = hot + warm + cold + unscored;

  const priorities: PriorityData[] = [
    {
      tier: 'Hot',
      count: hot,
      percentage: total > 0 ? (hot / total) * 100 : 0,
      description: 'High-priority leads - strong fit, budget signals, urgent needs'
    },
    {
      tier: 'Warm',
      count: warm,
      percentage: total > 0 ? (warm / total) * 100 : 0,
      description: 'Medium-priority leads - good potential, moderate fit'
    },
    {
      tier: 'Cold',
      count: cold,
      percentage: total > 0 ? (cold / total) * 100 : 0,
      description: 'Lower-priority leads - needs work, uncertain fit'
    }
  ];

  // Add unscored if there are any
  if (unscored > 0) {
    priorities.push({
      tier: 'Unscored',
      count: unscored,
      percentage: total > 0 ? (unscored / total) * 100 : 0,
      description: 'Leads analyzed before priority scoring was added'
    });
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Hot':
        return 'bg-red-500 dark:bg-red-600';
      case 'Warm':
        return 'bg-orange-500 dark:bg-orange-600';
      case 'Cold':
        return 'bg-blue-500 dark:bg-blue-600';
      case 'Unscored':
        return 'bg-gray-500 dark:bg-gray-600';
      default:
        return 'bg-gray-500';
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'Hot':
        return <Flame className="w-4 h-4" />;
      case 'Warm':
        return <TrendingUp className="w-4 h-4" />;
      case 'Cold':
        return <Snowflake className="w-4 h-4" />;
      case 'Unscored':
        return <HelpCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  // Find the tier with highest count for highlighting
  const maxCount = Math.max(...priorities.map(p => p.count));

  return (
    <Card className={cn("p-6", className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Lead Priority Distribution</h3>
          <p className="text-xs text-muted-foreground mt-1">Based on 6-factor lead scoring: fit, budget, urgency, quality gap</p>
        </div>
        <span className="text-sm text-muted-foreground">
          {total} total leads
        </span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-10 bg-muted rounded"></div>
            </div>
          ))}
        </div>
      ) : total === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No analyzed leads yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {priorities.map((priorityData) => (
            <div
              key={priorityData.tier}
              className={cn(
                "relative group",
                priorityData.count === maxCount && maxCount > 0 && "scale-[1.02]"
              )}
            >
              <div className="flex items-center gap-3">
                {/* Priority Badge */}
                <div className="flex items-center gap-2 min-w-[100px]">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm",
                    getTierColor(priorityData.tier)
                  )}>
                    {getTierIcon(priorityData.tier)}
                  </div>
                  <span className="font-semibold text-sm">{priorityData.tier}</span>
                </div>

                {/* Progress Bar */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">
                      {priorityData.description}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {priorityData.count}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({priorityData.percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <div className="h-6 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all duration-500 ease-out",
                        getTierColor(priorityData.tier)
                      )}
                      style={{ width: `${priorityData.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Summary Stats */}
          <div className="pt-4 mt-4 border-t grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">High Priority (Hot)</p>
              <p className="text-lg font-semibold">
                {hot} ({total > 0 ? ((hot / total) * 100).toFixed(0) : 0}%)
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Focus Now (Hot+Warm)</p>
              <p className="text-lg font-semibold">
                {hot + warm} ({total > 0 ? (((hot + warm) / total) * 100).toFixed(0) : 0}%)
              </p>
            </div>
          </div>

          {/* Action Recommendation */}
          {hot > 0 && (
            <div className="mt-4 p-3 bg-red-500/10 dark:bg-red-600/10 rounded-lg border border-red-500/20">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-red-600 dark:text-red-500" />
                <div className="text-sm">
                  <span className="font-medium">Action: </span>
                  <span className="text-muted-foreground">
                    {hot} hot lead{hot === 1 ? '' : 's'} ready for immediate outreach
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Unscored Notice */}
          {unscored > 0 && (
            <div className="mt-4 p-3 bg-gray-500/10 dark:bg-gray-600/10 rounded-lg border border-gray-500/20">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-gray-600 dark:text-gray-500" />
                <div className="text-sm">
                  <span className="font-medium">Note: </span>
                  <span className="text-muted-foreground">
                    {unscored} lead{unscored === 1 ? '' : 's'} need re-analysis to get priority scores
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
