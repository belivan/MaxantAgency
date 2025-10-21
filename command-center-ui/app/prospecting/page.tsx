'use client';

/**
 * Prospecting Page
 * Generate and manage prospects using ICP brief
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  ICPBriefEditor,
  EnhancedProspectConfigForm
} from '@/components/prospecting';
import { parseJSON } from '@/lib/utils/validation';
import { useEngineHealth } from '@/lib/hooks';
import { useTaskProgress } from '@/lib/contexts/task-progress-context';
import { updateProject, getProject, createProject } from '@/lib/api';
import type { ProspectGenerationOptions } from '@/lib/types';
import type { ProspectingPrompts } from '@/lib/types/prospect';

export default function ProspectingPage() {
  const engineStatus = useEngineHealth();
  const searchParams = useSearchParams();
  const { startTask, updateTask, addLog: addTaskLog, completeTask, errorTask, activeTasks } = useTaskProgress();

  // Check if there's an active prospecting task
  const isProspecting = activeTasks.some(task => task.type === 'prospecting');

  // Project selection state
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [icpBriefSaved, setIcpBriefSaved] = useState(false);
  const [prospectCount, setProspectCount] = useState(0);
  const [isLoadingProject, setIsLoadingProject] = useState(false);

  // ICP Brief state
  const [icpBrief, setIcpBrief] = useState('');
  const [icpValid, setIcpValid] = useState(false);

  // Generation state (minimal - just to track completion)
  const [generatedCount, setGeneratedCount] = useState<number>(0);

  // Prompt state for auto-fork detection
  const [defaultPrompts, setDefaultPrompts] = useState<ProspectingPrompts | null>(null);
  const [currentPrompts, setCurrentPrompts] = useState<ProspectingPrompts | null>(null);

  // Read project_id from URL params on mount
  useEffect(() => {
    const projectIdParam = searchParams.get('project_id');
    if (projectIdParam) {
      setSelectedProjectId(projectIdParam);
    }
  }, [searchParams]);

  // Debug: Track prospect count changes
  useEffect(() => {
    console.log('[Prospect Count Changed]', {
      newCount: prospectCount,
      projectId: selectedProjectId
    });
  }, [prospectCount]);

  // Load project data when project is selected
  useEffect(() => {
    async function loadProjectData() {
      if (!selectedProjectId) {
        // Clear everything when no project selected
        setProspectCount(0);
        setIsLoadingProject(false);
        setIcpBrief('');
        setIcpValid(false);
        return;
      }

      // Set loading state to prevent showing stale data
      setIsLoadingProject(true);

      try {
        // Fetch project data and prospect count in parallel
        const [projectResponse, prospectsResponse] = await Promise.all([
          fetch(`/api/projects/${selectedProjectId}`),
          fetch(`/api/projects/${selectedProjectId}/prospects`)
        ]);

        // Load project ICP brief if it exists
        if (projectResponse.ok) {
          const projectData = await projectResponse.json();
          const hasIcpBrief = !!(projectData.success && projectData.data?.icp_brief);

          if (hasIcpBrief) {
            // Pre-fill ICP brief editor with project's saved ICP
            const formattedBrief = JSON.stringify(projectData.data.icp_brief, null, 2);
            setIcpBrief(formattedBrief);
            setIcpValid(true);
          }
        }

        // Check prospect count
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

  // Helper: Check if prompts have been modified
  const hasModifiedPrompts = () => {
    if (!currentPrompts || !defaultPrompts) return false;

    const keys: Array<keyof ProspectingPrompts> = ['queryUnderstanding', 'websiteExtraction', 'relevanceCheck'];

    return keys.some((key) => {
      const current = currentPrompts[key];
      const defaultVal = defaultPrompts[key];

      if (!current || !defaultVal) return false;

      return (
        current.model !== defaultVal.model ||
        current.temperature !== defaultVal.temperature ||
        current.systemPrompt !== defaultVal.systemPrompt ||
        current.userPromptTemplate !== defaultVal.userPromptTemplate
      );
    });
  };

  // Fork warnings: Show whenever prospects exist to warn that changes will trigger fork
  // The actual auto-fork is triggered by hasModifiedPrompts() + prospectCount > 0 at generation time
  const shouldShowPromptsForkWarning = prospectCount > 0;
  const shouldShowICPForkWarning = prospectCount > 0;

  // Callback to receive prompt changes from EnhancedProspectConfigForm
  const handlePromptsChange = (defaults: ProspectingPrompts, current: ProspectingPrompts) => {
    setDefaultPrompts(defaults);
    setCurrentPrompts(current);
  };

  const handleGenerate = async (config: ProspectGenerationOptions) => {
    // Validate project selection
    if (!selectedProjectId) {
      alert('Please select a project to generate prospects');
      return;
    }

    // Validate ICP brief
    const briefResult = parseJSON(icpBrief);
    if (!briefResult.success) {
      return;
    }

    // Reset state
    setGeneratedCount(0);
    setIcpBriefSaved(false);

    // Start global task with estimated total
    const taskId = startTask('prospecting', `Generate ${config.count} prospects`, config.count);
    addTaskLog(taskId, 'Starting prospect generation...', 'info');

    let effectiveProjectId = selectedProjectId;

    try {
      // AUTO-FORK LOGIC: If prompts modified AND prospects exist, create new project
      if (selectedProjectId && hasModifiedPrompts() && prospectCount > 0) {
        try {
          console.log('[Auto-Fork] Prompts modified + prospects exist → Creating new project');
          addTaskLog(taskId, 'Prompts modified - creating forked project...', 'info');

          // Fetch original project data
          const originalProject = await getProject(selectedProjectId);

          // Create new project with modified prompts
          const newProject = await createProject({
            name: `${originalProject.name} (v2)`,
            description: `Forked from ${originalProject.name} with custom prospecting prompts`,
            icp_brief: originalProject.icp_brief,
            prospecting_prompts: currentPrompts // Save the modified prompts
          });

          console.log('[Auto-Fork] Created new project:', newProject.id);
          addTaskLog(taskId, `Created new project: "${newProject.name}" with custom prompts`, 'success');

          alert(`📋 Auto-Fork: Created new project "${newProject.name}" with custom prompts`);

          // Use the new project for this generation
          effectiveProjectId = newProject.id;
          setSelectedProjectId(newProject.id);
        } catch (error: any) {
          console.error('[Auto-Fork] Failed to create new project:', error);
          addTaskLog(taskId, `Warning: Failed to auto-fork project: ${error.message}`, 'warning');
          // Continue with original project
        }
      }

      // STEP 1: Save ICP brief to project
      if (effectiveProjectId) {
        try {
          addTaskLog(taskId, 'Saving ICP brief to project...', 'info');

          await updateProject(effectiveProjectId, {
            icp_brief: briefResult.data
          });

          setIcpBriefSaved(true);
          addTaskLog(taskId, 'ICP brief saved', 'success');
        } catch (err: any) {
          console.error('Failed to save ICP brief:', err);
          addTaskLog(taskId, `Warning: Could not save ICP brief: ${err.message}`, 'warning');
        }
      }

      // STEP 2: Start prospect generation
      const API_BASE = process.env.NEXT_PUBLIC_PROSPECTING_API || 'http://localhost:3010';

      // Prepare brief with count
      const brief = {
        ...briefResult.data,
        count: config.count
      };

      // Prepare options with model selections and custom prompts
      const options = {
        model: config.model,
        verify: config.verify,
        projectId: selectedProjectId || undefined
      };

      const response = await fetch(`${API_BASE}/api/prospect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief,
          options,
          custom_prompts: config.custom_prompts || undefined
        })
      });

      if (!response.ok) {
        throw new Error('Failed to start prospect generation');
      }

      addTaskLog(taskId, 'Connected to prospect generation stream', 'success');

      // Read SSE stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let generationCompleted = false; // Track if generation finished successfully

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');

          // Keep last incomplete line in buffer
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const event = JSON.parse(line.slice(6));

                // Handle different event types
                if (event.type === 'started') {
                  addTaskLog(taskId, 'Prospect generation started', 'info');
                }

                // Handle step events (query understanding, discovery, etc.)
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
                    } else {
                      addTaskLog(taskId, `${stepName} completed`, 'success');
                    }
                  }
                }

                // Handle progress events (processing individual companies)
                if (event.type === 'progress') {
                  const message = event.company
                    ? `Processing ${event.company} (${event.current}/${event.total})`
                    : `Processing prospect ${event.current}/${event.total}`;

                  updateTask(taskId, event.current || 0, message);
                  addTaskLog(taskId, message, 'info');
                }

                // Log any explicit message from the server
                if (event.message) {
                  addTaskLog(taskId, event.message, 'info');
                }

                // Handle completion
                if (event.type === 'complete') {
                  const count = event.results?.prospects?.length || event.results?.count || 0;
                  setGeneratedCount(count);
                  setProspectCount(prev => prev + count); // Update prospect count
                  generationCompleted = true; // Mark as completed

                  addTaskLog(taskId, `Successfully generated ${count} prospects`, 'success');

                  completeTask(taskId);
                  return;
                }

                // Handle errors
                if (event.type === 'error') {
                  errorTask(taskId, event.message || 'Unknown error');
                  return;
                }
              } catch (parseError) {
                console.error('Failed to parse SSE event:', line, parseError);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

    } catch (error: any) {
      errorTask(taskId, `Failed to start generation: ${error.message}`);
    }
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

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - ICP Brief */}
        <div className="lg:col-span-2">
          <ICPBriefEditor
            value={icpBrief}
            onChange={setIcpBrief}
            onValidChange={setIcpValid}
            showForkWarning={shouldShowICPForkWarning}
            prospectCount={prospectCount}
          />
        </div>

        {/* Right Column - Enhanced Config Form */}
        <div>
          <EnhancedProspectConfigForm
            onSubmit={handleGenerate}
            onPromptsChange={handlePromptsChange}
            isLoading={isProspecting}
            disabled={!icpValid || isProspectingEngineOffline || isProspecting}
            showForkWarning={shouldShowPromptsForkWarning}
            prospectCount={prospectCount}
            isLoadingProject={isLoadingProject}
            selectedProjectId={selectedProjectId}
            onProjectChange={setSelectedProjectId}
          />
        </div>
      </div>

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
              <>
                <span className="block mt-1">
                  ICP brief saved to project.
                </span>
              </>
            )}
            <a
              href="/analysis"
              className="underline font-medium hover:text-green-950 dark:hover:text-green-50 inline-block mt-1"
            >
              Go to the Analysis tab
            </a>{' '}
            to select and analyze them.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
