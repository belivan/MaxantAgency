'use client';

/**
 * Priority Badge Component
 * Displays lead priority (Hot/Warm/Cold) based on lead_priority score
 */

import { cn } from '@/lib/utils';
import { Flame, Star, Snowflake } from 'lucide-react';

export type LeadPriority = 'hot' | 'warm' | 'cold';

interface PriorityBadgeProps {
  priority: number; // 0-100 score
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

/**
 * Calculate priority tier from score
 * Hot: 75-100, Warm: 50-74, Cold: 0-49
 */
export function getPriorityTier(score: number): LeadPriority {
  if (score >= 75) return 'hot';
  if (score >= 50) return 'warm';
  return 'cold';
}

const PRIORITY_CONFIG: Record<LeadPriority, {
  icon: typeof Flame;
  color: string;
  bgColor: string;
  label: string;
  emoji: string;
}> = {
  hot: {
    icon: Flame,
    emoji: '🔥',
    color: 'text-red-700 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-950 border-red-600',
    label: 'Hot Lead'
  },
  warm: {
    icon: Star,
    emoji: '⭐',
    color: 'text-yellow-700 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-950 border-yellow-600',
    label: 'Warm Lead'
  },
  cold: {
    icon: Snowflake,
    emoji: '💤',
    color: 'text-blue-700 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-950 border-blue-600',
    label: 'Cold Lead'
  }
};

const SIZE_CONFIG = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-3 py-1',
  lg: 'text-base px-4 py-1.5'
};

export function PriorityBadge({ priority, size = 'md', showLabel = false }: PriorityBadgeProps) {
  // Safety check: clamp priority to 0-100
  const normalizedPriority = Math.max(0, Math.min(100, priority || 0));
  const tier = getPriorityTier(normalizedPriority);
  const config = PRIORITY_CONFIG[tier];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-md border',
        config.bgColor,
        config.color,
        SIZE_CONFIG[size]
      )}
      aria-label={`${config.label}: ${normalizedPriority}/100`}
      title={`Priority Score: ${normalizedPriority}/100`}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} />
      <span>{showLabel ? config.label : normalizedPriority}</span>
    </span>
  );
}

export default PriorityBadge;
