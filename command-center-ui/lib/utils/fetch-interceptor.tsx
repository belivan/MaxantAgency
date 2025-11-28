'use client';

/**
 * Fetch Interceptor
 * Wraps the global fetch to log all network requests to the console context
 */

import { useEffect, useRef } from 'react';
import { useConsole } from '@/lib/contexts/console-context';

export function FetchInterceptor({ children }: { children: React.ReactNode }) {
  const { addLog, settings } = useConsole();
  const originalFetchRef = useRef<typeof fetch | null>(null);

  useEffect(() => {
    // Store original fetch
    if (!originalFetchRef.current) {
      originalFetchRef.current = window.fetch;
    }

    const originalFetch = originalFetchRef.current;

    // Create intercepted fetch
    const interceptedFetch = async (
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> => {
      const startTime = performance.now();
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      const method = init?.method || 'GET';

      // Skip health checks if setting is off
      if (!settings.showHealthChecks && url.includes('/health')) {
        return originalFetch(input, init);
      }

      let requestBody: any = undefined;
      if (init?.body) {
        try {
          if (typeof init.body === 'string') {
            requestBody = JSON.parse(init.body);
          } else {
            requestBody = '[Binary/FormData]';
          }
        } catch {
          requestBody = init.body;
        }
      }

      try {
        const response = await originalFetch(input, init);
        const duration = Math.round(performance.now() - startTime);

        // Clone response to read body without consuming it
        const clonedResponse = response.clone();
        let responseBody: any = undefined;

        try {
          const contentType = response.headers.get('content-type');
          if (contentType?.includes('application/json')) {
            responseBody = await clonedResponse.json();
          } else if (contentType?.includes('text')) {
            const text = await clonedResponse.text();
            responseBody = text.length > 500 ? text.substring(0, 500) + '...' : text;
          } else {
            responseBody = `[${contentType || 'unknown content type'}]`;
          }
        } catch {
          responseBody = '[Could not parse response]';
        }

        // Determine log level based on status
        const isError = response.status >= 400;
        const isWarning = response.status >= 300 && response.status < 400;

        // Get clean path for source
        let sourcePath: string;
        try {
          const urlObj = new URL(url, window.location.origin);
          sourcePath = urlObj.pathname;
        } catch {
          sourcePath = url;
        }

        addLog({
          type: 'network',
          level: isError ? 'error' : isWarning ? 'warning' : 'success',
          source: sourcePath,
          message: `${method} ${sourcePath} - ${response.status} ${response.statusText} (${duration}ms)`,
          details: {
            url,
            method,
            status: response.status,
            duration,
            requestBody,
            responseBody,
            requestHeaders: init?.headers ? Object.fromEntries(
              init.headers instanceof Headers
                ? init.headers.entries()
                : Object.entries(init.headers as Record<string, string>)
            ) : undefined,
          },
        });

        return response;
      } catch (error) {
        const duration = Math.round(performance.now() - startTime);

        // Get clean path for source
        let sourcePath: string;
        try {
          const urlObj = new URL(url, window.location.origin);
          sourcePath = urlObj.pathname;
        } catch {
          sourcePath = url;
        }

        addLog({
          type: 'network',
          level: 'error',
          source: sourcePath,
          message: `${method} ${sourcePath} - FAILED (${duration}ms): ${error instanceof Error ? error.message : 'Unknown error'}`,
          details: {
            url,
            method,
            status: 0,
            duration,
            requestBody,
            responseBody: error instanceof Error ? error.message : 'Unknown error',
          },
        });

        throw error;
      }
    };

    // Replace global fetch
    window.fetch = interceptedFetch;

    // Cleanup: restore original fetch
    return () => {
      if (originalFetchRef.current) {
        window.fetch = originalFetchRef.current;
      }
    };
  }, [addLog, settings.showHealthChecks]);

  return <>{children}</>;
}
