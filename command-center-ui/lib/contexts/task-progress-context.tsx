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
  status: 'running' | 'completed' | 'error' | 'cancelled';
  message?: string;
  startedAt: number;
  completedAt?: number;
  logs: TaskLog[];
  abortController?: AbortController;
}

interface TaskProgressContextValue {
  tasks: TaskProgress[];
  activeTask: TaskProgress | null;
  activeTasks: TaskProgress[];
  startTask: (type: TaskType, title: string, total: number, abortController?: AbortController) => string;
  updateTask: (id: string, current: number, message?: string) => void;
  addLog: (id: string, message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  completeTask: (id: string) => void;
  errorTask: (id: string, message: string) => void;
  cancelTask: (id: string) => void;
  removeTask: (id: string) => void;
  clearCompletedTasks: () => void;
}

const TaskProgressContext = createContext<TaskProgressContextValue | undefined>(undefined);

export function TaskProgressProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<TaskProgress[]>([]);

  // Get the currently active (running) task
  const activeTask = tasks.find(t => t.status === 'running') || null;

  // Get all active (running) tasks
  const activeTasks = tasks.filter(t => t.status === 'running');

  // Start a new task
  const startTask = useCallback((type: TaskType, title: string, total: number, abortController?: AbortController): string => {
    const id = `task_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const newTask: TaskProgress = {
      id,
      type,
      title,
      current: 0,
      total,
      status: 'running',
      startedAt: Date.now(),
      logs: [],
      abortController
    };

    setTasks(prev => [...prev, newTask]);
    return id;
  }, []);

  // Update task progress
  const updateTask = useCallback((id: string, current: number, message?: string) => {
    setTasks(prev => prev.map(task =>
      task.id === id
        ? { ...task, current, message }
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
    setTasks(prev => prev.map(task =>
      task.id === id
        ? { ...task, status: 'completed' as const, current: task.total, completedAt: Date.now() }
        : task
    ));

    // Auto-remove completed tasks after 30 seconds
    setTimeout(() => {
      setTasks(prev => prev.filter(t => t.id !== id));
    }, 30000);
  }, []);

  // Mark task as errored
  const errorTask = useCallback((id: string, message: string) => {
    setTasks(prev => prev.map(task =>
      task.id === id
        ? { ...task, status: 'error' as const, message, completedAt: Date.now() }
        : task
    ));

    // Auto-remove error tasks after 5 seconds
    setTimeout(() => {
      setTasks(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  // Cancel a running task
  const cancelTask = useCallback((id: string) => {
    setTasks(prev => prev.map(task => {
      if (task.id === id) {
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

    // Auto-remove cancelled tasks after 30 seconds
    setTimeout(() => {
      setTasks(prev => prev.filter(t => t.id !== id));
    }, 30000);
  }, []);

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
      startTask,
      updateTask,
      addLog,
      completeTask,
      errorTask,
      cancelTask,
      removeTask,
      clearCompletedTasks
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
