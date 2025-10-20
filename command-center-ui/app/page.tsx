'use client';

/**
 * Main Dashboard Page
 * Displays overview stats, activity feed, and pipeline health
 */

import { Users, ScanSearch, Mail, DollarSign } from 'lucide-react';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { PipelineHealth } from '@/components/dashboard/pipeline-health';
import { useDashboardStats, useEngineHealth } from '@/lib/hooks';
import { LoadingOverlay } from '@/components/shared/loading-overlay';
import type { StatCardData, EngineHealth as EngineHealthType, ActivityFeedItem } from '@/lib/types';

export default function DashboardPage() {
  const { stats, loading, error } = useDashboardStats(30000); // Refresh every 30s
  const engineStatus = useEngineHealth();

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

  // Mock activity feed (replace with real data later)
  const activities: ActivityFeedItem[] = [
    {
      id: '1',
      type: 'prospect_generated',
      message: '20 prospects generated',
      details: {
        count: 20,
        project_name: 'Philly Restaurants'
      },
      timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      color: 'blue'
    },
    {
      id: '2',
      type: 'analysis_completed',
      message: 'Website analyzed',
      details: {
        company_name: 'Zahav Restaurant',
        grade: 'A'
      },
      timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      color: 'green'
    },
    {
      id: '3',
      type: 'email_sent',
      message: 'Email sent',
      details: {
        company_name: 'Vetri Cucina'
      },
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      color: 'purple'
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

        {/* Activity Feed & Pipeline Health */}
        <div className="grid gap-6 lg:grid-cols-2">
          <ActivityFeed activities={activities} loading={loading} />
          <PipelineHealth engines={engines} loading={loading} />
        </div>

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
