'use client';

/**
 * Global Progress Bar
 * Displays at the top of the page for all long-running tasks
 */

import { useTaskProgress } from '@/lib/contexts/task-progress-context';
import { Progress } from '@/components/ui/progress';
import { X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function GlobalProgressBar() {
  const { activeTask, removeTask } = useTaskProgress();

  if (!activeTask) return null;

  const percentage = activeTask.total > 0
    ? Math.round((activeTask.current / activeTask.total) * 100)
    : 0;

  const isCompleted = activeTask.status === 'completed';
  const isError = activeTask.status === 'error';

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 border-b shadow-sm transition-colors ${
        isCompleted
          ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
          : isError
          ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
          : 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800'
      }`}
    >
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className="flex-shrink-0">
            {isCompleted ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            ) : isError ? (
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            ) : (
              <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span
                className={`text-sm font-medium truncate ${
                  isCompleted
                    ? 'text-green-900 dark:text-green-100'
                    : isError
                    ? 'text-red-900 dark:text-red-100'
                    : 'text-blue-900 dark:text-blue-100'
                }`}
              >
                {activeTask.title}
              </span>
              <span
                className={`text-xs font-medium tabular-nums ${
                  isCompleted
                    ? 'text-green-700 dark:text-green-300'
                    : isError
                    ? 'text-red-700 dark:text-red-300'
                    : 'text-blue-700 dark:text-blue-300'
                }`}
              >
                {activeTask.current} / {activeTask.total} ({percentage}%)
              </span>
            </div>

            {/* Progress Bar */}
            <Progress
              value={percentage}
              className={`h-1.5 ${
                isCompleted
                  ? 'bg-green-200 dark:bg-green-900'
                  : isError
                  ? 'bg-red-200 dark:bg-red-900'
                  : 'bg-blue-200 dark:bg-blue-900'
              }`}
              indicatorClassName={
                isCompleted
                  ? 'bg-green-600 dark:bg-green-400'
                  : isError
                  ? 'bg-red-600 dark:bg-red-400'
                  : 'bg-blue-600 dark:bg-blue-400'
              }
            />

            {/* Message */}
            {activeTask.message && (
              <p
                className={`text-xs mt-1 truncate ${
                  isCompleted
                    ? 'text-green-700 dark:text-green-300'
                    : isError
                    ? 'text-red-700 dark:text-red-300'
                    : 'text-blue-700 dark:text-blue-300'
                }`}
              >
                {activeTask.message}
              </p>
            )}
          </div>

          {/* Close button */}
          {(isCompleted || isError) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeTask(activeTask.id)}
              className={`flex-shrink-0 h-6 w-6 p-0 ${
                isCompleted
                  ? 'hover:bg-green-200 dark:hover:bg-green-900'
                  : 'hover:bg-red-200 dark:hover:bg-red-900'
              }`}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
