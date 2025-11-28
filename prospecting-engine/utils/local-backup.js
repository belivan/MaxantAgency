/**
 * Local Backup Wrapper for Prospecting Engine
 *
 * This module wraps the centralized BackupManager to provide
 * prospect-specific backup functionality.
 *
 * Pattern: ALWAYS save locally FIRST, then sync to cloud
 *
 * Directory structure (centralized at project root):
 * local-backups/
 * └── prospecting-engine/
 *     ├── prospects/         - All prospects (uploaded and pending)
 *     └── failed-uploads/    - Prospects that failed to upload
 */

import { BackupManager } from '../../database-tools/shared/backup-manager.js';

// Initialize BackupManager with prospecting-specific configuration
const backupManager = new BackupManager('prospecting-engine', {
  subdirectories: ['prospects', 'failed-uploads'],
  nameField: 'company_name'
});

/**
 * Save prospect data locally BEFORE attempting database save
 *
 * @param {object} prospectData - Full prospect data object
 * @returns {Promise<string>} Local backup file path
 */
export async function saveLocalBackup(prospectData) {
  return backupManager.saveBackup(prospectData, {
    // Metadata helps identify backups without opening files
    company_name: prospectData.company_name,
    industry: prospectData.industry,
    city: prospectData.city,
    state: prospectData.state,
    website: prospectData.website,
    contact_phone: prospectData.contact_phone,
    google_place_id: prospectData.google_place_id,
    // Track source and quality metrics
    source: prospectData.source || 'google_maps',
    google_rating: prospectData.google_rating || null,
    icp_match_score: prospectData.icp_match_score || null,
    is_relevant: prospectData.is_relevant !== undefined ? prospectData.is_relevant : null,
    // Track workflow metadata
    run_id: prospectData.run_id || null,
    website_status: prospectData.website_status || 'unknown'
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
 * - Moves file from prospects/ to failed-uploads/
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
 * Get all prospects that are pending upload
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
 * @returns {string} Path to prospects directory
 */
export function getBackupDir() {
  return backupManager.getDirectory('prospects');
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