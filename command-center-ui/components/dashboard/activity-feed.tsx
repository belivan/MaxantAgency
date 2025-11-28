'use client';

/**
 * Compact Activity Feed
 * Minimal activity list without large cards
 */

import { Search, ScanSearch, Mail, MessageSquare, CheckCircle2 } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils/format';
import { cn } from '@/lib/utils';
import type { ActivityFeedItem } from '@/lib/types';
import type { ActivityPagination } from '@/lib/hooks/use-activity-feed';

interface ActivityFeedProps {
  activities: ActivityFeedItem[];
  loading?: boolean;
  pagination?: ActivityPagination | null;
  onNextPage?: () => void;
  onPreviousPage?: () => void;
  onGoToPage?: (page: number) => void;
  className?: string;
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

function CompactActivityItem({ activity }: { activity: ActivityFeedItem }) {
  const Icon = ACTIVITY_ICONS[activity.type] || Search;
  const colorClass = activity.color ? ACTIVITY_COLORS[activity.color] : 'text-muted-foreground';

  return (
    <div className="flex items-center gap-2 py-1.5 text-sm">
      <span className={cn('shrink-0', colorClass)}>
        <Icon className="w-4 h-4" />
      </span>
      <span className="truncate flex-1 text-foreground">
        {activity.message}
        {activity.details?.grade && (
          <span className="text-muted-foreground ml-1">
            · Grade {activity.details.grade}
          </span>
        )}
      </span>
      <span className="text-xs text-muted-foreground shrink-0">
        {formatRelativeTime(activity.timestamp)}
      </span>
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="flex items-center gap-2 py-1.5 animate-pulse">
      <div className="w-4 h-4 bg-muted rounded shrink-0" />
      <div className="h-4 bg-muted rounded flex-1" />
      <div className="h-3 w-12 bg-muted rounded shrink-0" />
    </div>
  );
}

export function ActivityFeed({
  activities,
  loading = false,
  pagination,
  onNextPage,
  className
}: ActivityFeedProps) {
  return (
    <div className={cn("space-y-1", className)}>
      {/* Header */}
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="font-medium">Recent Activity</span>
        {pagination && pagination.total > 0 && (
          <span className="text-xs text-muted-foreground">
            {pagination.total} total
          </span>
        )}
      </div>

      {/* Activity List */}
      {loading ? (
        <div className="space-y-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <ActivitySkeleton key={i} />
          ))}
        </div>
      ) : activities.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">
          No activity yet. Start by generating prospects.
        </p>
      ) : (
        <>
          <div className="divide-y divide-border/50">
            {activities.map((activity) => (
              <CompactActivityItem key={activity.id} activity={activity} />
            ))}
          </div>

          {/* Show more link */}
          {pagination && pagination.has_more && (
            <button
              onClick={onNextPage}
              className="text-xs text-muted-foreground hover:text-foreground mt-2 transition-colors"
            >
              Show more →
            </button>
          )}
        </>
      )}
    </div>
  );
}

