/**
 * Prospect Type Definitions
 * Represents companies discovered during the prospecting phase
 */

/**
 * Business Intelligence data structure
 */
export interface BusinessIntelligence {
  companySize?: {
    employeeCount?: string;
    locationCount?: number;
    confidence?: string;
    signals?: string[];
  };
  yearsInBusiness?: {
    estimatedYears?: number;
    foundedYear?: number;
    confidence?: string;
    signals?: string[];
  };
  pricingVisibility?: {
    visible?: boolean;
    priceRange?: {
      min?: number;
      max?: number;
    };
    confidence?: string;
    signals?: string[];
  };
  contentFreshness?: {
    lastUpdate?: string;
    blogActive?: boolean;
    postCount?: number;
    confidence?: string;
    signals?: string[];
  };
  decisionMakerAccessibility?: {
    hasDirectEmail?: boolean;
    hasDirectPhone?: boolean;
    ownerName?: string;
    confidence?: string;
    signals?: string[];
  };
  premiumFeatures?: {
    detected?: string[];
    budgetIndicator?: 'low' | 'medium' | 'high';
    signals?: string[];
  };
}

export interface Prospect {
  id: string;
  company_name: string;
  website: string;
  industry?: string;
  city?: string;
  state?: string;
  country?: string;
  google_rating?: number;
  google_review_count?: number;
  phone?: string;
  address?: string;
  google_maps_url?: string;

  // Status tracking
  status: 'pending' | 'ready_for_analysis' | 'analyzed' | 'email_composed' | 'contacted';
  website_status?: 'active' | 'inactive' | 'error' | 'unknown';
  crawl_error_details?: {
    error_message?: string;
    error_code?: string;
  };

  // Contact information
  contact_email?: string;
  contact_phone?: string;
  contact_name?: string;

  // Business details
  description?: string;
  services?: string[];
  most_recent_review_date?: string;
  icp_match_score?: number;

  // Business Intelligence
  business_intelligence?: BusinessIntelligence;

  // Metadata
  project_id?: string;
  project_name?: string;
  run_id?: string;
  created_at: string;
  updated_at?: string;

  // Prospecting details
  discovery_source?: 'google_maps' | 'web_search' | 'manual' | 'csv_import' | 'single-lookup';
  discovery_metadata?: Record<string, any>;

  // Social profiles
  social_profiles?: Record<string, any>;
  social_metadata?: Record<string, any>;
}

export interface ProspectFilters {
  status?: Prospect['status'] | Prospect['status'][];
  industry?: string | string[];
  city?: string | string[];
  min_rating?: number;
  has_email?: boolean;
  project_id?: string;
  limit?: number;
  offset?: number;
}

/**
 * AI Prompt Configuration
 */
export interface ProspectingPromptConfig {
  version: string;
  name: string;
  model: string;
  temperature: number;
  systemPrompt: string;
  userPromptTemplate: string;
  variables: string[];
  examples?: any[];
}

/**
 * All prospecting prompts
 */
export interface ProspectingPrompts {
  queryUnderstanding?: ProspectingPromptConfig;
  websiteExtraction?: ProspectingPromptConfig;
  relevanceCheck?: ProspectingPromptConfig;
}

/**
 * Prospect generation options
 */
export interface ProspectGenerationOptions {
  count: number;
  city?: string;
  model: 'grok-4-fast' | 'grok-4' | 'gpt-5' | 'gpt-5-mini' | 'gpt-4o' | 'gpt-4o-mini' | 'claude-sonnet-4-5' | 'claude-haiku-4-5';
  visionModel: 'gpt-5' | 'gpt-5-mini' | 'gpt-4o' | 'gpt-4o-mini' | 'claude-sonnet-4-5' | 'claude-haiku-4-5';
  verify: boolean;
  project_id?: string;

  // Phase 2: Model Selection & Custom Prompts
  model_selections?: Record<string, string>;
  custom_prompts?: ProspectingPrompts;

  // Iterative Discovery Options
  useIterativeDiscovery?: boolean;
  maxIterations?: number;
  maxVariationsPerIteration?: number;
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

/**
 * Single business lookup options
 */
export interface BusinessLookupOptions {
  projectId?: string;
  scrapeWebsite?: boolean;
  findSocial?: boolean;
  scrapeSocial?: boolean;
  fullPageScreenshots?: boolean;
  visionModel?: string;
}

/**
 * Single business lookup result
 */
export interface BusinessLookupResult {
  success: boolean;
  prospect: Prospect;
  metadata: {
    discovery_cost_usd: number;
    discovery_time_ms: number;
    steps_completed: string;
    source: string;
  };
}
