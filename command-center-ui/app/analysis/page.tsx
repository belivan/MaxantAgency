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
import { useSSE, useEngineHealth } from '@/lib/hooks';
import { useTaskProgress } from '@/lib/contexts/task-progress-context';
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
  const { startTask, updateTask, addLog, completeTask, errorTask } = useTaskProgress();

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

    // Start global progress task with descriptive title
    const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const taskTitle = `Analysis: ${selectedIds.length} prospects (${timestamp})`;
    const taskId = startTask('analysis', taskTitle, selectedIds.length);

    try {
      // Make POST request and handle SSE stream directly
      const API_BASE = process.env.NEXT_PUBLIC_ANALYSIS_API || 'http://localhost:3001';

      // DEBUG: Log what we're sending
      console.log('🔍 Analysis Request:', {
        prospect_ids: selectedIds,
        count: selectedIds.length,
        tier: config.tier,
        modules: config.modules
      });

      const response = await fetch(`${API_BASE}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospect_ids: selectedIds,
          tier: config.tier,
          modules: config.modules,
          capture_screenshots: config.capture_screenshots ?? true
        })
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to start analysis');
      }

      // Read SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          // Stream ended - mark task as complete if not already
          addLog(taskId, 'Analysis completed successfully!', 'success');
          setIsAnalyzing(false);
          completeTask(taskId);
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              // Handle progress
              if (data.type === 'progress' || data.step) {
                const current = data.completed || 0;
                setProgress({
                  current,
                  total: data.total || selectedIds.length
                });
                // Update global progress
                const message = data.message || data.step || `Processing ${current}/${data.total || selectedIds.length}`;
                updateTask(taskId, current, message);
                addLog(taskId, message, 'info');
              }

              // Handle status messages
              if (data.type === 'status') {
                addLog(taskId, data.message || 'Status update', 'info');
              }

              // Handle log messages
              if (data.type === 'log') {
                const logType = data.error ? 'error' : data.level || 'info';
                addLog(taskId, data.message || 'Log entry', logType as any);
              }

              // Handle completion - ONLY when explicitly complete, not partial progress
              if (data.type === 'complete') {
                addLog(taskId, 'Analysis completed successfully!', 'success');
                setIsAnalyzing(false);
                completeTask(taskId);
              }

              // Handle error
              if (data.type === 'error' || data.error) {
                throw new Error(data.error || data.message || 'Analysis failed');
              }
            } catch (parseError) {
              console.error('Failed to parse SSE:', parseError);
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Failed to start analysis:', error);
      alert(`Failed to start analysis: ${error.message}`);
      errorTask(taskId, error.message);
      setIsAnalyzing(false);
    }
  };

  const isAnalysisEngineOffline = engineStatus.analysis === 'offline';

  return (
    <>
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
