'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useConsole } from '@/lib/contexts/console-context';

interface BackendLog {
  id: string;
  timestamp: string;
  engine: string;
  module: string;
  level: 'debug' | 'info' | 'success' | 'warning' | 'error';
  message: string;
  data?: unknown;
}

// Backend engine endpoints
const BACKEND_ENGINES = [
  { name: 'analysis-engine', port: 3001 },
  { name: 'prospecting-engine', port: 3010 },
  { name: 'report-engine', port: 3003 },
  { name: 'outreach-engine', port: 3002 },
  { name: 'pipeline-orchestrator', port: 3020 },
];

/**
 * Hook to connect to backend SSE log streams
 * Automatically connects to all backend engines and forwards logs to the console
 */
export function useBackendLogs() {
  const { addLog, settings } = useConsole();
  const eventSourcesRef = useRef<Map<string, EventSource>>(new Map());
  const reconnectTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Get the base URL for API calls (handles both local dev and production)
  const getApiBaseUrl = useCallback(() => {
    // Check if we're in production (Vercel)
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      // Production: use api.mintydesign.xyz
      if (hostname === 'app.mintydesign.xyz' || hostname.includes('vercel.app')) {
        return 'https://api.mintydesign.xyz';
      }
    }
    // Local development: use localhost
    return 'http://localhost';
  }, []);

  // Map backend log level to console log level
  const mapLevel = (level: string): 'info' | 'success' | 'warning' | 'error' => {
    switch (level) {
      case 'debug':
      case 'info':
        return 'info';
      case 'success':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'info';
    }
  };

  // Connect to a single backend engine's log stream
  const connectToEngine = useCallback(
    (engine: { name: string; port: number }) => {
      const baseUrl = getApiBaseUrl();
      const url =
        baseUrl === 'http://localhost'
          ? `${baseUrl}:${engine.port}/api/logs/stream`
          : `${baseUrl}/${engine.name}/api/logs/stream`;

      // Close existing connection if any
      const existingSource = eventSourcesRef.current.get(engine.name);
      if (existingSource) {
        existingSource.close();
      }

      try {
        const eventSource = new EventSource(url);

        eventSource.onopen = () => {
          console.log(`[Console] Connected to ${engine.name} log stream`);
          // Clear any reconnect timeout
          const timeout = reconnectTimeoutsRef.current.get(engine.name);
          if (timeout) {
            clearTimeout(timeout);
            reconnectTimeoutsRef.current.delete(engine.name);
          }
        };

        eventSource.onmessage = (event) => {
          try {
            const log: BackendLog | { type: string; engine: string } = JSON.parse(event.data);

            // Skip connection messages
            if ('type' in log && log.type === 'connected') {
              return;
            }

            const backendLog = log as BackendLog;

            // Add to console
            addLog({
              type: 'server',
              level: mapLevel(backendLog.level),
              source: backendLog.engine,
              message: `[${backendLog.engine}${backendLog.module !== 'main' ? `:${backendLog.module}` : ''}] ${backendLog.message}`,
              details: backendLog.data
                ? {
                    engine: backendLog.engine,
                    module: backendLog.module,
                    data: backendLog.data,
                  }
                : {
                    engine: backendLog.engine,
                    module: backendLog.module,
                  },
            });
          } catch (err) {
            console.error('[Console] Error parsing backend log:', err);
          }
        };

        eventSource.onerror = () => {
          console.warn(`[Console] Lost connection to ${engine.name}, will retry...`);
          eventSource.close();
          eventSourcesRef.current.delete(engine.name);

          // Reconnect after delay
          const timeout = setTimeout(() => {
            connectToEngine(engine);
          }, 5000);
          reconnectTimeoutsRef.current.set(engine.name, timeout);
        };

        eventSourcesRef.current.set(engine.name, eventSource);
      } catch (err) {
        console.error(`[Console] Failed to connect to ${engine.name}:`, err);

        // Retry after delay
        const timeout = setTimeout(() => {
          connectToEngine(engine);
        }, 5000);
        reconnectTimeoutsRef.current.set(engine.name, timeout);
      }
    },
    [addLog, getApiBaseUrl]
  );

  // Connect to all backend engines
  const connectAll = useCallback(() => {
    BACKEND_ENGINES.forEach((engine) => {
      connectToEngine(engine);
    });
  }, [connectToEngine]);

  // Disconnect from all engines
  const disconnectAll = useCallback(() => {
    eventSourcesRef.current.forEach((source) => {
      source.close();
    });
    eventSourcesRef.current.clear();

    reconnectTimeoutsRef.current.forEach((timeout) => {
      clearTimeout(timeout);
    });
    reconnectTimeoutsRef.current.clear();
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    // Small delay to let the app initialize
    const initTimeout = setTimeout(() => {
      connectAll();
    }, 1000);

    return () => {
      clearTimeout(initTimeout);
      disconnectAll();
    };
  }, [connectAll, disconnectAll]);

  return {
    connectAll,
    disconnectAll,
    isConnected: eventSourcesRef.current.size > 0,
  };
}
