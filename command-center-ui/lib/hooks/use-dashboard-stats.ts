/**
 * Dashboard Statistics Hook
 * Aggregates stats from all 3 engines for dashboard display
 */

import { useState, useEffect, useCallback } from 'react';
import { getProspectingStats, getAnalysisStats, getOutreachStats } from '@/lib/api';
import type { DashboardStats } from '@/lib/types';

export interface UseDashboardStatsReturn {
  stats: DashboardStats | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useDashboardStats(refreshInterval?: number): UseDashboardStatsReturn {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch stats from all 3 engines in parallel
      const [prospectingData, analysisData, outreachData] = await Promise.all([
        getProspectingStats().catch(() => ({
          total_prospects: 0,
          by_status: {},
          by_industry: {},
          total_cost: 0,
          recent_runs: []
        })),
        getAnalysisStats().catch(() => ({
          total_analyzed: 0,
          by_grade: {},
          by_tier: {},
          avg_score: 0,
          total_cost: 0,
          avg_analysis_time_ms: 0
        })),
        getOutreachStats().catch(() => ({
          total_emails: 0,
          emails_by_status: {},
          total_social_messages: 0,
          social_by_platform: {},
          avg_email_quality_score: 0,
          total_cost: 0
        }))
      ]);

      // Aggregate into dashboard stats
      const dashboardStats: DashboardStats = {
        // Overall counts
        total_prospects: prospectingData.total_prospects,
        total_analyzed: analysisData.total_analyzed,
        total_leads: analysisData.total_analyzed,
        total_emails_sent: outreachData.emails_by_status?.sent || 0,
        total_social_messages: outreachData.total_social_messages,

        // This week (placeholder - would need time-based queries)
        prospects_this_week: 0,
        analyzed_this_week: 0,
        emails_sent_this_week: 0,

        // Costs
        total_cost: prospectingData.total_cost + analysisData.total_cost + outreachData.total_cost,
        prospecting_cost: prospectingData.total_cost,
        analysis_cost: analysisData.total_cost,
        outreach_cost: outreachData.total_cost,
        cost_this_week: 0,
        cost_this_month: 0,
        cost_per_lead: analysisData.total_analyzed > 0
          ? (prospectingData.total_cost + analysisData.total_cost) / analysisData.total_analyzed
          : 0,

        // Quality metrics
        avg_lead_score: analysisData.avg_score,
        grade_a_count: analysisData.by_grade?.A || 0,
        grade_b_count: analysisData.by_grade?.B || 0,
        grade_c_count: analysisData.by_grade?.C || 0,
        grade_d_count: analysisData.by_grade?.D || 0,
        grade_f_count: analysisData.by_grade?.F || 0,

        // Email metrics
        email_open_rate: 0, // Would need tracking
        email_reply_rate: 0, // Would need tracking
        avg_quality_score: outreachData.avg_email_quality_score,

        // Pipeline health
        pipeline_health: 'healthy',
        engine_status: {
          prospecting: 'online',
          analysis: 'online',
          outreach: 'online'
        },

        last_updated: new Date().toISOString()
      };

      setStats(dashboardStats);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard stats');
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();

    // Set up auto-refresh if interval is provided
    if (refreshInterval && refreshInterval > 0) {
      const intervalId = setInterval(fetchStats, refreshInterval);
      return () => clearInterval(intervalId);
    }
  }, [fetchStats, refreshInterval]);

  return {
    stats,
    loading,
    error,
    refresh: fetchStats
  };
}

/**
 * Hook for checking engine health status
 */
export function useEngineHealth() {
  const [engineStatus, setEngineStatus] = useState<{
    prospecting: 'online' | 'offline' | 'degraded';
    analysis: 'online' | 'offline' | 'degraded';
    outreach: 'online' | 'offline' | 'degraded';
  }>({
    prospecting: 'online',
    analysis: 'online',
    outreach: 'online'
  });

  const checkHealth = useCallback(async () => {
    const checks = await Promise.allSettled([
      fetch(process.env.NEXT_PUBLIC_PROSPECTING_API + '/health', {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      }),
      fetch(process.env.NEXT_PUBLIC_ANALYSIS_API + '/health', {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      }),
      fetch(process.env.NEXT_PUBLIC_OUTREACH_API + '/health', {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      })
    ]);

    setEngineStatus({
      prospecting: checks[0].status === 'fulfilled' && checks[0].value.ok ? 'online' : 'offline',
      analysis: checks[1].status === 'fulfilled' && checks[1].value.ok ? 'online' : 'offline',
      outreach: checks[2].status === 'fulfilled' && checks[2].value.ok ? 'online' : 'offline'
    });
  }, []);

  useEffect(() => {
    checkHealth();
    const intervalId = setInterval(checkHealth, 30000); // Check every 30 seconds
    return () => clearInterval(intervalId);
  }, [checkHealth]);

  return engineStatus;
}
