'use client';

/**
 * Analytics Stats Cards
 * Display key pipeline metrics
 */

import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatNumber, formatPercentage } from '@/lib/utils/format';

interface AnalyticsStat {
  label: string;
  value: string | number;
  change?: number; // percentage change
  format?: 'number' | 'currency' | 'percentage';
}

interface AnalyticsStatsProps {
  stats: AnalyticsStat[];
}

export function AnalyticsStats({ stats }: AnalyticsStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, idx) => {
        const hasChange = stat.change !== undefined;
        const isPositive = hasChange && stat.change! > 0;
        const isNegative = hasChange && stat.change! < 0;
        const isNeutral = hasChange && stat.change === 0;

        return (
          <Card key={idx}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              {hasChange && (
                <div className={`flex items-center text-xs ${
                  isPositive ? 'text-green-600 dark:text-green-400' :
                  isNegative ? 'text-red-600 dark:text-red-400' :
                  'text-muted-foreground'
                }`}>
                  {isPositive && <ArrowUpRight className="w-3 h-3 mr-0.5" />}
                  {isNegative && <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                  {isNeutral && <Minus className="w-3 h-3 mr-0.5" />}
                  {formatPercentage(Math.abs(stat.change!))}
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stat.format === 'currency' && typeof stat.value === 'number'
                  ? formatCurrency(stat.value)
                  : stat.format === 'percentage' && typeof stat.value === 'number'
                  ? formatPercentage(stat.value)
                  : stat.format === 'number' && typeof stat.value === 'number'
                  ? formatNumber(stat.value)
                  : stat.value}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default AnalyticsStats;
