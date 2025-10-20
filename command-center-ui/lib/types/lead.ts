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
  industry?: string;
  location?: string;

  // Contact info
  contact_email?: string;
  contact_phone?: string;
  contact_name?: string;

  // Analysis results
  grade: LeadGrade;
  overall_score: number;
  analysis_summary: string;
  quick_wins: string[];

  // Detailed analysis
  design_score?: number;
  design_issues?: Issue[];

  seo_score?: number;
  seo_issues?: Issue[];
  seo_title?: string;
  seo_description?: string;

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

  accessibility_score?: number;
  accessibility_issues?: Issue[];

  // Social media analysis
  social_profiles?: SocialProfile[];
  social_score?: number;
  social_issues?: Issue[];

  // Screenshots
  screenshot_url?: string;
  mobile_screenshot_url?: string;

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
  min_score?: number;
  max_score?: number;
  has_email?: boolean;
  has_phone?: boolean;
  industry?: string | string[];
  location?: string;
  project_id?: string;
  analysis_tier?: Lead['analysis_tier'] | Lead['analysis_tier'][];
  sort_by?: 'grade' | 'score' | 'date' | 'company_name';
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
