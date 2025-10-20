'use client';

/**
 * Conversion Funnel Chart
 * Visualize the lead generation pipeline conversion rates
 */

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { TrendingDown } from 'lucide-react';
import { formatNumber, formatPercentage } from '@/lib/utils/format';

interface FunnelStage {
  name: string;
  count: number;
  percentage?: number;
}

interface ConversionFunnelChartProps {
  data: {
    prospects: number;
    analyzed: number;
    leads: number;
    qualified: number; // A/B grade leads
    contacted: number;
  };
  loading?: boolean;
}

export function ConversionFunnelChart({ data, loading }: ConversionFunnelChartProps) {
  // Calculate percentages relative to top of funnel
  const stages: FunnelStage[] = [
    {
      name: 'Prospects Generated',
      count: data.prospects,
      percentage: 100
    },
    {
      name: 'Analyzed',
      count: data.analyzed,
      percentage: data.prospects > 0 ? (data.analyzed / data.prospects) * 100 : 0
    },
    {
      name: 'Leads Created',
      count: data.leads,
      percentage: data.prospects > 0 ? (data.leads / data.prospects) * 100 : 0
    },
    {
      name: 'Qualified (A/B)',
      count: data.qualified,
      percentage: data.prospects > 0 ? (data.qualified / data.prospects) * 100 : 0
    },
    {
      name: 'Contacted',
      count: data.contacted,
      percentage: data.prospects > 0 ? (data.contacted / data.prospects) * 100 : 0
    }
  ];

  // Calculate stage-to-stage conversion rates
  const conversionRates = [
    { from: 'Prospects', to: 'Analyzed', rate: data.prospects > 0 ? (data.analyzed / data.prospects) * 100 : 0 },
    { from: 'Analyzed', to: 'Leads', rate: data.analyzed > 0 ? (data.leads / data.analyzed) * 100 : 0 },
    { from: 'Leads', to: 'Qualified', rate: data.leads > 0 ? (data.qualified / data.leads) * 100 : 0 },
    { from: 'Qualified', to: 'Contacted', rate: data.qualified > 0 ? (data.contacted / data.qualified) * 100 : 0 }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="w-5 h-5" />
          Conversion Funnel
        </CardTitle>
        <CardDescription>
          Pipeline conversion rates from prospect to contact
        </CardDescription>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            Loading funnel data...
          </div>
        ) : data.prospects === 0 ? (
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            No funnel data available
          </div>
        ) : (
          <>
            {/* Funnel Visualization */}
            <div className="space-y-2 mb-6">
              {stages.map((stage, idx) => {
                const width = Math.max(stage.percentage || 0, 10); // Minimum 10% width for visibility
                const isFirst = idx === 0;
                const isLast = idx === stages.length - 1;

                return (
                  <div key={stage.name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{stage.name}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-muted-foreground">
                          {formatNumber(stage.count)}
                        </span>
                        {!isFirst && (
                          <span className="text-xs text-muted-foreground min-w-[50px] text-right">
                            {formatPercentage(stage.percentage || 0)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="relative h-12 bg-muted/30 rounded-lg overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 flex items-center justify-center text-white font-medium text-sm ${
                          idx === 0 ? 'bg-blue-600' :
                          idx === 1 ? 'bg-purple-600' :
                          idx === 2 ? 'bg-green-600' :
                          idx === 3 ? 'bg-yellow-600' :
                          'bg-orange-600'
                        }`}
                        style={{ width: `${width}%` }}
                      >
                        {stage.count > 0 && <span className="text-xs">{stage.count}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Conversion Rates Table */}
            <div className="border rounded-lg p-4 bg-muted/30">
              <h4 className="text-sm font-medium mb-3">Stage-to-Stage Conversion Rates</h4>
              <div className="space-y-2">
                {conversionRates.map((conv, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {conv.from} → {conv.to}
                    </span>
                    <span className={`font-medium ${
                      conv.rate >= 80 ? 'text-green-600 dark:text-green-400' :
                      conv.rate >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                      'text-red-600 dark:text-red-400'
                    }`}>
                      {formatPercentage(conv.rate)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Overall Conversion */}
            <div className="mt-4 text-center p-4 border rounded-lg bg-primary/5">
              <div className="text-sm text-muted-foreground mb-1">Overall Conversion Rate</div>
              <div className="text-3xl font-bold">
                {formatPercentage(data.prospects > 0 ? (data.contacted / data.prospects) * 100 : 0)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Prospect to Contact
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default ConversionFunnelChart;
