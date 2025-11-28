'use client';

import { useRef, useEffect } from 'react';
import {
  Trash2,
  Download,
  Search,
  X,
  Settings,
  Globe,
  Server,
  ListTodo,
  Info,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  ArrowDown,
  Pause,
} from 'lucide-react';
import { useConsole, LogType, LogLevel } from '@/lib/contexts/console-context';
import { ConsoleLogEntry } from './console-log-entry';
import { cn } from '@/lib/utils';

const typeFilters: { type: LogType; icon: React.ReactNode; label: string }[] = [
  { type: 'network', icon: <Globe className="h-3.5 w-3.5" />, label: 'Network' },
  { type: 'task', icon: <ListTodo className="h-3.5 w-3.5" />, label: 'Tasks' },
  { type: 'server', icon: <Server className="h-3.5 w-3.5" />, label: 'Server' },
];

const levelFilters: { level: LogLevel; icon: React.ReactNode; label: string; color: string }[] = [
  { level: 'info', icon: <Info className="h-3.5 w-3.5" />, label: 'Info', color: 'text-blue-400' },
  { level: 'success', icon: <CheckCircle className="h-3.5 w-3.5" />, label: 'Success', color: 'text-green-400' },
  { level: 'warning', icon: <AlertTriangle className="h-3.5 w-3.5" />, label: 'Warning', color: 'text-yellow-400' },
  { level: 'error', icon: <AlertCircle className="h-3.5 w-3.5" />, label: 'Error', color: 'text-red-400' },
];

export function ConsolePanel() {
  const {
    filteredLogs,
    filters,
    settings,
    clearLogs,
    exportLogs,
    setFilters,
    setSettings,
  } = useConsole();

  const logsEndRef = useRef<HTMLDivElement>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (settings.autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredLogs.length, settings.autoScroll]);

  const toggleTypeFilter = (type: LogType) => {
    const newTypes = filters.types.includes(type)
      ? filters.types.filter(t => t !== type)
      : [...filters.types, type];
    setFilters({ types: newTypes.length > 0 ? newTypes : [type] });
  };

  const toggleLevelFilter = (level: LogLevel) => {
    const newLevels = filters.levels.includes(level)
      ? filters.levels.filter(l => l !== level)
      : [...filters.levels, level];
    setFilters({ levels: newLevels.length > 0 ? newLevels : [level] });
  };

  return (
    <div className="flex flex-col h-full max-h-[26rem] overflow-hidden">
      {/* Toolbar */}
      <div className="flex-shrink-0 border-b border-border p-2 space-y-2">
        {/* Top row: Type filters + Actions */}
        <div className="flex items-center justify-between gap-2">
          {/* Type filters */}
          <div className="flex items-center gap-1">
            {typeFilters.map(({ type, icon, label }) => (
              <button
                key={type}
                onClick={() => toggleTypeFilter(type)}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors',
                  filters.types.includes(type)
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                )}
                title={label}
              >
                {icon}
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {/* Auto-scroll toggle */}
            <button
              onClick={() => setSettings({ autoScroll: !settings.autoScroll })}
              className={cn(
                'p-1.5 rounded transition-colors',
                settings.autoScroll
                  ? 'bg-primary/20 text-primary'
                  : 'text-muted-foreground hover:bg-muted'
              )}
              title={settings.autoScroll ? 'Auto-scroll ON' : 'Auto-scroll OFF'}
            >
              {settings.autoScroll ? (
                <ArrowDown className="h-3.5 w-3.5" />
              ) : (
                <Pause className="h-3.5 w-3.5" />
              )}
            </button>

            {/* Health checks toggle */}
            <button
              onClick={() => setSettings({ showHealthChecks: !settings.showHealthChecks })}
              className={cn(
                'p-1.5 rounded transition-colors text-xs',
                settings.showHealthChecks
                  ? 'bg-primary/20 text-primary'
                  : 'text-muted-foreground hover:bg-muted'
              )}
              title={settings.showHealthChecks ? 'Showing health checks' : 'Hiding health checks'}
            >
              <Settings className="h-3.5 w-3.5" />
            </button>

            {/* Export */}
            <button
              onClick={exportLogs}
              className="p-1.5 rounded text-muted-foreground hover:bg-muted transition-colors"
              title="Export logs"
            >
              <Download className="h-3.5 w-3.5" />
            </button>

            {/* Clear */}
            <button
              onClick={clearLogs}
              className="p-1.5 rounded text-muted-foreground hover:bg-muted transition-colors"
              title="Clear logs (Cmd+K)"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Second row: Level filters + Search */}
        <div className="flex items-center gap-2">
          {/* Level filters */}
          <div className="flex items-center gap-1">
            {levelFilters.map(({ level, icon, label, color }) => (
              <button
                key={level}
                onClick={() => toggleLevelFilter(level)}
                className={cn(
                  'flex items-center gap-1 px-1.5 py-0.5 rounded text-xs transition-colors',
                  filters.levels.includes(level)
                    ? `bg-muted ${color}`
                    : 'text-muted-foreground/50 hover:text-muted-foreground'
                )}
                title={label}
              >
                {icon}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Filter logs..."
              value={filters.search}
              onChange={(e) => setFilters({ search: e.target.value })}
              className="w-full pl-7 pr-7 py-1 text-xs bg-muted/50 border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {filters.search && (
              <button
                onClick={() => setFilters({ search: '' })}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Log count */}
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {filteredLogs.length} logs
          </span>
        </div>
      </div>

      {/* Log list */}
      <div
        ref={logsContainerRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
      >
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
            <Globe className="h-8 w-8 mb-2 opacity-50" />
            <p>No logs yet</p>
            <p className="text-xs mt-1">Network requests and events will appear here</p>
          </div>
        ) : (
          <>
            {filteredLogs.map((log) => (
              <ConsoleLogEntry key={log.id} log={log} />
            ))}
            <div ref={logsEndRef} />
          </>
        )}
      </div>

      {/* Footer with keyboard shortcuts hint */}
      <div className="flex-shrink-0 border-t border-border px-2 py-1 text-[10px] text-muted-foreground flex items-center justify-between">
        <span>Cmd+Shift+J: Toggle | Cmd+K: Clear | Esc: Close</span>
        <span>{settings.showHealthChecks ? 'Showing' : 'Hiding'} health checks</span>
      </div>
    </div>
  );
}
