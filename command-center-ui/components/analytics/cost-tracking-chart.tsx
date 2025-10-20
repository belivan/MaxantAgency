'use client';

/**
 * Cost Tracking Chart
 * Visualize costs across the pipeline stages
 */

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/format';

interface CostData {
  stage: string;
  prospecting: number;
  analysis: number;
  outreach: number;
  total: number;
}

interface CostTrackingChartProps {
  data: CostData[];
  loading?: boolean;
}

export function CostTrackingChart({ data, loading }: CostTrackingChartProps) {
  // Calculate totals
  const totalCost = data.reduce((sum, item) => sum + item.total, 0);
  const totalProspecting = data.reduce((sum, item) => sum + item.prospecting, 0);
  const totalAnalysis = data.reduce((sum, item) => sum + item.analysis, 0);
  const totalOutreach = data.reduce((sum, item) => sum + item.outreach, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Cost Breakdown
            </CardTitle>
            <CardDescription>
              Costs across pipeline stages over time
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{formatCurrency(totalCost)}</div>
            <div className="text-xs text-muted-foreground">Total Spend</div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Loading chart data...
          </div>
        ) : data.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No cost data available
          </div>
        ) : (
          <>
            {/* Chart */}
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="stage"
                  className="text-xs"
                />
                <YAxis
                  className="text-xs"
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Legend />
                <Bar
                  dataKey="prospecting"
                  name="Prospecting"
                  fill="hsl(var(--chart-1))"
                  stackId="a"
                />
                <Bar
                  dataKey="analysis"
                  name="Analysis"
                  fill="hsl(var(--chart-2))"
                  stackId="a"
                />
                <Bar
                  dataKey="outreach"
                  name="Outreach"
                  fill="hsl(var(--chart-3))"
                  stackId="a"
                />
              </BarChart>
            </ResponsiveContainer>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t">
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-1">Prospecting</div>
                <div className="text-lg font-bold" style={{ color: 'hsl(var(--chart-1))' }}>
                  {formatCurrency(totalProspecting)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-1">Analysis</div>
                <div className="text-lg font-bold" style={{ color: 'hsl(var(--chart-2))' }}>
                  {formatCurrency(totalAnalysis)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-1">Outreach</div>
                <div className="text-lg font-bold" style={{ color: 'hsl(var(--chart-3))' }}>
                  {formatCurrency(totalOutreach)}
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default CostTrackingChart;
