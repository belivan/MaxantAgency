/**
 * Supabase Client
 * Direct database queries when needed
 */

import { createClient } from '@supabase/supabase-js';
import type { Prospect, Lead, Email, Project } from '@/lib/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================================
// PROSPECTS
// ============================================================================

export async function getProspectsByProject(projectId: string): Promise<Prospect[]> {
  const { data, error } = await supabase
    .from('prospects')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getProspectsByStatus(status: Prospect['status']): Promise<Prospect[]> {
  const { data, error } = await supabase
    .from('prospects')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// ============================================================================
// LEADS
// ============================================================================

export async function getLeadsByGrade(grade: string): Promise<Lead[]> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('grade', grade)
    .order('overall_score', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getLeadsByProject(projectId: string): Promise<Lead[]> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('project_id', projectId)
    .order('overall_score', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getTopLeads(limit: number = 10): Promise<Lead[]> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .in('grade', ['A', 'B'])
    .not('contact_email', 'is', null)
    .order('overall_score', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

// ============================================================================
// EMAILS
// ============================================================================

export async function getEmailsByStatus(status: Email['status']): Promise<Email[]> {
  const { data, error } = await supabase
    .from('emails')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getEmailsByProject(projectId: string): Promise<Email[]> {
  const { data, error } = await supabase
    .from('emails')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// ============================================================================
// PROJECTS
// ============================================================================

export async function getAllProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getProjectById(id: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createProject(project: {
  name: string;
  description?: string;
  icp_brief?: Record<string, any>;
  budget_limit?: number;
}): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .insert({
      ...project,
      status: 'active',
      prospects_count: 0,
      analyzed_count: 0,
      emails_sent_count: 0,
      social_messages_count: 0,
      grade_a_count: 0,
      grade_b_count: 0,
      total_cost: 0,
      prospecting_cost: 0,
      analysis_cost: 0,
      outreach_cost: 0
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateProject(
  id: string,
  updates: Partial<Project>
): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// ANALYTICS HELPERS
// ============================================================================

export async function getProspectCountByStatus(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('prospects')
    .select('status');

  if (error) throw error;

  const counts: Record<string, number> = {};
  data?.forEach((row: any) => {
    counts[row.status] = (counts[row.status] || 0) + 1;
  });

  return counts;
}

export async function getLeadCountByGrade(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('leads')
    .select('grade');

  if (error) throw error;

  const counts: Record<string, number> = {};
  data?.forEach((row: any) => {
    counts[row.grade] = (counts[row.grade] || 0) + 1;
  });

  return counts;
}

export async function getTotalCosts(): Promise<{
  prospecting_cost: number;
  analysis_cost: number;
  outreach_cost: number;
  total_cost: number;
}> {
  // Query prospects for prospecting cost
  const { data: prospects } = await supabase
    .from('prospects')
    .select('discovery_metadata');

  const prospecting_cost = prospects?.reduce((sum: number, p: any) => {
    return sum + (p.discovery_metadata?.cost || 0);
  }, 0) || 0;

  // Query leads for analysis cost
  const { data: leads } = await supabase
    .from('leads')
    .select('analysis_cost');

  const analysis_cost = leads?.reduce((sum: number, l: any) => {
    return sum + (l.analysis_cost || 0);
  }, 0) || 0;

  // Query emails for outreach cost
  const { data: emails } = await supabase
    .from('emails')
    .select('composition_cost');

  const outreach_cost = emails?.reduce((sum: number, e: any) => {
    return sum + (e.composition_cost || 0);
  }, 0) || 0;

  return {
    prospecting_cost,
    analysis_cost,
    outreach_cost,
    total_cost: prospecting_cost + analysis_cost + outreach_cost
  };
}

/**
 * Get analytics data
 */
export async function getAnalytics(): Promise<any> {
  const { data: prospects } = await supabase.from('prospects').select('*');
  const { data: leads } = await supabase.from('leads').select('*');

  const total_prospects = prospects?.length || 0;
  const total_leads = leads?.length || 0;
  const qualified_leads = leads?.filter((l: any) => l.lead_grade === 'A' || l.lead_grade === 'B').length || 0;

  return {
    stats: {
      total_cost: 0,
      total_prospects,
      total_leads,
      qualified_leads,
      contacted: 0,
      cost_per_lead: 0,
      conversion_rate: total_prospects > 0 ? (total_leads / total_prospects) * 100 : 0
    },
    cost_breakdown: [],
    funnel: {
      prospects: total_prospects,
      analyzed: total_leads,
      leads: total_leads,
      qualified: qualified_leads,
      contacted: 0
    }
  };
}

/**
 * Get leads by IDs
 */
export async function getLeadsByIds(ids: string[]): Promise<any[]> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .in('id', ids);

  if (error) throw error;

  // Map database field names to UI field names
  return (data || []).map((lead: any) => ({
    ...lead,
    grade: lead.grade || lead.website_grade, // Map website_grade → grade
  }));
}

// ============================================================================
// REALTIME SUBSCRIPTIONS
// ============================================================================

export function subscribeToProspects(
  callback: (payload: any) => void,
  filters?: { project_id?: string }
) {
  let query = supabase
    .channel('prospects_changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'prospects',
      filter: filters?.project_id ? `project_id=eq.${filters.project_id}` : undefined
    }, callback);

  return query.subscribe();
}

export function subscribeToLeads(
  callback: (payload: any) => void,
  filters?: { project_id?: string }
) {
  let query = supabase
    .channel('leads_changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'leads',
      filter: filters?.project_id ? `project_id=eq.${filters.project_id}` : undefined
    }, callback);

  return query.subscribe();
}
