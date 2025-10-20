'use client';

/**
 * Activity Feed Component
 * Shows activity history across all engines with pagination
 */

import { Search, ScanSearch, Mail, MessageSquare, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

export function ActivityFeed({
  activities,
  loading = false,
  pagination,
  onNextPage,
  onPreviousPage,
  onGoToPage
}: ActivityFeedProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Activity</CardTitle>
        {pagination && (
          <span className="text-xs text-muted-foreground">
            {pagination.total} total
          </span>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <ActivitySkeleton key={i} />
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              No activity yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Start by generating prospects or analyzing leads
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-border min-h-[450px]">
              {activities.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
            </div>

            {/* Pagination Controls */}
            {pagination && pagination.total_pages > 1 && (
              <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                <div className="text-xs text-muted-foreground">
                  Page {pagination.page} of {pagination.total_pages}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onPreviousPage}
                    disabled={!pagination.has_previous || loading}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onNextPage}
                    disabled={!pagination.has_more || loading}
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

