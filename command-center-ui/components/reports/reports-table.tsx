'use client';

/**
 * Reports Table Component
 * Table for viewing and managing generated reports
 */

import { useState, useMemo, useEffect } from 'react';
import {
  Download,
  Trash2,
  FileText,
  FileCode,
  ExternalLink,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  RefreshCw,
  X
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getReportDownloadUrl, deleteReport } from '@/lib/api/analysis';
import type { Report } from '@/lib/api/analysis';

interface ReportsTableProps {
  reports: Report[];
  loading?: boolean;
  onRefresh?: () => void;
  onDelete?: (reportId: string) => void;
}

type SortField = 'company_name' | 'website_grade' | 'generated_at' | 'download_count';
type SortDirection = 'asc' | 'desc';

interface Filters {
  format?: 'html' | 'markdown' | 'all';
  grade?: string;
  project?: string;
  search?: string;
}

export function ReportsTable({ reports, loading, onRefresh, onDelete }: ReportsTableProps) {
  // Sorting state
  const [sortField, setSortField] = useState<SortField>('generated_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Filter state
  const [filters, setFilters] = useState<Filters>({
    format: 'all',
    grade: 'all',
    search: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  // Get unique projects for filter
  const uniqueProjects = useMemo(() => {
    const projectsMap = new Map<string, { id: string; name: string }>();
    reports.forEach(r => {
      if (r.project_id && (r as any).project_name) {
        projectsMap.set(r.project_id, { id: r.project_id, name: (r as any).project_name });
      }
    });
    return Array.from(projectsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [reports]);

  // Apply filters and sorting
  const filteredAndSortedReports = useMemo(() => {
    let result = [...reports];

    // Apply filters
    if (filters.format && filters.format !== 'all') {
      result = result.filter(r => r.format === filters.format);
    }

    if (filters.grade && filters.grade !== 'all') {
      result = result.filter(r => r.website_grade === filters.grade);
    }

    if (filters.project && filters.project !== 'all') {
      result = result.filter(r => r.project_id === filters.project);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(r =>
        r.company_name.toLowerCase().includes(searchLower) ||
        r.website_url?.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'company_name':
          aValue = a.company_name.toLowerCase();
          bValue = b.company_name.toLowerCase();
          break;
        case 'website_grade':
          const gradeOrder = { A: 5, B: 4, C: 3, D: 2, F: 1 };
          aValue = gradeOrder[a.website_grade as keyof typeof gradeOrder] || 0;
          bValue = gradeOrder[b.website_grade as keyof typeof gradeOrder] || 0;
          break;
        case 'generated_at':
          aValue = new Date(a.generated_at).getTime();
          bValue = new Date(b.generated_at).getTime();
          break;
        case 'download_count':
          aValue = a.download_count || 0;
          bValue = b.download_count || 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [reports, filters, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleDownload = async (report: Report) => {
    try {
      const downloadUrl = await getReportDownloadUrl(report.id);
      window.open(downloadUrl, '_blank');
    } catch (err: any) {
      alert(err.message || 'Failed to download report');
    }
  };

  const handleDelete = async (report: Report) => {
    if (!confirm(`Delete report for ${report.company_name}?`)) return;

    try {
      await deleteReport(report.id);
      onDelete?.(report.id);
      onRefresh?.();
    } catch (err: any) {
      alert(err.message || 'Failed to delete report');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const hasActiveFilters = filters.format !== 'all' ||
    filters.grade !== 'all' ||
    (filters.project && filters.project !== 'all') ||
    filters.search !== '';

  const resetFilters = () => {
    setFilters({
      format: 'all',
      grade: 'all',
      project: undefined,
      search: ''
    });
  };

  const getGradeVariant = (grade: string) => {
    switch (grade) {
      case 'A': return 'default';
      case 'B': return 'secondary';
      case 'C': return 'outline';
      default: return 'destructive';
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle>Reports</CardTitle>
            <CardDescription>
              {filteredAndSortedReports.length} report{filteredAndSortedReports.length !== 1 ? 's' : ''} found
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={hasActiveFilters ? 'border-primary' : ''}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {[filters.format !== 'all', filters.grade !== 'all',
                    filters.project && filters.project !== 'all',
                    filters.search !== ''].filter(Boolean).length}
                </Badge>
              )}
            </Button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-4 p-4 border rounded-lg bg-muted/50 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Filter Reports</h4>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={resetFilters}>
                  <X className="w-4 h-4 mr-1" />
                  Clear All
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Input
                placeholder="Search companies..."
                value={filters.search || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />

              <Select
                value={filters.format || 'all'}
                onValueChange={(value) => setFilters(prev => ({ ...prev, format: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Formats" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Formats</SelectItem>
                  <SelectItem value="html">HTML</SelectItem>
                  <SelectItem value="markdown">Markdown</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.grade || 'all'}
                onValueChange={(value) => setFilters(prev => ({ ...prev, grade: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Grades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades</SelectItem>
                  <SelectItem value="A">Grade A</SelectItem>
                  <SelectItem value="B">Grade B</SelectItem>
                  <SelectItem value="C">Grade C</SelectItem>
                  <SelectItem value="D">Grade D</SelectItem>
                  <SelectItem value="F">Grade F</SelectItem>
                </SelectContent>
              </Select>

              {uniqueProjects.length > 0 && (
                <Select
                  value={filters.project || 'all'}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, project: value === 'all' ? undefined : value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {uniqueProjects.map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {loading && reports.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading reports...
          </div>
        ) : filteredAndSortedReports.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="font-medium text-muted-foreground">No reports found</p>
            <p className="text-sm text-muted-foreground/70">
              {hasActiveFilters ? 'Try adjusting your filters' : 'Generate your first report from the Leads page'}
            </p>
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('company_name')}
                      className="hover:bg-transparent -ml-3"
                    >
                      Company
                      {sortField === 'company_name' ? (
                        sortDirection === 'asc' ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />
                      ) : (
                        <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('website_grade')}
                      className="hover:bg-transparent -ml-3"
                    >
                      Grade
                      {sortField === 'website_grade' ? (
                        sortDirection === 'asc' ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />
                      ) : (
                        <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead className="hidden sm:table-cell">Size</TableHead>
                  <TableHead className="hidden md:table-cell">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('download_count')}
                      className="hover:bg-transparent -ml-3"
                    >
                      Downloads
                      {sortField === 'download_count' ? (
                        sortDirection === 'asc' ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />
                      ) : (
                        <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('generated_at')}
                      className="hover:bg-transparent -ml-3"
                    >
                      Generated
                      {sortField === 'generated_at' ? (
                        sortDirection === 'asc' ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />
                      ) : (
                        <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <div className="font-medium">{report.company_name}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {report.website_url}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getGradeVariant(report.website_grade)}>
                        {report.website_grade}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {report.format === 'html' ? (
                          <FileCode className="h-4 w-4 text-blue-500" />
                        ) : (
                          <FileText className="h-4 w-4 text-green-500" />
                        )}
                        <span className="text-sm uppercase">{report.format}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {formatFileSize(report.file_size_bytes)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {report.download_count}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(report.generated_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload(report)}
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(report)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ReportsTable;
