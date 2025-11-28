/**
 * Queue Polling Hook
 * Manages polling for queue-based job status from backend services
 * Replaces SSE for long-running operations with polling-based status checks
 */

import { useEffect, useRef, useState, useCallback } from 'react';

export type JobState = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface QueueJob<T = any> {
  job_id: string;
  work_type: string;
  state: JobState;
  priority: number;
  progress?: {
    current: number;
    total: number;
    message?: string;
  };
  result?: T;
  error?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface QueueStatusResponse<T = any> {
  success: boolean;
  jobs: QueueJob<T>[];
  summary: {
    total: number;
    queued: number;
    running: number;
    completed: number;
    failed: number;
    cancelled: number;
  };
}

export interface UseQueuePollingOptions<T = any> {
  /** Status endpoint URL (e.g., '/api/analysis-status') */
  statusUrl: string;

  /** Job IDs to poll for */
  jobIds: string[];

  /** Polling interval in milliseconds (default: 5000) */
  pollInterval?: number;

  /** Auto-start polling (default: true) */
  autoStart?: boolean;

  /** Callback when any job updates */
  onJobUpdate?: (job: QueueJob<T>) => void;

  /** Callback when a job completes successfully */
  onJobComplete?: (job: QueueJob<T>) => void;

  /** Callback when a job fails */
  onJobFailed?: (job: QueueJob<T>) => void;

  /** Callback when all jobs are done (completed, failed, or cancelled) */
  onAllJobsDone?: (jobs: QueueJob<T>[]) => void;

  /** Callback on error during polling */
  onError?: (error: Error) => void;
}

export interface UseQueuePollingReturn<T = any> {
  /** Map of job_id to job status */
  jobs: Map<string, QueueJob<T>>;

  /** Summary of all jobs */
  summary: {
    total: number;
    queued: number;
    running: number;
    completed: number;
    failed: number;
    cancelled: number;
  };

  /** Whether polling is active */
  isPolling: boolean;

  /** Whether all jobs are done */
  allJobsDone: boolean;

  /** Last error encountered */
  error: Error | null;

  /** Start polling */
  startPolling: () => void;

  /** Stop polling */
  stopPolling: () => void;

  /** Manually trigger a status check */
  checkStatus: () => Promise<void>;

  /** Get a specific job by ID */
  getJob: (jobId: string) => QueueJob<T> | undefined;
}

/**
 * React hook for polling queue-based job status
 * Automatically manages polling lifecycle and cleanup
 */
export function useQueuePolling<T = any>(
  options: UseQueuePollingOptions<T>
): UseQueuePollingReturn<T> {
  const {
    statusUrl,
    jobIds,
    pollInterval = 5000,
    autoStart = true,
    onJobUpdate,
    onJobComplete,
    onJobFailed,
    onAllJobsDone,
    onError,
  } = options;

  const [jobs, setJobs] = useState<Map<string, QueueJob<T>>>(new Map());
  const [summary, setSummary] = useState({
    total: 0,
    queued: 0,
    running: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
  });
  const [isPolling, setIsPolling] = useState(false);
  const [allJobsDone, setAllJobsDone] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousJobsRef = useRef<Map<string, QueueJob<T>>>(new Map());
  const allJobsDoneNotifiedRef = useRef(false);

  /**
   * Check if all jobs are in a terminal state
   */
  const checkAllJobsDone = useCallback((jobsMap: Map<string, QueueJob<T>>) => {
    if (jobsMap.size === 0) return false;

    const allDone = Array.from(jobsMap.values()).every(
      job => job.state === 'completed' || job.state === 'failed' || job.state === 'cancelled'
    );

    return allDone;
  }, []);

  /**
   * Fetch status from the backend
   */
  const checkStatus = useCallback(async () => {
    if (jobIds.length === 0) return;

    try {
      const queryString = jobIds.map(id => `job_ids=${id}`).join('&');
      const response = await fetch(`${statusUrl}?${queryString}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: QueueStatusResponse<T> = await response.json();

      if (!data.success) {
        throw new Error('Status check returned success: false');
      }

      // Update jobs map
      const newJobsMap = new Map<string, QueueJob<T>>();
      data.jobs.forEach(job => {
        newJobsMap.set(job.job_id, job);
      });

      setJobs(newJobsMap);
      setSummary(data.summary);
      setError(null);

      // Detect changes and trigger callbacks
      data.jobs.forEach(job => {
        const previousJob = previousJobsRef.current.get(job.job_id);

        // Job updated
        if (previousJob && JSON.stringify(previousJob) !== JSON.stringify(job)) {
          onJobUpdate?.(job);
        }

        // Job newly completed
        if (job.state === 'completed' && previousJob?.state !== 'completed') {
          onJobComplete?.(job);
        }

        // Job newly failed
        if (job.state === 'failed' && previousJob?.state !== 'failed') {
          onJobFailed?.(job);
        }
      });

      // Check if all jobs are done
      const isDone = checkAllJobsDone(newJobsMap);
      setAllJobsDone(isDone);

      if (isDone && !allJobsDoneNotifiedRef.current) {
        onAllJobsDone?.(data.jobs);
        allJobsDoneNotifiedRef.current = true;
        stopPolling();
      }

      // Update previous jobs reference
      previousJobsRef.current = newJobsMap;

    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
      console.error('Queue polling error:', error);
    }
  }, [statusUrl, jobIds, onJobUpdate, onJobComplete, onJobFailed, onAllJobsDone, onError, checkAllJobsDone]);

  /**
   * Start polling
   */
  const startPolling = useCallback(() => {
    if (isPolling || jobIds.length === 0) return;

    setIsPolling(true);
    allJobsDoneNotifiedRef.current = false;

    // Immediate first check
    checkStatus();

    // Set up interval
    pollIntervalRef.current = setInterval(() => {
      checkStatus();
    }, pollInterval);
  }, [isPolling, jobIds, checkStatus, pollInterval]);

  /**
   * Stop polling
   */
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  /**
   * Get a specific job by ID
   */
  const getJob = useCallback((jobId: string): QueueJob<T> | undefined => {
    return jobs.get(jobId);
  }, [jobs]);

  /**
   * Auto-start polling if enabled
   */
  useEffect(() => {
    if (autoStart && jobIds.length > 0) {
      startPolling();
    }

    return () => {
      stopPolling();
    };
  }, [autoStart, jobIds.length]); // Only restart when jobIds change

  /**
   * Stop polling when all jobs are done
   */
  useEffect(() => {
    if (allJobsDone) {
      stopPolling();
    }
  }, [allJobsDone, stopPolling]);

  return {
    jobs,
    summary,
    isPolling,
    allJobsDone,
    error,
    startPolling,
    stopPolling,
    checkStatus,
    getJob,
  };
}

/**
 * Simpler hook for polling a single job
 */
export function useSingleJobPolling<T = any>(
  statusUrl: string,
  jobId: string | null,
  options?: Omit<UseQueuePollingOptions<T>, 'statusUrl' | 'jobIds'>
) {
  const jobIds = jobId ? [jobId] : [];

  const polling = useQueuePolling<T>({
    statusUrl,
    jobIds,
    ...options,
  });

  const job = jobId ? polling.getJob(jobId) : undefined;

  return {
    ...polling,
    job,
  };
}
