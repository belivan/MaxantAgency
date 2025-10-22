'use client';

/**
 * Grade Distribution Chart Component
 * Visual representation of lead quality distribution (A-F grades)
 */

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Trophy, TrendingUp, AlertCircle, AlertTriangle, XCircle } from 'lucide-react';

interface GradeData {
  grade: string;
  count: number;
  percentage: number;
  description: string;
}

interface GradeDistributionProps {
  gradeA: number;
  gradeB: number;
  gradeC: number;
  gradeD: number;
  gradeF: number;
  loading?: boolean;
  className?: string;
}

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

  const grades: GradeData[] = [
    {
      grade: 'A',
      count: gradeA,
      percentage: total > 0 ? (gradeA / total) * 100 : 0,
      description: 'Excellent (85-100)'
    },
    {
      grade: 'B',
      count: gradeB,
      percentage: total > 0 ? (gradeB / total) * 100 : 0,
      description: 'Good (70-84)'
    },
    {
      grade: 'C',
      count: gradeC,
      percentage: total > 0 ? (gradeC / total) * 100 : 0,
      description: 'Needs Work (55-69)'
    },
    {
      grade: 'D',
      count: gradeD,
      percentage: total > 0 ? (gradeD / total) * 100 : 0,
      description: 'Poor (40-54)'
    },
    {
      grade: 'F',
      count: gradeF,
      percentage: total > 0 ? (gradeF / total) * 100 : 0,
      description: 'Failing (0-39)'
    }
  ];

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A':
        return 'bg-green-500 dark:bg-green-600';
      case 'B':
        return 'bg-blue-500 dark:bg-blue-600';
      case 'C':
        return 'bg-yellow-500 dark:bg-yellow-600';
      case 'D':
        return 'bg-orange-500 dark:bg-orange-600';
      case 'F':
        return 'bg-red-500 dark:bg-red-600';
      default:
        return 'bg-gray-500';
    }
  };

  const getGradeIcon = (grade: string) => {
    switch (grade) {
      case 'A':
        return <Trophy className="w-4 h-4" />;
      case 'B':
        return <TrendingUp className="w-4 h-4" />;
      case 'C':
        return <AlertCircle className="w-4 h-4" />;
      case 'D':
        return <AlertTriangle className="w-4 h-4" />;
      case 'F':
        return <XCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  // Find the grade with highest count for highlighting
  const maxCount = Math.max(...grades.map(g => g.count));

  return (
    <Card className={cn("p-6", className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Grade Distribution</h3>
        <span className="text-sm text-muted-foreground">
          {total} total leads
        </span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-10 bg-muted rounded"></div>
            </div>
          ))}
        </div>
      ) : total === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No analyzed leads yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {grades.map((gradeData) => (
            <div
              key={gradeData.grade}
              className={cn(
                "relative group",
                gradeData.count === maxCount && maxCount > 0 && "scale-[1.02]"
              )}
            >
              <div className="flex items-center gap-3">
                {/* Grade Badge */}
                <div className="flex items-center gap-2 min-w-[60px]">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm",
                    getGradeColor(gradeData.grade)
                  )}>
                    {gradeData.grade}
                  </div>
                  {getGradeIcon(gradeData.grade)}
                </div>

                {/* Progress Bar */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">
                      {gradeData.description}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {gradeData.count}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({gradeData.percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <div className="h-6 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all duration-500 ease-out",
                        getGradeColor(gradeData.grade)
                      )}
                      style={{ width: `${gradeData.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Summary Stats */}
          <div className="pt-4 mt-4 border-t grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">High Quality (A+B)</p>
              <p className="text-lg font-semibold">
                {gradeA + gradeB} ({((gradeA + gradeB) / total * 100).toFixed(0)}%)
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Needs Improvement (C+D+F)</p>
              <p className="text-lg font-semibold">
                {gradeC + gradeD + gradeF} ({((gradeC + gradeD + gradeF) / total * 100).toFixed(0)}%)
              </p>
            </div>
          </div>

          {/* Best Lead Opportunity */}
          {gradeC + gradeD > 0 && (
            <div className="mt-4 p-3 bg-yellow-500/10 dark:bg-yellow-600/10 rounded-lg border border-yellow-500/20">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-500" />
                <div className="text-sm">
                  <span className="font-medium">Opportunity: </span>
                  <span className="text-muted-foreground">
                    {gradeC + gradeD} websites ({((gradeC + gradeD) / total * 100).toFixed(0)}%)
                    are prime candidates for web design services
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}