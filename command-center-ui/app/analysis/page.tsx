'use client';

/**
 * Analysis Page - SIMPLIFIED VERSION
 * Removed auto-forking system - just saves to current project
 * Analyze prospects and convert to leads
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ProspectSelector, AnalysisConfig } from '@/components/analysis';
import { type AnalysisPrompts } from '@/components/analysis/prompt-editor';
import { useSSE, useEngineHealth } from '@/lib/hooks';
import { useTaskProgress } from '@/lib/contexts/task-progress-context';
import { updateProject, getProject } from '@/lib/api';
import type { AnalysisOptionsFormData, SSEMessage } from '@/lib/types';


export default function AnalysisPage() {
  const searchParams = useSearchParams();
  const engineStatus = useEngineHealth();
  const { startTask, updateTask, addLog, completeTask, errorTask } = useTaskProgress();

  // Get pre-selected prospect IDs and project from URL
  const preSelectedIds = searchParams.get('prospect_ids')?.split(',') || [];
  const urlProjectId = searchParams.get('project_id');

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(urlProjectId || null);

  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [sseUrl, setSseUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
  } | undefined>();

  // Prompt state - SIMPLIFIED: No more tracking saved vs current
  const [defaultPrompts, setDefaultPrompts] = useState<AnalysisPrompts | null>(null);
  const [currentPrompts, setCurrentPrompts] = useState<AnalysisPrompts | null>(null);
  const [leadsCount, setLeadsCount] = useState(0);
  const [promptsLoading, setPromptsLoading] = useState(true);

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
      } else if (message.type === 'complete') {
        setIsAnalyzing(false);
        setSseUrl(null);
      } else if (message.type === 'error') {
        setIsAnalyzing(false);
        setSseUrl(null);
      }
    },
    onError: (error) => {
      console.error('SSE Error:', error);
      setIsAnalyzing(false);
      setSseUrl(null);
    }
  });

  // Load default prompts on mount
  useEffect(() => {
    async function loadDefaultPrompts() {
      try {
        setPromptsLoading(true);
        const response = await fetch('/api/analysis/prompts');
        const result = await response.json();

        if (result.success) {
          setDefaultPrompts(result.data);
          setCurrentPrompts(result.data);
        }
      } catch (error) {
        console.error('Failed to load default prompts:', error);
      } finally {
        setPromptsLoading(false);
      }
    }

    loadDefaultPrompts();
  }, []);

  // Load project-specific prompts and leads count when project changes
  useEffect(() => {
    async function loadProjectData() {
      if (!selectedProjectId) {
        setCurrentPrompts(defaultPrompts);
        setLeadsCount(0);
        return;
      }

      try {
        const project = await getProject(selectedProjectId);

        // Check if project has saved analysis prompts
        const projectPrompts = (project as any).analysis_prompts as AnalysisPrompts | undefined;

        if (projectPrompts) {
          // Project has saved prompts - use them
          setCurrentPrompts(projectPrompts);
        } else {
          // No saved prompts - use defaults
          setCurrentPrompts(defaultPrompts);
        }

        const leadsResponse = await fetch(`/api/leads?project_id=${selectedProjectId}`);
        const leadsResult = await leadsResponse.json();

        if (leadsResult.success) {
          setLeadsCount(leadsResult.total || 0);
        }
      } catch (error) {
        console.error('Failed to load project data:', error);
      }
    }

    if (defaultPrompts) {
      loadProjectData();
    }
  }, [selectedProjectId, defaultPrompts]);

  const handleAnalyze = async (config: AnalysisOptionsFormData) => {
    if (selectedIds.length === 0) {
      alert('Please select at least one prospect to analyze');
      return;
    }

    // Auto-inherit project_id from the prospects being analyzed
    // The ProspectSelector filters prospects by project, so we use that project
    if (!selectedProjectId) {
      alert('⚠️ Project Required\n\nPlease select a project from the "Select Project (Required)" card at the top of the page.\n\nAll analyzed leads will automatically belong to the project you select.');
      return;
    }

    setIsAnalyzing(true);
    setProgress(undefined);

    // SIMPLIFIED: Just save to current project - NO FORKING!
    if (selectedProjectId && currentPrompts) {
      try {
        await updateProject(selectedProjectId, {
          analysis_prompts: currentPrompts
        } as any);
        console.log('✅ Saved analysis prompts to project:', selectedProjectId);
      } catch (error: any) {
        console.error('Failed to save analysis prompts:', error);
        // Don't block analysis if save fails
      }
    }

    // Start global progress task
    const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const taskTitle = `Intelligent Analysis: ${selectedIds.length} prospects (${timestamp})`;
    const taskId = startTask('analysis', taskTitle, selectedIds.length);

    const API_BASE = process.env.NEXT_PUBLIC_ANALYSIS_API || 'http://localhost:3001';

    // Use SSE with fetch for batch analysis (supports POST)
    try {
      addLog(taskId, 'Starting intelligent multi-page analysis...', 'info');

      const response = await fetch(`${API_BASE}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospect_ids: selectedIds,
          project_id: selectedProjectId,  // Required - validated above
          custom_prompts: currentPrompts || undefined
        })
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`);
      }

      // Check if response is SSE
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/event-stream')) {
        // Handle SSE response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('No response stream available');
        }

        let analyzed = 0;
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('event:')) {
              const eventType = line.slice(6).trim();
            } else if (line.startsWith('data:')) {
              try {
                const data = JSON.parse(line.slice(5));

                // Handle different event types based on data
                if (data.message && data.total) {
                  // Start event
                  addLog(taskId, data.message, 'info');
                } else if (data.current && data.company) {
                  // Analyzing event
                  addLog(taskId, `Analyzing ${data.company} (${data.current}/${data.total})...`, 'info');
                } else if (data.success === false && data.company) {
                  // Error event
                  analyzed++;
                  updateTask(taskId, analyzed, `Completed ${analyzed}/${selectedIds.length}`);
                  addLog(taskId, `✗ ${data.company}: ${data.error || 'Analysis failed'}`, 'error');
                } else if (data.grade && data.company) {
                  // Success event
                  analyzed++;
                  updateTask(taskId, analyzed, `Completed ${analyzed}/${selectedIds.length}`);
                  addLog(taskId, `✓ ${data.company}: Grade ${data.grade} (${data.score}/100)`, 'success');
                } else if (data.successful !== undefined && data.failed !== undefined) {
                  // Complete event
                  addLog(taskId, `Analysis complete: ${data.successful}/${data.total} successful`, 'success');
                  completeTask(taskId);
                }
              } catch (e) {
                // Not JSON, ignore
                console.log('Non-JSON SSE data:', line);
              }
            }
          }
        }
      } else {
        // Fallback: Handle as regular JSON response (for backwards compatibility)
        const result = await response.json();

        if (result.success) {
          // Log each result
          result.data.results.forEach((r: any, i: number) => {
            updateTask(taskId, i + 1, `Completed ${i + 1}/${result.data.total}`);

            if (r.success) {
              addLog(taskId, `✓ ${r.company_name}: Grade ${r.grade} (${r.score}/100)`, 'success');
            } else {
              addLog(taskId, `✗ ${r.company_name}: ${r.error}`, 'error');
            }
          });

          addLog(taskId, `Analysis complete: ${result.data.successful}/${result.data.total} successful`, 'success');
          completeTask(taskId);
        } else {
          throw new Error(result.error || 'Analysis failed');
        }
      }

      setIsAnalyzing(false);
    } catch (error: any) {
      console.error('Failed to analyze:', error);
      alert(`Failed to analyze: ${error.message}`);
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
            Complete website analysis using all 6 AI modules • Automatic page discovery • Lead scoring & prioritization
          </p>
        </div>

        {/* Engine Offline Warning */}
        {isAnalysisEngineOffline && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Analysis Engine Offline</AlertTitle>
            <AlertDescription>
              The analysis engine is not responding. Please start the analysis-engine service (port 3001) to analyze prospects.
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
            projectId={selectedProjectId}
            onProjectChange={setSelectedProjectId}
          />
        </div>

        {/* Right Column - Analysis Config */}
        <div>
          <AnalysisConfig
            prospectCount={selectedIds.length}
            onSubmit={handleAnalyze}
            isLoading={isAnalyzing}
            disabled={isAnalysisEngineOffline}
            customPrompts={currentPrompts || undefined}
            defaultPrompts={defaultPrompts || undefined}
            onPromptsChange={setCurrentPrompts}
            promptsLocked={false}  // SIMPLIFIED: Never lock prompts
            leadsCount={leadsCount}
          />
        </div>
      </div>

      </div>
    </>
  );
}