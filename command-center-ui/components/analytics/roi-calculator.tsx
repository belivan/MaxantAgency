'use client';

/**
 * ROI Calculator Component
 * Calculate and display return on investment metrics
 */

import { useState } from 'react';
import { Calculator, TrendingUp } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency, formatPercentage } from '@/lib/utils/format';

interface ROICalculatorProps {
  totalCost: number;
  leadsGenerated: number;
  qualifiedLeads: number;
}

export function ROICalculator({
  totalCost,
  leadsGenerated,
  qualifiedLeads
}: ROICalculatorProps) {
  // User inputs for ROI calculation
  const [avgDealValue, setAvgDealValue] = useState<number>(5000);
  const [conversionRate, setConversionRate] = useState<number>(10); // percentage
  const [avgLifetimeValue, setAvgLifetimeValue] = useState<number>(15000);

  // Calculations
  const costPerLead = leadsGenerated > 0 ? totalCost / leadsGenerated : 0;
  const costPerQualifiedLead = qualifiedLeads > 0 ? totalCost / qualifiedLeads : 0;

  const expectedConversions = qualifiedLeads * (conversionRate / 100);
  const expectedRevenue = expectedConversions * avgDealValue;
  const expectedLTV = expectedConversions * avgLifetimeValue;

  const roi = totalCost > 0 ? ((expectedRevenue - totalCost) / totalCost) * 100 : 0;
  const ltvRoi = totalCost > 0 ? ((expectedLTV - totalCost) / totalCost) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          ROI Calculator
        </CardTitle>
        <CardDescription>
          Project your return on investment based on conversion estimates
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Cost Metrics */}
        <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/30">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Total Cost</div>
            <div className="text-lg font-bold">{formatCurrency(totalCost)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Cost per Lead</div>
            <div className="text-lg font-bold">{formatCurrency(costPerLead)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Qualified Leads</div>
            <div className="text-lg font-bold">{qualifiedLeads}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Cost per Qualified</div>
            <div className="text-lg font-bold">{formatCurrency(costPerQualifiedLead)}</div>
          </div>
        </div>

        {/* User Inputs */}
        <div className="space-y-4 p-4 border rounded-lg">
          <h4 className="text-sm font-medium">Conversion Assumptions</h4>

          <div className="space-y-2">
            <Label htmlFor="dealValue">Average Deal Value</Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
              <Input
                id="dealValue"
                type="number"
                value={avgDealValue}
                onChange={(e) => setAvgDealValue(Number(e.target.value))}
                className="pl-7"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="conversionRate">Expected Conversion Rate</Label>
            <div className="relative">
              <Input
                id="conversionRate"
                type="number"
                value={conversionRate}
                onChange={(e) => setConversionRate(Number(e.target.value))}
                className="pr-8"
              />
              <span className="absolute right-3 top-2.5 text-muted-foreground">%</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ltv">Average Customer Lifetime Value</Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
              <Input
                id="ltv"
                type="number"
                value={avgLifetimeValue}
                onChange={(e) => setAvgLifetimeValue(Number(e.target.value))}
                className="pl-7"
              />
            </div>
          </div>
        </div>

        {/* ROI Results */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Projected Results</h4>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 border rounded-lg bg-background">
              <div className="text-xs text-muted-foreground mb-1">Expected Conversions</div>
              <div className="text-xl font-bold">{expectedConversions.toFixed(1)}</div>
            </div>
            <div className="p-3 border rounded-lg bg-background">
              <div className="text-xs text-muted-foreground mb-1">Expected Revenue</div>
              <div className="text-xl font-bold">{formatCurrency(expectedRevenue)}</div>
            </div>
          </div>

          {/* ROI Indicators */}
          <div className={`p-4 rounded-lg border-2 ${
            roi > 0 ? 'bg-green-50 dark:bg-green-950/20 border-green-600' :
            'bg-red-50 dark:bg-red-950/20 border-red-600'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium mb-1">
                  Short-term ROI
                </div>
                <div className={`text-3xl font-bold ${
                  roi > 0 ? 'text-green-700 dark:text-green-400' :
                  'text-red-700 dark:text-red-400'
                }`}>
                  {roi > 0 ? '+' : ''}{formatPercentage(roi)}
                </div>
              </div>
              <TrendingUp className={`w-8 h-8 ${
                roi > 0 ? 'text-green-600' : 'text-red-600'
              }`} />
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Based on initial deal value
            </div>
          </div>

          <div className={`p-4 rounded-lg border-2 ${
            ltvRoi > 0 ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-600' :
            'bg-red-50 dark:bg-red-950/20 border-red-600'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium mb-1">
                  Lifetime Value ROI
                </div>
                <div className={`text-3xl font-bold ${
                  ltvRoi > 0 ? 'text-blue-700 dark:text-blue-400' :
                  'text-red-700 dark:text-red-400'
                }`}>
                  {ltvRoi > 0 ? '+' : ''}{formatPercentage(ltvRoi)}
                </div>
              </div>
              <TrendingUp className={`w-8 h-8 ${
                ltvRoi > 0 ? 'text-blue-600' : 'text-red-600'
              }`} />
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Based on customer lifetime value
            </div>
          </div>

          <div className="p-3 border rounded-lg bg-muted/30 text-xs text-muted-foreground">
            💡 Tip: Adjust the conversion assumptions above to model different scenarios
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ROICalculator;
