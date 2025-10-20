import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

// Create client only if credentials are available (allows module import during tests)
let supabaseClient = null;

if (supabaseUrl && supabaseKey) {
  supabaseClient = createClient(supabaseUrl, supabaseKey);
}

// Export client with lazy validation (throws error only when accessed, not on import)
export const supabase = new Proxy({}, {
  get(target, prop) {
    if (!supabaseClient) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment variables');
    }
    return supabaseClient[prop];
  }
});

/**
 * Database helper functions
 */

// Campaigns
export async function createCampaign(campaign) {
  const { data, error } = await supabase
    .from('campaigns')
    .insert([campaign])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getCampaigns(filters = {}) {
  let query = supabase.from('campaigns').select('*');

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.project_id) {
    query = query.eq('project_id', filters.project_id);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getCampaignById(id) {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function updateCampaign(id, updates) {
  const { data, error } = await supabase
    .from('campaigns')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCampaign(id) {
  const { error } = await supabase
    .from('campaigns')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

// Campaign Runs
export async function createCampaignRun(run) {
  const { data, error } = await supabase
    .from('campaign_runs')
    .insert([run])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getCampaignRuns(campaignId, limit = 50) {
  const { data, error } = await supabase
    .from('campaign_runs')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function updateCampaignRun(id, updates) {
  const { data, error } = await supabase
    .from('campaign_runs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Get spending for budget tracking
export async function getSpending(campaignId, period) {
  const { startDate, endDate } = period;

  const { data, error } = await supabase
    .from('campaign_runs')
    .select('total_cost')
    .eq('campaign_id', campaignId)
    .gte('started_at', startDate)
    .lte('started_at', endDate);

  if (error) throw error;

  const total = data.reduce((sum, run) => sum + parseFloat(run.total_cost || 0), 0);
  return total;
}

// Get all active campaigns for scheduling
export async function getActiveCampaigns() {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('status', 'active')
    .not('schedule_cron', 'is', null);

  if (error) throw error;
  return data;
}
