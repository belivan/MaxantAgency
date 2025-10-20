'use client';

/**
 * Leads Table Component
 * Advanced table for viewing and managing analyzed leads
 */

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mail,
  MailCheck,
  ExternalLink,
  ArrowUpDown,
  Filter,
  X
} from 'lucide-react';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GradeBadge } from './grade-badge';
import { formatDate } from '@/lib/utils/format';
import type { Lead, LeadGrade } from '@/lib/types';

interface LeadsTableProps {
  leads: Lead[];
  loading?: boolean;
  onLeadClick?: (lead: Lead) => void;
  onComposeEmails?: (leadIds: string[]) => void;
}

type SortField = 'company_name' | 'grade' | 'overall_score' | 'created_at';
type SortDirection = 'asc' | 'desc';

interface LeadFilters {
  grade?: LeadGrade | 'all';
  hasEmail?: 'all' | 'yes' | 'no';
  industry?: string;
  city?: string;
  search?: string;
}

export function LeadsTable({ leads, loading, onLeadClick, onComposeEmails }: LeadsTableProps) {
  const router = useRouter();

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('overall_score');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Filter state
  const [filters, setFilters] = useState<LeadFilters>({
    grade: 'all',
    hasEmail: 'all',
    industry: '',
    city: '',
    search: ''
  });

  const [showFilters, setShowFilters] = useState(false);

  // Get unique values for filters
  const uniqueIndustries = useMemo(() => {
    const industries = new Set(leads.map(l => l.industry).filter(Boolean));
    return Array.from(industries).sort();
  }, [leads]);

  const uniqueCities = useMemo(() => {
    const cities = new Set(leads.map(l => l.city).filter(Boolean));
    return Array.from(cities).sort();
  }, [leads]);

  // Apply filters and sorting
  const filteredAndSortedLeads = useMemo(() => {
    let result = [...leads];

    // Apply filters
    if (filters.grade && filters.grade !== 'all') {
      result = result.filter(l => l.grade === filters.grade);
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

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredAndSortedLeads.map(l => l.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectLead = (leadId: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, leadId]);
    } else {
      setSelectedIds(prev => prev.filter(id => id !== leadId));
    }
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

  // Filter reset
  const hasActiveFilters = filters.grade !== 'all' ||
    filters.hasEmail !== 'all' ||
    filters.industry !== '' ||
    filters.city !== '' ||
    filters.search !== '';

  const resetFilters = () => {
    setFilters({
      grade: 'all',
      hasEmail: 'all',
      industry: '',
      city: '',
      search: ''
    });
  };

  const allSelected = filteredAndSortedLeads.length > 0 &&
    selectedIds.length === filteredAndSortedLeads.length;
  const someSelected = selectedIds.length > 0 && !allSelected;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Leads</CardTitle>
            <CardDescription>
              {filteredAndSortedLeads.length} lead{filteredAndSortedLeads.length !== 1 ? 's' : ''} found
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedIds([])}
                >
                  Clear Selection ({selectedIds.length})
                </Button>
                <Button
                  size="sm"
                  onClick={() => onComposeEmails?.(selectedIds)}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Compose Emails ({selectedIds.length})
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>
        </div>

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

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {/* Search */}
              <Input
                placeholder="Search companies..."
                value={filters.search || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />

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
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all leads"
                    />
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('company_name')}
                      className="hover:bg-transparent"
                    >
                      Company
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('grade')}
                      className="hover:bg-transparent"
                    >
                      Grade
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('overall_score')}
                      className="hover:bg-transparent"
                    >
                      Score
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('created_at')}
                      className="hover:bg-transparent"
                    >
                      Analyzed
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedLeads.map(lead => (
                  <TableRow
                    key={lead.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('input, button, a')) return;
                      onLeadClick?.(lead);
                    }}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.includes(lead.id)}
                        onCheckedChange={(checked) => handleSelectLead(lead.id, checked as boolean)}
                        aria-label={`Select ${lead.company_name}`}
                      />
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
                      <span className="font-mono text-sm">{lead.overall_score}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{lead.industry || '—'}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {lead.city && lead.state ? `${lead.city}, ${lead.state}` : lead.city || lead.state || '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {lead.contact_email ? (
                        <div className="flex items-center gap-1 text-sm">
                          <MailCheck className="w-3 h-3 text-green-600" />
                          <span className="text-muted-foreground">Email</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">No email</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(lead.created_at)}
                      </span>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <a
                        href={lead.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
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

export default LeadsTable;
