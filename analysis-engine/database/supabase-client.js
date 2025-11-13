/**
 * Supabase Client for Analysis Engine
 *
 * Handles database operations for the leads table
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { queueDatabaseOperation } from './db-queue.js';

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

    // NOTE: Auto-report generation has been removed
    // Report generation is now handled by the ReportEngine microservice (port 3003)
    // To generate a report, make a POST request to:
    //   http://localhost:3003/api/generate
    //   Body: { analysisResult: lead, options: { format, sections, saveToDatabase, project_id } }

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

// ============================================================================
// PROSPECTS - Access to prospect data from Prospecting Engine
// ============================================================================

/**
 * Get a single prospect by ID
 *
 * @param {string} id - Prospect ID
 * @returns {Promise<object>} Prospect object with business intelligence
 */
export async function getProspectById(id) {
  try {
    const { data, error } = await supabase
      .from('prospects')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Failed to fetch prospect:', error);
      throw error;
    }

    return data;
  } catch (error) {
    throw error;
  }
}

// ============================================================================
// BENCHMARKS - Industry-leading exemplar websites for comparative analysis
// ============================================================================

/**
 * Save a benchmark website to the database
 *
 * @param {object} benchmark - Benchmark data from analysis
 * @returns {Promise<object>} Saved benchmark with ID
 */
export async function saveBenchmark(benchmark) {
  return queueDatabaseOperation(async () => {
    try {
      const { data, error } = await supabase
        .from('benchmarks')
        .insert(benchmark)
        .select()
        .single();

      if (error) {
        console.error('Failed to save benchmark:', error);
        throw error;
      }

      console.log(`✅ Benchmark saved: ${data.company_name} (${data.industry})`);
      return data;
    } catch (error) {
      throw error;
    }
  }, `saveBenchmark(${benchmark.company_name})`);
}

/**
 * Update a benchmark in the database
 *
 * @param {string} id - Benchmark ID
 * @param {object} updates - Fields to update
 * @returns {Promise<object>} Updated benchmark
 */
export async function updateBenchmark(id, updates) {
  try {
    const { data, error } = await supabase
      .from('benchmarks')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update benchmark:', error);
      throw error;
    }

    console.log(`✅ Benchmark updated: ${id}`);
    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * Get benchmarks with filters
 *
 * @param {object} filters - Query filters
 * @returns {Promise<Array>} Array of benchmarks
 */
export async function getBenchmarks(filters = {}) {
  try {
    let query = supabase.from('benchmarks').select('*');

    // Active filter (default to true)
    const isActive = filters.isActive !== undefined ? filters.isActive : true;
    query = query.eq('is_active', isActive);

    // Apply filters
    if (filters.industry) {
      query = query.eq('industry', filters.industry);
    }

    if (filters.industrySubcategory) {
      query = query.eq('industry_subcategory', filters.industrySubcategory);
    }

    if (filters.tier) {
      query = query.eq('benchmark_tier', filters.tier);
    }

    if (filters.city) {
      query = query.eq('location_city', filters.city);
    }

    if (filters.state) {
      query = query.eq('location_state', filters.state);
    }

    if (filters.source) {
      query = query.eq('source', filters.source);
    }

    if (filters.qualityFlag) {
      query = query.eq('quality_flag', filters.qualityFlag);
    }

    if (filters.minGoogleRating) {
      query = query.gte('google_rating', filters.minGoogleRating);
    }

    if (filters.minOverallScore) {
      query = query.gte('overall_score', filters.minOverallScore);
    }

    // Pagination
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    query = query.limit(limit).range(offset, offset + limit - 1);

    // Order by overall score (highest first)
    query = query.order('overall_score', { ascending: false, nullsFirst: false });

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch benchmarks:', error);
      throw error;
    }

    console.log(`✅ Fetched ${data.length} benchmarks`);
    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * Get a single benchmark by ID
 *
 * @param {string} id - Benchmark ID
 * @returns {Promise<object>} Benchmark object
 */
export async function getBenchmarkById(id) {
  try {
    const { data, error } = await supabase
      .from('benchmarks')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Failed to fetch benchmark:', error);
      throw error;
    }

    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * Get benchmarks by industry (sorted by quality)
 *
 * @param {string} industry - Industry name
 * @param {object} options - Additional options
 * @returns {Promise<Array>} Array of benchmarks
 */
export async function getBenchmarksByIndustry(industry, options = {}) {
  try {
    const { tier = null, limit = 10, minScore = null } = options;

    let query = supabase
      .from('benchmarks')
      .select('*')
      .eq('industry', industry)
      .eq('is_active', true)
      .eq('quality_flag', 'approved');

    if (tier) {
      query = query.eq('benchmark_tier', tier);
    }

    if (minScore) {
      query = query.gte('overall_score', minScore);
    }

    query = query
      .order('overall_score', { ascending: false, nullsFirst: false })
      .limit(limit);

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch benchmarks by industry:', error);
      throw error;
    }

    console.log(`✅ Found ${data.length} benchmarks for ${industry}`);
    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * Check if a benchmark already exists by URL
 *
 * @param {string} url - Website URL
 * @returns {Promise<object|null>} Existing benchmark or null
 */
export async function getBenchmarkByUrl(url) {
  try {
    // Normalize URL
    const normalizedUrl = url.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');

    const { data, error } = await supabase
      .from('benchmarks')
      .select('*')
      .or(`website_url.eq.${url},website_url.eq.https://${normalizedUrl},website_url.eq.http://${normalizedUrl}`)
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
 * Flag a benchmark for quality review
 *
 * @param {string} id - Benchmark ID
 * @param {string} reason - Reason for flagging
 * @returns {Promise<object>} Updated benchmark
 */
export async function flagBenchmarkForReview(id, reason) {
  try {
    const { data, error } = await supabase
      .from('benchmarks')
      .update({
        quality_flag: 'needs-review',
        notes: reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to flag benchmark:', error);
      throw error;
    }

    console.log(`⚠️ Benchmark flagged for review: ${id}`);
    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * Delete a benchmark by ID
 *
 * @param {string} id - Benchmark ID
 * @returns {Promise<void>}
 */
export async function deleteBenchmark(id) {
  try {
    const { error } = await supabase
      .from('benchmarks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Failed to delete benchmark:', error);
      throw error;
    }

    console.log(`✅ Benchmark deleted: ${id}`);
  } catch (error) {
    throw error;
  }
}

/**
 * Get benchmark statistics
 *
 * @param {object} filters - Optional filters
 * @returns {Promise<object>} Statistics object
 */
export async function getBenchmarkStats(filters = {}) {
  try {
    let query = supabase.from('benchmarks').select('industry, benchmark_tier, overall_score, quality_flag, source');

    if (filters.industry) {
      query = query.eq('industry', filters.industry);
    }

    query = query.eq('is_active', true);

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Calculate statistics
    const stats = {
      totalBenchmarks: data.length,
      byIndustry: {},
      byTier: {
        national: 0,
        regional: 0,
        local: 0
      },
      bySource: {
        'google-maps': 0,
        'awwwards': 0,
        'css-awards': 0,
        'manual': 0,
        'prospecting-engine': 0
      },
      byQualityFlag: {
        approved: 0,
        'needs-review': 0,
        rejected: 0
      },
      averageScore: 0
    };

    let totalScore = 0;

    data.forEach(benchmark => {
      // Industry distribution
      if (benchmark.industry) {
        stats.byIndustry[benchmark.industry] = (stats.byIndustry[benchmark.industry] || 0) + 1;
      }

      // Tier distribution
      if (benchmark.benchmark_tier) {
        stats.byTier[benchmark.benchmark_tier]++;
      }

      // Source distribution
      if (benchmark.source) {
        stats.bySource[benchmark.source]++;
      }

      // Quality flag distribution
      if (benchmark.quality_flag) {
        stats.byQualityFlag[benchmark.quality_flag]++;
      }

      // Accumulate scores
      totalScore += benchmark.overall_score || 0;
    });

    // Calculate average score
    if (data.length > 0) {
      stats.averageScore = Math.round(totalScore / data.length);
    }

    return stats;
  } catch (error) {
    console.error('Failed to get benchmark stats:', error);
    throw error;
  }
}

export default supabase;
