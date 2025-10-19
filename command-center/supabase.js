import { getSupabase } from '../client-orchestrator/supabase.js';

let cached = null;

export function requireSupabase() {
  if (!cached) {
    cached = getSupabase();
  }
  return cached;
}

export async function getAnalyzedUrlSet(urls) {
  if (!urls || urls.length === 0) {
    return new Set();
  }

  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('leads')
    .select('url')
    .in('url', urls);

  if (error) {
    console.error('�?O Failed to query leads table:', error);
    throw error;
  }

  return new Set((data || []).map((row) => (row.url || '').toLowerCase()));
}

export async function getPendingProspects(limit = 50) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('prospects')
    .select('*')
    .in('status', ['pending_analysis', 'queued'])
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('�?O Failed to load pending prospects:', error);
    throw error;
  }

  return data || [];
}

export async function flagProspects(websites, status) {
  const supabase = requireSupabase();
  if (!websites?.length) return;

  const { error } = await supabase
    .from('prospects')
    .update({ status, last_status_change: new Date().toISOString() })
    .in('website', websites.map((w) => w.toLowerCase()));

  if (error) {
    console.error('�?O Failed to update prospect status:', error);
  }
}

