'use client';

/**
 * Generate Report Modal
 * Modal for batch report generation with format selection
 */

import { useState } from 'react';
import { FileText, FileCode, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { generateReport } from '@/lib/api/analysis';
import { useTaskProgress } from '@/lib/contexts/task-progress-context';
import { startTaskWithFetch } from '@/lib/utils/task-sse-manager';
import type { Lead } from '@/lib/types';

interface GenerateReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedLeads: Lead[];
  onComplete?: () => void;
}

export function GenerateReportModal({
  open,
  onOpenChange,
  selectedLeads,
  onComplete
}: GenerateReportModalProps) {
  const [useAiSynthesis, setUseAiSynthesis] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const { startTask, updateTask, addLog, completeTask, errorTask, cancelTask } = useTaskProgress();

  const isBatchMode = selectedLeads.length > 1;

  const handleGenerate = async (format: 'markdown' | 'html') => {
    if (selectedLeads.length === 0) return;

    setIsGenerating(true);
    onOpenChange(false);

    // Generate reports for each lead
    for (const lead of selectedLeads) {
      await startTaskWithFetch({
        taskType: 'analysis',
        title: `Generate ${format.toUpperCase()} report for ${lead.company_name}`,
        total: 1,
        taskManager: {
          startTask,
          updateTask,
          addLog,
          completeTask,
          errorTask,
          cancelTask
        },
        execute: async () => {
          return await generateReport(lead.id, format);
        },
        onComplete: (report, taskId) => {
          addLog(taskId, `${format.toUpperCase()} report generated successfully!`, 'success');
        },
        onError: (error, taskId) => {
          console.error(`Report generation failed for ${lead.company_name}:`, error);
        }
      });
    }

    setIsGenerating(false);
    onComplete?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isBatchMode ? `Generate ${selectedLeads.length} Reports` : 'Generate Report'}
          </DialogTitle>
          <DialogDescription>
            {isBatchMode
              ? `Generate website audit reports for ${selectedLeads.length} selected leads.`
              : `Generate a website audit report for ${selectedLeads[0]?.company_name}`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isBatchMode && (
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Batch Mode:</strong> Reports will be generated concurrently. Track progress in the floating task indicator.
              </p>
            </div>
          )}

          {/* AI Synthesis Toggle */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="ai-synthesis" className="text-sm font-medium">
                AI Synthesis
              </Label>
              <p className="text-xs text-muted-foreground">
                Generate executive summary and deduplicate issues
              </p>
            </div>
            <Switch
              id="ai-synthesis"
              checked={useAiSynthesis}
              onCheckedChange={setUseAiSynthesis}
            />
          </div>

          {/* Format Selection */}
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              className="h-auto flex-col items-start p-4 space-y-2"
              onClick={() => handleGenerate('html')}
              disabled={isGenerating}
            >
              <FileCode className="h-8 w-8 text-blue-500" />
              <div className="text-left">
                <p className="font-semibold">HTML (Dark Theme)</p>
                <p className="text-xs text-muted-foreground">
                  Styled report, perfect for web viewing
                </p>
              </div>
            </Button>

            <Button
              variant="outline"
              className="h-auto flex-col items-start p-4 space-y-2"
              onClick={() => handleGenerate('markdown')}
              disabled={isGenerating}
            >
              <FileText className="h-8 w-8 text-green-500" />
              <div className="text-left">
                <p className="font-semibold">Markdown</p>
                <p className="text-xs text-muted-foreground">
                  Clean text format, easy to edit
                </p>
              </div>
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default GenerateReportModal;
