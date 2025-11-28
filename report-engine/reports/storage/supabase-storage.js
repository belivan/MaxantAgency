/**
 * Report Storage
 *
 * Stores reports on local filesystem, served via Caddy.
 * Replaces previous Supabase Storage implementation.
 *
 * Storage structure: /opt/MaxantAgency/storage/reports/{company-slug}/
 * Served at: https://api.mintydesign.xyz/storage/reports/...
 *
 * NOTE: This module handles STORAGE operations only (files).
 * For DATABASE operations (reports table), see: ../../database/supabase-client.js
 */

import {
  uploadFile,
  downloadFile,
  downloadFileAsText,
  deleteFile,
  listFiles,
  getPublicUrl,
  ensureStorageDirectories
} from '../../../database-tools/shared/local-storage.js';

/**
 * Upload report to local storage
 *
 * @param {string|Buffer} content - Report content (Markdown, HTML, PDF buffer, etc.)
 * @param {string} storagePath - Path in storage (e.g., "company-name/FULL.pdf")
 * @param {string} contentType - MIME type (e.g., "text/markdown", "application/pdf")
 * @returns {Promise<object>} Upload result with public URL
 */
export async function uploadReport(content, storagePath, contentType = 'text/markdown') {
  try {
    // Prepend reports/ to path
    const fullPath = `reports/${storagePath}`;

    const result = await uploadFile(content, fullPath, contentType);

    console.log(`✅ Report uploaded to: ${storagePath}`);

    return {
      success: true,
      path: storagePath,
      fullPath: fullPath,
      url: result.url
    };
  } catch (error) {
    console.error('❌ Report upload failed:', error);
    throw error;
  }
}

/**
 * Get public URL for report
 * (No signing needed - URLs are public via Caddy)
 *
 * @param {string} storagePath - Path in storage
 * @param {number} expiresIn - Ignored (kept for API compatibility)
 * @returns {Promise<string>} Public URL
 */
export async function getSignedUrl(storagePath, expiresIn = 3600) {
  // For local storage, URLs don't expire - just return public URL
  const fullPath = `reports/${storagePath}`;
  return getPublicUrl(fullPath);
}

/**
 * Download report from local storage
 *
 * @param {string} storagePath - Path in storage
 * @returns {Promise<string>} Report content as text
 */
export async function downloadReport(storagePath) {
  try {
    const fullPath = `reports/${storagePath}`;
    const content = await downloadFileAsText(fullPath);
    return content;
  } catch (error) {
    console.error('❌ Failed to download report:', error);
    throw error;
  }
}

/**
 * Download report as buffer (for PDFs)
 *
 * @param {string} storagePath - Path in storage
 * @returns {Promise<Buffer>} Report content as buffer
 */
export async function downloadReportBuffer(storagePath) {
  try {
    const fullPath = `reports/${storagePath}`;
    const content = await downloadFile(fullPath);
    return content;
  } catch (error) {
    console.error('❌ Failed to download report:', error);
    throw error;
  }
}

/**
 * Delete report from local storage
 *
 * @param {string} storagePath - Path in storage
 * @returns {Promise<boolean>} Success status
 */
export async function deleteReport(storagePath) {
  try {
    const fullPath = `reports/${storagePath}`;
    const result = await deleteFile(fullPath);
    if (result) {
      console.log(`🗑️ Report deleted: ${storagePath}`);
    }
    return result;
  } catch (error) {
    console.error('❌ Failed to delete report:', error);
    throw error;
  }
}

/**
 * List reports in storage
 *
 * @param {string} folderPath - Folder path (e.g., "company-name")
 * @returns {Promise<array>} List of files
 */
export async function listReports(folderPath = '') {
  try {
    const fullPath = folderPath ? `reports/${folderPath}` : 'reports';
    const files = await listFiles(fullPath);
    return files;
  } catch (error) {
    console.error('❌ Failed to list reports:', error);
    throw error;
  }
}

/**
 * Ensure reports storage directory exists
 *
 * @returns {Promise<boolean>} Success status
 */
export async function ensureReportsBucket() {
  try {
    await ensureStorageDirectories();
    console.log(`✅ Reports storage directory ready`);
    return true;
  } catch (error) {
    console.error('❌ Failed to ensure reports directory:', error);
    return false;
  }
}

export default {
  uploadReport,
  getSignedUrl,
  downloadReport,
  downloadReportBuffer,
  deleteReport,
  listReports,
  ensureReportsBucket
};
