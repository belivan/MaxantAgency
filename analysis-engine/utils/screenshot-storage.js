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

    for (const page of pages) {
      if (!page.screenshots) continue;

      const pageManifest = {};

      // Upload desktop screenshot (if available)
      if (page.screenshots.desktop && Buffer.isBuffer(page.screenshots.desktop)) {
        try {
          const desktopData = await uploadScreenshotToSupabase(
            page.screenshots.desktop,
            leadId,
            page.url,
            'desktop'
          );
          pageManifest.desktop = desktopData;
          manifest.total_size_bytes += desktopData.file_size;
          manifest.total_screenshots++;
        } catch (error) {
          console.error(`⚠️  Failed to upload desktop screenshot for ${page.url}:`, error.message);
        }
      }

      // Upload mobile screenshot (if available)
      if (page.screenshots.mobile && Buffer.isBuffer(page.screenshots.mobile)) {
        try {
          const mobileData = await uploadScreenshotToSupabase(
            page.screenshots.mobile,
            leadId,
            page.url,
            'mobile'
          );
          pageManifest.mobile = mobileData;
          manifest.total_size_bytes += mobileData.file_size;
          manifest.total_screenshots++;
        } catch (error) {
          console.error(`⚠️  Failed to upload mobile screenshot for ${page.url}:`, error.message);
        }
      }

      if (Object.keys(pageManifest).length > 0) {
        manifest.pages[page.url] = pageManifest;
      }
    }

    console.log(`✅ Generated screenshots manifest: ${manifest.total_screenshots} screenshots uploaded (${(manifest.total_size_bytes / 1024 / 1024).toFixed(2)} MB)`);

    return manifest;
  } catch (error) {
    console.error(`❌ Failed to generate screenshots manifest:`, error);
    throw error;
  }
}
