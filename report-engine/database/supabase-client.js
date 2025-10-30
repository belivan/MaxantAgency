/**
 * Report Engine - Supabase Database Client
 * =========================================
 * Handles database operations for:
 * - reports table (report metadata and synthesis data)
 * - benchmarks table (industry benchmarks for comparison)
 *
 * Follows the standard pattern used by other engines.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

// Lazy-load Supabase client to avoid import-time errors
let supabase = null;

function getSupabaseClient() {
  if (!supabase) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
    }

    supabase = createClient(supabaseUrl, supabaseKey);
  }
  return supabase;
}

// Export the client for direct access if needed
export { getSupabaseClient, supabase };

//==============================================================================
// REPORTS TABLE OPERATIONS
//==============================================================================

/**
 * Save report metadata to database
 *
 * @param {object} reportMetadata - Report metadata (all 31 columns)
 * @returns {Promise<object>} Saved record
 */
export async function saveReportMetadata(reportMetadata) {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('reports')
      .insert(reportMetadata)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save report metadata: ${error.message}`);
    }

    console.log(`📝 Report metadata saved: ${data.id}`);
    return data;

  } catch (error) {
    console.error('❌ Failed to save report metadata:', error);
    throw error;
  }
}

/**
 * Update report record
 *
 * @param {string} reportId - Report ID
 * @param {object} updates - Fields to update
 * @returns {Promise<object>} Updated record
 */
export async function updateReport(reportId, updates) {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('reports')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', reportId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update report: ${error.message}`);
    }

    console.log(`✅ Report updated: ${reportId}`);
    return data;

  } catch (error) {
    console.error('❌ Failed to update report:', error);
    throw error;
  }
}

/**
 * Get report by ID
 *
 * @param {string} reportId - Report ID
 * @returns {Promise<object>} Report record
 */
export async function getReportById(reportId) {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (error) {
      throw new Error(`Failed to get report: ${error.message}`);
    }

    return data;

  } catch (error) {
    console.error('❌ Failed to get report:', error);
    throw error;
  }
}

/**
 * Get reports for a lead
 *
 * @param {string} leadId - Lead ID
 * @returns {Promise<array>} List of reports
 */
export async function getReportsByLeadId(leadId) {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('lead_id', leadId)
      .order('generated_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get reports: ${error.message}`);
    }

    return data || [];

  } catch (error) {
    console.error('❌ Failed to get reports by lead:', error);
    throw error;
  }
}

/**
 * Get reports with filters
 *
 * @param {object} filters - Query filters
 * @param {string} filters.project_id - Filter by project
 * @param {string} filters.report_type - Filter by type (website_audit, etc.)
 * @param {string} filters.status - Filter by status
 * @param {boolean} filters.synthesis_used - Filter by synthesis usage
 * @param {number} filters.limit - Max results (default: 50)
 * @param {number} filters.offset - Pagination offset
 * @returns {Promise<array>} List of reports
 */
export async function getReports(filters = {}) {
  try {
    const supabase = getSupabaseClient();
    let query = supabase.from('reports').select('*');

    // Apply filters
    if (filters.project_id) {
      query = query.eq('project_id', filters.project_id);
    }
    if (filters.report_type) {
      query = query.eq('report_type', filters.report_type);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.synthesis_used !== undefined) {
      query = query.eq('synthesis_used', filters.synthesis_used);
    }

    // Pagination
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    query = query.range(offset, offset + limit - 1);

    // Order by generated date (newest first)
    query = query.order('generated_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get reports: ${error.message}`);
    }

    return data || [];

  } catch (error) {
    console.error('❌ Failed to get reports:', error);
    throw error;
  }
}

/**
 * Update report download count
 * Tries to use RPC function first, falls back to manual increment
 *
 * @param {string} reportId - Report ID
 * @returns {Promise<void>}
 */
export async function incrementDownloadCount(reportId) {
  try {
    const supabase = getSupabaseClient();

    const { error } = await supabase.rpc('increment_report_downloads', {
      report_id: reportId
    });

    if (error) {
      // Try manual increment if RPC doesn't exist
      const { data: report } = await supabase
        .from('reports')
        .select('download_count')
        .eq('id', reportId)
        .single();

      if (report) {
        await supabase
          .from('reports')
          .update({
            download_count: (report.download_count || 0) + 1,
            last_downloaded_at: new Date().toISOString()
          })
          .eq('id', reportId);
      }
    }

  } catch (error) {
    console.error('❌ Failed to increment download count:', error);
  }
}

//==============================================================================
// BENCHMARKS TABLE OPERATIONS
//==============================================================================

/**
 * Get benchmark by ID
 *
 * @param {string} benchmarkId - Benchmark ID
 * @returns {Promise<object|null>} Benchmark record or null if not found
 */
export async function getBenchmarkById(benchmarkId) {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('benchmarks')
      .select('*')
      .eq('id', benchmarkId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found - return null instead of throwing
        return null;
      }
      throw new Error(`Failed to get benchmark: ${error.message}`);
    }

    return data;

  } catch (error) {
    console.error('❌ Failed to get benchmark:', error);
    return null; // Return null on error instead of throwing
  }
}

/**
 * Get benchmarks for an industry
 *
 * @param {string} industry - Industry name
 * @param {number} limit - Max results (default: 10)
 * @returns {Promise<array>} List of benchmarks
 */
export async function getBenchmarksByIndustry(industry, limit = 10) {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('benchmarks')
      .select('*')
      .eq('industry', industry)
      .order('overall_score', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get benchmarks: ${error.message}`);
    }

    return data || [];

  } catch (error) {
    console.error('❌ Failed to get benchmarks:', error);
    return [];
  }
}

export default {
  getSupabaseClient,
  // Reports operations
  saveReportMetadata,
  updateReport,
  getReportById,
  getReportsByLeadId,
  getReports,
  incrementDownloadCount,
  // Benchmarks operations
  getBenchmarkById,
  getBenchmarksByIndustry
};
