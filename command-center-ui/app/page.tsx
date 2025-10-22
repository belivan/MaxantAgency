'use client';

/**
 * Main Dashboard Page
 * Displays overview stats, activity feed, and pipeline health
 */

import { Users, ScanSearch, Mail, DollarSign } from 'lucide-react';
import { StatsCards, StatCardData } from '@/components/dashboard/stats-cards';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { PipelineHealth, EngineHealth as EngineHealthType } from '@/components/dashboard/pipeline-health';
import { GradeDistribution } from '@/components/dashboard/grade-distribution';
import { useDashboardStats, useEngineHealth, useActivityFeed } from '@/lib/hooks';
import { LoadingOverlay } from '@/components/shared/loading-overlay';

export default function DashboardPage() {
  const { stats, loading, error } = useDashboardStats(30000); // Refresh every 30s
  const engineStatus = useEngineHealth();
  const {
    activities,
    loading: activitiesLoading,
    pagination,
    nextPage,
    previousPage
  } = useActivityFeed(5, 30000); // Show 5 per page, refresh every 30s

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  // Build stats cards
  const statsCards: StatCardData[] = [
    {
      title: 'Total Prospects',
      value: stats?.total_prospects || 0,
      change: stats?.prospects_this_week || 0,
      changeLabel: 'this week',
      icon: <Users className="w-4 h-4" />,
      format: 'number'
    },
    {
      title: 'Analyzed Leads',
      value: stats?.total_analyzed || 0,
      subtitle: `${stats?.grade_a_count || 0} Grade A, ${stats?.grade_b_count || 0} Grade B`,
      icon: <ScanSearch className="w-4 h-4" />,
      format: 'number'
    },
    {
      title: 'Emails Sent',
      value: stats?.total_emails_sent || 0,
      subtitle: `Avg Quality: ${stats?.avg_quality_score?.toFixed(0) || 0}%`,
      icon: <Mail className="w-4 h-4" />,
      format: 'number'
    },
    {
      title: 'Total Cost',
      value: stats?.total_cost || 0,
      subtitle: `${formatCurrency(stats?.cost_per_lead || 0)} per lead`,
      icon: <DollarSign className="w-4 h-4" />,
      format: 'currency'
    }
  ];

  // Build engine health status
  const engines: EngineHealthType[] = [
    {
      name: 'Prospecting Engine',
      status: engineStatus.prospecting,
      message: engineStatus.prospecting === 'online' ? 'Ready to generate prospects' : 'Unable to connect'
    },
    {
      name: 'Analysis Engine',
      status: engineStatus.analysis,
      message: engineStatus.analysis === 'online' ? 'Ready to analyze websites' : 'Unable to connect'
    },
    {
      name: 'Outreach Engine',
      status: engineStatus.outreach,
      message: engineStatus.outreach === 'online' ? 'Ready to compose emails' : 'Unable to connect'
    }
  ];

  return (
    <>
      <LoadingOverlay isLoading={loading && !stats} message="Loading Dashboard..." />
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your lead generation pipeline
          </p>
        </div>

        {/* Stats Cards */}
        <StatsCards stats={statsCards} />

        {/* Grade Distribution & Pipeline Health */}
        <div className="grid gap-6 lg:grid-cols-2">
          <GradeDistribution
            gradeA={stats?.grade_a_count || 0}
            gradeB={stats?.grade_b_count || 0}
            gradeC={stats?.grade_c_count || 0}
            gradeD={stats?.grade_d_count || 0}
            gradeF={stats?.grade_f_count || 0}
            loading={loading}
          />
          <PipelineHealth engines={engines} loading={loading} />
        </div>

        {/* Activity Feed */}
        <ActivityFeed
          activities={activities}
          loading={activitiesLoading}
          pagination={pagination}
          onNextPage={nextPage}
          onPreviousPage={previousPage}
        />

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-3">
          <QuickActionCard
            title="Generate Prospects"
            description="Start prospecting with ICP brief"
            href="/prospecting"
          />
          <QuickActionCard
            title="Analyze Leads"
            description="Run website analysis on prospects"
            href="/analysis"
          />
          <QuickActionCard
            title="View Leads"
            description="Browse and filter analyzed leads"
            href="/leads"
          />
        </div>
      </div>
    </>
  );
}

function QuickActionCard({
  title,
  description,
  href
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="block rounded-lg border border-border bg-card p-6 hover:bg-accent transition-colors group"
    >
      <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </a>
  );
}

// Helper function for formatting
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(value);
}
