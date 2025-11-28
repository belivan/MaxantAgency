'use client';

/**
 * Compact Grade Distribution
 * Minimal segmented bar showing lead quality distribution
 */

import { cn } from '@/lib/utils';

interface GradeDistributionProps {
  gradeA: number;
  gradeB: number;
  gradeC: number;
  gradeD: number;
  gradeF: number;
  loading?: boolean;
  className?: string;
}

const GRADE_COLORS = {
  A: 'bg-green-500',
  B: 'bg-blue-500',
  C: 'bg-yellow-500',
  D: 'bg-orange-500',
  F: 'bg-red-500',
};

const GRADE_DOT_COLORS = {
  A: 'bg-green-500',
  B: 'bg-blue-500',
  C: 'bg-yellow-500',
  D: 'bg-orange-500',
  F: 'bg-red-500',
};

export function GradeDistribution({
  gradeA = 0,
  gradeB = 0,
  gradeC = 0,
  gradeD = 0,
  gradeF = 0,
  loading = false,
  className
}: GradeDistributionProps) {
  const total = gradeA + gradeB + gradeC + gradeD + gradeF;

  const grades = [
    { grade: 'A', count: gradeA, pct: total > 0 ? (gradeA / total) * 100 : 0 },
    { grade: 'B', count: gradeB, pct: total > 0 ? (gradeB / total) * 100 : 0 },
    { grade: 'C', count: gradeC, pct: total > 0 ? (gradeC / total) * 100 : 0 },
    { grade: 'D', count: gradeD, pct: total > 0 ? (gradeD / total) * 100 : 0 },
    { grade: 'F', count: gradeF, pct: total > 0 ? (gradeF / total) * 100 : 0 },
  ];

  if (loading) {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="h-4 w-32 bg-muted animate-pulse rounded" />
        <div className="h-3 bg-muted animate-pulse rounded-full" />
        <div className="h-4 w-48 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Lead Quality</span>
          <span className="text-muted-foreground">0 leads</span>
        </div>
        <div className="h-3 bg-muted rounded-full" />
        <p className="text-xs text-muted-foreground">No analyzed leads yet</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Header */}
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Lead Quality</span>
        <span className="text-muted-foreground">{total} leads</span>
      </div>

      {/* Segmented Bar */}
      <div className="h-3 flex rounded-full overflow-hidden bg-muted">
        {grades.map(({ grade, pct }) =>
          pct > 0 && (
            <div
              key={grade}
              className={cn("transition-all duration-300", GRADE_COLORS[grade as keyof typeof GRADE_COLORS])}
              style={{ width: `${pct}%` }}
              title={`Grade ${grade}: ${pct.toFixed(0)}%`}
            />
          )
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {grades.map(({ grade, count }) => (
          <span key={grade} className="flex items-center gap-1">
            <span className={cn("w-2 h-2 rounded-full", GRADE_DOT_COLORS[grade as keyof typeof GRADE_DOT_COLORS])} />
            <span className="font-medium text-foreground">{grade}</span>
            <span>{count}</span>
          </span>
        ))}
      </div>
    </div>
  );
}