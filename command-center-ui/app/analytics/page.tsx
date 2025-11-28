'use client';

/**
 * Analytics Page - Clean, minimal design
 */

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, Users, Target, Mail, DollarSign } from 'lucide-react';
import { LoadingOverlay, PageLayout } from '@/components/shared';
import { getAnalytics } from '@/lib/api/supabase';
import { formatCurrency, formatNumber, formatPercentage } from '@/lib/utils/format';
import { Card } from '@/components/ui/card';
import type { AnalyticsData } from '@/lib/types';

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRoiInputs, setShowRoiInputs] = useState(false);
  const [avgDealValue, setAvgDealValue] = useState(5000);
  const [conversionRate, setConversionRate] = useState(10);

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

  const d = data;
  const hasData = d && d.funnel.prospects > 0;
  const expectedDeals = (d?.stats.qualified_leads || 0) * (conversionRate / 100);
  const expectedRevenue = expectedDeals * avgDealValue;
  const totalCost = d?.stats.total_cost || 0;
  const roi = totalCost > 0 ? ((expectedRevenue - totalCost) / totalCost) * 100 : 0;

  // Calculate funnel percentages relative to previous step
  const funnelSteps = d ? [
    { label: 'Prospects', count: d.funnel.prospects, icon: Users },
    { label: 'Analyzed', count: d.funnel.analyzed, icon: Target },
    { label: 'Qualified', count: d.funnel.qualified, icon: TrendingUp },
    { label: 'Contacted', count: d.funnel.contacted, icon: Mail },
  ] : [];

  const maxCount = Math.max(...funnelSteps.map(s => s.count), 1);

  return (
    <>
      <LoadingOverlay isLoading={loading} message="Loading analytics..." />
      <PageLayout
        title="Analytics"
        description="Track your pipeline performance and ROI"
      >
        {error && (
          <div className="rounded-md border border-destructive bg-destructive/10 p-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {!loading && (
          <div className="space-y-4">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MetricCard
                icon={<Users className="w-4 h-4" />}
                label="Prospects"
                value={formatNumber(d?.funnel.prospects || 0)}
              />
              <MetricCard
                icon={<Target className="w-4 h-4" />}
                label="Leads"
                value={formatNumber(d?.stats.total_leads || 0)}
              />
              <MetricCard
                icon={<TrendingUp className="w-4 h-4" />}
                label="Qualified"
                value={formatNumber(d?.stats.qualified_leads || 0)}
              />
              <MetricCard
                icon={<DollarSign className="w-4 h-4" />}
                label="Total Cost"
                value={formatCurrency(totalCost)}
              />
            </div>

            {/* Pipeline Funnel - Visual Bar Chart */}
            <Card className="p-4">
              <h3 className="text-sm font-medium mb-4">Pipeline Funnel</h3>
              {hasData ? (
                <div className="space-y-3">
                  {funnelSteps.map((step, i) => {
                    const prevCount = i > 0 ? funnelSteps[i - 1].count : step.count;
                    const convRate = prevCount > 0 ? (step.count / prevCount) * 100 : 0;
                    const barWidth = (step.count / maxCount) * 100;
                    const Icon = step.icon;

                    return (
                      <div key={step.label} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-muted-foreground" />
                            <span>{step.label}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold">{formatNumber(step.count)}</span>
                            {i > 0 && (
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                convRate >= 50 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                convRate >= 25 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              }`}>
                                {formatPercentage(convRate)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              i === 0 ? 'bg-blue-500' :
                              i === 1 ? 'bg-purple-500' :
                              i === 2 ? 'bg-green-500' :
                              'bg-amber-500'
                            }`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No data yet</p>
                  <p className="text-xs mt-1">Start prospecting to see your funnel</p>
                </div>
              )}
            </Card>

            {/* Conversion Rates Summary */}
            {hasData && (
              <Card className="p-4">
                <h3 className="text-sm font-medium mb-3">Conversion Rates</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-semibold">
                      {d.funnel.prospects > 0 ? formatPercentage((d.funnel.analyzed / d.funnel.prospects) * 100) : '0%'}
                    </div>
                    <div className="text-xs text-muted-foreground">Analysis Rate</div>
                  </div>
                  <div>
                    <div className="text-2xl font-semibold">
                      {d.funnel.analyzed > 0 ? formatPercentage((d.funnel.qualified / d.funnel.analyzed) * 100) : '0%'}
                    </div>
                    <div className="text-xs text-muted-foreground">Qualification Rate</div>
                  </div>
                  <div>
                    <div className="text-2xl font-semibold">
                      {d.funnel.qualified > 0 ? formatPercentage((d.funnel.contacted / d.funnel.qualified) * 100) : '0%'}
                    </div>
                    <div className="text-xs text-muted-foreground">Contact Rate</div>
                  </div>
                </div>
              </Card>
            )}

            {/* Cost Breakdown - Only show if there's cost data */}
            {d && d.cost_breakdown && d.cost_breakdown.length > 0 && (
              <Card className="p-4">
                <div className="flex justify-between items-baseline mb-3">
                  <h3 className="text-sm font-medium">Cost Breakdown</h3>
                  <span className="text-sm font-semibold">{formatCurrency(d.cost_breakdown.reduce((s, w) => s + w.total, 0))}</span>
                </div>
                <div className="space-y-2">
                  {d.cost_breakdown.map((week, i) => (
                    <div key={i} className="flex items-center text-sm">
                      <span className="w-16 text-muted-foreground text-xs">{week.stage}</span>
                      <div className="flex-1 h-3 bg-muted rounded overflow-hidden flex">
                        <div className="h-full bg-blue-500" style={{ width: `${(week.prospecting / week.total) * 100}%` }} title={`Prospecting: ${formatCurrency(week.prospecting)}`} />
                        <div className="h-full bg-purple-500" style={{ width: `${(week.analysis / week.total) * 100}%` }} title={`Analysis: ${formatCurrency(week.analysis)}`} />
                        <div className="h-full bg-green-500" style={{ width: `${(week.outreach / week.total) * 100}%` }} title={`Outreach: ${formatCurrency(week.outreach)}`} />
                      </div>
                      <span className="w-16 text-right font-medium text-xs">{formatCurrency(week.total)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />Prospecting</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-purple-500" />Analysis</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-green-500" />Outreach</span>
                </div>
              </Card>
            )}

            {/* ROI Calculator - Collapsible */}
            {hasData && (
              <Card className="overflow-hidden">
                <button
                  onClick={() => setShowRoiInputs(!showRoiInputs)}
                  className="w-full p-4 flex justify-between items-center text-left hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <div className="text-xs text-muted-foreground">Projected ROI</div>
                    <div className={`text-xl font-bold ${roi > 0 ? 'text-green-600 dark:text-green-400' : roi < 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                      {totalCost > 0 ? (roi > 0 ? '+' : '') + formatPercentage(roi) : 'N/A'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="hidden sm:inline">{formatCurrency(expectedRevenue)} projected</span>
                    {showRoiInputs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>
                {showRoiInputs && (
                  <div className="px-4 pb-4 pt-0 border-t space-y-4">
                    <div className="grid grid-cols-2 gap-4 pt-4">
                      <div>
                        <label className="text-xs text-muted-foreground">Avg Deal Value</label>
                        <div className="relative mt-1">
                          <span className="absolute left-3 top-2 text-sm text-muted-foreground">$</span>
                          <input
                            type="number"
                            value={avgDealValue}
                            onChange={(e) => setAvgDealValue(Number(e.target.value))}
                            className="w-full pl-7 pr-3 py-2 text-sm border rounded-md bg-background"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Close Rate</label>
                        <div className="relative mt-1">
                          <input
                            type="number"
                            value={conversionRate}
                            onChange={(e) => setConversionRate(Number(e.target.value))}
                            className="w-full pl-3 pr-7 py-2 text-sm border rounded-md bg-background"
                          />
                          <span className="absolute right-3 top-2 text-sm text-muted-foreground">%</span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="p-3 rounded-md bg-muted/50">
                        <div className="text-xs text-muted-foreground">Qualified Leads</div>
                        <div className="text-lg font-semibold">{d?.stats.qualified_leads || 0}</div>
                      </div>
                      <div className="p-3 rounded-md bg-muted/50">
                        <div className="text-xs text-muted-foreground">Expected Deals</div>
                        <div className="text-lg font-semibold">{expectedDeals.toFixed(1)}</div>
                      </div>
                      <div className="p-3 rounded-md bg-muted/50">
                        <div className="text-xs text-muted-foreground">Revenue</div>
                        <div className="text-lg font-semibold">{formatCurrency(expectedRevenue)}</div>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            )}
          </div>
        )}
      </PageLayout>
    </>
  );
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="text-xl font-semibold">{value}</div>
    </Card>
  );
}
