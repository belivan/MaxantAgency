'use client';

/**
 * Prospecting Page
 * Generate and manage prospects using ICP brief
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, Zap } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ICPBriefEditor,
  EnhancedProspectConfigForm,
  ProspectTable
} from '@/components/prospecting';
import { parseJSON } from '@/lib/utils/validation';
import { useEngineHealth, useProspects } from '@/lib/hooks';
import { useTaskProgress } from '@/lib/contexts/task-progress-context';
import { updateProject, getProject, createProject } from '@/lib/api';
import type { ProspectGenerationOptions, ProspectFilters } from '@/lib/types';
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

  // Model selections for auto-fork detection
  const [currentModelSelections, setCurrentModelSelections] = useState<Record<string, string> | null>(null);

  // Saved values from project (to pre-fill form and detect changes)
  const [savedModelSelections, setSavedModelSelections] = useState<Record<string, string> | undefined>(undefined);
  const [savedPrompts, setSavedPrompts] = useState<ProspectingPrompts | undefined>(undefined);
  const [savedIcpBrief, setSavedIcpBrief] = useState<any | undefined>(undefined);

  // Prospect selection for intelligent analysis
  const [selectedProspectIds, setSelectedProspectIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<ProspectFilters>({
    status: 'ready_for_analysis',
    verified: true,
    limit: 10,
    offset: 0,
    project_id: selectedProjectId || undefined
  });

  const { prospects, loading: loadingProspects, refresh: refreshProspects, total: totalProspects } = useProspects(filters);

  // Update filters when project changes
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      project_id: selectedProjectId || undefined,
      offset: 0
    }));
  }, [selectedProjectId]);

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
      console.log('[Load Project Data Called]', { selectedProjectId });

      if (!selectedProjectId) {
        // Clear everything when no project selected
        console.log('[Clearing Project Data] No project selected');
        setProspectCount(0);
        setIsLoadingProject(false);
        setIcpBrief('');
        setIcpValid(false);
        setSavedIcpBrief(undefined);
        setSavedModelSelections(undefined);
        setSavedPrompts(undefined);
        return;
      }

      // Set loading state to prevent showing stale data
      console.log('[Loading Project Data]', selectedProjectId);
      setIsLoadingProject(true);

      try {
        // Fetch project data and prospect count in parallel
        const [projectResponse, prospectsResponse] = await Promise.all([
          fetch(`/api/projects/${selectedProjectId}`),
          fetch(`/api/projects/${selectedProjectId}/prospects`)
        ]);

        // Load project data if exists
        if (projectResponse.ok) {
          const projectData = await projectResponse.json();
          const project = projectData.data;

          console.log('[Project Loaded]', {
            projectId: selectedProjectId,
            hasIcpBrief: !!project?.icp_brief,
            hasModelSelections: !!project?.prospecting_model_selections,
            hasPrompts: !!project?.prospecting_prompts
          });

          // Pre-fill ICP brief if it exists and save for change detection
          if (project?.icp_brief) {
            const formattedBrief = JSON.stringify(project.icp_brief, null, 2);
            setIcpBrief(formattedBrief);
            setIcpValid(true);
            setSavedIcpBrief(project.icp_brief); // Save for comparison
            console.log('[ICP Brief Loaded]', project.icp_brief);
          } else {
            // Clear ICP brief if project doesn't have one
            setIcpBrief('');
            setIcpValid(false);
            setSavedIcpBrief(undefined);
          }

          // Load saved model selections and prompts (to show what was previously used)
          // Also initialize current values to match saved (so we can detect changes later)
          if (project?.prospecting_model_selections) {
            setSavedModelSelections(project.prospecting_model_selections);
            setCurrentModelSelections(project.prospecting_model_selections); // Initialize current
          } else {
            setSavedModelSelections(undefined);
            setCurrentModelSelections(null);
          }

          if (project?.prospecting_prompts) {
            setSavedPrompts(project.prospecting_prompts);
            setCurrentPrompts(project.prospecting_prompts); // Initialize current
            setDefaultPrompts(project.prospecting_prompts); // Initialize default
          } else {
            setSavedPrompts(undefined);
            setCurrentPrompts(null);
            setDefaultPrompts(null);
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

  // Helper: Check if prompts have been modified or are being set for first time
  const hasModifiedPrompts = () => {
    if (!currentPrompts) return false;

    // If no saved prompts exist but we have current prompts, consider it modified (first time setup)
    if (!savedPrompts) {
      return Object.keys(currentPrompts).length > 0;
    }

    const keys: Array<keyof ProspectingPrompts> = ['queryUnderstanding', 'websiteExtraction', 'relevanceCheck'];

    return keys.some((key) => {
      const current = currentPrompts[key];
      const saved = savedPrompts[key];

      if (!current || !saved) return false;

      return (
        current.model !== saved.model ||
        current.temperature !== saved.temperature ||
        current.systemPrompt !== saved.systemPrompt ||
        current.userPromptTemplate !== saved.userPromptTemplate
      );
    });
  };

  // Helper: Check if ICP Brief has been modified or is being set
  const hasModifiedIcpBrief = () => {
    if (!icpValid) {
      console.log('[ICP Check] Invalid ICP');
      return false;
    }

    const currentBriefResult = parseJSON(icpBrief);
    if (!currentBriefResult.success) {
      console.log('[ICP Check] Parse failed');
      return false;
    }

    // If no saved ICP brief, consider it as "being set" (not modified, but new)
    if (!savedIcpBrief) {
      console.log('[ICP Check] No saved ICP brief - first time setup');
      return false;
    }

    // Deep comparison of the two objects
    const savedStr = JSON.stringify(savedIcpBrief);
    const currentStr = JSON.stringify(currentBriefResult.data);
    const isModified = savedStr !== currentStr;

    console.log('[ICP Check] Comparison:', {
      isModified,
      savedLength: savedStr.length,
      currentLength: currentStr.length,
      saved: savedIcpBrief,
      current: currentBriefResult.data
    });

    return isModified;
  };

  // Helper: Check if model selections have been modified or are being set for first time
  const hasModifiedModels = () => {
    if (!currentModelSelections) return false;

    // If no saved models exist but we have current selections, consider it modified (first time setup)
    if (!savedModelSelections) {
      return Object.keys(currentModelSelections).length > 0;
    }

    // Compare each model selection
    const savedKeys = Object.keys(savedModelSelections);
    const currentKeys = Object.keys(currentModelSelections);

    if (savedKeys.length !== currentKeys.length) return true;

    return savedKeys.some(key => savedModelSelections[key] !== currentModelSelections[key]);
  };

  // Check if ANY configuration has been modified
  const hasAnyModifications = () => {
    return hasModifiedPrompts() || hasModifiedIcpBrief() || hasModifiedModels();
  };

  // Fork warnings: Show when prospects exist AND modifications detected
  // The actual auto-fork is triggered by hasAnyModifications() + prospectCount > 0 at generation time
  const modifiedPrompts = hasModifiedPrompts();
  const modifiedModels = hasModifiedModels();
  const modifiedIcp = hasModifiedIcpBrief();

  console.log('[Fork Detection]', {
    prospectCount,
    modifiedPrompts,
    modifiedModels,
    modifiedIcp,
    savedIcpBrief: !!savedIcpBrief,
    savedModelSelections: savedModelSelections,
    currentModelSelections: currentModelSelections,
    savedPrompts: !!savedPrompts,
    currentPrompts: !!currentPrompts,
    shouldShowICPForkWarning: prospectCount > 0 && modifiedIcp,
    shouldShowPromptsForkWarning: prospectCount > 0 && (modifiedPrompts || modifiedModels)
  });

  // IMPORTANT: Only show warnings when prospects exist AND actual modifications detected
  // This prevents false warnings when loading a project with existing prospects
  const shouldShowPromptsForkWarning = prospectCount > 0 && (modifiedPrompts || modifiedModels);
  const shouldShowICPForkWarning = prospectCount > 0 && modifiedIcp;

  // Callback to receive prompt changes from EnhancedProspectConfigForm
  const handlePromptsChange = (defaults: ProspectingPrompts, current: ProspectingPrompts) => {
    setDefaultPrompts(defaults);
    setCurrentPrompts(current);
  };

  // Callback to receive model selection changes from EnhancedProspectConfigForm
  const handleModelsChange = (modelSelections: Record<string, string>) => {
    console.log('[Models Changed]', {
      new: modelSelections,
      saved: savedModelSelections
    });
    setCurrentModelSelections(modelSelections);
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
      // AUTO-FORK LOGIC: If ANY configuration modified AND prospects exist, create new project
      if (selectedProjectId && hasAnyModifications() && prospectCount > 0) {
        try {
          // Determine what was modified
          const modifications = [];
          if (hasModifiedIcpBrief()) modifications.push('ICP Brief');
          if (hasModifiedModels()) modifications.push('Model Selections');
          if (hasModifiedPrompts()) modifications.push('Prompts');

          const modificationText = modifications.join(', ');

          console.log(`[Auto-Fork] ${modificationText} modified + prospects exist → Creating new project`);
          addTaskLog(taskId, `${modificationText} modified - creating forked project...`, 'info');

          // Fetch original project data
          const originalProject = await getProject(selectedProjectId);

          // Create new project with modified settings
          const newProject = await createProject({
            name: `${originalProject.name} (v2)`,
            description: `Forked from ${originalProject.name} - Modified: ${modificationText}`,
            icp_brief: briefResult.data, // Use the NEW ICP brief (may be modified)
            prospecting_prompts: currentPrompts || undefined, // Save the modified prompts
            prospecting_model_selections: currentModelSelections || undefined // Save the model selections
          });

          console.log('[Auto-Fork] Created new project:', newProject.id);
          addTaskLog(taskId, `Created new project: "${newProject.name}"`, 'success');

          alert(`📋 Auto-Fork: Created new project "${newProject.name}"\n\nModified: ${modificationText}`);

          // Use the new project for this generation
          effectiveProjectId = newProject.id;
          setSelectedProjectId(newProject.id);
        } catch (error: any) {
          console.error('[Auto-Fork] Failed to create new project:', error);
          addTaskLog(taskId, `Warning: Failed to auto-fork project: ${error.message}`, 'warning');
          // Continue with original project
        }
      }

      // STEP 1: Save all configuration to project (skip if we just forked, already saved during creation)
      const skipConfigSave = selectedProjectId !== effectiveProjectId; // We forked, config already set

      if (effectiveProjectId && !skipConfigSave) {
        try {
          addTaskLog(taskId, 'Saving configuration to project...', 'info');

          await updateProject(effectiveProjectId, {
            icp_brief: briefResult.data,
            prospecting_prompts: currentPrompts || undefined,
            prospecting_model_selections: currentModelSelections || undefined
          });

          // Log what was saved
          const savedItems = [];
          savedItems.push('ICP Brief');
          if (currentModelSelections && Object.keys(currentModelSelections).length > 0) {
            savedItems.push('Model Selections');
          }
          if (currentPrompts && Object.keys(currentPrompts).length > 0) {
            savedItems.push('Custom Prompts');
          }

          setIcpBriefSaved(true);
          addTaskLog(taskId, `Saved: ${savedItems.join(', ')}`, 'success');
        } catch (err: any) {
          console.error('Failed to save configuration:', err);
          addTaskLog(taskId, `Warning: Could not save configuration: ${err.message}`, 'warning');
        }
      } else if (skipConfigSave) {
        // Configuration already saved during fork
        setIcpBriefSaved(true);
        addTaskLog(taskId, 'Configuration already saved during fork (ICP Brief, Model Selections, Custom Prompts)', 'info');
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
        projectId: effectiveProjectId || undefined  // Use effectiveProjectId (may be forked project)
      };

      const response = await fetch(`${API_BASE}/api/prospect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief,
          options,
          custom_prompts: config.custom_prompts || undefined,
          model_selections: config.model_selections || undefined
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

                  // Update prospect count in real-time as prospects are saved
                  // Reload count from API every few progress events to show live updates
                  if (event.current && event.current % 2 === 0) {
                    try {
                      const prospectsResponse = await fetch(`/api/projects/${effectiveProjectId}/prospects`);
                      if (prospectsResponse.ok) {
                        const prospectsData = await prospectsResponse.json();
                        const actualCount = prospectsData.data?.length || 0;
                        setProspectCount(actualCount);
                        console.log('[Live Prospect Count Update]', actualCount);
                      }
                    } catch (err) {
                      console.error('Failed to update prospect count:', err);
                    }
                  }
                }

                // Log any explicit message from the server
                if (event.message) {
                  addTaskLog(taskId, event.message, 'info');
                }

                // Handle completion
                if (event.type === 'complete') {
                  const count = event.results?.prospects?.length || event.results?.count || 0;
                  setGeneratedCount(count);

                  // Reload prospect count from API to ensure accuracy
                  try {
                    const prospectsResponse = await fetch(`/api/projects/${effectiveProjectId}/prospects`);
                    if (prospectsResponse.ok) {
                      const prospectsData = await prospectsResponse.json();
                      const actualCount = prospectsData.data?.length || 0;
                      setProspectCount(actualCount);
                      console.log('[Prospect Count Reloaded]', actualCount);
                      addTaskLog(taskId, `Project now has ${actualCount} total prospects`, 'info');
                    }
                  } catch (err) {
                    console.error('Failed to reload prospect count:', err);
                    // Fallback to increment
                    setProspectCount(prev => prev + count);
                  }

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

  const handleIntelligentAnalysis = async () => {
    if (selectedProspectIds.length === 0) {
      alert('Please select at least one prospect to analyze');
      return;
    }

    // Get selected prospects data
    const selectedProspects = prospects.filter(p => selectedProspectIds.includes(p.id));

    // Start analysis task
    const taskId = startTask('analysis', `Analyze ${selectedProspects.length} prospects with intelligent multi-page analysis`, selectedProspects.length);
    addTaskLog(taskId, 'Starting intelligent multi-page analysis...', 'info');

    const API_BASE = process.env.NEXT_PUBLIC_ANALYSIS_API || 'http://localhost:3001';

    try {
      // Analyze each prospect
      for (let i = 0; i < selectedProspects.length; i++) {
        const prospect = selectedProspects[i];

        updateTask(taskId, i, `Analyzing ${prospect.company_name || prospect.website}...`);
        addTaskLog(taskId, `[${i+1}/${selectedProspects.length}] Analyzing ${prospect.company_name || prospect.website}...`, 'info');

        try {
          const response = await fetch(`${API_BASE}/api/analyze-url-intelligent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: prospect.website,
              company_name: prospect.company_name || 'Unknown Company',
              industry: prospect.industry || 'unknown',
              project_id: selectedProjectId || undefined
            })
          });

          if (!response.ok) {
            throw new Error(`Failed to analyze ${prospect.company_name}: ${response.statusText}`);
          }

          const result = await response.json();
          addTaskLog(taskId, `✓ ${prospect.company_name}: Grade ${result.data?.grade || 'N/A'} (${result.data?.overall_score || 0}/100)`, 'success');
        } catch (error: any) {
          addTaskLog(taskId, `✗ ${prospect.company_name}: ${error.message}`, 'error');
        }
      }

      completeTask(taskId);
      addTaskLog(taskId, `Completed analysis of ${selectedProspects.length} prospects`, 'success');

      // Refresh prospects list
      refreshProspects();
      setSelectedProspectIds([]);
    } catch (error: any) {
      errorTask(taskId, `Analysis failed: ${error.message}`);
    }
  };

  const isProspectingEngineOffline = engineStatus.prospecting === 'offline';
  const isAnalysisEngineOffline = engineStatus.analysis === 'offline';

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
            onModelsChange={handleModelsChange}
            isLoading={isProspecting}
            disabled={isProspectingEngineOffline || isProspecting}
            showForkWarning={shouldShowPromptsForkWarning}
            prospectCount={prospectCount}
            isLoadingProject={isLoadingProject}
            selectedProjectId={selectedProjectId}
            onProjectChange={setSelectedProjectId}
            savedModelSelections={savedModelSelections}
            savedPrompts={savedPrompts}
            icpValid={icpValid}
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

      {/* Prospects Table with Intelligent Analysis */}
      {selectedProjectId && prospectCount > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Generated Prospects</CardTitle>
                <CardDescription>
                  Select prospects to analyze with intelligent multi-page analysis
                </CardDescription>
              </div>
              <Button
                onClick={handleIntelligentAnalysis}
                disabled={selectedProspectIds.length === 0 || isAnalysisEngineOffline}
                className="gap-2"
              >
                <Zap className="w-4 h-4" />
                Analyze with AI ({selectedProspectIds.length})
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isAnalysisEngineOffline && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Analysis Engine Offline</AlertTitle>
                <AlertDescription>
                  The analysis engine is not responding. Please start the analysis-engine service (port 3001).
                </AlertDescription>
              </Alert>
            )}
            <ProspectTable
              prospects={prospects}
              loading={loadingProspects}
              selectedIds={selectedProspectIds}
              onSelectionChange={setSelectedProspectIds}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
