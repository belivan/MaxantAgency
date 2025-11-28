'use client';

/**
 * Generate Outreach Modal
 * Modal for batch outreach generation (emails + social messages)
 */

import { useState } from 'react';
import { Mail, MessageCircle, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { composeAllVariationsQueue, checkOutreachStatus } from '@/lib/api/outreach';
import { useTaskProgress } from '@/lib/contexts/task-progress-context';
import type { Lead } from '@/lib/types';

interface GenerateOutreachModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedLeads: Lead[];
  onComplete?: () => void;
}

export function GenerateOutreachModal({
  open,
  onOpenChange,
  selectedLeads,
  onComplete
}: GenerateOutreachModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { startTask, updateTask, addLog, completeTask, errorTask } = useTaskProgress();

  const isBatchMode = selectedLeads.length > 1;
  const totalVariations = selectedLeads.length * 12; // 3 email + 9 social per lead

  const handleGenerate = async () => {
    if (selectedLeads.length === 0) return;

    setIsGenerating(true);
    onOpenChange(false);

    const leadIds = selectedLeads.map(l => l.id);
    const leadNames = selectedLeads.map(l => l.company_name).join(', ');

    // Start a task to track progress
    const taskTitle = isBatchMode
      ? `Generate outreach for ${selectedLeads.length} leads`
      : `Generate outreach for ${selectedLeads[0]?.company_name}`;
    const taskId = startTask('outreach', taskTitle, selectedLeads.length);

    try {
      // Queue the outreach generation job
      const { job_id } = await composeAllVariationsQueue(leadIds);

      addLog(taskId, `Queued outreach generation job: ${job_id}`, 'info');

      // Poll for status
      const pollInterval = setInterval(async () => {
        try {
          const status = await checkOutreachStatus([job_id]);
          const job = status.jobs[0];

          if (!job) {
            clearInterval(pollInterval);
            errorTask(taskId, 'Job not found');
            return;
          }

          // Update progress
          if (job.progress) {
            updateTask(taskId, job.progress.current, job.progress.message, job.progress.total);
          }

          // Check completion states
          if (job.state === 'completed') {
            clearInterval(pollInterval);
            const result = job.result;
            addLog(taskId, `Generated ${result?.total_variations || totalVariations} outreach variations`, 'success');
            completeTask(taskId);
            setIsGenerating(false);
            onComplete?.();
          } else if (job.state === 'failed') {
            clearInterval(pollInterval);
            errorTask(taskId, job.error || 'Outreach generation failed');
            setIsGenerating(false);
          } else if (job.state === 'cancelled') {
            clearInterval(pollInterval);
            errorTask(taskId, 'Job was cancelled');
            setIsGenerating(false);
          }
        } catch (pollError) {
          console.error('Error polling outreach status:', pollError);
        }
      }, 3000); // Poll every 3 seconds

    } catch (error: any) {
      console.error('Failed to start outreach generation:', error);
      errorTask(taskId, error.message || 'Failed to start outreach generation');
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md !top-[5rem] !translate-y-0">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            {isBatchMode ? `Generate Outreach for ${selectedLeads.length} Leads` : 'Generate Outreach'}
          </DialogTitle>
          <DialogDescription>
            {isBatchMode
              ? `Create personalized email and social outreach for ${selectedLeads.length} selected leads.`
              : `Create personalized outreach for ${selectedLeads[0]?.company_name}`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* What will be generated */}
          <div className="rounded-lg border p-4 space-y-3">
            <h4 className="font-medium text-sm">What will be generated:</h4>

            <div className="grid grid-cols-2 gap-4">
              {/* Email Strategies */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Mail className="h-4 w-4 text-blue-500" />
                  <span>3 Email Variations</span>
                </div>
                <div className="space-y-1 pl-6">
                  <Badge variant="outline" className="text-xs">Free Value</Badge>
                  <Badge variant="outline" className="text-xs">Portfolio Building</Badge>
                  <Badge variant="outline" className="text-xs">Problem First</Badge>
                </div>
              </div>

              {/* Social Platforms */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <MessageCircle className="h-4 w-4 text-green-500" />
                  <span>9 Social Messages</span>
                </div>
                <div className="space-y-1 pl-6">
                  <Badge variant="outline" className="text-xs">Instagram (3)</Badge>
                  <Badge variant="outline" className="text-xs">LinkedIn (3)</Badge>
                  <Badge variant="outline" className="text-xs">Facebook (3)</Badge>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                Total: <span className="font-medium">{totalVariations} variations</span> will be generated
                {isBatchMode && ` (12 per lead)`}
              </p>
            </div>
          </div>

          {isBatchMode && (
            <div className="rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 p-3">
              <p className="text-sm text-purple-900 dark:text-purple-100">
                <strong>Batch Mode:</strong> All leads will be processed. Track progress in the floating task indicator.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate All Variations
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default GenerateOutreachModal;
