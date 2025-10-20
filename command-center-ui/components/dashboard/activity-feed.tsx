'use client';

/**
 * Activity Feed Component
 * Shows recent activity across all engines
 */

import { Search, ScanSearch, Mail, MessageSquare, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime } from '@/lib/utils/format';
import { cn } from '@/lib/utils';
import type { ActivityFeedItem } from '@/lib/types';

interface ActivityFeedProps {
  activities: ActivityFeedItem[];
  maxItems?: number;
  loading?: boolean;
}

const ACTIVITY_ICONS = {
  prospect_generated: Search,
  analysis_completed: ScanSearch,
  email_sent: Mail,
  email_replied: CheckCircle2,
  social_sent: MessageSquare
} as const;

const ACTIVITY_COLORS = {
  green: 'text-green-600 dark:text-green-500',
  blue: 'text-blue-600 dark:text-blue-500',
  purple: 'text-purple-600 dark:text-purple-500',
  orange: 'text-orange-600 dark:text-orange-500',
  red: 'text-red-600 dark:text-red-500'
} as const;

function ActivityItem({ activity }: { activity: ActivityFeedItem }) {
  const Icon = ACTIVITY_ICONS[activity.type] || Search;
  const colorClass = activity.color ? ACTIVITY_COLORS[activity.color] : 'text-muted-foreground';

  return (
    <div className="flex items-start space-x-3 py-3">
      <div className={cn('mt-0.5', colorClass)}>
        <Icon className="w-5 h-5" />
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-sm font-medium text-foreground">
          {activity.message}
        </p>

        {activity.details && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {activity.details.project_name && (
              <Badge variant="outline" className="text-xs">
                {activity.details.project_name}
              </Badge>
            )}
            {activity.details.company_name && (
              <span>{activity.details.company_name}</span>
            )}
            {activity.details.grade && (
              <Badge
                variant={
                  activity.details.grade === 'A' || activity.details.grade === 'B'
                    ? 'default'
                    : 'secondary'
                }
                className="text-xs"
              >
                Grade {activity.details.grade}
              </Badge>
            )}
            {activity.details.count !== undefined && (
              <span>{activity.details.count} items</span>
            )}
            {activity.details.cost !== undefined && (
              <span>${activity.details.cost.toFixed(2)}</span>
            )}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          {formatRelativeTime(activity.timestamp)}
        </p>
      </div>
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="flex items-start space-x-3 py-3 animate-pulse">
      <div className="w-5 h-5 bg-muted rounded" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-1/2" />
      </div>
    </div>
  );
}

export function ActivityFeed({ activities, maxItems = 10, loading = false }: ActivityFeedProps) {
  const displayedActivities = activities.slice(0, maxItems);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <ActivitySkeleton key={i} />
            ))}
          </div>
        ) : displayedActivities.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              No recent activity
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Start by generating prospects or analyzing leads
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {displayedActivities.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        )}

        {activities.length > maxItems && (
          <div className="mt-4 text-center">
            <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              View all activity ({activities.length})
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

