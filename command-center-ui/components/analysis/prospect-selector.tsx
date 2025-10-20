'use client';

/**
 * Prospect Selector Component
 * Filters and selects prospects ready for analysis
 */

import { useState } from 'react';
import { Filter, RefreshCw } from 'lucide-react';
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
import type { Prospect, ProspectFilters } from '@/lib/types';

interface ProspectSelectorProps {
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  preSelectedIds?: string[];
}

export function ProspectSelector({
  selectedIds,
  onSelectionChange,
  preSelectedIds
}: ProspectSelectorProps) {
  const [filters, setFilters] = useState<ProspectFilters>({
    status: 'ready_for_analysis',
    verified: true,
    limit: 100
  });

  const { prospects, loading, error, refresh } = useProspects(filters);

  // Auto-select pre-selected prospects on load
  useState(() => {
    if (preSelectedIds && preSelectedIds.length > 0 && selectedIds.length === 0) {
      onSelectionChange(preSelectedIds);
    }
  });

  const handleFilterChange = (key: keyof ProspectFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === '' ? undefined : value
    }));
  };

  return (
    <div className="space-y-4">
      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <span>Filter Prospects</span>
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
              {prospects.length} prospects found
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
          <ProspectTable
            prospects={prospects}
            selectedIds={selectedIds}
            onSelectionChange={onSelectionChange}
            loading={loading}
          />

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
