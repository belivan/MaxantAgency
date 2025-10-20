/**
 * Activity Feed Hook
 * Fetches activity history across all engines with pagination support
 */

import { useState, useEffect, useCallback } from 'react';
import type { ActivityFeedItem } from '@/lib/types';

export interface ActivityPagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_more: boolean;
  has_previous: boolean;
}

export interface UseActivityFeedReturn {
  activities: ActivityFeedItem[];
  loading: boolean;
  error: string | null;
  pagination: ActivityPagination | null;
  refresh: () => Promise<void>;
  nextPage: () => void;
  previousPage: () => void;
  goToPage: (page: number) => void;
}

export function useActivityFeed(
  limit: number = 10,
  refreshInterval?: number
): UseActivityFeedReturn {
  const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<ActivityPagination | null>(null);

  const fetchActivities = useCallback(async (currentPage: number) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/activity?page=${currentPage}&limit=${limit}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch activity feed');
      }

      setActivities(result.data || []);
      setPagination(result.pagination || null);
    } catch (err: any) {
      console.error('Activity feed error:', err);
      setError(err.message || 'Failed to fetch activity feed');
      setActivities([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchActivities(page);

    // Set up auto-refresh if interval is provided
    if (refreshInterval && refreshInterval > 0) {
      const intervalId = setInterval(() => fetchActivities(page), refreshInterval);
      return () => clearInterval(intervalId);
    }
  }, [fetchActivities, page, refreshInterval]);

  const nextPage = useCallback(() => {
    if (pagination?.has_more) {
      setPage(p => p + 1);
    }
  }, [pagination]);

  const previousPage = useCallback(() => {
    if (pagination?.has_previous) {
      setPage(p => Math.max(1, p - 1));
    }
  }, [pagination]);

  const goToPage = useCallback((newPage: number) => {
    if (pagination && newPage >= 1 && newPage <= pagination.total_pages) {
      setPage(newPage);
    }
  }, [pagination]);

  return {
    activities,
    loading,
    error,
    pagination,
    refresh: () => fetchActivities(page),
    nextPage,
    previousPage,
    goToPage
  };
}