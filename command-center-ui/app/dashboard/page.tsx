'use client';

/**
 * Main Dashboard Page
 * Minimal, mobile-first dashboard with compact metrics
 */

import { Users, ScanSearch, Mail, DollarSign, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { CompactStats, StatItemData } from '@/components/dashboard/stats-cards';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { EngineStatusDots, EngineHealth as EngineHealthType } from '@/components/dashboard/pipeline-health';
import { GradeDistribution } from '@/components/dashboard/grade-distribution';
import { useDashboardStats, useEngineHealth, useActivityFeed } from '@/lib/hooks';
import { LoadingOverlay, PageLayout } from '@/components/shared';
import { Card } from '@/components/ui/card';

export default function DashboardPage() {
  const { stats, loading, error } = useDashboardStats(30000);
  const engineStatus = useEngineHealth();
  const {
    activities,
    loading: activitiesLoading,
    pagination,
    nextPage,
  } = useActivityFeed(8, 30000); // Show 8 items

  // Compact stats
  const compactStats: StatItemData[] = [
    { label: 'prospects', value: stats?.total_prospects || 0, icon: <Users className="w-4 h-4" />, format: 'number' },
    { label: 'analyzed', value: stats?.total_analyzed || 0, icon: <ScanSearch className="w-4 h-4" />, format: 'number' },
    { label: 'emails', value: stats?.total_emails_sent || 0, icon: <Mail className="w-4 h-4" />, format: 'number' },
    { label: 'cost', value: stats?.total_cost || 0, icon: <DollarSign className="w-4 h-4" />, format: 'currency' },
  ];

  // Engine status
  const engines: EngineHealthType[] = [
    { name: 'Prospecting', status: engineStatus.prospecting },
    { name: 'Analysis', status: engineStatus.analysis },
    { name: 'Outreach', status: engineStatus.outreach },
  ];

  // Check if user is new (no data yet)
  const isNewUser = !loading && stats &&
    (stats.total_prospects || 0) === 0 &&
    (stats.total_analyzed || 0) === 0;

  return (
    <>
      <LoadingOverlay isLoading={loading && !stats} message="Loading..." />
      <PageLayout
        title="Dashboard"
        description="Overview of your lead generation pipeline"
        headerRight={<EngineStatusDots engines={engines} loading={loading} />}
      >
        {/* Error State */}
        {error && (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Compact Stats Row */}
        <CompactStats stats={compactStats} loading={loading} />

        {/* Getting Started - shown for new users */}
        {isNewUser && (
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-3">
              Get started with your lead generation pipeline:
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <Link href="/prospecting" className="flex items-center gap-1 text-primary hover:underline">
                <span>1. Generate prospects</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
              <Link href="/analysis" className="flex items-center gap-1 text-primary hover:underline">
                <span>2. Analyze websites</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
              <Link href="/leads" className="flex items-center gap-1 text-primary hover:underline">
                <span>3. View leads</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </Card>
        )}

        {/* Main Content Card */}
        <Card className="p-4 space-y-6">
          {/* Grade Distribution */}
          <GradeDistribution
            gradeA={stats?.grade_a_count || 0}
            gradeB={stats?.grade_b_count || 0}
            gradeC={stats?.grade_c_count || 0}
            gradeD={stats?.grade_d_count || 0}
            gradeF={stats?.grade_f_count || 0}
            loading={loading}
          />

          {/* Divider */}
          <hr className="border-border" />

          {/* Activity Feed */}
          <ActivityFeed
            activities={activities}
            loading={activitiesLoading}
            pagination={pagination}
            onNextPage={nextPage}
          />
        </Card>
      </PageLayout>
    </>
  );
}
