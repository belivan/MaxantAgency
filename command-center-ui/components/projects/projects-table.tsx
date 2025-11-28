'use client';

/**
 * Projects Table Component
 * Mobile-first card layout with desktop table view
 * Visual progress indicators and color-coded stats
 */

import { useState, useRef } from 'react';
import Link from 'next/link';
import { Trash2, Users, BarChart3, Mail, DollarSign, ChevronRight, FolderOpen } from 'lucide-react';
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

// Status colors with actual visual distinction
const statusConfig: Record<ProjectStatus, { color: string; bg: string; text: string }> = {
  active: { color: 'bg-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-600' },
  paused: { color: 'bg-amber-500', bg: 'bg-amber-500/10', text: 'text-amber-600' },
  completed: { color: 'bg-blue-500', bg: 'bg-blue-500/10', text: 'text-blue-600' },
  archived: { color: 'bg-slate-400', bg: 'bg-slate-400/10', text: 'text-slate-500' },
};

// Grade colors for visual distinction
const gradeColors: Record<string, string> = {
  A: 'text-emerald-600 bg-emerald-500/10',
  B: 'text-blue-600 bg-blue-500/10',
  C: 'text-amber-600 bg-amber-500/10',
  D: 'text-orange-600 bg-orange-500/10',
  F: 'text-red-600 bg-red-500/10',
};

function StatusBadge({ status }: { status: ProjectStatus }) {
  const config = statusConfig[status] || statusConfig.paused;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.color}`} />
      {status}
    </span>
  );
}

// Visual funnel progress bar
function FunnelProgress({ prospects, analyzed, emails }: { prospects: number; analyzed: number; emails: number }) {
  const maxVal = Math.max(prospects, 1);
  const analyzedPct = Math.min((analyzed / maxVal) * 100, 100);
  const emailsPct = Math.min((emails / maxVal) * 100, 100);

  return (
    <div className="w-full">
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
        <span>{prospects} prospects</span>
        <ChevronRight className="w-3 h-3" />
        <span>{analyzed} leads</span>
        <ChevronRight className="w-3 h-3" />
        <span>{emails} emails</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden flex">
        <div
          className="h-full bg-slate-400 transition-all"
          style={{ width: '100%' }}
        />
      </div>
      <div className="h-1.5 bg-transparent rounded-full overflow-hidden flex -mt-1.5">
        <div
          className="h-full bg-blue-500 transition-all rounded-full"
          style={{ width: `${analyzedPct}%` }}
        />
      </div>
      <div className="h-1.5 bg-transparent rounded-full overflow-hidden flex -mt-1.5">
        <div
          className="h-full bg-emerald-500 transition-all rounded-full"
          style={{ width: `${emailsPct}%` }}
        />
      </div>
    </div>
  );
}

// Mobile card view for a single project
function ProjectCard({
  project,
  isSelected,
  onSelect,
  onClick
}: {
  project: Project;
  isSelected: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onClick: () => void;
}) {
  return (
    <div
      className={`border rounded-lg p-3 cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/30'
      }`}
      onClick={onClick}
    >
      {/* Header: Checkbox, Name, Status */}
      <div className="flex items-start gap-2 mb-2">
        <div onClick={onSelect} className="mt-0.5">
          <Checkbox checked={isSelected} aria-label={`Select ${project.name}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/projects/${project.id}`}
              className="font-semibold text-sm hover:underline truncate"
              onClick={(e) => e.stopPropagation()}
            >
              {project.name}
            </Link>
            <StatusBadge status={project.status} />
          </div>
          {project.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
              {project.description}
            </p>
          )}
        </div>
      </div>

      {/* Funnel Progress */}
      <FunnelProgress
        prospects={project.prospects_count}
        analyzed={project.analyzed_count}
        emails={project.emails_sent_count}
      />

      {/* Stats Row */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t">
        <div className="flex items-center gap-3">
          {/* Grade breakdown */}
          {project.analyzed_count > 0 && (
            <div className="flex items-center gap-1">
              {project.grade_a_count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${gradeColors.A}`}>
                  {project.grade_a_count}A
                </span>
              )}
              {project.grade_b_count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${gradeColors.B}`}>
                  {project.grade_b_count}B
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">
            {formatCurrency(project.total_cost)}
          </span>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground">
            {formatDateTime(project.created_at, { relative: true })}
          </span>
        </div>
      </div>
    </div>
  );
}

export function ProjectsTable({ projects, loading, onProjectClick, onDeleteComplete }: ProjectsTableProps) {
  const lastClickedIndexRef = useRef<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isAllSelected = projects.length > 0 && selectedIds.length === projects.length;

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(projects.map(p => p.id));
    }
  };

  const handleSelectOne = (id: string, index: number, shiftKey: boolean = false) => {
    if (shiftKey && lastClickedIndexRef.current !== null) {
      const start = Math.min(lastClickedIndexRef.current, index);
      const end = Math.max(lastClickedIndexRef.current, index);
      const rangeIds = projects.slice(start, end + 1).map(p => p.id);
      const newSelection = Array.from(new Set([...selectedIds, ...rangeIds]));
      setSelectedIds(newSelection);
    } else {
      if (selectedIds.includes(id)) {
        setSelectedIds(selectedIds.filter(sid => sid !== id));
      } else {
        setSelectedIds([...selectedIds, id]);
      }
    }
    lastClickedIndexRef.current = index;
  };

  const handleDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsDeleting(true);
    try {
      await deleteProjects(selectedIds);
      setSelectedIds([]);
      setShowDeleteDialog(false);
      onDeleteComplete?.();
    } catch (error) {
      console.error('Failed to delete projects:', error);
      alert(`Failed to delete projects: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return <TableSkeleton rows={4} columns={6} />;
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-border rounded-lg">
        <FolderOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground mb-1 font-medium">No projects found</p>
        <p className="text-sm text-muted-foreground">
          Create your first project to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Selection Bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between p-2 border rounded-lg bg-muted/50 text-sm">
          <span className="text-muted-foreground">
            <span className="font-medium text-foreground">{selectedIds.length}</span> selected
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
              Clear
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Delete
            </Button>
          </div>
        </div>
      )}

      {/* Mobile: Card Grid */}
      <div className="grid gap-3 md:hidden">
        {projects.map((project, index) => (
          <ProjectCard
            key={project.id}
            project={project}
            isSelected={selectedIds.includes(project.id)}
            onSelect={(e) => {
              e.stopPropagation();
              handleSelectOne(project.id, index, e.shiftKey);
            }}
            onClick={() => onProjectClick?.(project)}
          />
        ))}
      </div>

      {/* Desktop: Compact Table */}
      <div className="hidden md:block border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-10 px-3">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead className="font-medium">Project</TableHead>
              <TableHead className="font-medium">Status</TableHead>
              <TableHead className="font-medium">Pipeline</TableHead>
              <TableHead className="text-right font-medium">Grades</TableHead>
              <TableHead className="text-right font-medium">Cost</TableHead>
              <TableHead className="text-right font-medium">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((project, index) => {
              const isSelected = selectedIds.includes(project.id);
              return (
                <TableRow
                  key={project.id}
                  className={`cursor-pointer hover:bg-muted/40 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}
                  onClick={() => onProjectClick?.(project)}
                >
                  <TableCell className="px-3">
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectOne(project.id, index, e.shiftKey);
                      }}
                    >
                      <Checkbox checked={isSelected} aria-label={`Select ${project.name}`} />
                    </div>
                  </TableCell>

                  <TableCell>
                    <Link
                      href={`/projects/${project.id}`}
                      className="font-medium hover:underline text-sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {project.name}
                    </Link>
                    {project.description && (
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {project.description}
                      </p>
                    )}
                  </TableCell>

                  <TableCell>
                    <StatusBadge status={project.status} />
                  </TableCell>

                  <TableCell className="min-w-[180px]">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="w-3 h-3" />
                      <span>{project.prospects_count}</span>
                      <ChevronRight className="w-3 h-3" />
                      <BarChart3 className="w-3 h-3" />
                      <span>{project.analyzed_count}</span>
                      <ChevronRight className="w-3 h-3" />
                      <Mail className="w-3 h-3" />
                      <span>{project.emails_sent_count}</span>
                    </div>
                  </TableCell>

                  <TableCell className="text-right">
                    {project.analyzed_count > 0 ? (
                      <div className="flex items-center justify-end gap-1">
                        {project.grade_a_count > 0 && (
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${gradeColors.A}`}>
                            {project.grade_a_count}A
                          </span>
                        )}
                        {project.grade_b_count > 0 && (
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${gradeColors.B}`}>
                            {project.grade_b_count}B
                          </span>
                        )}
                        {!project.grade_a_count && !project.grade_b_count && (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 text-sm">
                      <DollarSign className="w-3 h-3 text-muted-foreground" />
                      <span>{project.total_cost.toFixed(2)}</span>
                    </div>
                  </TableCell>

                  <TableCell className="text-right text-xs text-muted-foreground">
                    {formatDateTime(project.created_at, { relative: true })}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">
              Delete {selectedIds.length} project{selectedIds.length !== 1 ? 's' : ''}?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p className="font-medium text-foreground">This cannot be undone.</p>
              <p className="text-sm">All linked prospects, leads, and emails will be deleted.</p>
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
