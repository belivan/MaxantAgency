'use client';

/**
 * Client-side providers wrapper
 * Combines all context providers that need to be rendered on the client
 */

import { ReactNode, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@clerk/nextjs';
import { TaskProgressProvider } from '@/lib/contexts/task-progress-context';
import { ConsoleProvider } from '@/lib/contexts/console-context';
import { FetchInterceptor } from '@/lib/utils/fetch-interceptor';
import { BackendLogConnector } from './backend-log-connector';

// Dynamically import FloatingTaskIndicator with no SSR to avoid hydration issues
const FloatingTaskIndicator = dynamic(
  () => import('@/components/shared/floating-task-indicator').then(mod => mod.FloatingTaskIndicator),
  { ssr: false }
);

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [mounted, setMounted] = useState(false);
  const { isSignedIn } = useAuth();

  // Only render providers after mounting on client to prevent SSR issues
  useEffect(() => {
    setMounted(true);
  }, []);

  // During SSR, render children without providers
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <TaskProgressProvider>
      <ConsoleProvider>
        <FetchInterceptor>
          {/* Only show developer tools when signed in */}
          {isSignedIn && <BackendLogConnector />}
          {children}
          {isSignedIn && <FloatingTaskIndicator />}
        </FetchInterceptor>
      </ConsoleProvider>
    </TaskProgressProvider>
  );
}
