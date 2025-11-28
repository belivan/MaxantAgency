'use client';

/**
 * Prospecting Page with Progressive Disclosure
 * Step 1: Select Project → Step 2: Configure ICP & Generate
 */

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, Search, ChevronDown, ChevronUp, MapPin, Globe, Users, Brain } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  ICPBriefEditor,
  EnhancedProspectConfigForm,
  QuickBusinessLookup,
  StepIndicator,
  ProjectSelectionCard,
  AnimatedSection
} from '@/components/prospecting';
import { PageLayout } from '@/components/shared';
import { parseJSON } from '@/lib/utils/validation';
import { useEngineHealth } from '@/lib/hooks';
import { useTaskProgress } from '@/lib/contexts/task-progress-context';
import { updateProject } from '@/lib/api';
import type { ProspectGenerationOptions } from '@/lib/types';
import type { ProspectingPrompts } from '@/lib/types/prospect';
import { startTaskWithSSE } from '@/lib/utils/task-sse-manager';

// Prospecting Engine Info Component
function ProspectingEngineInfo({ isExpanded, onToggle }: { isExpanded: boolean; onToggle: () => void }) {
  return (
    <div className="group rounded-xl border border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent hover:border-green-500/40 hover:shadow-lg hover:shadow-green-500/5 transition-all duration-300 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-5 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
            <Search className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Prospecting Engine</h3>
            <p className="text-sm text-muted-foreground">3 AI agents discover businesses, extract contacts, and score ICP fit</p>
          </div>
        </div>
        {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
      </button>

      {isExpanded && (
        <div className="px-5 pb-5 border-t border-border/50">
          <div className="pt-4 space-y-4">
            {/* Capabilities */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <MapPin className="w-3.5 h-3.5 text-red-500" />
                Search Google Maps by location & industry
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <Globe className="w-3.5 h-3.5 text-blue-500" />
                Extract emails, phones & social profiles from websites
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <Brain className="w-3.5 h-3.5 text-emerald-500" />
                AI scores each prospect against your ICP criteria
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-500" />
                Smart deduplication - no duplicates, ever
              </div>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-4 pt-2 text-xs">
              <span className="px-2 py-1 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 font-medium">~$0.02/prospect</span>
              <span className="px-2 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium">8-15s each</span>
              <span className="px-2 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-medium">Iterative discovery</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProspectingPage() {
  const engineStatus = useEngineHealth();
  const searchParams = useSearchParams();
  const { startTask, updateTask, addLog: addTaskLog, completeTask, errorTask, cancelTask } = useTaskProgress();

  // Project selection state
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [icpBriefSaved, setIcpBriefSaved] = useState(false);
  const [prospectCount, setProspectCount] = useState(0);
  const [isLoadingProject, setIsLoadingProject] = useState(false);

  // ICP Brief state
  const [icpBrief, setIcpBrief] = useState('');
  const [icpValid, setIcpValid] = useState(false);

  // Generation state
  const [generatedCount, setGeneratedCount] = useState<number>(0);

  // Current configuration
  const [defaultPrompts, setDefaultPrompts] = useState<ProspectingPrompts | null>(null);
  const [currentPrompts, setCurrentPrompts] = useState<ProspectingPrompts | null>(null);
  const [currentModelSelections, setCurrentModelSelections] = useState<Record<string, string> | null>(null);

  // Derive current step from state
  const currentStep = useMemo((): 1 | 2 | 3 => {
    if (!selectedProjectId) return 1;
    if (prospectCount === 0 && generatedCount === 0) return 2;
    return 3;
  }, [selectedProjectId, prospectCount, generatedCount]);

  // Animation visibility state
  const [showConfiguration, setShowConfiguration] = useState(false);

  // Info panel state
  const [showEngineInfo, setShowEngineInfo] = useState(false);

  // Trigger configuration section animation when project selected
  useEffect(() => {
    if (selectedProjectId) {
      const timer = setTimeout(() => setShowConfiguration(true), 150);
      return () => clearTimeout(timer);
    } else {
      setShowConfiguration(false);
    }
  }, [selectedProjectId]);

  // Read project_id from URL params on mount
  useEffect(() => {
    const projectIdParam = searchParams.get('project_id');
    if (projectIdParam) {
      setSelectedProjectId(projectIdParam);
    }
  }, [searchParams]);

  // Load project data when project is selected
  useEffect(() => {
    async function loadProjectData() {
      if (!selectedProjectId) {
        setProspectCount(0);
        setIsLoadingProject(false);
        setIcpBrief('');
        setIcpValid(false);
        setCurrentPrompts(null);
        setCurrentModelSelections(null);
        return;
      }

      setIsLoadingProject(true);

      try {
        const [projectResponse, prospectsResponse] = await Promise.all([
          fetch(`/api/projects/${selectedProjectId}`),
          fetch(`/api/projects/${selectedProjectId}/prospects`)
        ]);

        if (projectResponse.ok) {
          const projectData = await projectResponse.json();
          const project = projectData.data;

          if (project?.icp_brief) {
            const formattedBrief = JSON.stringify(project.icp_brief, null, 2);
            setIcpBrief(formattedBrief);
            setIcpValid(true);
          } else {
            setIcpBrief('');
            setIcpValid(false);
          }

          if (project?.prospecting_model_selections) {
            setCurrentModelSelections(project.prospecting_model_selections);
          }
          if (project?.prospecting_prompts) {
            setCurrentPrompts(project.prospecting_prompts);
            setDefaultPrompts(project.prospecting_prompts);
          }
        }

        if (prospectsResponse.ok) {
          const prospectsData = await prospectsResponse.json();
          const count = prospectsData.data?.length || 0;
          setProspectCount(count);
        }
      } catch (error) {
        console.error('Failed to load project data:', error);
      } finally {
        setIsLoadingProject(false);
      }
    }

    loadProjectData();
  }, [selectedProjectId]);

  const handlePromptsChange = (defaults: ProspectingPrompts, current: ProspectingPrompts) => {
    setDefaultPrompts(defaults);
    setCurrentPrompts(current);
  };

  const handleModelsChange = (modelSelections: Record<string, string>) => {
    setCurrentModelSelections(modelSelections);
  };

  // Refresh prospect count
  const refreshProspectCount = async () => {
    if (!selectedProjectId) return;
    try {
      const res = await fetch(`/api/projects/${selectedProjectId}/prospects`);
      if (res.ok) {
        const data = await res.json();
        setProspectCount(data.data?.length || 0);
      }
    } catch (err) {
      console.error('Failed to refresh prospect count:', err);
    }
  };

  const handleGenerate = async (config: ProspectGenerationOptions) => {
    if (!selectedProjectId) {
      alert('Please select a project to generate prospects');
      return;
    }

    const briefResult = parseJSON(icpBrief);
    if (!briefResult.success) {
      return;
    }

    setGeneratedCount(0);
    setIcpBriefSaved(false);

    try {
      await updateProject(selectedProjectId, {
        icp_brief: briefResult.data,
        prospecting_prompts: currentPrompts || undefined,
        prospecting_model_selections: currentModelSelections || undefined
      });

      setIcpBriefSaved(true);
      console.log('✓ Saved configuration to project');
    } catch (err: any) {
      console.error('Failed to save configuration:', err);
    }

    const API_BASE = process.env.NEXT_PUBLIC_PROSPECTING_API || 'http://localhost:3010';
    const brief = { ...briefResult.data, count: config.count };
    const options = {
      model: config.model,
      verify: config.verify,
      projectId: selectedProjectId,
      useIterativeDiscovery: true,
      maxIterations: 5,
      maxVariationsPerIteration: 3
    };

    const connection = startTaskWithSSE({
      url: `${API_BASE}/api/prospect`,
      method: 'POST',
      body: {
        brief,
        options,
        custom_prompts: config.custom_prompts || undefined,
        model_selections: config.model_selections || undefined
      },
      taskType: 'prospecting',
      title: `Generate ${config.count} prospects`,
      total: config.count,
      taskManager: {
        startTask,
        updateTask,
        addLog: addTaskLog,
        completeTask,
        errorTask,
        cancelTask
      },
      onMessage: (message, taskId) => {
        const event = message.data as any;

        if (event.type === 'started') {
          addTaskLog(taskId, 'Prospect generation started', 'info');
        }

        if (event.type === 'step') {
          const stepNames: Record<string, string> = {
            'query-understanding': 'Understanding search query',
            'google-maps-discovery': 'Discovering companies on Google Maps',
            'website-verification': 'Verifying websites',
            'website-scraping': 'Scraping website data',
            'social-discovery': 'Finding social media profiles'
          };

          const stepName = stepNames[event.name] || event.name;

          if (event.status === 'started') {
            addTaskLog(taskId, `${stepName}...`, 'info');
          } else if (event.status === 'completed') {
            if (event.found !== undefined) {
              addTaskLog(taskId, `Found ${event.found} companies`, 'success');
              if (event.name === 'google-maps-discovery' && event.found > 0) {
                updateTask(taskId, 0, `Processing ${event.found} companies...`, event.found);
              }
            } else {
              addTaskLog(taskId, `${stepName} completed`, 'success');
            }
          }
        }

        if (event.type === 'discovery_progress') {
          if (event.message) {
            const messageText = typeof event.message === 'string'
              ? event.message
              : JSON.stringify(event.message);
            addTaskLog(taskId, messageText, 'info');
          }
          if (event.currentCount !== undefined && event.target !== undefined) {
            updateTask(taskId, event.currentCount, event.message || 'Discovering prospects...');
          }
        }

        if (event.type === 'progress') {
          const msg = event.company
            ? `Processing ${event.company} (${event.current}/${event.total})`
            : `Processing prospect ${event.current}/${event.total}`;

          updateTask(taskId, event.current || 0, msg);
          addTaskLog(taskId, msg, 'info');

          if (event.current && event.current % 2 === 0 && selectedProjectId) {
            refreshProspectCount();
          }
        }

        if (event.message && event.type !== 'discovery_progress' && event.type !== 'progress') {
          const messageText = typeof event.message === 'string'
            ? event.message
            : JSON.stringify(event.message);
          addTaskLog(taskId, messageText, 'info');
        }
      },
      onComplete: (data, taskId) => {
        const results = data as any;
        const count = results?.prospects?.length || results?.saved || 0;
        setGeneratedCount(count);

        if (selectedProjectId) {
          fetch(`/api/projects/${selectedProjectId}/prospects`)
            .then(res => res.json())
            .then(prospectsData => {
              const actualCount = prospectsData.data?.length || 0;
              setProspectCount(actualCount);
              addTaskLog(taskId, `Project now has ${actualCount} total prospects`, 'info');
            })
            .catch(() => {
              setProspectCount(prev => prev + count);
            });
        }

        addTaskLog(taskId, `Successfully generated ${count} prospects`, 'success');
      },
      onError: (error, taskId) => {
        console.error('Prospecting failed:', error);
        alert(`Prospect generation failed: ${error.message}`);
      }
    });

    console.log(`✓ Started prospecting task: ${connection.taskId} (non-blocking)`);
  };

  const isProspectingEngineOffline = engineStatus.prospecting === 'offline';

  return (
    <PageLayout
      title="Prospecting"
      description="Transform your ICP brief into verified business leads"
    >
      {/* Prospecting Engine Info */}
      <ProspectingEngineInfo isExpanded={showEngineInfo} onToggle={() => setShowEngineInfo(!showEngineInfo)} />

      {/* Step Indicator */}
      <StepIndicator currentStep={currentStep} />

      {/* Engine Offline Warning */}
      {isProspectingEngineOffline && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Prospecting Engine Offline</AlertTitle>
          <AlertDescription>
            The prospecting engine is not responding. Please start the prospecting-engine service (port 3010) to generate prospects.
          </AlertDescription>
        </Alert>
      )}

      {/* Step 1: Project Selection */}
      <ProjectSelectionCard
        selectedProjectId={selectedProjectId}
        onProjectChange={setSelectedProjectId}
        prospectCount={prospectCount}
      />

      {/* Step 2: Configuration (animated reveal) - only render when project selected */}
      {selectedProjectId && (
        <AnimatedSection isVisible={showConfiguration} delay={0}>
        <div className="space-y-6">
          {/* Configuration Info */}
          {selectedProjectId && prospectCount > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Project Configuration</AlertTitle>
              <AlertDescription>
                This project has {prospectCount} existing prospects. Any configuration changes will be saved to the project.
              </AlertDescription>
            </Alert>
          )}

          {/* Main Configuration Grid */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Column - ICP Brief */}
            <div className="lg:col-span-2">
              <ICPBriefEditor
                value={icpBrief}
                onChange={setIcpBrief}
                onValidChange={setIcpValid}
                showForkWarning={false}
                prospectCount={prospectCount}
              />
            </div>

            {/* Right Column - Quick Lookup & Config Form */}
            <div className="space-y-6">
              <QuickBusinessLookup
                selectedProjectId={selectedProjectId}
                disabled={false}
                engineOffline={isProspectingEngineOffline}
                onSuccess={refreshProspectCount}
              />

              <EnhancedProspectConfigForm
                onSubmit={handleGenerate}
                onPromptsChange={handlePromptsChange}
                onModelsChange={handleModelsChange}
                isLoading={false}
                disabled={isProspectingEngineOffline}
                showForkWarning={false}
                prospectCount={prospectCount}
                isLoadingProject={isLoadingProject}
                selectedProjectId={selectedProjectId}
                savedModelSelections={currentModelSelections || undefined}
                savedPrompts={currentPrompts || undefined}
                icpValid={icpValid}
              />
            </div>
          </div>
        </div>
      </AnimatedSection>
      )}

      {/* Success Message */}
      {generatedCount > 0 && (
        <Alert className="bg-green-50 dark:bg-green-950 border-green-600">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-900 dark:text-green-100">
            Generation Complete!
          </AlertTitle>
          <AlertDescription className="text-green-800 dark:text-green-200">
            Successfully generated <strong>{generatedCount} prospects</strong>.{' '}
            {icpBriefSaved && selectedProjectId && (
              <span className="block mt-1">
                Configuration saved to project.
              </span>
            )}
            <a
              href={`/projects/${selectedProjectId}`}
              className="underline font-medium hover:text-green-950 dark:hover:text-green-50 inline-block mt-1"
            >
              View project details →
            </a>
          </AlertDescription>
        </Alert>
      )}
    </PageLayout>
  );
}
