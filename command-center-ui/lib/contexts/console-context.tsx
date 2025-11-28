'use client';

/**
 * Developer Console Context
 * Manages console logs for network requests, task events, and server logs
 */

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

export type LogType = 'task' | 'network' | 'server';
export type LogLevel = 'info' | 'success' | 'warning' | 'error';

export interface ConsoleLog {
  id: string;
  timestamp: number;
  type: LogType;
  level: LogLevel;
  source: string;
  message: string;
  details?: {
    // For network logs
    url?: string;
    method?: string;
    status?: number;
    duration?: number;
    requestBody?: any;
    responseBody?: any;
    requestHeaders?: Record<string, string>;
    responseHeaders?: Record<string, string>;
    // For server logs
    engine?: string;
    module?: string;
    data?: any;
    // For task logs
    taskId?: string;
    taskType?: string;
    progress?: number;
  };
}

export interface ConsoleFilters {
  types: LogType[];
  levels: LogLevel[];
  sources: string[];
  search: string;
}

export interface ConsoleSettings {
  maxLogs: number;
  autoScroll: boolean;
  showHealthChecks: boolean;
  persistLogs: boolean;
}

const DEFAULT_SETTINGS: ConsoleSettings = {
  maxLogs: 1000,
  autoScroll: true,
  showHealthChecks: false,
  persistLogs: false,
};

const DEFAULT_FILTERS: ConsoleFilters = {
  types: ['task', 'network', 'server'],
  levels: ['info', 'success', 'warning', 'error'],
  sources: [],
  search: '',
};

interface ConsoleContextValue {
  logs: ConsoleLog[];
  filteredLogs: ConsoleLog[];
  filters: ConsoleFilters;
  settings: ConsoleSettings;
  isOpen: boolean;
  activeTab: 'tasks' | 'network' | 'console';
  addLog: (log: Omit<ConsoleLog, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;
  exportLogs: () => void;
  setFilters: (filters: Partial<ConsoleFilters>) => void;
  setSettings: (settings: Partial<ConsoleSettings>) => void;
  setIsOpen: (isOpen: boolean) => void;
  setActiveTab: (tab: 'tasks' | 'network' | 'console') => void;
  toggleConsole: () => void;
}

const ConsoleContext = createContext<ConsoleContextValue | undefined>(undefined);

export function ConsoleProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<ConsoleLog[]>([]);
  const [filters, setFiltersState] = useState<ConsoleFilters>(DEFAULT_FILTERS);
  const [settings, setSettingsState] = useState<ConsoleSettings>(DEFAULT_SETTINGS);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'tasks' | 'network' | 'console'>('tasks');

  // Load settings from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSettings = localStorage.getItem('console-settings');
      if (savedSettings) {
        try {
          setSettingsState({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
        } catch (e) {
          console.error('Failed to parse console settings:', e);
        }
      }
    }
  }, []);

  // Save settings to localStorage when changed
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('console-settings', JSON.stringify(settings));
    }
  }, [settings]);

  // Filter logs based on current filters
  const filteredLogs = logs.filter(log => {
    // Type filter
    if (!filters.types.includes(log.type)) return false;

    // Level filter
    if (!filters.levels.includes(log.level)) return false;

    // Source filter (if any sources specified)
    if (filters.sources.length > 0 && !filters.sources.includes(log.source)) return false;

    // Health check filter
    if (!settings.showHealthChecks && log.details?.url?.includes('/health')) return false;

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesMessage = log.message.toLowerCase().includes(searchLower);
      const matchesSource = log.source.toLowerCase().includes(searchLower);
      const matchesUrl = log.details?.url?.toLowerCase().includes(searchLower);
      if (!matchesMessage && !matchesSource && !matchesUrl) return false;
    }

    return true;
  });

  // Add a new log entry
  const addLog = useCallback((log: Omit<ConsoleLog, 'id' | 'timestamp'>) => {
    const newLog: ConsoleLog = {
      ...log,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      timestamp: Date.now(),
    };

    setLogs(prev => {
      const newLogs = [...prev, newLog];
      // Trim to max logs (remove oldest from front)
      if (newLogs.length > settings.maxLogs) {
        return newLogs.slice(-settings.maxLogs);
      }
      return newLogs;
    });
  }, [settings.maxLogs]);

  // Clear all logs
  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  // Export logs as JSON file
  const exportLogs = useCallback(() => {
    const dataStr = JSON.stringify(filteredLogs, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportName = `console-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportName);
    linkElement.click();
  }, [filteredLogs]);

  // Update filters
  const setFilters = useCallback((newFilters: Partial<ConsoleFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Update settings
  const setSettings = useCallback((newSettings: Partial<ConsoleSettings>) => {
    setSettingsState(prev => ({ ...prev, ...newSettings }));
  }, []);

  // Toggle console open/close
  const toggleConsole = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  // Keyboard shortcut: Cmd/Ctrl + Shift + J to toggle console
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Shift + J - Toggle console
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'j') {
        e.preventDefault();
        toggleConsole();
      }
      // Cmd/Ctrl + K - Clear logs (when console is open)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k' && isOpen) {
        e.preventDefault();
        clearLogs();
      }
      // Escape - Close console
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleConsole, clearLogs, isOpen]);

  return (
    <ConsoleContext.Provider
      value={{
        logs,
        filteredLogs,
        filters,
        settings,
        isOpen,
        activeTab,
        addLog,
        clearLogs,
        exportLogs,
        setFilters,
        setSettings,
        setIsOpen,
        setActiveTab,
        toggleConsole,
      }}
    >
      {children}
    </ConsoleContext.Provider>
  );
}

// Default noop context for SSR/fallback scenarios
const defaultContext: ConsoleContextValue = {
  logs: [],
  filteredLogs: [],
  filters: DEFAULT_FILTERS,
  settings: DEFAULT_SETTINGS,
  isOpen: false,
  activeTab: 'tasks',
  addLog: () => {},
  clearLogs: () => {},
  exportLogs: () => {},
  setFilters: () => {},
  setSettings: () => {},
  setIsOpen: () => {},
  setActiveTab: () => {},
  toggleConsole: () => {},
};

export function useConsole() {
  const context = useContext(ConsoleContext);
  // Return default context if provider not available (SSR or outside provider)
  return context || defaultContext;
}

// Helper hook to add logs from anywhere in the app
export function useConsoleLog() {
  const { addLog } = useConsole();

  return {
    logNetwork: (
      method: string,
      url: string,
      status: number,
      duration: number,
      requestBody?: any,
      responseBody?: any
    ) => {
      const isError = status >= 400;
      addLog({
        type: 'network',
        level: isError ? 'error' : 'success',
        source: new URL(url, window.location.origin).pathname,
        message: `${method} ${url} - ${status} (${duration}ms)`,
        details: {
          url,
          method,
          status,
          duration,
          requestBody,
          responseBody,
        },
      });
    },

    logTask: (taskId: string, message: string, level: LogLevel = 'info', details?: any) => {
      addLog({
        type: 'task',
        level,
        source: 'task',
        message,
        details: {
          taskId,
          ...details,
        },
      });
    },

    logServer: (engine: string, message: string, level: LogLevel = 'info') => {
      addLog({
        type: 'server',
        level,
        source: engine,
        message,
        details: {
          engine,
        },
      });
    },

    log: addLog,
  };
}
