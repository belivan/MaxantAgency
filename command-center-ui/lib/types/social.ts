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

  // Platform details
  platform: SocialPlatform;
  profile_url: string;
  profile_handle?: string;

  // Recipient info
  company_name: string;
  contact_name?: string;

  // Message content
  message: string;
  character_count: number;

  // Variants (for A/B testing)
  has_variants: boolean;
  message_variants?: string[];
  recommended_variant?: number;

  // Strategy and quality
  strategy: SocialStrategy;
  quality_score: number;
  personalization_score?: number;

  // AI reasoning
  reasoning?: string;
  tone_notes?: string;

  // Status tracking
  status: SocialMessageStatus;
  sent_at?: string;
  responded_at?: string;
  response_text?: string;

  // Project tracking
  project_id?: string;
  campaign_id?: string;

  // Cost tracking
  composition_cost: number;
  composition_model?: string;

  created_at: string;
  updated_at?: string;
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
