'use client';

/**
 * Prospecting Page
 * Generate and manage prospects using ICP brief
 */

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  ICPBriefEditor,
  ProspectConfigForm,
  ProgressStream,
  ProspectTable
} from '@/components/prospecting';
import { LoadingOverlay } from '@/components/shared';
import { getProspects } from '@/lib/api';
import { parseJSON } from '@/lib/utils/validation';
import { useEngineHealth } from '@/lib/hooks';
import type { ProspectGenerationFormData, Prospect, SSEMessage } from '@/lib/types';

interface ProgressLog {
  timestamp: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}

export default function ProspectingPage() {
  const router = useRouter();
  const engineStatus = useEngineHealth();

  // ICP Brief state
  const [icpBrief, setIcpBrief] = useState('');
  const [icpValid, setIcpValid] = useState(false);

  // Prospects state
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoadingProspects, setIsLoadingProspects] = useState(true);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    label?: string;
  } | undefined>();
  const [logs, setLogs] = useState<ProgressLog[]>([]);

  const addLog = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    setLogs(prev => [
      {
        timestamp: new Date().toISOString(),
        message,
        type
      },
      ...prev
    ].slice(0, 50)); // Keep last 50 logs
  };

  // Track if prospects have been loaded to prevent double execution in React StrictMode
  const hasLoadedProspects = useRef(false);

  // Load existing prospects on mount
  useEffect(() => {
    // Prevent double execution in React StrictMode (development)
    if (hasLoadedProspects.current) return;
    hasLoadedProspects.current = true;

    const loadProspects = async () => {
      try {
        setIsLoadingProspects(true);
        const data = await getProspects({ limit: 50, status: 'ready_for_analysis' });
        setProspects(data);
        addLog(`Loaded ${data.length} existing prospects`, 'info');
      } catch (error: any) {
        console.error('Failed to load prospects:', error);
        addLog(`Failed to load prospects: ${error.message}`, 'error');
      } finally {
        setIsLoadingProspects(false);
      }
    };

    loadProspects();
  }, []);

  const handleGenerate = async (config: ProspectGenerationFormData) => {
    // Validate ICP brief
    const briefResult = parseJSON(icpBrief);
    if (!briefResult.success) {
      addLog('Invalid ICP brief JSON', 'error');
      return;
    }

    setIsGenerating(true);
    setProspects([]);
    setSelectedIds([]);
    setLogs([]);
    setProgress(undefined);

    addLog('Starting prospect generation...', 'info');

    try {
      // Call API - it streams SSE immediately
      const API_BASE = process.env.NEXT_PUBLIC_PROSPECTING_API || 'http://localhost:3010';
      const response = await fetch(`${API_BASE}/api/prospect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief: briefResult.data,
          count: config.count,
          city: config.city || undefined,
          model: config.model,
          verify: config.verify
        })
      });

      if (!response.ok) {
        throw new Error('Failed to start prospect generation');
      }

      addLog('Connected to prospect generation stream', 'success');

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

                // Add to logs
                if (event.message) {
                  addLog(event.message, 'info');
                }

                // Handle progress
                if (event.type === 'progress') {
                  setProgress({
                    current: event.current || 0,
                    total: event.total || 100,
                    label: event.label
                  });
                }

                // Handle completion
                if (event.type === 'complete') {
                  addLog('Prospect generation completed!', 'success');
                  if (event.results?.prospects) {
                    setProspects(event.results.prospects);
                    setSelectedIds(event.results.prospects.map((p: Prospect) => p.id));
                  }
                  setIsGenerating(false);
                  return;
                }

                // Handle errors
                if (event.type === 'error') {
                  addLog(`Error: ${event.message || 'Unknown error'}`, 'error');
                  setIsGenerating(false);
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
        setIsGenerating(false);
      }

    } catch (error: any) {
      addLog(`Failed to start generation: ${error.message}`, 'error');
      setIsGenerating(false);
    }
  };

  const handleAnalyzeSelected = () => {
    if (selectedIds.length === 0) {
      addLog('Please select at least one prospect to analyze', 'warning');
      return;
    }

    // Navigate to analysis page with selected prospects
    router.push(`/analysis?prospect_ids=${selectedIds.join(',')}`);
  };

  const isProspectingEngineOffline = engineStatus.prospecting === 'offline';
  const isAnalysisEngineOffline = engineStatus.analysis === 'offline';

  return (
    <>
      <LoadingOverlay
        isLoading={isGenerating || isLoadingProspects}
        message={isGenerating ? "Generating prospects..." : "Loading prospects..."}
      />
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

        {isAnalysisEngineOffline && prospects.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Analysis Engine Offline</AlertTitle>
            <AlertDescription>
              The analysis engine is not responding. You won't be able to analyze prospects until the analysis-engine service (port 3000) is started.
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
          />
        </div>

        {/* Right Column - Config Form */}
        <div>
          <ProspectConfigForm
            onSubmit={handleGenerate}
            isLoading={isGenerating}
            disabled={!icpValid || isProspectingEngineOffline}
          />
        </div>
      </div>

      {/* Progress Stream */}
      {(isGenerating || logs.length > 0) && (
        <ProgressStream
          status={isGenerating ? 'connected' : 'closed'}
          progress={progress}
          logs={logs}
        />
      )}

      {/* Results Section */}
      {(prospects.length > 0 || isLoadingProspects) && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Prospects</h2>

            {prospects.length > 0 && (
              <Button
                onClick={handleAnalyzeSelected}
                disabled={selectedIds.length === 0 || isAnalysisEngineOffline}
                size="lg"
              >
                Analyze {selectedIds.length} Selected
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>

          <ProspectTable
            prospects={prospects}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            loading={isLoadingProspects}
          />
        </div>
      )}
      </div>
    </>
  );
}
