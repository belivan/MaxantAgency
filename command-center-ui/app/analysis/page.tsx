'use client';

/**
 * Analysis Page - REDESIGNED with Notion-Style Showcase
 * Beautiful feature showcase + analysis workflow
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ProspectSelector,
  AnalysisConfig,
  StatsOverview,
  FeaturesShowcase,
  BenchmarkManager,
  QuickWebsiteAnalysis
} from '@/components/analysis';
import { type AnalysisPrompts, type PromptConfig } from '@/components/analysis/prompt-editor';
import { useEngineHealth } from '@/lib/hooks';
import { useTaskProgress } from '@/lib/contexts/task-progress-context';
import { updateProject, getProject } from '@/lib/api';
import type { AnalysisOptionsFormData } from '@/lib/utils/validation';
import { startTaskWithSSE } from '@/lib/utils/task-sse-manager';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible';

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
  const { startTask, updateTask, addLog, completeTask, errorTask, cancelTask } = useTaskProgress();

  // Get pre-selected prospect IDs and project from URL
  const preSelectedIds = searchParams.get('prospect_ids')?.split(',') || [];
  const urlProjectId = searchParams.get('project_id');

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(urlProjectId || null);

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
  const [showFeatures, setShowFeatures] = useState(false);

  // Callback to refresh leads after quick analysis
  const refreshLeads = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

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

    // Save prompts to project (non-blocking)
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
    const API_BASE = process.env.NEXT_PUBLIC_ANALYSIS_API || 'http://localhost:3001';

    // Start task tracking
    const taskId = startTask('analysis', taskTitle, selectedIds.length);
    addLog(taskId, `Starting analysis of ${selectedIds.length} prospect(s)...`, 'info');

    try {
      // Queue analysis jobs
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

      if (jobIds.length === 0) {
        throw new Error('No jobs were queued');
      }

      addLog(taskId, `Queued ${jobIds.length} analysis job(s)`, 'info');

      // Show exclusion warnings
      if (queueData.exclusion_reasons) {
        const { no_website, problematic_website, already_analyzed } = queueData.exclusion_reasons;

        if (no_website && no_website.length > 0) {
          const companies = no_website.map((p: any) => p.company).join(', ');
          addLog(taskId, `⚠️ Skipped ${no_website.length} prospect(s) (no website): ${companies}`, 'warning');
        }

        if (problematic_website && problematic_website.length > 0) {
          const issues = problematic_website.map((p: any) => `${p.company} (${p.status})`).join(', ');
          addLog(taskId, `⚠️ Skipped ${problematic_website.length} prospect(s) (website issues): ${issues}`, 'warning');
        }

        if (already_analyzed && already_analyzed.length > 0) {
          const companies = already_analyzed.map((p: any) => p.company).join(', ');
          addLog(taskId, `ℹ️ ${already_analyzed.length} prospect(s) already analyzed (will update): ${companies}`, 'info');
        }
      }

      // Poll for status updates
      const pollInterval = setInterval(async () => {
        try {
          const queryString = jobIds.map((id: string) => `job_ids=${id}`).join('&');
          const statusResponse = await fetch(`${API_BASE}/api/analysis-status?${queryString}`);

          if (!statusResponse.ok) {
            console.error('Failed to fetch status');
            return;
          }

          const statusData = await statusResponse.json();
          const jobs = statusData.jobs || [];

          // Calculate overall progress
          const completedJobs = jobs.filter((j: any) => j.state === 'completed').length;
          const failedJobs = jobs.filter((j: any) => j.state === 'failed').length;
          const totalJobs = jobs.length;
          const progress = totalJobs > 0 ? (completedJobs + failedJobs) / totalJobs : 0;

          // Update task progress
          updateTask(taskId, completedJobs, `${completedJobs}/${totalJobs} complete`);

          // Log completed jobs
          jobs.forEach((job: any) => {
            if (job.state === 'completed' && job.result) {
              const result = job.result;
              if (result.company_name && result.grade) {
                addLog(taskId, `✅ ${result.company_name}: Grade ${result.grade} (${result.overall_score}/100)`, 'success');
              }
            } else if (job.state === 'failed') {
              addLog(taskId, `❌ Analysis failed: ${job.error || 'Unknown error'}`, 'error');
            }
          });

          // Check if all jobs are done
          const allDone = jobs.every((j: any) => ['completed', 'failed', 'cancelled'].includes(j.state));

          if (allDone) {
            clearInterval(pollInterval);

            const successCount = completedJobs;
            const failCount = failedJobs;

            if (failCount > 0) {
              addLog(taskId, `Analysis complete: ${successCount} succeeded, ${failCount} failed`, 'warning');
            } else {
              addLog(taskId, `✓ Analysis complete! ${successCount} leads analyzed`, 'success');
            }

            completeTask(taskId);
            refreshLeads();
          }
        } catch (pollError) {
          console.error('Error polling status:', pollError);
        }
      }, 3000); // Poll every 3 seconds

      // Timeout after 10 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
      }, 600000);

    } catch (error: any) {
      console.error('Analysis failed:', error);
      errorTask(taskId, error.message);
      alert(`Analysis failed: ${error.message}`);
    }
  };

  const isAnalysisEngineOffline = engineStatus.analysis === 'offline';

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-4 sm:px-5 sm:py-5 md:px-6 md:py-6 space-y-4 sm:space-y-6 md:space-y-8">
        {/* Page Title */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
          Website Analysis
        </h1>

        {/* Stats Overview */}
        <StatsOverview projectId={selectedProjectId} />

        {/* Feature Showcase - Collapsible */}
        <Collapsible open={showFeatures} onOpenChange={setShowFeatures}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground -ml-2">
              {showFeatures ? <ChevronUp className="w-4 h-4 mr-2" /> : <ChevronDown className="w-4 h-4 mr-2" />}
              {showFeatures ? 'Hide' : 'Show'} AI Features
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <FeaturesShowcase />
          </CollapsibleContent>
        </Collapsible>

        {/* Main Content Tabs */}
        <Tabs defaultValue="analyze" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="analyze" className="text-xs sm:text-sm">
              <Sparkles className="w-4 h-4 mr-1 sm:mr-2 hidden sm:block" />
              <span>Analyze</span>
            </TabsTrigger>
            <TabsTrigger value="benchmarks" className="text-xs sm:text-sm">
              Benchmarks
            </TabsTrigger>
          </TabsList>

          {/* Analyze Tab */}
          <TabsContent value="analyze" className="space-y-4 sm:space-y-6">
            {isAnalysisEngineOffline && (
              <Alert variant="destructive" className="py-2 sm:py-3">
                <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <AlertDescription className="text-xs sm:text-sm">
                  Analysis engine offline (port 3001)
                </AlertDescription>
              </Alert>
            )}

            {/* Analysis Section - Grid with mobile-first order */}
            <div className="grid gap-4 sm:gap-5 md:gap-6 lg:grid-cols-3">
              {/* Prospect Selector - First on mobile, left column row 2 on desktop */}
              <div className="order-1 lg:order-3 lg:col-span-2">
                <ProspectSelector
                  selectedIds={selectedIds}
                  onSelectionChange={setSelectedIds}
                  preSelectedIds={preSelectedIds}
                  projectId={selectedProjectId}
                  onProjectChange={setSelectedProjectId}
                />
              </div>

              {/* Quick Website Analysis - Second on mobile, left column row 1 on desktop */}
              <div className="order-2 lg:order-1 lg:col-span-2">
                <QuickWebsiteAnalysis
                  selectedProjectId={selectedProjectId}
                  disabled={false}
                  engineOffline={isAnalysisEngineOffline}
                  onSuccess={refreshLeads}
                />
              </div>

              {/* Analysis Config - Third on mobile, right column spanning rows on desktop */}
              <div className="order-3 lg:order-2 lg:row-span-2">
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
