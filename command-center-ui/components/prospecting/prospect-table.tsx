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
      {/* Selection Info */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
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
          <p className="text-xs text-muted-foreground">
            💡 Tip: Hold <kbd className="px-1 py-0.5 text-xs font-semibold border rounded bg-muted">Shift</kbd> and click to select a range
          </p>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSelectionChange([])}
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
              <TableHead>Project</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Date Added</TableHead>
              <TableHead>Industry</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="w-20">Website</TableHead>
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
                  <TableCell>
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

                  <TableCell>
                    {prospect.project_name || (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  <TableCell className="font-medium">
                    <button
                      onClick={() => handleViewDetails(prospect)}
                      className="text-primary hover:underline cursor-pointer text-left"
                    >
                      {prospect.company_name}
                    </button>
                  </TableCell>

                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {prospect.created_at ? (
                      formatDateTime(prospect.created_at)
                    ) : (
                      <span className="text-muted-foreground">—</span>
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
                    {prospect.google_rating ? (
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{prospect.google_rating.toFixed(1)}</span>
                        {prospect.google_review_count && (
                          <span className="text-xs text-muted-foreground">
                            ({prospect.google_review_count})
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
