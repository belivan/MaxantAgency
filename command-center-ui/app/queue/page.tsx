'use client';

/**
 * Queue Monitor Page
 * Minimal, mobile-friendly monitoring of the work queue system
 */

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  RefreshCw,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { LoadingOverlay, PageLayout } from '@/components/shared';

const ANALYSIS_ENGINE_URL = process.env.NEXT_PUBLIC_ANALYSIS_API || 'http://localhost:3001';
const POLL_INTERVAL = 2000;

interface WorkTypeStatus {
  maxConcurrent: number;
  running: number;
  queued: number;
}

interface QueueStatus {
  success: boolean;
  enabled: boolean;
  redisConnected: boolean;
  types: {
    [key: string]: WorkTypeStatus;
  };
}

interface Job {
  job_id: string;
  state: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  priority: number;
  work_type: string;
  result?: {
    company_name?: string;
    url?: string;
    grade?: string;
    overall_score?: number;
    error?: string;
    duration_ms?: number;
  };
  error?: string;
}

export default function QueueMonitorPage() {
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showWorkTypes, setShowWorkTypes] = useState(false);

  const fetchQueueStatus = async () => {
    try {
      const response = await fetch(`${ANALYSIS_ENGINE_URL}/api/queue-status`);
      if (!response.ok) throw new Error('Failed to fetch queue status');
      const data = await response.json();
      setQueueStatus(data);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch queue status:', err);
      setError(err.message);
    }
  };

  const fetchAllJobs = async () => {
    try {
      if (!queueStatus) return;

      const mockJobs: Job[] = [];

      Object.entries(queueStatus.types).forEach(([workType, status]) => {
        for (let i = 0; i < status.running; i++) {
          mockJobs.push({
            job_id: `${workType}-running-${i}`,
            state: 'running',
            priority: 2,
            work_type: workType,
            result: {
              company_name: `Processing ${workType} ${i + 1}`,
              url: `https://example${i}.com`,
            },
          });
        }

        for (let i = 0; i < status.queued; i++) {
          mockJobs.push({
            job_id: `${workType}-queued-${i}`,
            state: 'queued',
            priority: i < 5 ? 1 : 2,
            work_type: workType,
            result: {
              company_name: `Queued ${workType} ${i + 1}`,
              url: `https://queued${i}.com`,
            },
          });
        }
      });

      setAllJobs(mockJobs);
    } catch (err: any) {
      console.error('Failed to fetch jobs:', err);
    }
  };

  const cancelSelectedJobs = async () => {
    const jobIds = Array.from(selectedJobs);
    if (jobIds.length === 0) return;

    try {
      const response = await fetch(`${ANALYSIS_ENGINE_URL}/api/cancel-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_ids: jobIds }),
      });

      if (!response.ok) throw new Error('Failed to cancel jobs');

      const result = await response.json();
      alert(
        `Cancelled ${result.cancelled} of ${result.total} jobs. ${result.total - result.cancelled} were already running.`
      );

      setSelectedJobs(new Set());
      fetchQueueStatus();
      fetchAllJobs();
    } catch (err: any) {
      alert(`Error cancelling jobs: ${err.message}`);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchQueueStatus();
      setLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (queueStatus) {
      fetchAllJobs();
    }
  }, [queueStatus]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchQueueStatus();
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const toggleJobSelection = (jobId: string) => {
    const newSelected = new Set(selectedJobs);
    if (newSelected.has(jobId)) {
      newSelected.delete(jobId);
    } else {
      newSelected.add(jobId);
    }
    setSelectedJobs(newSelected);
  };

  const selectAllQueued = () => {
    const queuedIds = allJobs.filter((j) => j.state === 'queued').map((j) => j.job_id);
    setSelectedJobs(new Set(queuedIds));
  };

  const totalRunning = Object.values(queueStatus?.types || {}).reduce((sum, t) => sum + t.running, 0);
  const totalQueued = Object.values(queueStatus?.types || {}).reduce((sum, t) => sum + t.queued, 0);
  const queuedJobsCount = allJobs.filter((j) => j.state === 'queued').length;

  return (
    <>
      <LoadingOverlay isLoading={loading} message="Loading queue status..." />
      <PageLayout
        title="Queue Monitor"
        description={`${totalRunning} running · ${totalQueued} queued${queueStatus?.enabled ? '' : ' · Offline'}`}
        headerRight={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="h-8 px-2"
              title={autoRefresh ? 'Auto-refresh on' : 'Auto-refresh off'}
            >
              <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin text-primary' : 'text-muted-foreground'}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                fetchQueueStatus();
                fetchAllJobs();
              }}
              className="h-8 px-2"
              title="Refresh now"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        }
      >

        {/* Error Alert */}
        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Work Types Accordion */}
        <div>
        <button
          onClick={() => setShowWorkTypes(!showWorkTypes)}
          className="w-full flex items-center justify-between px-3 py-2 text-sm bg-muted/50 hover:bg-muted rounded-md transition-colors"
        >
          <span className="text-muted-foreground">Work Types</span>
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              {Object.entries(queueStatus?.types || {}).map(([type, status]) => (
                <span
                  key={type}
                  className={`px-1.5 py-0.5 text-xs rounded ${
                    status.running > 0
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : status.queued > 0
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {type.charAt(0).toUpperCase()}
                </span>
              ))}
            </div>
            {showWorkTypes ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </button>

        {showWorkTypes && (
          <div className="mt-2 space-y-1.5">
            {Object.entries(queueStatus?.types || {}).map(([workType, status]) => (
              <div
                key={workType}
                className="flex items-center justify-between px-3 py-2 bg-card rounded-md border text-sm"
              >
                <span className="font-medium capitalize">{workType}</span>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-blue-600">{status.running}/{status.maxConcurrent}</span>
                  <span className="text-yellow-600">{status.queued} queued</span>
                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all"
                      style={{ width: `${(status.running / status.maxConcurrent) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>

        {/* Jobs Section */}
        <div>
          {/* Jobs Header */}
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-medium text-muted-foreground">Active Jobs</h2>
            <div className="flex items-center gap-2">
              {queuedJobsCount > 0 && (
                <Button variant="ghost" size="sm" onClick={selectAllQueued} className="h-7 text-xs px-2">
                  Select All ({queuedJobsCount})
                </Button>
              )}
              {selectedJobs.size > 0 && (
                <Button variant="destructive" size="sm" onClick={cancelSelectedJobs} className="h-7 text-xs px-2">
                  <X className="w-3 h-3 mr-1" />
                  Cancel ({selectedJobs.size})
                </Button>
              )}
            </div>
          </div>

          {/* Jobs List */}
          {allJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Clock className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm">Queue is empty</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {allJobs.map((job) => (
                <div
                  key={job.job_id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md border bg-card transition-colors ${
                    selectedJobs.has(job.job_id) ? 'border-primary bg-primary/5' : ''
                  }`}
                >
                  {/* Checkbox */}
                  {job.state === 'queued' && (
                    <input
                      type="checkbox"
                      checked={selectedJobs.has(job.job_id)}
                      onChange={() => toggleJobSelection(job.job_id)}
                      className="w-4 h-4 rounded border-muted-foreground/30"
                    />
                  )}

                  {/* Status Icon */}
                  <div className="flex-shrink-0">
                    {job.state === 'running' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
                    {job.state === 'queued' && <Clock className="w-4 h-4 text-yellow-500" />}
                    {job.state === 'completed' && <CheckCircle className="w-4 h-4 text-green-500" />}
                    {job.state === 'failed' && <XCircle className="w-4 h-4 text-red-500" />}
                    {job.state === 'cancelled' && <X className="w-4 h-4 text-muted-foreground" />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{job.result?.company_name || 'Unknown'}</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 capitalize">
                        {job.work_type}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{job.result?.url || '-'}</p>
                  </div>

                  {/* Priority */}
                  <div
                    className={`flex-shrink-0 text-xs font-medium px-1.5 py-0.5 rounded ${
                      job.priority === 1
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : job.priority === 2
                          ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    P{job.priority}
                  </div>

                  {/* Result */}
                  {job.state === 'completed' && job.result?.grade && (
                    <Badge variant="secondary" className="text-xs">
                      {job.result.grade}
                    </Badge>
                  )}
                  {job.state === 'failed' && (
                    <span className="text-xs text-red-500 truncate max-w-[80px]">
                      {job.error || 'Failed'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Minimal Footer Info */}
        <div className="py-6 mt-4">
          <p className="text-xs text-muted-foreground text-center">
            Redis: {queueStatus?.redisConnected ? 'Connected' : 'In-Memory'} • Auto-refresh: {autoRefresh ? 'On' : 'Off'}
          </p>
        </div>
      </PageLayout>
    </>
  );
}