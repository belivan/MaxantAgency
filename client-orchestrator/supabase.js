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
 * Upsert generated prospects into Supabase `prospects` table.
 * @param {Array<Object>} prospects
 * @param {Object} context
 * @param {string} context.runId
 * @param {string} context.source
 * @param {Object} context.brief
 * @param {string} context.status
 * @param {string} context.city
 * @returns {Promise<Array<Object>>}
 */
export async function upsertProspects(prospects, context = {}) {
  if (!supabase) {
    console.log('�?-�,?  Supabase not configured - skipping prospect sync');
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
    status: context.status || 'pending_analysis',
    run_id: context.runId || null,
    source: context.source || 'client-orchestrator',
    city: context.city || null,
    brief_snapshot: context.brief ? JSON.stringify(context.brief) : null,
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

