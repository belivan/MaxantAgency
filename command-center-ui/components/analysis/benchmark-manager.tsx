'use client';

/**
 * Benchmark Manager Component
 * Shows available benchmarks and allows analyzing websites as benchmarks
 */

import { useState, useEffect } from 'react';
import { Target, Plus, TrendingUp, Trash2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTaskProgress } from '@/lib/contexts/task-progress-context';
import { deleteBenchmarks } from '@/lib/api/analysis';

interface Benchmark {
  id: string;
  company_name: string;
  industry: string;
  overall_score: number;
  url: string;
  benchmark_tier: string;
}

export function BenchmarkManager() {
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchBenchmarks();
  }, []);

  async function fetchBenchmarks() {
    try {
      setLoading(true);
      const response = await fetch('/api/benchmarks?limit=10');
      const result = await response.json();

      if (result.success) {
        setBenchmarks(result.data || []);
        setTotal(result.total || 0);
      }
    } catch (error) {
      console.error('Failed to load benchmarks:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (selectedIds.length === 0) return;

    setIsDeleting(true);
    try {
      await deleteBenchmarks(selectedIds);

      // Clear selection
      setSelectedIds([]);
      setShowDeleteDialog(false);

      // Refresh the data
      await fetchBenchmarks();
    } catch (error) {
      console.error('Failed to delete benchmarks:', error);
      alert(`Failed to delete benchmarks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
    }
  }

  function handleSelectBenchmark(benchmarkId: string, checked: boolean) {
    if (checked) {
      setSelectedIds(prev => [...prev, benchmarkId]);
    } else {
      setSelectedIds(prev => prev.filter(id => id !== benchmarkId));
    }
  }

  const tierConfig = {
    aspirational: { label: 'Aspirational', color: 'text-success' },
    competitive: { label: 'Competitive', color: 'text-primary' },
    baseline: { label: 'Baseline', color: 'text-warning' }
  };

  // Group benchmarks by industry
  const groupedBenchmarks = benchmarks.reduce((acc, benchmark) => {
    const industry = benchmark.industry || 'Other';
    if (!acc[industry]) {
      acc[industry] = [];
    }
    acc[industry].push(benchmark);
    return acc;
  }, {} as Record<string, Benchmark[]>);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Industry Benchmarks
            </CardTitle>
            <CardDescription className="mt-1">
              {total > 0 ? `${total} benchmarks across ${Object.keys(groupedBenchmarks).length} industries` : 'No benchmarks yet'}
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
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete ({selectedIds.length})
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchBenchmarks}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Benchmark
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Analyze Website as Benchmark</DialogTitle>
                  <DialogDescription>
                    Add a top-performing website to use as a comparison benchmark for analysis
                  </DialogDescription>
                </DialogHeader>
                <BenchmarkForm
                  onSuccess={() => {
                    setDialogOpen(false);
                  }}
                  onRefresh={fetchBenchmarks}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : Object.keys(groupedBenchmarks).length === 0 ? (
          <div className="text-center py-12">
            <Target className="w-12 h-12 mx-auto mb-4 opacity-20 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-4">
              No benchmarks yet. Add top-performing websites to use as comparison points.
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Benchmark
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedBenchmarks).map(([industry, industryBenchmarks]) => (
              <div key={industry}>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-foreground">{industry}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {industryBenchmarks.length} benchmark{industryBenchmarks.length === 1 ? '' : 's'}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {industryBenchmarks.map((benchmark) => {
                    const tier = tierConfig[benchmark.benchmark_tier as keyof typeof tierConfig] || tierConfig.competitive;
                    const isSelected = selectedIds.includes(benchmark.id);
                    return (
                      <div
                        key={benchmark.id}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleSelectBenchmark(benchmark.id, checked as boolean)}
                          aria-label={`Select ${benchmark.company_name}`}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-foreground text-sm">
                              {benchmark.company_name}
                            </span>
                            <Badge variant="outline" className={`text-xs ${tier.color}`}>
                              {tier.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new URL(benchmark.url).hostname} • Score: {benchmark.overall_score}/100
                          </p>
                        </div>
                        <TrendingUp className={`w-4 h-4 ${tier.color}`} />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Box */}
        <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/10">
          <h4 className="text-sm font-semibold text-primary mb-2">How Benchmarking Works</h4>
          <ul className="text-xs text-muted-foreground space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Benchmarks are top-performing websites in specific industries</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>AI automatically matches your prospects to the best comparable benchmark</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Grading adapts based on industry standards and benchmark performance</span>
            </li>
          </ul>
        </div>
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.length} Benchmark{selectedIds.length !== 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected benchmark{selectedIds.length !== 1 ? 's' : ''} from the database.
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
    </Card>
  );
}

function BenchmarkForm({ onSuccess, onRefresh }: { onSuccess: () => void; onRefresh: () => void }) {
  const [url, setUrl] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [tier, setTier] = useState('competitive');
  const { startTask, updateTask, addLog, completeTask, errorTask } = useTaskProgress();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Close dialog immediately
    onSuccess();

    // Start task in floating indicator
    const taskId = startTask('analysis', `Analyzing ${companyName}`, 100);

    try {
      const API_BASE = process.env.NEXT_PUBLIC_ANALYSIS_API || 'http://localhost:3001';

      // Build URL with query parameters for SSE
      const params = new URLSearchParams({
        url,
        company_name: companyName,
        industry,
        benchmark_tier: tier
      });

      // Start SSE connection
      const eventSource = new EventSource(`${API_BASE}/api/analyze-benchmark?${params}`);

      // Handle start event
      eventSource.addEventListener('start', (e) => {
        const data = JSON.parse(e.data);
        addLog(taskId, data.message || 'Starting benchmark analysis');
      });

      // Handle analyzing event (progress updates)
      eventSource.addEventListener('analyzing', (e) => {
        const data = JSON.parse(e.data);
        updateTask(taskId, data.current || 50, data.message);
        if (data.phase && data.step) {
          addLog(taskId, `Phase ${data.phase}: ${data.step}`, 'info');
        }
      });

      // Handle complete event
      eventSource.addEventListener('complete', (e) => {
        const data = JSON.parse(e.data);
        completeTask(taskId);
        eventSource.close();

        // Refresh benchmarks list
        onRefresh();

        addLog(taskId, `Benchmark created successfully!`, 'success');
      });

      // Handle error event
      eventSource.addEventListener('error', (e) => {
        try {
          const data = JSON.parse((e as any).data);
          errorTask(taskId, data.message || 'Analysis failed');
          addLog(taskId, data.error || 'Unknown error', 'error');
        } catch {
          errorTask(taskId, 'Connection error');
          addLog(taskId, 'Failed to connect to analysis engine', 'error');
        }
        eventSource.close();
      });

      // Handle connection errors
      eventSource.onerror = () => {
        if (eventSource.readyState === EventSource.CLOSED) {
          // Connection closed - check if it was intentional
          return;
        }
        errorTask(taskId, 'Connection error');
        addLog(taskId, 'Lost connection to analysis engine', 'error');
        eventSource.close();
      };

    } catch (error: any) {
      errorTask(taskId, 'Failed to start analysis');
      addLog(taskId, error.message, 'error');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="url">Website URL</Label>
        <Input
          id="url"
          type="url"
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="companyName">Company Name</Label>
        <Input
          id="companyName"
          placeholder="Example Corp"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="industry">Industry</Label>
        <Input
          id="industry"
          placeholder="e.g., Restaurant, Healthcare, SaaS"
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="tier">Benchmark Tier</Label>
        <select
          id="tier"
          value={tier}
          onChange={(e) => setTier(e.target.value)}
          className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="aspirational">Aspirational (Top Performer)</option>
          <option value="competitive">Competitive (Industry Standard)</option>
          <option value="baseline">Baseline (Entry Level)</option>
        </select>
      </div>
      <Button type="submit" className="w-full">
        Create Benchmark
      </Button>
    </form>
  );
}

export default BenchmarkManager;
