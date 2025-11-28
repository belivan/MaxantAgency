'use client';

/**
 * Animated Section Wrapper
 * Provides smooth reveal/hide animations using CSS Grid
 */

import { cn } from '@/lib/utils';

interface AnimatedSectionProps {
  isVisible: boolean;
  children: React.ReactNode;
  className?: string;
  delay?: number; // delay in ms (applied via inline style)
}

export function AnimatedSection({
  isVisible,
  children,
  className,
  delay = 0
}: AnimatedSectionProps) {
  return (
    <div
      className={cn(
        'grid transition-all duration-300 ease-out',
        isVisible ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        className
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="overflow-hidden">
        {children}
      </div>
    </div>
  );
}

export default AnimatedSection;
