/**
 * AI Client - Unified client for OpenAI, Grok (xAI), and Claude (Anthropic)
 *
 * Handles API calls to different AI providers with consistent interface
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdir, writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { getCachedResponse, cacheResponse } from './ai-cache.js';
import sharp from 'sharp';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import { getRateLimitTracker } from './rate-limit-tracker.js';

// Load environment variables from the root .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

// Debug configuration
const DEBUG_AI_CALLS = process.env.DEBUG_AI_CALLS === 'true';
const DEBUG_AI_SAVE_TO_FILE = process.env.DEBUG_AI_SAVE_TO_FILE === 'true';
const DEBUG_OUTPUT_DIR = process.env.DEBUG_OUTPUT_DIR || './debug-logs';
const LOG_AI_CALLS_TO_DB = process.env.LOG_AI_CALLS_TO_DB === 'true';

// Rate limiting and retry configuration
const ENABLE_AUTO_RETRY = process.env.ENABLE_AUTO_RETRY !== 'false';
const MAX_RETRY_ATTEMPTS = parseInt(process.env.MAX_RETRY_ATTEMPTS || '3');
const RETRY_BASE_DELAY_MS = 1000; // 1 second base delay
const RETRY_MAX_DELAY_MS = 60000; // Max 60 seconds
const RETRY_JITTER_MS = 1000; // Random jitter up to 1 second

// Timeout configuration
const AI_TIMEOUT = parseInt(process.env.AI_TIMEOUT || '180000'); // 3 minutes default
const OPENAI_TIMEOUT = parseInt(process.env.OPENAI_TIMEOUT || AI_TIMEOUT); // Use AI_TIMEOUT as fallback

// GPT-5 reasoning effort configuration
// minimal = fast streaming (10-15x faster), medium = default, high = maximum reasoning
const GPT5_REASONING_EFFORT = process.env.GPT5_REASONING_EFFORT || 'minimal';

// Supabase client for database logging (initialized lazily)
let supabase = null;
function getSupabase() {
  if (!supabase && LOG_AI_CALLS_TO_DB) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (supabaseUrl && supabaseKey) {
      supabase = createClient(supabaseUrl, supabaseKey);
    }
  }
  return supabase;
}

// Initialize clients lazily to avoid errors during import when API keys not set
let openai = null;
let grok = null;
let anthropic = null;

function getOpenAIClient() {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable not set');
    }
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  return openai;
}

function getGrokClient() {
  if (!grok) {
    if (!process.env.XAI_API_KEY) {
      throw new Error('XAI_API_KEY environment variable not set');
    }
    grok = new OpenAI({
      apiKey: process.env.XAI_API_KEY,
      baseURL: 'https://api.x.ai/v1'
    });
  }
  return grok;
}

function getAnthropicClient() {
  if (!anthropic) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable not set');
    }
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
  }
  return anthropic;
}

/**
 * Debug Utilities - Log AI calls for transparency
 */
let debugCallCounter = 0;

function truncateForDisplay(text, maxLength = 500) {
  if (!text) return '[empty]';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + `...[${text.length - maxLength} more chars]`;
}

function logDebugCall(model, systemPrompt, userPrompt, hasImage, temperature, jsonMode, caller) {
  if (!DEBUG_AI_CALLS) return;

  debugCallCounter++;

  console.log('\n' + '='.repeat(80));
  console.log(`🤖 AI CALL #${debugCallCounter} - ${model}`);
  // FIX #6: Show caller for redundancy tracking
  if (caller) {
    console.log(`   Called by: ${caller}`);
  }
  console.log('='.repeat(80));
  console.log(`Temperature: ${temperature} | JSON Mode: ${jsonMode} | Has Image: ${hasImage}`);
  console.log('\n📝 SYSTEM PROMPT:');
  console.log('-'.repeat(80));
  console.log(truncateForDisplay(systemPrompt, 1000));
  console.log('\n📝 USER PROMPT:');
  console.log('-'.repeat(80));
  console.log(truncateForDisplay(userPrompt, 1000));
  console.log('='.repeat(80) + '\n');
}

function logDebugResponse(content, usage, cost, cached = false) {
  if (!DEBUG_AI_CALLS) return;

  console.log('\n' + '='.repeat(80));
  console.log(`✅ AI RESPONSE #${debugCallCounter} ${cached ? '(CACHED)' : ''}`);
  console.log('='.repeat(80));
  console.log(`Tokens: ${usage?.prompt_tokens || 0} input + ${usage?.completion_tokens || 0} output = ${usage?.total_tokens || 0} total`);
  console.log(`Cost: $${cost?.toFixed(4) || '0.0000'}`);
  console.log('\n📄 RESPONSE CONTENT:');
  console.log('-'.repeat(80));
  console.log(truncateForDisplay(content, 2000));
  console.log('='.repeat(80) + '\n');
}

async function saveDebugToFile(callData) {
  if (!DEBUG_AI_SAVE_TO_FILE) return;

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `ai-call-${debugCallCounter}-${timestamp}.json`;
    const dir = join(process.cwd(), DEBUG_OUTPUT_DIR, 'ai-calls');

    await mkdir(dir, { recursive: true });

    const filepath = join(dir, filename);
    await writeFile(filepath, JSON.stringify(callData, null, 2), 'utf8');

    if (DEBUG_AI_CALLS) {
      console.log(`💾 Debug data saved to: ${filepath}\n`);
    }
  } catch (error) {
    console.error('Failed to save debug file:', error.message);
  }
}

/**
 * Log AI call to database for cost tracking and debugging
 * Non-blocking - does not throw errors if logging fails
 */
async function logAICallToDatabase({ engine, module, model, provider, request, response, durationMs, cached, error, retryCount, rateLimitHit }) {
  if (!LOG_AI_CALLS_TO_DB) return;

  try {
    const db = getSupabase();
    if (!db) {
      console.warn('[AI Client] Cannot log to database: Supabase client not initialized');
      return;
    }

    const logEntry = {
      engine: engine || 'unknown',
      module: module || 'unknown',
      model,
      provider,
      prompt_tokens: response?.usage?.prompt_tokens || null,
      completion_tokens: response?.usage?.completion_tokens || null,
      total_tokens: response?.usage?.total_tokens || null,
      cost: response?.cost || null,
      response_content: response?.content ? { content: response.content } : null,
      request_data: {
        systemPrompt: request?.systemPrompt?.substring(0, 500) || null, // Truncate for DB
        userPrompt: request?.userPrompt?.substring(0, 500) || null,
        temperature: request?.temperature,
        hasImages: request?.hasImages,
        imageCount: request?.imageCount,
        jsonMode: request?.jsonMode,
        maxTokens: request?.maxTokens
      },
      duration_ms: durationMs,
      cached: cached || false,
      error: error || null,
      retry_count: retryCount || 0,
      rate_limit_hit: rateLimitHit || false
    };

    const { error: dbError } = await db.from('ai_calls').insert(logEntry);

    if (dbError) {
      console.warn('[AI Client] Failed to log AI call to database:', dbError.message);
    }
  } catch (err) {
    // Silently fail - don't let logging errors break AI calls
    console.warn('[AI Client] Error logging AI call:', err.message);
  }
}

/**
 * Call AI model with text or vision prompt
 *
 * @param {object} options - Call options
 * @param {string} options.model - Model ID (e.g., 'gpt-5', 'grok-4-fast', 'claude-4-5-sonnet')
 * @param {string} options.systemPrompt - System prompt
 * @param {string} options.userPrompt - User prompt
 * @param {number} options.temperature - Temperature (0-1)
 * @param {string|Buffer} options.image - Optional single image (base64 string or Buffer) - DEPRECATED, use images array
 * @param {Array<string|Buffer>} options.images - Optional array of images (base64 strings or Buffers)
 * @param {boolean} options.jsonMode - Enable JSON output mode
 * @param {number} options.maxTokens - Maximum tokens to generate (default: 16384 for generous limits)
 * @param {boolean} options.autoFallback - Auto-fallback to GPT-4o if GPT-5 fails with length error (default: false)
 * @returns {Promise<object>} {content, usage, cost}
 */


/**
 * Detect image media type from buffer magic bytes
 */
function detectMediaType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 8) {
    return 'image/jpeg'; // Default
  }
  
  // Check magic bytes
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return 'image/png';
  }
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg';
  }
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return 'image/gif';
  }
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
    return 'image/webp';
  }
  
  return 'image/jpeg'; // Default to JPEG
}

/**
 * Compress image to stay under Claude's 5MB limit
 * SMART SPLIT: Tall images (>2000px) are split into sections to preserve detail
 * Returns: single buffer OR array of {buffer, label} objects for sections
 */
async function compressImageIfNeeded(image) {
  if (!image) return null;

  try {
    let buffer;

    // Handle URL strings - fetch from remote
    if (typeof image === 'string' && (image.startsWith('http://') || image.startsWith('https://'))) {
      console.log(`[AI Client] Fetching image from URL...`);
      const response = await fetch(image);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      buffer = Buffer.from(await response.arrayBuffer());
    }
    // Handle base64 strings
    else if (typeof image === 'string' && image.includes('base64')) {
      const base64Data = image.split('base64,')[1] || image;
      buffer = Buffer.from(base64Data, 'base64');
    }
    // Handle local file paths
    else if (typeof image === 'string' && existsSync(image)) {
      console.log(`[AI Client] Reading image from local path: ${image}`);
      buffer = await readFile(image);
    }
    // Handle buffers
    else if (Buffer.isBuffer(image)) {
      buffer = image;
    }
    else {
      console.warn(`[AI Client] Unknown image format, returning as-is:`, typeof image);
      return image; // Return as-is if unknown format
    }

    const sizeMB = (buffer.length / 1024 / 1024).toFixed(2);
    const metadata = await sharp(buffer).metadata();

    console.log(`[AI Client] Image ${metadata.width}x${metadata.height}, ${sizeMB} MB`);

    // First, handle width if needed
    let processedBuffer = buffer;
    if (metadata.width > 1920) {
      processedBuffer = await sharp(buffer)
        .resize(1920, null, { fit: 'inside', withoutEnlargement: true })
        .toBuffer();

      const newMeta = await sharp(processedBuffer).metadata();
      console.log(`[AI Client] Width resized to ${newMeta.width}x${newMeta.height}`);
    }

    // Check if height exceeds limit - if so, SMART SPLIT into sections
    const finalMeta = await sharp(processedBuffer).metadata();
    if (finalMeta.height > 2000) {
      console.log(`[AI Client] Height ${finalMeta.height}px > 2000px - splitting into sections to preserve detail`);

      // Calculate number of sections needed (max 2000px each)
      const numSections = Math.ceil(finalMeta.height / 2000);
      const sectionHeight = Math.floor(finalMeta.height / numSections);

      const sections = [];
      const sectionNames = ['TOP', 'MIDDLE', 'BOTTOM'];

      for (let i = 0; i < numSections; i++) {
        const top = i * sectionHeight;
        const height = (i === numSections - 1)
          ? finalMeta.height - top  // Last section gets remainder
          : sectionHeight;

        // Extract section at FULL RESOLUTION (no vertical squashing!)
        let sectionBuffer = await sharp(processedBuffer)
          .extract({ left: 0, top, width: finalMeta.width, height })
          .toBuffer();

        // Compress section with adaptive quality
        const qualityLevels = [85, 70, 55, 40];
        let usedQuality = qualityLevels[0];

        for (const quality of qualityLevels) {
          const compressed = await sharp(sectionBuffer)
            .jpeg({ quality, progressive: true, mozjpeg: true })
            .toBuffer();

          if (compressed.length <= 4 * 1024 * 1024 || quality === qualityLevels[qualityLevels.length - 1]) {
            sectionBuffer = compressed;
            usedQuality = quality;
            break;
          }
        }

        const sectionMeta = await sharp(sectionBuffer).metadata();
        const sectionMB = (sectionBuffer.length / 1024 / 1024).toFixed(2);
        const label = sectionNames[Math.min(i, sectionNames.length - 1)];

        console.log(`[AI Client] Section ${i + 1}/${numSections} (${label}): ${sectionMeta.width}x${sectionMeta.height}, ${sectionMB} MB (Q${usedQuality})`);

        sections.push({ buffer: sectionBuffer, label });
      }

      return sections; // Return array of sections
    }

    // Image is short enough - process as single image with adaptive quality
    const needsCompression = processedBuffer.length > 4 * 1024 * 1024;

    if (!needsCompression && finalMeta.height <= 2000) {
      console.log(`[AI Client] Within limits - no compression needed`);
      return processedBuffer;
    }

    // Adaptive quality compression
    const qualityLevels = [85, 70, 55, 40];
    let compressed = processedBuffer;
    let usedQuality = qualityLevels[0];

    for (const quality of qualityLevels) {
      compressed = await sharp(processedBuffer)
        .jpeg({ quality, progressive: true, mozjpeg: true })
        .toBuffer();

      usedQuality = quality;

      if (compressed.length <= 4 * 1024 * 1024) {
        break;
      }

      if (quality === qualityLevels[qualityLevels.length - 1]) {
        break;
      }
    }

    const compressedMeta = await sharp(compressed).metadata();
    const finalMB = (compressed.length / 1024 / 1024).toFixed(2);
    console.log(`[AI Client] Result: ${compressedMeta.width}x${compressedMeta.height}, ${finalMB} MB (Q${usedQuality})`);
    return compressed;
  } catch (error) {
    console.error(`[AI Client] Image compression failed:`, error.message);
    return image; // Return original on error
  }
}

/**
 * Calculate retry delay with exponential backoff and jitter
 */
function calculateRetryDelay(attemptNumber, retryAfterSeconds = null) {
  // If API provides Retry-After header, respect it
  if (retryAfterSeconds && retryAfterSeconds > 0) {
    return Math.min(retryAfterSeconds * 1000, RETRY_MAX_DELAY_MS);
  }

  // Exponential backoff: delay = base * (2 ^ attempt)
  const exponentialDelay = RETRY_BASE_DELAY_MS * Math.pow(2, attemptNumber);

  // Add random jitter to prevent thundering herd
  const jitter = Math.random() * RETRY_JITTER_MS;

  // Cap at maximum delay
  return Math.min(exponentialDelay + jitter, RETRY_MAX_DELAY_MS);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if error is a rate limit error (429)
 */
function isRateLimitError(error) {
  if (!error) return false;

  const errorMessage = (error.message || '').toLowerCase();
  const errorString = String(error).toLowerCase();

  return (
    errorMessage.includes('429') ||
    errorMessage.includes('rate limit') ||
    errorMessage.includes('rate_limit') ||
    errorString.includes('429') ||
    error.status === 429 ||
    error.statusCode === 429
  );
}

/**
 * Extract Retry-After value from error (if available)
 */
function extractRetryAfter(error) {
  try {
    // Check for Retry-After in error message or headers
    if (error.response?.headers) {
      const retryAfter = error.response.headers['retry-after'];
      if (retryAfter) {
        return parseInt(retryAfter);
      }
    }

    // Try to parse from error message
    const match = error.message?.match(/retry.?after[:\s]+(\d+)/i);
    if (match) {
      return parseInt(match[1]);
    }
  } catch (e) {
    // Ignore parsing errors
  }

  return null;
}

/**
 * Create a timeout promise that rejects after specified milliseconds
 */
function createTimeoutPromise(timeoutMs, operationName = 'AI call') {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
}

/**
 * Execute an async operation with timeout enforcement
 */
async function withTimeout(promise, timeoutMs, operationName = 'Operation') {
  return Promise.race([
    promise,
    createTimeoutPromise(timeoutMs, operationName)
  ]);
}

/**
 * Generate simulated AI responses for testing without real API calls
 * Returns realistic mock data based on prompt context
 */
function generateSimulatedResponse(model, systemPrompt, userPrompt, jsonMode, hasImages) {
  const provider = getProvider(model);

  // Simulate processing delay
  const mockDelay = Math.random() * 100 + 50; // 50-150ms

  // Generate mock usage stats
  const promptLength = (systemPrompt?.length || 0) + (userPrompt?.length || 0);
  const mockPromptTokens = Math.ceil(promptLength / 4);
  const mockCompletionTokens = jsonMode ? Math.floor(Math.random() * 1000) + 500 : Math.floor(Math.random() * 500) + 200;

  // Calculate mock cost
  const costPer1kTokens = {
    'openai': { input: 0.01, output: 0.03 },
    'anthropic': { input: 0.008, output: 0.024 },
    'xai': { input: 0.005, output: 0.015 }
  };
  const rates = costPer1kTokens[provider] || costPer1kTokens['openai'];
  const mockCost = (mockPromptTokens / 1000 * rates.input) + (mockCompletionTokens / 1000 * rates.output);

  let mockContent;

  if (jsonMode) {
    // Detect what type of analysis this is based on prompt keywords
    const promptText = (systemPrompt + ' ' + userPrompt).toLowerCase();

    // Check unified analyzers FIRST before individual ones
    if (promptText.includes('unified') && (promptText.includes('visual') || promptText.includes('design') || hasImages)) {
      // Unified Visual Analyzer (desktop + mobile combined)
      mockContent = JSON.stringify({
        overallDesignScore: Math.floor(Math.random() * 30) + 60, // 60-90
        designIssues: [
          { issue: "Hero section lacks visual hierarchy", severity: "medium", page: "Homepage" },
          { issue: "CTA buttons could be more prominent", severity: "low", page: "Homepage" },
          { issue: "Color contrast needs improvement", severity: "high", page: "Multiple pages" }
        ],
        positives: [
          "Clean, modern layout",
          "Good use of whitespace",
          "Consistent branding"
        ],
        quickWins: [
          "Increase CTA button size",
          "Add hover effects to links",
          "Improve image loading speed"
        ],
        quickWinCount: 3
      });
    } else if (promptText.includes('unified') && (promptText.includes('technical') || promptText.includes('seo'))) {
      // Unified Technical Analyzer (SEO + Content combined)
      mockContent = JSON.stringify({
        overallTechnicalScore: Math.floor(Math.random() * 30) + 65, // 65-95
        seoIssues: [
          { issue: "Missing meta descriptions", severity: "high", page: "Multiple pages" },
          { issue: "Slow page load time", severity: "medium", page: "Homepage" }
        ],
        contentIssues: [
          { issue: "About page lacks compelling story", severity: "medium", page: "About" },
          { issue: "No clear value proposition on homepage", severity: "high", page: "Homepage" }
        ],
        positives: [
          "Mobile-responsive design",
          "Clear service offerings",
          "Professional tone"
        ],
        quickWins: [
          "Add meta descriptions to key pages",
          "Add customer success stories",
          "Create FAQ section"
        ],
        quickWinCount: 3
      });
    } else if (promptText.includes('design') || promptText.includes('visual') || hasImages) {
      // Visual/Design analysis (individual)
      mockContent = JSON.stringify({
        overallDesignScore: Math.floor(Math.random() * 30) + 60, // 60-90
        designIssues: [
          { issue: "Hero section lacks visual hierarchy", severity: "medium", page: "Homepage" },
          { issue: "CTA buttons could be more prominent", severity: "low", page: "Homepage" },
          { issue: "Color contrast needs improvement", severity: "high", page: "Multiple pages" }
        ],
        positives: [
          "Clean, modern layout",
          "Good use of whitespace",
          "Consistent branding"
        ],
        quickWins: [
          "Increase CTA button size",
          "Add hover effects to links",
          "Improve image loading speed"
        ],
        quickWinCount: 3
      });
    } else if (promptText.includes('seo') || promptText.includes('technical')) {
      // SEO/Technical analysis (individual)
      mockContent = JSON.stringify({
        overallSeoScore: Math.floor(Math.random() * 30) + 65, // 65-95
        seoIssues: [
          { issue: "Missing meta descriptions", severity: "high", page: "Multiple pages" },
          { issue: "Slow page load time", severity: "medium", page: "Homepage" },
          { issue: "No structured data markup", severity: "low", page: "All pages" }
        ],
        positives: [
          "Mobile-responsive design",
          "HTTPS enabled",
          "Clean URL structure"
        ],
        quickWins: [
          "Add meta descriptions to key pages",
          "Optimize image compression",
          "Implement basic schema markup"
        ],
        quickWinCount: 3
      });
    } else if (promptText.includes('content')) {
      // Content analysis
      mockContent = JSON.stringify({
        overallContentScore: Math.floor(Math.random() * 25) + 70, // 70-95
        contentIssues: [
          { issue: "About page lacks compelling story", severity: "medium", page: "About" },
          { issue: "Service descriptions too technical", severity: "low", page: "Services" },
          { issue: "No clear value proposition on homepage", severity: "high", page: "Homepage" }
        ],
        positives: [
          "Clear service offerings",
          "Professional tone",
          "Good testimonials"
        ],
        quickWins: [
          "Add customer success stories",
          "Simplify service descriptions",
          "Create FAQ section"
        ],
        quickWinCount: 3
      });
    } else if (promptText.includes('social')) {
      // Social media analysis
      mockContent = JSON.stringify({
        socialScore: Math.floor(Math.random() * 30) + 60, // 60-90
        socialIssues: [
          { issue: "No visible social media links", severity: "medium", page: "Homepage" },
          { issue: "Missing social proof/testimonials", severity: "low", page: "Multiple pages" }
        ],
        positives: [
          "Professional online presence",
          "Consistent branding"
        ],
        quickWins: [
          "Add social media icons to footer",
          "Embed recent reviews",
          "Add social sharing buttons"
        ],
        quickWinCount: 3
      });
    } else if (promptText.includes('accessibility')) {
      // Accessibility analysis
      mockContent = JSON.stringify({
        accessibilityScore: Math.floor(Math.random() * 25) + 70, // 70-95
        accessibilityIssues: [
          { issue: "Missing alt text on some images", severity: "medium", page: "Multiple pages" },
          { issue: "Low color contrast on CTA buttons", severity: "high", page: "Homepage" }
        ],
        positives: [
          "Semantic HTML structure",
          "Keyboard navigation works"
        ],
        quickWins: [
          "Add alt text to all images",
          "Improve color contrast ratios",
          "Add ARIA labels to forms"
        ],
        quickWinCount: 3
      });
    } else if (promptText.includes('email') || promptText.includes('outreach')) {
      // Email/Outreach composition
      mockContent = JSON.stringify({
        subject: "Quick wins to improve your website performance",
        body: "Hi [Name],\n\nI noticed your website at [URL] and was impressed by [positive aspect]. However, I spotted a few quick improvements that could boost your results:\n\n• [Issue 1]\n• [Issue 2]\n• [Issue 3]\n\nThese changes typically take less than a day to implement but can significantly impact conversions.\n\nWould you be interested in a brief call to discuss?\n\nBest,\n[Your name]",
        tone: "professional yet friendly",
        strategy: "value-first approach"
      });
    } else {
      // Generic analysis
      mockContent = JSON.stringify({
        overallScore: Math.floor(Math.random() * 30) + 65, // 65-95
        issues: [
          { issue: "Generic issue 1", severity: "medium" },
          { issue: "Generic issue 2", severity: "low" }
        ],
        positives: [
          "Good foundation",
          "Professional appearance"
        ],
        recommendations: [
          "Recommendation 1",
          "Recommendation 2"
        ]
      });
    }
  } else {
    // Non-JSON mode - return text
    mockContent = "This is a simulated AI response for testing purposes. In production, this would contain detailed analysis based on the provided prompts.";
  }

  return {
    content: mockContent,
    usage: {
      prompt_tokens: mockPromptTokens,
      completion_tokens: mockCompletionTokens,
      total_tokens: mockPromptTokens + mockCompletionTokens
    },
    cost: mockCost,
    provider: provider,
    model: model,
    simulated: true
  };
}

export async function callAI({
  model,
  systemPrompt,
  userPrompt,
  temperature = 0.3,
  image = null,
  images = null,
  jsonMode = false,
  maxTokens = null,  // Will be set based on model if not provided
  autoFallback = false,
  timeout = null,  // Optional: custom timeout in ms (defaults to OPENAI_TIMEOUT or ANTHROPIC_TIMEOUT)
  engine = null,  // Optional: which engine is calling (for logging)
  module = null,  // Optional: which module is calling (for logging)
  caller = null   // FIX #6: Optional: specific caller for redundancy tracking (e.g., 'benchmark-visual-strengths-phase-2')
}) {
  const callStartTime = Date.now();

  // Normalize images parameter (support both single image and images array)
  let normalizedImages = null;
  if (images && Array.isArray(images)) {
    normalizedImages = images.filter(Boolean); // Remove null/undefined
  } else if (image) {
    normalizedImages = [image]; // Convert single image to array for consistency
  }

  // Compress images if needed (fetch URLs, compress over 5MB)
  // Skip if images are already Buffers (already processed by analyzer)
  if (normalizedImages && normalizedImages.length > 0) {
    const needsCompression = normalizedImages.some(img =>
      !Buffer.isBuffer(img) && typeof img === 'string'
    );

    if (needsCompression) {
      const compressed = await Promise.all(
        normalizedImages.map(img => compressImageIfNeeded(img))
      );

      // Flatten section arrays into buffers
      // compressImageIfNeeded returns either Buffer or [{buffer, label}, ...]
      normalizedImages = [];
      for (const result of compressed) {
        if (Array.isArray(result)) {
          // It's a sections array - extract just the buffers
          normalizedImages.push(...result.map(section => section.buffer));
        } else {
          // It's a single buffer
          normalizedImages.push(result);
        }
      }
    }
  }

  const hasImages = normalizedImages && normalizedImages.length > 0;

  // 🎭 SIMULATION MODE: Return mock responses without calling real APIs
  if (process.env.SIMULATE_AI_CALLS === 'true') {
    const simulatedResponse = generateSimulatedResponse(model, systemPrompt, userPrompt, jsonMode, hasImages);
    console.log(`[AI Client] 🎭 SIMULATION MODE: Returning mock response for ${model}`);
    return simulatedResponse;
  }

  // maxTokens check removed - let models use their full capacity
  // If not explicitly provided, will be set per-provider later

  // Log the AI call for debugging
  // FIX #6: Build caller string from engine, module, and caller parameters
  const callerString = [engine, module, caller].filter(Boolean).join(' > ') || 'unknown';
  logDebugCall(model, systemPrompt, userPrompt, hasImages, temperature, jsonMode, callerString);

  // ⚡ Check cache first (only for non-image requests)
  if (!hasImages) {
    const cached = getCachedResponse(model, systemPrompt, userPrompt, temperature, jsonMode);
    if (cached) {
      logDebugResponse(cached.content, cached.usage, cached.cost, true);
      return cached;
    }
  }

  // Determine provider from model ID
  const provider = getProvider(model);

  // Get rate limit tracker
  const rateLimitTracker = getRateLimitTracker();

  // Estimate token usage (rough estimates for rate limiting)
  const estimatedInputTokens = Math.ceil((systemPrompt.length + userPrompt.length) / 4);
  const estimatedOutputTokens = maxTokens || 4000;

  // Retry loop with exponential backoff
  let response;
  let lastError;
  let retryCount = 0;

  for (let attempt = 0; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      // Check rate limits before making request (skip on retries after rate limit error)
      if (attempt === 0) {
        const limitCheck = rateLimitTracker.checkLimit(provider, model, estimatedInputTokens, estimatedOutputTokens);

        if (!limitCheck.allowed) {
          console.warn(`[AI Client] Rate limit would be exceeded for ${provider}/${model}: ${limitCheck.reason}`);
          console.warn(`[AI Client] Wait time: ${limitCheck.waitTime}s, Current: ${limitCheck.current}, Limit: ${limitCheck.limit}`);

          // Wait before retrying (respecting rate limits)
          if (limitCheck.waitTime > 0 && limitCheck.waitTime <= 60) {
            console.log(`[AI Client] Waiting ${limitCheck.waitTime}s before retrying...`);
            await sleep(limitCheck.waitTime * 1000);
          } else {
            throw new Error(`Rate limit exceeded: ${limitCheck.reason}. Would need to wait ${limitCheck.waitTime}s`);
          }
        }
      }

      // Make the actual API call
      if (provider === 'anthropic') {
        response = await callClaude({ model, systemPrompt, userPrompt, temperature, images: normalizedImages, maxTokens, timeout });
      } else {
        try {
          response = await callOpenAICompatible({ model, systemPrompt, userPrompt, temperature, images: normalizedImages, jsonMode, maxTokens, provider, timeout });
        } catch (error) {
          const message = (error?.message || '').toLowerCase();
          // Auto-fallback to GPT-5-mini if GPT-5 hits token limits (only when explicitly enabled)
          if (autoFallback && model === 'gpt-5' && message.includes('token limit')) {
            console.warn('[AI Client] GPT-5 hit token limits. Falling back to gpt-5-mini.');
            response = await callOpenAICompatible({
              model: 'gpt-5-mini',
              systemPrompt,
              userPrompt,
              temperature,
              images: normalizedImages,
              jsonMode,
              maxTokens,
              provider: 'openai',
              timeout
            });
          } else {
            throw error;
          }
        }
      }

      // Record successful usage
      if (response && response.usage) {
        rateLimitTracker.recordUsage(
          provider,
          model,
          response.usage.prompt_tokens || 0,
          response.usage.completion_tokens || 0
        );
      }

      // Success - break out of retry loop
      break;

    } catch (error) {
      lastError = error;

      // Check if this is a rate limit error
      if (isRateLimitError(error)) {
        if (attempt < MAX_RETRY_ATTEMPTS && ENABLE_AUTO_RETRY) {
          retryCount++;

          // Extract Retry-After header if available
          const retryAfterSeconds = extractRetryAfter(error);
          const delayMs = calculateRetryDelay(attempt, retryAfterSeconds);
          const delaySec = Math.ceil(delayMs / 1000);

          console.warn(`[AI Client] Rate limit hit for ${provider}/${model} (attempt ${attempt + 1}/${MAX_RETRY_ATTEMPTS + 1})`);
          console.log(`[AI Client] Retrying in ${delaySec}s...`);

          await sleep(delayMs);
          continue; // Retry
        } else {
          // Max retries exceeded or retry disabled
          console.error(`[AI Client] Rate limit error after ${attempt + 1} attempts`);
          throw error;
        }
      }

      // Not a rate limit error - throw immediately
      throw error;
    }
  }

  // If we exhausted all retries without success
  if (!response && lastError) {
    throw lastError;
  }

  const callDuration = Date.now() - callStartTime;

  // Log the response for debugging
  logDebugResponse(response.content, response.usage, response.cost, false);

  // Save debug data to file if enabled
  if (DEBUG_AI_SAVE_TO_FILE) {
    await saveDebugToFile({
      callNumber: debugCallCounter,
      timestamp: new Date().toISOString(),
      request: {
        model,
        systemPrompt,
        userPrompt,
        temperature,
        hasImages,
        imageCount: normalizedImages?.length || 0,
        jsonMode,
        maxTokens
      },
      response: {
        content: response.content,
        usage: response.usage,
        cost: response.cost,
        provider: response.provider
      },
      metadata: {
        durationMs: callDuration,
        cached: false
      }
    });
  }

  // ⚡ Cache successful response (only for non-image requests)
  if (!hasImages) {
    cacheResponse(model, systemPrompt, userPrompt, temperature, jsonMode, response);
  }

  // 📊 Log to database (non-blocking)
  logAICallToDatabase({
    engine,
    module,
    model,
    provider: response.provider,
    request: {
      systemPrompt,
      userPrompt,
      temperature,
      hasImages,
      imageCount: normalizedImages?.length || 0,
      jsonMode,
      maxTokens
    },
    response,
    durationMs: callDuration,
    retryCount,
    rateLimitHit: retryCount > 0,
    cached: false,
    error: null
  }).catch(err => {
    // Silent fail - don't let logging errors break AI calls
  });

  return response;
}

/**
 * Call OpenAI-compatible API (OpenAI, Grok)
 */
async function callOpenAICompatible({
  model,
  systemPrompt,
  userPrompt,
  temperature,
  images,
  jsonMode,
  maxTokens,
  provider,
  timeout = null  // Optional: custom timeout in ms (defaults to OPENAI_TIMEOUT)
}) {
  if (!model) {
    throw new Error('[AI Client] Model parameter is required but was undefined');
  }

  const client = provider === 'grok' ? getGrokClient() : getOpenAIClient();

  try {
    // Build user message content
    const userContent = [];

    // Add text
    userContent.push({
      type: 'text',
      text: userPrompt
    });

    // Add images if provided (supports multiple images)
    if (images && images.length > 0) {
      for (const image of images) {
        // Convert Buffer to base64 if needed
        let base64Image;
        if (Buffer.isBuffer(image)) {
          base64Image = image.toString('base64');
        } else if (typeof image === 'string') {
          base64Image = image.replace(/^data:image\/\w+;base64,/, '');
        } else {
          throw new Error('Each image must be Buffer or base64 string');
        }

        userContent.push({
          type: 'image_url',
          image_url: {
            url: `data:image/png;base64,${base64Image}`,
            detail: 'high'
          }
        });
      }
    }

    // ⚠️ DISABLED: Token limits removed to prevent response truncation
    // Let each model use its native maximum capacity
    // User requested: "I don't care about token defaults"
    /*
    let adjustedMaxTokens;

    if (model.startsWith('gpt-5')) {
      // GPT-5 & GPT-5 Mini: 128,000 MAX OUTPUT TOKENS! 🚀
      adjustedMaxTokens = maxTokens || 128000;
    } else if (model.startsWith('gpt-4o')) {
      // GPT-4o and GPT-4o-mini: 16,384 max output tokens
      adjustedMaxTokens = maxTokens || 16384;
    } else if (model.includes('grok')) {
      // Grok models: 32,768 max output tokens
      adjustedMaxTokens = maxTokens || 32768;
    } else {
      // Default: Use provided maxTokens or model maximum
      adjustedMaxTokens = maxTokens || 16384;
    }
    */

    // Only use maxTokens if explicitly provided by caller, otherwise let model use native max
    const adjustedMaxTokens = maxTokens || undefined;


    const requestBody = {
      model,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userContent.length === 1 ? userPrompt : userContent
        }
      ]
    };

    // ⚠️ DISABLED: Only set token limits if explicitly provided
    // GPT-5 uses max_completion_tokens instead of max_tokens
    if (adjustedMaxTokens) {
      if (model.startsWith('gpt-5')) {
        requestBody.max_completion_tokens = adjustedMaxTokens;
      } else {
        requestBody.max_tokens = adjustedMaxTokens;
      }
    }
    // Otherwise, let the model use its native maximum capacity

    // GPT-5 only supports temperature=1 (default), so skip it for GPT-5
    if (!model.startsWith('gpt-5')) {
      requestBody.temperature = temperature;
    }

    // Enable JSON mode if requested
    // Note: GPT-5 doesn't support response_format parameter, relies on prompt instructions
    if (jsonMode && !model.startsWith('gpt-5')) {
      requestBody.response_format = { type: 'json_object' };
    }

    // Add reasoning_effort for GPT-5 models to speed up response
    // minimal = 10-15x faster than default medium effort
    if (model.startsWith('gpt-5')) {
      requestBody.reasoning_effort = GPT5_REASONING_EFFORT;
    }

    // Make API call with timeout enforcement
    // Use custom timeout if provided, otherwise fall back to OPENAI_TIMEOUT
    const effectiveTimeout = timeout || OPENAI_TIMEOUT;
    const response = await withTimeout(
      client.chat.completions.create(requestBody),
      effectiveTimeout,
      `${provider} API call (${model})`
    );

    // Calculate cost
    const cost = calculateCost(model, response.usage);

    // Validate response has content
    const responseContent = response.choices[0]?.message?.content;
    const finishReason = response.choices[0]?.finish_reason;
    
    if (!responseContent) {
      // If GPT-5 hit the length limit even with increased tokens, provide helpful error
      if (model.startsWith('gpt-5') && finishReason === 'length') {
        const reasoningTokens = response.usage?.completion_tokens_details?.reasoning_tokens || 0;
        console.error(`GPT-5 exhausted token limit with ${reasoningTokens} reasoning tokens and empty output.`);
        console.error('Consider: 1) Increasing max_completion_tokens further, 2) Simplifying the prompt, 3) Using GPT-4o instead');
        throw new Error(`GPT-5 returned empty content (used ${reasoningTokens} reasoning tokens, hit ${adjustedMaxTokens} token limit). Try increasing maxTokens or using a different model.`);
      }
      
      console.error('Empty response from OpenAI:', JSON.stringify(response, null, 2));
      throw new Error('OpenAI returned empty content');
    }

    return {
      content: responseContent,
      usage: response.usage,
      cost,
      model,
      provider
    };

  } catch (error) {
    console.error(`AI call failed (${model}):`, error.message);
    throw new Error(`AI API call failed: ${error.message}`);
  }
}

/**
 * Call Claude (Anthropic) API
 */
async function callClaude({
  model,
  systemPrompt,
  userPrompt,
  temperature,
  images,
  maxTokens,
  timeout = null  // Optional: custom timeout in ms (defaults to AI_TIMEOUT)
}) {
  const client = getAnthropicClient();

  try {
    // ⚠️ Claude API REQUIRES max_tokens field - can't be omitted
    // Use model's native maximum if not explicitly provided
    // Claude Haiku 3.5: 8,192 max output tokens
    // Claude Sonnet 3.5: 8,192 max output tokens
    // Claude Opus 3: 4,096 max output tokens
    const adjustedMaxTokens = maxTokens || 8192; // Use reasonable max for Claude 3.5

    // Build user message content
    const content = [];

    // Add text
    content.push({
      type: 'text',
      text: userPrompt
    });

    // Add images if provided (supports multiple images)
    if (images && images.length > 0) {
      for (const image of images) {
        // Convert Buffer to base64 if needed
        let base64Image;
        let mediaType = 'image/jpeg'; // Default

        if (Buffer.isBuffer(image)) {
          mediaType = detectMediaType(image); // Detect from magic bytes
          base64Image = image.toString('base64');
        } else if (typeof image === 'string') {
          // Extract media type from data URL if present
          const dataUrlMatch = image.match(/^data:(image\/\w+);base64,/);
          if (dataUrlMatch) {
            mediaType = dataUrlMatch[1];
            base64Image = image.replace(/^data:image\/\w+;base64,/, '');
          } else {
            base64Image = image;
          }
        } else {
          throw new Error('Each image must be Buffer or base64 string');
        }

        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType,
            data: base64Image
          }
        });
      }
    }

    // Make API call with timeout enforcement - max_tokens is required by Claude API
    // Use custom timeout if provided, otherwise fall back to AI_TIMEOUT
    const effectiveTimeout = timeout || AI_TIMEOUT;
    const response = await withTimeout(
      client.messages.create({
        model,
        max_tokens: adjustedMaxTokens, // Required field - using model's native max
        temperature,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content
          }
        ]
      }),
      effectiveTimeout,
      `Anthropic API call (${model})`
    );

    // Calculate cost
    const usage = {
      prompt_tokens: response.usage.input_tokens,
      completion_tokens: response.usage.output_tokens,
      total_tokens: response.usage.input_tokens + response.usage.output_tokens
    };

    const cost = calculateCost(model, usage);

    // Validate response has content
    const responseContent = response.content[0]?.text;
    if (!responseContent) {
      console.error('Empty response from Claude:', JSON.stringify(response, null, 2));
      throw new Error('Claude returned empty content');
    }

    return {
      content: responseContent,
      usage,
      cost,
      model,
      provider: 'anthropic'
    };

  } catch (error) {
    console.error(`Claude API call failed (${model}):`, error.message);
    throw new Error(`Claude API call failed: ${error.message}`);
  }
}

/**
 * Get provider from model ID
 */
function getProvider(modelId) {
  if (!modelId || typeof modelId !== 'string') {
    console.warn('[AI Client] Model ID is undefined or invalid, defaulting to OpenAI');
    return 'openai';
  }

  if (modelId.includes('grok')) return 'grok';
  if (modelId.includes('gpt')) return 'openai';
  if (modelId.includes('claude')) return 'anthropic';

  // Default to OpenAI
  return 'openai';
}

/**
 * Calculate cost of API call
 */
function calculateCost(modelId, usage) {
  if (!usage) return 0;

  // Pricing per 1M tokens (as of November 2025)
  const pricing = {
    // OpenAI ChatGPT 5 (verified pricing Nov 2025)
    'gpt-5': { input: 1.25, output: 10 },
    'gpt-5-2025-08-07': { input: 1.25, output: 10 }, // Alias for backward compatibility
    'gpt-5-mini': { input: 0.25, output: 2 },
    'gpt-5-nano': { input: 0.05, output: 0.40 }, // Ultra budget model - perfect for JSON recovery

    // Grok (xAI) - Latest models (Nov 2025)
    'grok-4': { input: 3, output: 15 },
    'grok-4-fast': { input: 0.20, output: 0.50 },

    // Claude (Anthropic) - Claude 4.5 models (2025)
    'claude-4-5-haiku': { input: 1.00, output: 5.00 },
    'claude-haiku-4-5': { input: 1.00, output: 5.00 },
    'claude-4-5-sonnet': { input: 3, output: 15 },
    'claude-sonnet-4-5': { input: 3, output: 15 }
  };

  const modelPricing = pricing[modelId] || { input: 0, output: 0 };

  const inputCost = (usage.prompt_tokens / 1_000_000) * modelPricing.input;
  const outputCost = (usage.completion_tokens / 1_000_000) * modelPricing.output;

  return inputCost + outputCost;
}

/**
 * AI-powered JSON recovery using GPT-5-nano
 * Used as a fallback when rule-based repairs fail
 * @param {string} brokenJSON - The malformed JSON string
 * @param {object} expectedSchema - Expected JSON structure (optional)
 * @param {string} errorMessage - The specific error message from JSON.parse (optional)
 * @returns {Promise<object|null>}
 */
async function recoverJSONWithAI(brokenJSON, expectedSchema = null, errorMessage = null) {
  const startTime = Date.now();

  try {
    const systemPrompt = `You are a JSON repair specialist. Your job is to fix malformed JSON and return valid, parseable JSON.

Rules:
1. Fix syntax errors (missing brackets, unclosed strings, trailing commas, etc.)
2. Preserve the original data intent as much as possible
3. If field names are inconsistent (camelCase vs snake_case), use camelCase
4. Convert quoted numbers to actual numbers if they should be numeric
5. Return ONLY the fixed JSON, no explanations or markdown
6. If the JSON is completely unrecoverable, return an error object: {"error": "reason"}`;

    let userPrompt = `Fix this malformed JSON:\n\n`;

    // Add error message if available (helps AI target the fix)
    if (errorMessage) {
      userPrompt += `**Parse Error:**\n${errorMessage}\n\n`;
    }

    userPrompt += `**Broken JSON:**\n${brokenJSON}`;

    if (expectedSchema) {
      userPrompt += `\n\n**Expected schema:**\n${JSON.stringify(expectedSchema, null, 2)}`;
    }

    console.log('🤖 Attempting AI-powered JSON recovery with gpt-5-nano...');

    const response = await callAI({
      model: 'gpt-5-nano',
      systemPrompt,
      userPrompt,
      temperature: 0.1, // Low temperature for consistent repairs
      jsonMode: false // We'll manually parse the response
    });

    const elapsed = Date.now() - startTime;

    // Try to parse the AI's response
    let content = response.content.trim();

    // Remove markdown code blocks if present
    if (content.startsWith('```')) {
      const match = content.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
      if (match) {
        content = match[1];
      }
    }

    const repairedJSON = JSON.parse(content);

    // Check if AI returned an error object
    if (repairedJSON.error) {
      console.log(`❌ AI recovery failed: ${repairedJSON.error} (cost: $${response.cost?.toFixed(6) || 0}, time: ${elapsed}ms)`);
      return null;
    }

    console.log(`✅ AI recovery successful! (cost: $${response.cost?.toFixed(6) || 0}, time: ${elapsed}ms)`);
    return repairedJSON;

  } catch (error) {
    console.log(`❌ AI recovery failed: ${error.message}`);
    return null;
  }
}

/**
 * Parse JSON response with error handling and AI-powered fallback
 */
export async function parseJSONResponse(content, options = {}) {
  try {
    // Handle null or undefined content
    if (!content) {
      throw new Error('AI response content is null or empty');
    }

    // Ensure content is a string
    const contentStr = typeof content === 'string' ? content :
                       typeof content === 'object' ? JSON.stringify(content) :
                       String(content);

    // Try to extract JSON from markdown code blocks
    const jsonMatch = contentStr.match(/```json\n([\s\S]*?)\n```/) ||
                     contentStr.match(/```\n([\s\S]*?)\n```/) ||
                     [null, contentStr];

    let jsonText = jsonMatch[1] || contentStr;

    // If parsing fails, try to extract JSON object from conversational text
    // (handles cases like "I'll analyze... {json here}")
    try {
      return JSON.parse(jsonText);
    } catch (firstError) {
      // Find first { and last } to extract JSON from conversational wrapper
      const firstBrace = jsonText.indexOf('{');
      const lastBrace = jsonText.lastIndexOf('}');

      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const extractedJson = jsonText.substring(firstBrace, lastBrace + 1);

        try {
          return JSON.parse(extractedJson);
        } catch (secondError) {
          // JSON is malformed - try to repair common issues
          console.warn('⚠️  JSON parsing failed, attempting to repair...');

          let repaired = extractedJson;

          // Fix text words used for numeric values (e.g., "score": fifty → "score": 50)
          const numberWords = {
            'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9,
            'ten': 10, 'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15, 'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19,
            'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90,
            'hundred': 100,
            // Extended: 21-100
            'twenty-one': 21, 'twenty_one': 21, 'twentyone': 21,
            'twenty-two': 22, 'twenty_two': 22, 'twentytwo': 22,
            'twenty-three': 23, 'twenty_three': 23, 'twentythree': 23,
            'twenty-four': 24, 'twenty_four': 24, 'twentyfour': 24,
            'twenty-five': 25, 'twenty_five': 25, 'twentyfive': 25,
            'twenty-six': 26, 'twenty_six': 26, 'twentysix': 26,
            'twenty-seven': 27, 'twenty_seven': 27, 'twentyseven': 27,
            'twenty-eight': 28, 'twenty_eight': 28, 'twentyeight': 28,
            'twenty-nine': 29, 'twenty_nine': 29, 'twentynine': 29,
            'thirty-one': 31, 'thirty_one': 31, 'thirtyone': 31,
            'thirty-two': 32, 'thirty_two': 32, 'thirtytwo': 32,
            'thirty-three': 33, 'thirty_three': 33, 'thirtythree': 33,
            'thirty-four': 34, 'thirty_four': 34, 'thirtyfour': 34,
            'thirty-five': 35, 'thirty_five': 35, 'thirtyfive': 35,
            'thirty-six': 36, 'thirty_six': 36, 'thirtysix': 36,
            'thirty-seven': 37, 'thirty_seven': 37, 'thirtyseven': 37,
            'thirty-eight': 38, 'thirty_eight': 38, 'thirtyeight': 38,
            'thirty-nine': 39, 'thirty_nine': 39, 'thirtynine': 39,
            'forty-one': 41, 'forty_one': 41, 'fortyone': 41,
            'forty-two': 42, 'forty_two': 42, 'fortytwo': 42,
            'forty-three': 43, 'forty_three': 43, 'fortythree': 43,
            'forty-four': 44, 'forty_four': 44, 'fortyfour': 44,
            'forty-five': 45, 'forty_five': 45, 'fortyfive': 45,
            'forty-six': 46, 'forty_six': 46, 'fortysix': 46,
            'forty-seven': 47, 'forty_seven': 47, 'fortyseven': 47,
            'forty-eight': 48, 'forty_eight': 48, 'fortyeight': 48,
            'forty-nine': 49, 'forty_nine': 49, 'fortynine': 49,
            'fifty-one': 51, 'fifty_one': 51, 'fiftyone': 51,
            'fifty-two': 52, 'fifty_two': 52, 'fiftytwo': 52,
            'fifty-three': 53, 'fifty_three': 53, 'fiftythree': 53,
            'fifty-four': 54, 'fifty_four': 54, 'fiftyfour': 54,
            'fifty-five': 55, 'fifty_five': 55, 'fiftyfive': 55,
            'fifty-six': 56, 'fifty_six': 56, 'fiftysix': 56,
            'fifty-seven': 57, 'fifty_seven': 57, 'fiftyseven': 57,
            'fifty-eight': 58, 'fifty_eight': 58, 'fiftyeight': 58,
            'fifty-nine': 59, 'fifty_nine': 59, 'fiftynine': 59,
            'sixty-one': 61, 'sixty_one': 61, 'sixtyone': 61,
            'sixty-two': 62, 'sixty_two': 62, 'sixtytwo': 62,
            'sixty-three': 63, 'sixty_three': 63, 'sixtythree': 63,
            'sixty-four': 64, 'sixty_four': 64, 'sixtyfour': 64,
            'sixty-five': 65, 'sixty_five': 65, 'sixtyfive': 65,
            'sixty-six': 66, 'sixty_six': 66, 'sixtysix': 66,
            'sixty-seven': 67, 'sixty_seven': 67, 'sixtyseven': 67,
            'sixty-eight': 68, 'sixty_eight': 68, 'sixtyeight': 68,
            'sixty-nine': 69, 'sixty_nine': 69, 'sixtynine': 69,
            'seventy-one': 71, 'seventy_one': 71, 'seventyone': 71,
            'seventy-two': 72, 'seventy_two': 72, 'seventytwo': 72,
            'seventy-three': 73, 'seventy_three': 73, 'seventythree': 73,
            'seventy-four': 74, 'seventy_four': 74, 'seventyfour': 74,
            'seventy-five': 75, 'seventy_five': 75, 'seventyfive': 75,
            'seventy-six': 76, 'seventy_six': 76, 'seventysix': 76,
            'seventy-seven': 77, 'seventy_seven': 77, 'seventyseven': 77,
            'seventy-eight': 78, 'seventy_eight': 78, 'seventyeight': 78,
            'seventy-nine': 79, 'seventy_nine': 79, 'seventynine': 79,
            'eighty-one': 81, 'eighty_one': 81, 'eightyone': 81,
            'eighty-two': 82, 'eighty_two': 82, 'eightytwo': 82,
            'eighty-three': 83, 'eighty_three': 83, 'eightythree': 83,
            'eighty-four': 84, 'eighty_four': 84, 'eightyfour': 84,
            'eighty-five': 85, 'eighty_five': 85, 'eightyfive': 85,
            'eighty-six': 86, 'eighty_six': 86, 'eightysix': 86,
            'eighty-seven': 87, 'eighty_seven': 87, 'eightyseven': 87,
            'eighty-eight': 88, 'eighty_eight': 88, 'eightyeight': 88,
            'eighty-nine': 89, 'eighty_nine': 89, 'eightynine': 89,
            'ninety-one': 91, 'ninety_one': 91, 'ninetyone': 91,
            'ninety-two': 92, 'ninety_two': 92, 'ninetytwo': 92,
            'ninety-three': 93, 'ninety_three': 93, 'ninetythree': 93,
            'ninety-four': 94, 'ninety_four': 94, 'ninetyfour': 94,
            'ninety-five': 95, 'ninety_five': 95, 'ninetyfive': 95,
            'ninety-six': 96, 'ninety_six': 96, 'ninetysix': 96,
            'ninety-seven': 97, 'ninety_seven': 97, 'ninetyseven': 97,
            'ninety-eight': 98, 'ninety_eight': 98, 'ninetyeight': 98,
            'ninety-nine': 99, 'ninety_nine': 99, 'ninetynine': 99
          };

          // Fix quoted numeric strings: "72" → 72
          const quotedNumberPattern = /:\s*"(\d+)"/g;
          if (quotedNumberPattern.test(repaired)) {
            repaired = repaired.replace(quotedNumberPattern, ': $1');
            console.log('  → Fixed quoted numbers (e.g., "72" → 72)');
          }

          // Match patterns like: "score": fifty or "score": "fifty" or "score":  fifty
          for (const [word, num] of Object.entries(numberWords)) {
            const patterns = [
              new RegExp(`:\\s*"${word}"`, 'gi'),  // "score": "fifty"
              new RegExp(`:\\s*${word}([,\\s}\\]])`, 'gi')  // "score": fifty, or fifty} or fifty]
            ];

            for (const pattern of patterns) {
              if (pattern.test(repaired)) {
                repaired = repaired.replace(pattern, (_match, suffix) => {
                  return suffix ? `: ${num}${suffix}` : `: ${num}`;
                });
                console.log(`  → Fixed text number: "${word}" → ${num}`);
              }
            }
          }

          // Try to fix truncated strings by closing them
          const stringPattern = /"([^"]*?)$/;
          if (stringPattern.test(repaired)) {
            repaired = repaired.replace(stringPattern, '"$1"');
            console.log('  → Fixed unclosed string at end');
          }

          // Try to close unclosed arrays
          const openBrackets = (repaired.match(/\[/g) || []).length;
          const closeBrackets = (repaired.match(/\]/g) || []).length;
          if (openBrackets > closeBrackets) {
            repaired += ']'.repeat(openBrackets - closeBrackets);
            console.log(`  → Added ${openBrackets - closeBrackets} closing brackets`);
          }

          // Try to close unclosed objects
          const openBraces = (repaired.match(/\{/g) || []).length;
          const closeBraces = (repaired.match(/\}/g) || []).length;
          if (openBraces > closeBraces) {
            repaired += '}'.repeat(openBraces - closeBraces);
            console.log(`  → Added ${openBraces - closeBraces} closing braces`);
          }

          try {
            const parsed = JSON.parse(repaired);
            console.log('✅ Successfully repaired JSON!');
            return parsed;
          } catch (thirdError) {
            // Rule-based repair failed - try AI recovery if enabled
            const enableAIRecovery = process.env.ENABLE_AI_JSON_RECOVERY === 'true';

            if (enableAIRecovery) {
              console.log('⚠️  Rule-based JSON repair failed, trying AI recovery...');
              const aiRecovered = await recoverJSONWithAI(extractedJson, options.expectedSchema, thirdError.message);

              if (aiRecovered) {
                return aiRecovered;
              }

              console.log('❌ AI recovery also failed, giving up.');
            }

            // Still failed - log full response for debugging
            console.error('❌ JSON repair failed. Response length:', extractedJson.length);
            console.error('First 500 chars:');
            console.error(extractedJson.substring(0, 500));
            console.error('\nLast 500 chars:');
            console.error(extractedJson.substring(extractedJson.length - 500));
            throw new Error(`${thirdError.message} | Response length: ${extractedJson.length}`);
          }
        }
      }

      // If extraction failed - try AI recovery if enabled
      const enableAIRecovery = process.env.ENABLE_AI_JSON_RECOVERY === 'true';

      if (enableAIRecovery) {
        console.log('⚠️  JSON extraction failed, trying AI recovery...');
        const contentStr = typeof content === 'string' ? content :
                          typeof content === 'object' ? JSON.stringify(content) :
                          String(content);

        const aiRecovered = await recoverJSONWithAI(contentStr, options.expectedSchema, firstError.message);

        if (aiRecovered) {
          return aiRecovered;
        }

        console.log('❌ AI recovery also failed, giving up.');
      }

      throw firstError;
    }
  } catch (error) {
    // Get string representation for preview
    const contentStr = content ?
                       (typeof content === 'string' ? content :
                        typeof content === 'object' ? JSON.stringify(content) :
                        String(content)) :
                       null;
    const preview = contentStr ? contentStr.substring(0, 200) : '[null or empty response]';
    console.error('Failed to parse JSON response:', preview);
    throw new Error(`Invalid JSON response: ${error.message}`);
  }
}

export { compressImageIfNeeded };

export default {
  callAI,
  parseJSONResponse,
  compressImageIfNeeded
};


