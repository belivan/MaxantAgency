/**
 * Screenshot Storage Utility
 *
 * Saves screenshots to local filesystem and/or Supabase Storage
 * Generates JSON manifests for screenshot organization
 */

import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Screenshots directory (analysis-engine/screenshots/)
const SCREENSHOTS_DIR = join(__dirname, '..', 'screenshots');

/**
 * Ensure screenshots directory exists
 */
async function ensureScreenshotsDir() {
  if (!existsSync(SCREENSHOTS_DIR)) {
    await mkdir(SCREENSHOTS_DIR, { recursive: true });
    console.log(`📁 Created screenshots directory: ${SCREENSHOTS_DIR}`);
  }
}

/**
 * Generate filename for screenshot
 * Format: company-name-desktop-2025-10-21-abc123.png
 */
function generateScreenshotFilename(companyName = 'website', type = 'desktop') {
  const safeName = (companyName || 'website').toString();
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const randomId = Math.random().toString(36).substring(2, 8);
  const sanitizedName = safeName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50); // Limit length

  return `${sanitizedName}-${type}-${date}-${randomId}.png`;
}

/**
 * Save screenshot buffer to local disk
 *
 * @param {Buffer} screenshotBuffer - Screenshot image buffer
 * @param {string} companyName - Company name for filename
 * @param {string} type - Screenshot type ('desktop' or 'mobile')
 * @returns {Promise<string>} Local file path
 */
export async function saveScreenshotLocally(screenshotBuffer, companyName, type = 'desktop') {
  try {
    if (!Buffer.isBuffer(screenshotBuffer)) {
      console.warn(`[Screenshot Storage] Skipping ${type} screenshot for ${companyName || 'unknown company'} - no buffer provided.`);
      return null;
    }

    await ensureScreenshotsDir();

    const filename = generateScreenshotFilename(companyName, type);
    const filepath = join(SCREENSHOTS_DIR, filename);

    await writeFile(filepath, screenshotBuffer);

    console.log(`📸 Saved ${type} screenshot: ${filename}`);

    return filepath;
  } catch (error) {
    console.error(`❌ Failed to save ${type} screenshot:`, error);
    throw error;
  }
}

/**
 * Save both desktop and mobile screenshots
 *
 * @param {object} screenshots - Object with desktop and mobile screenshot buffers
 * @param {string} companyName - Company name for filenames
 * @returns {Promise<object>} Object with desktop and mobile file paths
 */
export async function saveDualScreenshots(screenshots, companyName) {
  const result = { desktop: null, mobile: null };

  if (!screenshots) {
    return result;
  }

  if (Buffer.isBuffer(screenshots.desktop)) {
    result.desktop = await saveScreenshotLocally(screenshots.desktop, companyName, 'desktop');
  } else if (screenshots.desktop) {
    console.warn(`[Screenshot Storage] Desktop screenshot provided for ${companyName || 'unknown company'} is not a buffer. Skipping save.`);
  }

  if (Buffer.isBuffer(screenshots.mobile)) {
    result.mobile = await saveScreenshotLocally(screenshots.mobile, companyName, 'mobile');
  } else if (screenshots.mobile) {
    console.warn(`[Screenshot Storage] Mobile screenshot provided for ${companyName || 'unknown company'} is not a buffer. Skipping save.`);
  }

  return result;
}

/**
 * Get screenshots directory path
 */
export function getScreenshotsDir() {
  return SCREENSHOTS_DIR;
}

// ====================================================================
// SUPABASE STORAGE FUNCTIONS
// ====================================================================

/**
 * Get Supabase client (lazy initialization)
 */
function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
  }

  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Upload screenshot to Supabase Storage
 *
 * @param {Buffer} screenshotBuffer - PNG screenshot buffer
 * @param {string} leadId - Lead UUID
 * @param {string} pageUrl - Page URL (e.g., "/", "/about")
 * @param {string} viewport - "desktop" or "mobile"
 * @returns {Promise<object>} { path, url, width, height, size, format, captured_at }
 */
export async function uploadScreenshotToSupabase(screenshotBuffer, leadId, pageUrl, viewport) {
  try {
    if (!Buffer.isBuffer(screenshotBuffer)) {
      throw new Error('Screenshot buffer is required');
    }

    const supabase = getSupabaseClient();

    // Compress screenshot to 80% quality for efficient storage
    // This reduces file size by ~70-85% while maintaining visual quality
    const compressedBuffer = await sharp(screenshotBuffer)
      .png({
        quality: 80,
        compressionLevel: 9,  // Maximum compression
        effort: 10            // Maximum effort for better compression
      })
      .toBuffer();

    console.log(`📦 Compressed ${viewport} screenshot: ${screenshotBuffer.length} bytes → ${compressedBuffer.length} bytes (${Math.round((1 - compressedBuffer.length / screenshotBuffer.length) * 100)}% reduction)`);

    // Generate storage path
    const safePage = pageUrl === '/' ? 'homepage' : pageUrl.replace(/\//g, '-').replace(/^-/, '');
    const timestamp = new Date().toISOString().split('T')[0];
    const randomId = Math.random().toString(36).substring(2, 8);
    const filename = `${safePage}-${viewport}-${timestamp}-${randomId}.png`;
    const storagePath = `${leadId}/${filename}`;

    // Upload to Supabase Storage (using compressed buffer)
    const { data, error } = await supabase.storage
      .from('screenshots')
      .upload(storagePath, compressedBuffer, {
        contentType: 'image/png',
        cacheControl: '31536000', // 1 year cache
        upsert: false
      });

    if (error) {
      console.error(`❌ Failed to upload screenshot to Supabase: ${error.message}`);
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('screenshots')
      .getPublicUrl(storagePath);

    console.log(`📤 Uploaded ${viewport} screenshot for ${pageUrl}: ${filename}`);

    return {
      path: storagePath,
      url: urlData.publicUrl,
      width: viewport === 'desktop' ? 1920 : 375,
      height: viewport === 'desktop' ? 1080 : 812,
      file_size: compressedBuffer.length,  // Use compressed size
      format: 'png',
      captured_at: new Date().toISOString()
    };
  } catch (error) {
    console.error(`❌ Supabase screenshot upload failed:`, error);
    throw error;
  }
}

/**
 * Check if a URL is absolute (starts with http:// or https://)
 * @param {string} url - URL to check
 * @returns {boolean} True if URL is absolute
 */
export function isAbsoluteUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return url.startsWith('http://') || url.startsWith('https://');
}

/**
 * Convert storage path to absolute Supabase URL
 * If already absolute, returns as-is
 * @param {string} pathOrUrl - Storage path or URL
 * @param {string} bucket - Storage bucket name (default: 'screenshots')
 * @returns {string|null} Absolute URL or null if invalid
 */
export function ensureAbsoluteUrl(pathOrUrl, bucket = 'screenshots') {
  if (!pathOrUrl || typeof pathOrUrl !== 'string') return null;

  // Already absolute - return as-is
  if (isAbsoluteUrl(pathOrUrl)) {
    return pathOrUrl;
  }

  // Convert storage path to absolute URL
  const supabaseUrl = process.env.SUPABASE_URL;
  if (!supabaseUrl) {
    console.warn('[Screenshot Storage] Cannot convert storage path to URL: SUPABASE_URL not set');
    return null;
  }

  // Remove leading slash if present
  const cleanPath = pathOrUrl.startsWith('/') ? pathOrUrl.substring(1) : pathOrUrl;

  // Build absolute URL
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${cleanPath}`;
}

/**
 * Sleep utility for rate limiting
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Process array in batches with delays
 * @param {Array} items - Items to process
 * @param {number} batchSize - Number of items per batch
 * @param {number} delayMs - Delay between batches in milliseconds
 * @param {Function} processFn - Async function to process each item
 */
async function processBatches(items, batchSize, delayMs, processFn) {
  const results = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(items.length / batchSize);

    console.log(`📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} items)...`);

    // Process batch items in parallel
    const batchResults = await Promise.all(
      batch.map(item => processFn(item).catch(err => ({ error: err })))
    );

    results.push(...batchResults);

    // Add delay between batches (except after last batch)
    if (i + batchSize < items.length) {
      console.log(`⏱️  Waiting ${delayMs}ms before next batch...`);
      await sleep(delayMs);
    }
  }

  return results;
}

/**
 * Generate screenshots manifest from crawled pages
 * Uploads all screenshots to Supabase Storage and returns manifest
 *
 * @param {Array} pages - Array of crawled pages with screenshots
 * @param {string} leadId - Lead UUID
 * @param {string} storageType - 'supabase_storage', 'local', or 'both'
 * @returns {Promise<object>} Complete screenshots manifest
 */
export async function generateScreenshotsManifest(pages, leadId, storageType = 'supabase_storage') {
  try {
    const manifest = {
      storage_type: storageType,
      base_url: process.env.SUPABASE_URL ? `${process.env.SUPABASE_URL}/storage/v1/object/public/screenshots/` : null,
      version: '1.0',
      captured_at: new Date().toISOString(),
      pages: {},
      total_screenshots: 0,
      total_size_bytes: 0,
      storage_bucket: 'screenshots',
      lead_id: leadId
    };

    // Collect all screenshots to upload
    const uploadsQueue = [];

    for (const page of pages) {
      if (!page.screenshots) continue;

      // Queue desktop screenshot upload
      if (page.screenshots.desktop && Buffer.isBuffer(page.screenshots.desktop)) {
        uploadsQueue.push({
          buffer: page.screenshots.desktop,
          pageUrl: page.url,
          viewport: 'desktop'
        });
      }

      // Queue mobile screenshot upload
      if (page.screenshots.mobile && Buffer.isBuffer(page.screenshots.mobile)) {
        uploadsQueue.push({
          buffer: page.screenshots.mobile,
          pageUrl: page.url,
          viewport: 'mobile'
        });
      }
    }

    console.log(`📸 Uploading ${uploadsQueue.length} screenshots in batches of 5...`);

    // Process uploads in batches of 5 with 1-second delays
    const BATCH_SIZE = 5;
    const DELAY_BETWEEN_BATCHES_MS = 1000;

    const uploadResults = await processBatches(
      uploadsQueue,
      BATCH_SIZE,
      DELAY_BETWEEN_BATCHES_MS,
      async (upload) => {
        try {
          const data = await uploadScreenshotToSupabase(
            upload.buffer,
            leadId,
            upload.pageUrl,
            upload.viewport
          );
          return { success: true, data, pageUrl: upload.pageUrl, viewport: upload.viewport };
        } catch (error) {
          console.error(`⚠️  Failed to upload ${upload.viewport} screenshot for ${upload.pageUrl}:`, error.message);
          return { success: false, error, pageUrl: upload.pageUrl, viewport: upload.viewport };
        }
      }
    );

    // Build manifest from upload results
    for (const result of uploadResults) {
      if (!result.success) continue;

      const { data, pageUrl, viewport } = result;

      if (!manifest.pages[pageUrl]) {
        manifest.pages[pageUrl] = {};
      }

      manifest.pages[pageUrl][viewport] = data;
      manifest.total_size_bytes += data.file_size;
      manifest.total_screenshots++;
    }

    const failedUploads = uploadResults.filter(r => !r.success).length;
    if (failedUploads > 0) {
      console.warn(`⚠️  ${failedUploads} screenshot uploads failed`);
    }

    console.log(`✅ Generated screenshots manifest: ${manifest.total_screenshots} screenshots uploaded (${(manifest.total_size_bytes / 1024 / 1024).toFixed(2)} MB)`);

    return manifest;
  } catch (error) {
    console.error(`❌ Failed to generate screenshots manifest:`, error);
    throw error;
  }
}
