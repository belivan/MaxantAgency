/**
 * Report Engine API Client (Agent 4)
 * Port: 3003
 */

const API_BASE = process.env.NEXT_PUBLIC_REPORT_API || 'http://localhost:3003';

/**
 * Report Types
 */
export interface Report {
  id: string;
  lead_id: string;
  project_id?: string;
  report_type: string;
  format: 'markdown' | 'html';
  storage_path: string;
  storage_bucket: string;
  file_size_bytes: number;
  company_name: string;
  website_url: string;
  overall_score: number;
  website_grade: string;
  download_count: number;
  status: 'pending' | 'completed' | 'failed';
  generated_at: string;
  last_downloaded_at?: string;
}

export interface ReportGenerationOptions {
  lead_id: string;
  format?: 'markdown' | 'html';
  sections?: string[];
}

/**
 * Generate a website audit report for a lead (Queue-based)
 * Returns job_id for polling-based status tracking
 * @preferred Use this method for new implementations
 */
export async function generateReportQueue(
  options: ReportGenerationOptions
): Promise<{ job_id: string }> {
  const response = await fetch(`${API_BASE}/api/generate-queue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lead_id: options.lead_id,
      format: options.format || 'html',
      sections: options.sections || ['all']
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || error.message || 'Failed to queue report generation');
  }

  const data = await response.json();

  if (!data.success || !data.job_id) {
    throw new Error('Failed to queue report generation job');
  }

  return { job_id: data.job_id };
}

/**
 * Generate multiple reports in batch (Queue-based)
 * @param leadIds Array of lead IDs to generate reports for
 */
export async function generateReportBatchQueue(
  leadIds: string[],
  options?: { format?: 'markdown' | 'html'; sections?: string[] }
): Promise<{ job_id: string }> {
  const response = await fetch(`${API_BASE}/api/generate-queue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lead_ids: leadIds,
      format: options?.format || 'html',
      sections: options?.sections || ['all']
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || error.message || 'Failed to queue batch report generation');
  }

  const data = await response.json();

  if (!data.success || !data.job_id) {
    throw new Error('Failed to queue batch report generation job');
  }

  return { job_id: data.job_id };
}

/**
 * Check status of report generation jobs
 * @param jobIds Array of job IDs to check
 */
export async function checkReportStatus(jobIds: string[]): Promise<{
  success: boolean;
  jobs: Array<{
    job_id: string;
    work_type: string;
    state: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
    priority: number;
    progress?: {
      current: number;
      total: number;
      message?: string;
    };
    result?: any;
    error?: string;
    created_at: string;
    started_at?: string;
    completed_at?: string;
  }>;
  summary: {
    total: number;
    queued: number;
    running: number;
    completed: number;
    failed: number;
    cancelled: number;
  };
}> {
  const queryString = jobIds.map(id => `job_ids=${id}`).join('&');
  const response = await fetch(`${API_BASE}/api/report-status?${queryString}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || error.message || 'Failed to check report status');
  }

  const data = await response.json();
  return data;
}

/**
 * Cancel queued report generation jobs
 * @param jobIds Array of job IDs to cancel (only works for queued jobs)
 */
export async function cancelReportJobs(jobIds: string[]): Promise<{
  success: boolean;
  cancelled: number;
  not_found: number;
  already_started: number;
}> {
  const response = await fetch(`${API_BASE}/api/cancel-report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_ids: jobIds })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || error.message || 'Failed to cancel report jobs');
  }

  const data = await response.json();
  return data;
}

/**
 * Generate a website audit report for a lead (Synchronous - DEPRECATED)
 * @deprecated Use generateReportQueue() instead for better reliability
 */
export async function generateReport(
  leadId: string,
  format: 'markdown' | 'html' = 'html'
): Promise<Report> {
  const response = await fetch(`${API_BASE}/api/generate-from-lead`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lead_id: leadId,
      format,
      sections: ['all']
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || error.message || 'Failed to generate report');
  }

  const data = await response.json();
  return data.report;
}

/**
 * Get all reports for a lead
 */
export async function getReportsByLeadId(leadId: string): Promise<Report[]> {
  const response = await fetch(`${API_BASE}/api/reports/lead/${leadId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || error.message || 'Failed to fetch reports');
  }

  const data = await response.json();
  return data.reports || [];
}

/**
 * Get download URL for a report
 */
export async function getReportDownloadUrl(reportId: string): Promise<string> {
  const response = await fetch(`${API_BASE}/api/reports/${reportId}/download`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || error.message || 'Failed to get download URL');
  }

  const data = await response.json();
  return data.download_url;
}

/**
 * Delete a report
 */
export async function deleteReport(reportId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/reports/${reportId}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || error.message || 'Failed to delete report');
  }
}
