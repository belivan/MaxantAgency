'use client';

/**
 * Prospect Table Component
 * Displays prospects with selection checkboxes
 */

import { useState } from 'react';
import { CheckSquare, Square, Star, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { TableSkeleton } from '@/components/shared/loading-spinner';
import { formatPhone } from '@/lib/utils/format';
import type { Prospect } from '@/lib/types';

interface ProspectTableProps {
  prospects: Prospect[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  loading?: boolean;
}

export function ProspectTable({
  prospects,
  selectedIds,
  onSelectionChange,
  loading
}: ProspectTableProps) {
  const isAllSelected = prospects.length > 0 && selectedIds.length === prospects.length;
  const isSomeSelected = selectedIds.length > 0 && !isAllSelected;

  const handleSelectAll = () => {
    if (isAllSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(prospects.map(p => p.id));
    }
  };

  const handleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(sid => sid !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  if (loading) {
    return <TableSkeleton rows={5} columns={6} />;
  }

  if (prospects.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-border rounded-lg">
        <p className="text-muted-foreground mb-2">No prospects generated yet</p>
        <p className="text-sm text-muted-foreground">
          Configure settings and click "Generate Prospects" to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Selection Info */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {selectedIds.length > 0 ? (
            <>
              <span className="font-medium text-foreground">{selectedIds.length}</span> of{' '}
              <span className="font-medium text-foreground">{prospects.length}</span> selected
            </>
          ) : (
            <>Showing {prospects.length} prospects</>
          )}
        </p>

        {selectedIds.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSelectionChange([])}
          >
            Clear Selection
          </Button>
        )}
      </div>

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
                  className={isSomeSelected ? 'data-[state=checked]:bg-muted' : ''}
                />
              </TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Industry</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="w-20">Website</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {prospects.map((prospect) => {
              const isSelected = selectedIds.includes(prospect.id);

              return (
                <TableRow
                  key={prospect.id}
                  className={isSelected ? 'bg-muted/50' : ''}
                >
                  <TableCell>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleSelectOne(prospect.id)}
                      aria-label={`Select ${prospect.company_name}`}
                    />
                  </TableCell>

                  <TableCell className="font-medium">
                    {prospect.company_name}
                    {prospect.verified && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        Verified
                      </Badge>
                    )}
                  </TableCell>

                  <TableCell>
                    {prospect.industry || (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  <TableCell>
                    {prospect.city && prospect.state ? (
                      <span>{prospect.city}, {prospect.state}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  <TableCell>
                    {prospect.rating ? (
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{prospect.rating.toFixed(1)}</span>
                        {prospect.review_count && (
                          <span className="text-xs text-muted-foreground">
                            ({prospect.review_count})
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  <TableCell>
                    {prospect.contact_email ? (
                      <div className="space-y-1">
                        <a
                          href={`mailto:${prospect.contact_email}`}
                          className="text-xs text-primary hover:underline block"
                        >
                          {prospect.contact_email}
                        </a>
                        {prospect.contact_phone && (
                          <div className="text-xs text-muted-foreground">
                            {formatPhone(prospect.contact_phone)}
                          </div>
                        )}
                      </div>
                    ) : prospect.contact_phone ? (
                      <div className="text-xs text-muted-foreground">
                        {formatPhone(prospect.contact_phone)}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  <TableCell>
                    <a
                      href={prospect.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center space-x-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span className="text-xs">Visit</span>
                    </a>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default ProspectTable;
