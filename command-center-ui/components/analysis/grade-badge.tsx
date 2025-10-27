'use client';

/**
 * Grade Badge Component
 * Beautiful letter grade badges (A-F) with color coding
 */

import { cn } from '@/lib/utils';

interface GradeBadgeProps {
  grade: string;
  score?: number;
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
  className?: string;
}

const gradeConfig = {
  A: {
    bg: 'bg-success/10',
    border: 'border-success/20',
    text: 'text-success',
    label: 'Excellent'
  },
  B: {
    bg: 'bg-primary/10',
    border: 'border-primary/20',
    text: 'text-primary',
    label: 'Good'
  },
  C: {
    bg: 'bg-warning/10',
    border: 'border-warning/20',
    text: 'text-warning',
    label: 'Needs Work'
  },
  D: {
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    text: 'text-orange-600',
    label: 'Poor'
  },
  F: {
    bg: 'bg-destructive/10',
    border: 'border-destructive/20',
    text: 'text-destructive',
    label: 'Failing'
  }
};

const sizeConfig = {
  sm: {
    container: 'h-7 px-2.5',
    grade: 'text-sm',
    score: 'text-xs',
    label: 'text-xs'
  },
  md: {
    container: 'h-9 px-3',
    grade: 'text-base',
    score: 'text-sm',
    label: 'text-sm'
  },
  lg: {
    container: 'h-12 px-4',
    grade: 'text-xl',
    score: 'text-base',
    label: 'text-base'
  }
};

export function GradeBadge({
  grade,
  score,
  size = 'md',
  showScore = false,
  className
}: GradeBadgeProps) {
  const normalizedGrade = grade.toUpperCase() as keyof typeof gradeConfig;
  const config = gradeConfig[normalizedGrade] || gradeConfig.F;
  const sizes = sizeConfig[size];

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-lg border font-semibold',
        config.bg,
        config.border,
        config.text,
        sizes.container,
        className
      )}
    >
      <span className={cn('font-bold', sizes.grade)}>{normalizedGrade}</span>
      {showScore && score !== undefined && (
        <span className={cn('opacity-70', sizes.score)}>
          {score}/100
        </span>
      )}
    </div>
  );
}

export function GradeBadgeWithLabel({
  grade,
  score,
  size = 'md',
  className
}: GradeBadgeProps) {
  const normalizedGrade = grade.toUpperCase() as keyof typeof gradeConfig;
  const config = gradeConfig[normalizedGrade] || gradeConfig.F;
  const sizes = sizeConfig[size];

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <GradeBadge grade={grade} size={size} />
      <div className="flex flex-col">
        <span className={cn('font-medium', config.text, sizes.label)}>
          {config.label}
        </span>
        {score !== undefined && (
          <span className={cn('text-muted-foreground', sizes.score)}>
            {score}/100
          </span>
        )}
      </div>
    </div>
  );
}

export default GradeBadge;
