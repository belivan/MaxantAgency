'use client';

/**
 * Floating Task Indicator with Developer Console
 * Shows active tasks and network logs in a floating panel with tabs
 */

import { useState, useEffect } from 'react';
import { useTaskProgress } from '@/lib/contexts/task-progress-context';
import { useConsole } from '@/lib/contexts/console-context';
import { useMobile } from '@/lib/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ConsolePanel } from '@/components/console/console-panel';
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Activity,
  ChevronDown,
  ChevronUp,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Globe,
  Search,
  Camera,
  Brain,
  TrendingUp,
  ListTodo,
  Terminal,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

// Custom "M" Logo Icon
const MaxantLogo = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M3 20V4h3.5L12 13.5 17.5 4H21v16h-3V9.5L12 19 6 9.5V20H3z" />
  </svg>
);

// Helper function to get phase icon
const getPhaseIcon = (phase: string) => {
  const phaseLower = phase.toLowerCase();
  if (phaseLower.includes('discover') || phaseLower.includes('sitemap')) {
    return '🌐';
  }
  if (phaseLower.includes('crawl') || phaseLower.includes('screenshot')) {
    return '📸';
  }
  if (phaseLower.includes('analyz') || phaseLower.includes('seo')) {
    return '🔍';
  }
  if (phaseLower.includes('scor') || phaseLower.includes('grad')) {
    return '📊';
  }
  if (phaseLower.includes('ai') || phaseLower.includes('select')) {
    return '🤖';
  }
  return '⚡';
};

// Helper function to get grade color
const getGradeColor = (grade: string) => {
  switch (grade) {
    case 'A':
      return 'text-green-600 dark:text-green-400 font-bold';
    case 'B':
      return 'text-blue-600 dark:text-blue-400 font-bold';
    case 'C':
      return 'text-yellow-600 dark:text-yellow-400 font-bold';
    case 'D':
      return 'text-orange-600 dark:text-orange-400 font-bold';
    case 'F':
      return 'text-red-600 dark:text-red-400 font-bold';
    default:
      return 'font-bold';
  }
};

type TabType = 'tasks' | 'console';

export function FloatingTaskIndicator() {
  const [mounted, setMounted] = useState(false);
  const { tasks, activeTasks, queuedTasks, removeTask, cancelTask } = useTaskProgress();
  const { filteredLogs, errorCount, isOpen, setIsOpen, toggleConsole } = useConsole();
  const [activeTab, setActiveTab] = useState<TabType>('tasks');
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set());
  const isMobile = useMobile();

  // Only render on client side to avoid SSR hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const toggleTaskDetails = (taskId: string) => {
    setExpandedTaskIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const handleCancel = (taskId: string) => {
    cancelTask(taskId);
  };

  const handleCancelAll = () => {
    if (confirm(`Cancel all ${activeTasks.length} running tasks?`)) {
      activeTasks.forEach(task => cancelTask(task.id));
    }
  };

  const activeCount = activeTasks.length;
  const queuedCount = queuedTasks.length;
  const hasActiveTasks = activeCount > 0;
  const hasLogs = filteredLogs.length > 0;
  // errorCount is now memoized and provided by the context

  // Always show the floating button so users can access the console anytime

  // Shared panel content for both mobile and desktop
  const panelContent = (
    <div className="flex flex-col h-full">
      {/* Tab Header */}
      <div className="border-b bg-muted/50 px-2 py-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1">
          {/* Tasks Tab */}
          <button
            onClick={() => setActiveTab('tasks')}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 md:px-3 md:py-1.5 rounded-md text-sm font-medium transition-colors',
              activeTab === 'tasks'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            <ListTodo className="h-4 w-4" />
            <span className="hidden sm:inline">Tasks</span>
            {tasks.length > 0 && (
              <span className={cn(
                'ml-1 text-xs px-1.5 py-0.5 rounded-full',
                hasActiveTasks ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/20'
              )}>
                {tasks.length}
              </span>
            )}
          </button>

          {/* Console Tab */}
          <button
            onClick={() => setActiveTab('console')}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 md:px-3 md:py-1.5 rounded-md text-sm font-medium transition-colors',
              activeTab === 'console'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            <Terminal className="h-4 w-4" />
            <span className="hidden sm:inline">Console</span>
            {hasLogs && (
              <span className={cn(
                'ml-1 text-xs px-1.5 py-0.5 rounded-full',
                errorCount > 0 ? 'bg-red-500 text-white' : 'bg-muted-foreground/20'
              )}>
                {filteredLogs.length}
              </span>
            )}
          </button>
        </div>

        {/* Close Button - only show on desktop (mobile has sheet close) */}
        {!isMobile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="h-7 w-7 p-0"
          >
            <ChevronDown className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden min-h-0">
        {activeTab === 'tasks' ? (
          /* Tasks Panel */
          <div className="h-full flex flex-col overflow-hidden">
            {/* Tasks Header */}
            {hasActiveTasks && (
              <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
                <span className="text-xs text-muted-foreground">
                  {activeCount} active{queuedCount > 0 ? `, ${queuedCount} queued` : ''}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelAll}
                  className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                >
                  Cancel All
                </Button>
              </div>
            )}

            {/* Task List */}
            <div className="flex-1 overflow-y-auto">
              {tasks.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  <ListTodo className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No active tasks</p>
                  <p className="text-xs mt-1">Tasks will appear here when running</p>
                </div>
              ) : (
                tasks.map((task) => {
                  const percentage = task.total > 0
                    ? Math.min(Math.round((task.current / task.total) * 100), 100)
                    : 0;
                  const isRunning = task.status === 'running';
                  const isQueued = task.status === 'queued';
                  const isCompleted = task.status === 'completed';
                  const isError = task.status === 'error';
                  const isCancelled = task.status === 'cancelled';
                  const isDetailsExpanded = expandedTaskIds.has(task.id);

                  return (
                    <div
                      key={task.id}
                      className={`border-b last:border-b-0 ${
                        isRunning
                          ? 'bg-primary/5 dark:bg-primary/10'
                          : isQueued
                          ? 'bg-amber-50/50 dark:bg-amber-950/20 border-l-2 border-l-amber-400'
                          : isCompleted
                          ? 'bg-green-50/50 dark:bg-green-950/20'
                          : isCancelled
                          ? 'bg-gray-50/50 dark:bg-gray-950/20'
                          : 'bg-red-50/50 dark:bg-red-950/20'
                      }`}
                    >
                      {/* Task Header */}
                      <div className="p-3">
                        <div className="flex items-start gap-2">
                          {/* Icon */}
                          <div className="flex-shrink-0 mt-0.5">
                            {isRunning ? (
                              <Loader2 className="w-4 h-4 text-primary animate-spin" />
                            ) : isQueued ? (
                              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            ) : isCompleted ? (
                              <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                            ) : isCancelled ? (
                              <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-sm font-medium truncate">
                                {task.title}
                              </span>
                              {isQueued && task.queuePosition ? (
                                <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full flex-shrink-0">
                                  #{task.queuePosition} in queue
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0">
                                  {percentage}%
                                </span>
                              )}
                            </div>

                            {/* Queue Status Message */}
                            {isQueued && (
                              <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">
                                Waiting for available slot...
                              </p>
                            )}

                            {/* Progress Bar */}
                            <Progress value={percentage} className="h-1.5 mb-2" />

                            {/* Enhanced Details for Analysis Tasks */}
                            {task.metadata?.type === 'analysis' && task.metadata?.details && (
                              <div className="space-y-1 mb-2">
                                {/* Website URL */}
                                {task.metadata.details.website && (
                                  <div className="text-xs text-muted-foreground truncate">
                                    {task.metadata.details.website}
                                  </div>
                                )}

                                {/* Current Phase */}
                                {task.metadata.details.phase && (
                                  <div className="text-xs font-medium">
                                    {getPhaseIcon(task.metadata.details.phase)} {task.metadata.details.phase}
                                  </div>
                                )}

                                {/* Pages Info */}
                                {task.metadata.details.pagesDiscovered !== undefined && (
                                  <div className="text-xs text-muted-foreground">
                                    {task.metadata.details.pagesAnalyzed || 0}/{task.metadata.details.pagesDiscovered} pages
                                  </div>
                                )}

                                {/* Active Analyzers */}
                                {task.metadata.details.activeAnalyzers && task.metadata.details.activeAnalyzers.length > 0 && (
                                  <div className="text-xs text-muted-foreground">
                                    {task.metadata.details.activeAnalyzers.join(', ')}
                                  </div>
                                )}

                                {/* Grade (if calculated) */}
                                {task.metadata.details.grade && (
                                  <div className="text-xs font-medium">
                                    Grade: <span className={getGradeColor(task.metadata.details.grade)}>
                                      {task.metadata.details.grade}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Standard Details */}
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span className="tabular-nums">
                                {task.current} / {task.total}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatDistanceToNow(task.startedAt, { addSuffix: true })}
                                </span>
                                {task.logs.length > 0 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleTaskDetails(task.id)}
                                    className="h-5 px-1 text-xs"
                                  >
                                    {isDetailsExpanded ? 'Hide' : 'Details'}
                                    {isDetailsExpanded ? (
                                      <ChevronUp className="w-3 h-3 ml-1" />
                                    ) : (
                                      <ChevronDown className="w-3 h-3 ml-1" />
                                    )}
                                  </Button>
                                )}
                              </div>
                            </div>

                            {/* Current Message */}
                            {task.message && (
                              <p className="text-xs text-muted-foreground mt-1 truncate">
                                {typeof task.message === 'string'
                                  ? task.message
                                  : JSON.stringify(task.message)}
                              </p>
                            )}
                          </div>

                          {/* Cancel/Close Button */}
                          {isRunning || isQueued ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancel(task.id)}
                              className="flex-shrink-0 h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-950"
                              title={isQueued ? "Remove from queue" : "Cancel task"}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeTask(task.id)}
                              className="flex-shrink-0 h-6 w-6 p-0"
                              title="Remove task"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          )}
                        </div>

                        {/* Expanded Logs */}
                        {isDetailsExpanded && task.logs.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {task.logs.map((log, index) => (
                                <div
                                  key={index}
                                  className={`text-xs p-2 rounded ${
                                    log.type === 'error'
                                      ? 'bg-red-100 dark:bg-red-950 text-red-900 dark:text-red-100'
                                      : log.type === 'success'
                                      ? 'bg-green-100 dark:bg-green-950 text-green-900 dark:text-green-100'
                                      : log.type === 'warning'
                                      ? 'bg-yellow-100 dark:bg-yellow-950 text-yellow-900 dark:text-yellow-100'
                                      : 'bg-muted'
                                  }`}
                                >
                                  <span className="text-[10px] opacity-60">
                                    {new Date(log.timestamp).toLocaleTimeString()}
                                  </span>
                                  {' - '}
                                  <span>
                                    {typeof log.message === 'string'
                                      ? log.message
                                      : JSON.stringify(log.message)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          /* Console Panel */
          <ConsolePanel />
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile: Sheet drawer */}
      {isMobile ? (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetContent side="bottom" className="h-[70vh] p-0 rounded-t-xl">
            <SheetTitle className="sr-only">Task Progress</SheetTitle>
            {panelContent}
          </SheetContent>
        </Sheet>
      ) : (
        /* Desktop: Fixed panel - positioned next to sidebar */
        isOpen && (
          <div className="fixed bottom-4 left-60 z-50 w-[28rem] max-h-[32rem] overflow-hidden rounded-lg border bg-card shadow-lg">
            {panelContent}
          </div>
        )
      )}

      {/* Floating Button - only on mobile (desktop uses sidebar) */}
      <div className="fixed bottom-4 right-4 z-50 md:hidden">
        <Button
          onClick={toggleConsole}
          size="lg"
          className={cn(
            'rounded-full h-12 w-12 shadow-lg transition-all',
            hasActiveTasks
              ? 'bg-primary hover:bg-primary/90 animate-pulse'
              : 'bg-primary hover:bg-primary/90'
          )}
        >
          <MaxantLogo className={cn('w-5 h-5', hasActiveTasks && 'animate-spin')} />
        </Button>

        {/* Badge */}
        {(tasks.length > 0 || errorCount > 0) && (
          <span className={cn(
            'absolute -top-1 -right-1 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center ring-2 ring-background',
            errorCount > 0 ? 'bg-red-500' : 'bg-primary'
          )}>
            {errorCount > 0 ? errorCount : tasks.length}
          </span>
        )}
      </div>
    </>
  );
}
