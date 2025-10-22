/**
 * BACKUP WRAPPER EXAMPLES
 *
 * This file demonstrates how to wrap the centralized BackupManager
 * in engine-specific utility modules for backward compatibility.
 *
 * WHY USE WRAPPERS?
 * ================
 * 1. BACKWARD COMPATIBILITY: Existing orchestrator code doesn't change
 * 2. ENGINE-SPECIFIC CUSTOMIZATION: Each engine can define its own metadata
 * 3. SIMPLER IMPORTS: Orchestrators import from './utils/local-backup.js' (no path changes)
 * 4. CENTRALIZED LOGIC: All backup logic lives in BackupManager (single source of truth)
 * 5. EASY MIGRATION: Drop in a wrapper, update one import, done
 *
 * IMPORT PATH EXPLANATION:
 * =======================
 * From prospecting-engine/utils/local-backup.js:
 *   import { BackupManager } from '../../database-tools/shared/backup-manager.js';
 *                                  ^^  ^^
 *                                  ||  ||
 *   Go up to prospecting-engine ---||  ||
 *   Go up to MaxantAgency root --------||
 *   Then down to database-tools/shared/
 *
 * From analysis-engine/utils/local-backup.js:
 *   Same pattern: ../../database-tools/shared/backup-manager.js
 */

// ============================================================================
// EXAMPLE 1: PROSPECTING ENGINE PATTERN
// ============================================================================

/**
 * FILE: prospecting-engine/utils/local-backup.js
 *
 * This wrapper provides the Prospecting Engine's interface to BackupManager.
 * It defines prospect-specific metadata and subdirectories.
 */

import { BackupManager } from '../../database-tools/shared/backup-manager.js';

// Initialize BackupManager with engine-specific configuration
const backup = new BackupManager('prospecting-engine', {
  subdirectories: ['prospects', 'failed-uploads']
  // Optional: baseDir can override default (defaults to project root)
  // baseDir: '/path/to/custom/backups'
});

/**
 * Save a prospect to local JSON backup before database upload.
 *
 * CUSTOMIZATION POINT: Define what metadata is important for prospects
 *
 * @param {Object} prospectData - Full prospect data object
 * @returns {Promise<string>} - Path to saved backup file
 */
export async function saveLocalBackup(prospectData) {
  return backup.saveBackup(prospectData, {
    // Metadata helps identify backups without opening files
    company_name: prospectData.company_name,
    industry: prospectData.industry,
    city: prospectData.city,
    state: prospectData.state,
    website: prospectData.website,
    phone: prospectData.phone,
    // You can add any fields that help with filtering/searching
    source: prospectData.source || 'google_maps',
    rating: prospectData.rating || null
  });
}

/**
 * Mark backup as successfully uploaded to database.
 *
 * WHAT HAPPENS:
 * - Moves file from prospects/ to prospects/uploaded/
 * - Updates metadata with database_id and uploaded_at timestamp
 *
 * @param {string} backupPath - Path returned from saveLocalBackup()
 * @param {string} dbId - Database UUID from Supabase insert
 * @returns {Promise<string>} - New path in uploaded/ directory
 */
export async function markAsUploaded(backupPath, dbId) {
  return backup.markAsUploaded(backupPath, dbId);
}

/**
 * Mark backup as failed to upload to database.
 *
 * WHAT HAPPENS:
 * - Moves file from prospects/ to prospects/failed/
 * - Updates metadata with error message and failed_at timestamp
 *
 * @param {string} backupPath - Path returned from saveLocalBackup()
 * @param {string|Error} error - Error message or Error object
 * @returns {Promise<string>} - New path in failed/ directory
 */
export async function markAsFailed(backupPath, error) {
  return backup.markAsFailed(backupPath, error);
}

/**
 * Retrieve a prospect from backup by its path.
 *
 * @param {string} backupPath - Path to backup file
 * @returns {Promise<Object>} - { data, metadata }
 */
export async function getBackup(backupPath) {
  return backup.getBackup(backupPath);
}

/**
 * List all prospects in a specific subdirectory.
 *
 * USAGE EXAMPLES:
 * - listBackups('prospects') - All pending uploads
 * - listBackups('prospects/uploaded') - Successfully uploaded
 * - listBackups('prospects/failed') - Failed uploads
 *
 * @param {string} subdirectory - Subdirectory to list
 * @returns {Promise<Array>} - Array of backup objects with metadata
 */
export async function listBackups(subdirectory = 'prospects') {
  return backup.listBackups(subdirectory);
}

/**
 * Delete a backup file.
 *
 * USE WITH CAUTION: Only delete after confirming database upload succeeded.
 *
 * @param {string} backupPath - Path to backup file
 * @returns {Promise<void>}
 */
export async function deleteBackup(backupPath) {
  return backup.deleteBackup(backupPath);
}

/**
 * Retry uploading all failed prospects to database.
 *
 * @param {Function} uploadFunction - async function(prospectData) => dbRecord
 * @returns {Promise<Object>} - { successful, failed, results }
 */
export async function retryFailedUploads(uploadFunction) {
  return backup.retryFailed(uploadFunction);
}

// ============================================================================
// EXAMPLE 2: ANALYSIS ENGINE PATTERN
// ============================================================================

/**
 * FILE: analysis-engine/utils/local-backup.js
 *
 * This wrapper provides the Analysis Engine's interface to BackupManager.
 * It defines lead-specific metadata and subdirectories.
 */

import { BackupManager as AnalysisBackupManager } from '../../database-tools/shared/backup-manager.js';

// Initialize BackupManager with analysis-specific configuration
const analysisBackup = new AnalysisBackupManager('analysis-engine', {
  subdirectories: ['leads', 'failed-uploads']
});

/**
 * Save a lead analysis to local JSON backup before database upload.
 *
 * CUSTOMIZATION POINT: Define what metadata is important for leads
 *
 * @param {Object} analysisResult - Full analysis result from grading system
 * @param {Object} leadData - Lead data prepared for database
 * @returns {Promise<string>} - Path to saved backup file
 */
export async function saveLeadBackup(analysisResult, leadData) {
  return analysisBackup.saveBackup(leadData, {
    // Analysis-specific metadata
    company_name: leadData.company_name,
    url: leadData.url,
    grade: leadData.website_grade,
    score: leadData.website_score,
    design_score: leadData.design_score,
    seo_score: leadData.seo_score,
    // Help identify high-priority leads
    has_quick_wins: leadData.quick_wins?.length > 0,
    top_issue: leadData.top_issue || null,
    // Track analysis source
    analyzed_at: new Date().toISOString(),
    analysis_version: '2.0.0'
  });
}

/**
 * Mark lead backup as successfully uploaded to database.
 *
 * @param {string} backupPath - Path returned from saveLeadBackup()
 * @param {string} dbId - Database UUID from Supabase insert
 * @returns {Promise<string>} - New path in uploaded/ directory
 */
export async function markLeadAsUploaded(backupPath, dbId) {
  return analysisBackup.markAsUploaded(backupPath, dbId);
}

/**
 * Mark lead backup as failed to upload to database.
 *
 * @param {string} backupPath - Path returned from saveLeadBackup()
 * @param {string|Error} error - Error message or Error object
 * @returns {Promise<string>} - New path in failed/ directory
 */
export async function markLeadAsFailed(backupPath, error) {
  return analysisBackup.markAsFailed(backupPath, error);
}

/**
 * List all lead backups in a specific subdirectory.
 *
 * @param {string} subdirectory - Subdirectory to list
 * @returns {Promise<Array>} - Array of backup objects with metadata
 */
export async function listLeadBackups(subdirectory = 'leads') {
  return analysisBackup.listBackups(subdirectory);
}

/**
 * Retry uploading all failed leads to database.
 *
 * @param {Function} uploadFunction - async function(leadData) => dbRecord
 * @returns {Promise<Object>} - { successful, failed, results }
 */
export async function retryFailedLeadUploads(uploadFunction) {
  return analysisBackup.retryFailed(uploadFunction);
}

// Export analysis backup instance for advanced usage
export { analysisBackup };

// ============================================================================
// EXAMPLE 3: USAGE IN ORCHESTRATOR (BACKWARD COMPATIBLE)
// ============================================================================

/**
 * FILE: prospecting-engine/orchestrator.js
 *
 * IMPORTANT: This code stays EXACTLY THE SAME after migration.
 * Only the import path changes (if wrapper is new).
 *
 * BEFORE (old custom implementation):
 *   import { saveLocalBackup, ... } from './utils/local-backup.js';
 *
 * AFTER (using BackupManager wrapper):
 *   import { saveLocalBackup, ... } from './utils/local-backup.js';
 *   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
 *   SAME IMPORT - no orchestrator code changes needed!
 */

// Import from the wrapper (orchestrator doesn't know about BackupManager)
import {
  saveLocalBackup,
  markAsUploaded,
  markAsFailed
} from './utils/local-backup.js';
import { saveProspect } from './database/supabase-client.js';

/**
 * Process a prospect: backup locally, upload to database, mark status.
 *
 * WORKFLOW:
 * 1. Save to local JSON immediately (data is safe even if DB fails)
 * 2. Try to upload to database
 * 3. If success: move backup to uploaded/ and record DB ID
 * 4. If failure: move backup to failed/ and record error
 */
export async function processProspect(prospectData) {
  let backupPath;

  try {
    // STEP 1: Save local backup BEFORE attempting database upload
    console.log(`[Backup] Saving prospect: ${prospectData.company_name}`);
    backupPath = await saveLocalBackup(prospectData);
    console.log(`[Backup] Saved to: ${backupPath}`);

    // STEP 2: Upload to database
    console.log(`[Database] Uploading prospect to Supabase...`);
    const savedProspect = await saveProspect(prospectData);
    console.log(`[Database] Saved with ID: ${savedProspect.id}`);

    // STEP 3: Mark backup as successfully uploaded
    const uploadedPath = await markAsUploaded(backupPath, savedProspect.id);
    console.log(`[Backup] Marked as uploaded: ${uploadedPath}`);

    return {
      success: true,
      prospect: savedProspect,
      backupPath: uploadedPath
    };

  } catch (error) {
    console.error(`[Error] Failed to process prospect:`, error.message);

    // STEP 4: Mark backup as failed (if backup exists)
    if (backupPath) {
      const failedPath = await markAsFailed(backupPath, error.message);
      console.log(`[Backup] Marked as failed: ${failedPath}`);

      return {
        success: false,
        error: error.message,
        backupPath: failedPath
      };
    }

    throw error; // Re-throw if no backup was created
  }
}

/**
 * Batch process multiple prospects with local backups.
 */
export async function batchProcessProspects(prospectsArray) {
  const results = {
    successful: 0,
    failed: 0,
    details: []
  };

  for (const prospect of prospectsArray) {
    try {
      const result = await processProspect(prospect);

      if (result.success) {
        results.successful++;
      } else {
        results.failed++;
      }

      results.details.push(result);

    } catch (error) {
      results.failed++;
      results.details.push({
        success: false,
        error: error.message,
        prospect: prospect.company_name
      });
    }
  }

  return results;
}

// ============================================================================
// EXAMPLE 4: ANALYSIS ENGINE USAGE
// ============================================================================

/**
 * FILE: analysis-engine/orchestrator.js
 *
 * Same pattern, different wrapper imports.
 */

import {
  saveLeadBackup,
  markLeadAsUploaded,
  markLeadAsFailed
} from './utils/local-backup.js';
import { saveLead } from './database/supabase-client.js';
import { analyzeWebsite } from './grading/grading-system.js';

/**
 * Analyze a website and save results with local backup.
 */
export async function analyzeAndSaveLead(url, companyName) {
  let backupPath;

  try {
    // Run analysis
    console.log(`[Analysis] Analyzing website: ${url}`);
    const analysisResult = await analyzeWebsite(url, companyName);

    // Prepare lead data for database
    const leadData = {
      company_name: companyName,
      url: url,
      website_grade: analysisResult.grade,
      website_score: Math.round(analysisResult.overall_score),
      design_score: Math.round(analysisResult.design_score),
      seo_score: Math.round(analysisResult.seo_score),
      design_issues: analysisResult.design_issues || [],
      quick_wins: analysisResult.quick_wins || [],
      top_issue: analysisResult.top_issue || null,
      one_liner: analysisResult.one_liner || null,
      analyzed_at: new Date().toISOString()
    };

    // Save local backup BEFORE database upload
    console.log(`[Backup] Saving lead backup...`);
    backupPath = await saveLeadBackup(analysisResult, leadData);
    console.log(`[Backup] Saved to: ${backupPath}`);

    // Upload to database
    console.log(`[Database] Uploading lead to Supabase...`);
    const savedLead = await saveLead(leadData);
    console.log(`[Database] Saved with ID: ${savedLead.id}`);

    // Mark backup as successfully uploaded
    const uploadedPath = await markLeadAsUploaded(backupPath, savedLead.id);
    console.log(`[Backup] Marked as uploaded: ${uploadedPath}`);

    return {
      success: true,
      lead: savedLead,
      backupPath: uploadedPath
    };

  } catch (error) {
    console.error(`[Error] Failed to analyze and save lead:`, error.message);

    if (backupPath) {
      const failedPath = await markLeadAsFailed(backupPath, error.message);
      console.log(`[Backup] Marked as failed: ${failedPath}`);

      return {
        success: false,
        error: error.message,
        backupPath: failedPath
      };
    }

    throw error;
  }
}

// ============================================================================
// EXAMPLE 5: RETRY FAILED UPLOADS
// ============================================================================

/**
 * FILE: prospecting-engine/scripts/retry-failed-prospects.js
 *
 * Script to retry uploading all failed prospects to database.
 */

import { retryFailedUploads } from '../utils/local-backup.js';
import { saveProspect } from '../database/supabase-client.js';

/**
 * Retry all failed prospect uploads.
 */
async function retryFailed() {
  console.log('[Retry] Starting retry process for failed prospects...\n');

  const results = await retryFailedUploads(async (prospectData) => {
    // This function is called for each failed backup
    // Return the saved database record
    return await saveProspect(prospectData);
  });

  console.log('\n[Retry] Results:');
  console.log(`  ✅ Successful: ${results.successful}`);
  console.log(`  ❌ Failed: ${results.failed}`);

  if (results.results.length > 0) {
    console.log('\n[Retry] Details:');
    results.results.forEach((result, index) => {
      if (result.success) {
        console.log(`  ${index + 1}. ✅ ${result.metadata.company_name} - Uploaded with ID: ${result.dbId}`);
      } else {
        console.log(`  ${index + 1}. ❌ ${result.metadata.company_name} - Error: ${result.error}`);
      }
    });
  }

  return results;
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  retryFailed()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('[Retry] Fatal error:', error);
      process.exit(1);
    });
}

export { retryFailed };

// ============================================================================
// EXAMPLE 6: CUSTOM ENGINE IMPLEMENTATION
// ============================================================================

/**
 * FILE: outreach-engine/utils/local-backup.js
 *
 * Example for a new engine (Outreach Engine).
 */

import { BackupManager } from '../../database-tools/shared/backup-manager.js';

const backup = new BackupManager('outreach-engine', {
  subdirectories: ['composed-emails', 'sent-emails', 'failed-sends']
});

/**
 * Save a composed email to local backup.
 */
export async function saveEmailBackup(emailData) {
  return backup.saveBackup(emailData, {
    recipient: emailData.recipient_email,
    subject: emailData.subject,
    strategy: emailData.strategy,
    lead_id: emailData.lead_id,
    composed_at: new Date().toISOString()
  });
}

/**
 * Mark email as sent successfully.
 */
export async function markEmailAsSent(backupPath, sendGridId) {
  // Move to sent-emails/ subdirectory
  const sentPath = backupPath.replace('/composed-emails/', '/sent-emails/');
  await backup.moveBackup(backupPath, sentPath);

  // Update metadata
  return backup.updateMetadata(sentPath, {
    sent_at: new Date().toISOString(),
    sendgrid_id: sendGridId,
    status: 'sent'
  });
}

/**
 * Mark email send as failed.
 */
export async function markEmailSendFailed(backupPath, error) {
  return backup.markAsFailed(backupPath, error);
}

export { backup as emailBackupManager };

// ============================================================================
// KEY TAKEAWAYS
// ============================================================================

/**
 * MIGRATION CHECKLIST:
 * ====================
 *
 * 1. CREATE WRAPPER:
 *    - Create {engine}/utils/local-backup.js
 *    - Import BackupManager from ../../database-tools/shared/backup-manager.js
 *    - Initialize with engine name and subdirectories
 *
 * 2. DEFINE METADATA:
 *    - Decide what metadata is important for your engine
 *    - Add custom metadata in saveLocalBackup() wrapper
 *
 * 3. EXPORT FUNCTIONS:
 *    - Export saveLocalBackup, markAsUploaded, markAsFailed, etc.
 *    - Keep function signatures the same as before (backward compatible)
 *
 * 4. UPDATE ORCHESTRATOR:
 *    - Change import path (if needed): import { ... } from './utils/local-backup.js'
 *    - Orchestrator code stays the same
 *
 * 5. TEST:
 *    - Test saving backups
 *    - Test marking as uploaded
 *    - Test marking as failed
 *    - Test retry logic
 *
 * ADVANTAGES:
 * ===========
 * ✅ Single source of truth (BackupManager)
 * ✅ Consistent behavior across all engines
 * ✅ Easy to add new features (just update BackupManager)
 * ✅ Backward compatible (orchestrators don't change)
 * ✅ Engine-specific customization (metadata, subdirectories)
 * ✅ No code duplication
 * ✅ Centralized bug fixes
 *
 * CUSTOMIZATION POINTS:
 * =====================
 * 1. Subdirectories: Define in constructor options
 * 2. Metadata: Define in saveLocalBackup() wrapper
 * 3. Function names: Customize exports (saveLeadBackup vs saveEmailBackup)
 * 4. Additional methods: Add engine-specific helpers
 *
 * EXAMPLE DIRECTORY STRUCTURE:
 * ============================
 *
 * local-backups/
 * ├── prospecting-engine/
 * │   ├── prospects/
 * │   │   ├── 2025-10-21_CompanyName_uuid.json
 * │   │   └── ...
 * │   ├── prospects/uploaded/
 * │   │   └── 2025-10-21_CompanyName_uuid.json
 * │   └── prospects/failed/
 * │       └── 2025-10-21_FailedCompany_uuid.json
 * ├── analysis-engine/
 * │   ├── leads/
 * │   ├── leads/uploaded/
 * │   └── leads/failed/
 * └── outreach-engine/
 *     ├── composed-emails/
 *     ├── sent-emails/
 *     └── failed-sends/
 */