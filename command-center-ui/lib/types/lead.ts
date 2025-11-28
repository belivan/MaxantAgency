/**
 * Lead Type Definitions
 * Represents analyzed prospects with full analysis results
 */

export type LeadGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface Issue {
  category: 'design' | 'seo' | 'content' | 'performance' | 'accessibility' | 'social';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact?: string;
  recommendation?: string;
  fix_effort?: 'easy' | 'moderate' | 'complex';
}

export interface SocialProfile {
  platform: 'instagram' | 'facebook' | 'linkedin' | 'twitter' | 'youtube' | 'tiktok';
  handle?: string;
  url: string;
  followers?: number;
  posts?: number;
  engagement_rate?: number;
  last_post_date?: string;
  verified: boolean;
  active: boolean;
}

export interface Lead {
  id: string;
  prospect_id?: string;

  // Company info
  company_name: string;
  website: string;
  url?: string; // Website URL (alias for website)
  industry?: string;
  location?: string;
  city?: string;
  state?: string;

  // Contact info
  contact_email?: string;
  contact_phone?: string;
  contact_name?: string;

  // Analysis results
  grade: LeadGrade;
  overall_score: number;
  analysis_summary: string;
  quick_wins: string[];

  // Lead Priority (AI-scored)
  lead_priority?: number;                    // 0-100 overall score
  lead_priority_reasoning?: string;          // AI explanation
  priority_tier?: 'hot' | 'warm' | 'cold';   // Auto-calculated tier
  budget_likelihood?: 'high' | 'medium' | 'low';
  fit_score?: number;                        // 0-100 score

  // Dimension Scores (6 factors that make up lead_priority)
  quality_gap_score?: number;                // 0-25
  budget_score?: number;                     // 0-25
  urgency_score?: number;                    // 0-20
  industry_fit_score?: number;               // 0-15
  company_size_score?: number;               // 0-10
  engagement_score?: number;                 // 0-5

  // Detailed analysis
  design_score?: number;
  design_issues?: Issue[];

  design_score_desktop?: number;
  design_score_mobile?: number;
  design_issues_desktop?: Issue[];
  design_issues_mobile?: Issue[];

  seo_score?: number;
  seo_issues?: Issue[];
  seo_title?: string;
  seo_description?: string;
  page_title?: string;
  meta_description?: string;

  content_score?: number;
  content_issues?: Issue[];
  content_insights?: {
    has_blog?: boolean;
    has_portfolio?: boolean;
    has_testimonials?: boolean;
    has_about_page?: boolean;
    word_count?: number;
    readability_score?: number;
  };

  performance_score?: number;
  performance_issues?: Issue[];
  page_load_time?: number;

  accessibility_score?: number;
  accessibility_issues?: Issue[];

  // Technical details
  tech_stack?: string;

  // Social media analysis
  social_profiles?: SocialProfile[];
  social_score?: number;
  social_issues?: Issue[];

  // Screenshots
  screenshot_desktop_url?: string;
  screenshot_mobile_url?: string;

  // Google Business data (from prospect)
  google_rating?: number;
  google_review_count?: number;
  services?: string[];
  prospect_description?: string;

  // Business Intelligence (from prospects table - source of truth)
  business_intelligence?: {
    years_in_business?: number;
    founded_year?: number;
    employee_count?: number | null;
    location_count?: number | null;
    pricing_visible?: boolean;
    pricing_range?: { min?: number; max?: number } | null;
    blog_active?: boolean;
    content_last_update?: string | null;
    decision_maker_accessible?: boolean;
    owner_name?: string | null;
    premium_features?: string[];
    budget_indicator?: 'high' | 'medium' | 'low';
  };

  // Crawl Metadata (multi-page analysis)
  crawl_metadata?: {
    pages_crawled?: number;
    links_found?: number;
    crawl_time?: number;
    failed_pages?: number;
  };

  // Metadata
  analysis_tier: 'tier1' | 'tier2' | 'tier3';
  analysis_modules: string[];
  analyzed_at: string;
  analysis_cost: number;
  analysis_duration_ms?: number;

  // Project tracking
  project_id?: string;

  created_at: string;
  updated_at?: string;
}

export interface LeadFilters {
  grade?: LeadGrade | LeadGrade[];
  priority_tier?: 'hot' | 'warm' | 'cold';
  min_score?: number;
  max_score?: number;
  has_email?: boolean;
  has_phone?: boolean;
  industry?: string | string[];
  location?: string;
  project_id?: string;
  analysis_tier?: Lead['analysis_tier'] | Lead['analysis_tier'][];
  sort_by?: 'grade' | 'score' | 'date' | 'company_name' | 'lead_priority';
  sort_order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface AnalysisOptions {
  tier: 'tier1' | 'tier2' | 'tier3';
  modules: ('design' | 'seo' | 'content' | 'performance' | 'accessibility' | 'social')[];
  capture_screenshots?: boolean;
  autoEmail?: boolean;
  autoAnalyze?: boolean;
  project_id: string; // REQUIRED - every lead must belong to a project
}

export interface AnalysisResponse {
  success: boolean;
  results?: Lead[];
  count?: number;
  total_cost?: number;
  logs?: Array<{
    url: string;
    status: 'success' | 'error';
    grade?: LeadGrade;
    score?: number;
    message?: string;
    timestamp: string;
  }>;
  error?: string;
}
