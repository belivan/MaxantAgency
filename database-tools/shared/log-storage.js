/**
 * Log Storage Utility - JSONL File-Based Logging
 *
 * Provides file-based log persistence on VPS storage.
 * Logs are stored as JSONL (JSON Lines) files organized by date and job.
 *
 * Storage structure:
 *   /opt/MaxantAgency/storage/logs/
 *   ├── 2025-11-28/                          # Date-organized daily logs
 *   │   ├── analysis-engine.jsonl
 *   │   ├── prospecting-engine.jsonl
 *   │   ├── report-engine.jsonl
 *   │   ├── outreach-engine.jsonl
 *   │   └── pipeline-orchestrator.jsonl
 *   └── jobs/                                 # Job-specific logs
 *       ├── analysis-abc123.jsonl
 *       └── report-def456.jsonl
 */

import { appendFile, mkdir, readdir, rm, stat } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';

// Configuration via environment variables
const STORAGE_BASE_DIR = process.env.STORAGE_BASE_DIR || '/opt/MaxantAgency/storage';
const LOGS_DIR = join(STORAGE_BASE_DIR, 'logs');
const LOG_RETENTION_DAYS = parseInt(process.env.LOG_RETENTION_DAYS) || 5;

// Track if we've warned about storage issues
let storageWarningShown = false;

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Ensure directory exists, creating it if necessary
 * @param {string} dirPath - Directory path
 */
async function ensureDir(dirPath) {
  if (!existsSync(dirPath)) {
    await mkdir(dirPath, { recursive: true });
  }
}

/**
 * Get the log file path for a given engine and date
 * @param {string} engine - Engine name (e.g., 'analysis-engine')
 * @param {string} date - Date in YYYY-MM-DD format (defaults to today)
 * @returns {string} Absolute file path
 */
function getEngineLogPath(engine, date = getTodayDate()) {
  return join(LOGS_DIR, date, `${engine}.jsonl`);
}

/**
 * Get the log file path for a specific job
 * @param {string} jobId - Job ID
 * @returns {string} Absolute file path
 */
function getJobLogPath(jobId) {
  return join(LOGS_DIR, 'jobs', `${jobId}.jsonl`);
}

/**
 * Append a log entry to an engine's daily log file
 *
 * @param {string} engine - Engine name
 * @param {object} logEntry - Log entry object
 * @returns {Promise<boolean>} Success status
 */
export async function appendLog(engine, logEntry) {
  try {
    const logPath = getEngineLogPath(engine);
    const dirPath = dirname(logPath);

    // Ensure directory exists
    await ensureDir(dirPath);

    // Append log entry as JSONL
    const line = JSON.stringify(logEntry) + '\n';
    await appendFile(logPath, line, 'utf-8');

    return true;
  } catch (error) {
    // Silent fail - don't break operations
    if (!storageWarningShown) {
      console.warn('[Log Storage] Failed to write log:', error.message);
      storageWarningShown = true;
    }
    return false;
  }
}

/**
 * Append a log entry to a job-specific log file
 *
 * @param {string} jobId - Job ID
 * @param {object} logEntry - Log entry object
 * @returns {Promise<boolean>} Success status
 */
export async function appendJobLog(jobId, logEntry) {
  try {
    const logPath = getJobLogPath(jobId);
    const dirPath = dirname(logPath);

    // Ensure jobs directory exists
    await ensureDir(dirPath);

    // Append log entry as JSONL
    const line = JSON.stringify(logEntry) + '\n';
    await appendFile(logPath, line, 'utf-8');

    return true;
  } catch (error) {
    // Silent fail
    if (!storageWarningShown) {
      console.warn('[Log Storage] Failed to write job log:', error.message);
      storageWarningShown = true;
    }
    return false;
  }
}

/**
 * Clean up logs older than retention period
 *
 * @param {number} retentionDays - Number of days to keep logs (default: 5)
 * @returns {Promise<object>} Cleanup results
 */
export async function cleanupOldLogs(retentionDays = LOG_RETENTION_DAYS) {
  const results = {
    deletedDirectories: [],
    deletedJobFiles: [],
    errors: [],
    skipped: 0
  };

  try {
    // Ensure logs directory exists
    if (!existsSync(LOGS_DIR)) {
      return results;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    const entries = await readdir(LOGS_DIR, { withFileTypes: true });

    for (const entry of entries) {
      // Skip 'jobs' directory (handled separately)
      if (entry.name === 'jobs') continue;

      // Check if it's a date directory (YYYY-MM-DD format)
      if (entry.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(entry.name)) {
        if (entry.name < cutoffStr) {
          try {
            const dirPath = join(LOGS_DIR, entry.name);
            await rm(dirPath, { recursive: true, force: true });
            results.deletedDirectories.push(entry.name);
          } catch (error) {
            results.errors.push({ path: entry.name, error: error.message });
          }
        } else {
          results.skipped++;
        }
      }
    }

    // Clean up old job logs
    const jobsDir = join(LOGS_DIR, 'jobs');
    if (existsSync(jobsDir)) {
      const jobFiles = await readdir(jobsDir);

      for (const file of jobFiles) {
        try {
          const filePath = join(jobsDir, file);
          const stats = await stat(filePath);
          const fileAge = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);

          if (fileAge > retentionDays) {
            await rm(filePath, { force: true });
            results.deletedJobFiles.push(file);
          }
        } catch (error) {
          results.errors.push({ path: `jobs/${file}`, error: error.message });
        }
      }
    }

    const totalDeleted = results.deletedDirectories.length + results.deletedJobFiles.length;
    if (totalDeleted > 0) {
      console.log(`[Log Storage] Cleaned up ${totalDeleted} old log entries (${retentionDays}-day retention)`);
    }

    return results;
  } catch (error) {
    console.warn('[Log Storage] Cleanup error:', error.message);
    results.errors.push({ path: 'root', error: error.message });
    return results;
  }
}

/**
 * Get list of log files for a specific date
 *
 * @param {string} date - Date in YYYY-MM-DD format (defaults to today)
 * @returns {Promise<Array>} List of log files
 */
export async function getLogFiles(date = getTodayDate()) {
  try {
    const dateDir = join(LOGS_DIR, date);

    if (!existsSync(dateDir)) {
      return [];
    }

    const files = await readdir(dateDir);
    return files.filter(f => f.endsWith('.jsonl')).map(f => ({
      name: f,
      path: join(dateDir, f),
      engine: f.replace('.jsonl', '')
    }));
  } catch (error) {
    console.warn('[Log Storage] Failed to list log files:', error.message);
    return [];
  }
}

/**
 * Get storage configuration (for debugging)
 */
export function getLogStorageConfig() {
  return {
    logsDir: LOGS_DIR,
    retentionDays: LOG_RETENTION_DAYS,
    todayDir: join(LOGS_DIR, getTodayDate()),
    jobsDir: join(LOGS_DIR, 'jobs')
  };
}

/**
 * Ensure log storage directories exist
 * @returns {Promise<boolean>} Success status
 */
export async function ensureLogDirectories() {
  try {
    await ensureDir(LOGS_DIR);
    await ensureDir(join(LOGS_DIR, 'jobs'));
    return true;
  } catch (error) {
    console.warn('[Log Storage] Failed to create log directories:', error.message);
    return false;
  }
}

export default {
  appendLog,
  appendJobLog,
  cleanupOldLogs,
  getLogFiles,
  getLogStorageConfig,
  ensureLogDirectories
};
