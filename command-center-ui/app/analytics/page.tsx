'use client';

/**
 * Analytics Page
 * View pipeline performance, costs, and ROI metrics
 */

import { useState, useEffect } from 'react';
import {
  AnalyticsStats,
  CostTrackingChart,
  ConversionFunnelChart,
  ROICalculator
} from '@/components/analytics';
import { LoadingSection } from '@/components/shared/loading-spinner';
import { LoadingOverlay } from '@/components/shared';
import { getAnalytics } from '@/lib/api/supabase';
import type { AnalyticsData } from '@/lib/types';

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true);
      setError(null);

      try {
        const analyticsData = await getAnalytics();
        setData(analyticsData);
      } catch (err: any) {
        console.error('Failed to load analytics:', err);
        setError(err.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, []);

  // Mock data for demo (remove when API is ready)
  const mockData: AnalyticsData = {
    stats: {
      total_cost: 347.50,
      total_prospects: 125,
      total_leads: 98,
      qualified_leads: 42,
      contacted: 15,
      cost_per_lead: 3.55,
      conversion_rate: 33.6
    },
    cost_breakdown: [
      { stage: 'Week 1', prospecting: 45.20, analysis: 78.50, outreach: 12.30, total: 136 },
      { stage: 'Week 2', prospecting: 32.10, analysis: 65.40, outreach: 18.70, total: 116.2 },
      { stage: 'Week 3', prospecting: 28.50, analysis: 45.20, outreach: 21.60, total: 95.3 }
    ],
    funnel: {
      prospects: 125,
      analyzed: 112,
      leads: 98,
      qualified: 42,
      contacted: 15
    }
  };

  const displayData = data || mockData;

  return (
    <>
      <LoadingOverlay
        isLoading={loading && !data}
        message="Loading analytics..."
      />
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Track costs, conversions, and ROI across your lead generation pipeline
          </p>
        </div>

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {loading && !data ? (
        <LoadingSection title="Loading Analytics" />
      ) : (
        <>
          {/* Stats Cards */}
          <AnalyticsStats
            stats={[
              {
                label: 'Total Cost',
                value: displayData.stats.total_cost,
                format: 'currency',
                change: -5.2
              },
              {
                label: 'Total Leads',
                value: displayData.stats.total_leads,
                format: 'number',
                change: 12.3
              },
              {
                label: 'Cost per Lead',
                value: displayData.stats.cost_per_lead,
                format: 'currency',
                change: -8.1
              },
              {
                label: 'Conversion Rate',
                value: displayData.stats.conversion_rate,
                format: 'percentage',
                change: 4.7
              }
            ]}
          />

          {/* Charts Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Cost Tracking */}
            <CostTrackingChart
              data={displayData.cost_breakdown}
              loading={loading}
            />

            {/* Conversion Funnel */}
            <ConversionFunnelChart
              data={displayData.funnel}
              loading={loading}
            />
          </div>

          {/* ROI Calculator */}
          <ROICalculator
            totalCost={displayData.stats.total_cost}
            leadsGenerated={displayData.stats.total_leads}
            qualifiedLeads={displayData.stats.qualified_leads}
          />

          {/* Additional Insights */}
          <div className="grid gap-6 md:grid-cols-3">
            <InsightCard
              title="Top Performing Stage"
              value="Analysis"
              description="92% of prospects analyzed successfully"
              color="green"
            />
            <InsightCard
              title="Optimization Opportunity"
              value="Outreach"
              description="Only 35.7% of qualified leads contacted"
              color="yellow"
            />
            <InsightCard
              title="Cost Efficiency"
              value="Trending Down"
              description="Cost per lead decreased 8.1% this week"
              color="blue"
            />
          </div>
        </>
      )}
      </div>
    </>
  );
}

function InsightCard({
  title,
  value,
  description,
  color
}: {
  title: string;
  value: string;
  description: string;
  color: 'green' | 'yellow' | 'blue';
}) {
  const colorClasses = {
    green: 'bg-green-50 dark:bg-green-950/20 border-green-600',
    yellow: 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-600',
    blue: 'bg-blue-50 dark:bg-blue-950/20 border-blue-600'
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <h4 className="text-sm font-medium text-muted-foreground mb-2">{title}</h4>
      <p className="text-xl font-bold mb-1">{value}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
