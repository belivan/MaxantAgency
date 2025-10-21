'use client';

/**
 * Lead Details Card Component
 * Displays comprehensive lead scoring, business intelligence, and AI reasoning
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Flame,
  TrendingUp,
  DollarSign,
  Clock,
  Target,
  Users,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BudgetIndicatorBadge } from './business-intel-badges';
import { DimensionRadarChart } from './dimension-radar-chart';
import { FormattedAIReasoning } from './formatted-ai-reasoning';
import { BusinessIntelEnhanced } from './business-intel-enhanced';
import { CrawlVisualization } from './crawl-visualization';
import type { Lead } from '@/lib/types';

interface LeadDetailsCardProps {
  lead: Lead;
  className?: string;
}

export function LeadDetailsCard({ lead, className }: LeadDetailsCardProps) {
  const businessIntel = lead.business_intelligence;
  const crawlMeta = lead.crawl_metadata;

  // Calculate dimension score percentages
  const dimensions = [
    { name: 'Quality Gap', score: lead.quality_gap_score || 0, max: 25, percentage: ((lead.quality_gap_score || 0) / 25) * 100, icon: TrendingUp, color: 'text-blue-600' },
    { name: 'Budget', score: lead.budget_score || 0, max: 25, percentage: ((lead.budget_score || 0) / 25) * 100, icon: DollarSign, color: 'text-green-600' },
    { name: 'Urgency', score: lead.urgency_score || 0, max: 20, percentage: ((lead.urgency_score || 0) / 20) * 100, icon: Clock, color: 'text-orange-600' },
    { name: 'Industry Fit', score: lead.industry_fit_score || 0, max: 15, percentage: ((lead.industry_fit_score || 0) / 15) * 100, icon: Target, color: 'text-purple-600' },
    { name: 'Company Size', score: lead.company_size_score || 0, max: 10, percentage: ((lead.company_size_score || 0) / 10) * 100, icon: Users, color: 'text-indigo-600' },
    { name: 'Engagement', score: lead.engagement_score || 0, max: 5, percentage: ((lead.engagement_score || 0) / 5) * 100, icon: Zap, color: 'text-yellow-600' }
  ];

  return (
    <div className={cn('space-y-4', className)}>
      {/* Priority Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-red-500" />
            Lead Priority Summary
          </CardTitle>
          <CardDescription>AI-powered lead scoring and qualification</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {/* Lead Priority Score */}
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Lead Priority</div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{lead.lead_priority || 0}</span>
                <span className="text-muted-foreground">/100</span>
              </div>
              {lead.priority_tier && (
                <Badge
                  variant="outline"
                  className={cn(
                    'font-semibold',
                    lead.priority_tier === 'hot'
                      ? 'bg-red-50 dark:bg-red-950/20 border-red-600 text-red-700 dark:text-red-400'
                      : lead.priority_tier === 'warm'
                      ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-600 text-yellow-700 dark:text-yellow-400'
                      : 'bg-blue-50 dark:bg-blue-950/20 border-blue-600 text-blue-700 dark:text-blue-400'
                  )}
                >
                  {lead.priority_tier === 'hot' && '🔥 '}
                  {lead.priority_tier === 'warm' && '⭐ '}
                  {lead.priority_tier === 'cold' && '❄️ '}
                  {lead.priority_tier.toUpperCase()}
                </Badge>
              )}
            </div>

            {/* Budget Likelihood */}
            {lead.budget_likelihood && (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Budget Likelihood</div>
                <div className="pt-2">
                  <BudgetIndicatorBadge indicator={lead.budget_likelihood} size="md" />
                </div>
              </div>
            )}

            {/* Fit Score */}
            {lead.fit_score !== undefined && (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Fit Score</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">{lead.fit_score}</span>
                  <span className="text-muted-foreground">/100</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dimension Breakdown - Enhanced Radar Chart */}
      <DimensionRadarChart dimensions={dimensions} />

      {/* Business Intelligence - Enhanced with Sub-Sections */}
      {businessIntel && <BusinessIntelEnhanced businessIntel={businessIntel} />}

      {/* AI Reasoning - Formatted with Structure */}
      {lead.lead_priority_reasoning && (
        <FormattedAIReasoning
          reasoning={lead.lead_priority_reasoning}
          leadPriority={lead.lead_priority}
          priorityTier={lead.priority_tier}
          budgetLikelihood={lead.budget_likelihood}
          fitScore={lead.fit_score}
        />
      )}

      {/* Crawl Metadata - Enhanced Visualization */}
      {crawlMeta && <CrawlVisualization crawlMetadata={crawlMeta} maxPages={30} />}
    </div>
  );
}

export default LeadDetailsCard;
