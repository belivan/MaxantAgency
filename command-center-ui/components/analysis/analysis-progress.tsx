'use client';

/**
 * Analysis Progress Component
 * Shows real-time SSE progress for website analysis
 */

import { Activity, CheckCircle2, AlertCircle, ExternalLink, TrendingUp, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingProgress } from '@/components/shared/loading-spinner';
import { formatRelativeTime } from '@/lib/utils/format';
import { cn } from '@/lib/utils';
import { PriorityBadge, BudgetIndicatorBadge } from '@/components/leads';
import type { SSEStatus, LeadGrade } from '@/lib/types';

interface AnalysisStep {
  name: string;
  status: 'pending' | 'active' | 'completed' | 'error';
}

interface CurrentAnalysis {
  company_name: string;
  website: string;
  steps: AnalysisStep[];
}

interface CompletedLead {
  company_name: string;
  website: string;
  grade: LeadGrade;
  score: number;
  lead_priority?: number;
  priority_tier?: 'hot' | 'warm' | 'cold';
  budget_likelihood?: 'high' | 'medium' | 'low';
  timestamp: string;
}

interface AnalysisProgressProps {
  status: SSEStatus;
  progress?: {
    current: number;
    total: number;
  };
  currentAnalysis?: CurrentAnalysis;
  completedLeads: CompletedLead[];
  error?: string | null;
}

function getGradeColor(grade: LeadGrade): string {
  switch (grade) {
    case 'A':
      return 'text-green-600 dark:text-green-500 bg-green-100 dark:bg-green-950';
    case 'B':
      return 'text-blue-600 dark:text-blue-500 bg-blue-100 dark:bg-blue-950';
    case 'C':
      return 'text-yellow-600 dark:text-yellow-500 bg-yellow-100 dark:bg-yellow-950';
    case 'D':
      return 'text-orange-600 dark:text-orange-500 bg-orange-100 dark:bg-orange-950';
    case 'F':
      return 'text-red-600 dark:text-red-500 bg-red-100 dark:bg-red-950';
  }
}

function StepIndicator({ step }: { step: AnalysisStep }) {
  const statusIcons = {
    pending: <div className="w-4 h-4 rounded-full border-2 border-muted" />,
    active: <Activity className="w-4 h-4 text-primary animate-pulse" />,
    completed: <CheckCircle2 className="w-4 h-4 text-green-600" />,
    error: <AlertCircle className="w-4 h-4 text-destructive" />
  };

  return (
    <div className="flex items-center space-x-2">
      {statusIcons[step.status]}
      <span className={cn(
        'text-sm',
        step.status === 'active' && 'font-medium text-foreground',
        step.status === 'completed' && 'text-muted-foreground',
        step.status === 'pending' && 'text-muted-foreground',
        step.status === 'error' && 'text-destructive'
      )}>
        {step.name}
      </span>
    </div>
  );
}

function CompletedLeadItem({ lead }: { lead: CompletedLead }) {
  return (
    <div className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border">
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        {/* Grade Badge */}
        <Badge className={cn('font-bold text-xs', getGradeColor(lead.grade))}>
          {lead.grade}
        </Badge>

        {/* Company Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{lead.company_name}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">
              Grade: {lead.score}/100
            </span>
            {lead.lead_priority !== undefined && (
              <>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">
                  Priority: {lead.lead_priority}/100
                </span>
              </>
            )}
          </div>
        </div>

        {/* Priority & Budget Badges */}
        <div className="flex items-center gap-2">
          {lead.priority_tier && (
            <PriorityBadge priority={lead.lead_priority || 0} size="sm" />
          )}
          {lead.budget_likelihood && (
            <BudgetIndicatorBadge likelihood={lead.budget_likelihood} size="sm" />
          )}
        </div>
      </div>

      <a
        href={lead.website}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline ml-2"
      >
        <ExternalLink className="w-4 h-4" />
      </a>
    </div>
  );
}

export function AnalysisProgress({
  status,
  progress,
  currentAnalysis,
  completedLeads,
  error
}: AnalysisProgressProps) {
  const hasActivity = status !== 'idle' || completedLeads.length > 0;

  if (!hasActivity) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>Analysis Progress</span>
          </CardTitle>

          {status === 'connected' && (
            <Badge variant="default" className="flex items-center space-x-1">
              <Activity className="w-3 h-3 animate-pulse" />
              <span>Analyzing...</span>
            </Badge>
          )}
          {status === 'closed' && (
            <Badge variant="outline" className="flex items-center space-x-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Completed</span>
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Overall Progress */}
        {progress && (
          <LoadingProgress
            progress={progress.current}
            total={progress.total}
            label="Overall Progress"
          />
        )}

        {/* Error Message */}
        {error && (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-3">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">Analysis Error</p>
                <p className="text-xs text-destructive/80 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Current Analysis */}
        {currentAnalysis && status === 'connected' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Currently Analyzing</h4>
              <a
                href={currentAnalysis.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline inline-flex items-center space-x-1"
              >
                <span>{currentAnalysis.company_name}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="space-y-2 rounded-lg border p-4 bg-muted/50">
              {currentAnalysis.steps.map((step, index) => (
                <StepIndicator key={index} step={step} />
              ))}
            </div>
          </div>
        )}

        {/* Lead Priority Summary */}
        {completedLeads.length > 0 && status === 'closed' && (
          <div className="grid grid-cols-3 gap-3 p-4 rounded-lg bg-muted/50 border">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600 dark:text-red-500">
                {completedLeads.filter(l => (l.lead_priority || 0) >= 75).length}
              </div>
              <div className="text-xs text-muted-foreground mt-1">🔥 Hot Leads</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-500">
                {completedLeads.filter(l => {
                  const p = l.lead_priority || 0;
                  return p >= 50 && p < 75;
                }).length}
              </div>
              <div className="text-xs text-muted-foreground mt-1">⭐ Warm Leads</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-500">
                {completedLeads.filter(l => (l.lead_priority || 0) < 50).length}
              </div>
              <div className="text-xs text-muted-foreground mt-1">❄️ Cold Leads</div>
            </div>
          </div>
        )}

        {/* Completed Leads */}
        {completedLeads.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Completed</h4>
              <span className="text-xs text-muted-foreground">
                {completedLeads.length} lead{completedLeads.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-1">
              {completedLeads.map((lead, index) => (
                <CompletedLeadItem key={index} lead={lead} />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!currentAnalysis && completedLeads.length === 0 && !error && (
          <div className="text-center py-8">
            <Activity className="w-8 h-8 text-muted-foreground mx-auto mb-2 animate-pulse" />
            <p className="text-sm text-muted-foreground">
              Waiting for analysis to start...
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AnalysisProgress;
