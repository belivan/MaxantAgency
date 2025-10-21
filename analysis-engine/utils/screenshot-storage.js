/**
 * Screenshot Storage Utility
 *
 * Saves screenshots to local filesystem and manages screenshot paths
 */

import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

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
function generateScreenshotFilename(companyName, type = 'desktop') {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const randomId = Math.random().toString(36).substring(2, 8);
  const sanitizedName = companyName
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
  const [desktopPath, mobilePath] = await Promise.all([
    saveScreenshotLocally(screenshots.desktop, companyName, 'desktop'),
    saveScreenshotLocally(screenshots.mobile, companyName, 'mobile')
  ]);

  return {
    desktop: desktopPath,
    mobile: mobilePath
  };
}

/**
 * Get screenshots directory path
 */
export function getScreenshotsDir() {
  return SCREENSHOTS_DIR;
}