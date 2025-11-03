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
    verified: true,
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
      if (filters.verified !== undefined) params.append('verified', String(filters.verified));
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
    <div className="space-y-4">
      {/* Project Filter - PROMINENT at top */}
      <Card className={!filters.project_id ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20" : "border-primary"}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <span>Select Project (Required)</span>
          </CardTitle>
          {!filters.project_id && (
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
              ⚠️ Please select a project. All analyzed leads will belong to this project.
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="project" className="text-base font-semibold">
              Which project should these leads belong to?
            </Label>
            <Select
              value={filters.project_id || ''}
              onValueChange={(value) => handleFilterChange('project_id', value || undefined)}
              disabled={loadingProjects}
            >
              <SelectTrigger id="project" className="h-12 text-base">
                <SelectValue placeholder={loadingProjects ? 'Loading projects...' : 'Choose a project...'} />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id} className="text-base py-3">
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Only prospects from this project will be shown below
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Additional Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <span>Additional Filters (Optional)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">

            {/* Status Filter */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={filters.status as string || 'all'}
                onValueChange={(value) => handleFilterChange('status', value === 'all' ? undefined : value)}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="ready_for_analysis">Ready for Analysis</SelectItem>
                  <SelectItem value="analyzed">Already Analyzed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Industry Filter */}
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                placeholder="e.g., Restaurant"
                value={filters.industry as string || ''}
                onChange={(e) => handleFilterChange('industry', e.target.value)}
              />
            </div>

            {/* City Filter */}
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                placeholder="e.g., Philadelphia"
                value={filters.city as string || ''}
                onChange={(e) => handleFilterChange('city', e.target.value)}
              />
            </div>

            {/* Min Rating Filter */}
            <div className="space-y-2">
              <Label htmlFor="min_rating">Min Rating</Label>
              <Input
                id="min_rating"
                type="number"
                min={0}
                max={5}
                step={0.5}
                placeholder="0.0"
                value={filters.min_rating || ''}
                onChange={(e) => handleFilterChange('min_rating', e.target.value ? parseFloat(e.target.value) : undefined)}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            <div className="text-sm text-muted-foreground">
              {total > 0 ? `${total} prospect${total === 1 ? '' : 's'} found` : 'No prospects found'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && prospects.length === 0 ? (
        <LoadingSection title="Loading Prospects" />
      ) : (
        /* Prospects Table */
        <>
          {/* Selection Actions */}
          {total > 0 && (
            <Card className="mb-4">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAllInProject}
                      disabled={!filters.project_id || loading}
                      title="Select all prospects in project (across all pages)"
                    >
                      <CheckSquare className="w-4 h-4 mr-2" />
                      Select All ({total})
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearAll}
                      disabled={selectedIds.length === 0}
                      title="Clear all selections"
                    >
                      <Square className="w-4 h-4 mr-2" />
                      Clear All
                    </Button>
                  </div>
                  <div className="text-sm">
                    {selectedIds.length > 0 ? (
                      <>
                        <span className="font-semibold text-primary">{selectedIds.length} selected</span>
                        {selectedIds.length > pageSize && (
                          <span className="text-muted-foreground ml-1">
                            ({Math.min(prospects.filter(p => selectedIds.includes(p.id)).length, endIndex - startIndex + 1)} visible on this page)
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-muted-foreground">No prospects selected</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results Summary */}
          {total > 0 && (
            <div className="mb-3 text-sm text-muted-foreground">
              Showing <span className="font-medium text-foreground">{startIndex}-{endIndex}</span> of{' '}
              <span className="font-medium text-foreground">{total}</span> prospect{total === 1 ? '' : 's'}
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
          {total > 0 && (
            <div className="flex items-center justify-between border-t pt-4">
              <div className="text-sm text-muted-foreground">
                {total > 0 ? (
                  <>
                    Showing <span className="font-medium text-foreground">{startIndex}-{endIndex}</span> of{' '}
                    <span className="font-medium text-foreground">{total}</span> prospects
                    {totalPages > 1 && <> • Page {page} of {totalPages}</>}
                  </>
                ) : (
                  <>No prospects found</>
                )}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={!hasPrevPage || loading}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={!hasNextPage || loading}
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Selection Summary */}
          {selectedIds.length > 0 && (
            <div className="rounded-lg bg-primary/10 border border-primary p-4">
              <p className="text-sm font-medium">
                <span className="text-primary">{selectedIds.length}</span> prospect{selectedIds.length === 1 ? '' : 's'} selected for analysis
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ProspectSelector;
