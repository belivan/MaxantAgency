/**
 * Supabase Storage Integration
 * Upload and manage reports in Supabase Storage
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../../.env') });

const BUCKET_NAME = 'reports';

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

/**
 * Upload report to Supabase Storage
 *
 * @param {string} content - Report content (Markdown, HTML, etc.)
 * @param {string} storagePath - Path in storage (e.g., "reports/2025/01/company-audit.md")
 * @param {string} contentType - MIME type (e.g., "text/markdown", "application/pdf")
 * @returns {Promise<object>} Upload result with public URL
 */
export async function uploadReport(content, storagePath, contentType = 'text/markdown') {
  try {
    const supabase = getSupabaseClient();
    
    // Convert string content to buffer if needed
    const fileBuffer = typeof content === 'string'
      ? Buffer.from(content, 'utf-8')
      : content;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, fileBuffer, {
        contentType,
        upsert: true // Overwrite if exists
      });

    if (error) {
      throw new Error(`Supabase Storage upload failed: ${error.message}`);
    }

    console.log(`✅ Report uploaded to: ${storagePath}`);

    return {
      success: true,
      path: data.path,
      fullPath: `${BUCKET_NAME}/${data.path}`
    };

  } catch (error) {
    console.error('❌ Report upload failed:', error);
    throw error;
  }
}

/**
 * Get signed URL for private report access
 *
 * @param {string} storagePath - Path in storage
 * @param {number} expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns {Promise<string>} Signed URL
 */
export async function getSignedUrl(storagePath, expiresIn = 3600) {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(storagePath, expiresIn);

    if (error) {
      throw new Error(`Failed to create signed URL: ${error.message}`);
    }

    return data.signedUrl;

  } catch (error) {
    console.error('❌ Failed to get signed URL:', error);
    throw error;
  }
}

/**
 * Download report from Supabase Storage
 *
 * @param {string} storagePath - Path in storage
 * @returns {Promise<string>} Report content
 */
export async function downloadReport(storagePath) {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .download(storagePath);

    if (error) {
      throw new Error(`Failed to download report: ${error.message}`);
    }

    const text = await data.text();
    return text;

  } catch (error) {
    console.error('❌ Failed to download report:', error);
    throw error;
  }
}

/**
 * Delete report from Supabase Storage
 *
 * @param {string} storagePath - Path in storage
 * @returns {Promise<boolean>} Success status
 */
export async function deleteReport(storagePath) {
  try {
    const supabase = getSupabaseClient();
    
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([storagePath]);

    if (error) {
      throw new Error(`Failed to delete report: ${error.message}`);
    }

    console.log(`🗑️ Report deleted: ${storagePath}`);
    return true;

  } catch (error) {
    console.error('❌ Failed to delete report:', error);
    throw error;
  }
}

/**
 * List reports in storage
 *
 * @param {string} folderPath - Folder path (e.g., "reports/2025/01")
 * @returns {Promise<array>} List of files
 */
export async function listReports(folderPath = 'reports') {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(folderPath);

    if (error) {
      throw new Error(`Failed to list reports: ${error.message}`);
    }

    return data;

  } catch (error) {
    console.error('❌ Failed to list reports:', error);
    throw error;
  }
}

/**
 * Save report metadata to database
 *
 * @param {object} reportMetadata - Report metadata
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
 * Update report download count
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
 * Ensure reports bucket exists
 * Creates the bucket if it doesn't exist
 *
 * @returns {Promise<boolean>} Success status
 */
export async function ensureReportsBucket() {
  try {
    const supabase = getSupabaseClient();

    // Try to list the bucket - this will fail if it doesn't exist
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.warn('⚠️  Could not list buckets:', listError.message);
      return false;
    }

    const bucketExists = buckets.some(bucket => bucket.name === BUCKET_NAME);

    if (bucketExists) {
      console.log(`✅ Reports bucket '${BUCKET_NAME}' exists`);
      return true;
    }

    // Create bucket if it doesn't exist
    console.log(`📦 Creating reports bucket '${BUCKET_NAME}'...`);
    const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: false,
      fileSizeLimit: 52428800 // 50MB
    });

    if (createError) {
      console.warn(`⚠️  Could not create bucket: ${createError.message}`);
      return false;
    }

    console.log(`✅ Reports bucket '${BUCKET_NAME}' created`);
    return true;

  } catch (error) {
    console.error('❌ Failed to ensure reports bucket:', error);
    return false;
  }
}
