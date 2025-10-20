/**
 * Prospecting Engine API Client (Agent 1)
 * Port: 3010
 */

import type {
  Prospect,
  ProspectFilters,
  ProspectGenerationOptions,
  ProspectGenerationResponse,
  APIResponse
} from '@/lib/types';

const API_BASE = process.env.NEXT_PUBLIC_PROSPECTING_API || 'http://localhost:3010';

/**
 * Generate prospects based on ICP brief
 * Returns SSE URL for real-time progress tracking
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
  if (filters?.verified !== undefined) {
    params.set('verified', filters.verified.toString());
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
