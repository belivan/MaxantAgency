'use client';

/**
 * Grade Badge Component
 * Displays lead grade (A/B/C/D/F) with color coding
 */

import { cn } from '@/lib/utils';
import type { LeadGrade } from '@/lib/types';

interface GradeBadgeProps {
  grade: LeadGrade;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const GRADE_CONFIG: Record<LeadGrade, { color: string; label: string; bgColor: string }> = {
  A: {
    color: 'text-green-700 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-950 border-green-600',
    label: 'Excellent'
  },
  B: {
    color: 'text-blue-700 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-950 border-blue-600',
    label: 'Good'
  },
  C: {
    color: 'text-yellow-700 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-950 border-yellow-600',
    label: 'Average'
  },
  D: {
    color: 'text-orange-700 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-950 border-orange-600',
    label: 'Below Average'
  },
  F: {
    color: 'text-red-700 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-950 border-red-600',
    label: 'Poor'
  }
};

const SIZE_CONFIG = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-3 py-1',
  lg: 'text-base px-4 py-1.5'
};

export function GradeBadge({ grade, size = 'md', showLabel = false }: GradeBadgeProps) {
  // Safety check: if grade is invalid or missing, default to 'F'
  const normalizedGrade = (grade?.toString().toUpperCase() || 'F') as LeadGrade;
  const config = GRADE_CONFIG[normalizedGrade] || GRADE_CONFIG['F'];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-bold rounded-md border',
        config.bgColor,
        config.color,
        SIZE_CONFIG[size]
      )}
    >
      <span>Grade {normalizedGrade}</span>
      {showLabel && <span className="font-normal">· {config.label}</span>}
    </span>
  );
}

export default GradeBadge;
