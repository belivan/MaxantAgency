'use client';

/**
 * Stats Overview Component
 * Key metrics cards for analysis statistics
 */

import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Flame, DollarSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface AnalysisStats {
  total_analyzed: number;
  average_score: number;
  average_grade: string;
  hot_leads: number;
  warm_leads: number;
  cold_leads: number;
  total_cost: number;
}

export function StatsOverview({ projectId }: { projectId?: string | null }) {
  const [stats, setStats] = useState<AnalysisStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (projectId) {
          params.append('project_id', projectId);
        }

        const response = await fetch(`/api/analysis/stats?${params.toString()}`);
        const result = await response.json();

        if (result.success) {
          setStats(result.data);
        }
      } catch (error) {
        console.error('Failed to load stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [projectId]);

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const statCards = [
    {
      icon: BarChart3,
      label: 'Total Analyzed',
      value: stats.total_analyzed.toLocaleString(),
      detail: `Avg: ${stats.average_grade} (${Math.round(stats.average_score)}/100)`,
      color: 'text-primary'
    },
    {
      icon: Flame,
      label: 'Hot Leads',
      value: stats.hot_leads.toLocaleString(),
      detail: `${stats.hot_leads > 0 ? Math.round((stats.hot_leads / stats.total_analyzed) * 100) : 0}% of total`,
      color: 'text-destructive'
    },
    {
      icon: TrendingUp,
      label: 'Warm Leads',
      value: stats.warm_leads.toLocaleString(),
      detail: `${stats.warm_leads > 0 ? Math.round((stats.warm_leads / stats.total_analyzed) * 100) : 0}% of total`,
      color: 'text-warning'
    },
    {
      icon: DollarSign,
      label: 'Total Cost',
      value: `$${stats.total_cost.toFixed(2)}`,
      detail: `~$${(stats.total_cost / Math.max(stats.total_analyzed, 1)).toFixed(3)} per lead`,
      color: 'text-success'
    }
  ];

  return (
    <div className="grid gap-6 md:grid-cols-4">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </span>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div className="text-3xl font-bold text-foreground mb-1">
                {stat.value}
              </div>
              <p className="text-xs text-muted-foreground">
                {stat.detail}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default StatsOverview;
