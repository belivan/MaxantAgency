'use client';

/**
 * Pipeline Health Component
 * Displays health status of all 3 engines
 */

import { CheckCircle2, AlertCircle, XCircle, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type EngineStatus = 'online' | 'offline' | 'degraded';

export interface EngineHealth {
  name: string;
  status: EngineStatus;
  lastCheck?: string;
  responseTime?: number;
  message?: string;
}

interface PipelineHealthProps {
  engines: EngineHealth[];
  loading?: boolean;
}

function getStatusIcon(status: EngineStatus) {
  switch (status) {
    case 'online':
      return <CheckCircle2 className="w-5 h-5" />;
    case 'degraded':
      return <AlertCircle className="w-5 h-5" />;
    case 'offline':
      return <XCircle className="w-5 h-5" />;
  }
}

function getStatusColor(status: EngineStatus) {
  switch (status) {
    case 'online':
      return 'text-green-600 dark:text-green-500';
    case 'degraded':
      return 'text-yellow-600 dark:text-yellow-500';
    case 'offline':
      return 'text-red-600 dark:text-red-500';
  }
}

function getStatusBadgeVariant(status: EngineStatus): 'default' | 'secondary' | 'destructive' {
  switch (status) {
    case 'online':
      return 'default';
    case 'degraded':
      return 'secondary';
    case 'offline':
      return 'destructive';
  }
}

function EngineHealthItem({ engine }: { engine: EngineHealth }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center space-x-3">
        <div className={cn(getStatusColor(engine.status))}>
          {getStatusIcon(engine.status)}
        </div>

        <div className="space-y-1">
          <p className="text-sm font-medium">{engine.name}</p>
          {engine.message && (
            <p className="text-xs text-muted-foreground">{engine.message}</p>
          )}
          {engine.responseTime && (
            <p className="text-xs text-muted-foreground">
              Response time: {engine.responseTime}ms
            </p>
          )}
        </div>
      </div>

      <Badge variant={getStatusBadgeVariant(engine.status)} className="capitalize">
        {engine.status}
      </Badge>
    </div>
  );
}

function HealthSkeleton() {
  return (
    <div className="flex items-center justify-between py-3 animate-pulse">
      <div className="flex items-center space-x-3">
        <div className="w-5 h-5 bg-muted rounded-full" />
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded w-32" />
          <div className="h-3 bg-muted rounded w-24" />
        </div>
      </div>
      <div className="h-5 w-16 bg-muted rounded" />
    </div>
  );
}

function getOverallHealth(engines: EngineHealth[]): {
  status: 'healthy' | 'degraded' | 'critical';
  color: string;
  icon: React.ReactNode;
} {
  const offlineCount = engines.filter(e => e.status === 'offline').length;
  const degradedCount = engines.filter(e => e.status === 'degraded').length;

  if (offlineCount > 0) {
    return {
      status: 'critical',
      color: 'text-red-600 dark:text-red-500',
      icon: <XCircle className="w-6 h-6" />
    };
  }

  if (degradedCount > 0) {
    return {
      status: 'degraded',
      color: 'text-yellow-600 dark:text-yellow-500',
      icon: <AlertCircle className="w-6 h-6" />
    };
  }

  return {
    status: 'healthy',
    color: 'text-green-600 dark:text-green-500',
    icon: <CheckCircle2 className="w-6 h-6" />
  };
}

export function PipelineHealth({ engines, loading = false }: PipelineHealthProps) {
  const overall = getOverallHealth(engines);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>Pipeline Health</span>
          </CardTitle>

          <div className={cn('flex items-center space-x-2', overall.color)}>
            {overall.icon}
            <span className="text-sm font-medium capitalize">
              {overall.status}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <HealthSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {engines.map((engine, index) => (
              <EngineHealthItem key={index} engine={engine} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

