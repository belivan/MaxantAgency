'use client';

/**
 * Global Task Progress Context
 * Manages progress tracking for long-running tasks across the entire app
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type TaskType = 'prospecting' | 'analysis' | 'outreach' | 'campaign';

export interface TaskLog {
  timestamp: number;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface TaskProgress {
  id: string;
  type: TaskType;
  title: string;
  current: number;
  total: number;
  status: 'queued' | 'running' | 'completed' | 'error' | 'cancelled';
  message?: string;
  startedAt: number;
  completedAt?: number;
  logs: TaskLog[];
  abortController?: AbortController;
  queuePosition?: number; // Position in queue (if queued)
  metadata?: {
    type?: string;
    details?: {
      website?: string;
      [key: string]: any;
    };
    [key: string]: any;
  };
}

// Concurrent task limits per type
export const TASK_LIMITS = {
  analysis: 20,     // Max 20 concurrent analysis batches
  prospecting: 20,  // Max 20 concurrent prospecting batches
  outreach: 20,     // Max 20 concurrent email generation batches
  campaign: 20,     // Max 20 campaigns at a time
  total: 80         // Max 80 total operations across all types
} as const;

interface TaskProgressContextValue {
  tasks: TaskProgress[];
  activeTask: TaskProgress | null;
  activeTasks: TaskProgress[];
  queuedTasks: TaskProgress[];
  startTask: (type: TaskType, title: string, total: number, abortController?: AbortController) => string;
  updateTask: (id: string, current: number, message?: string, newTotal?: number) => void;
  addLog: (id: string, message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  completeTask: (id: string) => void;
  errorTask: (id: string, message: string) => void;
  cancelTask: (id: string) => void;
  removeTask: (id: string) => void;
  clearCompletedTasks: () => void;
  canStartTask: (type: TaskType) => boolean;
  getQueuePosition: (type: TaskType) => number;
}

const TaskProgressContext = createContext<TaskProgressContextValue | undefined>(undefined);

export function TaskProgressProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<TaskProgress[]>([]);

  // Get the currently active (running) task
  const activeTask = tasks.find(t => t.status === 'running') || null;

  // Get all active (running) tasks
  const activeTasks = tasks.filter(t => t.status === 'running');

  // Get all queued tasks
  const queuedTasks = tasks.filter(t => t.status === 'queued');

  // Check if a new task of given type can start immediately
  const canStartTask = useCallback((type: TaskType): boolean => {
    const activeCount = activeTasks.filter(t => t.type === type).length;
    const totalActiveCount = activeTasks.length;

    // Check type-specific limit
    if (activeCount >= TASK_LIMITS[type]) {
      return false;
    }

    // Check total system limit
    if (totalActiveCount >= TASK_LIMITS.total) {
      return false;
    }

    return true;
  }, [activeTasks]);

  // Get the queue position for next task of given type
  const getQueuePosition = useCallback((type: TaskType): number => {
    const queuedOfType = queuedTasks.filter(t => t.type === type);
    return queuedOfType.length;
  }, [queuedTasks]);

  // Start next queued task of given type (if any)
  const startNextQueuedTask = useCallback((type: TaskType) => {
    setTasks(prev => {
      // Find first queued task of this type
      const queuedTask = prev.find(t => t.type === type && t.status === 'queued');
      if (!queuedTask) return prev;

      // Check if we can start it now
      const activeCount = prev.filter(t => t.type === type && t.status === 'running').length;
      const totalActiveCount = prev.filter(t => t.status === 'running').length;

      if (activeCount >= TASK_LIMITS[type] || totalActiveCount >= TASK_LIMITS.total) {
        return prev; // Still can't start, keep queued
      }

      // Start the queued task
      return prev.map(t =>
        t.id === queuedTask.id
          ? { ...t, status: 'running' as const, queuePosition: undefined }
          : t
      );
    });
  }, []);

  // Start a new task (or queue it if limits reached)
  const startTask = useCallback((type: TaskType, title: string, total: number, abortController?: AbortController): string => {
    const id = `task_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Check if we can start immediately
    const activeCount = activeTasks.filter(t => t.type === type).length;
    const totalActiveCount = activeTasks.length;
    const canStart = activeCount < TASK_LIMITS[type] && totalActiveCount < TASK_LIMITS.total;

    const newTask: TaskProgress = {
      id,
      type,
      title,
      current: 0,
      total,
      status: canStart ? 'running' : 'queued',
      startedAt: Date.now(),
      logs: canStart ? [] : [{
        timestamp: Date.now(),
        message: `Queued (${getQueuePosition(type) + 1} in line for ${type})`,
        type: 'info'
      }],
      abortController,
      queuePosition: canStart ? undefined : getQueuePosition(type) + 1
    };

    setTasks(prev => [...prev, newTask]);
    return id;
  }, [activeTasks, getQueuePosition]);

  // Update task progress
  const updateTask = useCallback((id: string, current: number, message?: string, newTotal?: number) => {
    setTasks(prev => prev.map(task =>
      task.id === id
        ? { ...task, current, message, ...(newTotal !== undefined ? { total: newTotal } : {}) }
        : task
    ));
  }, []);

  // Add log to task
  const addLog = useCallback((id: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    setTasks(prev => prev.map(task =>
      task.id === id
        ? { ...task, logs: [...task.logs, { timestamp: Date.now(), message, type }] }
        : task
    ));
  }, []);

  // Mark task as completed
  const completeTask = useCallback((id: string) => {
    let taskType: TaskType | null = null;

    setTasks(prev => prev.map(task => {
      if (task.id === id) {
        taskType = task.type;
        return { ...task, status: 'completed' as const, current: task.total, completedAt: Date.now() };
      }
      return task;
    }));

    // Start next queued task of this type
    if (taskType) {
      setTimeout(() => startNextQueuedTask(taskType as TaskType), 100);
    }

    // Auto-remove completed tasks after 60 seconds
    setTimeout(() => {
      setTasks(prev => prev.filter(t => t.id !== id));
    }, 60000);
  }, [startNextQueuedTask]);

  // Mark task as errored
  const errorTask = useCallback((id: string, message: string) => {
    let taskType: TaskType | null = null;

    setTasks(prev => prev.map(task => {
      if (task.id === id) {
        taskType = task.type;
        return { ...task, status: 'error' as const, message, completedAt: Date.now() };
      }
      return task;
    }));

    // Start next queued task of this type
    if (taskType) {
      setTimeout(() => startNextQueuedTask(taskType as TaskType), 100);
    }

    // Auto-remove error tasks after 5 seconds
    setTimeout(() => {
      setTasks(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, [startNextQueuedTask]);

  // Cancel a running task
  const cancelTask = useCallback((id: string) => {
    let taskType: TaskType | null = null;

    setTasks(prev => prev.map(task => {
      if (task.id === id) {
        taskType = task.type;
        // Abort the fetch request if abortController exists
        if (task.abortController) {
          task.abortController.abort();
        }
        return {
          ...task,
          status: 'cancelled' as const,
          message: 'Cancelled by user',
          completedAt: Date.now()
        };
      }
      return task;
    }));

    // Start next queued task of this type
    if (taskType) {
      setTimeout(() => startNextQueuedTask(taskType as TaskType), 100);
    }

    // Auto-remove cancelled tasks after 30 seconds
    setTimeout(() => {
      setTasks(prev => prev.filter(t => t.id !== id));
    }, 30000);
  }, [startNextQueuedTask]);

  // Remove a specific task
  const removeTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  // Clear all completed tasks
  const clearCompletedTasks = useCallback(() => {
    setTasks(prev => prev.filter(t => t.status === 'running'));
  }, []);

  return (
    <TaskProgressContext.Provider value={{
      tasks,
      activeTask,
      activeTasks,
      queuedTasks,
      startTask,
      updateTask,
      addLog,
      completeTask,
      errorTask,
      cancelTask,
      removeTask,
      clearCompletedTasks,
      canStartTask,
      getQueuePosition
    }}>
      {children}
    </TaskProgressContext.Provider>
  );
}

export function useTaskProgress() {
  const context = useContext(TaskProgressContext);
  if (!context) {
    throw new Error('useTaskProgress must be used within TaskProgressProvider');
  }
  return context;
}
