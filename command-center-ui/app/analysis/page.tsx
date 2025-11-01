'use client';

/**
 * Analysis Page - REDESIGNED with Notion-Style Showcase
 * Beautiful feature showcase + analysis workflow
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, Brain, Sparkles } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  ProspectSelector,
  AnalysisConfig,
  StatsOverview,
  FeaturesShowcase,
  AnalysisResults,
  BenchmarkManager,
  QuickWebsiteAnalysis
} from '@/components/analysis';
import { type AnalysisPrompts, type PromptConfig } from '@/components/analysis/prompt-editor';
import { useSSE, useEngineHealth } from '@/lib/hooks';
import { useTaskProgress } from '@/lib/contexts/task-progress-context';
import { updateProject, getProject } from '@/lib/api';
import type { AnalysisOptionsFormData, SSEMessage } from '@/lib/types';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';

const DEFAULT_ANALYSIS_MODEL = 'gpt-5';

const buildDefaultModelSelections = (): Record<string, string> => ({
  unifiedVisual: DEFAULT_ANALYSIS_MODEL,
  unifiedTechnical: DEFAULT_ANALYSIS_MODEL,
  social: DEFAULT_ANALYSIS_MODEL,
  accessibility: DEFAULT_ANALYSIS_MODEL,
  leadScorer: DEFAULT_ANALYSIS_MODEL
});

const ensureDefaultModels = (prompts: AnalysisPrompts | null, overwrite = false): AnalysisPrompts | null => {
  if (!prompts) return prompts;
  const updated: AnalysisPrompts = { ...prompts };
  Object.entries(updated).forEach(([key, value]) => {
    if (key === '_meta' || !value) return;
    const prompt = value as PromptConfig;
    if (overwrite || !prompt.model) {
      updated[key] = {
        ...prompt,
        model: DEFAULT_ANALYSIS_MODEL
      };
    }
  });
  return updated;
};

const extractModelSelections = (prompts: AnalysisPrompts | null): Record<string, string> => {
  const selections = buildDefaultModelSelections();
  if (!prompts) return selections;
  Object.entries(prompts).forEach(([key, value]) => {
    if (key === '_meta' || !value) return;
    const prompt = value as PromptConfig;
    if (prompt.model) {
      selections[key] = prompt.model;
    }
  });
  return selections;
};

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
  const [progress, setProgress] = useState<{ current: number; total: number } | undefined>();

  // Prompt state
  const [defaultPrompts, setDefaultPrompts] = useState<AnalysisPrompts | null>(null);
  const [currentPrompts, setCurrentPrompts] = useState<AnalysisPrompts | null>(null);
  const [defaultModelSelections, setDefaultModelSelections] = useState<Record<string, string>>(buildDefaultModelSelections());
  const [currentModelSelections, setCurrentModelSelections] = useState<Record<string, string>>(buildDefaultModelSelections());

  // Use refs to store stable references for useEffect dependencies
  const defaultPromptsRef = useRef<AnalysisPrompts | null>(null);
  const defaultModelSelectionsRef = useRef<Record<string, string>>(buildDefaultModelSelections());

  // Track if we're loading prompts to prevent loops
  const isLoadingPromptsRef = useRef(false);

  // Update refs when state changes
  useEffect(() => {
    defaultPromptsRef.current = defaultPrompts;
    defaultModelSelectionsRef.current = defaultModelSelections;
  }, [defaultPrompts, defaultModelSelections]);

  const handlePromptsChange = useCallback((prompts: AnalysisPrompts) => {
    const normalized = ensureDefaultModels(prompts, false) as AnalysisPrompts;
    setCurrentPrompts(normalized);
  }, []);
  const [leadsCount, setLeadsCount] = useState(0);
  const [promptsLoading, setPromptsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Callback to refresh leads after quick analysis
  const refreshLeads = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // SSE connection
  const { status, error: sseError } = useSSE({
    url: sseUrl,
    onMessage: (message: SSEMessage<any>) => {
      console.log('SSE Message:', message);

      if (message.type === 'progress') {
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
        isLoadingPromptsRef.current = true;
        setPromptsLoading(true);
        const response = await fetch('/api/analysis/prompts');
        const result = await response.json();

        if (result.success) {
          const promptsData = ensureDefaultModels(result.data as AnalysisPrompts, true);
          setDefaultPrompts(promptsData);
          setCurrentPrompts(promptsData);

          const selections = extractModelSelections(promptsData);
          setDefaultModelSelections(selections);
          setCurrentModelSelections(selections);
        }
      } catch (error) {
        console.error('Failed to load default prompts:', error);
      } finally {
        setPromptsLoading(false);
        setTimeout(() => {
          isLoadingPromptsRef.current = false;
        }, 100);
      }
    }

    loadDefaultPrompts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load project-specific prompts and leads count when project changes
  useEffect(() => {
    async function loadProjectData() {
      const currentDefaultPrompts = defaultPromptsRef.current;
      const currentDefaultModelSelections = defaultModelSelectionsRef.current;

      if (!selectedProjectId) {
        setCurrentPrompts(currentDefaultPrompts);
        setCurrentModelSelections(currentDefaultModelSelections);
        setLeadsCount(0);
        return;
      }

      try {
        const project = await getProject(selectedProjectId);

        const projectPrompts = (project as any).analysis_prompts as AnalysisPrompts | undefined;
        const projectModelSelections = (project as any).analysis_model_selections as Record<string, string> | undefined;

        if (projectPrompts) {
          const hasStoredSelections = !!projectModelSelections && Object.keys(projectModelSelections).length > 0;
          const mergedPrompts = ensureDefaultModels(
            { ...(currentDefaultPrompts || {}), ...projectPrompts } as AnalysisPrompts,
            !hasStoredSelections
          ) as AnalysisPrompts | null;

          const syncedPrompts: AnalysisPrompts | null = mergedPrompts
            ? Object.fromEntries(
                Object.entries(mergedPrompts).map(([key, value]) => {
                  if (key === '_meta' || !value) return [key, value];
                  const selection = projectModelSelections?.[key] || (value as PromptConfig).model;
                  return [
                    key,
                    {
                      ...(value as PromptConfig),
                      model: selection || DEFAULT_ANALYSIS_MODEL
                    }
                  ];
                })
              ) as AnalysisPrompts
            : null;

          setCurrentPrompts(syncedPrompts || currentDefaultPrompts);

          if (projectModelSelections) {
            setCurrentModelSelections({ ...currentDefaultModelSelections, ...projectModelSelections });
          } else if (syncedPrompts) {
            setCurrentModelSelections(extractModelSelections(syncedPrompts));
          } else {
            setCurrentModelSelections(currentDefaultModelSelections);
          }
        } else {
          setCurrentPrompts(currentDefaultPrompts);
          if (projectModelSelections) {
            setCurrentModelSelections({ ...currentDefaultModelSelections, ...projectModelSelections });
          } else {
            setCurrentModelSelections(currentDefaultModelSelections);
          }
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

    if (defaultPromptsRef.current) {
      loadProjectData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId]);

  const handleModelSelectionsChange = useCallback((selection: Record<string, string>) => {
    if (isLoadingPromptsRef.current) {
      return;
    }
    setCurrentModelSelections(selection);
  }, []);

  const handleAnalyze = async (config: AnalysisOptionsFormData) => {
    if (selectedIds.length === 0) {
      alert('Please select at least one prospect to analyze');
      return;
    }

    if (!selectedProjectId) {
      alert('⚠ Project Required\n\nPlease select a project from the "Select Project (Required)" card at the top of the page.\n\nAll analyzed leads will automatically belong to the project you select.');
      return;
    }

    setIsAnalyzing(true);
    setProgress(undefined);

    if (selectedProjectId && currentPrompts) {
      try {
        await updateProject(selectedProjectId, {
          analysis_prompts: ensureDefaultModels(currentPrompts, true),
          analysis_model_selections: currentModelSelections
        } as any);
        console.log('✓ Saved analysis prompts to project:', selectedProjectId);
      } catch (error: any) {
        console.error('Failed to save analysis prompts:', error);
      }
    }

    const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const taskTitle = `Intelligent Analysis: ${selectedIds.length} prospects (${timestamp})`;
    const taskId = startTask('analysis', taskTitle, selectedIds.length);

    const API_BASE = process.env.NEXT_PUBLIC_ANALYSIS_API || 'http://localhost:3001';

    try {
      addLog(taskId, 'Starting intelligent multi-page analysis...', 'info');

      const response = await fetch(`${API_BASE}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospect_ids: selectedIds,
          project_id: selectedProjectId,
          custom_prompts: (config as any).custom_prompts || undefined,
          model_selections: (config as any).model_selections || currentModelSelections
        })
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/event-stream')) {
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
              continue;
            } else if (line.startsWith('data:')) {
              try {
                const data = JSON.parse(line.slice(5));

                if (data.message && data.total) {
                  addLog(taskId, data.message, 'info');
                } else if (data.current && data.company) {
                  addLog(taskId, `Analyzing ${data.company} (${data.current}/${data.total})...`, 'info');
                } else if (data.success === false && data.company) {
                  analyzed++;
                  updateTask(taskId, analyzed, `Completed ${analyzed}/${selectedIds.length}`);
                  addLog(taskId, `❌ ${data.company}: ${data.error || 'Analysis failed'}`, 'error');
                } else if (data.grade && data.company) {
                  analyzed++;
                  updateTask(taskId, analyzed, `Completed ${analyzed}/${selectedIds.length}`);
                  addLog(taskId, `✅ ${data.company}: Grade ${data.grade} (${data.score}/100)`, 'success');
                } else if (data.successful !== undefined && data.failed !== undefined) {
                  addLog(taskId, `Analysis complete: ${data.successful}/${data.total} successful`, 'success');
                  completeTask(taskId);
                }
              } catch (e) {
                console.log('Non-JSON SSE data:', line);
              }
            }
          }
        }
      } else {
        const result = await response.json();

        if (result.success) {
          result.data.results.forEach((r: any, i: number) => {
            updateTask(taskId, i + 1, `Completed ${i + 1}/${result.data.total}`);

            if (r.success) {
              addLog(taskId, `✅ ${r.company_name}: Grade ${r.grade} (${r.score}/100)`, 'success');
            } else {
              addLog(taskId, `❌ ${r.company_name}: ${r.error}`, 'error');
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-8">
        {/* Hero Section */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/5 border border-primary/10 rounded-full mb-4">
            <Brain className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">AI-Powered Intelligence Engine</span>
          </div>
          <h1 className="text-4xl font-bold text-foreground">Intelligent Website Analysis</h1>
          <p className="text-lg text-muted-foreground max-w-3xl leading-relaxed">
            6 AI analyzers • Context-aware grading • Industry benchmarking • Lead priority scoring • Multi-format reports
          </p>
        </div>

        {/* Stats Overview */}
        <StatsOverview projectId={selectedProjectId} />

        {/* Feature Showcase */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">Powered by Advanced AI Features</h2>
          <FeaturesShowcase />
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="analyze" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="analyze">
              <Sparkles className="w-4 h-4 mr-2" />
              Analyze Prospects
            </TabsTrigger>
            <TabsTrigger value="results">Recent Results</TabsTrigger>
            <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
          </TabsList>

          {/* Analyze Tab */}
          <TabsContent value="analyze" className="space-y-6">
            {isAnalysisEngineOffline && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Analysis Engine Offline</AlertTitle>
                <AlertDescription>
                  The analysis engine is not responding. Please start the analysis-engine service (port 3001) to analyze prospects.
                </AlertDescription>
              </Alert>
            )}

            {/* Analysis Section - Single Grid */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Left Column - Row 1: Quick Website Analysis */}
              <div className="lg:col-span-2">
                <QuickWebsiteAnalysis
                  selectedProjectId={selectedProjectId}
                  disabled={isAnalyzing}
                  engineOffline={isAnalysisEngineOffline}
                  onSuccess={refreshLeads}
                />
              </div>

              {/* Right Column - Rows 1-2: Analysis Config */}
              <div className="lg:row-span-2">
                <AnalysisConfig
                  prospectCount={selectedIds.length}
                  onSubmit={handleAnalyze}
                  isLoading={isAnalyzing}
                  disabled={isAnalysisEngineOffline}
                  customPrompts={currentPrompts || undefined}
                  defaultPrompts={defaultPrompts || undefined}
                  onPromptsChange={handlePromptsChange}
                  promptsLocked={false}
                  leadsCount={leadsCount}
                  modelSelections={currentModelSelections}
                  defaultModelSelections={defaultModelSelections}
                  onModelSelectionsChange={handleModelSelectionsChange}
                />
              </div>

              {/* Left Column - Row 2: Prospect Selector */}
              <div className="lg:col-span-2">
                <ProspectSelector
                  selectedIds={selectedIds}
                  onSelectionChange={setSelectedIds}
                  preSelectedIds={preSelectedIds}
                  projectId={selectedProjectId}
                  onProjectChange={setSelectedProjectId}
                />
              </div>
            </div>
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results" className="space-y-6">
            <AnalysisResults projectId={selectedProjectId} limit={20} key={refreshTrigger} />
          </TabsContent>

          {/* Benchmarks Tab */}
          <TabsContent value="benchmarks" className="space-y-6">
            <BenchmarkManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
