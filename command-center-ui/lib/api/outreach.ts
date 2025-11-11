/**
 * Outreach Engine API Client (Agent 3)
 * Port: 3001
 */

import type {
  Email,
  EmailFilters,
  EmailCompositionOptions,
  BatchEmailCompositionRequest,
  EmailCompositionResponse,
  SendEmailRequest,
  BatchSendRequest,
  SendEmailResponse,
  SocialMessage,
  SocialMessageFilters,
  SocialCompositionOptions,
  BatchSocialCompositionRequest,
  SocialCompositionResponse,
  APIResponse
} from '@/lib/types';

const API_BASE = process.env.NEXT_PUBLIC_OUTREACH_API || 'http://localhost:3002';

/**
 * Helper function to parse error responses safely
 * Handles both JSON and non-JSON (HTML) error responses
 */
async function parseErrorMessage(response: Response, fallbackMessage: string): Promise<string> {
  try {
    const error = await response.json();
    return error.message || error.error || fallbackMessage;
  } catch {
    // Response is not JSON (e.g., HTML error page)
    return `${fallbackMessage}: ${response.status} ${response.statusText}`;
  }
}

// ============================================================================
// EMAIL COMPOSITION
// ============================================================================

/**
 * Compose all variations (3 email + 9 social) for multiple leads (Queue-based)
 * Returns job_id for polling-based status tracking
 * @preferred Use this method for new implementations
 */
export async function composeAllVariationsQueue(
  leadIds: string[],
  options?: { forceRegenerate?: boolean }
): Promise<{ job_id: string }> {
  const response = await fetch(`${API_BASE}/api/compose-queue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lead_ids: leadIds,
      options: options || {}
    })
  });

  if (!response.ok) {
    const errorMessage = await parseErrorMessage(response, 'Failed to queue outreach composition');
    throw new Error(errorMessage);
  }

  const data = await response.json();

  if (!data.success || !data.job_id) {
    throw new Error('Failed to queue outreach composition job');
  }

  return { job_id: data.job_id };
}

/**
 * Check status of outreach composition jobs
 * @param jobIds Array of job IDs to check
 */
export async function checkOutreachStatus(jobIds: string[]): Promise<{
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
  const response = await fetch(`${API_BASE}/api/compose-status?${queryString}`);

  if (!response.ok) {
    const errorMessage = await parseErrorMessage(response, 'Failed to check outreach status');
    throw new Error(errorMessage);
  }

  const data = await response.json();
  return data;
}

/**
 * Cancel queued outreach composition jobs
 * @param jobIds Array of job IDs to cancel (only works for queued jobs)
 */
export async function cancelOutreachJobs(jobIds: string[]): Promise<{
  success: boolean;
  cancelled: number;
  not_found: number;
  already_started: number;
}> {
  const response = await fetch(`${API_BASE}/api/cancel-outreach`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_ids: jobIds })
  });

  if (!response.ok) {
    const errorMessage = await parseErrorMessage(response, 'Failed to cancel outreach jobs');
    throw new Error(errorMessage);
  }

  const data = await response.json();
  return data;
}

/**
 * Compose emails for multiple leads (SSE-based - DEPRECATED)
 * Returns SSE URL for real-time progress tracking
 * @deprecated Use composeAllVariationsQueue() instead for better reliability
 */
export async function composeEmails(
  leadIds: string[],
  options: EmailCompositionOptions,
  projectId?: string
): Promise<{ sseUrl: string; batchId: string }> {
  const response = await fetch(`${API_BASE}/api/compose-batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lead_ids: leadIds,
      options,
      project_id: projectId
    })
  });

  if (!response.ok) {
    const errorMessage = await parseErrorMessage(response, 'Failed to start email composition');
    throw new Error(errorMessage);
  }

  const data = await response.json();

  return {
    sseUrl: `${API_BASE}/api/compose-batch/stream?batchId=${data.batchId}`,
    batchId: data.batchId
  };
}

/**
 * Compose a single email for a lead
 */
export async function composeSingleEmail(
  leadId: string,
  options: EmailCompositionOptions
): Promise<Email> {
  const response = await fetch(`${API_BASE}/api/compose`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lead_id: leadId,
      ...options
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to compose email');
  }

  const data: APIResponse<Email> = await response.json();
  if (!data.data) {
    throw new Error('Failed to compose email');
  }

  return data.data;
}

/**
 * Get emails with filters
 */
export async function getEmails(filters?: EmailFilters): Promise<Email[]> {
  const params = new URLSearchParams();

  if (filters?.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
    statuses.forEach(s => params.append('status', s));
  }
  if (filters?.strategy) {
    const strategies = Array.isArray(filters.strategy) ? filters.strategy : [filters.strategy];
    strategies.forEach(s => params.append('strategy', s));
  }
  if (filters?.min_quality_score !== undefined) {
    params.set('min_quality_score', filters.min_quality_score.toString());
  }
  if (filters?.project_id) {
    params.set('project_id', filters.project_id);
  }
  if (filters?.campaign_id) {
    params.set('campaign_id', filters.campaign_id);
  }
  if (filters?.synced_to_notion !== undefined) {
    params.set('synced_to_notion', filters.synced_to_notion.toString());
  }
  if (filters?.has_variants !== undefined) {
    params.set('has_variants', filters.has_variants.toString());
  }
  if (filters?.sort_by) {
    params.set('sort_by', filters.sort_by);
  }
  if (filters?.sort_order) {
    params.set('sort_order', filters.sort_order);
  }
  if (filters?.limit) {
    params.set('limit', filters.limit.toString());
  }
  if (filters?.offset) {
    params.set('offset', filters.offset.toString());
  }

  const response = await fetch(`${API_BASE}/api/emails?${params.toString()}`);

  if (!response.ok) {
    const errorMessage = await parseErrorMessage(response, 'Failed to fetch emails');
    throw new Error(errorMessage);
  }

  const data: any = await response.json();
  return data.emails || [];
}

/**
 * Get a single email by ID
 */
export async function getEmail(id: string): Promise<Email> {
  const response = await fetch(`${API_BASE}/api/emails/${id}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch email');
  }

  const data: APIResponse<Email> = await response.json();
  if (!data.data) {
    throw new Error('Email not found');
  }

  return data.data;
}

/**
 * Update email content or status
 */
export async function updateEmail(
  id: string,
  updates: Partial<Pick<Email, 'email_subject' | 'email_body' | 'status'>>
): Promise<Email> {
  const response = await fetch(`${API_BASE}/api/emails/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update email');
  }

  const data: APIResponse<Email> = await response.json();
  if (!data.data) {
    throw new Error('Failed to update email');
  }

  return data.data;
}

// ============================================================================
// EMAIL SENDING
// ============================================================================

/**
 * Send a single email
 */
export async function sendEmail(request: SendEmailRequest): Promise<SendEmailResponse> {
  const response = await fetch(`${API_BASE}/api/send-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to send email');
  }

  return response.json();
}

/**
 * Send multiple emails in batch
 * Returns SSE URL for real-time progress tracking
 */
export async function sendEmailBatch(request: BatchSendRequest): Promise<{ sseUrl: string; batchId: string }> {
  const response = await fetch(`${API_BASE}/api/send-batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to start batch send');
  }

  const data = await response.json();

  return {
    sseUrl: `${API_BASE}/api/send-batch/stream?batchId=${data.batchId}`,
    batchId: data.batchId
  };
}

/**
 * Sync emails to Notion
 */
export async function syncEmailsToNotion(emailIds: string[]): Promise<{ synced_count: number }> {
  const response = await fetch(`${API_BASE}/api/sync-notion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email_ids: emailIds })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to sync to Notion');
  }

  return response.json();
}

/**
 * Export emails to CSV
 */
export async function exportEmailsToCSV(filters?: EmailFilters): Promise<Blob> {
  const params = new URLSearchParams();
  // Add filter params (same as getEmails)
  // ... (implement same filtering logic)

  const response = await fetch(`${API_BASE}/api/emails/export-csv?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to export emails');
  }

  return response.blob();
}

// ============================================================================
// SOCIAL MEDIA COMPOSITION
// ============================================================================

/**
 * Compose social media DMs for multiple leads
 */
export async function composeSocialMessages(
  leadIds: string[],
  options: SocialCompositionOptions,
  projectId?: string
): Promise<{ sseUrl: string; batchId: string }> {
  const response = await fetch(`${API_BASE}/api/compose-social-batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lead_ids: leadIds,
      options,
      project_id: projectId
    })
  });

  if (!response.ok) {
    const errorMessage = await parseErrorMessage(response, 'Failed to start social composition');
    throw new Error(errorMessage);
  }

  const data = await response.json();

  return {
    sseUrl: `${API_BASE}/api/compose-social-batch/stream?batchId=${data.batchId}`,
    batchId: data.batchId
  };
}

/**
 * Get social messages with filters
 */
export async function getSocialMessages(filters?: SocialMessageFilters): Promise<SocialMessage[]> {
  const params = new URLSearchParams();

  if (filters?.platform) {
    const platforms = Array.isArray(filters.platform) ? filters.platform : [filters.platform];
    platforms.forEach(p => params.append('platform', p));
  }
  if (filters?.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
    statuses.forEach(s => params.append('status', s));
  }
  if (filters?.strategy) {
    const strategies = Array.isArray(filters.strategy) ? filters.strategy : [filters.strategy];
    strategies.forEach(s => params.append('strategy', s));
  }
  if (filters?.min_quality_score !== undefined) {
    params.set('min_quality_score', filters.min_quality_score.toString());
  }
  if (filters?.project_id) {
    params.set('project_id', filters.project_id);
  }
  if (filters?.sort_by) {
    params.set('sort_by', filters.sort_by);
  }
  if (filters?.sort_order) {
    params.set('sort_order', filters.sort_order);
  }
  if (filters?.limit) {
    params.set('limit', filters.limit.toString());
  }
  if (filters?.offset) {
    params.set('offset', filters.offset.toString());
  }

  const response = await fetch(`${API_BASE}/api/social-messages?${params.toString()}`);

  if (!response.ok) {
    const errorMessage = await parseErrorMessage(response, 'Failed to fetch social messages');
    throw new Error(errorMessage);
  }

  const data: any = await response.json();
  return data.messages || [];
}

/**
 * Update social message status
 */
export async function updateSocialMessageStatus(
  id: string,
  status: SocialMessage['status']
): Promise<SocialMessage> {
  const response = await fetch(`${API_BASE}/api/social-messages/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });

  if (!response.ok) {
    const errorMessage = await parseErrorMessage(response, 'Failed to update social message');
    throw new Error(errorMessage);
  }

  const data: APIResponse<SocialMessage> = await response.json();
  if (!data.data) {
    throw new Error('Failed to update social message');
  }

  return data.data;
}

// ============================================================================
// STRATEGIES
// ============================================================================

/**
 * Get available email strategies
 */
export async function getStrategies(): Promise<any[]> {
  const response = await fetch(`${API_BASE}/api/strategies`);

  if (!response.ok) {
    const errorMessage = await parseErrorMessage(response, 'Failed to fetch strategies');
    throw new Error(errorMessage);
  }

  const data = await response.json();

  // Transform the response from {success, email: [...], social: [...]} to an array of strategy objects
  const emailStrategies = (data.email || []).map((id: string) => ({
    id,
    name: id.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    type: 'email' as const
  }));

  const socialStrategies = (data.social || []).map((id: string) => ({
    id,
    name: id.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    type: 'social' as const
  }));

  return [...emailStrategies, ...socialStrategies];
}

/**
 * Compose email for a website URL with strategy
 */
export async function composeEmail(url: string, strategyId: string, generateVariants: boolean = true): Promise<any> {
  const response = await fetch(`${API_BASE}/api/compose`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      strategy_id: strategyId,
      generateVariants
    })
  });

  if (!response.ok) {
    const errorMessage = await parseErrorMessage(response, 'Failed to compose email');
    throw new Error(errorMessage);
  }

  const data = await response.json();

  // Transform backend response to UI-expected format
  const email = data.email || {};
  const lead = data.lead || {};

  // Build variants array from backend data
  const variants = [];

  if (email.has_variants && email.subject_variants && email.body_variants) {
    // Create all possible combinations
    for (let s = 0; s < email.subject_variants.length; s++) {
      for (let b = 0; b < email.body_variants.length; b++) {
        const isRecommended =
          email.recommended_variant?.subject === s &&
          email.recommended_variant?.body === b;

        variants.push({
          variant_name: isRecommended ? 'Recommended' : `Variant ${variants.length + 1}`,
          subject: email.subject_variants[s],
          body: email.body_variants[b],
          tone: isRecommended ? 'recommended' : 'alternative'
        });
      }
    }
  } else {
    // Single variant (no A/B testing)
    variants.push({
      variant_name: 'Primary',
      subject: email.subject || '',
      body: email.body || '',
      tone: 'default'
    });
  }

  return {
    company_name: email.company_name || lead.company_name || 'Unknown Company',
    website: email.url || lead.url || url,
    strategy_used: email.strategy || strategyId,
    variants
  };
}

/**
 * Compose social message for a website URL with platform
 */
export async function composeSocialMessage(url: string, platform: string): Promise<any> {
  const response = await fetch(`${API_BASE}/api/compose-social`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, platform })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to compose social message');
  }

  return response.json();
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get outreach statistics
 */
export async function getOutreachStats(): Promise<{
  total_emails: number;
  emails_by_status: Record<string, number>;
  total_social_messages: number;
  social_by_platform: Record<string, number>;
  avg_email_quality_score: number;
  total_cost: number;
}> {
  const response = await fetch(`${API_BASE}/api/stats`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch stats');
  }

  return response.json();
}
