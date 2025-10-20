'use client';

/**
 * Projects Table Component
 * Displays all projects/campaigns with stats
 */

import Link from 'next/link';
import { formatDateString, formatCurrency, formatNumber } from '@/lib/utils/format';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { TableSkeleton } from '@/components/shared/loading-spinner';
import type { Project, ProjectStatus } from '@/lib/types';

interface ProjectsTableProps {
  projects: Project[];
  loading?: boolean;
  onProjectClick?: (project: Project) => void;
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

export function ProjectsTable({ projects, loading, onProjectClick }: ProjectsTableProps) {
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
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
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
          {projects.map((project) => (
            <TableRow
              key={project.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onProjectClick?.(project)}
            >
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
                {formatDateString(project.created_at, 'MMM d, yyyy')}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default ProjectsTable;
