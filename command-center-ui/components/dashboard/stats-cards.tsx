'use client';

/**
 * Dashboard Stats Cards
 * Displays key metrics from all engines
 */

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils/format';
import { cn } from '@/lib/utils';

export interface StatCardData {
  title: string;
  value: number | string;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  format?: 'number' | 'currency' | 'percent';
  subtitle?: string;
  loading?: boolean;
}

interface StatsCardsProps {
  stats: StatCardData[];
}

function getTrendIcon(change: number) {
  if (change > 0) return <TrendingUp className="w-4 h-4" />;
  if (change < 0) return <TrendingDown className="w-4 h-4" />;
  return <Minus className="w-4 h-4" />;
}

function getTrendColor(change: number) {
  if (change > 0) return 'text-green-600 dark:text-green-500';
  if (change < 0) return 'text-red-600 dark:text-red-500';
  return 'text-muted-foreground';
}

function formatValue(value: number | string, format?: 'number' | 'currency' | 'percent'): string {
  if (typeof value === 'string') return value;

  switch (format) {
    case 'currency':
      return formatCurrency(value);
    case 'percent':
      return formatPercent(value);
    case 'number':
    default:
      return formatNumber(value, { abbreviate: true });
  }
}

export function StatCard({ stat }: { stat: StatCardData }) {
  const formattedValue = formatValue(stat.value, stat.format);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {stat.title}
        </CardTitle>
        {stat.icon && (
          <div className="text-muted-foreground">
            {stat.icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <div className="text-2xl font-bold">
            {stat.loading ? (
              <div className="h-8 w-24 bg-muted animate-pulse rounded" />
            ) : (
              formattedValue
            )}
          </div>

          {stat.subtitle && (
            <p className="text-xs text-muted-foreground">
              {stat.subtitle}
            </p>
          )}

          {stat.change !== undefined && (
            <div className={cn('flex items-center space-x-1 text-xs', getTrendColor(stat.change))}>
              {getTrendIcon(stat.change)}
              <span>
                {stat.change > 0 && '+'}
                {stat.change}
                {stat.changeLabel && ` ${stat.changeLabel}`}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <StatCard key={index} stat={stat} />
      ))}
    </div>
  );
}

