'use client';

/**
 * Analysis Page - Step-by-Step Workflow
 * Step 1: Select Project → Step 2: Select Prospects → Step 3: Analyze
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, Brain, Eye, Search, Shield, BarChart3, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  ProspectSelector,
  AnalysisConfig,
  QuickWebsiteAnalysis,
  AnalysisStepIndicator
} from '@/components/analysis';
import { ProjectSelectionCard, AnimatedSection } from '@/components/prospecting';
import { PageLayout } from '@/components/shared';
import { type AnalysisPrompts, type PromptConfig } from '@/components/analysis/prompt-editor';
import { useEngineHealth } from '@/lib/hooks';
import { useTaskProgress } from '@/lib/contexts/task-progress-context';
import { updateProject, getProject } from '@/lib/api';
import type { AnalysisOptionsFormData } from '@/lib/utils/validation';

const DEFAULT_ANALYSIS_MODEL = 'claude-haiku-4-5';

// Analysis Engine Info Component
function AnalysisEngineInfo({ isExpanded, onToggle }: { isExpanded: boolean; onToggle: () => void }) {
  return (
    <div className="mb-6 bg-gradient-to-br from-primary/5 via-card to-card rounded-xl border border-primary/20 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Analysis Engine</h3>
            <p className="text-sm text-muted-foreground">6 AI agents analyze websites across design, SEO, content, social, and accessibility</p>
          </div>
        </div>
        {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-border/50">
          <div className="pt-4 space-y-4">
            {/* Pipeline Overview */}
            <p className="text-sm text-muted-foreground leading-relaxed">
              The Analysis Engine transforms prospects into qualified leads through a <span className="text-foreground font-medium">5-phase intelligent pipeline</span>:
              discovery, page selection, crawling, parallel analysis, and results aggregation.
            </p>

            {/* Analyzers Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
                <div className="flex items-center gap-2 mb-1">
                  <Eye className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium text-foreground">Visual Analysis</span>
                </div>
                <p className="text-xs text-muted-foreground">Desktop & mobile screenshots analyzed with GPT-5 Vision</p>
              </div>

              <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
                <div className="flex items-center gap-2 mb-1">
                  <Search className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-foreground">SEO & Content</span>
                </div>
                <p className="text-xs text-muted-foreground">Technical SEO, meta tags, content quality, and messaging</p>
              </div>

              <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-medium text-foreground">Accessibility</span>
                </div>
                <p className="text-xs text-muted-foreground">WCAG 2.1 Level AA compliance auditing</p>
              </div>

              <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 className="w-4 h-4 text-orange-500" />
                  <span className="text-sm font-medium text-foreground">Social Media</span>
                </div>
                <p className="text-xs text-muted-foreground">Social presence, profiles, and engagement analysis</p>
              </div>

              <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm font-medium text-foreground">Performance</span>
                </div>
                <p className="text-xs text-muted-foreground">PageSpeed Insights & Core Web Vitals</p>
              </div>

              <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
                <div className="flex items-center gap-2 mb-1">
                  <Brain className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Lead Scoring</span>
                </div>
                <p className="text-xs text-muted-foreground">AI-powered lead qualification with priority tiers</p>
              </div>
            </div>

            {/* Key Stats */}
            <div className="flex flex-wrap gap-4 pt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary" />
                A-F grading with weighted scores
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                ~$0.05 per analysis
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                2-3 min per website
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                Multi-page crawling
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
      updated[key] = { ...prompt, model: DEFAULT_ANALYSIS_MODEL };
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
    if (prompt.model) selections[key] = prompt.model;
  });
  return selections;
};

export default function AnalysisPage() {
  const searchParams = useSearchParams();
  const engineStatus = useEngineHealth();
  const { startTask, updateTask, addLog, completeTask, errorTask } = useTaskProgress();

  // URL params
  const preSelectedIds = searchParams.get('prospect_ids')?.split(',') || [];
  const urlProjectId = searchParams.get('project_id');

  // Project state
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(urlProjectId || null);
  const [prospectCount, setProspectCount] = useState(0);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Prompt state
  const [defaultPrompts, setDefaultPrompts] = useState<AnalysisPrompts | null>(null);
  const [currentPrompts, setCurrentPrompts] = useState<AnalysisPrompts | null>(null);
  const [defaultModelSelections, setDefaultModelSelections] = useState<Record<string, string>>(buildDefaultModelSelections());
  const [currentModelSelections, setCurrentModelSelections] = useState<Record<string, string>>(buildDefaultModelSelections());

  const defaultPromptsRef = useRef<AnalysisPrompts | null>(null);
  const defaultModelSelectionsRef = useRef<Record<string, string>>(buildDefaultModelSelections());
  const isLoadingPromptsRef = useRef(false);

  const [leadsCount, setLeadsCount] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Animation state
  const [showWorkspace, setShowWorkspace] = useState(false);

  // Info panel state
  const [showEngineInfo, setShowEngineInfo] = useState(false);

  // Derive current step
  const currentStep = useMemo((): 1 | 2 | 3 => {
    if (!selectedProjectId) return 1;
    if (selectedIds.length === 0) return 2;
    return 3;
  }, [selectedProjectId, selectedIds.length]);

  // Update refs
  useEffect(() => {
    defaultPromptsRef.current = defaultPrompts;
    defaultModelSelectionsRef.current = defaultModelSelections;
  }, [defaultPrompts, defaultModelSelections]);

  // Animate workspace reveal when project selected
  useEffect(() => {
    if (selectedProjectId) {
      const timer = setTimeout(() => setShowWorkspace(true), 150);
      return () => clearTimeout(timer);
    } else {
      setShowWorkspace(false);
    }
  }, [selectedProjectId]);

  // Load default prompts
  useEffect(() => {
    async function loadDefaultPrompts() {
      try {
        isLoadingPromptsRef.current = true;
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
        setTimeout(() => { isLoadingPromptsRef.current = false; }, 100);
      }
    }
    loadDefaultPrompts();
  }, []);

  // Load project-specific data
  useEffect(() => {
    async function loadProjectData() {
      const currentDefaultPrompts = defaultPromptsRef.current;
      const currentDefaultModelSelections = defaultModelSelectionsRef.current;

      if (!selectedProjectId) {
        setCurrentPrompts(currentDefaultPrompts);
        setCurrentModelSelections(currentDefaultModelSelections);
        setLeadsCount(0);
        setProspectCount(0);
        return;
      }

      try {
        // Load project and prospect count in parallel
        const [projectResponse, prospectsResponse] = await Promise.all([
          getProject(selectedProjectId),
          fetch(`/api/projects/${selectedProjectId}/prospects`)
        ]);

        const project = projectResponse;
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
                  return [key, { ...(value as PromptConfig), model: selection || DEFAULT_ANALYSIS_MODEL }];
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
          setCurrentModelSelections(projectModelSelections
            ? { ...currentDefaultModelSelections, ...projectModelSelections }
            : currentDefaultModelSelections
          );
        }

        // Get prospect count
        if (prospectsResponse.ok) {
          const prospectsData = await prospectsResponse.json();
          setProspectCount(prospectsData.data?.length || 0);
        }

        // Get leads count
        const leadsResponse = await fetch(`/api/leads?project_id=${selectedProjectId}`);
        const leadsResult = await leadsResponse.json();
        if (leadsResult.success) setLeadsCount(leadsResult.total || 0);
      } catch (error) {
        console.error('Failed to load project data:', error);
      }
    }

    if (defaultPromptsRef.current) loadProjectData();
  }, [selectedProjectId]);

  const handlePromptsChange = useCallback((prompts: AnalysisPrompts) => {
    const normalized = ensureDefaultModels(prompts, false) as AnalysisPrompts;
    setCurrentPrompts(normalized);
  }, []);

  const handleModelSelectionsChange = useCallback((selection: Record<string, string>) => {
    if (isLoadingPromptsRef.current) return;
    setCurrentModelSelections(selection);
  }, []);

  const refreshLeads = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
    // Also refresh prospect count
    if (selectedProjectId) {
      fetch(`/api/projects/${selectedProjectId}/prospects`)
        .then(res => res.json())
        .then(data => setProspectCount(data.data?.length || 0))
        .catch(() => {});
    }
  }, [selectedProjectId]);

  const handleProjectChange = (projectId: string | null) => {
    setSelectedProjectId(projectId);
    setSelectedIds([]); // Clear selections when project changes
  };

  const handleAnalyze = async (config: AnalysisOptionsFormData) => {
    if (selectedIds.length === 0) {
      alert('Please select at least one prospect to analyze');
      return;
    }

    if (!selectedProjectId) {
      alert('Please select a project first');
      return;
    }

    // Save prompts to project
    if (currentPrompts) {
      try {
        await updateProject(selectedProjectId, {
          analysis_prompts: ensureDefaultModels(currentPrompts, true),
          analysis_model_selections: currentModelSelections
        } as any);
      } catch (error: any) {
        console.error('Failed to save analysis prompts:', error);
      }
    }

    const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const taskTitle = `Analyze ${selectedIds.length} prospects (${timestamp})`;
    const API_BASE = process.env.NEXT_PUBLIC_ANALYSIS_API || 'http://localhost:3001';

    const taskId = startTask('analysis', taskTitle, selectedIds.length);
    addLog(taskId, `Starting analysis of ${selectedIds.length} prospect(s)...`, 'info');

    try {
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
        const error = await response.json();
        throw new Error(error.error || 'Failed to queue analysis');
      }

      const queueData = await response.json();
      const jobIds = queueData.job_ids || [];

      if (jobIds.length === 0) throw new Error('No jobs were queued');

      addLog(taskId, `Queued ${jobIds.length} analysis job(s)`, 'info');

      // Log exclusion warnings
      if (queueData.exclusion_reasons) {
        const { no_website, problematic_website, already_analyzed } = queueData.exclusion_reasons;
        if (no_website?.length > 0) {
          addLog(taskId, `Skipped ${no_website.length} (no website)`, 'warning');
        }
        if (problematic_website?.length > 0) {
          addLog(taskId, `Skipped ${problematic_website.length} (website issues)`, 'warning');
        }
        if (already_analyzed?.length > 0) {
          addLog(taskId, `${already_analyzed.length} will be re-analyzed`, 'info');
        }
      }

      // Poll for status
      let consecutiveFailures = 0;
      const pollInterval = setInterval(async () => {
        try {
          const queryString = jobIds.map((id: string) => `job_ids=${id}`).join('&');
          const statusResponse = await fetch(`${API_BASE}/api/analysis-status?${queryString}`);

          if (!statusResponse.ok) return;

          const statusData = await statusResponse.json();
          const jobs = statusData.jobs || [];
          consecutiveFailures = 0;

          const completedJobs = jobs.filter((j: any) => j.state === 'completed').length;
          const failedJobs = jobs.filter((j: any) => j.state === 'failed').length;
          const totalJobs = jobs.length;

          updateTask(taskId, completedJobs, `${completedJobs}/${totalJobs} complete`);

          jobs.forEach((job: any) => {
            if (job.state === 'completed' && job.result?.company_name && job.result?.grade) {
              addLog(taskId, `${job.result.company_name}: Grade ${job.result.grade}`, 'success');
            } else if (job.state === 'failed') {
              addLog(taskId, `Failed: ${job.error || 'Unknown error'}`, 'error');
            }
          });

          const allDone = jobs.every((j: any) => ['completed', 'failed', 'cancelled'].includes(j.state));

          if (allDone) {
            clearInterval(pollInterval);
            if (failedJobs > 0) {
              addLog(taskId, `Complete: ${completedJobs} succeeded, ${failedJobs} failed`, 'warning');
            } else {
              addLog(taskId, `All ${completedJobs} leads analyzed!`, 'success');
            }
            completeTask(taskId);
            refreshLeads();
          }
        } catch (pollError) {
          consecutiveFailures++;
          if (consecutiveFailures >= 3) {
            clearInterval(pollInterval);
            errorTask(taskId, 'Lost connection to Analysis Engine');
          }
        }
      }, 3000);

      setTimeout(() => clearInterval(pollInterval), 600000);
    } catch (error: any) {
      errorTask(taskId, error.message);
      alert(`Analysis failed: ${error.message}`);
    }
  };

  const isAnalysisEngineOffline = engineStatus.analysis === 'offline';

  return (
    <PageLayout title="Website Analysis" description="Transform prospects into qualified leads with AI-powered analysis">
      {/* Analysis Engine Info */}
      <AnalysisEngineInfo isExpanded={showEngineInfo} onToggle={() => setShowEngineInfo(!showEngineInfo)} />

      {/* Step Indicator */}
      <AnalysisStepIndicator currentStep={currentStep} />

      {/* Engine Offline Warning */}
      {isAnalysisEngineOffline && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Analysis Engine Offline</AlertTitle>
          <AlertDescription>
            The analysis engine is not responding. Please start the analysis-engine service (port 3001).
          </AlertDescription>
        </Alert>
      )}

      {/* Step 1: Project Selection */}
      <ProjectSelectionCard
        selectedProjectId={selectedProjectId}
        onProjectChange={handleProjectChange}
        prospectCount={prospectCount}
        hideCreateButton={true}
      />

      {/* Step 2 & 3: Workspace (only render when project is selected) */}
      {selectedProjectId && (
        <AnimatedSection isVisible={showWorkspace} delay={0}>
          <div className="space-y-4">
            {/* Project Info Alert */}
            {prospectCount > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Project Loaded</AlertTitle>
                <AlertDescription>
                  This project has {prospectCount} prospects. Select prospects from the table or use Quick Analysis.
                </AlertDescription>
              </Alert>
            )}

            {/* Main Workspace Grid */}
            <div className="grid gap-4 lg:grid-cols-3">
              {/* Left: Prospects Table + Quick Analysis (2 cols on desktop) */}
              <div className="lg:col-span-2 space-y-4">
                {/* Quick Website Analysis */}
                <QuickWebsiteAnalysis
                  selectedProjectId={selectedProjectId}
                  disabled={false}
                  engineOffline={isAnalysisEngineOffline}
                  onSuccess={refreshLeads}
                />

                {/* Prospects Selector - filters locked since project is selected */}
                <ProspectSelector
                  selectedIds={selectedIds}
                  onSelectionChange={setSelectedIds}
                  preSelectedIds={preSelectedIds}
                  projectId={selectedProjectId}
                  filtersLocked={true}
                />
              </div>

              {/* Right: Analysis Config (1 col on desktop) */}
              <div className="lg:col-span-1">
                <div className="lg:sticky lg:top-20">
                  <AnalysisConfig
                    prospectCount={selectedIds.length}
                    onSubmit={handleAnalyze}
                    isLoading={false}
                    disabled={isAnalysisEngineOffline || selectedIds.length === 0}
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
              </div>
            </div>
          </div>
        </AnimatedSection>
      )}
    </PageLayout>
  );
}
