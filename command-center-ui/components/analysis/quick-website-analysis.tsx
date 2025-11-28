'use client';

/**
 * Quick Website Analysis Component
 * Analyze a single website URL directly without requiring prospect selection
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Zap, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useTaskProgress } from '@/lib/contexts/task-progress-context';
import type { Lead } from '@/lib/types';

const analysisSchema = z.object({
  url: z.string()
    .url('Please enter a valid URL (must start with http:// or https://)')
    .min(10, 'URL too short')
    .max(200, 'URL too long'),
  company_name: z.string().optional(),
  industry: z.string().optional()
});

type AnalysisFormData = z.infer<typeof analysisSchema>;

interface QuickWebsiteAnalysisProps {
  selectedProjectId: string | null;
  disabled?: boolean;
  engineOffline?: boolean;
  onSuccess?: (lead: Lead) => void;
}

export function QuickWebsiteAnalysis({
  selectedProjectId,
  disabled = false,
  engineOffline = false,
  onSuccess
}: QuickWebsiteAnalysisProps) {
  const [result, setResult] = useState<Lead | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<{ cost: number; time: number } | null>(null);

  const { startTask, updateTask, addLog: addTaskLog, completeTask, errorTask } = useTaskProgress();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<AnalysisFormData>({
    resolver: zodResolver(analysisSchema),
    defaultValues: {
      url: '',
      company_name: '',
      industry: ''
    }
  });

  const onSubmit = async (data: AnalysisFormData) => {
    if (!selectedProjectId) {
      setError('Please select a project first');
      return;
    }

    setError(null);
    setResult(null);
    setMetadata(null);

    const taskId = startTask('analysis', `Analyzing: ${data.url}`, 1);
    addTaskLog(taskId, 'Starting website analysis...', 'info');

    try {
      const API_BASE = process.env.NEXT_PUBLIC_ANALYSIS_API || 'http://localhost:3001';

      const requestBody = {
        url: data.url,
        company_name: data.company_name || undefined,
        industry: data.industry || undefined,
        project_id: selectedProjectId,
        max_pages: 5  // Default for quick analysis
      };

      addTaskLog(taskId, 'Crawling website and capturing screenshots...', 'info');

      const startTime = Date.now();
      const response = await fetch(`${API_BASE}/api/analyze-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      const analysisResult = await response.json();
      const duration = Date.now() - startTime;

      if (!analysisResult.success || !analysisResult.lead) {
        throw new Error('Analysis failed to generate results');
      }

      const lead = analysisResult.lead;
      setResult(lead);
      setMetadata({
        cost: analysisResult.cost || 0.033,
        time: duration
      });

      addTaskLog(taskId, `Analysis complete! Grade: ${lead.grade}`, 'success');
      completeTask(taskId);

      // Call success callback
      if (onSuccess) {
        onSuccess(lead);
      }

      // Clear form
      reset();

    } catch (err: any) {
      let errorMessage = err.message || 'Failed to analyze website';

      // Enhance error messages
      if (errorMessage.toLowerCase().includes('not found') || errorMessage.toLowerCase().includes('unreachable')) {
        errorMessage = 'website_unreachable';
      } else if (errorMessage.toLowerCase().includes('timeout')) {
        errorMessage = 'timeout';
      }

      setError(errorMessage);
      addTaskLog(taskId, errorMessage === 'website_unreachable' ? 'Website is unreachable' : errorMessage, 'error');
      errorTask(taskId, errorMessage === 'website_unreachable' ? 'Website is unreachable' : errorMessage);
    }
  };

  const isDisabled = disabled || engineOffline || isSubmitting || !selectedProjectId;

  // Grade color mapping
  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'bg-green-500 text-white';
      case 'B': return 'bg-blue-500 text-white';
      case 'C': return 'bg-yellow-500 text-white';
      case 'D': return 'bg-orange-500 text-white';
      case 'F': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Zap className="w-4 h-4" />
          <span>Quick Analysis</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {/* Warnings */}
        {!selectedProjectId && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs text-amber-700 dark:text-amber-400">Select project first from Filters</span>
          </div>
        )}
        {engineOffline && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50">
            <AlertCircle className="h-3.5 w-3.5 text-red-500" />
            <span className="text-xs text-red-700 dark:text-red-400">Analysis engine offline</span>
          </div>
        )}

        {/* Analysis Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          {/* URL Input */}
          <div className="space-y-1.5">
            <div className="flex gap-2">
              <Input
                id="url"
                type="url"
                placeholder="https://example.com"
                {...register('url')}
                disabled={isDisabled}
                className="flex-1 h-9 text-sm"
              />
              <Button
                type="submit"
                disabled={isDisabled}
                size="sm"
                className="h-9 px-3"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
              </Button>
            </div>
            {errors.url && (
              <p className="text-xs text-destructive">{errors.url.message}</p>
            )}
            <p className="text-[11px] text-muted-foreground">
              ~15 sec · ~$0.03
            </p>
          </div>

          {/* Optional Fields (Collapsed by default) */}
          <details className="space-y-2">
            <summary className="text-xs font-medium cursor-pointer hover:underline text-muted-foreground">
              + Company Details (optional)
            </summary>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Input
                id="company_name"
                placeholder="Company"
                {...register('company_name')}
                disabled={isDisabled}
                className="h-8 text-xs"
              />
              <Input
                id="industry"
                placeholder="Industry"
                {...register('industry')}
                disabled={isDisabled}
                className="h-8 text-xs"
              />
            </div>
          </details>
        </form>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            {error === 'website_unreachable' ? (
              <>
                <AlertTitle>Website Unreachable</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>We couldn't access this website. This could be because:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2 text-sm">
                    <li>The website is down or offline</li>
                    <li>The URL is incorrect</li>
                    <li>The website blocks automated access</li>
                    <li>There's a network connectivity issue</li>
                  </ul>
                  <p className="text-xs mt-2">
                    <strong>Tip:</strong> Try verifying the URL in your browser first
                  </p>
                </AlertDescription>
              </>
            ) : error === 'timeout' ? (
              <>
                <AlertTitle>Analysis Timeout</AlertTitle>
                <AlertDescription>
                  The website took too long to respond. Please try again or try a different website.
                </AlertDescription>
              </>
            ) : (
              <AlertDescription>{error}</AlertDescription>
            )}
          </Alert>
        )}

        {/* Results Display */}
        {result && (
          <div className="space-y-2.5 p-3 border rounded-lg bg-muted/30">
            {/* Success Header with Grade */}
            <div className="flex items-start gap-2.5">
              <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-lg flex items-center justify-center flex-shrink-0 ${getGradeColor(result.grade || 'F')}`}>
                <span className="text-2xl sm:text-3xl font-bold">{result.grade || 'F'}</span>
              </div>
              <div className="flex-1 min-w-0 space-y-0.5">
                <h3 className="font-semibold text-sm sm:text-base truncate">{result.company_name}</h3>
                <a
                  href={result.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] sm:text-xs text-blue-600 hover:underline truncate block"
                >
                  {result.website}
                </a>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {result.industry && (
                    <Badge variant="secondary" className="text-[10px]">{result.industry}</Badge>
                  )}
                  {result.priority_tier && (
                    <Badge variant={
                      result.priority_tier === 'hot' ? 'destructive' :
                      result.priority_tier === 'warm' ? 'default' : 'secondary'
                    } className="text-[10px]">{result.priority_tier.toUpperCase()}</Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Scores - Compact 2x2 Grid */}
            <div className="grid grid-cols-4 gap-1.5 text-xs">
              <div className="p-1.5 bg-background rounded border text-center">
                <div className="text-muted-foreground text-[10px]">Score</div>
                <div className="font-semibold">{result.overall_score || 0}</div>
              </div>
              {result.design_score !== undefined && (
                <div className="p-1.5 bg-background rounded border text-center">
                  <div className="text-muted-foreground text-[10px]">Design</div>
                  <div className="font-semibold">{result.design_score}</div>
                </div>
              )}
              {result.seo_score !== undefined && (
                <div className="p-1.5 bg-background rounded border text-center">
                  <div className="text-muted-foreground text-[10px]">SEO</div>
                  <div className="font-semibold">{result.seo_score}</div>
                </div>
              )}
              {result.content_score !== undefined && (
                <div className="p-1.5 bg-background rounded border text-center">
                  <div className="text-muted-foreground text-[10px]">Content</div>
                  <div className="font-semibold">{result.content_score}</div>
                </div>
              )}
            </div>

            {/* Quick Wins & Metadata */}
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              {result.quick_wins && result.quick_wins.length > 0 ? (
                <span className="text-green-600">{result.quick_wins.length} quick wins found</span>
              ) : <span />}
              {metadata && (
                <span>${metadata.cost.toFixed(3)} · {(metadata.time / 1000).toFixed(1)}s</span>
              )}
            </div>

            {/* Success Message */}
            <div className="text-[11px] text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950 px-2 py-1.5 rounded">
              Added to leads table
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
