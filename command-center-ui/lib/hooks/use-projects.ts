/**
 * Projects Data Hook
 * Manages project/campaign data and CRUD operations
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getProjects,
  getProject,
  createProject as createProjectAPI,
  updateProject as updateProjectAPI,
  
} from '@/lib/api/projects';
import type { Project, CreateProjectRequest, UpdateProjectRequest } from '@/lib/types';

export interface UseProjectsReturn {
  projects: Project[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createProject: (data: CreateProjectRequest) => Promise<Project>;
  updateProject: (id: string, data: UpdateProjectRequest) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
}

export function useProjects(): UseProjectsReturn {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getProjects();
      setProjects(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch projects');
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const createProject = useCallback(async (data: CreateProjectRequest): Promise<Project> => {
    setError(null);

    try {
      const newProject = await createProjectAPI({
        name: data.name,
        description: data.description,
        icp_brief: data.icp_brief,
        budget_limit: data.budget_limit
      });

      // Refresh projects list
      await fetchProjects();

      return newProject;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to create project';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [fetchProjects]);

  const updateProject = useCallback(async (
    id: string,
    data: UpdateProjectRequest
  ): Promise<Project> => {
    setError(null);

    try {
      const updatedProject = await updateProjectAPI(id, data);

      // Update local state
      setProjects(prev =>
        prev.map(p => p.id === id ? updatedProject : p)
      );

      return updatedProject;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update project';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const deleteProject = useCallback(async (id: string): Promise<void> => {
    setError(null);

    try {
      await deleteProjectAPI(id);

      // Remove from local state
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to delete project';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return {
    projects,
    loading,
    error,
    refresh: fetchProjects,
    createProject,
    updateProject,
    deleteProject
  };
}

export interface UseSingleProjectReturn {
  project: Project | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  update: (data: UpdateProjectRequest) => Promise<Project>;
  delete: () => Promise<void>;
}

export function useSingleProject(id: string | null): UseSingleProjectReturn {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProject = useCallback(async () => {
    if (!id) {
      setProject(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getProject(id);
      setProject(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch project');
      setProject(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const update = useCallback(async (data: UpdateProjectRequest): Promise<Project> => {
    if (!id) {
      throw new Error('No project ID');
    }

    setError(null);

    try {
      const updatedProject = await updateProjectAPI(id, data);
      setProject(updatedProject);
      return updatedProject;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update project';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [id]);

  const deleteProj = useCallback(async (): Promise<void> => {
    if (!id) {
      throw new Error('No project ID');
    }

    setError(null);

    try {
      await deleteProjectAPI(id);
      setProject(null);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to delete project';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [id]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  return {
    project,
    loading,
    error,
    refresh: fetchProject,
    update,
    delete: deleteProj
  };
}
