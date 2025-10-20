/**
 * Loading Spinner Components
 * Various loading indicators for different use cases
 */

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12'
};

/**
 * Basic spinning loader
 */
export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  return (
    <Loader2
      className={cn('animate-spin text-muted-foreground', sizeClasses[size], className)}
    />
  );
}

/**
 * Inline loading with text
 */
export function LoadingInline({
  text = 'Loading...',
  size = 'sm'
}: {
  text?: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div className="flex items-center space-x-2">
      <LoadingSpinner size={size} />
      <span className={cn(
        'text-muted-foreground',
        size === 'sm' ? 'text-sm' : 'text-base'
      )}>
        {text}
      </span>
    </div>
  );
}

/**
 * Card skeleton loader
 */
export function CardSkeleton() {
  return (
    <div className="border border-border rounded-lg p-6 space-y-4 animate-pulse">
      <div className="h-4 bg-muted rounded w-3/4"></div>
      <div className="h-4 bg-muted rounded w-1/2"></div>
      <div className="h-4 bg-muted rounded w-5/6"></div>
    </div>
  );
}

/**
 * Table skeleton loader
 */
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      {/* Header */}
      <div className="flex space-x-4 pb-2 border-b border-border">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={`header-${i}`} className="h-4 bg-muted rounded flex-1"></div>
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex space-x-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div key={`cell-${rowIndex}-${colIndex}`} className="h-4 bg-muted rounded flex-1"></div>
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Loading state for entire page/section
 */
export function LoadingSection({
  title,
  description
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <LoadingSpinner size="lg" />
      {title && (
        <h3 className="text-lg font-semibold">{title}</h3>
      )}
      {description && (
        <p className="text-sm text-muted-foreground max-w-md text-center">
          {description}
        </p>
      )}
    </div>
  );
}

/**
 * Dots loading animation
 */
export function LoadingDots({ className }: { className?: string }) {
  return (
    <div className={cn('flex space-x-1', className)}>
      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
    </div>
  );
}

/**
 * Progress bar loading
 */
export function LoadingProgress({
  progress,
  total,
  label
}: {
  progress: number;
  total: number;
  label?: string;
}) {
  const percentage = total > 0 ? (progress / total) * 100 : 0;

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-medium">
            {progress} / {total}
          </span>
        </div>
      )}
      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
        <div
          className="bg-primary h-full transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground text-right">
        {percentage.toFixed(0)}%
      </p>
    </div>
  );
}

export default LoadingSpinner;
