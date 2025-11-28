'use client';

/**
 * Prospecting Page with Progressive Disclosure
 * Step 1: Select Project → Step 2: Configure ICP & Generate
 */

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  ICPBriefEditor,
  EnhancedProspectConfigForm,
  QuickBusinessLookup,
  StepIndicator,
  ProjectSelectionCard,
  AnimatedSection
} from '@/components/prospecting';
import { parseJSON } from '@/lib/utils/validation';
import { useEngineHealth } from '@/lib/hooks';
import { useTaskProgress } from '@/lib/contexts/task-progress-context';
import { updateProject } from '@/lib/api';
import type { ProspectGenerationOptions } from '@/lib/types';
import type { ProspectingPrompts } from '@/lib/types/prospect';
import { startTaskWithSSE } from '@/lib/utils/task-sse-manager';

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
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Prospecting</h1>
        <p className="text-muted-foreground">
          Generate prospects using your Ideal Customer Profile brief
        </p>
      </div>

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

      {/* Step 2: Configuration (animated reveal) */}
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

    </div>
  );
}
