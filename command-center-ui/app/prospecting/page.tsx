'use client';

/**
 * SIMPLIFIED Prospecting Page - NO AUTO-FORKING
 * Just saves configuration to the current project
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
  ProspectTable,
  QuickBusinessLookup
} from '@/components/prospecting';
import { parseJSON } from '@/lib/utils/validation';
import { useEngineHealth, useProspects } from '@/lib/hooks';
import { useTaskProgress } from '@/lib/contexts/task-progress-context';
import { updateProject } from '@/lib/api';
import type { ProspectGenerationOptions, ProspectFilters } from '@/lib/types';
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

  // Current configuration - NO SAVED VS CURRENT TRACKING
  const [defaultPrompts, setDefaultPrompts] = useState<ProspectingPrompts | null>(null);
  const [currentPrompts, setCurrentPrompts] = useState<ProspectingPrompts | null>(null);
  const [currentModelSelections, setCurrentModelSelections] = useState<Record<string, string> | null>(null);

  // Prospect selection for intelligent analysis
  const [selectedProspectIds, setSelectedProspectIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<ProspectFilters>({
    status: 'ready_for_analysis',
    verified: true,
    limit: 10,
    offset: 0,
    project_id: selectedProjectId || undefined
  });

  const { prospects, loading: loadingProspects, refresh: refreshProspects } = useProspects(filters);

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
        // Fetch project data and prospect count in parallel
        const [projectResponse, prospectsResponse] = await Promise.all([
          fetch(`/api/projects/${selectedProjectId}`),
          fetch(`/api/projects/${selectedProjectId}/prospects`)
        ]);

        // Load project data if exists
        if (projectResponse.ok) {
          const projectData = await projectResponse.json();
          const project = projectData.data;

          // Pre-fill ICP brief if it exists
          if (project?.icp_brief) {
            const formattedBrief = JSON.stringify(project.icp_brief, null, 2);
            setIcpBrief(formattedBrief);
            setIcpValid(true);
          } else {
            setIcpBrief('');
            setIcpValid(false);
          }

          // Load saved configurations
          if (project?.prospecting_model_selections) {
            setCurrentModelSelections(project.prospecting_model_selections);
          }
          if (project?.prospecting_prompts) {
            setCurrentPrompts(project.prospecting_prompts);
            setDefaultPrompts(project.prospecting_prompts);
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

  const handlePromptsChange = (defaults: ProspectingPrompts, current: ProspectingPrompts) => {
    setDefaultPrompts(defaults);
    setCurrentPrompts(current);
  };

  const handleModelsChange = (modelSelections: Record<string, string>) => {
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

    // Save configuration to project (non-blocking)
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

    // Prepare request data
    const API_BASE = process.env.NEXT_PUBLIC_PROSPECTING_API || 'http://localhost:3010';
    const brief = { ...briefResult.data, count: config.count };
    const options = {
      model: config.model,
      verify: config.verify,
      projectId: selectedProjectId
    };

    // Start non-blocking SSE operation
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

        // Handle custom prospecting SSE events
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
            } else {
              addTaskLog(taskId, `${stepName} completed`, 'success');
            }
          }
        }

        // Handle discovery_progress type (from iterative discovery)
        if (event.type === 'discovery_progress') {
          if (event.message) {
            const messageText = typeof event.message === 'string'
              ? event.message
              : JSON.stringify(event.message);
            addTaskLog(taskId, messageText, 'info');
          }
          // Update progress if current/target are provided
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

          // Update prospect count periodically
          if (event.current && event.current % 2 === 0 && selectedProjectId) {
            fetch(`/api/projects/${selectedProjectId}/prospects`)
              .then(res => res.json())
              .then(data => {
                const actualCount = data.data?.length || 0;
                setProspectCount(actualCount);
              })
              .catch(err => console.error('Failed to update prospect count:', err));
          }
        }

        // Catch-all for any other messages
        if (event.message && event.type !== 'discovery_progress' && event.type !== 'progress') {
          // Ensure message is a string, not an object
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

        // Reload prospect count
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
        refreshProspects();
      },
      onError: (error, taskId) => {
        console.error('Prospecting failed:', error);
        alert(`Prospect generation failed: ${error.message}`);
      }
    });

    console.log(`✓ Started prospecting task: ${connection.taskId} (non-blocking)`);
  };

  const handleIntelligentAnalysis = async () => {
    if (selectedProspectIds.length === 0) {
      alert('Please select at least one prospect to analyze');
      return;
    }

    const selectedProspects = prospects.filter(p => selectedProspectIds.includes(p.id));

    const taskId = startTask('analysis', `Analyze ${selectedProspects.length} prospects with intelligent multi-page analysis`, selectedProspects.length);
    addTaskLog(taskId, 'Starting intelligent multi-page analysis...', 'info');

    const API_BASE = process.env.NEXT_PUBLIC_ANALYSIS_API || 'http://localhost:3001';

    try {
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

      {/* Configuration Info - Simple notification, no fork warning */}
      {selectedProjectId && prospectCount > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Project Configuration</AlertTitle>
          <AlertDescription>
            This project has {prospectCount} existing prospects. Any configuration changes will be saved to the project.
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
            showForkWarning={false} // NO FORK WARNINGS
            prospectCount={prospectCount}
          />
        </div>

        {/* Right Column - Quick Lookup & Enhanced Config Form */}
        <div className="space-y-6">
          {/* Quick Business Lookup */}
          <QuickBusinessLookup
            selectedProjectId={selectedProjectId}
            disabled={false}
            engineOffline={isProspectingEngineOffline}
            onSuccess={refreshProspects}
          />

          {/* Enhanced Config Form */}
          <EnhancedProspectConfigForm
            onSubmit={handleGenerate}
            onPromptsChange={handlePromptsChange}
            onModelsChange={handleModelsChange}
            isLoading={false}
            disabled={isProspectingEngineOffline}
            showForkWarning={false} // NO FORK WARNINGS
            prospectCount={prospectCount}
            isLoadingProject={isLoadingProject}
            selectedProjectId={selectedProjectId}
            onProjectChange={setSelectedProjectId}
            savedModelSelections={currentModelSelections || undefined}
            savedPrompts={currentPrompts || undefined}
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
              <span className="block mt-1">
                Configuration saved to project.
              </span>
            )}
            <a
              href="/analysis"
              className="underline font-medium hover:text-green-950 dark:hover:text-green-50 inline-block mt-1"
            >
              Go to the Analysis tab →
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
                <CardTitle>Project Prospects ({prospectCount})</CardTitle>
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
                Analyze Selected ({selectedProspectIds.length})
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