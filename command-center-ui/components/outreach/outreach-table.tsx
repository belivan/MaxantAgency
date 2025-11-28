'use client';

/**
 * Outreach Table Component
 * Shows companies with generated outreach - click to view details
 */

import { useState, useMemo } from 'react';
import {
  Mail,
  MessageCircle,
  ExternalLink,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Filter,
  X
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { formatDateTime } from '@/lib/utils/format';
import type { Email, SocialMessage } from '@/lib/types';

// Grouped outreach data by company
export interface OutreachCompany {
  lead_id: string;
  company_name: string;
  website: string;
  industry?: string | null;
  contact_email?: string | null;
  emails: Email[];
  socialMessages: SocialMessage[];
  latestActivity: string;
  totalVariations: number;
}

interface OutreachTableProps {
  emails: Email[];
  socialMessages: SocialMessage[];
  loading?: boolean;
  onCompanyClick?: (company: OutreachCompany) => void;
  onRefresh?: () => void;
}

export function OutreachTable({
  emails,
  socialMessages,
  loading = false,
  onCompanyClick,
  onRefresh
}: OutreachTableProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Group emails and social messages by lead_id/company
  const groupedOutreach = useMemo(() => {
    const companyMap = new Map<string, OutreachCompany>();

    // Process emails
    emails.forEach(email => {
      const key = email.lead_id || email.company_name;
      if (!companyMap.has(key)) {
        companyMap.set(key, {
          lead_id: email.lead_id,
          company_name: email.company_name,
          website: email.url,
          industry: email.industry,
          contact_email: email.contact_email,
          emails: [],
          socialMessages: [],
          latestActivity: email.created_at,
          totalVariations: 0
        });
      }
      const company = companyMap.get(key)!;
      company.emails.push(email);
      company.totalVariations++;
      if (new Date(email.created_at) > new Date(company.latestActivity)) {
        company.latestActivity = email.created_at;
      }
    });

    // Process social messages
    socialMessages.forEach(msg => {
      const key = msg.lead_id || msg.company_name;
      if (!companyMap.has(key)) {
        companyMap.set(key, {
          lead_id: msg.lead_id,
          company_name: msg.company_name,
          website: msg.url,
          industry: msg.industry,
          contact_email: msg.contact_email,
          emails: [],
          socialMessages: [],
          latestActivity: msg.created_at,
          totalVariations: 0
        });
      }
      const company = companyMap.get(key)!;
      company.socialMessages.push(msg);
      company.totalVariations++;
      if (new Date(msg.created_at) > new Date(company.latestActivity)) {
        company.latestActivity = msg.created_at;
      }
    });

    // Convert to array and sort by latest activity
    return Array.from(companyMap.values()).sort(
      (a, b) => new Date(b.latestActivity).getTime() - new Date(a.latestActivity).getTime()
    );
  }, [emails, socialMessages]);

  // Filter companies
  const filteredCompanies = useMemo(() => {
    if (!searchQuery) return groupedOutreach;
    const query = searchQuery.toLowerCase();
    return groupedOutreach.filter(
      company =>
        company.company_name.toLowerCase().includes(query) ||
        company.website.toLowerCase().includes(query) ||
        company.industry?.toLowerCase().includes(query)
    );
  }, [groupedOutreach, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredCompanies.length / pageSize);
  const paginatedCompanies = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredCompanies.slice(startIndex, startIndex + pageSize);
  }, [filteredCompanies, currentPage, pageSize]);

  const handleCopyEmail = async (email: string, id: string) => {
    try {
      await navigator.clipboard.writeText(email);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const hasActiveFilters = searchQuery !== '';

  if (loading && groupedOutreach.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
              Outreach
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {filteredCompanies.length} compan{filteredCompanies.length !== 1 ? 'ies' : 'y'} with outreach
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={loading}
                className="h-8"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline ml-1.5">Refresh</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={`h-8 ${hasActiveFilters ? 'border-primary' : ''}`}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline ml-1.5">Filter</span>
            </Button>
          </div>
        </div>

        {/* Search Filter */}
        {showFilters && (
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search companies..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="h-8 text-sm max-w-xs"
            />
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="h-8"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent>
        {groupedOutreach.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No outreach generated yet</p>
            <p className="text-sm mt-2">
              Select leads and generate outreach from the Leads page
            </p>
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No companies match your search</p>
          </div>
        ) : (
          <>
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">Company</TableHead>
                    <TableHead className="hidden md:table-cell">Industry</TableHead>
                    <TableHead className="w-24">Emails</TableHead>
                    <TableHead className="w-24">Social</TableHead>
                    <TableHead className="hidden sm:table-cell">Contact</TableHead>
                    <TableHead className="hidden lg:table-cell">Last Updated</TableHead>
                    <TableHead className="w-10">Site</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedCompanies.map((company) => (
                    <TableRow
                      key={company.lead_id || company.company_name}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => onCompanyClick?.(company)}
                    >
                      <TableCell>
                        <div className="font-medium text-sm">{company.company_name}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[180px]">
                          {company.website}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {company.industry ? (
                          <Badge variant="outline" className="text-xs">
                            {company.industry}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-blue-500" />
                          <span className="text-sm font-medium">{company.emails.length}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <MessageCircle className="w-3.5 h-3.5 text-purple-500" />
                          <span className="text-sm font-medium">{company.socialMessages.length}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell" onClick={(e) => e.stopPropagation()}>
                        {company.contact_email ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => handleCopyEmail(company.contact_email!, company.lead_id)}
                          >
                            {copiedId === company.lead_id ? (
                              <Check className="w-3 h-3 text-green-500 mr-1" />
                            ) : (
                              <Copy className="w-3 h-3 mr-1" />
                            )}
                            <span className="truncate max-w-[120px]">{company.contact_email}</span>
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(company.latestActivity)}
                        </span>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {company.website && (
                          <a
                            href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-2 py-3 border-t mt-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground hidden sm:inline">Rows:</span>
                  <Select
                    value={pageSize.toString()}
                    onValueChange={(value) => {
                      setPageSize(Number(value));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="h-7 w-[60px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-muted-foreground">
                    {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredCompanies.length)} of {filteredCompanies.length}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-7 px-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground px-2">
                    {currentPage}/{totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="h-7 px-2"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default OutreachTable;
