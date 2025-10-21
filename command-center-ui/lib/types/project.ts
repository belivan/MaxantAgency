/**
 * Project Type Definitions
 * Represents campaigns and project organization
 */

export type ProjectStatus = 'active' | 'paused' | 'completed' | 'archived';

export interface Project {
  id: string;
  name: string;
  description?: string;

  // ICP Brief
  icp_brief?: Record<string, any>;

  // Prompts and Models (saved for historical accuracy)
  prospecting_prompts?: Record<string, any>;
  prospecting_model_selections?: Record<string, string>;
  analysis_prompts?: Record<string, any>;
  analysis_model_selections?: Record<string, string>;

  // Analysis Config
  analysis_config?: Record<string, any>;

  // Outreach Config
  outreach_config?: Record<string, any>;

  // Status
  status: ProjectStatus;

  // Counts
  prospects_count: number;
  analyzed_count: number;
  emails_sent_count: number;
  social_messages_count: number;

  // Quality metrics
  grade_a_count: number;
  grade_b_count: number;
  avg_lead_score?: number;

  // Performance
  email_open_rate?: number;
  email_reply_rate?: number;

  // Costs
  total_cost: number;
  prospecting_cost: number;
  analysis_cost: number;
  outreach_cost: number;

  // Budget
  budget_limit?: number;
  budget_alert_threshold?: number;

  // Dates
  created_at: string;
  updated_at?: string;
  completed_at?: string;
  last_activity_at?: string;

  // User/team (future)
  created_by?: string;
  team_id?: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  icp_brief?: Record<string, any>;
  prospecting_prompts?: Record<string, any>;
  prospecting_model_selections?: Record<string, string>;
  analysis_prompts?: Record<string, any>;
  analysis_model_selections?: Record<string, string>;
  budget_limit?: number;
  budget_alert_threshold?: number;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  icp_brief?: Record<string, any>;
  prospecting_prompts?: Record<string, any>;
  prospecting_model_selections?: Record<string, string>;
  analysis_prompts?: Record<string, any>;
  analysis_model_selections?: Record<string, string>;
  analysis_config?: Record<string, any>;
  outreach_config?: Record<string, any>;
  status?: ProjectStatus;
  budget_limit?: number;
  budget_alert_threshold?: number;
}

export interface ProjectFilters {
  status?: ProjectStatus | ProjectStatus[];
  min_prospects?: number;
  min_analyzed?: number;
  sort_by?: 'name' | 'created_at' | 'last_activity_at' | 'total_cost' | 'prospects_count';
  sort_order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface ProjectStats {
  project: Project;

  // Detailed breakdown
  prospects_by_status: {
    pending: number;
    ready_for_analysis: number;
    analyzed: number;
    email_composed: number;
    contacted: number;
  };

  leads_by_grade: {
    A: number;
    B: number;
    C: number;
    D: number;
    F: number;
  };

  emails_by_status: {
    pending: number;
    approved: number;
    sent: number;
    opened: number;
    replied: number;
  };

  // Timeline data
  activity_timeline: Array<{
    date: string;
    prospects_generated: number;
    prospects_analyzed: number;
    emails_sent: number;
    cost: number;
  }>;

  // Cost breakdown over time
  cost_timeline: Array<{
    date: string;
    prospecting_cost: number;
    analysis_cost: number;
    outreach_cost: number;
    total_cost: number;
  }>;
}
