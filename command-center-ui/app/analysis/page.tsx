'use client';

/**
 * Analysis Page
 * Analyze prospects and convert to leads
 */

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ProspectSelector, AnalysisConfig, AnalysisProgress } from '@/components/analysis';
import { LoadingOverlay } from '@/components/shared';
import { useSSE, useEngineHealth } from '@/lib/hooks';
import { analyzeProspects } from '@/lib/api';
import type { AnalysisOptionsFormData, SSEMessage, LeadGrade } from '@/lib/types';

interface CurrentAnalysis {
  company_name: string;
  website: string;
  steps: Array<{
    name: string;
    status: 'pending' | 'active' | 'completed' | 'error';
  }>;
}

interface CompletedLead {
  company_name: string;
  website: string;
  grade: LeadGrade;
  score: number;
  timestamp: string;
}

export default function AnalysisPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const engineStatus = useEngineHealth();

  // Get pre-selected prospect IDs from URL
  const preSelectedIds = searchParams.get('prospect_ids')?.split(',') || [];

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [sseUrl, setSseUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
  } | undefined>();
  const [currentAnalysis, setCurrentAnalysis] = useState<CurrentAnalysis | undefined>();
  const [completedLeads, setCompletedLeads] = useState<CompletedLead[]>([]);

  // SSE connection
  const { status, error: sseError } = useSSE({
    url: sseUrl,
    onMessage: (message: SSEMessage<any>) => {
      console.log('SSE Message:', message);

      if (message.type === 'progress') {
        // Update progress bar
        setProgress({
          current: message.data.current || 0,
          total: message.data.total || 100
        });

        // Update current analysis
        if (message.data.currentSite) {
          setCurrentAnalysis({
            company_name: message.data.currentSite.company_name,
            website: message.data.currentSite.website,
            steps: message.data.currentSite.steps || []
          });
        }
      } else if (message.type === 'log') {
        // Handle individual site completion
        if (message.data.lead) {
          setCompletedLeads(prev => [
            {
              company_name: message.data.lead.company_name,
              website: message.data.lead.website,
              grade: message.data.lead.grade,
              score: message.data.lead.overall_score,
              timestamp: new Date().toISOString()
            },
            ...prev
          ]);
        }
      } else if (message.type === 'complete') {
        setIsAnalyzing(false);
        setSseUrl(null);
        setCurrentAnalysis(undefined);

        // Auto-navigate to leads page after 2 seconds
        setTimeout(() => {
          router.push('/leads');
        }, 2000);
      } else if (message.type === 'error') {
        setIsAnalyzing(false);
        setSseUrl(null);
        setCurrentAnalysis(undefined);
      }
    },
    onError: (error) => {
      console.error('SSE Error:', error);
      setIsAnalyzing(false);
      setSseUrl(null);
      setCurrentAnalysis(undefined);
    }
  });

  const handleAnalyze = async (config: AnalysisOptionsFormData) => {
    if (selectedIds.length === 0) {
      alert('Please select at least one prospect to analyze');
      return;
    }

    setIsAnalyzing(true);
    setCompletedLeads([]);
    setProgress(undefined);
    setCurrentAnalysis(undefined);

    try {
      // Call API to start analysis
      const { sseUrl: newSseUrl } = await analyzeProspects(selectedIds, {
        tier: config.tier,
        modules: config.modules as ("design" | "seo" | "content" | "performance" | "accessibility" | "social")[],
        capture_screenshots: config.capture_screenshots,
        autoEmail: config.autoEmail,
        autoAnalyze: config.autoAnalyze
      });

      // Set SSE URL to start streaming
      setSseUrl(newSseUrl);
    } catch (error: any) {
      console.error('Failed to start analysis:', error);
      alert(`Failed to start analysis: ${error.message}`);
      setIsAnalyzing(false);
    }
  };

  const isAnalysisEngineOffline = engineStatus.analysis === 'offline';

  return (
    <>
      <LoadingOverlay
        isLoading={isAnalyzing}
        message="Analyzing prospects..."
      />
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Analysis</h1>
          <p className="text-muted-foreground">
            Analyze prospects to generate detailed leads with grades
          </p>
        </div>

        {/* Engine Offline Warning */}
        {isAnalysisEngineOffline && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Analysis Engine Offline</AlertTitle>
            <AlertDescription>
              The analysis engine is not responding. Please start the analysis-engine service (port 3000) to analyze prospects.
            </AlertDescription>
          </Alert>
        )}

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Prospect Selector */}
        <div className="lg:col-span-2">
          <ProspectSelector
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            preSelectedIds={preSelectedIds}
          />
        </div>

        {/* Right Column - Analysis Config */}
        <div>
          <AnalysisConfig
            prospectCount={selectedIds.length}
            onSubmit={handleAnalyze}
            isLoading={isAnalyzing}
            disabled={selectedIds.length === 0 || isAnalysisEngineOffline}
          />
        </div>
      </div>

      {/* Progress Section */}
      {(isAnalyzing || completedLeads.length > 0) && (
        <AnalysisProgress
          status={status}
          progress={progress}
          currentAnalysis={currentAnalysis}
          completedLeads={completedLeads}
          error={sseError?.message}
        />
      )}

      {/* Auto-redirect Notice */}
      {status === 'closed' && completedLeads.length > 0 && (
        <div className="rounded-lg bg-green-100 dark:bg-green-950 border border-green-600 p-4">
          <p className="text-sm font-medium text-green-900 dark:text-green-100">
            Analysis complete! Redirecting to Leads page...
          </p>
        </div>
      )}
      </div>
    </>
  );
}
