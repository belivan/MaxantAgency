/**
 * Supabase Client for Outreach Engine
 *
 * Handles database operations for composed_outreach and social_outreach tables
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load environment variables from root .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../../.env') });

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Save a composed email to the database
 *
 * @param {object} email - Email data from composition
 * @returns {Promise<object>} Saved email with ID
 */
export async function saveComposedEmail(email) {
  try {
    const { data, error } = await supabase
      .from('composed_outreach')
      .insert(email)
      .select()
      .single();

    if (error) {
      console.error('Failed to save composed email:', error);
      throw error;
    }

    console.log(`✅ Email saved: ${data.company_name} (${data.status})`);
    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * Update a composed email in the database
 *
 * @param {string} id - Email ID
 * @param {object} updates - Fields to update
 * @returns {Promise<object>} Updated email
 */
export async function updateComposedEmail(id, updates) {
  try {
    const { data, error } = await supabase
      .from('composed_outreach')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update composed email:', error);
      throw error;
    }

    console.log(`✅ Email updated: ${id}`);
    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * Get composed emails with filters
 *
 * @param {object} filters - Query filters
 * @returns {Promise<Array>} Array of composed emails
 */
export async function getComposedEmails(filters = {}) {
  try {
    let query = supabase.from('composed_outreach').select('*');

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.leadId) {
      query = query.eq('lead_id', filters.leadId);
    }

    if (filters.projectId) {
      query = query.eq('project_id', filters.projectId);
    }

    if (filters.campaignId) {
      query = query.eq('campaign_id', filters.campaignId);
    }

    if (filters.strategy) {
      query = query.eq('email_strategy', filters.strategy);
    }

    if (filters.minQuality) {
      query = query.gte('quality_score', filters.minQuality);
    }

    // Pagination
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    query = query.limit(limit).range(offset, offset + limit - 1);

    // Order
    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch composed emails:', error);
      throw error;
    }

    console.log(`✅ Fetched ${data.length} composed emails`);
    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * Get a single composed email by ID
 *
 * @param {string} id - Email ID
 * @returns {Promise<object>} Email object
 */
export async function getComposedEmailById(id) {
  try {
    const { data, error } = await supabase
      .from('composed_outreach')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Failed to fetch composed email:', error);
      throw error;
    }

    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * Mark an email as sent
 *
 * @param {string} id - Email ID
 * @param {string} messageId - SMTP Message-ID
 * @returns {Promise<object>} Updated email
 */
export async function markEmailAsSent(id, messageId) {
  return updateComposedEmail(id, {
    status: 'sent',
    sent_at: new Date().toISOString(),
    email_message_id: messageId
  });
}

/**
 * Delete a composed email by ID
 *
 * @param {string} id - Email ID
 * @returns {Promise<void>}
 */
export async function deleteComposedEmail(id) {
  try {
    const { error } = await supabase
      .from('composed_outreach')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Failed to delete composed email:', error);
      throw error;
    }

    console.log(`✅ Composed email deleted: ${id}`);
  } catch (error) {
    throw error;
  }
}

// ============================================
// Social Outreach Functions
// ============================================

/**
 * Save a social outreach message to the database
 *
 * @param {object} message - Social message data
 * @returns {Promise<object>} Saved message with ID
 */
export async function saveSocialOutreach(message) {
  try {
    const { data, error } = await supabase
      .from('social_outreach')
      .insert(message)
      .select()
      .single();

    if (error) {
      console.error('Failed to save social outreach:', error);
      throw error;
    }

    console.log(`✅ Social message saved: ${data.company_name} on ${data.platform} (${data.status})`);
    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * Update a social outreach message in the database
 *
 * @param {string} id - Message ID
 * @param {object} updates - Fields to update
 * @returns {Promise<object>} Updated message
 */
export async function updateSocialOutreach(id, updates) {
  try {
    const { data, error } = await supabase
      .from('social_outreach')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update social outreach:', error);
      throw error;
    }

    console.log(`✅ Social message updated: ${id}`);
    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * Get social outreach messages with filters
 *
 * @param {object} filters - Query filters
 * @returns {Promise<Array>} Array of social messages
 */
export async function getSocialOutreach(filters = {}) {
  try {
    let query = supabase.from('social_outreach').select('*');

    // Apply filters
    if (filters.platform) {
      query = query.eq('platform', filters.platform);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.leadId) {
      query = query.eq('lead_id', filters.leadId);
    }

    if (filters.projectId) {
      query = query.eq('project_id', filters.projectId);
    }

    if (filters.campaignId) {
      query = query.eq('campaign_id', filters.campaignId);
    }

    if (filters.minQuality) {
      query = query.gte('quality_score', filters.minQuality);
    }

    // Pagination
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    query = query.limit(limit).range(offset, offset + limit - 1);

    // Order
    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch social outreach:', error);
      throw error;
    }

    console.log(`✅ Fetched ${data.length} social messages`);
    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * Get social messages from composed_outreach table
 * Extracts social variations and returns them as individual message objects
 *
 * @param {object} filters - Query filters
 * @returns {Promise<Array>} Array of social messages
 */
export async function getSocialMessages(filters = {}) {
  try {
    let query = supabase.from('composed_outreach').select('*');

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.projectId) {
      query = query.eq('project_id', filters.projectId);
    }

    // Pagination
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    query = query.limit(limit).range(offset, offset + limit - 1);

    // Order
    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch social messages:', error);
      throw error;
    }

    // Extract social variations from each row
    const messages = [];
    const platforms = ['instagram', 'facebook', 'linkedin'];
    const strategies = ['free_value', 'portfolio_building', 'problem_first'];

    for (const row of data) {
      for (const platform of platforms) {
        // Apply platform filter if specified
        if (filters.platform && filters.platform !== platform) {
          continue;
        }

        for (const strategy of strategies) {
          // Apply strategy filter if specified
          if (filters.strategy && filters.strategy !== strategy.replace('_', '-')) {
            continue;
          }

          const fieldName = `${platform}_${strategy}`;
          const messageContent = row[fieldName];

          // Only include if message exists
          if (messageContent) {
            messages.push({
              id: `${row.id}_${platform}_${strategy}`,
              composed_outreach_id: row.id,
              lead_id: row.lead_id,
              url: row.url,
              company_name: row.company_name,
              platform,
              strategy: strategy.replace('_', '-'),
              message_content: messageContent,
              character_count: messageContent.length,
              social_profile_url: row[`${platform}_profile_url`],
              status: row.status,
              project_id: row.project_id,
              created_at: row.created_at,
              updated_at: row.updated_at
            });
          }
        }
      }
    }

    // Apply quality filter if specified
    if (filters.minQuality) {
      // Note: quality_score is at row level, not per variation
      // This is a limitation of the current schema
    }

    console.log(`✅ Fetched ${messages.length} social messages from ${data.length} outreach rows`);
    return messages;
  } catch (error) {
    throw error;
  }
}

/**
 * Get a single social outreach message by ID
 *
 * @param {string} id - Message ID
 * @returns {Promise<object>} Message object
 */
export async function getSocialOutreachById(id) {
  try {
    const { data, error } = await supabase
      .from('social_outreach')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Failed to fetch social outreach:', error);
      throw error;
    }

    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * Mark a social message as sent
 *
 * @param {string} id - Message ID
 * @returns {Promise<object>} Updated message
 */
export async function markSocialAsSent(id) {
  return updateSocialOutreach(id, {
    status: 'sent',
    sent_at: new Date().toISOString()
  });
}

/**
 * Delete a social outreach message by ID
 *
 * @param {string} id - Message ID
 * @returns {Promise<void>}
 */
export async function deleteSocialOutreach(id) {
  try {
    const { error } = await supabase
      .from('social_outreach')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Failed to delete social outreach:', error);
      throw error;
    }

    console.log(`✅ Social message deleted: ${id}`);
  } catch (error) {
    throw error;
  }
}

// ============================================
// Statistics Functions
// ============================================

/**
 * Get outreach statistics
 *
 * @param {object} filters - Optional filters
 * @returns {Promise<object>} Statistics object
 */
export async function getOutreachStats(filters = {}) {
  try {
    // Fetch emails
    let emailQuery = supabase.from('composed_outreach').select('status, quality_score, generation_cost');

    if (filters.projectId) {
      emailQuery = emailQuery.eq('project_id', filters.projectId);
    }

    const { data: emails, error: emailError } = await emailQuery;

    if (emailError) throw emailError;

    // Fetch social messages
    let socialQuery = supabase.from('social_outreach').select('platform, status, quality_score, generation_cost');

    if (filters.projectId) {
      socialQuery = socialQuery.eq('project_id', filters.projectId);
    }

    const { data: socialMessages, error: socialError } = await socialQuery;

    if (socialError) throw socialError;

    // Calculate statistics
    const stats = {
      totalEmails: emails.length,
      emailsByStatus: {},
      totalSocialMessages: socialMessages.length,
      socialByPlatform: {},
      avgEmailQualityScore: 0,
      avgSocialQualityScore: 0,
      totalCost: 0
    };

    // Process emails
    let totalEmailQuality = 0;
    emails.forEach(email => {
      stats.emailsByStatus[email.status] = (stats.emailsByStatus[email.status] || 0) + 1;
      totalEmailQuality += email.quality_score || 0;
      stats.totalCost += parseFloat(email.generation_cost || 0);
    });

    if (emails.length > 0) {
      stats.avgEmailQualityScore = Math.round(totalEmailQuality / emails.length);
    }

    // Process social messages
    let totalSocialQuality = 0;
    socialMessages.forEach(msg => {
      stats.socialByPlatform[msg.platform] = (stats.socialByPlatform[msg.platform] || 0) + 1;
      totalSocialQuality += msg.quality_score || 0;
      stats.totalCost += parseFloat(msg.generation_cost || 0);
    });

    if (socialMessages.length > 0) {
      stats.avgSocialQualityScore = Math.round(totalSocialQuality / socialMessages.length);
    }

    return stats;
  } catch (error) {
    console.error('Failed to get outreach stats:', error);
    throw error;
  }
}

export default supabase;
