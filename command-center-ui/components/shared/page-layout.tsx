'use client';

/**
 * PageLayout Component
 * Consistent page structure with responsive settings across all pages
 */

import { cn } from '@/lib/utils';

interface PageLayoutProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
  /** Optional header right content (e.g., status indicators) */
  headerRight?: React.ReactNode;
}

const maxWidthClasses = {
  sm: 'max-w-2xl',
  md: 'max-w-3xl',
  lg: 'max-w-5xl',
  xl: 'max-w-7xl',
  full: ''
};

export function PageLayout({
  title,
  description,
  children,
  maxWidth = 'full',
  className,
  headerRight
}: PageLayoutProps) {
  return (
    <div className={cn(
      "container mx-auto px-4 py-4 sm:px-6 sm:py-6 space-y-6",
      maxWidthClasses[maxWidth],
      className
    )}>
      {/* Page Header */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{title}</h1>
          {headerRight}
        </div>
        {description && (
          <p className="text-sm sm:text-base text-muted-foreground">{description}</p>
        )}
      </div>

      {/* Page Content */}
      {children}
    </div>
  );
}
