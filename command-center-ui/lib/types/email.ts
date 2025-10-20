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
  url: string;

  // Recipient info
  contact_email: string;
  contact_name?: string | null;
  contact_title?: string | null;
  company_name: string;
  industry?: string | null;

  // Email content
  email_subject: string;
  email_body: string;
  email_strategy: string;

  // Variants (for A/B testing)
  has_variants: boolean;
  subject_variants?: string[] | null;
  body_variants?: string[] | null;
  recommended_variant?: number | null;
  variant_reasoning?: string | null;

  // Quality and metadata
  quality_score?: number | null;
  validation_issues?: string[] | null;

  // AI reasoning
  technical_reasoning?: string | null;
  business_summary?: string | null;
  verification_checklist?: string[] | null;

  // Status tracking
  status: string; // 'pending' | 'reviewed' | 'sent' | 'scheduled' | 'failed'
  sent_at?: string | null;
  reviewed_at?: string | null;
  email_message_id?: string | null;

  // Platform and metadata
  platform: string;
  character_count?: number | null;
  social_profile_url?: string | null;

  // Project tracking
  project_id?: string | null;
  campaign_id?: string | null;
  client_name?: string | null;
  source_app?: string | null;

  // Notion integration
  synced_to_notion: boolean;
  notion_page_id?: string | null;
  notion_sync_at?: string | null;

  // Cost tracking
  ai_model?: string | null;
  generation_cost?: number | null;
  generation_time_ms?: number | null;
  usage_input_tokens?: number | null;
  usage_output_tokens?: number | null;

  created_at: string;
  updated_at?: string | null;

  // Joined lead data (if requested)
  leads?: {
    id: string;
    url: string;
    industry: string;
    company_name: string;
    contact_email?: string | null;
    social_profiles?: Record<string, any>;
  };
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
