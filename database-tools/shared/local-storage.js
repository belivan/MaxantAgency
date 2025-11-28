/**
 * Local File Storage Utility
 *
 * Replaces Supabase Storage with local filesystem storage.
 * Files are saved to disk and served via Caddy reverse proxy.
 *
 * Storage structure:
 *   /opt/MaxantAgency/storage/
 *   ├── reports/{company-slug}/FULL.pdf
 *   └── screenshots/{lead-id}/{filename}.png
 *
 * Served at: https://api.mintydesign.xyz/storage/...
 */

import { writeFile, readFile, unlink, mkdir, readdir, stat } from 'fs/promises';
import { join, dirname, basename } from 'path';
import { existsSync } from 'fs';

// Configuration via environment variables
const STORAGE_BASE_DIR = process.env.STORAGE_BASE_DIR || '/opt/MaxantAgency/storage';
const STORAGE_BASE_URL = process.env.STORAGE_BASE_URL || 'https://api.mintydesign.xyz/storage';

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
 * Get absolute storage path for a given relative path
 * @param {string} relativePath - Path relative to storage root (e.g., "reports/company/file.pdf")
 * @returns {string} Absolute filesystem path
 */
export function getStoragePath(relativePath) {
  return join(STORAGE_BASE_DIR, relativePath);
}

/**
 * Get public URL for a stored file
 * @param {string} relativePath - Path relative to storage root
 * @returns {string} Public URL
 */
export function getPublicUrl(relativePath) {
  // Ensure path starts without leading slash
  const cleanPath = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;
  return `${STORAGE_BASE_URL}/${cleanPath}`;
}

/**
 * Upload/save a file to local storage
 *
 * @param {Buffer|string} content - File content (Buffer or string)
 * @param {string} storagePath - Relative path in storage (e.g., "reports/company-name/FULL.pdf")
 * @param {string} contentType - MIME type (for logging, not used in filesystem)
 * @returns {Promise<object>} Upload result with path and URL
 */
export async function uploadFile(content, storagePath, contentType = 'application/octet-stream') {
  try {
    const absolutePath = getStoragePath(storagePath);
    const dirPath = dirname(absolutePath);

    // Ensure directory exists
    await ensureDir(dirPath);

    // Convert string content to buffer if needed
    const fileBuffer = typeof content === 'string'
      ? Buffer.from(content, 'utf-8')
      : content;

    // Write file
    await writeFile(absolutePath, fileBuffer);

    const fileSize = fileBuffer.length;
    console.log(`✅ File saved: ${storagePath} (${(fileSize / 1024).toFixed(1)} KB)`);

    return {
      success: true,
      path: storagePath,
      absolutePath,
      url: getPublicUrl(storagePath),
      size: fileSize
    };
  } catch (error) {
    console.error(`❌ File save failed: ${storagePath}`, error.message);
    throw error;
  }
}

/**
 * Download/read a file from local storage
 *
 * @param {string} storagePath - Relative path in storage
 * @returns {Promise<Buffer>} File content as buffer
 */
export async function downloadFile(storagePath) {
  try {
    const absolutePath = getStoragePath(storagePath);
    const content = await readFile(absolutePath);
    return content;
  } catch (error) {
    console.error(`❌ File read failed: ${storagePath}`, error.message);
    throw error;
  }
}

/**
 * Get file as text (for markdown, HTML, etc.)
 *
 * @param {string} storagePath - Relative path in storage
 * @returns {Promise<string>} File content as string
 */
export async function downloadFileAsText(storagePath) {
  const buffer = await downloadFile(storagePath);
  return buffer.toString('utf-8');
}

/**
 * Delete a file from local storage
 *
 * @param {string} storagePath - Relative path in storage
 * @returns {Promise<boolean>} Success status
 */
export async function deleteFile(storagePath) {
  try {
    const absolutePath = getStoragePath(storagePath);
    await unlink(absolutePath);
    console.log(`🗑️ File deleted: ${storagePath}`);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.warn(`⚠️ File not found for deletion: ${storagePath}`);
      return false;
    }
    console.error(`❌ File delete failed: ${storagePath}`, error.message);
    throw error;
  }
}

/**
 * List files in a storage directory
 *
 * @param {string} folderPath - Relative folder path
 * @returns {Promise<Array>} List of file info objects
 */
export async function listFiles(folderPath = '') {
  try {
    const absolutePath = getStoragePath(folderPath);

    if (!existsSync(absolutePath)) {
      return [];
    }

    const entries = await readdir(absolutePath, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
      const entryPath = join(folderPath, entry.name);
      const absoluteEntryPath = join(absolutePath, entry.name);

      if (entry.isFile()) {
        const stats = await stat(absoluteEntryPath);
        files.push({
          name: entry.name,
          path: entryPath,
          url: getPublicUrl(entryPath),
          size: stats.size,
          created_at: stats.birthtime,
          updated_at: stats.mtime
        });
      } else if (entry.isDirectory()) {
        files.push({
          name: entry.name,
          path: entryPath,
          isDirectory: true
        });
      }
    }

    return files;
  } catch (error) {
    console.error(`❌ Failed to list files: ${folderPath}`, error.message);
    throw error;
  }
}

/**
 * Check if a file exists
 *
 * @param {string} storagePath - Relative path in storage
 * @returns {boolean} True if file exists
 */
export function fileExists(storagePath) {
  return existsSync(getStoragePath(storagePath));
}

/**
 * Get file stats (size, dates)
 *
 * @param {string} storagePath - Relative path in storage
 * @returns {Promise<object|null>} File stats or null if not found
 */
export async function getFileStats(storagePath) {
  try {
    const absolutePath = getStoragePath(storagePath);
    const stats = await stat(absolutePath);
    return {
      size: stats.size,
      created_at: stats.birthtime,
      updated_at: stats.mtime
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/**
 * Ensure storage directories exist
 * Creates reports/ and screenshots/ subdirectories
 *
 * @returns {Promise<boolean>} Success status
 */
export async function ensureStorageDirectories() {
  try {
    await ensureDir(join(STORAGE_BASE_DIR, 'reports'));
    await ensureDir(join(STORAGE_BASE_DIR, 'screenshots'));
    console.log(`✅ Storage directories ready: ${STORAGE_BASE_DIR}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to create storage directories:`, error.message);
    return false;
  }
}

/**
 * Get storage configuration (for debugging)
 */
export function getStorageConfig() {
  return {
    baseDir: STORAGE_BASE_DIR,
    baseUrl: STORAGE_BASE_URL,
    reportsDir: join(STORAGE_BASE_DIR, 'reports'),
    screenshotsDir: join(STORAGE_BASE_DIR, 'screenshots')
  };
}

export default {
  uploadFile,
  downloadFile,
  downloadFileAsText,
  deleteFile,
  listFiles,
  fileExists,
  getFileStats,
  getPublicUrl,
  getStoragePath,
  ensureStorageDirectories,
  getStorageConfig
};
