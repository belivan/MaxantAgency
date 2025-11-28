'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Globe,
  Server,
  ListTodo,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ConsoleLog, LogLevel, LogType } from '@/lib/contexts/console-context';

interface ConsoleLogEntryProps {
  log: ConsoleLog;
}

const levelIcons: Record<LogLevel, React.ReactNode> = {
  info: <Info className="h-3.5 w-3.5 text-blue-400" />,
  success: <CheckCircle className="h-3.5 w-3.5 text-green-400" />,
  warning: <AlertTriangle className="h-3.5 w-3.5 text-yellow-400" />,
  error: <AlertCircle className="h-3.5 w-3.5 text-red-400" />,
};

const typeIcons: Record<LogType, React.ReactNode> = {
  network: <Globe className="h-3.5 w-3.5 text-purple-400" />,
  server: <Server className="h-3.5 w-3.5 text-cyan-400" />,
  task: <ListTodo className="h-3.5 w-3.5 text-orange-400" />,
};

const levelColors: Record<LogLevel, string> = {
  info: 'text-blue-400',
  success: 'text-green-400',
  warning: 'text-yellow-400',
  error: 'text-red-400',
};

const statusColors: Record<number, string> = {
  2: 'text-green-400', // 2xx
  3: 'text-yellow-400', // 3xx
  4: 'text-red-400', // 4xx
  5: 'text-red-500', // 5xx
};

// Source badge colors based on engine/source name
const getSourceBadgeColors = (source: string): string => {
  const sourceLower = source.toLowerCase();
  // Engine names
  if (sourceLower.includes('prospect')) return 'bg-green-500/20 text-green-400 border-green-500/30';
  if (sourceLower.includes('analysis') || sourceLower.includes('analyze')) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  if (sourceLower.includes('report')) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
  if (sourceLower.includes('outreach') || sourceLower.includes('compose')) return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
  if (sourceLower.includes('pipeline')) return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
  if (sourceLower.includes('task')) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  // API paths
  if (sourceLower.includes('/lead')) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  if (sourceLower.includes('/project')) return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
  if (sourceLower.includes('/campaign')) return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
  if (sourceLower.includes('/email') || sourceLower.includes('/social')) return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
  if (sourceLower.includes('/stats') || sourceLower.includes('/activity')) return 'bg-teal-500/20 text-teal-400 border-teal-500/30';
  if (sourceLower.includes('/health')) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  if (sourceLower.includes('/user') || sourceLower.includes('/auth') || sourceLower.includes('/client') || sourceLower.includes('/session')) return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
  if (sourceLower.includes('/api')) return 'bg-sky-500/20 text-sky-400 border-sky-500/30';
  return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
};

export function ConsoleLogEntry({ log }: ConsoleLogEntryProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const hasDetails = log.details && (
    log.details.requestBody ||
    log.details.responseBody ||
    log.details.url ||
    log.details.data ||
    log.details.engine
  );

  const copyToClipboard = async () => {
    const text = JSON.stringify(log, null, 2);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getStatusColor = (status?: number) => {
    if (!status) return 'text-muted-foreground';
    const category = Math.floor(status / 100);
    return statusColors[category] || 'text-muted-foreground';
  };

  // Strip redundant prefixes like "[engine-name:console]" or "[engine-name]" from message
  const cleanMessage = (message: string) => {
    return message.replace(/^\[[\w-]+(?::[\w-]+)?\]\s*/i, '');
  };

  return (
    <div
      className={cn(
        'group border-b border-border/50 hover:bg-muted/30 transition-colors',
        log.level === 'error' && 'bg-red-500/5',
        log.level === 'warning' && 'bg-yellow-500/5'
      )}
    >
      {/* Main log line */}
      <div
        className="flex items-center gap-2 px-3 py-1.5 cursor-pointer font-mono text-xs"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Expand/collapse indicator */}
        <div className="w-4 flex-shrink-0">
          {isExpanded ? (
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          )}
        </div>

        {/* Timestamp */}
        <span className="text-muted-foreground flex-shrink-0 w-16">
          {formatTime(log.timestamp)}
        </span>

        {/* Type icon */}
        <span className="flex-shrink-0" title={log.type}>
          {typeIcons[log.type]}
        </span>

        {/* Level icon */}
        <span className="flex-shrink-0" title={log.level}>
          {levelIcons[log.level]}
        </span>

        {/* Source badge */}
        <span className={cn(
          "flex-shrink-0 px-1.5 py-0.5 rounded border text-[10px] uppercase tracking-wide max-w-[100px] truncate",
          getSourceBadgeColors(log.source)
        )}>
          {log.source}
        </span>

        {/* Message */}
        <span className={cn('flex-1', levelColors[log.level], !isExpanded && 'truncate')}>
          {cleanMessage(log.message)}
        </span>

        {/* Duration (for network logs) */}
        {log.details?.duration && (
          <span className="flex-shrink-0 text-muted-foreground">
            {log.details.duration}ms
          </span>
        )}

        {/* Status code (for network logs) */}
        {log.details?.status && (
          <span className={cn('flex-shrink-0 font-semibold', getStatusColor(log.details.status))}>
            {log.details.status}
          </span>
        )}

        {/* Copy button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            copyToClipboard();
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded"
          title="Copy log entry"
        >
          {copied ? (
            <Check className="h-3 w-3 text-green-400" />
          ) : (
            <Copy className="h-3 w-3 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Expanded details */}
      {isExpanded && hasDetails && (
        <div className="px-3 pb-2 pl-8 space-y-2">
          {/* URL */}
          {log.details?.url && (
            <div className="text-xs">
              <span className="text-muted-foreground">URL: </span>
              <span className="text-foreground font-mono break-all">{log.details.url}</span>
            </div>
          )}

          {/* Method */}
          {log.details?.method && (
            <div className="text-xs">
              <span className="text-muted-foreground">Method: </span>
              <span className="text-foreground font-mono">{log.details.method}</span>
            </div>
          )}

          {/* Request Body */}
          {log.details?.requestBody && (
            <div className="text-xs">
              <span className="text-muted-foreground">Request: </span>
              <pre className="mt-1 p-2 bg-muted rounded text-foreground overflow-x-auto max-h-32 overflow-y-auto">
                {typeof log.details.requestBody === 'string'
                  ? log.details.requestBody
                  : JSON.stringify(log.details.requestBody, null, 2)}
              </pre>
            </div>
          )}

          {/* Response Body */}
          {log.details?.responseBody && (
            <div className="text-xs">
              <span className="text-muted-foreground">Response: </span>
              <pre className="mt-1 p-2 bg-muted rounded text-foreground overflow-x-auto max-h-48 overflow-y-auto">
                {typeof log.details.responseBody === 'string'
                  ? log.details.responseBody
                  : JSON.stringify(log.details.responseBody, null, 2)}
              </pre>
            </div>
          )}

          {/* Server log details (engine, module, data) */}
          {log.details?.engine && (
            <div className="text-xs">
              <span className="text-muted-foreground">Engine: </span>
              <span className="text-foreground font-mono">{log.details.engine}</span>
              {log.details.module && (
                <>
                  <span className="text-muted-foreground ml-2">Module: </span>
                  <span className="text-foreground font-mono">{log.details.module}</span>
                </>
              )}
            </div>
          )}

          {/* Server log data */}
          {log.details?.data && (
            <div className="text-xs">
              <span className="text-muted-foreground">Data: </span>
              <pre className="mt-1 p-2 bg-muted rounded text-foreground overflow-x-auto max-h-48 overflow-y-auto">
                {typeof log.details.data === 'string'
                  ? log.details.data
                  : JSON.stringify(log.details.data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
