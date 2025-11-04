'use client';

/**
 * All Variations Composer
 * Generate ALL 12 outreach variations (3 email + 9 social) for selected leads
 */

import { useState } from 'react';
import { Loader2, Sparkles, CheckCircle2, XCircle, Mail, MessageCircle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { GradeBadge } from '@/components/leads/grade-badge';
import type { Lead } from '@/lib/types';
import { useTaskProgress } from '@/lib/contexts/task-progress-context';

interface AllVariationsComposerProps {
  leads: Lead[];
  projectId?: string;
  onComplete?: () => void;
}

interface LeadGenerationStatus {
  leadId: string;
  companyName: string;
  status: 'pending' | 'generating' | 'completed' | 'error' | 'skipped';
  progress: number; // 0-100
  currentVariation?: string;
  error?: string;
  cost?: number;
}

export function AllVariationsComposer({
  leads,
  projectId,
  onComplete
}: AllVariationsComposerProps) {
  const [statuses, setStatuses] = useState<Record<string, LeadGenerationStatus>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [totalCost, setTotalCost] = useState(0);
  const { startTask, updateTask, addLog, completeTask, errorTask } = useTaskProgress();

  const handleGenerateAll = async () => {
    setIsGenerating(true);
    setTotalCost(0);

    // Initialize statuses
    const initialStatuses: Record<string, LeadGenerationStatus> = {};
    leads.forEach(lead => {
      initialStatuses[lead.id] = {
        leadId: lead.id,
        companyName: lead.company_name || lead.url || 'Unknown',
        status: 'pending',
        progress: 0
      };
    });
    setStatuses(initialStatuses);

    // Start task tracking
    const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const taskId = startTask(
      'outreach',
      `Generate ${leads.length * 12} variations for ${leads.length} leads (${timestamp})`,
      leads.length * 12
    );
    addLog(taskId, 'Starting all-variations generation...', 'info');

    try {
      const response = await fetch('http://localhost:3002/api/compose-all-variations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          lead_ids: leads.map(l => l.id),
          project_id: projectId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      let currentEventType = 'message';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event:')) {
            currentEventType = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            const dataStr = line.slice(5).trim();
            if (dataStr) {
              try {
                const data = JSON.parse(dataStr);
                handleSSEMessage(currentEventType, data, taskId);
                currentEventType = 'message'; // Reset
              } catch (e) {
                console.error('Failed to parse SSE data:', dataStr, e);
              }
            }
          }
        }
      }

      completeTask(taskId);
      addLog(taskId, `All variations generated successfully`, 'success');
      onComplete?.();
    } catch (error: any) {
      console.error('All-variations generation failed:', error);
      errorTask(taskId, error.message);
      addLog(taskId, `Error: ${error.message}`, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSSEMessage = (eventType: string, data: any, taskId: string) => {
    switch (eventType) {
      case 'start':
        addLog(taskId, `Starting generation for ${data.total} leads`, 'info');
        break;

      case 'lead_start':
        setStatuses(prev => ({
          ...prev,
          [data.lead.id]: {
            ...prev[data.lead.id],
            status: 'generating',
            progress: 0
          }
        }));
        addLog(taskId, `🔄 ${data.lead.company_name}`, 'info');
        break;

      case 'variation_start':
        // Update current variation being generated
        const leadId = leads[data.leadIndex]?.id;
        if (leadId) {
          setStatuses(prev => ({
            ...prev,
            [leadId]: {
              ...prev[leadId],
              currentVariation: data.variation
            }
          }));
        }
        break;

      case 'variation_complete':
        // Update progress for the lead
        const completedLeadId = leads[data.leadIndex]?.id;
        if (completedLeadId) {
          setStatuses(prev => ({
            ...prev,
            [completedLeadId]: {
              ...prev[completedLeadId],
              progress: data.progress || 0
            }
          }));
          updateTask(taskId, data.leadIndex * 12 + data.variationIndex, data.message);
        }
        break;

      case 'lead_complete':
        const doneLeadId = leads[data.leadIndex]?.id;
        if (doneLeadId) {
          setStatuses(prev => ({
            ...prev,
            [doneLeadId]: {
              ...prev[doneLeadId],
              status: 'completed',
              progress: 100,
              cost: data.cost
            }
          }));
          setTotalCost(prev => prev + (data.cost || 0));
          addLog(taskId, `✅ ${statuses[doneLeadId]?.companyName}: Complete ($${data.cost?.toFixed(4) || '0.00'})`, 'success');
        }
        break;

      case 'lead_error':
        const errorLeadId = leads[data.leadIndex]?.id;
        if (errorLeadId) {
          setStatuses(prev => ({
            ...prev,
            [errorLeadId]: {
              ...prev[errorLeadId],
              status: 'error',
              error: data.error
            }
          }));
          addLog(taskId, `❌ ${statuses[errorLeadId]?.companyName}: ${data.error}`, 'error');
        }
        break;

      case 'variation_skip':
        const skipLeadId = leads[data.leadIndex]?.id;
        if (skipLeadId) {
          setStatuses(prev => ({
            ...prev,
            [skipLeadId]: {
              ...prev[skipLeadId],
              status: 'skipped'
            }
          }));
          addLog(taskId, `⏭️ ${statuses[skipLeadId]?.companyName}: Already exists`, 'info');
        }
        break;

      case 'complete':
      case 'success':
        addLog(taskId, `Generation complete! Total cost: $${data.stats?.totalCost?.toFixed(4) || '0.00'}`, 'success');
        break;

      case 'error':
        addLog(taskId, `Error: ${data.error}`, 'error');
        break;
    }
  };

  const completedCount = Object.values(statuses).filter(s => s.status === 'completed').length;
  const errorCount = Object.values(statuses).filter(s => s.status === 'error').length;
  const skippedCount = Object.values(statuses).filter(s => s.status === 'skipped').length;
  const totalProgress = leads.length > 0
    ? Object.values(statuses).reduce((sum, s) => sum + s.progress, 0) / leads.length
    : 0;

  const hasStarted = Object.keys(statuses).length > 0;
  const isComplete = hasStarted && completedCount + errorCount + skippedCount === leads.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              All Variations Composer
            </CardTitle>
            <CardDescription>
              Generate all 12 outreach variations for {leads.length} lead{leads.length !== 1 ? 's' : ''}
              <span className="block text-xs mt-1">
                3 email strategies + 9 social DMs (Instagram, Facebook, LinkedIn)
              </span>
            </CardDescription>
          </div>
          <Button
            onClick={handleGenerateAll}
            disabled={isGenerating || leads.length === 0}
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate All
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      {hasStarted && (
        <CardContent className="space-y-4">
          {/* Overall Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Overall Progress</span>
              <span className="text-muted-foreground">
                {completedCount + errorCount + skippedCount}/{leads.length} leads
              </span>
            </div>
            <Progress value={totalProgress} className="h-2" />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="flex flex-col items-center justify-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{completedCount}</div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
            <div className="flex flex-col items-center justify-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{skippedCount}</div>
              <div className="text-xs text-muted-foreground">Skipped</div>
            </div>
            <div className="flex flex-col items-center justify-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{errorCount}</div>
              <div className="text-xs text-muted-foreground">Failed</div>
            </div>
            <div className="flex flex-col items-center justify-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">${totalCost.toFixed(4)}</div>
              <div className="text-xs text-muted-foreground">Total Cost</div>
            </div>
          </div>

          {/* Lead Status List */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Generation Status</h4>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {leads.map(lead => {
                const status = statuses[lead.id];
                if (!status) return null;

                return (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {status.status === 'completed' && (
                        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                      )}
                      {status.status === 'generating' && (
                        <Loader2 className="w-5 h-5 animate-spin text-blue-600 flex-shrink-0" />
                      )}
                      {status.status === 'error' && (
                        <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                      )}
                      {status.status === 'pending' && (
                        <div className="w-5 h-5 rounded-full border-2 border-muted flex-shrink-0" />
                      )}
                      {status.status === 'skipped' && (
                        <CheckCircle2 className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">
                            {status.companyName}
                          </span>
                          {lead.website_grade && (
                            <GradeBadge grade={lead.website_grade} />
                          )}
                        </div>
                        {status.status === 'generating' && status.currentVariation && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {status.currentVariation.replace(/_/g, ' ')}
                          </div>
                        )}
                        {status.status === 'error' && status.error && (
                          <div className="text-xs text-red-600 mt-1">
                            {status.error}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      {status.status === 'generating' && (
                        <div className="w-16">
                          <Progress value={status.progress} className="h-1" />
                        </div>
                      )}
                      {status.status === 'completed' && status.cost && (
                        <Badge variant="secondary" className="text-xs">
                          ${status.cost.toFixed(4)}
                        </Badge>
                      )}
                      {status.status === 'completed' && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail className="w-3 h-3" />
                          <span>3</span>
                          <MessageCircle className="w-3 h-3 ml-1" />
                          <span>9</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {isComplete && (
            <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                <CheckCircle2 className="w-5 h-5" />
                <div>
                  <div className="font-medium">Generation Complete!</div>
                  <div className="text-sm mt-1">
                    Generated {completedCount * 12} variations across {completedCount} leads
                    {skippedCount > 0 && ` (${skippedCount} already existed)`}
                    {errorCount > 0 && ` - ${errorCount} failed`}
                  </div>
                  <div className="text-sm mt-1">
                    Total cost: ${totalCost.toFixed(4)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
