'use client';

/**
 * All Variations Composer
 * Generate ALL 12 outreach variations (3 email + 9 social) for selected leads
 * Uses queue-based polling for better reliability
 */

import { useState, useEffect } from 'react';
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
import { composeAllVariationsQueue, checkOutreachStatus, cancelOutreachJobs } from '@/lib/api/outreach';
import { useQueuePolling } from '@/lib/hooks/use-queue-polling';

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
  const [jobId, setJobId] = useState<string | null>(null);
  const [totalCost, setTotalCost] = useState(0);
  const [taskId, setTaskId] = useState<string | null>(null);
  const { startTask, updateTask, addLog, completeTask, errorTask } = useTaskProgress();

  // Use queue polling hook
  const {
    jobs,
    isPolling,
    allJobsDone,
    error: pollingError
  } = useQueuePolling({
    statusUrl: process.env.NEXT_PUBLIC_OUTREACH_API
      ? `${process.env.NEXT_PUBLIC_OUTREACH_API}/api/compose-status`
      : 'http://localhost:3002/api/compose-status',
    jobIds: jobId ? [jobId] : [],
    autoStart: true,
    pollInterval: 3000, // Poll every 3 seconds
    onJobUpdate: (job) => {
      if (!taskId) return;

      // Update progress based on job progress
      if (job.progress) {
        const progressPercent = (job.progress.current / job.progress.total) * 100;
        updateTask(taskId, job.progress.current, job.progress.message || 'Processing...');

        // Update individual lead statuses based on progress
        leads.forEach((lead, index) => {
          const leadProgress = Math.min(100, ((job.progress!.current / job.progress!.total) * 100));
          setStatuses(prev => ({
            ...prev,
            [lead.id]: {
              ...prev[lead.id],
              status: index < job.progress!.current / 12 ? 'completed' : 'generating',
              progress: leadProgress
            }
          }));
        });
      }
    },
    onJobComplete: (job) => {
      if (!taskId) return;

      // Mark all leads as completed
      setStatuses(prev => {
        const updated = { ...prev };
        leads.forEach(lead => {
          updated[lead.id] = {
            ...updated[lead.id],
            status: 'completed',
            progress: 100
          };
        });
        return updated;
      });

      // Extract results
      if (job.result) {
        const { processed_leads, total_variations, total_cost } = job.result;
        setTotalCost(total_cost || 0);
        addLog(taskId, `✅ Generated ${total_variations} variations for ${processed_leads} leads`, 'success');
        addLog(taskId, `Total cost: $${(total_cost || 0).toFixed(4)}`, 'success');
      }

      completeTask(taskId);
      onComplete?.();
    },
    onJobFailed: (job) => {
      if (!taskId) return;

      errorTask(taskId, job.error || 'Job failed');
      addLog(taskId, `❌ Error: ${job.error}`, 'error');

      // Mark all generating leads as error
      setStatuses(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(leadId => {
          if (updated[leadId].status === 'generating' || updated[leadId].status === 'pending') {
            updated[leadId].status = 'error';
            updated[leadId].error = job.error;
          }
        });
        return updated;
      });
    }
  });

  // Handle polling errors
  useEffect(() => {
    if (pollingError && taskId) {
      addLog(taskId, `⚠️ Polling error: ${pollingError.message}`, 'error');
    }
  }, [pollingError, taskId, addLog]);

  const handleGenerateAll = async () => {
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
    setTotalCost(0);

    // Start task tracking
    const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const newTaskId = startTask(
      'outreach',
      `Generate ${leads.length * 12} variations for ${leads.length} leads (${timestamp})`,
      leads.length * 12
    );
    setTaskId(newTaskId);
    addLog(newTaskId, 'Queueing all-variations generation...', 'info');

    try {
      // Queue the job
      const { job_id } = await composeAllVariationsQueue(
        leads.map(l => l.id),
        { forceRegenerate: false }
      );

      setJobId(job_id);
      addLog(newTaskId, `✅ Job queued successfully (ID: ${job_id})`, 'success');
      addLog(newTaskId, 'Waiting for job to start...', 'info');
    } catch (error: any) {
      console.error('Failed to queue all-variations generation:', error);
      errorTask(newTaskId, error.message);
      addLog(newTaskId, `❌ Error: ${error.message}`, 'error');
    }
  };

  const handleCancel = async () => {
    if (!jobId || !taskId) return;

    try {
      addLog(taskId, 'Cancelling job...', 'info');
      await cancelOutreachJobs([jobId]);
      addLog(taskId, '✅ Job cancelled', 'info');
      setJobId(null);
    } catch (error: any) {
      addLog(taskId, `❌ Failed to cancel: ${error.message}`, 'error');
    }
  };

  const completedCount = Object.values(statuses).filter(s => s.status === 'completed').length;
  const errorCount = Object.values(statuses).filter(s => s.status === 'error').length;
  const skippedCount = Object.values(statuses).filter(s => s.status === 'skipped').length;
  const totalProgress = leads.length > 0
    ? Object.values(statuses).reduce((sum, s) => sum + s.progress, 0) / leads.length
    : 0;

  const hasStarted = Object.keys(statuses).length > 0;
  const isComplete = allJobsDone || (hasStarted && completedCount + errorCount + skippedCount === leads.length);
  const currentJob = jobId ? jobs.get(jobId) : null;
  const isQueued = currentJob?.state === 'queued';
  const isRunning = currentJob?.state === 'running';

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
          <div className="flex items-center gap-2">
            {(isQueued || isRunning) && (
              <Button
                onClick={handleCancel}
                variant="outline"
                size="lg"
                disabled={isRunning} // Can only cancel queued jobs
              >
                Cancel
              </Button>
            )}
            <Button
              onClick={handleGenerateAll}
              disabled={isPolling || leads.length === 0}
              size="lg"
            >
              {isPolling ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isQueued ? 'Queued...' : 'Generating...'}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate All
                </>
              )}
            </Button>
          </div>
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
                          {lead.grade && (
                            <GradeBadge grade={lead.grade} />
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
