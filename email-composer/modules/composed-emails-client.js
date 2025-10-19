/**
 * MAKSANT EMAIL COMPOSER - Composed Emails Client
 *
 * Handles all database interactions for the composed_emails table.
 */

import { supabase } from './supabase-client.js';

/**
 * Save a composed email to Supabase
 * @param {Object} emailData - Complete email data package
 * @returns {Promise<Object>} Saved email record
 */
export async function saveComposedEmail(emailData) {
  const {
    // Lead info
    lead_id,
    url,
    company_name,
    contact_email,
    contact_name,
    contact_title,
    industry,

    // Email content
    email_subject,
    email_body,
    email_strategy,

    // Variants (if any)
    has_variants,
    subject_variants,
    body_variants,
    recommended_variant,
    variant_reasoning,

    // Reasoning
    technical_reasoning,
    business_summary,
    verification_checklist,
    screenshot_urls,

    // Verification
    website_verified,
    verification_data,

    // Quality
    ai_model,
    quality_score,
    validation_issues,
  } = emailData;

  const { data, error } = await supabase
    .from('composed_emails')
    .insert({
      lead_id,
      url,
      company_name,
      contact_email,
      contact_name,
      contact_title,
      industry,
      email_subject,
      email_body,
      email_strategy,
      has_variants: has_variants || false,
      subject_variants,
      body_variants,
      recommended_variant,
      variant_reasoning,
      technical_reasoning,
      business_reasoning: business_summary,
      verification_checklist,
      screenshot_urls,
      website_verified: website_verified || false,
      verification_data,
      verified_at: website_verified ? new Date().toISOString() : null,
      ai_model,
      quality_score,
      validation_issues,
      status: 'pending',
      composed_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('L Error saving composed email:', error);
    throw error;
  }

  console.log(` Saved composed email to Supabase: ${data.id}`);
  return data;
}

/**
 * Get all composed emails with optional filters
 * @param {Object} filters - Optional filters
 * @returns {Promise<Array>} Array of composed emails
 */
export async function getComposedEmails(filters = {}) {
  let query = supabase
    .from('composed_emails')
    .select('*')
    .order('composed_at', { ascending: false });

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('L Error fetching composed emails:', error);
    throw error;
  }

  return data;
}

/**
 * Get a single composed email by ID
 * @param {string} id - Email ID
 * @returns {Promise<Object>} Composed email
 */
export async function getComposedEmailById(id) {
  const { data, error } = await supabase
    .from('composed_emails')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('L Error fetching composed email:', error);
    throw error;
  }

  return data;
}

/**
 * Update a composed email's status
 * @param {string} id - Email ID
 * @param {string} status - New status (pending/approved/rejected/sent/failed)
 * @param {Object} updates - Additional fields to update
 * @returns {Promise<Object>} Updated email
 */
export async function updateComposedEmailStatus(id, status, updates = {}) {
  const updateData = {
    status,
    ...updates,
  };

  if (status === 'approved' || status === 'rejected') {
    updateData.reviewed_at = new Date().toISOString();
  }

  if (status === 'sent') {
    updateData.sent_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('composed_emails')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('L Error updating composed email:', error);
    throw error;
  }

  console.log(` Updated email ${id} status to: ${status}`);
  return data;
}

/**
 * Get all approved emails ready to send
 * @returns {Promise<Array>} Array of approved emails
 */
export async function getApprovedEmails() {
  const { data, error } = await supabase
    .from('composed_emails')
    .select('*')
    .eq('status', 'approved')
    .not('contact_email', 'is', null)
    .order('composed_at', { ascending: false });

  if (error) {
    console.error('L Error fetching approved emails:', error);
    throw error;
  }

  return data;
}

/**
 * Mark email as synced to Notion
 * @param {string} id - Email ID
 * @param {string} notionPageId - Notion page ID
 * @returns {Promise<Object>} Updated email
 */
export async function markSyncedToNotion(id, notionPageId) {
  const { data, error } = await supabase
    .from('composed_emails')
    .update({
      notion_page_id: notionPageId,
      synced_to_notion: true,
      notion_sync_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('L Error marking email as synced to Notion:', error);
    throw error;
  }

  console.log(` Marked email ${id} as synced to Notion: ${notionPageId}`);
  return data;
}

/**
 * Update email performance metrics (opened, clicked, replied)
 * @param {string} id - Email ID
 * @param {Object} metrics - Performance metrics
 * @returns {Promise<Object>} Updated email
 */
export async function updateEmailMetrics(id, metrics) {
  const updateData = {};

  if (metrics.opened) {
    updateData.opened = true;
    updateData.opened_at = new Date().toISOString();
  }

  if (metrics.clicked) {
    updateData.clicked = true;
    updateData.clicked_at = new Date().toISOString();
  }

  if (metrics.replied) {
    updateData.replied = true;
    updateData.replied_at = new Date().toISOString();
    if (metrics.reply_sentiment) {
      updateData.reply_sentiment = metrics.reply_sentiment;
    }
  }

  const { data, error } = await supabase
    .from('composed_emails')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('L Error updating email metrics:', error);
    throw error;
  }

  console.log(` Updated metrics for email ${id}`);
  return data;
}

/**
 * Get stats for composed emails
 * @returns {Promise<Object>} Stats object
 */
export async function getComposedEmailStats() {
  const { data, error } = await supabase
    .from('composed_emails')
    .select('status, quality_score, opened, replied');

  if (error) {
    console.error('L Error fetching composed email stats:', error);
    throw error;
  }

  const stats = {
    total: data.length,
    byStatus: {
      pending: data.filter(e => e.status === 'pending').length,
      approved: data.filter(e => e.status === 'approved').length,
      rejected: data.filter(e => e.status === 'rejected').length,
      sent: data.filter(e => e.status === 'sent').length,
      failed: data.filter(e => e.status === 'failed').length,
    },
    avgQualityScore: data.reduce((sum, e) => sum + (e.quality_score || 0), 0) / data.length || 0,
    performance: {
      sent: data.filter(e => e.status === 'sent').length,
      opened: data.filter(e => e.opened).length,
      replied: data.filter(e => e.replied).length,
    },
  };

  if (stats.performance.sent > 0) {
    stats.performance.openRate = ((stats.performance.opened / stats.performance.sent) * 100).toFixed(1);
    stats.performance.replyRate = ((stats.performance.replied / stats.performance.sent) * 100).toFixed(1);
  }

  return stats;
}
