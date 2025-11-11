/**
 * Prospecting Engine API Client (Agent 1)
 * Port: 3010
 */

import type {
  Prospect,
  ProspectFilters,
  ProspectGenerationOptions,
  ProspectGenerationResponse,
  APIResponse,
  BusinessLookupOptions,
  BusinessLookupResult
} from '@/lib/types';

const API_BASE = process.env.NEXT_PUBLIC_PROSPECTING_API || 'http://localhost:3010';

/**
 * Generate prospects based on ICP brief (Queue-based)
 * Returns job_id for polling-based status tracking
 * @preferred Use this method for new implementations
 */
export async function generateProspectsQueue(
  brief: Record<string, any>,
  options: ProspectGenerationOptions
): Promise<{ job_id: string }> {
  const response = await fetch(`${API_BASE}/api/prospect-queue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      brief,
      ...options
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || error.message || 'Failed to queue prospect generation');
  }

  const data = await response.json();

  if (!data.success || !data.job_id) {
    throw new Error('Failed to queue prospecting job');
  }

  return { job_id: data.job_id };
}

/**
 * Check status of prospecting jobs
 * @param jobIds Array of job IDs to check
 */
export async function checkProspectingStatus(jobIds: string[]): Promise<{
  success: boolean;
  jobs: Array<{
    job_id: string;
    work_type: string;
    state: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
    priority: number;
    progress?: {
      current: number;
      total: number;
      message?: string;
    };
    result?: any;
    error?: string;
    created_at: string;
    started_at?: string;
    completed_at?: string;
  }>;
  summary: {
    total: number;
    queued: number;
    running: number;
    completed: number;
    failed: number;
    cancelled: number;
  };
}> {
  const queryString = jobIds.map(id => `job_ids=${id}`).join('&');
  const response = await fetch(`${API_BASE}/api/prospecting-status?${queryString}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || error.message || 'Failed to check prospecting status');
  }

  const data = await response.json();
  return data;
}

/**
 * Cancel queued prospecting jobs
 * @param jobIds Array of job IDs to cancel (only works for queued jobs)
 */
export async function cancelProspectingJobs(jobIds: string[]): Promise<{
  success: boolean;
  cancelled: number;
  not_found: number;
  already_started: number;
}> {
  const response = await fetch(`${API_BASE}/api/cancel-prospecting`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_ids: jobIds })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || error.message || 'Failed to cancel prospecting jobs');
  }

  const data = await response.json();
  return data;
}

/**
 * Generate prospects based on ICP brief (SSE-based - DEPRECATED)
 * Returns SSE URL for real-time progress tracking
 * @deprecated Use generateProspectsQueue() instead for better reliability
 */
export async function generateProspects(
  brief: Record<string, any>,
  options: ProspectGenerationOptions
): Promise<{ sseUrl: string; runId: string }> {
  const response = await fetch(`${API_BASE}/api/prospect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      brief,
      ...options
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to start prospect generation');
  }

  const data = await response.json();

  // Return SSE URL for progress tracking
  return {
    sseUrl: `${API_BASE}/api/prospect/stream?runId=${data.runId}`,
    runId: data.runId
  };
}

/**
 * Get prospects with filters
 */
export async function getProspects(filters?: ProspectFilters): Promise<{ prospects: Prospect[]; total: number }> {
  const params = new URLSearchParams();

  if (filters?.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
    statuses.forEach(s => params.append('status', s));
  }
  if (filters?.industry) {
    const industries = Array.isArray(filters.industry) ? filters.industry : [filters.industry];
    industries.forEach(i => params.append('industry', i));
  }
  if (filters?.city) {
    const cities = Array.isArray(filters.city) ? filters.city : [filters.city];
    cities.forEach(c => params.append('city', c));
  }
  if (filters?.min_rating !== undefined) {
    params.set('min_rating', filters.min_rating.toString());
  }
  if (filters?.has_email !== undefined) {
    params.set('has_email', filters.has_email.toString());
  }
  if (filters?.project_id) {
    params.set('project_id', filters.project_id);
  }
  if (filters?.limit) {
    params.set('limit', filters.limit.toString());
  }
  if (filters?.offset) {
    params.set('offset', filters.offset.toString());
  }

  const response = await fetch(`${API_BASE}/api/prospects?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch prospects');
  }

  const data = await response.json();

  // Return prospects and total count
  return {
    prospects: data.prospects || data.data || [],
    total: data.total || 0
  };
}

/**
 * Get a single prospect by ID
 */
export async function getProspect(id: string): Promise<Prospect> {
  const response = await fetch(`${API_BASE}/api/prospects/${id}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch prospect');
  }

  const data: APIResponse<Prospect> = await response.json();
  if (!data.data) {
    throw new Error('Prospect not found');
  }

  return data.data;
}

/**
 * Update prospect status
 */
export async function updateProspectStatus(
  id: string,
  status: Prospect['status']
): Promise<Prospect> {
  const response = await fetch(`${API_BASE}/api/prospects/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update prospect');
  }

  const data: APIResponse<Prospect> = await response.json();
  if (!data.data) {
    throw new Error('Failed to update prospect');
  }

  return data.data;
}

/**
 * Delete a prospect
 */
export async function deleteProspect(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/prospects/${id}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete prospect');
  }
}

/**
 * Delete multiple prospects in batch
 */
export async function deleteProspects(ids: string[]): Promise<{ deleted: number; failed: number }> {
  const response = await fetch(`${API_BASE}/api/prospects/batch-delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete prospects');
  }

  const data = await response.json();
  return {
    deleted: data.deleted || 0,
    failed: data.failed || 0
  };
}

/**
 * Get prospecting statistics
 */
export async function getProspectingStats(): Promise<{
  total_prospects: number;
  by_status: Record<string, number>;
  by_industry: Record<string, number>;
  total_cost: number;
  recent_runs: Array<{ run_id: string; count: number; cost: number; timestamp: string }>;
}> {
  const response = await fetch(`${API_BASE}/api/stats`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch stats');
  }

  const data = await response.json();
  return data;
}

/**
 * Look up a single business without requiring an ICP
 */
export async function lookupSingleBusiness(
  query: string,
  options: BusinessLookupOptions
): Promise<BusinessLookupResult> {
  const response = await fetch(`${API_BASE}/api/lookup-business`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, options })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to lookup business');
  }

  const data: BusinessLookupResult = await response.json();
  return data;
}
