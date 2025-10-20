/**
 * Prospect Type Definitions
 * Represents companies discovered during the prospecting phase
 */

export interface Prospect {
  id: string;
  company_name: string;
  website: string;
  industry?: string;
  city?: string;
  state?: string;
  country?: string;
  rating?: number;
  review_count?: number;
  phone?: string;
  address?: string;
  google_maps_url?: string;

  // Status tracking
  status: 'pending' | 'ready_for_analysis' | 'analyzed' | 'email_composed' | 'contacted';

  // Contact information
  contact_email?: string;
  contact_phone?: string;
  contact_name?: string;

  // Metadata
  project_id?: string;
  run_id?: string;
  verified: boolean;
  created_at: string;
  updated_at?: string;

  // Prospecting details
  discovery_source?: 'google_maps' | 'web_search' | 'manual' | 'csv_import';
  discovery_metadata?: Record<string, any>;
}

export interface ProspectFilters {
  status?: Prospect['status'] | Prospect['status'][];
  industry?: string | string[];
  city?: string | string[];
  min_rating?: number;
  verified?: boolean;
  has_email?: boolean;
  project_id?: string;
  limit?: number;
  offset?: number;
}

export interface ProspectGenerationOptions {
  count: number;
  city?: string;
  model: 'grok-4-fast' | 'gpt-4o-mini' | 'gpt-5-mini' | 'claude-sonnet-4-5';
  verify: boolean;
  project_id?: string;
}

export interface ProspectGenerationResponse {
  success: boolean;
  companies: Prospect[];
  urls: string[];
  run_id: string;
  count: number;
  verified_count: number;
  cost: number;
  project?: {
    id: string;
    name: string;
    description?: string;
  };
  error?: string;
}
