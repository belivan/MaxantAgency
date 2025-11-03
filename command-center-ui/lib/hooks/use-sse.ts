/**
 * Server-Sent Events (SSE) Hook
 * Manages real-time event streaming from backend services
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type { SSEMessage } from '@/lib/types';

export type SSEStatus = 'idle' | 'connecting' | 'connected' | 'error' | 'closed';

export interface SSEError {
  message: string;
  code?: string;
  timestamp: string;
}

export interface UseSSEOptions<T = any> {
  url: string | null;
  onMessage?: (data: SSEMessage<T>) => void;
  onProgress?: (data: T) => void;
  onComplete?: (data: T) => void;
  onError?: (error: SSEError) => void;
  onStatusChange?: (status: SSEStatus) => void;
  reconnect?: boolean;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
}

export interface UseSSEReturn {
  status: SSEStatus;
  error: SSEError | null;
  close: () => void;
  reconnect: () => void;
}

/**
 * React hook for Server-Sent Events
 * Automatically manages connection lifecycle, reconnection, and cleanup
 */
export function useSSE<T = any>(options: UseSSEOptions<T>): UseSSEReturn {
  const {
    url,
    onMessage,
    onProgress,
    onComplete,
    onError,
    onStatusChange,
    reconnect = false,
    reconnectDelay = 3000,
    maxReconnectAttempts = 3
  } = options;

  const [status, setStatus] = useState<SSEStatus>('idle');
  const [error, setError] = useState<SSEError | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  // Update status and notify callback
  const updateStatus = useCallback((newStatus: SSEStatus) => {
    setStatus(newStatus);
    onStatusChange?.(newStatus);
  }, [onStatusChange]);

  // Handle error with custom error object
  const handleError = useCallback((errorMessage: string, code?: string) => {
    const errorObj: SSEError = {
      message: errorMessage,
      code,
      timestamp: new Date().toISOString()
    };
    setError(errorObj);
    onError?.(errorObj);
  }, [onError]);

  // Close the connection
  const close = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    updateStatus('closed');
  }, [updateStatus]);

  // Reconnect logic
  const attemptReconnect = useCallback(() => {
    if (!reconnect || !url) return;

    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      handleError(
        `Failed to connect after ${maxReconnectAttempts} attempts`,
        'MAX_RECONNECT_ATTEMPTS'
      );
      updateStatus('error');
      return;
    }

    reconnectAttemptsRef.current += 1;
    updateStatus('connecting');

    reconnectTimeoutRef.current = setTimeout(() => {
      if (url) {
        connect();
      }
    }, reconnectDelay);
  }, [reconnect, url, maxReconnectAttempts, reconnectDelay]);

  // Connect to SSE endpoint
  const connect = useCallback(() => {
    if (!url) {
      updateStatus('idle');
      return;
    }

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    updateStatus('connecting');
    setError(null);

    try {
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      // Connection opened
      eventSource.onopen = () => {
        updateStatus('connected');
        reconnectAttemptsRef.current = 0;
      };

      // Message received
      eventSource.onmessage = (event) => {
        try {
          const message: SSEMessage<T> = JSON.parse(event.data);

          // Call general message handler
          onMessage?.(message);

          // Call specific handlers based on message type
          switch (message.type) {
            case 'progress':
              onProgress?.(message.data);
              break;

            case 'complete':
              onComplete?.(message.data);
              // Auto-close on completion
              close();
              break;

            case 'error':
              handleError(
                (message.data as any)?.message || 'An error occurred',
                (message.data as any)?.code
              );
              updateStatus('error');
              break;

            case 'log':
            case 'status':
              // These are just informational, handled by onMessage
              break;
          }
        } catch (parseError) {
          console.error('Failed to parse SSE message:', parseError);
          handleError('Failed to parse server message', 'PARSE_ERROR');
        }
      };

      // Connection error
      eventSource.onerror = (event) => {
        console.error('SSE Error:', event);
        handleError('Connection error occurred', 'CONNECTION_ERROR');

        // Close current connection
        eventSource.close();
        eventSourceRef.current = null;

        // Attempt reconnect if enabled
        if (reconnect) {
          attemptReconnect();
        } else {
          updateStatus('error');
        }
      };

    } catch (err: any) {
      handleError(
        err.message || 'Failed to establish connection',
        'INIT_ERROR'
      );
      updateStatus('error');
    }
  }, [url, updateStatus, handleError, close, onMessage, onProgress, onComplete, reconnect, attemptReconnect]);

  // Manual reconnect function
  const manualReconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    setError(null);
    connect();
  }, [connect]);

  // Effect to manage connection lifecycle
  useEffect(() => {
    if (url) {
      connect();
    } else {
      close();
    }

    // Cleanup on unmount or URL change
    return () => {
      close();
    };
  }, [url]); // Only reconnect when URL changes

  return {
    status,
    error,
    close,
    reconnect: manualReconnect
  };
}

/**
 * Simpler SSE hook for basic use cases
 * Just provide URL and get messages back
 */
export function useSimpleSSE<T = any>(url: string | null) {
  const [messages, setMessages] = useState<SSEMessage<T>[]>([]);
  const [latestMessage, setLatestMessage] = useState<SSEMessage<T> | null>(null);

  const { status, error, close, reconnect } = useSSE<T>({
    url,
    onMessage: (message) => {
      setMessages(prev => [...prev, message]);
      setLatestMessage(message);
    }
  });

  const clearMessages = useCallback(() => {
    setMessages([]);
    setLatestMessage(null);
  }, []);

  return {
    status,
    error,
    messages,
    latestMessage,
    clearMessages,
    close,
    reconnect
  };
}
