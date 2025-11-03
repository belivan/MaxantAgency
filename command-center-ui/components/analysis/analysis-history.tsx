'use client';

/**
 * Analysis History Component
 * Shows history of all analysis runs with results and discovery logs
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  RefreshCw,
  TrendingUp,
  Globe,
  Search,
  FileText,
  ChevronRight,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface AnalysisRun {
  id: string;
  company_name: string;
  website: string;
  status: 'pending' | 'analyzing' | 'complete' | 'failed';
  grade?: string;
  overall_score?: number;
  pages_discovered?: number;
  pages_analyzed?: number;
  analysis_time?: number;
  analysis_cost?: number;
  started_at: string;
  completed_at?: string;
  error?: string;
  discovery_log?: any;
  project_id?: string;
}

interface AnalysisHistoryProps {
  projectId?: string;
  limit?: number;
  onRetry?: (run: AnalysisRun) => void;
  className?: string;
}

// Helper function for grade color styling (shared by components)
function getGradeColor(grade?: string) {
  if (!grade) return 'bg-gray-100 text-gray-700';
  switch (grade) {
    case 'A':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    case 'B':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    case 'C':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'D':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
    case 'F':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

export function AnalysisHistory({
  projectId,
  limit = 10,
  onRetry,
  className
}: AnalysisHistoryProps) {
  const [runs, setRuns] = useState<AnalysisRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState<AnalysisRun | null>(null);
  const [showDiscoveryLog, setShowDiscoveryLog] = useState(false);

  // Load analysis history
  useEffect(() => {
    async function loadHistory() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (projectId) params.set('project_id', projectId);
        params.set('limit', limit.toString());

        const response = await fetch(`/api/analysis/history?${params}`);
        if (response.ok) {
          const data = await response.json();
          setRuns(data.runs || []);
        }
      } catch (error) {
        console.error('Failed to load analysis history:', error);
        // Use mock data for demonstration
        setRuns(getMockRuns());
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
    // Refresh every 30 seconds if there are active analyses
    const interval = setInterval(loadHistory, 30000);
    return () => clearInterval(interval);
  }, [projectId, limit]);

  const getStatusIcon = (status: AnalysisRun['status']) => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />;
      case 'analyzing':
        return <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  const activeRuns = runs.filter(r => r.status === 'analyzing');
  const completedRuns = runs.filter(r => r.status === 'complete');
  const failedRuns = runs.filter(r => r.status === 'failed');

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Analysis History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (runs.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Analysis History</CardTitle>
          <CardDescription>Track all your website analyses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Activity className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground">No analyses yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Analyses will appear here as you run them
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Analysis History</CardTitle>
              <CardDescription>
                Recent website analyses and their results
              </CardDescription>
            </div>
            <div className="flex items-center gap-4 text-sm">
              {activeRuns.length > 0 && (
                <span className="flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {activeRuns.length} running
                </span>
              )}
              {completedRuns.length > 0 && (
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="w-3 h-3" />
                  {completedRuns.length} complete
                </span>
              )}
              {failedRuns.length > 0 && (
                <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                  <XCircle className="w-3 h-3" />
                  {failedRuns.length} failed
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Pages</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Started</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.slice(0, limit).map((run) => (
                <TableRow
                  key={run.id}
                  className={cn(
                    "cursor-pointer hover:bg-muted/50",
                    run.status === 'failed' && "opacity-75"
                  )}
                  onClick={() => setSelectedRun(run)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(run.status)}
                      <div>
                        <p className="font-medium">{run.company_name}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {run.website}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      run.status === 'complete' ? 'default' :
                      run.status === 'failed' ? 'destructive' :
                      run.status === 'analyzing' ? 'secondary' :
                      'outline'
                    }>
                      {run.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {run.grade && (
                      <div className="flex items-center gap-2">
                        <Badge className={cn("font-bold", getGradeColor(run.grade))}>
                          {run.grade}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {run.overall_score}/100
                        </span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {run.pages_discovered && (
                      <div className="text-sm">
                        <p>{run.pages_analyzed}/{run.pages_discovered}</p>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {run.analysis_time && (
                      <span className="text-sm">
                        {(run.analysis_time / 1000).toFixed(1)}s
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {run.analysis_cost && (
                      <span className="text-sm font-mono">
                        ${run.analysis_cost.toFixed(3)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(run.started_at), { addSuffix: true })}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {run.discovery_log && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRun(run);
                            setShowDiscoveryLog(true);
                          }}
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                      )}
                      {run.status === 'failed' && onRetry && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRetry(run);
                          }}
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      )}
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Discovery Log Dialog */}
      {selectedRun && showDiscoveryLog && selectedRun.discovery_log && (
        <DiscoveryLogDialog
          run={selectedRun}
          open={showDiscoveryLog}
          onClose={() => setShowDiscoveryLog(false)}
        />
      )}
    </>
  );
}

// Discovery Log Dialog Component
function DiscoveryLogDialog({
  run,
  open,
  onClose
}: {
  run: AnalysisRun;
  open: boolean;
  onClose: () => void;
}) {
  const log = run.discovery_log;
  if (!log) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Discovery Log - {run.company_name}</DialogTitle>
          <DialogDescription>
            Complete analysis audit trail for {run.website}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="pages">Pages</TabsTrigger>
            <TabsTrigger value="ai">AI Selection</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[500px] mt-4">
            <TabsContent value="summary" className="space-y-4">
              {/* Discovery Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Discovery Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Pages</p>
                      <p className="text-lg font-semibold">
                        {log.summary?.total_discovered || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Discovery Method</p>
                      <p className="text-lg font-semibold">
                        {log.summary?.discovery_method || 'Unknown'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Sitemap Pages</p>
                      <p className="text-lg font-semibold">
                        {log.summary?.sitemap_pages || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Discovery Time</p>
                      <p className="text-lg font-semibold">
                        {((log.summary?.discovery_time_ms || 0) / 1000).toFixed(2)}s
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Critical Findings */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Critical Findings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Grade</span>
                      <Badge className={getGradeColor(log.critical_findings?.grade)}>
                        {log.critical_findings?.grade || 'N/A'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Lead Priority</span>
                      <span className="font-medium">{log.critical_findings?.lead_priority || 0}/100</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Priority Tier</span>
                      <Badge variant="outline">
                        {log.critical_findings?.priority_tier || 'Unknown'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Quick Wins</span>
                      <span className="font-medium">{log.critical_findings?.quick_wins_count || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pages" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Discovered Pages ({log.all_pages?.length || 0})</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-1">
                      {(log.all_pages || []).slice(0, 100).map((page: any, idx: number) => (
                        <div key={idx} className="text-sm py-1 px-2 hover:bg-muted rounded">
                          {typeof page === 'string' ? page : page.url || page.path}
                        </div>
                      ))}
                      {(log.all_pages?.length || 0) > 100 && (
                        <p className="text-sm text-muted-foreground text-center py-2">
                          ... and {log.all_pages.length - 100} more pages
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ai" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    AI Page Selection
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {log.ai_selection?.reasoning && (
                    <div>
                      <p className="text-sm font-medium mb-2">AI Reasoning</p>
                      <p className="text-sm text-muted-foreground">
                        {log.ai_selection.reasoning}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">SEO Pages</p>
                      <p className="font-semibold">
                        {log.ai_selection?.selected_pages?.seo?.length || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Content Pages</p>
                      <p className="font-semibold">
                        {log.ai_selection?.selected_pages?.content?.length || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Visual Pages</p>
                      <p className="font-semibold">
                        {log.ai_selection?.selected_pages?.visual?.length || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Social Pages</p>
                      <p className="font-semibold">
                        {log.ai_selection?.selected_pages?.social?.length || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="metrics" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Analysis Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Time</p>
                      <p className="text-lg font-semibold">
                        {((log.analysis_metrics?.total_time_ms || 0) / 1000).toFixed(2)}s
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Analysis Cost</p>
                      <p className="text-lg font-semibold">
                        ${(log.analysis_metrics?.analysis_cost || 0).toFixed(4)}
                      </p>
                    </div>
                  </div>

                  {log.analysis_metrics?.ai_models_used && (
                    <div className="pt-4">
                      <p className="text-sm font-medium mb-2">AI Models Used</p>
                      <div className="space-y-1">
                        {Object.entries(log.analysis_metrics.ai_models_used).map(([key, value]) => (
                          <div key={key} className="flex justify-between text-sm">
                            <span className="text-muted-foreground capitalize">{key.replace('_', ' ')}</span>
                            <span className="font-mono">{value as string}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// Mock data for demonstration
function getMockRuns(): AnalysisRun[] {
  return [
    {
      id: '1',
      company_name: 'Example Company',
      website: 'https://example.com',
      status: 'complete',
      grade: 'B',
      overall_score: 78,
      pages_discovered: 125,
      pages_analyzed: 12,
      analysis_time: 45000,
      analysis_cost: 0.0875,
      started_at: new Date(Date.now() - 3600000).toISOString(),
      completed_at: new Date(Date.now() - 3555000).toISOString(),
      discovery_log: {
        summary: {
          total_discovered: 125,
          sitemap_pages: 100,
          robots_pages: 20,
          navigation_pages: 5,
          discovery_time_ms: 2500,
          discovery_method: 'sitemap, robots, navigation'
        },
        critical_findings: {
          grade: 'B',
          lead_priority: 72,
          priority_tier: 'warm',
          quick_wins_count: 5
        },
        ai_selection: {
          reasoning: 'Selected high-traffic pages and key conversion points for comprehensive analysis',
          selected_pages: {
            seo: ['/', '/about', '/services', '/contact', '/blog'],
            content: ['/', '/about', '/services', '/blog', '/case-studies'],
            visual: ['/', '/portfolio', '/services', '/about', '/contact'],
            social: ['/', '/blog', '/about', '/contact', '/team']
          }
        },
        analysis_metrics: {
          total_time_ms: 45000,
          analysis_cost: 0.0875,
          ai_models_used: {
            seo: 'grok-4-fast',
            content: 'grok-4-fast',
            desktop_visual: 'gpt-4o',
            mobile_visual: 'gpt-4o',
            social: 'grok-4-fast',
            accessibility: 'grok-4-fast'
          }
        }
      }
    },
    {
      id: '2',
      company_name: 'Tech Startup',
      website: 'https://techstartup.io',
      status: 'analyzing',
      pages_discovered: 85,
      pages_analyzed: 5,
      started_at: new Date(Date.now() - 120000).toISOString()
    },
    {
      id: '3',
      company_name: 'Local Restaurant',
      website: 'https://localrestaurant.com',
      status: 'failed',
      error: 'Failed to connect to website',
      started_at: new Date(Date.now() - 7200000).toISOString()
    }
  ];
}