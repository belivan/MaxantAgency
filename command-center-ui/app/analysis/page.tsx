'use client';

/**
 * Analysis Page - Step-by-Step Workflow
 * Step 1: Select Project → Step 2: Select Prospects & Analyze
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, ChevronDown, FolderOpen, Plus } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  ProspectSelector,
  AnalysisConfig,
  QuickWebsiteAnalysis,
  AnalysisStepIndicator
} from '@/components/analysis';
import { CreateProjectDialog } from '@/components/projects/create-project-dialog';
import { PageLayout } from '@/components/shared';
import { AnimatedSection } from '@/components/prospecting';
import { type AnalysisPrompts, type PromptConfig } from '@/components/analysis/prompt-editor';
import { useEngineHealth } from '@/lib/hooks';
import { useTaskProgress } from '@/lib/contexts/task-progress-context';
import { updateProject, getProject, getProjects } from '@/lib/api';
import type { Project } from '@/lib/types';
import type { AnalysisOptionsFormData } from '@/lib/utils/validation';
import { cn } from '@/lib/utils';

const DEFAULT_ANALYSIS_MODEL = 'claude-haiku-4-5';

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
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(urlProjectId || null);
  const [isProjectExpanded, setIsProjectExpanded] = useState(!urlProjectId);

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
  const [promptsLoading, setPromptsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showWorkspace, setShowWorkspace] = useState(false);

  // Derive current step
  const currentStep = useMemo((): 1 | 2 => {
    return selectedProjectId ? 2 : 1;
  }, [selectedProjectId]);

  // Update refs
  useEffect(() => {
    defaultPromptsRef.current = defaultPrompts;
    defaultModelSelectionsRef.current = defaultModelSelections;
  }, [defaultPrompts, defaultModelSelections]);

  // Load projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoadingProjects(true);
        const data = await getProjects({ status: 'active' });
        setProjects(data);
      } catch (err) {
        console.error('Failed to load projects:', err);
      } finally {
        setLoadingProjects(false);
      }
    };
    fetchProjects();
  }, []);

  // Show workspace when project selected
  useEffect(() => {
    if (selectedProjectId) {
      const timer = setTimeout(() => {
        setShowWorkspace(true);
        setIsProjectExpanded(false);
      }, 150);
      return () => clearTimeout(timer);
    } else {
      setShowWorkspace(false);
      setIsProjectExpanded(true);
    }
  }, [selectedProjectId]);

  // Load default prompts
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
  }, []);

  const handleProjectChange = (projectId: string | null) => {
    setSelectedProjectId(projectId);
    setSelectedIds([]); // Clear selections when project changes
  };

  const handleProjectCreated = (project: Project) => {
    setProjects(prev => [...prev, project]);
    handleProjectChange(project.id);
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);

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
          addLog(taskId, `⚠️ Skipped ${no_website.length} (no website)`, 'warning');
        }
        if (problematic_website?.length > 0) {
          addLog(taskId, `⚠️ Skipped ${problematic_website.length} (website issues)`, 'warning');
        }
        if (already_analyzed?.length > 0) {
          addLog(taskId, `ℹ️ ${already_analyzed.length} will be re-analyzed`, 'info');
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
              addLog(taskId, `✅ ${job.result.company_name}: Grade ${job.result.grade}`, 'success');
            } else if (job.state === 'failed') {
              addLog(taskId, `❌ Failed: ${job.error || 'Unknown error'}`, 'error');
            }
          });

          const allDone = jobs.every((j: any) => ['completed', 'failed', 'cancelled'].includes(j.state));

          if (allDone) {
            clearInterval(pollInterval);
            if (failedJobs > 0) {
              addLog(taskId, `Complete: ${completedJobs} succeeded, ${failedJobs} failed`, 'warning');
            } else {
              addLog(taskId, `✓ All ${completedJobs} leads analyzed!`, 'success');
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
    <PageLayout title="Website Analysis" description="Analyze prospects and generate leads">
      {/* Step Indicator */}
      <AnalysisStepIndicator currentStep={currentStep} />

      {/* Engine Offline Warning */}
      {isAnalysisEngineOffline && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Analysis engine offline (port 3001)
          </AlertDescription>
        </Alert>
      )}

      {/* Step 1: Project Selection */}
      {isProjectExpanded ? (
        <Card className="border-2 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FolderOpen className="w-5 h-5" />
              Step 1: Select Project
            </CardTitle>
            <CardDescription>Choose a project to analyze prospects from</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 space-y-2">
                <Label htmlFor="project-select">Project</Label>
                <Select
                  value={selectedProjectId || undefined}
                  onValueChange={handleProjectChange}
                  disabled={loadingProjects}
                >
                  <SelectTrigger id="project-select" className="w-full h-11">
                    <SelectValue placeholder={loadingProjects ? 'Loading...' : 'Select a project...'} />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                        {project.client_name && ` - ${project.client_name}`}
                      </SelectItem>
                    ))}
                    {projects.length === 0 && !loadingProjects && (
                      <SelectItem value="none" disabled>No active projects</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <CreateProjectDialog onProjectCreated={handleProjectCreated} />
              </div>
            </div>
            {!selectedProjectId && (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Select a project to continue
              </p>
            )}
          </CardContent>
        </Card>
      ) : selectedProject && (
        <Card
          className="cursor-pointer hover:bg-muted/50 border-green-500/50 bg-green-50/50 dark:bg-green-950/20"
          onClick={() => setIsProjectExpanded(true)}
        >
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-medium text-sm">{selectedProject.name}</p>
                  {leadsCount > 0 && (
                    <p className="text-xs text-muted-foreground">{leadsCount} existing leads</p>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                Change
                <ChevronDown className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Analysis Workspace */}
      <AnimatedSection isVisible={showWorkspace} delay={0}>
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Left: Prospects Table (2 cols on desktop) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Quick Website Analysis */}
            <QuickWebsiteAnalysis
              selectedProjectId={selectedProjectId}
              disabled={false}
              engineOffline={isAnalysisEngineOffline}
              onSuccess={refreshLeads}
            />

            {/* Prospects Selector (without project dropdown - already selected above) */}
            <ProspectSelector
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              preSelectedIds={preSelectedIds}
              projectId={selectedProjectId}
              onProjectChange={handleProjectChange}
            />
          </div>

          {/* Right: Analysis Config (1 col on desktop) */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-20">
              <AnalysisConfig
                prospectCount={selectedIds.length}
                onSubmit={handleAnalyze}
                isLoading={false}
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
          </div>
        </div>
      </AnimatedSection>
    </PageLayout>
  );
}
