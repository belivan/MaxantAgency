'use client';

/**
 * Dimension Radar Chart Component
 * Visualizes 6-dimension lead scoring on a radar/polar chart
 */

import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Award, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DimensionScore {
  name: string;
  score: number;
  max: number;
  percentage: number;
  color: string;
}

interface DimensionRadarChartProps {
  dimensions: DimensionScore[];
  className?: string;
  showCard?: boolean;
}

export function DimensionRadarChart({ dimensions, className, showCard = true }: DimensionRadarChartProps) {
  // Transform data for radar chart - convert to percentages for consistent scaling
  const chartData = dimensions.map(dim => ({
    dimension: dim.name,
    score: dim.percentage,
    fullMark: 100,
    // Include raw data for tooltip
    rawScore: dim.score,
    maxScore: dim.max
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-semibold text-sm">{data.dimension}</p>
          <p className="text-sm text-muted-foreground">
            Score: <span className="font-mono font-bold">{data.rawScore}/{data.maxScore}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Percentage: <span className="font-mono font-bold">{Math.round(data.score)}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const ChartContent = () => (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={400}>
        <RadarChart data={chartData}>
          <PolarGrid strokeDasharray="3 3" className="stroke-muted" />
          <PolarAngleAxis
            dataKey="dimension"
            className="text-xs"
            tick={{ fill: 'currentColor', fontSize: 12 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: 'currentColor', fontSize: 10 }}
            tickFormatter={(value) => `${value}%`}
          />
          <Radar
            name="Score"
            dataKey="score"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.6}
            strokeWidth={2}
          />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>

      {/* Legend showing individual scores */}
      <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
        {dimensions.map((dim, idx) => (
          <div key={idx} className="flex items-center justify-between p-2 bg-muted/30 rounded">
            <span className="font-medium">{dim.name}</span>
            <span className="font-mono font-bold">
              {dim.score}/{dim.max}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  if (!showCard) {
    return <ChartContent />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="w-5 h-5 text-purple-500" />
          Scoring Dimensions
        </CardTitle>
        <CardDescription>
          6-factor framework for lead priority assessment
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContent />

        {/* Info tooltip */}
        <div className="flex items-start gap-2 mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg text-xs">
          <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-blue-900 dark:text-blue-100">
            <strong>How to read:</strong> Larger area = higher scores across dimensions.
            Each axis represents a different scoring factor with its maximum value.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default DimensionRadarChart;
