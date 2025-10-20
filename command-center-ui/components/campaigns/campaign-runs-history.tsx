'use client';

/**
 * Campaign Runs History
 * Display execution history for campaigns
 */

import { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  DollarSign,
  ChevronDown,
  ChevronRight,
  Users,
  FileText,
  Mail
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible';
import { formatDate, formatCurrency } from '@/lib/utils/format';
import type { CampaignRun } from '@/lib/types';

interface CampaignRunsHistoryProps {
  runs: CampaignRun[];
  loading?: boolean;
}

export function CampaignRunsHistory({ runs, loading }: CampaignRunsHistoryProps) {
  const [expandedRun, setExpandedRun] = useState<string | null>(null);

  const toggleRun = (runId: string) => {
    setExpandedRun(expandedRun === runId ? null : runId);
  };

  const getStatusIcon = (status: CampaignRun['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-destructive" />;
      case 'partial':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'running':
        return <Clock className="w-4 h-4 text-blue-500 animate-pulse" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: CampaignRun['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Success</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'partial':
        return <Badge variant="secondary" className="bg-amber-500 text-white">Partial</Badge>;
      case 'running':
        return <Badge variant="outline" className="border-blue-500 text-blue-500">Running</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getDuration = (run: CampaignRun) => {
    if (!run.startedAt) return '—';
    if (!run.completedAt && run.status === 'running') return 'In progress...';
    if (!run.completedAt) return '—';

    const start = new Date(run.startedAt);
    const end = new Date(run.completedAt);
    const diffMs = end.getTime() - start.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);

    if (diffMins > 0) {
      const secs = diffSecs % 60;
      return `${diffMins}m ${secs}s`;
    }
    return `${diffSecs}s`;
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="mt-2 text-sm text-muted-foreground">Loading run history...</p>
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-border rounded-lg">
        <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground mb-2">No runs yet</p>
        <p className="text-sm text-muted-foreground">
          This campaign hasn't been executed yet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Started</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Trigger</TableHead>
              <TableHead>Results</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.map((run) => {
              const isExpanded = expandedRun === run.id;
              const hasResults = run.results && Object.keys(run.results).length > 0;
              const hasErrors = run.errors && run.errors.length > 0;

              return (
                <Collapsible
                  key={run.id}
                  open={isExpanded}
                  onOpenChange={() => toggleRun(run.id)}
                  asChild
                >
                  <>
                    <TableRow className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="p-0 w-8 h-8">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                      </TableCell>

                      <TableCell>
                        <div className="text-sm">
                          <div>{formatDate(run.startedAt)}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(run.startedAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <span className="text-sm font-mono">{getDuration(run)}</span>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {run.triggerType === 'scheduled' ? '⏰ Scheduled' : '▶️ Manual'}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center space-x-3 text-sm">
                          {run.results?.prospects_generated !== undefined && (
                            <div className="flex items-center space-x-1">
                              <Users className="w-3 h-3 text-muted-foreground" />
                              <span>{run.results.prospects_generated}</span>
                            </div>
                          )}
                          {run.results?.leads_analyzed !== undefined && (
                            <div className="flex items-center space-x-1">
                              <FileText className="w-3 h-3 text-muted-foreground" />
                              <span>{run.results.leads_analyzed}</span>
                            </div>
                          )}
                          {run.results?.emails_composed !== undefined && (
                            <div className="flex items-center space-x-1">
                              <Mail className="w-3 h-3 text-muted-foreground" />
                              <span>{run.results.emails_composed}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <DollarSign className="w-3 h-3 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {formatCurrency(parseFloat(run.totalCost))}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(run.status)}
                          {getStatusBadge(run.status)}
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Expanded Details */}
                    <TableRow>
                      <TableCell colSpan={7} className="p-0">
                        <CollapsibleContent>
                          <div className="px-6 py-4 bg-muted/30 border-t">
                            <div className="space-y-4">
                              {/* Steps Summary */}
                              <div>
                                <h5 className="text-sm font-semibold mb-2">Steps</h5>
                                <div className="flex items-center space-x-4 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Completed:</span>
                                    <span className="ml-2 font-medium text-green-600">
                                      {run.stepsCompleted}
                                    </span>
                                  </div>
                                  {run.stepsFailed > 0 && (
                                    <div>
                                      <span className="text-muted-foreground">Failed:</span>
                                      <span className="ml-2 font-medium text-destructive">
                                        {run.stepsFailed}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Detailed Results */}
                              {hasResults && (
                                <div>
                                  <h5 className="text-sm font-semibold mb-2">Results</h5>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {Object.entries(run.results!).map(([key, value]) => (
                                      <div key={key} className="text-sm">
                                        <div className="text-muted-foreground capitalize">
                                          {key.replace(/_/g, ' ')}:
                                        </div>
                                        <div className="font-medium">{String(value)}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Errors */}
                              {hasErrors && (
                                <div>
                                  <h5 className="text-sm font-semibold mb-2 text-destructive flex items-center space-x-2">
                                    <AlertTriangle className="w-4 h-4" />
                                    <span>Errors</span>
                                  </h5>
                                  <ul className="space-y-1">
                                    {run.errors!.map((error, i) => (
                                      <li key={i} className="text-sm text-muted-foreground">
                                        • {error}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        </CollapsibleContent>
                      </TableCell>
                    </TableRow>
                  </>
                </Collapsible>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
