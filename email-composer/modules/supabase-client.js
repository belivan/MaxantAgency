/**
 * MAKSANT EMAIL COMPOSER - Supabase Client Module
 *
 * Handles all database interactions for pulling lead data from Supabase.
 * Provides query helpers for filtering and retrieving leads.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('L SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env file');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Get all leads from the database with optional filters
 * @param {Object} filters - Optional filters (grade, industry, hasEmail, etc.)
 * @returns {Promise<Array>} Array of lead objects
 */
export async function getLeads(filters = {}) {
  let query = supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false });

  // Apply filters
  if (filters.grade) {
    query = query.eq('lead_grade', filters.grade);
  }

  if (filters.industry) {
    query = query.eq('industry', filters.industry);
  }

  if (filters.hasEmail) {
    query = query.not('contact_email', 'is', null);
  }

  if (filters.minScore) {
    query = query.gte('website_score', filters.minScore);
  }

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('L Error fetching leads:', error);
    throw error;
  }

  return data;
}

/**
 * Get a single lead by URL
 * @param {string} url - Website URL
 * @returns {Promise<Object|null>} Lead object or null if not found
 */
export async function getLeadByUrl(url) {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('url', url)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    console.error('L Error fetching lead:', error);
    throw error;
  }

  return data;
}

/**
 * Get leads ready for outreach (grade A/B, has email, not yet contacted)
 * @param {number} limit - Maximum number of leads to return
 * @returns {Promise<Array>} Array of lead objects
 */
export async function getLeadsReadyForOutreach(limit = 10) {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .in('lead_grade', ['A', 'B'])
    .not('contact_email', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('L Error fetching leads ready for outreach:', error);
    throw error;
  }

  return data;
}

/**
 * Get leads by grade
 * @param {string} grade - Lead grade (A, B, C, D, or F)
 * @param {number} limit - Maximum number of leads to return
 * @returns {Promise<Array>} Array of lead objects
 */
export async function getLeadsByGrade(grade, limit = 20) {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('lead_grade', grade)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error(`L Error fetching grade ${grade} leads:`, error);
    throw error;
  }

  return data;
}

/**
 * Get leads by industry
 * @param {string} industry - Industry name
 * @param {number} limit - Maximum number of leads to return
 * @returns {Promise<Array>} Array of lead objects
 */
export async function getLeadsByIndustry(industry, limit = 20) {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('industry', industry)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error(`L Error fetching ${industry} leads:`, error);
    throw error;
  }

  return data;
}

/**
 * Update a lead's outreach status
 * @param {string} url - Website URL
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated lead object
 */
export async function updateLead(url, updates) {
  const { data, error } = await supabase
    .from('leads')
    .update(updates)
    .eq('url', url)
    .select()
    .single();

  if (error) {
    console.error('L Error updating lead:', error);
    throw error;
  }

  return data;
}

/**
 * Get summary statistics for all leads
 * @returns {Promise<Object>} Statistics object
 */
export async function getLeadStats() {
  const { data, error } = await supabase
    .from('leads')
    .select('lead_grade, industry, contact_email');

  if (error) {
    console.error('L Error fetching lead stats:', error);
    throw error;
  }

  const stats = {
    total: data.length,
    byGrade: {
      A: data.filter(l => l.lead_grade === 'A').length,
      B: data.filter(l => l.lead_grade === 'B').length,
      C: data.filter(l => l.lead_grade === 'C').length,
      D: data.filter(l => l.lead_grade === 'D').length,
      F: data.filter(l => l.lead_grade === 'F').length,
    },
    withEmail: data.filter(l => l.contact_email).length,
    withoutEmail: data.filter(l => !l.contact_email).length,
    industries: [...new Set(data.map(l => l.industry).filter(Boolean))],
  };

  return stats;
}
