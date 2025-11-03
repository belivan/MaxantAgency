/**
 * Projects API Client
 * Manages project data fetching
 */

import type { APIResponse, Project } from '@/lib/types';

/**
 * Get all projects
 */
export async function getProjects(filters?: { status?: string }): Promise<Project[]> {
  const params = new URLSearchParams();

  if (filters?.status) {
    params.set('status', filters.status);
  }

  const response = await fetch(`/api/projects?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch projects');
  }

  const data: APIResponse<Project[]> = await response.json();
  return data.data || [];
}

/**
 * Get a single project by ID
 */
export async function getProject(id: string): Promise<Project> {
  const response = await fetch(`/api/projects/${id}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch project');
  }

  const data: APIResponse<Project> = await response.json();
  if (!data.data) {
    throw new Error('Project not found');
  }

  return data.data;
}

/**
 * Create a new project
 */
export async function createProject(projectData: {
  name: string;
  description?: string;
  client_name?: string;
  status?: 'active' | 'paused' | 'completed' | 'archived';
  budget?: number;
  budget_limit?: number;
  budget_alert_threshold?: number;
  icp_brief?: Record<string, any>;
  prospecting_prompts?: Record<string, any>;
  prospecting_model_selections?: Record<string, string>;
  analysis_prompts?: Record<string, any>;
  analysis_model_selections?: Record<string, string>;
  analysis_config?: Record<string, any>;
  outreach_config?: Record<string, any>;
}): Promise<Project> {
  const response = await fetch('/api/projects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(projectData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create project');
  }

  const data: APIResponse<Project> = await response.json();
  if (!data.data) {
    throw new Error('No project data returned');
  }

  return data.data;
}

/**
 * Update a project
 */
export async function updateProject(
  id: string,
  updates: {
    name?: string;
    description?: string;
    status?: 'active' | 'paused' | 'completed' | 'archived';
    budget?: number;
    client_name?: string;
    icp_brief?: Record<string, any>;
    prospecting_prompts?: Record<string, any>;
    prospecting_model_selections?: Record<string, string>;
    analysis_prompts?: Record<string, any>;
    analysis_model_selections?: Record<string, string>;
    analysis_config?: Record<string, any>;
    outreach_config?: Record<string, any>;
  }
): Promise<Project> {
  const response = await fetch(`/api/projects/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update project');
  }

  const data: APIResponse<Project> = await response.json();
  if (!data.data) {
    throw new Error('No project data returned');
  }

  return data.data;
}

/**
 * Delete projects by IDs
 */
export async function deleteProjects(projectIds: string[]): Promise<{ deleted: number }> {
  try {
    const deletePromises = projectIds.map(id =>
      fetch(`/api/projects/${id}`, {
        method: 'DELETE',
      }).catch(err => {
        console.error(`Failed to delete project ${id}:`, err);
        throw new Error(`Network error deleting project ${id}: ${err.message}`);
      })
    );

    const responses = await Promise.all(deletePromises);

    // Check for any failures
    const failures = responses.filter(r => !r.ok);
    if (failures.length > 0) {
      const firstError = await failures[0].json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(firstError.error || 'Failed to delete some projects');
    }

    return { deleted: projectIds.length };
  } catch (error: any) {
    console.error('Delete projects error:', error);
    throw new Error(error.message || 'Failed to delete projects');
  }
}
