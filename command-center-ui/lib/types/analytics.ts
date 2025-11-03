/**
 * Analytics Type Definitions
 * Represents dashboard statistics and performance metrics
 */

export interface DashboardStats {
  // Overall counts
  total_prospects: number;
  total_analyzed: number;
  total_leads: number;
  total_emails_sent: number;
  total_social_messages: number;

  // This week/month
  prospects_this_week: number;
  analyzed_this_week: number;
  emails_sent_this_week: number;

  // Costs
  total_cost: number;
  prospecting_cost: number;
  analysis_cost: number;
  outreach_cost: number;
  cost_this_week: number;
  cost_this_month: number;
  cost_per_lead: number;

  // Quality metrics
  avg_lead_score: number;
  grade_a_count: number;
  grade_b_count: number;
  grade_c_count: number;
  grade_d_count: number;
  grade_f_count: number;

  // Email metrics
  email_open_rate?: number;
  email_reply_rate?: number;
  avg_quality_score: number;

  // Pipeline health
  pipeline_health: 'healthy' | 'warning' | 'critical';
  engine_status: {
    prospecting: 'online' | 'offline' | 'degraded';
    analysis: 'online' | 'offline' | 'degraded';
    outreach: 'online' | 'offline' | 'degraded';
  };

  // Last updated
  last_updated: string;
}

export interface ActivityFeedItem {
  id: string;
  type: 'prospect_generated' | 'analysis_completed' | 'email_sent' | 'email_replied' | 'social_sent';
  message: string;
  details?: {
    count?: number;
    project_name?: string;
    company_name?: string;
    grade?: string;
    cost?: number;
  };
  timestamp: string;
  icon?: string;
  color?: 'green' | 'blue' | 'purple' | 'orange' | 'red';
}

export interface ConversionFunnelStage {
  name: string;
  count: number;
  cost?: number;
  conversion_rate?: number;
  drop_off_rate?: number;
}

export interface ConversionFunnel {
  stages: ConversionFunnelStage[];
  total_prospects: number;
  total_cost: number;
  overall_conversion_rate: number;
}

export interface CostBreakdown {
  date: string;
  prospecting_cost: number;
  analysis_cost: number;
  outreach_cost: number;
  total_cost: number;
}

export interface StrategyPerformance {
  strategy_name: string;
  emails_sent: number;
  emails_opened: number;
  emails_replied: number;
  open_rate: number;
  reply_rate: number;
  avg_quality_score: number;
}

export interface CampaignPerformance {
  campaign_id: string;
  campaign_name: string;
  project_id?: string;

  // Counts
  prospects_generated: number;
  prospects_analyzed: number;
  emails_sent: number;
  social_messages_sent: number;

  // Quality
  grade_a_count: number;
  grade_b_count: number;
  avg_lead_score: number;

  // Performance
  emails_opened: number;
  emails_replied: number;
  open_rate: number;
  reply_rate: number;

  // Costs
  total_cost: number;
  cost_per_lead: number;
  roi?: number;

  // Dates
  created_at: string;
  last_activity?: string;
}

export interface TimeSeriesDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface AnalyticsFilters {
  date_from?: string;
  date_to?: string;
  project_id?: string;
  campaign_id?: string;
  time_range?: '7d' | '30d' | '90d' | 'all';
}

export interface AnalyticsData {
  stats: {
    total_cost: number;
    total_prospects: number;
    total_leads: number;
    qualified_leads: number;
    contacted: number;
    cost_per_lead: number;
    conversion_rate: number;
  };
  cost_breakdown: {
    stage: string;
    prospecting: number;
    analysis: number;
    outreach: number;
    total: number;
  }[];
  funnel: {
    prospects: number;
    analyzed: number;
    leads: number;
    qualified: number;
    contacted: number;
  };
}

// AnalysisOptionsFormData moved to lib/utils/validation.ts (Zod-inferred type)
// Import from: import { type AnalysisOptionsFormData } from '@/lib/utils/validation'
