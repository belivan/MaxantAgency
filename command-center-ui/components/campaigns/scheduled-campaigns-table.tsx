'use client';

/**
 * Scheduled Campaigns Table
 * Display and manage automated campaigns
 */

import { useState } from 'react';
import {
  Play,
  Pause,
  Trash2,
  Clock,
  Calendar,
  DollarSign,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { formatDate, formatCurrency } from '@/lib/utils/format';
import type { Campaign } from '@/lib/types';

interface ScheduledCampaignsTableProps {
  campaigns: Campaign[];
  onRunNow: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onDelete: (id: string) => void;
  onViewRuns: (id: string) => void;
  loading?: boolean;
}

export function ScheduledCampaignsTable({
  campaigns,
  onRunNow,
  onPause,
  onResume,
  onDelete,
  onViewRuns,
  loading
}: ScheduledCampaignsTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<string | null>(null);

  const handleDeleteClick = (id: string) => {
    setCampaignToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (campaignToDelete) {
      onDelete(campaignToDelete);
      setCampaignToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const getNextRunCountdown = (nextRun?: string) => {
    if (!nextRun) return null;

    const now = new Date();
    const next = new Date(nextRun);
    const diffMs = next.getTime() - now.getTime();

    if (diffMs < 0) return 'Overdue';

    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `in ${diffDays}d ${diffHours % 24}h`;
    if (diffHours > 0) return `in ${diffHours}h ${diffMins % 60}m`;
    if (diffMins > 0) return `in ${diffMins}m`;
    return 'Soon';
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="mt-2 text-sm text-muted-foreground">Loading campaigns...</p>
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-border rounded-lg">
        <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground mb-2">No scheduled campaigns yet</p>
        <p className="text-sm text-muted-foreground">
          Click "Schedule Campaign" to create an automated campaign
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campaign</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead>Last Run</TableHead>
              <TableHead>Next Run</TableHead>
              <TableHead>Stats</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[200px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.map((campaign) => {
              const countdown = getNextRunCountdown(campaign.nextRun);
              const isActive = campaign.status === 'active';
              const isPaused = campaign.status === 'paused';

              return (
                <TableRow key={campaign.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{campaign.name}</div>
                      {campaign.description && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {campaign.description}
                        </div>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center space-x-2 text-sm">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="font-mono text-xs">
                        {campaign.schedule || 'Not scheduled'}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell>
                    {campaign.lastRun ? (
                      <div className="text-sm">
                        <div>{formatDate(campaign.lastRun)}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(campaign.lastRun).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">Never</span>
                    )}
                  </TableCell>

                  <TableCell>
                    {isActive && campaign.nextRun ? (
                      <div>
                        <div className="text-sm font-medium">{countdown}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(campaign.nextRun).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>

                  <TableCell>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center space-x-2">
                        <Play className="w-3 h-3 text-muted-foreground" />
                        <span>{campaign.totalRuns} runs</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <DollarSign className="w-3 h-3 text-muted-foreground" />
                        <span>{formatCurrency(parseFloat(campaign.totalCost))}</span>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    {isActive && (
                      <Badge variant="default" className="bg-green-500">
                        Active
                      </Badge>
                    )}
                    {isPaused && (
                      <Badge variant="secondary">Paused</Badge>
                    )}
                    {campaign.status === 'completed' && (
                      <Badge variant="outline">Completed</Badge>
                    )}
                    {campaign.status === 'failed' && (
                      <Badge variant="destructive">Failed</Badge>
                    )}
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRunNow(campaign.id)}
                        title="Run now"
                      >
                        <Play className="w-4 h-4" />
                      </Button>

                      {isActive ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onPause(campaign.id)}
                          title="Pause"
                        >
                          <Pause className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onResume(campaign.id)}
                          title="Resume"
                          className="text-green-600 hover:text-green-700"
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewRuns(campaign.id)}
                        title="View runs"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(campaign.id)}
                        title="Delete"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <span>Delete Campaign?</span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the campaign and all its run history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
