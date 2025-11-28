'use client';

/**
 * Reports Page
 * Standalone page for viewing all generated reports
 */

import { useState, useEffect, useCallback } from 'react';
import { FileText, RefreshCw } from 'lucide-react';
import { ReportsTable } from '@/components/reports/reports-table';
import type { Report } from '@/lib/api/analysis';

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/reports');
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch reports');
      }

      setReports(data.reports || data.data || []);
    } catch (err: any) {
      console.error('Error fetching reports:', err);
      setError(err.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleDelete = (reportId: string) => {
    setReports(prev => prev.filter(r => r.id !== reportId));
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <FileText className="h-8 w-8 text-blue-600" />
          Reports
        </h1>
        <p className="text-muted-foreground mt-2">
          View and download all generated website audit reports
        </p>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
          <button
            onClick={fetchReports}
            className="mt-2 text-sm text-destructive underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Reports Table */}
      <ReportsTable
        reports={reports}
        loading={loading}
        onRefresh={fetchReports}
        onDelete={handleDelete}
      />
    </div>
  );
}
