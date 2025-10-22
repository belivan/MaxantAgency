/**
 * Supabase Client for Analysis Engine
 *
 * Handles database operations for the leads table
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
 * Save an analyzed lead to the database
 *
 * @param {object} lead - Lead data from analysis
 * @param {object} options - Options for saving
 * @param {boolean} options.generateReport - Whether to auto-generate report (default: from config)
 * @param {string} options.reportFormat - Report format: 'markdown' or 'html' (default: from config)
 * @returns {Promise<object>} Saved lead with ID and optional report info
 */
export async function saveLead(lead, options = {}) {
  // Load report configuration
  const { getReportConfig } = await import('../config/report-config.js');
  const reportConfig = getReportConfig();

  const {
    generateReport = reportConfig.autoGenerateReports,
    reportFormat = reportConfig.defaultFormat
  } = options;

  try {
    const { data, error} = await supabase
      .from('leads')
      .insert(lead)
      .select()
      .single();

    if (error) {
      console.error('Failed to save lead:', error);
      throw error;
    }

    console.log(`✅ Lead saved: ${data.company_name} (${data.website_grade})`);

    // Auto-generate report if enabled
    if (generateReport) {
      try {
        const { autoGenerateReport, ensureReportsBucket } = await import('../reports/auto-report-generator.js');

        // Ensure reports bucket exists
        await ensureReportsBucket();

        // Generate and upload report with full analysis payload when available
        const reportPayload = {
          ...lead,
          id: data.id,
          company_name: data.company_name || lead.company_name,
          url: data.url || lead.url,
          grade: lead.grade || data.website_grade,
          overall_score: lead.overall_score || data.overall_score,
          website_grade: data.website_grade || lead.website_grade || lead.grade,
          website_score: data.overall_score || lead.overall_score,
          project_id: lead.project_id || data.project_id
        };

        const reportResult = await autoGenerateReport(reportPayload, {
          format: reportFormat,
          sections: ['all'],
          saveToDatabase: true,
          project_id: lead.project_id
        });

        if (reportResult.success) {
          console.log(`📄 Report generated: ${reportResult.storage_path}`);
          data.report_id = reportResult.report_id;
          data.report_path = reportResult.storage_path;
        } else {
          console.warn(`⚠️ Report generation failed: ${reportResult.error}`);
        }
      } catch (reportError) {
        // Don't fail the lead save if report generation fails
        console.error('❌ Report generation error:', reportError.message);
      }
    }

    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * Update a lead in the database
 *
 * @param {string} id - Lead ID
 * @param {object} updates - Fields to update
 * @returns {Promise<object>} Updated lead
 */
export async function updateLead(id, updates) {
  try {
    const { data, error } = await supabase
      .from('leads')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update lead:', error);
      throw error;
    }

    console.log(`✅ Lead updated: ${id}`);
    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * Get leads with filters
 *
 * @param {object} filters - Query filters
 * @returns {Promise<Array>} Array of leads
 */
export async function getLeads(filters = {}) {
  try {
    let query = supabase.from('leads').select('*');

    // Apply filters
    if (filters.grade) {
      query = query.eq('website_grade', filters.grade);
    }

    if (filters.industry) {
      query = query.eq('industry', filters.industry);
    }

    if (filters.city) {
      query = query.eq('city', filters.city);
    }

    if (filters.minScore) {
      query = query.gte('overall_score', filters.minScore);
    }

    if (filters.maxScore) {
      query = query.lte('overall_score', filters.maxScore);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.hasEmail !== undefined) {
      if (filters.hasEmail) {
        query = query.not('contact_email', 'is', null);
      } else {
        query = query.is('contact_email', null);
      }
    }

    if (filters.projectId) {
      query = query.eq('project_id', filters.projectId);
    }

    // Pagination
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    query = query.limit(limit).range(offset, offset + limit - 1);

    // Order
    query = query.order('analyzed_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch leads:', error);
      throw error;
    }

    console.log(`✅ Fetched ${data.length} leads`);
    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * Get a single lead by ID
 *
 * @param {string} id - Lead ID
 * @returns {Promise<object>} Lead object
 */
export async function getLeadById(id) {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Failed to fetch lead:', error);
      throw error;
    }

    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * Check if a lead already exists by URL
 *
 * @param {string} url - Website URL
 * @returns {Promise<object|null>} Existing lead or null
 */
export async function getLeadByUrl(url) {
  try {
    // Normalize URL
    const normalizedUrl = url.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');

    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .or(`url.eq.${url},url.eq.https://${normalizedUrl},url.eq.http://${normalizedUrl}`)
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }

    return data || null;
  } catch (error) {
    return null;
  }
}

/**
 * Delete a lead by ID
 *
 * @param {string} id - Lead ID
 * @returns {Promise<void>}
 */
export async function deleteLead(id) {
  try {
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Failed to delete lead:', error);
      throw error;
    }

    console.log(`✅ Lead deleted: ${id}`);
  } catch (error) {
    throw error;
  }
}

/**
 * Get lead statistics
 *
 * @param {object} filters - Optional filters
 * @returns {Promise<object>} Statistics object
 */
export async function getLeadStats(filters = {}) {
  try {
    let query = supabase.from('leads').select('website_grade, overall_score, design_score, seo_score, content_score, social_score, industry, status');

    if (filters.city) {
      query = query.eq('city', filters.city);
    }

    if (filters.industry) {
      query = query.eq('industry', filters.industry);
    }

    if (filters.projectId) {
      query = query.eq('project_id', filters.projectId);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Calculate statistics
    const stats = {
      totalLeads: data.length,
      gradeDistribution: {
        A: 0,
        B: 0,
        C: 0,
        D: 0,
        F: 0
      },
      averageScores: {
        overall: 0,
        design: 0,
        seo: 0,
        content: 0,
        social: 0
      },
      byIndustry: {},
      byStatus: {},
      readyForOutreach: 0
    };

    let totalOverall = 0, totalDesign = 0, totalSEO = 0, totalContent = 0, totalSocial = 0;

    data.forEach(lead => {
      // Grade distribution
      if (lead.website_grade) {
        stats.gradeDistribution[lead.website_grade]++;
      }

      // Industry distribution
      if (lead.industry) {
        stats.byIndustry[lead.industry] = (stats.byIndustry[lead.industry] || 0) + 1;
      }

      // Status distribution
      if (lead.status) {
        stats.byStatus[lead.status] = (stats.byStatus[lead.status] || 0) + 1;
      }

      // Count ready for outreach
      if (lead.status === 'ready_for_outreach') {
        stats.readyForOutreach++;
      }

      // Accumulate scores
      totalOverall += lead.overall_score || 0;
      totalDesign += lead.design_score || 0;
      totalSEO += lead.seo_score || 0;
      totalContent += lead.content_score || 0;
      totalSocial += lead.social_score || 0;
    });

    // Calculate averages
    if (data.length > 0) {
      stats.averageScores.overall = Math.round(totalOverall / data.length);
      stats.averageScores.design = Math.round(totalDesign / data.length);
      stats.averageScores.seo = Math.round(totalSEO / data.length);
      stats.averageScores.content = Math.round(totalContent / data.length);
      stats.averageScores.social = Math.round(totalSocial / data.length);
    }

    return stats;
  } catch (error) {
    console.error('Failed to get lead stats:', error);
    throw error;
  }
}

export default supabase;
