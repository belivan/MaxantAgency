'use client';

/**
 * Compact Engine Status
 * Minimal status dots for pipeline health
 */

import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type EngineStatus = 'online' | 'offline' | 'degraded';

export interface EngineHealth {
  name: string;
  status: EngineStatus;
  lastCheck?: string;
  responseTime?: number;
  message?: string;
}

interface EngineStatusDotsProps {
  engines: EngineHealth[];
  loading?: boolean;
  className?: string;
}

const STATUS_COLORS = {
  online: 'bg-green-500',
  degraded: 'bg-yellow-500',
  offline: 'bg-red-500',
};

export function EngineStatusDots({ engines, loading = false, className }: EngineStatusDotsProps) {
  if (loading) {
    return (
      <div className={cn("flex items-center gap-1.5", className)}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="w-2.5 h-2.5 rounded-full bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn("flex items-center gap-1.5", className)}>
        {engines.map((engine, index) => (
          <Tooltip key={index}>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "w-2.5 h-2.5 rounded-full cursor-default transition-colors",
                  STATUS_COLORS[engine.status]
                )}
              />
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              <p className="font-medium">{engine.name}</p>
              <p className="text-muted-foreground capitalize">{engine.status}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}

// Legacy export for backward compatibility
export function PipelineHealth({ engines, loading = false }: { engines: EngineHealth[]; loading?: boolean }) {
  return <EngineStatusDots engines={engines} loading={loading} />;
}

