'use client';

/**
 * Prospect Selector Component
 * Filters and selects prospects ready for analysis
 */

import { useState, useEffect } from 'react';
import { Filter, RefreshCw, ChevronLeft, ChevronRight, CheckSquare, Square } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { ProspectTable } from '@/components/prospecting';
import { useProspects } from '@/lib/hooks';
import { LoadingSection } from '@/components/shared/loading-spinner';
import { getProjects } from '@/lib/api';
import type { Project } from '@/lib/types';
import type { ProspectFilters } from '@/lib/types';

interface ProspectSelectorProps {
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  preSelectedIds?: string[];
  projectId?: string | null;
  onProjectChange?: (projectId: string | null) => void;
}

export function ProspectSelector({
  selectedIds,
  onSelectionChange,
  preSelectedIds,
  projectId,
  onProjectChange
}: ProspectSelectorProps) {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<ProspectFilters>({
    status: 'ready_for_analysis',
    limit: 10,
    offset: 0,
    project_id: projectId || undefined
  });
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  const { prospects, loading, error, refresh, total } = useProspects(filters);

  // Load projects on mount
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoadingProjects(true);
        const data = await getProjects({ status: 'active' });
        setProjects(data);
      } catch (err) {
        console.error('Failed to load projects:', err);
      } finally {
        setLoadingProjects(false);
      }
    };

    fetchProjects();
  }, []);

  // Update filters when projectId prop changes
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      project_id: projectId || undefined,
      offset: 0
    }));
    setPage(1);
  }, [projectId]);

  // Auto-select pre-selected prospects on load
  useEffect(() => {
    if (preSelectedIds && preSelectedIds.length > 0 && selectedIds.length === 0) {
      onSelectionChange(preSelectedIds);
    }
  }, [preSelectedIds, selectedIds.length, onSelectionChange]);

  const handleFilterChange = (key: keyof ProspectFilters, value: any) => {
    const normalizedValue = value === '' ? undefined : value;

    setFilters(prev => ({
      ...prev,
      [key]: normalizedValue,
      offset: 0 // Reset to first page when filters change
    }));
    setPage(1);

    // Notify parent if project filter changed
    if (key === 'project_id' && onProjectChange) {
      onProjectChange(normalizedValue || null);

      // IMPORTANT: Clear selections when project changes
      // This prevents mixing prospects from different projects
      if (selectedIds.length > 0) {
        onSelectionChange([]);
      }
    }
  };

  const handlePageChange = (newPage: number) => {
    const limit = filters.limit || 10;
    setPage(newPage);
    setFilters(prev => ({
      ...prev,
      offset: (newPage - 1) * limit
    }));
  };

  // Select all prospects in project (across all pages)
  const handleSelectAllInProject = async () => {
    if (!filters.project_id) {
      alert('Please select a project first');
      return;
    }

    try {
      // Fetch ALL prospect IDs for the project with current filters
      const params = new URLSearchParams({
        project_id: filters.project_id,
        fields: 'id' // Only fetch IDs to minimize data transfer
      });

      // Apply current filters
      if (filters.status) params.append('status', filters.status as string);
      if (filters.industry) params.append('industry', filters.industry as string);
      if (filters.city) params.append('city', filters.city as string);
      if (filters.min_rating) params.append('min_rating', String(filters.min_rating));

      const response = await fetch(`/api/prospects?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // API returns { success: true, prospects: [...], total: X }
      if (data.success && data.prospects && Array.isArray(data.prospects)) {
        const allIds = data.prospects.map((p: any) => p.id);
        onSelectionChange(allIds);
        console.log(`✓ Selected ${allIds.length} prospects across all pages`);
      } else {
        throw new Error(data.error || 'Invalid response format from server');
      }
    } catch (err: any) {
      console.error('Failed to select all prospects:', err);
      alert(`Failed to select all prospects: ${err.message}`);
    }
  };

  // Clear all selections
  const handleClearAll = () => {
    onSelectionChange([]);
  };

  const pageSize = filters.limit || 10;
  const totalPages = Math.ceil(total / pageSize);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  const startIndex = (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, total);

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Filters Card */}
      <Card className={!filters.project_id ? "border-amber-500" : ""}>
        <CardHeader className="pb-2 sm:pb-3">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Filters</span>
            {!filters.project_id && (
              <span className="text-[10px] sm:text-xs text-amber-600 font-normal">
                (Select project)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid gap-2 sm:gap-3 grid-cols-2 md:grid-cols-5">
            {/* Project Filter */}
            <div className="space-y-1 col-span-2 md:col-span-1">
              <Label htmlFor="project" className="text-[10px] sm:text-xs">Project</Label>
              <Select
                value={filters.project_id || ''}
                onValueChange={(value) => handleFilterChange('project_id', value || undefined)}
                disabled={loadingProjects}
              >
                <SelectTrigger id="project" className={`h-8 text-xs sm:text-sm ${!filters.project_id ? "border-amber-500" : ""}`}>
                  <SelectValue placeholder={loadingProjects ? 'Loading...' : 'Select'} />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-1">
              <Label htmlFor="status" className="text-[10px] sm:text-xs">Status</Label>
              <Select
                value={filters.status as string || 'all'}
                onValueChange={(value) => handleFilterChange('status', value === 'all' ? undefined : value)}
              >
                <SelectTrigger id="status" className="h-8 text-xs sm:text-sm">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="ready_for_analysis">Ready</SelectItem>
                  <SelectItem value="analyzed">Analyzed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Industry Filter */}
            <div className="space-y-1">
              <Label htmlFor="industry" className="text-[10px] sm:text-xs">Industry</Label>
              <Input
                id="industry"
                placeholder="Restaurant"
                value={filters.industry as string || ''}
                onChange={(e) => handleFilterChange('industry', e.target.value)}
                className="h-8 text-xs sm:text-sm"
              />
            </div>

            {/* City Filter */}
            <div className="space-y-1">
              <Label htmlFor="city" className="text-[10px] sm:text-xs">City</Label>
              <Input
                id="city"
                placeholder="Philly"
                value={filters.city as string || ''}
                onChange={(e) => handleFilterChange('city', e.target.value)}
                className="h-8 text-xs sm:text-sm"
              />
            </div>

            {/* Min Rating Filter */}
            <div className="space-y-1">
              <Label htmlFor="min_rating" className="text-[10px] sm:text-xs">Rating</Label>
              <Input
                id="min_rating"
                type="number"
                min={0}
                max={5}
                step={0.5}
                placeholder="0"
                value={filters.min_rating || ''}
                onChange={(e) => handleFilterChange('min_rating', e.target.value ? parseFloat(e.target.value) : undefined)}
                className="h-8 text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between mt-3 sm:mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={loading}
              className="h-7 sm:h-8 text-xs px-2 sm:px-3"
            >
              <RefreshCw className={`w-3.5 h-3.5 sm:mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>

            <div className="text-xs text-muted-foreground">
              {total > 0 ? `${total} found` : 'No prospects'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && prospects.length === 0 ? (
        <LoadingSection title="Loading Prospects" />
      ) : (
        /* Prospects Table */
        <>
          {/* Selection Bar - Compact */}
          {total > 0 && (
            <div className="flex items-center justify-between gap-1.5 py-1.5 sm:py-2">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAllInProject}
                  disabled={!filters.project_id || loading}
                  className="h-7 sm:h-8 text-[10px] sm:text-xs px-2 sm:px-3"
                >
                  <CheckSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5 sm:mr-1.5" />
                  <span className="hidden sm:inline">All ({total})</span>
                  <span className="sm:hidden">{total}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearAll}
                  disabled={selectedIds.length === 0}
                  className="h-7 sm:h-8 text-[10px] sm:text-xs px-2 sm:px-3"
                >
                  <Square className="w-3 h-3 sm:w-3.5 sm:h-3.5 sm:mr-1.5" />
                  <span className="hidden sm:inline">Clear</span>
                </Button>
                <span className="text-[10px] sm:text-xs text-muted-foreground">
                  {selectedIds.length > 0 && (
                    <span className="font-medium text-primary">{selectedIds.length}</span>
                  )}
                </span>
              </div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">
                {startIndex}-{endIndex}/{total}
              </div>
            </div>
          )}

          <ProspectTable
            prospects={prospects}
            selectedIds={selectedIds}
            onSelectionChange={onSelectionChange}
            onDeleteComplete={refresh}
            loading={loading}
          />

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 sm:pt-3">
              <span className="text-[10px] sm:text-xs text-muted-foreground">
                {page}/{totalPages}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={!hasPrevPage || loading}
                  className="h-7 sm:h-8 px-1.5 sm:px-2"
                >
                  <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={!hasNextPage || loading}
                  className="h-7 sm:h-8 px-1.5 sm:px-2"
                >
                  <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ProspectSelector;
