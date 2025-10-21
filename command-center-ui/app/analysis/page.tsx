'use client';

/**
 * Analysis Page
 * Analyze prospects and convert to leads
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ProspectSelector, AnalysisConfig } from '@/components/analysis';
import { PromptEditor, type AnalysisPrompts } from '@/components/analysis/prompt-editor';
import { useSSE, useEngineHealth } from '@/lib/hooks';
import { useTaskProgress } from '@/lib/contexts/task-progress-context';
import { updateProject, getProject, createProject } from '@/lib/api';
import type { AnalysisOptionsFormData, SSEMessage, LeadGrade } from '@/lib/types';


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

  // Prompt state
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

        if (project.analysis_prompts) {
          setCurrentPrompts(project.analysis_prompts);
        } else {
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

  // Helper: Check if prompts have been modified
  const hasModifiedPrompts = () => {
    if (!currentPrompts || !defaultPrompts) return false;

    const keys: Array<keyof AnalysisPrompts> = ['design', 'seo', 'content', 'social'];

    return keys.some((key) => {
      const current = currentPrompts[key] as any;
      const defaultVal = defaultPrompts[key] as any;

      if (!current || !defaultVal) return false;

      return (
        current.model !== defaultVal.model ||
        current.temperature !== defaultVal.temperature ||
        current.systemPrompt !== defaultVal.systemPrompt ||
        current.userPromptTemplate !== defaultVal.userPromptTemplate
      );
    });
  };

  const handleAnalyze = async (config: AnalysisOptionsFormData) => {
    if (selectedIds.length === 0) {
      alert('Please select at least one prospect to analyze');
      return;
    }

    setIsAnalyzing(true);
    setProgress(undefined);

    let effectiveProjectId = selectedProjectId;

    // AUTO-FORK LOGIC: If prompts modified AND leads exist, create new project
    if (selectedProjectId && hasModifiedPrompts() && leadsCount > 0) {
      try {
        console.log('[Auto-Fork] Prompts modified + leads exist → Creating new project');

        // Fetch original project data
        const originalProject = await getProject(selectedProjectId);

        // Create new project with modified prompts
        const newProject = await createProject({
          name: `${originalProject.name} (v2)`,
          client_name: originalProject.client_name,
          description: `Forked from ${originalProject.name} with custom analysis prompts`,
          status: 'active',
          budget: originalProject.budget,
          icp_brief: originalProject.icp_brief,
          analysis_prompts: currentPrompts // Save the modified prompts
        });

        console.log('[Auto-Fork] Created new project:', newProject.id);
        alert(`Created new project: "${newProject.name}" with custom prompts`);

        // Use the new project for this analysis
        effectiveProjectId = newProject.id;
        setSelectedProjectId(newProject.id);
      } catch (error: any) {
        console.error('[Auto-Fork] Failed to create new project:', error);
        alert(`Failed to create new project: ${error.message}`);
        setIsAnalyzing(false);
        return;
      }
    }

    // Save analysis config and prompts to project if one is selected
    if (effectiveProjectId) {
      try {
        await updateProject(effectiveProjectId, {
          analysis_config: {
            tier: config.tier,
            modules: config.modules,
            capture_screenshots: config.capture_screenshots ?? true,
            max_pages: config.max_pages ?? 30,
            level_2_sample_rate: config.level_2_sample_rate ?? 0.5,
            max_crawl_time: config.max_crawl_time ?? 120
          },
          analysis_prompts: currentPrompts // Save prompts
        });
        console.log('✅ Saved analysis config and prompts to project:', effectiveProjectId);
      } catch (error: any) {
        console.error('Failed to save analysis config:', error);
        // Don't block analysis if config save fails
      }
    }

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
        modules: config.modules,
        max_pages: config.max_pages,
        level_2_sample_rate: config.level_2_sample_rate,
        max_crawl_time: config.max_crawl_time,
        project_id: effectiveProjectId,
        custom_prompts: hasModifiedPrompts()
      });

      const response = await fetch(`${API_BASE}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospect_ids: selectedIds,
          tier: config.tier,
          modules: config.modules,
          capture_screenshots: config.capture_screenshots ?? true,
          max_pages: config.max_pages ?? 30,
          level_2_sample_rate: config.level_2_sample_rate ?? 0.5,
          max_crawl_time: config.max_crawl_time ?? 120,
          project_id: effectiveProjectId,
          custom_prompts: currentPrompts // Send custom prompts to engine
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
            Analyze prospects with AI-powered lead scoring • Multi-page crawling • Business intelligence extraction
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
            disabled={selectedIds.length === 0 || isAnalysisEngineOffline}
          />
        </div>
      </div>

      {/* Prompt Editor - Full Width Section */}
      {!promptsLoading && defaultPrompts && currentPrompts && (
        <div className="mt-6">
          <PromptEditor
            prompts={currentPrompts}
            defaultPrompts={defaultPrompts}
            onChange={setCurrentPrompts}
            locked={leadsCount > 0 && !hasModifiedPrompts()}
            leadsCount={leadsCount}
          />
        </div>
      )}

      </div>
    </>
  );
}
