/**
 * DATABASE INTEGRATION - Supabase client for leads and composed emails
 *
 * Handles:
 * - Fetching leads (regular + social outreach)
 * - Saving composed emails
 * - Updating lead statuses
 * - Querying ready leads
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load environment variables from root .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../../.env') });

// Validate environment variables
if (!process.env.SUPABASE_URL) {
  throw new Error('SUPABASE_URL is not set in environment variables');
}
if (!process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('SUPABASE_SERVICE_KEY is not set in environment variables');
}

// Initialize Supabase client
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Get leads with flexible filtering (generic function)
 * @param {object} filters - Optional filters
 * @returns {Promise<Array>} Leads
 */
export async function getLeads(filters = {}) {
  const {
    limit = 100,
    status = null,
    project_id = null,
    priority_tier = null,
    website_grade = null,
    requires_social_outreach = null
  } = filters;

  try {
    let query = supabase
      .from('leads')
      .select('*')
      .order('analyzed_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (project_id) query = query.eq('project_id', project_id);
    if (priority_tier) query = query.eq('priority_tier', priority_tier);
    if (website_grade) query = query.eq('website_grade', website_grade);
    if (requires_social_outreach !== null) query = query.eq('requires_social_outreach', requires_social_outreach);
    if (limit) query = query.limit(limit);

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch leads: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error(`Error in getLeads: ${error.message}`);
    throw error;
  }
}

/**
 * Get all regular leads (for email outreach)
 * @param {object} filters - Optional filters
 * @returns {Promise<Array>} Leads
 */
export async function getRegularLeads(filters = {}) {
  // Validate filters
  if (filters && typeof filters !== 'object') {
    throw new Error('Filters must be an object');
  }

  const {
    limit = 100,
    grade = null,
    minScore = null,
    status = null,
    projectId = null
  } = filters;

  // Validate limit
  if (limit && (typeof limit !== 'number' || limit < 1 || limit > 1000)) {
    throw new Error('Limit must be a number between 1 and 1000');
  }

  try {
    let query = supabase
      .from('leads')
      .select('*')
      .eq('requires_social_outreach', false)
      .order('created_at', { ascending: false });

    if (grade) {
      query = query.eq('lead_grade', grade);
    }

    if (minScore) {
      query = query.gte('website_score', minScore);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch regular leads: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error(`Error in getRegularLeads: ${error.message}`);
    throw error;
  }
}

/**
 * Get all social outreach leads (for DM outreach)
 * @param {object} filters - Optional filters
 * @returns {Promise<Array>} Social leads
 */
export async function getSocialLeads(filters = {}) {
  if (filters && typeof filters !== 'object') {
    throw new Error('Filters must be an object');
  }

  const {
    limit = 100,
    platform = null,
    status = null
  } = filters;

  try {
    let query = supabase
      .from('leads')
      .select('*')
      .eq('requires_social_outreach', true)
      .order('created_at', { ascending: false});

  if (platform) {
    // Filter by having social profile for platform
    // Instagram: social_profiles->instagram
    // Facebook: social_profiles->facebook
    // LinkedIn: social_profiles->linkedin
    query = query.not('social_profiles', 'is', null);
  }

  if (status) {
    query = query.eq('status', status);
  }

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch social leads: ${error.message}`);
  }

    // Filter by platform if specified
    if (platform && data) {
      return data.filter(lead =>
        lead.social_profiles &&
        lead.social_profiles[platform]
      );
    }

    return data || [];
  } catch (error) {
    console.error('Error in getSocialLeads:', error.message);
    throw error;
  }
}

/**
 * Get lead by ID
 * @param {number} id - Lead ID
 * @returns {Promise<object>} Lead
 */
export async function getLeadById(id) {
  if (!id) throw new Error('Lead ID is required');

  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Failed to fetch lead ${id}: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error(`Error in getLeadById(${id}):`, error.message);
    throw error;
  }
}

/**
 * Get lead by URL
 * @param {string} url - Website URL
 * @returns {Promise<object|null>} Lead or null
 */
export async function getLeadByUrl(url) {
  if (!url) throw new Error('URL is required');

  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('url', url)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      throw new Error(`Failed to fetch lead by URL: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error(`Error in getLeadByUrl(${url}):`, error.message);
    throw error;
  }
}

/**
 * Save composed email to database
 * @param {object} email - Email data
 * @returns {Promise<object>} Saved email record
 */
export async function saveComposedEmail(email) {
  if (!email || typeof email !== 'object') {
    throw new Error('Email object is required');
  }

  const {
    lead_id,
    lead = null,
    url,
    company_name,
    industry,
    contact_email,
    contact_name,
    contact_title,
    subject,
    body,
    strategy,
    platform = 'email',
    model_used,
    generation_time_ms,
    cost,
    validation_score,
    validation_issues,
    variants = null,
    status = 'pending',  // Use 'pending' as default (database constraint doesn't allow 'ready')
    has_variants = false,
    subject_variants,
    body_variants,
    recommended_variant,
    variant_reasoning,
    usage,
    project_id = null
  } = email;

  // Validate required fields
  if (!lead_id) {
    throw new Error('lead_id is required');
  }
  if (!subject && platform === 'email') {
    throw new Error('subject is required for email platform');
  }
  if (!body) {
    throw new Error('body is required');
  }

  // Ensure url and company_name are populated (required by schema)
  const finalUrl = url || lead?.url || null;
  const finalCompanyName = company_name || lead?.company_name || 'Unknown Company';

  if (!finalUrl) {
    throw new Error('url is required (provide email.url or email.lead.url)');
  }

  try {
    // Debug: log the status being used
    console.log(`   [DEBUG] Saving with status: "${status}"`);

    // Build complete record with all schema fields
    const record = {
      lead_id,
      url: finalUrl,
      company_name: finalCompanyName,
      industry: industry || lead?.industry || null,
      contact_email: contact_email || lead?.contact_email || null,
      contact_name: contact_name || lead?.contact_name || null,
      contact_title: contact_title || lead?.contact_title || null,
      platform: platform || 'email',  // 'email', 'instagram', 'facebook', 'linkedin'
      email_subject: platform === 'email' ? subject : null,  // Only emails have subjects
      email_body: body,
      email_strategy: strategy || 'compliment-sandwich',
      character_count: email.character_count || null,  // For social DMs
      social_profile_url: lead?.social_profile_url || email.social_profile_url || null,
      has_variants: has_variants || (subject_variants && subject_variants.length > 0) || false,
      subject_variants: subject_variants || null,
      body_variants: body_variants || null,
      recommended_variant: recommended_variant || null,
      variant_reasoning: variant_reasoning || null,
      quality_score: validation_score || null,
      validation_issues: validation_issues || null,
      project_id: project_id || lead?.project_id || null,  // Project isolation
      status,
      ai_model: model_used || null,
      generation_cost: cost || null,
      generation_time_ms: generation_time_ms || null,
      usage_input_tokens: usage?.input_tokens || null,
      usage_output_tokens: usage?.output_tokens || null
    };

    const { data, error } = await supabase
      .from('composed_emails')
      .insert([record])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save composed email: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error in saveComposedEmail:', error.message);
    throw error;
  }
}

/**
 * Update composed email status
 * @param {number} id - Composed email ID
 * @param {string} status - New status
 * @param {object} metadata - Optional metadata
 * @returns {Promise<object>} Updated record
 */
export async function updateEmailStatus(id, status, metadata = {}) {
  // Validate inputs
  if (!id) {
    throw new Error('Email ID is required');
  }
  if (typeof id !== 'number' && typeof id !== 'string') {
    throw new Error('Email ID must be a number or string');
  }
  if (!status) {
    throw new Error('Status is required');
  }
  if (typeof status !== 'string') {
    throw new Error('Status must be a string');
  }
  if (metadata && typeof metadata !== 'object') {
    throw new Error('Metadata must be an object');
  }

  try {
    const update = {
      status,
      ...metadata
      // Note: updated_at is auto-updated by database
    };

    const { data, error } = await supabase
      .from('composed_emails')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update email status: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error(`Error in updateEmailStatus(${id}):`, error.message);
    throw error;
  }
}

/**
 * Get ready emails for sending (status='approved')
 * @param {object} filters - Filters
 * @returns {Promise<Array>} Ready/approved emails
 */
export async function getReadyEmails(filters = {}) {
  // Validate filters
  if (filters && typeof filters !== 'object') {
    throw new Error('Filters must be an object');
  }

  const {
    limit = 50,
    status = 'approved', // approved emails are ready to send
    platform = 'email' // Note: platform column doesn't exist in current schema
  } = filters;

  // Validate limit
  if (limit && (typeof limit !== 'number' || limit < 1 || limit > 500)) {
    throw new Error('Limit must be a number between 1 and 500');
  }

  // Validate status
  if (status && typeof status !== 'string') {
    throw new Error('Status must be a string');
  }

  try {
    let query = supabase
      .from('composed_emails')
      .select(`
        *,
        leads (
          id,
          url,
          company_name,
          industry,
          contact_email,
          social_profiles
        )
      `)
      .eq('status', status)
      .order('created_at', { ascending: true });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch ready emails: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error in getReadyEmails:', error.message);
    throw error;
  }
}

/**
 * Get composed email by ID
 * @param {number} id - Composed email ID
 * @returns {Promise<object>} Composed email with lead data
 */
export async function getComposedEmailById(id) {
  // Validate input
  if (!id) {
    throw new Error('Composed email ID is required');
  }
  if (typeof id !== 'number' && typeof id !== 'string') {
    throw new Error('Composed email ID must be a number or string');
  }

  try {
    const { data, error } = await supabase
      .from('composed_emails')
      .select(`
        *,
        leads (
          id,
          url,
          company_name,
          industry,
          contact_email,
          social_profiles
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Failed to fetch composed email ${id}: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error(`Error in getComposedEmailById(${id}):`, error.message);
    throw error;
  }
}

/**
 * Mark lead as processed
 * @param {number} id - Lead ID
 * @param {string} status - Status (e.g., 'contacted', 'emailed', 'dm_sent')
 * @returns {Promise<object>} Updated lead
 */
export async function markLeadProcessed(id, status = 'contacted') {
  // Validate inputs
  if (!id) {
    throw new Error('Lead ID is required');
  }
  if (typeof id !== 'number' && typeof id !== 'string') {
    throw new Error('Lead ID must be a number or string');
  }
  if (!status) {
    throw new Error('Status is required');
  }
  if (typeof status !== 'string') {
    throw new Error('Status must be a string');
  }

  try {
    const { data, error } = await supabase
      .from('leads')
      .update({
        outreach_status: status,
        outreach_date: new Date().toISOString()
        // Note: updated_at is auto-updated by database
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to mark lead processed: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error(`Error in markLeadProcessed(${id}):`, error.message);
    throw error;
  }
}

/**
 * Get statistics
 * @returns {Promise<object>} Stats
 */
export async function getStats() {
  try {
    // Get lead counts
    const { count: regularCount, error: error1 } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('requires_social_outreach', false);

    const { count: socialCount, error: error2 } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('requires_social_outreach', true);

    const { count: composedCount, error: error3 } = await supabase
      .from('composed_emails')
      .select('*', { count: 'exact', head: true });

    const { count: readyCount, error: error4 } = await supabase
      .from('composed_emails')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'ready');

    const { count: sentCount, error: error5 } = await supabase
      .from('composed_emails')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'sent');

    if (error1 || error2 || error3 || error4 || error5) {
      const errorMsg = error1?.message || error2?.message || error3?.message || error4?.message || error5?.message;
      throw new Error(`Failed to fetch stats: ${errorMsg}`);
    }

    return {
      leads: {
        regular: regularCount || 0,
        social: socialCount || 0,
        total: (regularCount || 0) + (socialCount || 0)
      },
      emails: {
        total: composedCount || 0,
        ready: readyCount || 0,
        sent: sentCount || 0
      }
    };
  } catch (error) {
    console.error('Error in getStats:', error.message);
    throw error;
  }
}

/**
 * Test database connection
 * @returns {Promise<boolean>} True if connected
 */
export async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('id')
      .limit(1);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    throw new Error(`Database connection failed: ${error.message}`);
  }
}
