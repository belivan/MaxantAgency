/**
 * Projects API Client
 * Manages project data fetching
 */

import type { APIResponse } from '@/lib/types';

// Simplified Project interface matching database schema
export interface Project {
  id: string;
  name: string;
  client_name?: string;
  description?: string;
  status: 'active' | 'paused' | 'completed' | 'archived';
  budget?: number;
  total_spent?: number;
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at?: string;
}

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
  budget_limit?: number;
  budget_alert_threshold?: number;
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
