'use client';

/**
 * Project Selection Card
 * Prominent project selection UI that collapses when a project is selected
 */

import { useEffect, useState } from 'react';
import { FolderOpen, CheckCircle2, ChevronDown, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { CreateProjectDialog } from '@/components/projects/create-project-dialog';
import { getProjects } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Project } from '@/lib/types';

interface ProjectSelectionCardProps {
  selectedProjectId: string | null;
  onProjectChange: (projectId: string | null) => void;
  prospectCount?: number;
  hideCreateButton?: boolean;
}

export function ProjectSelectionCard({
  selectedProjectId,
  onProjectChange,
  prospectCount = 0,
  hideCreateButton = false
}: ProjectSelectionCardProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(!selectedProjectId);

  // Fetch projects on mount
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

  // Auto-collapse when project is selected
  useEffect(() => {
    if (selectedProjectId) {
      // Small delay for visual effect
      const timer = setTimeout(() => setIsExpanded(false), 100);
      return () => clearTimeout(timer);
    } else {
      setIsExpanded(true);
    }
  }, [selectedProjectId]);

  const handleChange = (value: string) => {
    onProjectChange(value);
  };

  const handleProjectCreated = (project: Project) => {
    // Add to projects list and select it
    setProjects(prev => [...prev, project]);
    onProjectChange(project.id);
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  // Collapsed state - compact summary bar
  if (!isExpanded && selectedProject) {
    return (
      <Card
        className={cn(
          'transition-all duration-300 ease-out cursor-pointer hover:bg-muted/50',
          'border-green-500/50 bg-green-50/50 dark:bg-green-950/20'
        )}
        onClick={() => setIsExpanded(true)}
      >
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-medium text-sm">
                  {selectedProject.name}
                  {selectedProject.client_name && (
                    <span className="text-muted-foreground"> - {selectedProject.client_name}</span>
                  )}
                </p>
                {prospectCount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {prospectCount} existing prospects
                  </p>
                )}
              </div>
            </div>
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              Change
              <ChevronDown className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Expanded state - full project selection
  return (
    <Card className="transition-all duration-300 ease-out border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FolderOpen className="w-5 h-5" />
          <span>Step 1: Select Project</span>
        </CardTitle>
        <CardDescription>
          {hideCreateButton
            ? 'Select a project to view and analyze its prospects'
            : 'Choose or create a project to organize your prospects'
          }
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Project Dropdown */}
          <div className="flex-1 space-y-2">
            <Label htmlFor="project-select">Project</Label>
            <Select
              value={selectedProjectId || undefined}
              onValueChange={handleChange}
              disabled={loading}
            >
              <SelectTrigger id="project-select" className="w-full h-11">
                <SelectValue placeholder={loading ? 'Loading projects...' : 'Select a project...'} />
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
                    {hideCreateButton
                      ? 'No active projects available'
                      : 'No active projects - create one below'
                    }
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Create New Project Button */}
          {!hideCreateButton && (
            <div className="flex items-end">
              <CreateProjectDialog onProjectCreated={handleProjectCreated} />
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {/* Helper text */}
        {!selectedProjectId && (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            {hideCreateButton
              ? 'Select a project to continue with analysis'
              : 'Select a project to continue with prospecting'
            }
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default ProjectSelectionCard;
