'use client';

/**
 * Formatted AI Reasoning Component
 * Parses and beautifully formats the AI lead scoring explanation
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, TrendingUp, DollarSign, Clock, Target, Users, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FormattedAIReasoningProps {
  reasoning: string;
  leadPriority?: number;
  priorityTier?: string;
  budgetLikelihood?: string;
  fitScore?: number;
  className?: string;
}

export function FormattedAIReasoning({
  reasoning,
  leadPriority,
  priorityTier,
  budgetLikelihood,
  fitScore,
  className
}: FormattedAIReasoningProps) {
  // Parse the reasoning text into structured sections
  const parseReasoning = () => {
    const sections: {
      summary?: { priority?: string; fitScore?: string; budget?: string };
      dimensions?: string[];
      assessment?: string;
    } = {};

    const lines = reasoning.split('\n').map(l => l.trim()).filter(l => l);

    let currentSection: 'summary' | 'dimensions' | 'assessment' | null = null;

    for (const line of lines) {
      // Detect section headers
      if (line.includes('Lead Priority:') || line.includes('Fit Score:') || line.includes('Budget Likelihood:')) {
        currentSection = 'summary';
        if (!sections.summary) sections.summary = {};

        if (line.includes('Lead Priority:')) {
          sections.summary.priority = line;
        } else if (line.includes('Fit Score:')) {
          sections.summary.fitScore = line;
        } else if (line.includes('Budget Likelihood:')) {
          sections.summary.budget = line;
        }
      } else if (line.toUpperCase().includes('DIMENSION SCORES') || line.includes('SCORES:')) {
        currentSection = 'dimensions';
        sections.dimensions = [];
      } else if (line.toUpperCase().includes('AI ASSESSMENT') || line.toUpperCase().includes('ASSESSMENT:')) {
        currentSection = 'assessment';
        sections.assessment = '';
      } else {
        // Add content to current section
        if (currentSection === 'dimensions' && line.startsWith('-')) {
          sections.dimensions?.push(line.substring(1).trim());
        } else if (currentSection === 'assessment') {
          sections.assessment = sections.assessment
            ? `${sections.assessment} ${line}`
            : line;
        }
      }
    }

    return sections;
  };

  const sections = parseReasoning();

  // Dimension icons mapping
  const dimensionIcons: { [key: string]: any } = {
    'Quality Gap': TrendingUp,
    'Budget': DollarSign,
    'Urgency': Clock,
    'Industry Fit': Target,
    'Company Size': Users,
    'Engagement': Zap
  };

  const getDimensionIcon = (dimensionText: string) => {
    for (const [key, Icon] of Object.entries(dimensionIcons)) {
      if (dimensionText.includes(key)) {
        return Icon;
      }
    }
    return null;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-500" />
          AI Reasoning
        </CardTitle>
        <CardDescription>
          Why this lead received its priority score
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Badges */}
        {(leadPriority !== undefined || fitScore !== undefined || budgetLikelihood) && (
          <div className="flex flex-wrap gap-2 pb-4 border-b">
            {leadPriority !== undefined && (
              <Badge
                variant="outline"
                className={cn(
                  'px-3 py-1.5 text-sm font-semibold',
                  priorityTier === 'hot'
                    ? 'bg-red-50 dark:bg-red-950/20 border-red-600 text-red-700 dark:text-red-400'
                    : priorityTier === 'warm'
                    ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-600 text-yellow-700 dark:text-yellow-400'
                    : 'bg-blue-50 dark:bg-blue-950/20 border-blue-600 text-blue-700 dark:text-blue-400'
                )}
              >
                Priority: {leadPriority}/100
              </Badge>
            )}
            {fitScore !== undefined && (
              <Badge variant="outline" className="px-3 py-1.5 text-sm">
                Fit Score: {fitScore}/100
              </Badge>
            )}
            {budgetLikelihood && (
              <Badge
                variant="outline"
                className={cn(
                  'px-3 py-1.5 text-sm font-semibold',
                  budgetLikelihood.toLowerCase() === 'high'
                    ? 'bg-green-50 dark:bg-green-950/20 border-green-600 text-green-700 dark:text-green-400'
                    : budgetLikelihood.toLowerCase() === 'medium'
                    ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-600 text-yellow-700 dark:text-yellow-400'
                    : 'bg-gray-50 dark:bg-gray-950/20 border-gray-600 text-gray-700 dark:text-gray-400'
                )}
              >
                Budget: {budgetLikelihood.toUpperCase()}
              </Badge>
            )}
          </div>
        )}

        {/* Dimension Scores */}
        {sections.dimensions && sections.dimensions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">Dimension Breakdown</h4>
            <div className="space-y-1.5">
              {sections.dimensions.map((dim, idx) => {
                const Icon = getDimensionIcon(dim);
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-2 text-sm p-2 bg-muted/30 rounded"
                  >
                    {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
                    <span className="text-muted-foreground">{dim}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* AI Assessment */}
        {sections.assessment && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">AI Assessment</h4>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {sections.assessment}
            </p>
          </div>
        )}

        {/* Fallback: If parsing failed, show raw text */}
        {!sections.dimensions && !sections.assessment && (
          <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
            {reasoning}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default FormattedAIReasoning;
