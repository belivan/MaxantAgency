'use client';

/**
 * Compact Dashboard Stats
 * Inline metrics display for minimal dashboard
 */

import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils/format';
import { cn } from '@/lib/utils';

export interface StatItemData {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
  format?: 'number' | 'currency' | 'percent';
}

interface CompactStatsProps {
  stats: StatItemData[];
  loading?: boolean;
  className?: string;
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

export function CompactStats({ stats, loading = false, className }: CompactStatsProps) {
  if (loading) {
    return (
      <div className={cn("flex items-center gap-4 flex-wrap", className)}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-5 w-24 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-4 sm:gap-6 flex-wrap text-sm", className)}>
      {stats.map((stat, index) => (
        <div key={index} className="flex items-center gap-1.5">
          {stat.icon && (
            <span className="text-muted-foreground">{stat.icon}</span>
          )}
          <span className="font-semibold">{formatValue(stat.value, stat.format)}</span>
          <span className="text-muted-foreground">{stat.label}</span>
        </div>
      ))}
    </div>
  );
}

// Legacy exports for backward compatibility (can be removed later)
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

export function StatsCards({ stats }: { stats: StatCardData[] }) {
  const compactStats: StatItemData[] = stats.map(s => ({
    label: s.title.toLowerCase().replace('total ', ''),
    value: s.value,
    icon: s.icon,
    format: s.format
  }));
  return <CompactStats stats={compactStats} />;
}

