'use client';

/**
 * Priority Badge Component
 * Hot/Warm/Cold lead priority indicators
 */

import { Flame, Zap, Snowflake } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PriorityBadgeProps {
  priority: string | number;
  score?: number;
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
  showLabel?: boolean;
  className?: string;
}

const priorityConfig = {
  hot: {
    bg: 'bg-destructive/10',
    border: 'border-destructive/20',
    text: 'text-destructive',
    icon: Flame,
    label: 'Hot Lead',
    description: '75-100 points'
  },
  warm: {
    bg: 'bg-warning/10',
    border: 'border-warning/20',
    text: 'text-warning',
    icon: Zap,
    label: 'Warm Lead',
    description: '50-74 points'
  },
  cold: {
    bg: 'bg-primary/10',
    border: 'border-primary/20',
    text: 'text-primary',
    icon: Snowflake,
    label: 'Cold Lead',
    description: '0-49 points'
  }
};

const sizeConfig = {
  sm: {
    container: 'px-2 py-1.5 gap-1.5',
    icon: 'w-3.5 h-3.5',
    text: 'text-xs',
    score: 'text-xs'
  },
  md: {
    container: 'px-3 py-2 gap-2',
    icon: 'w-4 h-4',
    text: 'text-sm',
    score: 'text-xs'
  },
  lg: {
    container: 'px-4 py-2.5 gap-2',
    icon: 'w-5 h-5',
    text: 'text-base',
    score: 'text-sm'
  }
};

function getPriorityFromScore(score: number): keyof typeof priorityConfig {
  if (score >= 75) return 'hot';
  if (score >= 50) return 'warm';
  return 'cold';
}

function normalizePriority(priority: string | number): keyof typeof priorityConfig {
  if (typeof priority === 'number') {
    return getPriorityFromScore(priority);
  }

  const normalized = priority.toLowerCase();
  if (normalized in priorityConfig) {
    return normalized as keyof typeof priorityConfig;
  }

  return 'cold'; // default fallback
}

export function PriorityBadge({
  priority,
  score,
  size = 'md',
  showScore = false,
  showLabel = true,
  className
}: PriorityBadgeProps) {
  const priorityKey = normalizePriority(priority);
  const config = priorityConfig[priorityKey];
  const sizes = sizeConfig[size];
  const Icon = config.icon;

  // Split label into two lines (e.g., "Hot" and "Lead")
  const [firstWord, secondWord] = config.label.split(' ');

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-lg border font-semibold',
        config.bg,
        config.border,
        config.text,
        sizes.container,
        className
      )}
    >
      <Icon className={sizes.icon} />
      {showLabel && (
        <div className="flex flex-col leading-none text-center -space-y-0.5">
          <span className={sizes.text}>{firstWord}</span>
          <span className={sizes.text}>{secondWord}</span>
        </div>
      )}
      {showScore && score !== undefined && (
        <span className={cn('opacity-70', sizes.score)}>
          ({score})
        </span>
      )}
    </div>
  );
}

export function PriorityBadgeWithDetails({
  priority,
  score,
  size = 'md',
  className
}: PriorityBadgeProps) {
  const priorityKey = normalizePriority(priority);
  const config = priorityConfig[priorityKey];
  const sizes = sizeConfig[size];

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <PriorityBadge priority={priority} size={size} showLabel={false} />
      <div className="flex flex-col">
        <span className={cn('font-medium', config.text, sizes.text)}>
          {config.label}
        </span>
        {score !== undefined ? (
          <span className={cn('text-muted-foreground', sizes.score)}>
            {score}/100 points
          </span>
        ) : (
          <span className={cn('text-muted-foreground', sizes.score)}>
            {config.description}
          </span>
        )}
      </div>
    </div>
  );
}

export default PriorityBadge;
