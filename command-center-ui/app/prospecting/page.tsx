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
import { ProjectSelector } from '@/components/shared';
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
  const [icpBriefLocked, setIcpBriefLocked] = useState(false);
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

  // Load project data and check if ICP brief is locked when project is selected
  useEffect(() => {
    async function loadProjectData() {
      if (!selectedProjectId) {
        // Clear everything when no project selected
        setIcpBriefLocked(false);
        setProspectCount(0);
        setIsLoadingProject(false);
        setIcpBrief(''); // Clear ICP brief editor
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
        let hasIcpBrief = false;
        if (projectResponse.ok) {
          const projectData = await projectResponse.json();
          hasIcpBrief = !!(projectData.success && projectData.data?.icp_brief);

          console.log('[ICP Load] Project data loaded:', {
            projectId: selectedProjectId,
            projectName: projectData.data?.name,
            hasIcpBrief,
            icpBrief: projectData.data?.icp_brief
          });

          if (hasIcpBrief) {
            // Pre-fill ICP brief editor with project's saved ICP
            const formattedBrief = JSON.stringify(projectData.data.icp_brief, null, 2);
            console.log('[ICP Load] Pre-filling ICP brief editor:', formattedBrief);
            setIcpBrief(formattedBrief);
            setIcpValid(true);
          } else {
            console.log('[ICP Load] No ICP brief found for project - editor will be empty');
          }
        } else {
          console.error('[ICP Load] Failed to fetch project data');
        }

        // Check prospect count
        let count = 0;
        if (prospectsResponse.ok) {
          const prospectsData = await prospectsResponse.json();
          count = prospectsData.data?.length || 0;
          console.log('[Prospect Count] Raw API response:', {
            success: prospectsData.success,
            dataLength: prospectsData.data?.length,
            data: prospectsData.data,
            count
          });
          setProspectCount(count);
        } else {
          console.error('[Prospect Count] Failed to fetch prospects');
        }

        // ICP is locked if:
        // 1. Project has an ICP brief saved (user clicked Generate), OR
        // 2. Project has prospects (generation completed)
        const shouldBeLocked = hasIcpBrief || count > 0;
        setIcpBriefLocked(shouldBeLocked);

        console.log('[ICP Lock Status]', {
          hasIcpBrief,
          prospectCount: count,
          locked: shouldBeLocked
        });
      } catch (error) {
        console.error('Failed to load project data:', error);
      } finally {
        // Clear loading state
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

  // Callback to receive prompt changes from EnhancedProspectConfigForm
  const handlePromptsChange = (defaults: ProspectingPrompts, current: ProspectingPrompts) => {
    setDefaultPrompts(defaults);
    setCurrentPrompts(current);
  };

  const handleGenerate = async (config: ProspectGenerationOptions) => {
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

      // STEP 1: Save ICP brief to project FIRST (locks it immediately)
      if (effectiveProjectId && !icpBriefLocked) {
        try {
          addTaskLog(taskId, 'Saving ICP brief to project...', 'info');
          console.log('[ICP Lock] Saving ICP brief before generation starts');

          await updateProject(effectiveProjectId, {
            icp_brief: briefResult.data
          });

          // Lock ICP immediately - user can't change it now
          setIcpBriefLocked(true);
          setIcpBriefSaved(true);

          addTaskLog(taskId, 'ICP brief locked for this project', 'success');
          console.log('[ICP Lock] ICP brief saved and locked');
        } catch (err: any) {
          console.error('[ICP Lock] Failed to save ICP brief:', err);

          // If already locked, that's expected
          if (err.message?.includes('Cannot modify ICP brief')) {
            addTaskLog(taskId, 'ICP brief is already locked', 'info');
          } else {
            // Unexpected error - but continue with generation
            addTaskLog(taskId, `Warning: Could not save ICP brief: ${err.message}`, 'warning');
          }
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
                  console.log('[Generation Complete]', {
                    count,
                    projectId: selectedProjectId,
                    icpLocked: icpBriefLocked
                  });

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

        // If generation was interrupted/cancelled and no prospects were created, unlock ICP
        if (!generationCompleted && selectedProjectId && icpBriefLocked) {
          try {
            // Check if any prospects were actually created
            const prospectsCheckResponse = await fetch(`/api/projects/${selectedProjectId}/prospects`);
            const prospectsCheckData = await prospectsCheckResponse.json();
            const currentProspectCount = prospectsCheckData.data?.length || 0;

            // If no prospects exist, unlock the ICP by removing it
            if (currentProspectCount === 0) {
              console.log('[ICP Unlock] Generation interrupted with 0 prospects - unlocking ICP');
              await updateProject(selectedProjectId, {
                icp_brief: {} as any
              });
              setIcpBriefLocked(false);
              setIcpBriefSaved(false);
              addTaskLog(taskId, 'ICP unlocked (generation cancelled, no prospects created)', 'info');
            }
          } catch (unlockError) {
            console.error('[ICP Unlock] Failed to unlock ICP after interruption:', unlockError);
          }
        }
      }

    } catch (error: any) {
      errorTask(taskId, `Failed to start generation: ${error.message}`);

      // If generation failed and we just locked the ICP, unlock it (no prospects were created)
      if (selectedProjectId && icpBriefLocked) {
        try {
          // Check if any prospects were actually created
          const prospectsCheckResponse = await fetch(`/api/projects/${selectedProjectId}/prospects`);
          const prospectsCheckData = await prospectsCheckResponse.json();
          const currentProspectCount = prospectsCheckData.data?.length || 0;

          // If no prospects exist, unlock the ICP by removing it
          if (currentProspectCount === 0) {
            console.log('[ICP Unlock] Generation failed with 0 prospects - unlocking ICP');
            await updateProject(selectedProjectId, {
              icp_brief: {} as any
            });
            setIcpBriefLocked(false);
            setIcpBriefSaved(false);
            addTaskLog(taskId, 'ICP unlocked (generation failed, no prospects created)', 'info');
          }
        } catch (unlockError) {
          console.error('[ICP Unlock] Failed to unlock ICP:', unlockError);
        }
      }
    }
  };

  const isProspectingEngineOffline = engineStatus.prospecting === 'offline';

  // Debug logging for render
  console.log('[Prospecting Page Render]', {
    selectedProjectId,
    prospectCount,
    icpBriefLocked,
    icpValid
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Prospecting</h1>
        <p className="text-muted-foreground">
          Generate prospects using your Ideal Customer Profile brief
        </p>
      </div>

      {/* Project Selector */}
      <div className="max-w-md">
        <ProjectSelector
          value={selectedProjectId}
          onChange={setSelectedProjectId}
          label="Project"
        />
        {selectedProjectId ? (
          <p className="text-sm text-muted-foreground mt-2">
            Prospects will be associated with this project, and your ICP brief will be saved.
          </p>
        ) : (
          <Alert className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Project Required</AlertTitle>
            <AlertDescription>
              Select a project to generate prospects. All prospects must be associated with a project for proper organization and ICP tracking.
            </AlertDescription>
          </Alert>
        )}
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
            locked={icpBriefLocked}
            prospectCount={prospectCount}
          />
        </div>

        {/* Right Column - Enhanced Config Form */}
        <div>
          <EnhancedProspectConfigForm
            onSubmit={handleGenerate}
            onPromptsChange={handlePromptsChange}
            isLoading={isProspecting}
            disabled={!selectedProjectId || !icpValid || isProspectingEngineOffline || isProspecting}
            locked={icpBriefLocked}
            prospectCount={prospectCount}
            isLoadingProject={isLoadingProject}
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
