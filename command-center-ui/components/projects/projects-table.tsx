'use client';

/**
 * Projects Table Component
 * Displays all projects/campaigns with stats
 */

import { useState, useRef } from 'react';
import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import { formatDateTime, formatCurrency, formatNumber } from '@/lib/utils/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { TableSkeleton } from '@/components/shared/loading-spinner';
import { deleteProjects } from '@/lib/api/projects';
import type { Project, ProjectStatus } from '@/lib/types';

interface ProjectsTableProps {
  projects: Project[];
  loading?: boolean;
  onProjectClick?: (project: Project) => void;
  onDeleteComplete?: () => void;
}

function getStatusColor(status: ProjectStatus): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (status) {
    case 'active':
      return 'default';
    case 'paused':
      return 'secondary';
    case 'completed':
      return 'outline';
    case 'archived':
      return 'destructive';
    default:
      return 'secondary';
  }
}

export function ProjectsTable({ projects, loading, onProjectClick, onDeleteComplete }: ProjectsTableProps) {
  const lastClickedIndexRef = useRef<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isAllSelected = projects.length > 0 && selectedIds.length === projects.length;
  const isSomeSelected = selectedIds.length > 0 && !isAllSelected;

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(projects.map(p => p.id));
    }
  };

  const handleSelectOne = (id: string, index: number, shiftKey: boolean = false) => {
    // Shift+Click: Select range
    if (shiftKey && lastClickedIndexRef.current !== null) {
      const start = Math.min(lastClickedIndexRef.current, index);
      const end = Math.max(lastClickedIndexRef.current, index);

      // Get all IDs in the range
      const rangeIds = projects.slice(start, end + 1).map(p => p.id);

      // Add range to selection (union with existing selection)
      const newSelection = Array.from(new Set([...selectedIds, ...rangeIds]));
      setSelectedIds(newSelection);
    } else {
      // Normal click: Toggle individual selection
      if (selectedIds.includes(id)) {
        setSelectedIds(selectedIds.filter(sid => sid !== id));
      } else {
        setSelectedIds([...selectedIds, id]);
      }
    }

    // Update last clicked index
    lastClickedIndexRef.current = index;
  };

  const handleDelete = async () => {
    if (selectedIds.length === 0) return;

    setIsDeleting(true);
    try {
      await deleteProjects(selectedIds);

      // Clear selection
      setSelectedIds([]);
      setShowDeleteDialog(false);

      // Notify parent to refresh
      onDeleteComplete?.();
    } catch (error) {
      console.error('Failed to delete projects:', error);
      alert(`Failed to delete projects: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return <TableSkeleton rows={5} columns={7} />;
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-border rounded-lg">
        <p className="text-muted-foreground mb-2">No projects found</p>
        <p className="text-sm text-muted-foreground">
          Create your first project to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Selection Info and Actions */}
      {selectedIds.length > 0 ? (
        <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{selectedIds.length}</span> of{' '}
            <span className="font-medium text-foreground">{projects.length}</span> selected
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedIds([])}
            >
              Clear Selection
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete ({selectedIds.length})
            </Button>
          </div>
        </div>
      ) : projects.length > 0 && (
        <div className="p-2">
          <p className="text-xs text-muted-foreground">
            💡 Tip: Hold <kbd className="px-1 py-0.5 text-xs font-semibold border rounded bg-muted">Shift</kbd> and click to select a range
          </p>
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>Project Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Prospects</TableHead>
              <TableHead className="text-right">Analyzed</TableHead>
              <TableHead className="text-right">Emails</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((project, index) => {
              const isSelected = selectedIds.includes(project.id);

              return (
                <TableRow
                  key={project.id}
                  className={`cursor-pointer hover:bg-muted/50 ${isSelected ? 'bg-muted/50' : ''}`}
                  onClick={() => onProjectClick?.(project)}
                >
                  <TableCell>
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectOne(project.id, index, e.shiftKey);
                      }}
                      className="flex items-center cursor-pointer select-none"
                    >
                      <Checkbox
                        checked={isSelected}
                        aria-label={`Select ${project.name}`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleSelectOne(project.id, index, e.shiftKey);
                        }}
                      />
                    </div>
                  </TableCell>

                  <TableCell className="font-medium">
                    <Link
                      href={`/projects/${project.id}`}
                      className="hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {project.name}
                    </Link>
                    {project.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {project.description.slice(0, 60)}
                        {project.description.length > 60 && '...'}
                      </p>
                    )}
                  </TableCell>

                  <TableCell>
                    <Badge variant={getStatusColor(project.status)} className="capitalize">
                      {project.status}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right">
                    {formatNumber(project.prospects_count)}
                  </TableCell>

                  <TableCell className="text-right">
                    <div>
                      {formatNumber(project.analyzed_count)}
                    </div>
                    {project.analyzed_count > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {project.grade_a_count}A / {project.grade_b_count}B
                      </div>
                    )}
                  </TableCell>

                  <TableCell className="text-right">
                    {formatNumber(project.emails_sent_count)}
                    {project.email_open_rate !== undefined && (
                      <div className="text-xs text-muted-foreground">
                        {(project.email_open_rate * 100).toFixed(0)}% open
                      </div>
                    )}
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="font-medium">
                      {formatCurrency(project.total_cost)}
                    </div>
                    {project.budget_limit && (
                      <div className="text-xs text-muted-foreground">
                        of {formatCurrency(project.budget_limit)}
                      </div>
                    )}
                  </TableCell>

                  <TableCell className="text-sm text-muted-foreground">
                    {formatDateTime(project.created_at)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.length} Project{selectedIds.length !== 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected project{selectedIds.length !== 1 ? 's' : ''} and all associated data (prospects, leads, emails).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default ProjectsTable;
