/**
 * Analysis Engine API Client (Agent 2)
 * Port: 3000
 */

import type {
  Lead,
  LeadFilters,
  AnalysisOptions,
  AnalysisResponse,
  APIResponse,
  PaginatedResponse
} from '@/lib/types';

const API_BASE = process.env.NEXT_PUBLIC_ANALYSIS_API || 'http://localhost:3000';

/**
 * Analyze prospects by URLs
 * Returns SSE URL for real-time progress tracking
 */
export async function analyzeProspects(
  prospectIds: string[],
  options: AnalysisOptions
): Promise<{ sseUrl: string; batchId: string }> {
  const response = await fetch(`${API_BASE}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prospect_ids: prospectIds,
      tier: options.tier,
      modules: options.modules,
      capture_screenshots: options.capture_screenshots ?? true
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to start analysis');
  }

  const data = await response.json();

  return {
    sseUrl: `${API_BASE}/api/analyze/stream?batchId=${data.batchId}`,
    batchId: data.batchId
  };
}

/**
 * Get leads with filters
 */
export async function getLeads(filters?: LeadFilters): Promise<Lead[]> {
  const params = new URLSearchParams();

  if (filters?.grade) {
    const grades = Array.isArray(filters.grade) ? filters.grade : [filters.grade];
    grades.forEach(g => params.append('grade', g));
  }
  if (filters?.min_score !== undefined) {
    params.set('min_score', filters.min_score.toString());
  }
  if (filters?.max_score !== undefined) {
    params.set('max_score', filters.max_score.toString());
  }
  if (filters?.has_email !== undefined) {
    params.set('has_email', filters.has_email.toString());
  }
  if (filters?.has_phone !== undefined) {
    params.set('has_phone', filters.has_phone.toString());
  }
  if (filters?.industry) {
    const industries = Array.isArray(filters.industry) ? filters.industry : [filters.industry];
    industries.forEach(i => params.append('industry', i));
  }
  if (filters?.location) {
    params.set('location', filters.location);
  }
  if (filters?.project_id) {
    params.set('project_id', filters.project_id);
  }
  if (filters?.analysis_tier) {
    const tiers = Array.isArray(filters.analysis_tier) ? filters.analysis_tier : [filters.analysis_tier];
    tiers.forEach(t => params.append('analysis_tier', t));
  }
  if (filters?.sort_by) {
    params.set('sort_by', filters.sort_by);
  }
  if (filters?.sort_order) {
    params.set('sort_order', filters.sort_order);
  }
  if (filters?.limit) {
    params.set('limit', filters.limit.toString());
  }
  if (filters?.offset) {
    params.set('offset', filters.offset.toString());
  }

  const response = await fetch(`${API_BASE}/api/leads?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch leads');
  }

  const data: APIResponse<Lead[]> = await response.json();
  return data.data || [];
}

/**
 * Get a single lead by ID
 */
export async function getLead(id: string): Promise<Lead> {
  const response = await fetch(`${API_BASE}/api/leads/${id}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch lead');
  }

  const data: APIResponse<Lead> = await response.json();
  if (!data.data) {
    throw new Error('Lead not found');
  }

  return data.data;
}

/**
 * Get leads ready for email composition (Grade A/B with email)
 */
export async function getLeadsReadyForEmail(projectId?: string): Promise<Lead[]> {
  return getLeads({
    grade: ['A', 'B'],
    has_email: true,
    project_id: projectId,
    sort_by: 'score',
    sort_order: 'desc',
    limit: 100
  });
}

/**
 * Export lead analysis to PDF
 */
export async function exportLeadToPDF(id: string): Promise<Blob> {
  const response = await fetch(`${API_BASE}/api/leads/${id}/export-pdf`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to export lead');
  }

  return response.blob();
}

/**
 * Get analysis statistics
 */
export async function getAnalysisStats(): Promise<{
  total_analyzed: number;
  by_grade: Record<string, number>;
  by_tier: Record<string, number>;
  avg_score: number;
  total_cost: number;
  avg_analysis_time_ms: number;
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
 * Re-analyze a lead with different options
 */
export async function reanalyzeLead(
  leadId: string,
  options: AnalysisOptions
): Promise<{ sseUrl: string }> {
  const response = await fetch(`${API_BASE}/api/leads/${leadId}/reanalyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to start re-analysis');
  }

  const data = await response.json();

  return {
    sseUrl: `${API_BASE}/api/analyze/stream?batchId=${data.batchId}`
  };
}
