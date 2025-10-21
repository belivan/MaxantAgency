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
import { type AnalysisPrompts } from '@/components/analysis/prompt-editor';
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
  const [savedPrompts, setSavedPrompts] = useState<AnalysisPrompts | undefined>(undefined); // Project-saved prompts for comparison
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
        setSavedPrompts(undefined);
        setLeadsCount(0);
        return;
      }

      try {
        const project = await getProject(selectedProjectId);

        // Check if project has saved analysis prompts
        const projectPrompts = (project as any).analysis_prompts as AnalysisPrompts | undefined;

        if (projectPrompts) {
          // Project has saved prompts - use them and save for comparison
          setCurrentPrompts(projectPrompts);
          setSavedPrompts(projectPrompts);
        } else {
          // No saved prompts - use defaults
          setCurrentPrompts(defaultPrompts);
          setSavedPrompts(undefined);
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

  // Helper: Check if prompts have been modified from saved state
  const hasModifiedPrompts = () => {
    if (!currentPrompts) return false;

    // If no saved prompts, compare against defaults (first-time setup)
    const comparisonBase = savedPrompts || defaultPrompts;
    if (!comparisonBase) return false;

    const keys: Array<keyof AnalysisPrompts> = ['design', 'seo', 'content', 'social', 'accessibility'];

    return keys.some((key) => {
      const current = currentPrompts[key] as any;
      const base = comparisonBase[key] as any;

      if (!current || !base) return false;

      return (
        current.model !== base.model ||
        current.temperature !== base.temperature ||
        current.systemPrompt !== base.systemPrompt ||
        current.userPromptTemplate !== base.userPromptTemplate
      );
    });
  };

  // Fork detection: Check if prompts modified
  const modifiedPrompts = hasModifiedPrompts();

  console.log('[Fork Detection - Analysis]', {
    leadsCount,
    modifiedPrompts,
    savedPrompts: !!savedPrompts,
    currentPrompts: !!currentPrompts,
    defaultPrompts: !!defaultPrompts,
    shouldShowWarning: leadsCount > 0 && modifiedPrompts,
    promptsLocked: leadsCount > 0 && !modifiedPrompts
  });

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
          analysis_prompts: currentPrompts || undefined // Save the modified prompts
        } as any);

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

    // Save analysis prompts to project if one is selected
    if (effectiveProjectId) {
      try {
        await updateProject(effectiveProjectId, {
          analysis_prompts: currentPrompts || undefined
        } as any);
        console.log('✅ Saved analysis prompts to project:', effectiveProjectId);
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

    // Call intelligent multi-page analysis API
    try {
      addLog(taskId, 'Starting intelligent multi-page analysis...', 'info');

      const response = await fetch(`${API_BASE}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospect_ids: selectedIds,
          project_id: effectiveProjectId || undefined,
          custom_prompts: currentPrompts || undefined
        })
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`);
      }

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
            Analyze prospects with AI-powered website audits • 6 core modules • Custom model selection
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
            disabled={isAnalysisEngineOffline}
            customPrompts={currentPrompts || undefined}
            defaultPrompts={defaultPrompts || undefined}
            onPromptsChange={setCurrentPrompts}
            promptsLocked={leadsCount > 0 && !hasModifiedPrompts()}
            leadsCount={leadsCount}
          />
        </div>
      </div>

      </div>
    </>
  );
}
