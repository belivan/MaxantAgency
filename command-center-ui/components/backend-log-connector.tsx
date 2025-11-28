'use client';

/**
 * Backend Log Connector
 *
 * Connects to backend SSE log streams and forwards logs to the console.
 * This is a render-less component that just sets up the connections.
 */

import { useBackendLogs } from '@/lib/hooks/use-backend-logs';

export function BackendLogConnector() {
  // This hook handles all the SSE connection logic
  useBackendLogs();

  // Render nothing - this is just for side effects
  return null;
}
