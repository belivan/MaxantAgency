/**
 * Email Type Definitions
 * Represents composed emails and outreach campaigns
 */

export type EmailStrategy =
  | 'compliment-sandwich'
  | 'problem-first'
  | 'achievement-focused'
  | 'question-based'
  | 'value-first'
  | 'storytelling';

export type EmailStatus = 'pending' | 'approved' | 'rejected' | 'sent' | 'bounced' | 'replied' | 'opened';

export interface EmailVariants {
  subjects: string[];
  bodies: string[];
  recommended: {
    subject: number;
    body: number;
  };
}

export interface Email {
  id: string;
  lead_id: string;

  // Recipient info
  to_email: string;
  to_name?: string;
  company_name: string;

  // Email content
  subject: string;
  body: string;

  // Variants (for A/B testing)
  has_variants: boolean;
  subject_variants?: string[];
  body_variants?: string[];
  recommended_variant?: {
    subject: number;
    body: number;
  };

  // Strategy and quality
  strategy: EmailStrategy;
  quality_score: number;
  personalization_score?: number;

  // AI reasoning
  technical_reasoning?: string;
  business_summary?: string;
  verification_checklist?: string[];

  // Status tracking
  status: EmailStatus;
  sent_at?: string;
  opened_at?: string;
  replied_at?: string;
  bounce_reason?: string;

  // Email metadata
  message_id?: string;
  thread_id?: string;
  from_email?: string;
  from_name?: string;

  // Project tracking
  project_id?: string;
  campaign_id?: string;

  // Notion integration
  synced_to_notion: boolean;
  notion_page_id?: string;

  // Cost tracking
  composition_cost: number;
  composition_model?: string;

  created_at: string;
  updated_at?: string;
}

export interface EmailFilters {
  status?: EmailStatus | EmailStatus[];
  strategy?: EmailStrategy | EmailStrategy[];
  min_quality_score?: number;
  project_id?: string;
  campaign_id?: string;
  synced_to_notion?: boolean;
  has_variants?: boolean;
  sort_by?: 'created_at' | 'quality_score' | 'company_name' | 'status';
  sort_order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface EmailCompositionOptions {
  strategy?: EmailStrategy;
  model?: 'haiku' | 'sonnet' | 'gpt-4o-mini';
  generate_variants?: boolean;
  num_subject_variants?: number;
  num_body_variants?: number;
  tone?: 'professional' | 'casual' | 'friendly' | 'formal';
  max_length?: number;
}

export interface BatchEmailCompositionRequest {
  lead_ids: string[];
  options: EmailCompositionOptions;
  project_id?: string;
}

export interface EmailCompositionResponse {
  success: boolean;
  emails?: Email[];
  count?: number;
  total_cost?: number;
  logs?: Array<{
    lead_id: string;
    status: 'success' | 'error';
    message?: string;
    timestamp: string;
  }>;
  error?: string;
}

export interface SendEmailRequest {
  email_id: string;
  provider?: 'gmail' | 'custom-smtp';
  delay_ms?: number;
  actually_send?: boolean; // false = just create .eml file
}

export interface BatchSendRequest {
  email_ids: string[];
  provider?: 'gmail' | 'custom-smtp';
  delay_between_emails_ms?: number;
  actually_send?: boolean;
}

export interface SendEmailResponse {
  success: boolean;
  message_id?: string;
  sent_at?: string;
  eml_file_path?: string;
  error?: string;
}

export interface EmailVariant {
  variant_name?: string;
  subject: string;
  body: string;
  tone?: string;
  length?: string;
  cta?: string;
}

export interface ComposedEmail {
  company_name: string;
  website: string;
  strategy_used?: string;
  variants: EmailVariant[];
}
