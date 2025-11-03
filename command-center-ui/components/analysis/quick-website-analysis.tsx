'use client';

/**
 * Quick Website Analysis Component
 * Analyze a single website URL directly without requiring prospect selection
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Zap, Loader2, CheckCircle2, Globe, TrendingUp, AlertCircle, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
        project_id: selectedProjectId
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
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Zap className="w-5 h-5" />
          <span>Quick Website Analysis</span>
        </CardTitle>
        <CardDescription>
          Analyze any website instantly with AI-powered analysis
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Project Warning */}
        {!selectedProjectId && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Project Required</AlertTitle>
            <AlertDescription>
              Please select a project below to continue
            </AlertDescription>
          </Alert>
        )}

        {/* Engine Offline Warning */}
        {engineOffline && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Analysis Engine Offline</AlertTitle>
            <AlertDescription>
              Please start the analysis engine (port 3001)
            </AlertDescription>
          </Alert>
        )}

        {/* Analysis Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* URL Input */}
          <div className="space-y-2">
            <Label htmlFor="url">
              Website URL <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="url"
                type="url"
                placeholder="https://example.com"
                {...register('url')}
                disabled={isDisabled}
                className="flex-1"
              />
              <Button
                type="submit"
                disabled={isDisabled}
                size="default"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
              </Button>
            </div>
            {errors.url && (
              <p className="text-sm text-destructive">{errors.url.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              <strong>Tip:</strong> Analysis takes 10-15 seconds and costs ~$0.03
            </p>
          </div>

          {/* Optional Fields (Collapsed by default) */}
          <details className="space-y-2">
            <summary className="text-sm font-medium cursor-pointer hover:underline">
              Optional: Company Details
            </summary>
            <div className="mt-3 space-y-3 pl-4">
              <div className="space-y-2">
                <Label htmlFor="company_name">Company Name</Label>
                <Input
                  id="company_name"
                  placeholder="Example Company"
                  {...register('company_name')}
                  disabled={isDisabled}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  placeholder="Technology"
                  {...register('industry')}
                  disabled={isDisabled}
                />
              </div>
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
          <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
            {/* Success Header with Grade */}
            <div className="flex items-start gap-3">
              <div className={`w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 ${getGradeColor(result.grade || 'F')}`}>
                <span className="text-3xl font-bold">{result.grade || 'F'}</span>
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="font-semibold text-lg">{result.company_name}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Globe className="w-3 h-3" />
                  <a
                    href={result.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline truncate"
                  >
                    {result.website}
                  </a>
                </div>
                {result.industry && (
                  <Badge variant="secondary">{result.industry}</Badge>
                )}
              </div>
            </div>

            {/* Scores */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center justify-between p-2 bg-background rounded border">
                <span className="text-muted-foreground">Overall</span>
                <span className="font-semibold">{result.overall_score || 0}/100</span>
              </div>
              {result.design_score !== undefined && (
                <div className="flex items-center justify-between p-2 bg-background rounded border">
                  <span className="text-muted-foreground">Design</span>
                  <span className="font-semibold">{result.design_score}/100</span>
                </div>
              )}
              {result.seo_score !== undefined && (
                <div className="flex items-center justify-between p-2 bg-background rounded border">
                  <span className="text-muted-foreground">SEO</span>
                  <span className="font-semibold">{result.seo_score}/100</span>
                </div>
              )}
              {result.content_score !== undefined && (
                <div className="flex items-center justify-between p-2 bg-background rounded border">
                  <span className="text-muted-foreground">Content</span>
                  <span className="font-semibold">{result.content_score}/100</span>
                </div>
              )}
            </div>

            {/* Quick Wins */}
            {result.quick_wins && result.quick_wins.length > 0 && (
              <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded">
                <Award className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-800 dark:text-green-200">
                  <strong>{result.quick_wins.length} Quick Wins</strong> identified
                </span>
              </div>
            )}

            {/* Priority Tier */}
            {result.priority_tier && (
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">
                  Lead Priority: <Badge variant={
                    result.priority_tier === 'hot' ? 'destructive' :
                    result.priority_tier === 'warm' ? 'default' : 'secondary'
                  }>{result.priority_tier.toUpperCase()}</Badge>
                </span>
              </div>
            )}

            {/* Cost & Time Info */}
            {metadata && (
              <div className="pt-2 border-t text-xs text-muted-foreground flex justify-between">
                <span>Cost: ${metadata.cost.toFixed(4)}</span>
                <span>Time: {(metadata.time / 1000).toFixed(1)}s</span>
              </div>
            )}

            {/* Success Message */}
            <Alert className="bg-green-50 dark:bg-green-950 border-green-600">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                <strong>{result.company_name}</strong> has been added to your leads table below.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
