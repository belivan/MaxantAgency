'use client';

/**
 * Leads Table Component
 * Advanced table for viewing and managing analyzed leads
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mail,
  MailCheck,
  ExternalLink,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  X,
  Trash2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  FileText,
  Sparkles
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { GradeBadge } from './grade-badge';
import { PriorityBadge, getPriorityTier } from './priority-badge';
import { LeadDetailsCard } from './lead-details-card';
import { BudgetIndicatorBadge, YearsInBusinessBadge, PremiumFeaturesBadge } from './business-intel-badges';
import { GenerateReportModal } from './generate-report-modal';
import { GenerateOutreachModal } from './generate-outreach-modal';
import { formatDate, formatDateTime } from '@/lib/utils/format';
import { deleteLeads } from '@/lib/api/analysis';
import type { Lead, LeadGrade } from '@/lib/types';

interface LeadsTableProps {
  leads: Lead[];
  loading?: boolean;
  onLeadClick?: (lead: Lead) => void;
  onComposeEmails?: (leadIds: string[]) => void;
  onSelectionChange?: (selectedIds: string[], selectedLeads: Lead[]) => void;
  onRefresh?: () => void;
}

type SortField = 'company_name' | 'grade' | 'overall_score' | 'lead_priority' | 'created_at';
type SortDirection = 'asc' | 'desc';

interface LeadFilters {
  grade?: LeadGrade | 'all';
  priority?: 'hot' | 'warm' | 'cold' | 'all';
  hasEmail?: 'all' | 'yes' | 'no';
  industry?: string;
  city?: string;
  project?: string;
  search?: string;
}

export function LeadsTable({ leads, loading, onLeadClick, onComposeEmails, onSelectionChange, onRefresh }: LeadsTableProps) {
  const router = useRouter();

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);

  // Notify parent when selection changes (removed onSelectionChange from deps to prevent infinite loop)
  useEffect(() => {
    if (onSelectionChange) {
      const selectedLeads = leads.filter(lead => selectedIds.includes(lead.id));
      onSelectionChange(selectedIds, selectedLeads);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds]); // Only depend on selectedIds, not the callback or leads array

  // Expanded rows state
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('lead_priority');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Filter state
  const [filters, setFilters] = useState<LeadFilters>({
    grade: 'all',
    priority: 'all',
    hasEmail: 'all',
    industry: '',
    city: '',
    search: ''
  });

  const [showFilters, setShowFilters] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Delete confirmation state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modal states
  const [showReportModal, setShowReportModal] = useState(false);
  const [showOutreachModal, setShowOutreachModal] = useState(false);

  // Get unique values for filters
  const uniqueIndustries = useMemo(() => {
    const industries = new Set(leads.map(l => l.industry).filter(Boolean) as string[]);
    return Array.from(industries).sort();
  }, [leads]);

  const uniqueCities = useMemo(() => {
    const cities = new Set(leads.map(l => l.city).filter(Boolean) as string[]);
    return Array.from(cities).sort();
  }, [leads]);

  const uniqueProjects = useMemo(() => {
    const projectsMap = new Map<string, { id: string; name: string }>();

    leads.forEach(l => {
      const projectId = l.project_id;
      const projectName = (l as any).projects?.name;

      if (projectId && projectName && !projectsMap.has(projectId)) {
        projectsMap.set(projectId, { id: projectId, name: projectName });
      }
    });

    return Array.from(projectsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [leads]);

  // Apply filters and sorting
  const filteredAndSortedLeads = useMemo(() => {
    let result = [...leads];

    // Apply filters
    if (filters.grade && filters.grade !== 'all') {
      result = result.filter(l => l.grade === filters.grade);
    }

    if (filters.priority && filters.priority !== 'all') {
      result = result.filter(l => {
        const tier = getPriorityTier(l.lead_priority || 0);
        return tier === filters.priority;
      });
    }

    if (filters.hasEmail === 'yes') {
      result = result.filter(l => l.contact_email && l.contact_email.trim() !== '');
    } else if (filters.hasEmail === 'no') {
      result = result.filter(l => !l.contact_email || l.contact_email.trim() === '');
    }

    if (filters.industry) {
      result = result.filter(l => l.industry === filters.industry);
    }

    if (filters.city) {
      result = result.filter(l => l.city === filters.city);
    }

    if (filters.project) {
      result = result.filter(l => l.project_id === filters.project);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(l =>
        l.company_name.toLowerCase().includes(searchLower) ||
        l.website.toLowerCase().includes(searchLower)
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
        case 'grade':
          const gradeOrder = { A: 5, B: 4, C: 3, D: 2, F: 1 };
          aValue = gradeOrder[a.grade];
          bValue = gradeOrder[b.grade];
          break;
        case 'overall_score':
          aValue = a.overall_score;
          bValue = b.overall_score;
          break;
        case 'lead_priority':
          aValue = a.lead_priority || 0;
          bValue = b.lead_priority || 0;
          break;
        case 'created_at':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [leads, filters, sortField, sortDirection]);

  // Pagination logic
  const totalPages = Math.ceil(filteredAndSortedLeads.length / pageSize);
  const paginatedLeads = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredAndSortedLeads.slice(startIndex, endIndex);
  }, [filteredAndSortedLeads, currentPage, pageSize]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, sortField, sortDirection]);

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Select all leads on current page only
      setSelectedIds(prev => {
        const pageIds = paginatedLeads.map(l => l.id);
        const newIds = [...prev];
        pageIds.forEach(id => {
          if (!newIds.includes(id)) {
            newIds.push(id);
          }
        });
        return newIds;
      });
    } else {
      // Deselect all leads on current page
      const pageIds = paginatedLeads.map(l => l.id);
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    }
  };

  const handleSelectLead = (leadId: string, checked: boolean, index: number, shiftKey: boolean = false) => {
    if (shiftKey && lastClickedIndex !== null) {
      // Shift-select: select all rows between lastClickedIndex and current index
      const startIndex = Math.min(lastClickedIndex, index);
      const endIndex = Math.max(lastClickedIndex, index);
      const idsToSelect = paginatedLeads.slice(startIndex, endIndex + 1).map(l => l.id);

      setSelectedIds(prev => {
        // Merge with existing selection
        const newSet = new Set([...prev, ...idsToSelect]);
        return Array.from(newSet);
      });
    } else {
      // Normal click: toggle single row
      if (checked) {
        setSelectedIds(prev => [...prev, leadId]);
      } else {
        setSelectedIds(prev => prev.filter(id => id !== leadId));
      }
    }

    // Update last clicked index for future shift-selects
    setLastClickedIndex(index);
  };

  // Sort handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Expand/collapse handler
  const toggleExpanded = (leadId: string) => {
    setExpandedIds(prev =>
      prev.includes(leadId)
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  };

  // Delete handler
  const handleDelete = async () => {
    if (selectedIds.length === 0) return;

    setIsDeleting(true);
    try {
      const result = await deleteLeads(selectedIds);

      // Clear selection
      setSelectedIds([]);
      setShowDeleteDialog(false);

      // Refresh the data
      if (onRefresh) {
        onRefresh();
      } else {
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to delete leads:', error);
      alert(`Failed to delete leads: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter reset
  const hasActiveFilters = filters.grade !== 'all' ||
    filters.priority !== 'all' ||
    filters.hasEmail !== 'all' ||
    filters.industry !== '' ||
    filters.city !== '' ||
    filters.project !== '' ||
    filters.search !== '';

  const resetFilters = () => {
    setFilters({
      grade: 'all',
      priority: 'all',
      hasEmail: 'all',
      industry: '',
      city: '',
      project: '',
      search: ''
    });
  };

  // Check if all leads on current page are selected
  const allSelectedOnPage = paginatedLeads.length > 0 &&
    paginatedLeads.every(lead => selectedIds.includes(lead.id));
  const someSelectedOnPage = paginatedLeads.some(lead => selectedIds.includes(lead.id)) && !allSelectedOnPage;

  return (
    <Card>
      <CardHeader className="space-y-3 pb-3">
        {/* Main header row */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Leads</CardTitle>
            <CardDescription className="text-xs">
              {filteredAndSortedLeads.length} found
              {selectedIds.length > 0 && ` · ${selectedIds.length} selected`}
            </CardDescription>
          </div>

          <div className="flex items-center gap-1.5">
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                disabled={loading}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={`h-8 w-8 p-0 ${hasActiveFilters ? 'text-primary' : ''}`}
            >
              <Filter className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Selection action bar - only shows when items selected */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border">
            <span className="text-xs font-medium text-muted-foreground mr-auto">
              {selectedIds.length} selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds([])}
              className="h-7 px-2 text-xs"
            >
              <X className="w-3 h-3 mr-1" />
              Clear
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowReportModal(true)}
              className="h-7 px-2 text-xs"
            >
              <FileText className="w-3 h-3 mr-1" />
              Report
            </Button>
            <Button
              size="sm"
              onClick={() => setShowOutreachModal(true)}
              className="h-7 px-2 text-xs bg-purple-600 hover:bg-purple-700"
            >
              <Sparkles className="w-3 h-3 mr-1" />
              Outreach
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              className="h-7 w-7 p-0"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        )}

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-4 p-4 border rounded-lg bg-muted/50 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Filter Leads</h4>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear All
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
              {/* Search - full width on mobile */}
              <div className="sm:col-span-2 lg:col-span-2 xl:col-span-1">
                <Input
                  placeholder="Search companies..."
                  value={filters.search || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                />
              </div>

              {/* Project Filter */}
              <Select
                value={filters.project || 'all'}
                onValueChange={(value) => setFilters(prev => ({ ...prev, project: value === 'all' ? '' : value }))}
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

              {/* Grade Filter */}
              <Select
                value={filters.grade || 'all'}
                onValueChange={(value) => setFilters(prev => ({ ...prev, grade: value as any }))}
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

              {/* Priority Filter */}
              <Select
                value={filters.priority || 'all'}
                onValueChange={(value) => setFilters(prev => ({ ...prev, priority: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="hot">Hot Leads</SelectItem>
                  <SelectItem value="warm">Warm Leads</SelectItem>
                  <SelectItem value="cold">Cold Leads</SelectItem>
                </SelectContent>
              </Select>

              {/* Email Filter */}
              <Select
                value={filters.hasEmail || 'all'}
                onValueChange={(value) => setFilters(prev => ({ ...prev, hasEmail: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Email Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Leads</SelectItem>
                  <SelectItem value="yes">Has Email</SelectItem>
                  <SelectItem value="no">No Email</SelectItem>
                </SelectContent>
              </Select>

              {/* Industry Filter */}
              <Select
                value={filters.industry || 'all'}
                onValueChange={(value) => setFilters(prev => ({ ...prev, industry: value === 'all' ? '' : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Industries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Industries</SelectItem>
                  {uniqueIndustries.map(industry => (
                    <SelectItem key={industry} value={industry}>
                      {industry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* City Filter */}
              <Select
                value={filters.city || 'all'}
                onValueChange={(value) => setFilters(prev => ({ ...prev, city: value === 'all' ? '' : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Cities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities</SelectItem>
                  {uniqueCities.map(city => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {loading && leads.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading leads...
          </div>
        ) : filteredAndSortedLeads.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {hasActiveFilters ? 'No leads match the selected filters' : 'No leads found'}
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allSelectedOnPage}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all leads on page"
                    />
                  </TableHead>
                  <TableHead className="w-10"></TableHead>
                  <TableHead className="min-w-[150px]">
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
                      onClick={() => handleSort('grade')}
                      className="hover:bg-transparent -ml-3"
                    >
                      Grade
                      {sortField === 'grade' ? (
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
                      onClick={() => handleSort('lead_priority')}
                      className="hover:bg-transparent -ml-3"
                    >
                      Priority
                      {sortField === 'lead_priority' ? (
                        sortDirection === 'asc' ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />
                      ) : (
                        <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">Budget</TableHead>
                  <TableHead className="hidden xl:table-cell">Business Age</TableHead>
                  <TableHead className="hidden xl:table-cell">Premium</TableHead>
                  <TableHead className="hidden md:table-cell">Contact</TableHead>
                  <TableHead className="hidden lg:table-cell">Project</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('created_at')}
                      className="hover:bg-transparent -ml-3"
                    >
                      Analyzed
                      {sortField === 'created_at' ? (
                        sortDirection === 'asc' ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />
                      ) : (
                        <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLeads.map((lead, index) => {
                  const isExpanded = expandedIds.includes(lead.id);
                  const businessIntel = lead.business_intelligence;

                  return (
                    <React.Fragment key={lead.id}>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest('input, button, a')) return;
                          onLeadClick?.(lead);
                        }}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div
                            onClick={(e) => {
                              const isChecked = !selectedIds.includes(lead.id);
                              handleSelectLead(lead.id, isChecked, index, e.shiftKey);
                            }}
                          >
                            <Checkbox
                              checked={selectedIds.includes(lead.id)}
                              aria-label={`Select ${lead.company_name}`}
                            />
                          </div>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleExpanded(lead.id)}
                            className="h-6 w-6 p-0"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{lead.company_name}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {lead.website}
                          </div>
                        </TableCell>
                        <TableCell>
                          <GradeBadge grade={lead.grade} size="sm" />
                        </TableCell>
                        <TableCell>
                          <PriorityBadge priority={lead.lead_priority || 0} size="sm" />
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {lead.budget_likelihood ? (
                            <BudgetIndicatorBadge indicator={lead.budget_likelihood} size="sm" showLabel={false} />
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          {businessIntel?.years_in_business ? (
                            <YearsInBusinessBadge years={businessIntel.years_in_business} size="sm" />
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          {businessIntel?.premium_features && businessIntel.premium_features.length > 0 ? (
                            <PremiumFeaturesBadge
                              count={businessIntel.premium_features.length}
                              features={businessIntel.premium_features}
                              size="sm"
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {lead.contact_email ? (
                            <div className="flex items-center gap-1 text-sm">
                              <MailCheck className="w-3 h-3 text-green-600" />
                              <span className="text-muted-foreground">Email</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">No email</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <span className="text-xs text-muted-foreground">
                            {(lead as any).projects?.name || '—'}
                          </span>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span className="text-xs text-muted-foreground">
                            {lead.analyzed_at ? formatDateTime(lead.analyzed_at) : formatDate(lead.created_at)}
                          </span>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          {lead.url ? (
                            <a
                              href={lead.url.startsWith('http') ? lead.url : `https://${lead.url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                              title="Visit website"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground" title="No website">
                              —
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={12} className="p-0">
                            <div className="p-4 bg-muted/30">
                              <LeadDetailsCard lead={lead} />
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination Controls */}
        {filteredAndSortedLeads.length > 0 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-2 py-4 border-t">
            <div className="flex flex-wrap items-center gap-3">
              {/* Page Size Selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground hidden sm:inline">Rows:</span>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(value) => {
                    setPageSize(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-[65px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Page Info */}
              <div className="text-sm text-muted-foreground">
                {Math.min((currentPage - 1) * pageSize + 1, filteredAndSortedLeads.length)}-
                {Math.min(currentPage * pageSize, filteredAndSortedLeads.length)} of {filteredAndSortedLeads.length}
              </div>
            </div>

            {/* Page Navigation */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {currentPage}/{totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">Prev</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                <span className="hidden sm:inline mr-1">Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="w-[calc(100%-2rem)] max-w-md !top-[5rem] !translate-y-0">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.length} Lead{selectedIds.length !== 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected lead{selectedIds.length !== 1 ? 's' : ''} and all associated analysis data.
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

      {/* Generate Report Modal */}
      <GenerateReportModal
        open={showReportModal}
        onOpenChange={setShowReportModal}
        selectedLeads={leads.filter(l => selectedIds.includes(l.id))}
        onComplete={onRefresh}
      />

      {/* Generate Outreach Modal */}
      <GenerateOutreachModal
        open={showOutreachModal}
        onOpenChange={setShowOutreachModal}
        selectedLeads={leads.filter(l => selectedIds.includes(l.id))}
        onComplete={onRefresh}
      />
    </Card>
  );
}

export default LeadsTable;
