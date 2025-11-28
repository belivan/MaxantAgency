'use client';

/**
 * Project Selector Component
 * Dropdown for selecting active projects with "Global (All Projects)" option
 */

import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { getProjects } from '@/lib/api';
import type { Project } from '@/lib/types';

interface ProjectSelectorProps {
  value: string | null;
  onChange: (projectId: string | null) => void;
  label?: string;
  placeholder?: string;
  showLabel?: boolean;
  className?: string;
}

export function ProjectSelector({
  value,
  onChange,
  label = 'Project',
  placeholder = 'Select a project',
  showLabel = true,
  className
}: ProjectSelectorProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const data = await getProjects({ status: 'active' });
        setProjects(data);
      } catch (err: any) {
        console.error('Failed to load projects:', err);
        setError(err.message || 'Failed to load projects');
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const handleChange = (newValue: string) => {
    onChange(newValue);
  };

  return (
    <div className={className}>
      {showLabel && label && <Label htmlFor="project-selector">{label}</Label>}
      <Select
        value={value || undefined}
        onValueChange={handleChange}
        disabled={loading}
      >
        <SelectTrigger id="project-selector" className="w-full">
          <SelectValue placeholder={loading ? 'Loading...' : placeholder} />
        </SelectTrigger>
        <SelectContent>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              {project.name}
              {project.client_name && ` - ${project.client_name}`}
            </SelectItem>
          ))}
          {projects.length === 0 && !loading && (
            <SelectItem value="none" disabled>
              No active projects
            </SelectItem>
          )}
        </SelectContent>
      </Select>
      {error && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
}
