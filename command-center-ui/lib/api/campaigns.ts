/**
 * Campaigns API Client
 * Manages automated campaigns via Pipeline Orchestrator
 */

import type { Campaign, CampaignConfig, CampaignRun } from '@/lib/types/campaign';

const ORCHESTRATOR_API = process.env.NEXT_PUBLIC_ORCHESTRATOR_API || 'http://localhost:3020';

/**
 * Get all campaigns
 */
export async function getCampaigns(): Promise<Campaign[]> {
  const response = await fetch(`${ORCHESTRATOR_API}/api/campaigns`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch campaigns' }));
    throw new Error(error.error || `HTTP ${response.status}: Failed to fetch campaigns`);
  }

  const data = await response.json();
  return data.campaigns || data.data || [];
}

/**
 * Get a single campaign by ID
 */
export async function getCampaign(id: string): Promise<Campaign> {
  const response = await fetch(`${ORCHESTRATOR_API}/api/campaigns/${id}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch campaign' }));
    throw new Error(error.error || `HTTP ${response.status}: Failed to fetch campaign`);
  }

  const data = await response.json();
  return data.campaign || data.data;
}

/**
 * Create a new campaign
 */
export async function createCampaign(config: CampaignConfig): Promise<Campaign> {
  const response = await fetch(`${ORCHESTRATOR_API}/api/campaigns`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create campaign' }));
    throw new Error(error.error || error.message || `HTTP ${response.status}: Failed to create campaign`);
  }

  const data = await response.json();
  return data.campaign || data.data;
}

/**
 * Run a campaign immediately
 */
export async function runCampaign(id: string): Promise<{ runId: string; message: string }> {
  const response = await fetch(`${ORCHESTRATOR_API}/api/campaigns/${id}/run`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to run campaign' }));
    throw new Error(error.error || error.message || `HTTP ${response.status}: Failed to run campaign`);
  }

  const data = await response.json();
  return {
    runId: data.runId || data.run_id || data.id,
    message: data.message || 'Campaign started successfully'
  };
}

/**
 * Pause a campaign
 */
export async function pauseCampaign(id: string): Promise<Campaign> {
  const response = await fetch(`${ORCHESTRATOR_API}/api/campaigns/${id}/pause`, {
    method: 'PUT',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to pause campaign' }));
    throw new Error(error.error || error.message || `HTTP ${response.status}: Failed to pause campaign`);
  }

  const data = await response.json();
  return data.campaign || data.data;
}

/**
 * Resume a paused campaign
 */
export async function resumeCampaign(id: string): Promise<Campaign> {
  const response = await fetch(`${ORCHESTRATOR_API}/api/campaigns/${id}/resume`, {
    method: 'PUT',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to resume campaign' }));
    throw new Error(error.error || error.message || `HTTP ${response.status}: Failed to resume campaign`);
  }

  const data = await response.json();
  return data.campaign || data.data;
}

/**
 * Delete a campaign
 */
export async function deleteCampaign(id: string): Promise<{ message: string }> {
  const response = await fetch(`${ORCHESTRATOR_API}/api/campaigns/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to delete campaign' }));
    throw new Error(error.error || error.message || `HTTP ${response.status}: Failed to delete campaign`);
  }

  const data = await response.json();
  return {
    message: data.message || 'Campaign deleted successfully'
  };
}

/**
 * Get campaign run history
 */
export async function getCampaignRuns(campaignId: string): Promise<CampaignRun[]> {
  const response = await fetch(`${ORCHESTRATOR_API}/api/campaigns/${campaignId}/runs`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch campaign runs' }));
    throw new Error(error.error || error.message || `HTTP ${response.status}: Failed to fetch campaign runs`);
  }

  const data = await response.json();
  return data.runs || data.data || [];
}
