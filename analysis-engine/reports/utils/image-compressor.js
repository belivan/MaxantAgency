/**
 * Image Compression Utility
 *
 * Compresses and resizes images for HTML reports to reduce file size
 */

import sharp from 'sharp';
import { Buffer } from 'buffer';

/**
 * Resize and compress an image from a file path
 * @param {string} imagePath - Path to image file
 * @param {object} options - Compression options
 * @param {number} options.maxWidth - Maximum width (default: 1200)
 * @param {number} options.quality - JPEG quality 1-100 (default: 75)
 * @returns {Promise<string>} Base64 data URI
 */
export async function compressImageFromFile(imagePath, options = {}) {
  const {
    maxWidth = 1200,
    quality = 75
  } = options;

  try {
    // Read and process the image
    const buffer = await sharp(imagePath)
      .resize(maxWidth, null, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality, progressive: true })
      .toBuffer();

    // Convert to base64 data URI
    const base64 = buffer.toString('base64');
    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.error(`[Image Compressor] Failed to compress ${imagePath}:`, error.message);
    return null;
  }
}

/**
 * Compress an image from a base64 data URI
 * @param {string} dataUri - Base64 data URI (e.g., "data:image/png;base64,...")
 * @param {object} options - Compression options
 * @returns {Promise<string>} Compressed base64 data URI
 */
export async function compressImageFromDataUri(dataUri, options = {}) {
  const {
    maxWidth = 1200,
    quality = 75
  } = options;

  try {
    // Extract base64 data from data URI
    const matches = dataUri.match(/^data:image\/[a-z]+;base64,(.+)$/);
    if (!matches) {
      throw new Error('Invalid data URI format');
    }

    const base64Data = matches[1];
    const inputBuffer = Buffer.from(base64Data, 'base64');

    // Resize and compress
    const buffer = await sharp(inputBuffer)
      .resize(maxWidth, null, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality, progressive: true })
      .toBuffer();

    // Convert back to base64 data URI
    const compressedBase64 = buffer.toString('base64');
    return `data:image/jpeg;base64,${compressedBase64}`;
  } catch (error) {
    console.error('[Image Compressor] Failed to compress data URI:', error.message);
    return dataUri; // Return original if compression fails
  }
}

/**
 * Create a thumbnail from an image
 * @param {string} imageSource - File path or data URI
 * @param {number} width - Thumbnail width (default: 400)
 * @returns {Promise<string>} Thumbnail data URI
 */
export async function createThumbnail(imageSource, width = 400) {
  const isDataUri = imageSource.startsWith('data:');

  if (isDataUri) {
    return await compressImageFromDataUri(imageSource, { maxWidth: width, quality: 70 });
  } else {
    return await compressImageFromFile(imageSource, { maxWidth: width, quality: 70 });
  }
}

/**
 * Get estimated size reduction percentage
 * @param {string} originalDataUri - Original data URI
 * @param {string} compressedDataUri - Compressed data URI
 * @returns {number} Percentage reduction (e.g., 75 means 75% smaller)
 */
export function getCompressionRatio(originalDataUri, compressedDataUri) {
  const originalSize = originalDataUri.length;
  const compressedSize = compressedDataUri.length;
  const reduction = ((originalSize - compressedSize) / originalSize) * 100;
  return Math.round(reduction);
}
