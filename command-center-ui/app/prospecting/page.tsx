'use client';

/**
 * Prospecting Page
 * Generate and manage prospects using ICP brief
 */

import { useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  ICPBriefEditor,
  ProspectConfigForm,
  ProgressStream
} from '@/components/prospecting';
import { parseJSON } from '@/lib/utils/validation';
import { useEngineHealth } from '@/lib/hooks';
import type { ProspectGenerationOptions } from '@/lib/types';

interface ProgressLog {
  timestamp: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}

export default function ProspectingPage() {
  const engineStatus = useEngineHealth();

  // ICP Brief state
  const [icpBrief, setIcpBrief] = useState('');
  const [icpValid, setIcpValid] = useState(false);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    label?: string;
  } | undefined>();
  const [logs, setLogs] = useState<ProgressLog[]>([]);
  const [generatedCount, setGeneratedCount] = useState<number>(0);

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

  const handleGenerate = async (config: ProspectGenerationOptions) => {
    // Validate ICP brief
    const briefResult = parseJSON(icpBrief);
    if (!briefResult.success) {
      addLog('Invalid ICP brief JSON', 'error');
      return;
    }

    setIsGenerating(true);
    setGeneratedCount(0);
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
                  const count = event.results?.prospects?.length || event.results?.count || 0;
                  setGeneratedCount(count);
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

      {/* Success Message */}
      {!isGenerating && generatedCount > 0 && (
        <Alert className="bg-green-50 dark:bg-green-950 border-green-600">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-900 dark:text-green-100">
            Generation Complete!
          </AlertTitle>
          <AlertDescription className="text-green-800 dark:text-green-200">
            Successfully generated <strong>{generatedCount} prospects</strong>.{' '}
            <a
              href="/analysis"
              className="underline font-medium hover:text-green-950 dark:hover:text-green-50"
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
