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
        <span className="flex-shrink-0 px-1.5 py-0.5 rounded bg-muted text-[10px] uppercase tracking-wide text-muted-foreground max-w-[100px] truncate">
          {log.source}
        </span>

        {/* Message */}
        <span className={cn('flex-1', levelColors[log.level], !isExpanded && 'truncate')}>
          {log.message}
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
