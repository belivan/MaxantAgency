/**
 * Task + SSE Manager Utility
 * Creates and manages SSE connections with automatic task tracking
 * Supports concurrent operations (multiple simultaneous SSE connections)
 */

import type { TaskType, TaskProgress } from '@/lib/contexts/task-progress-context';
import type { SSEMessage } from '@/lib/types';

export interface TaskSSEConfig {
  /** SSE endpoint URL */
  url: string;

  /** Task type */
  taskType: TaskType;

  /** Task title */
  title: string;

  /** Total items to process */
  total: number;

  /** HTTP method (default: GET) */
  method?: 'GET' | 'POST';

  /** Request body (for POST requests) */
  body?: any;

  /** Optional abort controller for cancellation */
  abortController?: AbortController;

  /** Optional metadata */
  metadata?: Record<string, any>;

  /** Task management functions (from useTaskProgress hook) */
  taskManager: {
    startTask: (type: TaskType, title: string, total: number, abortController?: AbortController) => string;
    updateTask: (id: string, current: number, message?: string) => void;
    addLog: (id: string, message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
    completeTask: (id: string) => void;
    errorTask: (id: string, message: string) => void;
    cancelTask: (id: string) => void;
  };

  /** Called on each progress update */
  onProgress?: (data: any, taskId: string) => void;

  /** Called when operation completes successfully */
  onComplete?: (data: any, taskId: string) => void;

  /** Called when an error occurs */
  onError?: (error: { message: string; code?: string }, taskId: string) => void;

  /** Called on any SSE message */
  onMessage?: (message: SSEMessage, taskId: string) => void;
}

export interface TaskSSEConnection {
  /** Task ID */
  taskId: string;

  /** EventSource instance */
  eventSource: EventSource;

  /** Close the connection */
  close: () => void;

  /** Cancel the task */
  cancel: () => void;
}

/**
 * Start an SSE operation with automatic task tracking
 * Can be called multiple times for concurrent operations
 *
 * @example
 * ```tsx
 * const { startTask, updateTask, ... } = useTaskProgress();
 *
 * // Start first operation
 * const connection1 = startTaskWithSSE({
 *   url: '/api/analyze?ids=1,2,3',
 *   taskType: 'analysis',
 *   title: 'Analyzing batch 1',
 *   total: 3,
 *   taskManager: { startTask, updateTask, ... },
 *   onComplete: () => refreshData()
 * });
 *
 * // Start second operation (concurrent)
 * const connection2 = startTaskWithSSE({
 *   url: '/api/analyze?ids=4,5,6',
 *   taskType: 'analysis',
 *   title: 'Analyzing batch 2',
 *   total: 3,
 *   taskManager: { startTask, updateTask, ... },
 *   onComplete: () => refreshData()
 * });
 * ```
 */
export function startTaskWithSSE(config: TaskSSEConfig): TaskSSEConnection {
  const {
    url,
    method = 'GET',
    body,
    taskType,
    title,
    total,
    abortController,
    metadata,
    taskManager,
    onProgress,
    onComplete,
    onError,
    onMessage
  } = config;

  const {
    startTask,
    updateTask,
    addLog,
    completeTask,
    errorTask,
    cancelTask
  } = taskManager;

  // Start task tracking
  const taskId = startTask(taskType, title, total, abortController);

  // Track if connection is closed
  let isClosed = false;

  // SSE Message handler (shared between EventSource and fetch)
  const handleMessage = (data: any) => {
    try {
      const message: SSEMessage = typeof data === 'string' ? JSON.parse(data) : data;

      // Call custom message handler
      onMessage?.(message, taskId);

      // Handle different message types
      switch (message.type) {
        case 'progress': {
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
        }

        case 'complete': {
          // Mark task as completed
          completeTask(taskId);

          // Call custom complete handler
          onComplete?.(message.data, taskId);

          // Close connection
          isClosed = true;
          break;
        }

        case 'error': {
          const errorData = message.data as any;
          const errorMessage = errorData?.message || 'An error occurred';
          const errorCode = errorData?.code;

          // Mark task as errored
          errorTask(taskId, errorMessage);

          // Call custom error handler
          onError?.({ message: errorMessage, code: errorCode }, taskId);

          // Close connection
          isClosed = true;
          break;
        }

        case 'log': {
          const logData = message.data as any;
          const logMessage = logData.message || String(message.data);
          const logType = logData.type || 'info';
          addLog(taskId, logMessage, logType);
          break;
        }

        case 'status': {
          const statusData = message.data as any;
          const statusMsg = statusData.message || String(message.data);
          updateTask(taskId, statusData.current || 0, statusMsg);
          break;
        }
      }
    } catch (parseError) {
      console.error('Failed to parse SSE message:', parseError, data);
      addLog(taskId, 'Failed to parse server message', 'warning');
    }
  };

  if (method === 'GET') {
    // Use EventSource for GET requests
    const eventSource = new EventSource(url);

    // Handle connection opened
    eventSource.onopen = () => {
      addLog(taskId, 'Connection established', 'info');
    };

    // Handle messages
    eventSource.onmessage = (event) => {
      handleMessage(event.data);
      if (isClosed) {
        eventSource.close();
      }
    };

    // Handle connection errors
    eventSource.onerror = (event) => {
      console.error('SSE Error:', event);

      if (!isClosed) {
        errorTask(taskId, 'Connection error occurred');
        onError?.({ message: 'Connection error occurred', code: 'CONNECTION_ERROR' }, taskId);
        eventSource.close();
        isClosed = true;
      }
    };

    // Return connection controller
    return {
      taskId,
      eventSource,
      close: () => {
        if (!isClosed) {
          eventSource.close();
          isClosed = true;
        }
      },
      cancel: () => {
        if (!isClosed) {
          cancelTask(taskId);
          eventSource.close();
          isClosed = true;
        }
      }
    };
  } else {
    // Use fetch for POST requests (manual SSE parsing)
    const controller = abortController || new AbortController();

    // Start fetch request in background
    (async () => {
      try {
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json'
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`Request failed: ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response stream available');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        addLog(taskId, 'Connection established', 'info');

        while (!isClosed) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          // Track current event type for SSE format parsing
          let currentEventType = 'message';

          for (const line of lines) {
            // Break immediately if connection is closed
            if (isClosed) break;

            if (line.startsWith('event:')) {
              // Capture the event type instead of skipping it
              currentEventType = line.slice(6).trim();
            } else if (line.startsWith('data:')) {
              const dataStr = line.slice(5).trim();
              if (dataStr) {
                try {
                  // Parse the data payload
                  const dataPayload = JSON.parse(dataStr);

                  // Check if dataPayload is already a complete SSEMessage
                  // (contains type field), or if we need to wrap it
                  let message: SSEMessage;
                  if (dataPayload.type) {
                    // dataPayload contains a type field
                    if (dataPayload.data !== undefined) {
                      // Already a properly formatted SSEMessage with separate data property
                      message = dataPayload as SSEMessage;
                    } else {
                      // Has type but data is mixed in (legacy format)
                      // Use the entire payload as the data
                      message = {
                        type: dataPayload.type,
                        data: dataPayload,
                        timestamp: dataPayload.timestamp || new Date().toISOString()
                      };
                    }
                  } else {
                    // Wrap payload with event type from SSE format
                    // Map 'success' to 'progress' for compatibility with handler
                    message = {
                      type: currentEventType === 'success' ? 'progress' : currentEventType,
                      data: dataPayload,
                      timestamp: new Date().toISOString()
                    };
                  }

                  handleMessage(message);
                  currentEventType = 'message'; // Reset for next event

                  // Break immediately if handleMessage closed the connection
                  if (isClosed) break;
                } catch (parseError) {
                  console.error('[SSE Manager] Failed to parse SSE data:', dataStr, parseError);
                }
              }
            }
          }

          if (isClosed) {
            reader.cancel();
            break;
          }
        }
      } catch (error: any) {
        if (!isClosed) {
          const errorMessage = error.name === 'AbortError' ? 'Request cancelled' : error.message;
          errorTask(taskId, errorMessage);
          onError?.({ message: errorMessage }, taskId);
          isClosed = true;
        }
      }
    })();

    // Return connection controller (no eventSource for POST)
    return {
      taskId,
      eventSource: null as any,
      close: () => {
        if (!isClosed) {
          controller.abort();
          isClosed = true;
        }
      },
      cancel: () => {
        if (!isClosed) {
          cancelTask(taskId);
          controller.abort();
          isClosed = true;
        }
      }
    };
  }
}

/**
 * Start a regular fetch-based task (non-SSE)
 * Useful for operations that don't stream progress
 */
export async function startTaskWithFetch(config: Omit<TaskSSEConfig, 'url'> & {
  /** Async function to execute */
  execute: () => Promise<any>;
}): Promise<void> {
  const {
    taskType,
    title,
    total,
    abortController,
    taskManager,
    onComplete,
    onError
  } = config;

  const { startTask, updateTask, addLog, completeTask, errorTask } = taskManager;

  // Start task tracking
  const taskId = startTask(taskType, title, total, abortController);

  try {
    // Execute the async function
    const result = await config.execute();

    // Mark as complete
    completeTask(taskId);
    onComplete?.(result, taskId);
  } catch (error: any) {
    // Mark as errored
    const errorMessage = error.message || 'Operation failed';
    errorTask(taskId, errorMessage);
    onError?.({ message: errorMessage }, taskId);
  }
}
