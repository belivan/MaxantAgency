/**
 * Social Media Outreach Type Definitions
 * Represents social media DM generation and tracking
 */

export type SocialPlatform = 'instagram' | 'facebook' | 'linkedin' | 'twitter';

export type SocialStrategy =
  | 'value-first'
  | 'compliment-question'
  | 'common-ground'
  | 'quick-win'
  | 'storytelling';

export type SocialMessageStatus = 'pending' | 'sent' | 'responded' | 'ignored' | 'failed';

export interface SocialMessage {
  id: string;
  lead_id: string;
  url: string;

  // Platform details
  platform: string; // 'instagram' | 'facebook' | 'linkedin' | 'twitter'
  social_profile_url?: string | null;

  // Recipient info
  company_name: string;
  contact_name?: string | null;
  contact_title?: string | null;
  contact_email?: string | null;
  industry?: string | null;

  // Message content
  message_body: string;
  opening_line?: string | null;
  character_count?: number | null;

  // Variants (for A/B testing)
  has_variants: boolean;
  message_variants?: string[] | null;
  recommended_variant?: number | null;
  variant_name?: string | null;
  variant_reasoning?: string | null;

  // Strategy and quality
  strategy?: string | null;
  tone?: string | null;
  quality_score?: number | null;
  validation_issues?: string[] | null;

  // AI reasoning
  technical_reasoning?: string | null;
  business_summary?: string | null;

  // Status tracking
  status: string; // 'pending' | 'reviewed' | 'sent' | 'scheduled' | 'failed'
  sent_at?: string | null;
  reviewed_at?: string | null;

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
    contact_name?: string | null;
    social_profiles?: Record<string, any>;
  };
}

export interface SocialMessageFilters {
  platform?: SocialPlatform | SocialPlatform[];
  status?: SocialMessageStatus | SocialMessageStatus[];
  strategy?: SocialStrategy | SocialStrategy[];
  min_quality_score?: number;
  project_id?: string;
  campaign_id?: string;
  sort_by?: 'created_at' | 'quality_score' | 'company_name' | 'platform';
  sort_order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface SocialCompositionOptions {
  platform: SocialPlatform;
  strategy?: SocialStrategy;
  model?: 'haiku' | 'sonnet' | 'gpt-4o-mini';
  generate_variants?: boolean;
  num_variants?: number;
  tone?: 'professional' | 'casual' | 'friendly';
  max_length?: number; // Character limit varies by platform
}

export interface BatchSocialCompositionRequest {
  lead_ids: string[];
  options: SocialCompositionOptions;
  project_id?: string;
}

export interface SocialCompositionResponse {
  success: boolean;
  messages?: SocialMessage[];
  count?: number;
  total_cost?: number;
  logs?: Array<{
    lead_id: string;
    status: 'success' | 'error' | 'no_social_profile';
    message?: string;
    timestamp: string;
  }>;
  error?: string;
}

// Platform-specific character limits
export const SOCIAL_PLATFORM_LIMITS: Record<SocialPlatform, number> = {
  instagram: 2200,
  facebook: 5000,
  linkedin: 1300,
  twitter: 10000, // DMs, not tweets
};
