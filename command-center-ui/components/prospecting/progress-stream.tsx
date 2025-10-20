'use client';

/**
 * Progress Stream Component
 * Displays real-time SSE progress for prospect generation
 */

import { Activity, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingProgress } from '@/components/shared/loading-spinner';
import { formatRelativeTime } from '@/lib/utils/format';
import { cn } from '@/lib/utils';
import type { SSEStatus } from '@/lib/hooks';

interface ProgressLog {
  timestamp: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}

interface ProgressStreamProps {
  status: SSEStatus;
  progress?: {
    current: number;
    total: number;
    label?: string;
  };
  logs: ProgressLog[];
  error?: string | null;
}

function getStatusBadge(status: SSEStatus) {
  switch (status) {
    case 'connecting':
      return (
        <Badge variant="secondary" className="flex items-center space-x-1">
          <Activity className="w-3 h-3 animate-pulse" />
          <span>Connecting...</span>
        </Badge>
      );
    case 'connected':
      return (
        <Badge variant="default" className="flex items-center space-x-1">
          <Activity className="w-3 h-3" />
          <span>In Progress</span>
        </Badge>
      );
    case 'closed':
      return (
        <Badge variant="outline" className="flex items-center space-x-1">
          <CheckCircle2 className="w-3 h-3" />
          <span>Completed</span>
        </Badge>
      );
    case 'error':
      return (
        <Badge variant="destructive" className="flex items-center space-x-1">
          <AlertCircle className="w-3 h-3" />
          <span>Error</span>
        </Badge>
      );
    default:
      return null;
  }
}

function LogItem({ log }: { log: ProgressLog }) {
  const typeColors = {
    info: 'text-blue-600 dark:text-blue-400',
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    error: 'text-red-600 dark:text-red-400'
  };

  const typeIcons = {
    info: <Activity className="w-4 h-4" />,
    success: <CheckCircle2 className="w-4 h-4" />,
    warning: <AlertCircle className="w-4 h-4" />,
    error: <AlertCircle className="w-4 h-4" />
  };

  const type = log.type || 'info';

  return (
    <div className="flex items-start space-x-2 py-2">
      <div className={cn('mt-0.5', typeColors[type])}>
        {typeIcons[type]}
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-sm">{log.message}</p>
        <p className="text-xs text-muted-foreground">
          {formatRelativeTime(log.timestamp)}
        </p>
      </div>
    </div>
  );
}

export function ProgressStream({ status, progress, logs, error }: ProgressStreamProps) {
  const hasActivity = status !== 'idle' || logs.length > 0;

  if (!hasActivity) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>Progress</span>
          </CardTitle>
          {getStatusBadge(status)}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        {progress && (
          <LoadingProgress
            progress={progress.current}
            total={progress.total}
            label={progress.label}
          />
        )}

        {/* Error Message */}
        {error && (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-3">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">Error</p>
                <p className="text-xs text-destructive/80 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Logs */}
        {logs.length > 0 && (
          <div className="space-y-1">
            <p className="text-sm font-medium mb-2">Activity Log</p>
            <div className="max-h-[300px] overflow-y-auto space-y-1 divide-y divide-border">
              {logs.map((log, index) => (
                <LogItem key={index} log={log} />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {logs.length === 0 && !progress && !error && (
          <div className="text-center py-8">
            <Activity className="w-8 h-8 text-muted-foreground mx-auto mb-2 animate-pulse" />
            <p className="text-sm text-muted-foreground">
              Waiting for progress updates...
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ProgressStream;
