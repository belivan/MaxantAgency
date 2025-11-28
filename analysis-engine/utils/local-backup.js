/**
 * Local Backup Wrapper for Analysis Engine
 *
 * This module wraps the centralized BackupManager to provide
 * lead-specific backup functionality.
 *
 * Pattern: ALWAYS save locally FIRST, then sync to cloud
 *
 * Directory structure (centralized at project root):
 * local-backups/
 * └── analysis-engine/
 *     ├── leads/            - All leads (uploaded and pending)
 *     └── failed-uploads/   - Leads that failed to upload
 */

import { BackupManager } from '../../database-tools/shared/backup-manager.js';

// Initialize BackupManager with analysis-specific configuration
const backupManager = new BackupManager('analysis-engine', {
  subdirectories: ['leads', 'failed-uploads'],
  nameField: 'company_name'
});

/**
 * Clean buffers from analysis result to prevent bloated backups
 * Replaces Buffer objects with "<Buffer removed>" string
 */
function cleanBuffers(obj) {
  if (obj === null || obj === undefined) return obj;

  // Check if it's a Buffer
  if (Buffer.isBuffer(obj)) {
    return '<Buffer removed>';
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => cleanBuffers(item));
  }

  // Handle objects
  if (typeof obj === 'object') {
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      cleaned[key] = cleanBuffers(value);
    }
    return cleaned;
  }

  return obj;
}

/**
 * Save analysis result locally BEFORE attempting database save
 *
 * @param {object} analysisResult - Full analysis result object
 * @param {object} leadData - Formatted lead data for database
 * @returns {Promise<string>} Local backup file path
 */
export async function saveLocalBackup(analysisResult, leadData) {
  // Clean buffers from analysis result before saving
  const cleanedResult = cleanBuffers(analysisResult);

  return backupManager.saveBackup({ analysis_result: cleanedResult, lead_data: leadData }, {
    // Core identification metadata
    company_name: leadData.company_name,
    url: leadData.url,

    // Analysis scores
    grade: leadData.website_grade,
    overall_score: leadData.overall_score,
    design_score: leadData.design_score,
    seo_score: leadData.seo_score,
    content_score: leadData.content_score,
    social_score: leadData.social_score,

    // Analysis insights
    top_issue: leadData.top_issue || null,
    quick_wins_count: (leadData.quick_wins || []).length,
    has_quick_wins: (leadData.quick_wins || []).length > 0,

    // Track project and prospect references
    project_id: leadData.project_id || null,
    prospect_id: leadData.prospect_id || null,

    // Industry and location
    industry: leadData.industry || 'unknown',
    city: leadData.city || null,

    // Technical metadata
    has_https: leadData.has_https || false,
    is_mobile_friendly: leadData.is_mobile_friendly || false,
    has_blog: leadData.has_blog || false,

    // Multi-page intelligence
    pages_discovered: analysisResult.intelligent_analysis?.pages_discovered || 0,
    pages_crawled: analysisResult.intelligent_analysis?.pages_crawled || 0,

    // AI model tracking
    desktop_visual_model: leadData.desktop_visual_model || null,
    mobile_visual_model: leadData.mobile_visual_model || null,
    seo_analysis_model: leadData.seo_analysis_model || null,
    content_analysis_model: leadData.content_analysis_model || null,
    social_analysis_model: leadData.social_analysis_model || null,

    // Performance metrics
    analysis_cost: leadData.analysis_cost || 0,
    analysis_time: leadData.analysis_time || 0
  });
}

/**
 * Mark backup as successfully uploaded to database
 *
 * WHAT HAPPENS:
 * - Updates backup file with uploaded_to_db: true
 * - Records database_id and uploaded_at timestamp
 * - Sets upload_status to 'uploaded'
 *
 * @param {string} backupPath - Path returned from saveLocalBackup()
 * @param {string} dbId - Database UUID from Supabase insert
 * @returns {Promise<void>}
 */
export async function markAsUploaded(backupPath, dbId) {
  return backupManager.markAsUploaded(backupPath, dbId);
}

/**
 * Mark backup as failed to upload to database
 *
 * WHAT HAPPENS:
 * - Moves file from leads/ to failed-uploads/
 * - Updates metadata with error message and failed_at timestamp
 * - Sets upload_status to 'failed'
 *
 * @param {string} backupPath - Path returned from saveLocalBackup()
 * @param {string|Error} error - Error message or Error object
 * @returns {Promise<string|null>} New path in failed-uploads/ directory
 */
export async function markAsFailed(backupPath, error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  return backupManager.markAsFailed(backupPath, errorMessage);
}

/**
 * Get all failed uploads that need retry
 *
 * @returns {Promise<Array>} Array of failed backup objects with filepath and data
 */
export async function getFailedUploads() {
  return backupManager.getFailedUploads();
}

/**
 * Retry uploading a failed backup
 *
 * @param {string} failedBackupPath - Path to failed backup file
 * @param {Function} uploadFunction - Async function to attempt upload (receives data object)
 * @returns {Promise<boolean>} True if retry succeeded
 */
export async function retryFailedUpload(failedBackupPath, uploadFunction) {
  return backupManager.retryFailedUpload(failedBackupPath, uploadFunction);
}

/**
 * Get backup statistics
 *
 * @returns {Promise<object|null>} Stats about local backups
 */
export async function getBackupStats() {
  return backupManager.getBackupStats();
}

/**
 * Get all leads that are pending upload
 *
 * @returns {Promise<Array>} Array of pending backup objects with filepath and data
 */
export async function getPendingUploads() {
  return backupManager.getPendingUploads();
}

/**
 * Archive old uploaded backups (default: keep for 30 days)
 *
 * @param {number} daysToKeep - Number of days to keep uploaded backups
 * @returns {Promise<number>} Number of files archived (deleted)
 */
export async function cleanupOldBackups(daysToKeep = 30) {
  return backupManager.archiveOldBackups(daysToKeep);
}

/**
 * Get backup directory path
 *
 * @returns {string} Path to leads directory
 */
export function getBackupDir() {
  return backupManager.getDirectory('leads');
}

/**
 * Get failed uploads directory path
 *
 * @returns {string} Path to failed-uploads directory
 */
export function getFailedDir() {
  return backupManager.getDirectory('failed-uploads');
}

/**
 * Validate a backup file
 *
 * @param {string} backupPath - Path to backup file
 * @returns {Promise<object>} Validation result { valid, error?, backup? }
 */
export async function validateBackup(backupPath) {
  return backupManager.validateBackup(backupPath);
}

/**
 * Get BackupManager configuration
 *
 * @returns {object} Configuration details
 */
export function getConfig() {
  return backupManager.getConfig();
}

// Export backupManager instance for advanced usage
export { backupManager };

// Default export for backward compatibility
export default {
  saveLocalBackup,
  markAsUploaded,
  markAsFailed,
  getFailedUploads,
  retryFailedUpload,
  getBackupStats,
  getPendingUploads,
  cleanupOldBackups,
  getBackupDir,
  getFailedDir,
  validateBackup,
  getConfig,
  backupManager
};