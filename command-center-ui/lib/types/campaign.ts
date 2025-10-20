/**
 * Pipeline Orchestrator - Campaign Types
 */

export type CampaignStatus = 'active' | 'paused' | 'completed' | 'failed';
export type RunStatus = 'running' | 'completed' | 'failed' | 'partial';
export type TriggerType = 'scheduled' | 'manual';

export interface CampaignStep {
  type: 'prospecting' | 'analysis' | 'outreach';
  config: {
    // Prospecting config
    count?: number;
    city?: string;
    model?: string;
    verify?: boolean;

    // Analysis config
    modules?: string[];
    tier?: 'tier1' | 'tier2' | 'tier3';
    capture_screenshots?: boolean;

    // Outreach config
    compose?: boolean;
    auto_send?: boolean;
    strategy?: string;
  };
}

export interface CampaignSchedule {
  cron: string;
  enabled: boolean;
  timezone?: string;
}

export interface CampaignBudget {
  daily_max?: number;
  weekly_max?: number;
  monthly_max?: number;
}

export interface CampaignConfig {
  name: string;
  description?: string;
  project_id?: string;
  schedule?: CampaignSchedule;
  steps: CampaignStep[];
  budget?: CampaignBudget;
}

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  schedule?: string; // cron expression
  status: CampaignStatus;
  lastRun?: string; // ISO timestamp
  nextRun?: string; // ISO timestamp
  totalRuns: number;
  totalCost: string; // formatted as "10.25"
  createdAt: string; // ISO timestamp
  config?: CampaignConfig;
}

export interface CampaignRun {
  id: string;
  campaignId?: string;
  startedAt: string; // ISO timestamp
  completedAt?: string; // ISO timestamp
  status: RunStatus;
  stepsCompleted: number;
  stepsFailed: number;
  totalCost: string; // formatted as "10.25"
  triggerType: TriggerType;
  errors?: string[];
  results?: {
    prospects_generated?: number;
    leads_analyzed?: number;
    emails_composed?: number;
    emails_sent?: number;
    [key: string]: any;
  };
}

export interface CampaignStats {
  totalCampaigns: number;
  activeCampaigns: number;
  pausedCampaigns: number;
  scheduledCampaigns: number;
  totalRuns: number;
  totalCost: string;
}

// Schedule presets
export interface SchedulePreset {
  id: string;
  label: string;
  description: string;
  cron: string;
}

export const SCHEDULE_PRESETS: SchedulePreset[] = [
  {
    id: 'daily-9am',
    label: 'Daily at 9:00 AM',
    description: 'Runs every day at 9:00 AM',
    cron: '0 9 * * *'
  },
  {
    id: 'weekdays-9am',
    label: 'Weekdays at 9:00 AM',
    description: 'Runs Monday-Friday at 9:00 AM',
    cron: '0 9 * * 1-5'
  },
  {
    id: 'monday-9am',
    label: 'Every Monday at 9:00 AM',
    description: 'Runs once per week on Monday',
    cron: '0 9 * * 1'
  },
  {
    id: 'first-monday',
    label: 'First Monday of Month at 9:00 AM',
    description: 'Runs on the first Monday of each month',
    cron: '0 9 1-7 * 1'
  },
  {
    id: 'custom',
    label: 'Custom Schedule',
    description: 'Enter your own cron expression',
    cron: ''
  }
];
