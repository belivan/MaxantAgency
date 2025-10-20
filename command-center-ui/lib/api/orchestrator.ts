/**
 * Pipeline Orchestrator API Client (Agent 6)
 * Port: 3020
 */

import type {
  Campaign,
  CampaignConfig,
  CampaignRun,
  CampaignStats
} from '@/lib/types';

const API_BASE = process.env.NEXT_PUBLIC_ORCHESTRATOR_API || 'http://localhost:3020';

/**
 * Create a new campaign
 */
export async function createCampaign(config: CampaignConfig): Promise<Campaign> {
  const response = await fetch(`${API_BASE}/api/campaigns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create campaign');
  }

  const data = await response.json();
  return data.campaign;
}

/**
 * Get all campaigns
 */
export async function getCampaigns(filters?: {
  status?: string;
  project_id?: string;
}): Promise<Campaign[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.project_id) params.set('project_id', filters.project_id);

  const response = await fetch(`${API_BASE}/api/campaigns?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch campaigns');
  }

  const data = await response.json();
  return data.campaigns || [];
}

/**
 * Get a single campaign by ID
 */
export async function getCampaign(id: string): Promise<Campaign> {
  const response = await fetch(`${API_BASE}/api/campaigns/${id}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch campaign');
  }

  const data = await response.json();
  return data.campaign;
}

/**
 * Manually trigger a campaign run
 */
export async function runCampaign(id: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE}/api/campaigns/${id}/run`, {
    method: 'POST'
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to run campaign');
  }

  return await response.json();
}

/**
 * Get campaign run history
 */
export async function getCampaignRuns(campaignId: string, limit = 50): Promise<CampaignRun[]> {
  const response = await fetch(`${API_BASE}/api/campaigns/${campaignId}/runs?limit=${limit}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch campaign runs');
  }

  const data = await response.json();
  return data.runs || [];
}

/**
 * Pause a campaign
 */
export async function pauseCampaign(id: string): Promise<{ success: boolean; status: string }> {
  const response = await fetch(`${API_BASE}/api/campaigns/${id}/pause`, {
    method: 'PUT'
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to pause campaign');
  }

  return await response.json();
}

/**
 * Resume a paused campaign
 */
export async function resumeCampaign(id: string): Promise<{ success: boolean; status: string }> {
  const response = await fetch(`${API_BASE}/api/campaigns/${id}/resume`, {
    method: 'PUT'
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to resume campaign');
  }

  return await response.json();
}

/**
 * Delete a campaign
 */
export async function deleteCampaign(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/campaigns/${id}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete campaign');
  }
}

/**
 * Get orchestrator statistics
 */
export async function getOrchestratorStats(): Promise<CampaignStats> {
  const response = await fetch(`${API_BASE}/api/stats`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch stats');
  }

  const data = await response.json();
  return data.stats;
}

/**
 * Check orchestrator health
 */
export async function checkOrchestratorHealth(): Promise<{
  status: string;
  service: string;
  version: string;
  activeCampaigns: number;
}> {
  const response = await fetch(`${API_BASE}/api/health`);

  if (!response.ok) {
    throw new Error('Orchestrator is not healthy');
  }

  return await response.json();
}
