'use client';

/**
 * Queue Monitor Page
 * Real-time monitoring and control of the work queue system
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, CheckCircle, Clock, XCircle, Loader2, RefreshCw, X, Activity } from 'lucide-react';
import { LoadingOverlay } from '@/components/shared';

const ANALYSIS_ENGINE_URL = process.env.NEXT_PUBLIC_ANALYSIS_API || 'http://localhost:3001';
const POLL_INTERVAL = 2000; // Poll every 2 seconds

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

interface JobStatusResponse {
  success: boolean;
  jobs: Job[];
  summary: {
    total: number;
    queued: number;
    running: number;
    completed: number;
    failed: number;
    cancelled: number;
  };
}

export default function QueueMonitorPage() {
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch queue-wide status
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

  // Fetch all active jobs (running + queued)
  const fetchAllJobs = async () => {
    try {
      // Get all job IDs from the queue status
      if (!queueStatus) return;

      // For now, we'll just track jobs from the queue status
      // In a full implementation, you'd want a dedicated endpoint that returns all active jobs
      // For this demo, we'll simulate by creating mock jobs based on queue counts
      const mockJobs: Job[] = [];

      Object.entries(queueStatus.types).forEach(([workType, status]) => {
        // Create mock running jobs
        for (let i = 0; i < status.running; i++) {
          mockJobs.push({
            job_id: `${workType}-running-${i}`,
            state: 'running',
            priority: 2,
            work_type: workType,
            result: {
              company_name: `Processing ${workType} ${i + 1}`,
              url: `https://example${i}.com`
            }
          });
        }

        // Create mock queued jobs
        for (let i = 0; i < status.queued; i++) {
          mockJobs.push({
            job_id: `${workType}-queued-${i}`,
            state: 'queued',
            priority: i < 5 ? 1 : 2,
            work_type: workType,
            result: {
              company_name: `Queued ${workType} ${i + 1}`,
              url: `https://queued${i}.com`
            }
          });
        }
      });

      setAllJobs(mockJobs);
    } catch (err: any) {
      console.error('Failed to fetch jobs:', err);
    }
  };

  // Cancel selected jobs
  const cancelSelectedJobs = async () => {
    const jobIds = Array.from(selectedJobs);
    if (jobIds.length === 0) return;

    try {
      const response = await fetch(`${ANALYSIS_ENGINE_URL}/api/cancel-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_ids: jobIds })
      });

      if (!response.ok) throw new Error('Failed to cancel jobs');

      const result = await response.json();
      alert(`Cancelled ${result.cancelled} of ${result.total} jobs. ${result.total - result.cancelled} were already running.`);

      setSelectedJobs(new Set());
      fetchQueueStatus();
      fetchAllJobs();
    } catch (err: any) {
      alert(`Error cancelling jobs: ${err.message}`);
    }
  };

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchQueueStatus();
      setLoading(false);
    };

    loadData();
  }, []);

  // Fetch jobs whenever queue status updates
  useEffect(() => {
    if (queueStatus) {
      fetchAllJobs();
    }
  }, [queueStatus]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchQueueStatus();
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Toggle job selection
  const toggleJobSelection = (jobId: string) => {
    const newSelected = new Set(selectedJobs);
    if (newSelected.has(jobId)) {
      newSelected.delete(jobId);
    } else {
      newSelected.add(jobId);
    }
    setSelectedJobs(newSelected);
  };

  // Select all queued jobs
  const selectAllQueued = () => {
    const queuedIds = allJobs.filter(j => j.state === 'queued').map(j => j.job_id);
    setSelectedJobs(new Set(queuedIds));
  };

  if (loading) {
    return <LoadingOverlay isLoading={true} message="Loading queue status..." />;
  }

  const totalRunning = Object.values(queueStatus?.types || {}).reduce((sum, t) => sum + t.running, 0);
  const totalQueued = Object.values(queueStatus?.types || {}).reduce((sum, t) => sum + t.queued, 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="w-8 h-8 text-primary" />
            Queue Monitor
          </h1>
          <p className="text-muted-foreground">
            Real-time monitoring and control of the work queue system
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Auto-Refresh On' : 'Auto-Refresh Off'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchQueueStatus();
              fetchAllJobs();
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Now
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </div>
      )}

      {/* System Status Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {queueStatus?.enabled ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-2xl font-bold text-green-600">Online</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-red-600" />
                  <span className="text-2xl font-bold text-red-600">Offline</span>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Redis: {queueStatus?.redisConnected ? 'Connected' : 'In-Memory Mode'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Running Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              <span className="text-2xl font-bold">{totalRunning}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Active processing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Queued Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              <span className="text-2xl font-bold">{totalQueued}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Waiting to process
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              <span className="text-2xl font-bold">{totalRunning + totalQueued}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Running + Queued
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Queue Status by Type */}
      <Card>
        <CardHeader>
          <CardTitle>Queue Status by Work Type</CardTitle>
          <CardDescription>
            Concurrency limits and current workload for each engine
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Object.entries(queueStatus?.types || {}).map(([workType, status]) => (
              <div key={workType} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold capitalize">{workType}</h3>
                  <Badge variant="outline">
                    Limit: {status.maxConcurrent}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Running</span>
                    <span className="font-medium text-blue-600">{status.running}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Queued</span>
                    <span className="font-medium text-yellow-600">{status.queued}</span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-muted rounded-full h-2 mt-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${(status.running / status.maxConcurrent) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-right">
                    {Math.round((status.running / status.maxConcurrent) * 100)}% utilized
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Active Jobs Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Active Jobs</CardTitle>
              <CardDescription>
                All running and queued jobs across all work types
              </CardDescription>
            </div>

            {selectedJobs.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedJobs.size} selected
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={cancelSelectedJobs}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel Selected
                </Button>
              </div>
            )}
          </div>

          {allJobs.filter(j => j.state === 'queued').length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={selectAllQueued}
              className="mt-2"
            >
              Select All Queued ({allJobs.filter(j => j.state === 'queued').length})
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {allJobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No active jobs</p>
              <p className="text-sm">Queue is currently empty</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Select</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Work Type</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allJobs.map((job) => (
                  <TableRow key={job.job_id}>
                    <TableCell>
                      {job.state === 'queued' && (
                        <input
                          type="checkbox"
                          checked={selectedJobs.has(job.job_id)}
                          onChange={() => toggleJobSelection(job.job_id)}
                          className="w-4 h-4"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <JobStateBadge state={job.state} />
                    </TableCell>
                    <TableCell className="capitalize">{job.work_type}</TableCell>
                    <TableCell>
                      <PriorityBadge priority={job.priority} />
                    </TableCell>
                    <TableCell className="font-medium">
                      {job.result?.company_name || 'Unknown'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                      {job.result?.url || '-'}
                    </TableCell>
                    <TableCell>
                      {job.state === 'completed' && job.result?.grade && (
                        <Badge variant="outline" className="bg-green-50">
                          Grade: {job.result.grade} ({job.result.overall_score})
                        </Badge>
                      )}
                      {job.state === 'failed' && (
                        <span className="text-xs text-red-600">
                          {job.error || job.result?.error || 'Failed'}
                        </span>
                      )}
                      {job.state === 'running' && (
                        <span className="text-xs text-muted-foreground">Processing...</span>
                      )}
                      {job.state === 'queued' && (
                        <span className="text-xs text-muted-foreground">Waiting...</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Info Section */}
      <Card className="border-muted">
        <CardHeader>
          <CardTitle className="text-sm">About the Work Queue</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            The work queue manages all asynchronous operations across the analysis engine.
            Jobs are prioritized based on batch size (smaller batches = higher priority).
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Running jobs cannot be cancelled (already in progress)</li>
            <li>Queued jobs can be cancelled at any time</li>
            <li>Each work type has independent concurrency limits</li>
            <li>Redis provides distributed coordination (falls back to in-memory)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper component for job state badge
function JobStateBadge({ state }: { state: Job['state'] }) {
  const variants = {
    queued: { icon: Clock, color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
    running: { icon: Loader2, color: 'bg-blue-100 text-blue-800 border-blue-300' },
    completed: { icon: CheckCircle, color: 'bg-green-100 text-green-800 border-green-300' },
    failed: { icon: XCircle, color: 'bg-red-100 text-red-800 border-red-300' },
    cancelled: { icon: X, color: 'bg-gray-100 text-gray-800 border-gray-300' }
  };

  const { icon: Icon, color } = variants[state];

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium ${color}`}>
      <Icon className={`w-3 h-3 ${state === 'running' ? 'animate-spin' : ''}`} />
      <span className="capitalize">{state}</span>
    </div>
  );
}

// Helper component for priority badge
function PriorityBadge({ priority }: { priority: number }) {
  const colors = {
    1: 'bg-red-100 text-red-800 border-red-300',
    2: 'bg-orange-100 text-orange-800 border-orange-300',
    3: 'bg-yellow-100 text-yellow-800 border-yellow-300'
  };

  const color = colors[priority as keyof typeof colors] || colors[3];

  return (
    <div className={`inline-flex items-center px-2 py-1 rounded-md border text-xs font-medium ${color}`}>
      P{priority}
    </div>
  );
}
