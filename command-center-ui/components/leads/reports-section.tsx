'use client';

/**
 * Reports Section
 * Display and manage website audit reports for leads
 */

import { useState } from 'react';
import { Download, FileText, FileCode, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { generateReport, getReportDownloadUrl, deleteReport } from '@/lib/api';
import type { Report } from '@/lib/api/analysis';
import type { Lead } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface ReportsSectionProps {
  selectedLeads: Lead[];
  onRefresh?: () => void;
}

export function ReportsSection({ selectedLeads }: ReportsSectionProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [generating, setGenerating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Generate report dialog
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const handleGenerateClick = () => {
    if (selectedLeads.length === 0) return;

    // Use the first selected lead
    setSelectedLead(selectedLeads[0]);
    setGenerateDialogOpen(true);
  };

  const handleGenerate = async (format: 'markdown' | 'html') => {
    if (!selectedLead) return;

    setGenerating(selectedLead.id);
    setError(null);

    try {
      const report = await generateReport(selectedLead.id, format);

      // Add to reports list
      setReports(prev => [report, ...prev]);

      setGenerateDialogOpen(false);
      setSelectedLead(null);

      // Show success notification
      alert(`${format === 'html' ? 'HTML' : 'Markdown'} report generated successfully!`);
    } catch (err: any) {
      setError(err.message || 'Failed to generate report');
    } finally {
      setGenerating(null);
    }
  };

  const handleDownload = async (report: Report) => {
    try {
      const downloadUrl = await getReportDownloadUrl(report.id);

      // Open in new tab or trigger download
      window.open(downloadUrl, '_blank');
    } catch (err: any) {
      alert(err.message || 'Failed to download report');
    }
  };

  const handleDelete = async (report: Report) => {
    if (!confirm('Are you sure you want to delete this report?')) {
      return;
    }

    try {
      await deleteReport(report.id);
      setReports(prev => prev.filter(r => r.id !== report.id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete report');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Website Audit Reports</h2>
            <p className="text-muted-foreground">
              Generate and download professional audit reports in Markdown or HTML format
            </p>
          </div>

          <Button
            onClick={handleGenerateClick}
            disabled={selectedLeads.length === 0}
            title={selectedLeads.length === 0 ? "Select leads from the table above to generate reports" : "Generate report for selected lead"}
          >
            <FileText className="mr-2 h-4 w-4" />
            Generate Report
            {selectedLeads.length > 0 && ` (${selectedLeads.length})`}
          </Button>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">Error</p>
              <p className="text-sm text-destructive/80">{error}</p>
            </div>
          </div>
        )}

        {/* Reports Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Format</TableHead>
                <TableHead>File Size</TableHead>
                <TableHead>Downloads</TableHead>
                <TableHead>Generated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileText className="h-12 w-12 text-muted-foreground/50" />
                      <div>
                        <p className="font-medium text-muted-foreground">No reports generated yet</p>
                        <p className="text-sm text-muted-foreground/70">
                          Generate your first report using the button above
                        </p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">
                      {report.company_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        report.website_grade === 'A' ? 'default' :
                        report.website_grade === 'B' ? 'secondary' :
                        report.website_grade === 'C' ? 'outline' :
                        'destructive'
                      }>
                        {report.website_grade}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {report.format === 'html' ? (
                          <FileCode className="h-4 w-4" />
                        ) : (
                          <FileText className="h-4 w-4" />
                        )}
                        <span className="uppercase text-sm">
                          {report.format}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatFileSize(report.file_size_bytes)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {report.download_count}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(report.generated_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload(report)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(report)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Generate Report Dialog */}
      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Report</DialogTitle>
            <DialogDescription>
              Choose the format for {selectedLead?.company_name}'s website audit report
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-auto flex-col items-start p-4 space-y-2"
                onClick={() => handleGenerate('html')}
                disabled={generating !== null}
              >
                {generating === selectedLead?.id ? (
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                ) : (
                  <FileCode className="h-8 w-8 text-blue-500" />
                )}
                <div className="text-left">
                  <p className="font-semibold">HTML (Dark Theme)</p>
                  <p className="text-xs text-muted-foreground">
                    Styled report with dark background, perfect for web viewing
                  </p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="h-auto flex-col items-start p-4 space-y-2"
                onClick={() => handleGenerate('markdown')}
                disabled={generating !== null}
              >
                {generating === selectedLead?.id ? (
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                ) : (
                  <FileText className="h-8 w-8 text-green-500" />
                )}
                <div className="text-left">
                  <p className="font-semibold">Markdown</p>
                  <p className="text-xs text-muted-foreground">
                    Clean text format, easy to edit and share
                  </p>
                </div>
              </Button>
            </div>

            {error && (
              <div className="rounded-lg border border-destructive bg-destructive/10 p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setGenerateDialogOpen(false);
                setSelectedLead(null);
                setError(null);
              }}
              disabled={generating !== null}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
