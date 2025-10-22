/**
 * Unified Backup Manager for MaxantAgency Engines
 *
 * Provides centralized local backup management for all microservices:
 * - Prospecting Engine: prospects/
 * - Analysis Engine: leads/
 * - Outreach Engine: composed_emails/, social_outreach/
 *
 * Core Pattern: ALWAYS save locally FIRST, then sync to cloud
 *
 * Directory Structure:
 * local-backups/
 * └── {engineName}/
 *     ├── {subdirectory[0]}/  (e.g., prospects/, leads/, composed_emails/)
 *     └── failed-uploads/     (shared failure directory)
 *
 * @module BackupManager
 */

import { writeFile, readFile, mkdir, readdir, unlink, rename } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Unified Backup Manager Class
 *
 * @class BackupManager
 * @example
 * // Prospecting Engine
 * const backupMgr = new BackupManager('prospecting-engine', {
 *   subdirectories: ['prospects', 'failed-uploads']
 * });
 *
 * @example
 * // Analysis Engine
 * const backupMgr = new BackupManager('analysis-engine', {
 *   subdirectories: ['leads', 'failed-uploads']
 * });
 */
export class BackupManager {
  /**
   * Create a BackupManager instance
   *
   * @param {string} engineName - Name of the engine (e.g., 'prospecting-engine', 'analysis-engine')
   * @param {object} options - Configuration options
   * @param {string[]} options.subdirectories - Array of subdirectory names (first is primary, last is failures)
   * @param {string} [options.projectRoot] - Override project root (auto-detected by default)
   * @param {string} [options.nameField='company_name'] - Field to use for backup filename generation
   */
  constructor(engineName, options = {}) {
    if (!engineName) {
      throw new Error('BackupManager requires engineName parameter');
    }

    // Ensure engineName is a string, not an object
    if (typeof engineName !== 'string') {
      throw new Error('BackupManager engineName must be a string');
    }

    this.engineName = engineName;
    this.nameField = options.nameField || 'company_name';

    // Auto-detect project root: go up from database-tools/shared/ to project root
    // Ensure projectRoot is properly extracted if provided
    const projectRoot = options && options.projectRoot ? options.projectRoot : join(__dirname, '..', '..');
    this.projectRoot = projectRoot;

    // Setup directory structure
    this.backupRoot = join(this.projectRoot, 'local-backups');
    this.engineBackupDir = join(this.backupRoot, this.engineName);

    // Parse subdirectories (default: first is primary, 'failed-uploads' is always added)
    const subdirs = options.subdirectories || ['data'];
    this.subdirectories = subdirs.includes('failed-uploads')
      ? subdirs
      : [...subdirs, 'failed-uploads'];

    // Primary directory is first non-failed-uploads subdirectory
    this.primarySubdir = this.subdirectories.find(d => d !== 'failed-uploads') || 'data';
    this.primaryDir = join(this.engineBackupDir, this.primarySubdir);
    this.failedDir = join(this.engineBackupDir, 'failed-uploads');

    // Cache all directory paths
    this.directories = {};
    this.subdirectories.forEach(subdir => {
      this.directories[subdir] = join(this.engineBackupDir, subdir);
    });
  }

  /**
   * Ensure all backup directories exist
   *
   * @private
   * @returns {Promise<void>}
   */
  async _ensureDirectories() {
    const allDirs = [this.backupRoot, this.engineBackupDir, ...Object.values(this.directories)];

    for (const dir of allDirs) {
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }
    }
  }

  /**
   * Generate backup filename
   * Format: company-name-2025-10-21-1729548383014.json
   *
   * @private
   * @param {string} name - Name to use for filename (e.g., company name, lead name)
   * @returns {string} Generated filename
   */
  _generateFilename(name) {
    if (!name) {
      throw new Error('Name is required for filename generation');
    }

    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const timestamp = Date.now();
    const sanitizedName = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);

    return `${sanitizedName}-${date}-${timestamp}.json`;
  }

  /**
   * Atomic file write (write to temp file, then rename)
   * Prevents partial file writes on crash/interruption
   *
   * @private
   * @param {string} filepath - Target file path
   * @param {string} content - File content
   * @returns {Promise<void>}
   */
  async _atomicWrite(filepath, content) {
    const tempPath = `${filepath}.tmp`;

    try {
      // Write to temp file
      await writeFile(tempPath, content, 'utf-8');

      // Atomically rename
      await rename(tempPath, filepath);
    } catch (error) {
      // Clean up temp file on failure
      if (existsSync(tempPath)) {
        await unlink(tempPath).catch(() => {});
      }
      throw error;
    }
  }

  /**
   * Save backup locally BEFORE attempting database upload
   *
   * This is the PRIMARY method - always call this first!
   *
   * @param {object} data - Full data object to backup
   * @param {object} [metadata={}] - Optional metadata (engine-specific fields)
   * @returns {Promise<string>} Local backup file path
   *
   * @example
   * // Prospecting Engine
   * const backupPath = await backupMgr.saveBackup(prospectData, {
   *   company_name: prospectData.company_name,
   *   industry: prospectData.industry,
   *   city: prospectData.city,
   *   website: prospectData.website
   * });
   *
   * @example
   * // Analysis Engine
   * const backupPath = await backupMgr.saveBackup(leadData, {
   *   company_name: leadData.company_name,
   *   url: leadData.url,
   *   analysis_result: analysisResult
   * });
   */
  async saveBackup(data, metadata = {}) {
    try {
      await this._ensureDirectories();

      // Extract name for filename
      const name = metadata[this.nameField] || data[this.nameField] || 'unknown';
      const filename = this._generateFilename(name);
      const filepath = join(this.primaryDir, filename);

      // Build backup object
      const backup = {
        saved_at: new Date().toISOString(),
        ...metadata,
        data,
        uploaded_to_db: false,
        upload_status: 'pending'
      };

      // Atomic write for safety
      await this._atomicWrite(filepath, JSON.stringify(backup, null, 2));

      console.log(`💾 [${this.engineName}] Local backup saved: ${filename}`);

      return filepath;
    } catch (error) {
      console.error(`❌ [${this.engineName}] Failed to save local backup:`, error);
      // Don't throw - we want to continue even if local backup fails
      return null;
    }
  }

  /**
   * Mark backup as successfully uploaded to database
   *
   * @param {string} backupPath - Path to backup file
   * @param {string} [dbId=null] - Database ID assigned by Supabase
   * @returns {Promise<void>}
   *
   * @example
   * await backupMgr.markAsUploaded(backupPath, dbResult.id);
   */
  async markAsUploaded(backupPath, dbId = null) {
    if (!backupPath) return;

    try {
      const content = await readFile(backupPath, 'utf-8');
      const backup = JSON.parse(content);

      backup.uploaded_to_db = true;
      backup.upload_status = 'uploaded';
      backup.uploaded_at = new Date().toISOString();

      if (dbId) {
        backup.database_id = dbId;
      }

      await this._atomicWrite(backupPath, JSON.stringify(backup, null, 2));

      const filename = backupPath.split(/[\\/]/).pop();
      console.log(`✅ [${this.engineName}] Backup marked as uploaded: ${filename}`);
    } catch (error) {
      console.error(`❌ [${this.engineName}] Failed to mark backup as uploaded:`, error);
    }
  }

  /**
   * Move failed upload to failed-uploads directory for later retry
   *
   * @param {string} backupPath - Path to backup file
   * @param {string} errorMessage - Error message from failed upload
   * @returns {Promise<string|null>} Path to failed backup file
   *
   * @example
   * const failedPath = await backupMgr.markAsFailed(backupPath, error.message);
   */
  async markAsFailed(backupPath, errorMessage) {
    if (!backupPath) return null;

    try {
      const content = await readFile(backupPath, 'utf-8');
      const backup = JSON.parse(content);

      backup.upload_failed = true;
      backup.upload_status = 'failed';
      backup.upload_error = errorMessage;
      backup.failed_at = new Date().toISOString();

      const filename = backupPath.split(/[\\/]/).pop();
      const failedPath = join(this.failedDir, filename);

      await this._atomicWrite(failedPath, JSON.stringify(backup, null, 2));

      // Delete original file after successful move to failed-uploads
      await unlink(backupPath);

      console.log(`⚠️  [${this.engineName}] Backup moved to failed-uploads: ${filename}`);
      console.log(`   Error: ${errorMessage.substring(0, 100)}${errorMessage.length > 100 ? '...' : ''}`);

      return failedPath;
    } catch (error) {
      console.error(`❌ [${this.engineName}] Failed to mark backup as failed:`, error);
      return null;
    }
  }

  /**
   * Get backup statistics
   *
   * @returns {Promise<object>} Statistics object
   * @returns {number} return.total_backups - Total backup count
   * @returns {number} return.uploaded - Successfully uploaded count
   * @returns {number} return.pending_upload - Pending upload count
   * @returns {number} return.failed_uploads - Failed upload count
   * @returns {string} return.success_rate - Upload success rate percentage
   * @returns {string} return.backup_dir - Primary backup directory path
   * @returns {string} return.failed_dir - Failed uploads directory path
   *
   * @example
   * const stats = await backupMgr.getBackupStats();
   * console.log(`Success rate: ${stats.success_rate}%`);
   */
  async getBackupStats() {
    try {
      await this._ensureDirectories();

      const primaryFiles = await readdir(this.primaryDir);
      const failedFiles = await readdir(this.failedDir);

      const totalBackups = primaryFiles.filter(f => f.endsWith('.json')).length;
      const failedCount = failedFiles.filter(f => f.endsWith('.json')).length;

      // Count uploaded vs pending
      let uploadedCount = 0;
      let pendingCount = 0;

      for (const file of primaryFiles.filter(f => f.endsWith('.json'))) {
        const content = await readFile(join(this.primaryDir, file), 'utf-8');
        const backup = JSON.parse(content);

        if (backup.uploaded_to_db) {
          uploadedCount++;
        } else {
          pendingCount++;
        }
      }

      return {
        total_backups: totalBackups,
        uploaded: uploadedCount,
        pending_upload: pendingCount,
        failed_uploads: failedCount,
        success_rate: totalBackups > 0 ? ((uploadedCount / totalBackups) * 100).toFixed(1) : '0.0',
        backup_dir: this.primaryDir,
        failed_dir: this.failedDir
      };
    } catch (error) {
      console.error(`❌ [${this.engineName}] Failed to get backup stats:`, error);
      return null;
    }
  }

  /**
   * Get all backups pending upload
   *
   * @returns {Promise<Array>} Array of pending backup objects with filepath and data
   *
   * @example
   * const pending = await backupMgr.getPendingUploads();
   * for (const backup of pending) {
   *   console.log(`Pending: ${backup.filepath}`);
   * }
   */
  async getPendingUploads() {
    try {
      await this._ensureDirectories();

      const files = await readdir(this.primaryDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));

      const pendingBackups = [];
      for (const file of jsonFiles) {
        const filepath = join(this.primaryDir, file);
        const content = await readFile(filepath, 'utf-8');
        const backup = JSON.parse(content);

        if (!backup.uploaded_to_db) {
          pendingBackups.push({
            filepath,
            filename: file,
            ...backup
          });
        }
      }

      return pendingBackups;
    } catch (error) {
      console.error(`❌ [${this.engineName}] Failed to get pending uploads:`, error);
      return [];
    }
  }

  /**
   * Get all failed uploads that need retry
   *
   * @returns {Promise<Array>} Array of failed backup objects with filepath and data
   *
   * @example
   * const failed = await backupMgr.getFailedUploads();
   * console.log(`${failed.length} backups need retry`);
   */
  async getFailedUploads() {
    try {
      await this._ensureDirectories();

      const files = await readdir(this.failedDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));

      const failedBackups = [];
      for (const file of jsonFiles) {
        const filepath = join(this.failedDir, file);
        const content = await readFile(filepath, 'utf-8');
        const backup = JSON.parse(content);

        failedBackups.push({
          filepath,
          filename: file,
          ...backup
        });
      }

      return failedBackups;
    } catch (error) {
      console.error(`❌ [${this.engineName}] Failed to get failed uploads:`, error);
      return [];
    }
  }

  /**
   * Retry uploading a failed backup
   *
   * @param {string} failedBackupPath - Path to failed backup file
   * @param {Function} uploadFunction - Async function to attempt upload (receives data object)
   * @returns {Promise<boolean>} True if retry succeeded
   *
   * @example
   * const success = await backupMgr.retryFailedUpload(failedPath, async (data) => {
   *   const result = await supabase.from('prospects').insert(data).select().single();
   *   return result.data;
   * });
   */
  async retryFailedUpload(failedBackupPath, uploadFunction) {
    try {
      const content = await readFile(failedBackupPath, 'utf-8');
      const backup = JSON.parse(content);

      // Attempt upload with custom function
      const dbResult = await uploadFunction(backup.data);

      if (dbResult && dbResult.id) {
        // Upload succeeded! Move back to main backups
        backup.uploaded_to_db = true;
        backup.upload_status = 'uploaded';
        backup.uploaded_at = new Date().toISOString();
        backup.database_id = dbResult.id;
        backup.retry_count = (backup.retry_count || 0) + 1;

        // Remove failure metadata
        delete backup.upload_failed;
        delete backup.upload_error;
        delete backup.failed_at;

        const filename = failedBackupPath.split(/[\\/]/).pop();
        const successPath = join(this.primaryDir, filename);

        await this._atomicWrite(successPath, JSON.stringify(backup, null, 2));
        await unlink(failedBackupPath); // Remove from failed dir

        console.log(`✅ [${this.engineName}] Retry successful: ${filename}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error(`❌ [${this.engineName}] Retry failed:`, error);
      return false;
    }
  }

  /**
   * Archive old uploaded backups
   *
   * Deletes backups that are:
   * 1. Successfully uploaded to database
   * 2. Older than specified number of days
   *
   * @param {number} [daysOld=30] - Number of days to keep uploaded backups
   * @returns {Promise<number>} Number of files archived (deleted)
   *
   * @example
   * // Clean up backups older than 7 days
   * const deletedCount = await backupMgr.archiveOldBackups(7);
   * console.log(`Archived ${deletedCount} old backups`);
   */
  async archiveOldBackups(daysOld = 30) {
    try {
      await this._ensureDirectories();

      const files = await readdir(this.primaryDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));

      const cutoffDate = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
      let archivedCount = 0;

      for (const file of jsonFiles) {
        const filepath = join(this.primaryDir, file);
        const content = await readFile(filepath, 'utf-8');
        const backup = JSON.parse(content);

        // Only archive if uploaded AND older than cutoff
        if (backup.uploaded_to_db && backup.uploaded_at) {
          const uploadedDate = new Date(backup.uploaded_at).getTime();
          if (uploadedDate < cutoffDate) {
            await unlink(filepath);
            archivedCount++;
          }
        }
      }

      if (archivedCount > 0) {
        console.log(`🧹 [${this.engineName}] Archived ${archivedCount} old backups (>${daysOld} days)`);
      }

      return archivedCount;
    } catch (error) {
      console.error(`❌ [${this.engineName}] Failed to archive old backups:`, error);
      return 0;
    }
  }

  /**
   * Validate backup file integrity
   *
   * Checks:
   * 1. File exists
   * 2. Valid JSON format
   * 3. Required fields present
   *
   * @param {string} backupPath - Path to backup file
   * @returns {Promise<object>} Validation result
   * @returns {boolean} return.valid - Whether backup is valid
   * @returns {string} [return.error] - Error message if invalid
   * @returns {object} [return.backup] - Parsed backup object if valid
   *
   * @example
   * const validation = await backupMgr.validateBackup(backupPath);
   * if (!validation.valid) {
   *   console.error(`Invalid backup: ${validation.error}`);
   * }
   */
  async validateBackup(backupPath) {
    try {
      // Check file exists
      if (!existsSync(backupPath)) {
        return {
          valid: false,
          error: 'Backup file does not exist'
        };
      }

      // Read and parse JSON
      const content = await readFile(backupPath, 'utf-8');
      let backup;

      try {
        backup = JSON.parse(content);
      } catch (parseError) {
        return {
          valid: false,
          error: `Invalid JSON: ${parseError.message}`
        };
      }

      // Validate required fields
      const requiredFields = ['saved_at', 'data', 'uploaded_to_db', 'upload_status'];
      const missingFields = requiredFields.filter(field => !(field in backup));

      if (missingFields.length > 0) {
        return {
          valid: false,
          error: `Missing required fields: ${missingFields.join(', ')}`
        };
      }

      // Validate upload_status enum
      const validStatuses = ['pending', 'uploaded', 'failed'];
      if (!validStatuses.includes(backup.upload_status)) {
        return {
          valid: false,
          error: `Invalid upload_status: ${backup.upload_status} (must be: ${validStatuses.join(', ')})`
        };
      }

      return {
        valid: true,
        backup
      };
    } catch (error) {
      return {
        valid: false,
        error: `Validation error: ${error.message}`
      };
    }
  }

  /**
   * Get directory path for specific subdirectory
   *
   * @param {string} [subdirectory] - Subdirectory name (defaults to primary)
   * @returns {string} Full directory path
   *
   * @example
   * const prospectsDir = backupMgr.getDirectory('prospects');
   * const failedDir = backupMgr.getDirectory('failed-uploads');
   */
  getDirectory(subdirectory = null) {
    if (!subdirectory) {
      return this.primaryDir;
    }

    if (subdirectory === 'failed-uploads') {
      return this.failedDir;
    }

    return this.directories[subdirectory] || this.primaryDir;
  }

  /**
   * Get backup manager configuration
   *
   * @returns {object} Configuration details
   *
   * @example
   * const config = backupMgr.getConfig();
   * console.log(`Engine: ${config.engineName}`);
   */
  getConfig() {
    return {
      engineName: this.engineName,
      nameField: this.nameField,
      projectRoot: this.projectRoot,
      backupRoot: this.backupRoot,
      primaryDir: this.primaryDir,
      failedDir: this.failedDir,
      subdirectories: this.subdirectories,
      directories: this.directories
    };
  }
}

// Export default instance factory for convenience
export default BackupManager;