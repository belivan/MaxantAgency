import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

// Load env from this package then fall back to website-audit-tool/.env to reuse credentials
dotenv.config();

try {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const auditEnv = path.resolve(__dirname, '../website-audit-tool/.env');
  if (fs.existsSync(auditEnv)) {
    dotenv.config({ path: auditEnv, override: false });
  }
} catch {}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;

let supabase = null;
if (url && key) {
  supabase = createClient(url, key);
}

export function hasSupabase() {
  return !!supabase;
}

export function getSupabase() {
  if (!supabase) {
    throw new Error('Supabase credentials not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY.');
  }
  return supabase;
}

/**
 * Create a new project for tracking prospects, leads, and emails
 * @param {Object} projectData
 * @param {string} projectData.name - Human-readable project name
 * @param {string} projectData.description - Optional description
 * @param {Object} projectData.icp_data - ICP configuration from brief.json
 * @returns {Promise<Object>} The created project with id
 */
export async function createProject({ name, description, icp_data }) {
  if (!supabase) {
    console.log('📊  Supabase not configured - skipping project creation');
    return null;
  }

  const { data, error } = await supabase
    .from('projects')
    .insert({
      name,
      description,
      icp_data,
      status: 'active',
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Supabase project creation failed:', error);
    throw error;
  }

  console.log(`✅ Created project: ${name} (ID: ${data.id})`);
  return data;
}

/**
 * Update project statistics
 * @param {string} projectId - UUID of the project
 * @returns {Promise<Object>} Updated stats
 */
export async function updateProjectStats(projectId) {
  if (!supabase || !projectId) {
    return null;
  }

  const { data, error } = await supabase.rpc('update_project_stats', {
    p_project_id: projectId
  });

  if (error) {
    console.error('❌ Failed to update project stats:', error);
    return null;
  }

  return data;
}

/**
 * Fetch project by ID
 * @param {string} projectId - UUID of the project
 * @returns {Promise<Object>} Project data
 */
export async function getProject(projectId) {
  if (!supabase || !projectId) {
    return null;
  }

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (error) {
    console.error('❌ Failed to fetch project:', error);
    return null;
  }

  return data;
}

/**
 * Fetch all projects with optional filtering
 * @param {Object} options
 * @param {string} options.status - Filter by status (active, paused, completed)
 * @returns {Promise<Array<Object>>} List of projects
 */
export async function listProjects({ status } = {}) {
  if (!supabase) {
    return [];
  }

  let query = supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('❌ Failed to list projects:', error);
    return [];
  }

  return data || [];
}

/**
 * Upsert generated prospects into Supabase `prospects` table.
 * @param {Array<Object>} prospects
 * @param {Object} context
 * @param {string} context.runId
 * @param {string} context.source
 * @param {Object} context.brief
 * @param {string} context.status
 * @param {string} context.city
 * @param {string} context.projectId - UUID of the project to link prospects to
 * @returns {Promise<Array<Object>>}
 */
export async function upsertProspects(prospects, context = {}) {
  if (!supabase) {
    console.log('📊  Supabase not configured - skipping prospect sync');
    return [];
  }

  if (!Array.isArray(prospects) || prospects.length === 0) {
    return [];
  }

  const payload = prospects.map((p) => ({
    website: (p.website || '').toLowerCase(),
    company_name: p.name || null,
    industry: p.industry || null,
    why_now: p.why_now || null,
    teaser: p.teaser || null,
    social_profiles: p.social_profiles || null,
    status: context.status || 'pending_analysis',
    run_id: context.runId || null,
    source: context.source || 'client-orchestrator',
    city: context.city || null,
    brief_snapshot: context.brief ? JSON.stringify(context.brief) : null,
    project_id: context.projectId || null,
    created_at: new Date().toISOString()
  }));

  const { data, error } = await supabase
    .from('prospects')
    .upsert(payload, { onConflict: 'website', ignoreDuplicates: false })
    .select();

  if (error) {
    console.error('�?O Supabase prospect upsert failed:', error);
    throw error;
  }

  return data || [];
}

export async function markProspectStatus(websites, status = 'analyzed') {
  if (!supabase || !Array.isArray(websites) || websites.length === 0) {
    return;
  }

  const { error } = await supabase
    .from('prospects')
    .update({ status, last_status_change: new Date().toISOString() })
    .in('website', websites.map((w) => w.toLowerCase()));

  if (error) {
    console.error('�?O Failed to update prospect status:', error);
  }
}

export async function fetchProspectWebsitesByStatus(statusList = ['pending_analysis']) {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('prospects')
    .select('website')
    .in('status', statusList);

  if (error) {
    console.error('�?O Failed to fetch prospects:', error);
    return [];
  }

  return (data || [])
    .map((row) => (row.website || '').toLowerCase())
    .filter(Boolean);
}

