/**
 * Unified Task + SSE Hook
 * Combines TaskProgressContext with useSSE for automatic task tracking of SSE operations
 */

import { useState, useCallback, useRef } from 'react';
import { useTaskProgress, type TaskType } from '@/lib/contexts/task-progress-context';
import { useSSE, type SSEStatus, type SSEError } from './use-sse';
import type { SSEMessage } from '@/lib/types';

export interface UseTaskWithSSEOptions<T = any> {
  /** Type of task (prospecting, analysis, outreach, campaign) */
  taskType: TaskType;

  /** Called on each progress update */
  onProgress?: (data: T, taskId: string) => void;

  /** Called when operation completes successfully */
  onComplete?: (data: T, taskId: string) => void;

  /** Called when an error occurs */
  onError?: (error: SSEError, taskId: string) => void;

  /** Called on any SSE message (for custom handling) */
  onMessage?: (message: SSEMessage<T>, taskId: string) => void;
}

export interface StartOperationConfig {
  /** SSE endpoint URL */
  url: string;

  /** Task title (shown in UI) */
  title: string;

  /** Total items to process */
  total: number;

  /** Optional metadata for the task */
  metadata?: Record<string, any>;

  /** Optional abort controller for cancellation */
  abortController?: AbortController;
}

export interface UseTaskWithSSEReturn {
  /** Current task ID (null if no task is running) */
  taskId: string | null;

  /** Whether a task is currently active */
  isActive: boolean;

  /** SSE connection status */
  status: SSEStatus;

  /** Current error (if any) */
  error: SSEError | null;

  /** Start a new operation */
  startOperation: (config: StartOperationConfig) => void;

  /** Cancel the current operation */
  cancel: () => void;
}

/**
 * Hook that automatically manages task tracking for SSE operations
 *
 * @example
 * ```tsx
 * const { startOperation, isActive, taskId } = useTaskWithSSE({
 *   taskType: 'analysis',
 *   onProgress: (data) => {
 *     console.log('Progress:', data);
 *   },
 *   onComplete: (data) => {
 *     console.log('Completed:', data);
 *     refreshLeads();
 *   }
 * });
 *
 * // Start an operation
 * startOperation({
 *   url: '/api/analyze',
 *   title: 'Analyzing 10 companies',
 *   total: 10,
 *   metadata: { leadIds: [1, 2, 3] }
 * });
 * ```
 */
export function useTaskWithSSE<T = any>(
  options: UseTaskWithSSEOptions<T>
): UseTaskWithSSEReturn {
  const { taskType, onProgress, onComplete, onError, onMessage } = options;

  const {
    startTask,
    updateTask,
    addLog,
    completeTask,
    errorTask,
    cancelTask
  } = useTaskProgress();

  const [taskId, setTaskId] = useState<string | null>(null);
  const [sseUrl, setSseUrl] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // SSE event handlers
  const handleSSEMessage = useCallback((message: SSEMessage<T>) => {
    if (!taskId) return;

    // Call custom message handler
    onMessage?.(message, taskId);

    // Handle different message types
    switch (message.type) {
      case 'progress':
        // Extract progress data
        const progressData = message.data as any;
        const current = progressData.current || progressData.progress || 0;
        const msg = progressData.message || progressData.status || '';

        // Update task progress
        updateTask(taskId, current, msg);

        // Add log if there's a message
        if (msg) {
          addLog(taskId, msg, 'info');
        }

        // Call custom progress handler
        onProgress?.(message.data, taskId);
        break;

      case 'log':
        // Add log message
        const logData = message.data as any;
        const logMessage = logData.message || String(message.data);
        const logType = logData.type || 'info';
        addLog(taskId, logMessage, logType);
        break;

      case 'status':
        // Update task message/status
        const statusData = message.data as any;
        const statusMsg = statusData.message || String(message.data);
        updateTask(taskId, statusData.current || 0, statusMsg);
        break;
    }
  }, [taskId, onMessage, onProgress, updateTask, addLog]);

  const handleSSEComplete = useCallback((data: T) => {
    if (!taskId) return;

    // Mark task as completed
    completeTask(taskId);

    // Call custom complete handler
    onComplete?.(data, taskId);

    // Clear task ID
    setTaskId(null);
    setSseUrl(null);
  }, [taskId, completeTask, onComplete]);

  const handleSSEError = useCallback((error: SSEError) => {
    if (!taskId) return;

    // Mark task as errored
    errorTask(taskId, error.message);

    // Call custom error handler
    onError?.(error, taskId);

    // Clear task ID
    setTaskId(null);
    setSseUrl(null);
  }, [taskId, errorTask, onError]);

  // Set up SSE connection
  const { status, error, close } = useSSE<T>({
    url: sseUrl,
    onMessage: handleSSEMessage,
    onComplete: handleSSEComplete,
    onError: handleSSEError,
    reconnect: false // Don't auto-reconnect (let user retry manually)
  });

  // Start a new operation
  const startOperation = useCallback((config: StartOperationConfig) => {
    const { url, title, total, metadata, abortController } = config;

    // Store abort controller
    abortControllerRef.current = abortController || null;

    // Start task in global tracker
    const newTaskId = startTask(
      taskType,
      title,
      total,
      abortController
    );

    // Set task metadata if provided
    if (metadata) {
      // Note: Task metadata is set during startTask, but we can extend it here
      // by updating the task (this would require extending the updateTask API)
      // For now, metadata should be passed via startTask's abortController approach
    }

    setTaskId(newTaskId);

    // Start SSE connection
    setSseUrl(url);

    return newTaskId;
  }, [taskType, startTask]);

  // Cancel the current operation
  const cancel = useCallback(() => {
    if (!taskId) return;

    // Cancel task in global tracker (this will call abort on abortController)
    cancelTask(taskId);

    // Close SSE connection
    close();

    // Clear state
    setTaskId(null);
    setSseUrl(null);
  }, [taskId, cancelTask, close]);

  return {
    taskId,
    isActive: !!taskId && status !== 'closed' && status !== 'error',
    status,
    error,
    startOperation,
    cancel
  };
}

/**
 * Simplified version for single-operation use cases
 * Automatically starts the operation when component mounts
 */
export function useAutoTaskWithSSE<T = any>(
  config: StartOperationConfig & UseTaskWithSSEOptions<T>
) {
  const { url, title, total, metadata, abortController, ...options } = config;

  const hook = useTaskWithSSE<T>(options);

  // Auto-start on mount
  useState(() => {
    hook.startOperation({ url, title, total, metadata, abortController });
  });

  return hook;
}
