'use client';

/**
 * Prospect Table Component
 * Displays prospects with selection checkboxes
 */

import { useState, useRef } from 'react';
import { CheckSquare, Square, Star, ExternalLink, Trash2 } from 'lucide-react';
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
import { formatPhone, formatDateTime } from '@/lib/utils/format';
import { deleteProspects } from '@/lib/api/prospecting';
import { ProspectDetailsModal } from './prospect-details-modal';
import type { Prospect } from '@/lib/types';

interface ProspectTableProps {
  prospects: Prospect[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onDeleteComplete?: () => void;
  loading?: boolean;
}

export function ProspectTable({
  prospects,
  selectedIds,
  onSelectionChange,
  onDeleteComplete,
  loading
}: ProspectTableProps) {
  const lastClickedIndexRef = useRef<number | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const isAllSelected = prospects.length > 0 && selectedIds.length === prospects.length;
  const isSomeSelected = selectedIds.length > 0 && !isAllSelected;

  const handleViewDetails = (prospect: Prospect) => {
    setSelectedProspect(prospect);
    setShowDetailsModal(true);
  };

  const handleSelectAll = () => {
    if (isAllSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(prospects.map(p => p.id));
    }
  };

  const handleSelectOne = (id: string, index: number, shiftKey: boolean = false) => {
    // Shift+Click: Select range
    if (shiftKey && lastClickedIndexRef.current !== null) {
      const start = Math.min(lastClickedIndexRef.current, index);
      const end = Math.max(lastClickedIndexRef.current, index);

      // Get all IDs in the range
      const rangeIds = prospects.slice(start, end + 1).map(p => p.id);

      // Add range to selection (union with existing selection)
      const newSelection = Array.from(new Set([...selectedIds, ...rangeIds]));
      onSelectionChange(newSelection);
    } else {
      // Normal click: Toggle individual selection
      if (selectedIds.includes(id)) {
        onSelectionChange(selectedIds.filter(sid => sid !== id));
      } else {
        onSelectionChange([...selectedIds, id]);
      }
    }

    // Update last clicked index
    lastClickedIndexRef.current = index;
  };

  const handleDelete = async () => {
    if (selectedIds.length === 0) return;

    setIsDeleting(true);
    try {
      await deleteProspects(selectedIds);

      // Clear selection
      onSelectionChange([]);
      setShowDeleteDialog(false);

      // Notify parent to refresh
      onDeleteComplete?.();
    } catch (error) {
      console.error('Failed to delete prospects:', error);
      alert(`Failed to delete prospects: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return <TableSkeleton rows={5} columns={9} />;
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
      {/* Selection Info - Compact for mobile */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs sm:text-sm text-muted-foreground">
          {selectedIds.length > 0 ? (
            <><span className="font-medium text-foreground">{selectedIds.length}</span>/{prospects.length} selected</>
          ) : (
            <>{prospects.length} prospects</>
          )}
        </p>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSelectionChange([])}
              className="h-7 text-xs px-2"
            >
              Clear
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              className="h-7 text-xs px-2"
            >
              <Trash2 className="w-3.5 h-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Delete</span>
              <span className="sm:hidden">({selectedIds.length})</span>
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 px-2">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                  className={isSomeSelected ? 'data-[state=checked]:bg-muted' : ''}
                />
              </TableHead>
              <TableHead className="hidden lg:table-cell">Project</TableHead>
              <TableHead className="min-w-[120px]">Company</TableHead>
              <TableHead className="hidden xl:table-cell">Date Added</TableHead>
              <TableHead className="hidden md:table-cell">Industry</TableHead>
              <TableHead className="hidden lg:table-cell">Location</TableHead>
              <TableHead className="w-16">Rating</TableHead>
              <TableHead className="hidden sm:table-cell">Contact</TableHead>
              <TableHead className="w-14">Site</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {prospects.map((prospect, index) => {
              const isSelected = selectedIds.includes(prospect.id);

              return (
                <TableRow
                  key={prospect.id}
                  className={isSelected ? 'bg-muted/50' : ''}
                >
                  <TableCell className="px-2">
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectOne(prospect.id, index, e.shiftKey);
                      }}
                      className="flex items-center"
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                    >
                      <Checkbox
                        checked={isSelected}
                        aria-label={`Select ${prospect.company_name}`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleSelectOne(prospect.id, index, e.shiftKey);
                        }}
                      />
                    </div>
                  </TableCell>

                  <TableCell className="hidden lg:table-cell">
                    {prospect.project_name || (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  <TableCell className="font-medium">
                    <button
                      onClick={() => handleViewDetails(prospect)}
                      className="text-primary hover:underline cursor-pointer text-left text-sm"
                    >
                      {prospect.company_name}
                    </button>
                  </TableCell>

                  <TableCell className="hidden xl:table-cell text-sm text-muted-foreground whitespace-nowrap">
                    {prospect.created_at ? (
                      formatDateTime(prospect.created_at)
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  <TableCell className="hidden md:table-cell text-sm">
                    {prospect.industry || (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  <TableCell className="hidden lg:table-cell text-sm">
                    {prospect.city && prospect.state ? (
                      <span>{prospect.city}, {prospect.state}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  <TableCell>
                    {prospect.google_rating ? (
                      <div className="flex items-center gap-0.5">
                        <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">{prospect.google_rating.toFixed(1)}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>

                  <TableCell className="hidden sm:table-cell">
                    {prospect.contact_email ? (
                      <a
                        href={`mailto:${prospect.contact_email}`}
                        className="text-xs text-primary hover:underline block truncate max-w-[150px]"
                        title={prospect.contact_email}
                      >
                        {prospect.contact_email}
                      </a>
                    ) : prospect.contact_phone ? (
                      <span className="text-xs text-muted-foreground">
                        {formatPhone(prospect.contact_phone)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>

                  <TableCell>
                    {prospect.website ? (
                      <a
                        href={prospect.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                        title={prospect.website}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
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
            <AlertDialogTitle>Delete {selectedIds.length} Prospect{selectedIds.length !== 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected prospect{selectedIds.length !== 1 ? 's' : ''} from the database.
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

      {/* Prospect Details Modal */}
      <ProspectDetailsModal
        prospect={selectedProspect}
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
      />
    </div>
  );
}

export default ProspectTable;
