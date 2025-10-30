/**
 * AI Response Cache
 * -----------------
 * Simple in-memory cache for AI responses to avoid repeated API calls.
 * Useful for development/testing to speed up iterations.
 * 
 * Enable with: ENABLE_AI_CACHE=true
 * Clear cache between runs with: CLEAR_AI_CACHE=true
 */

import crypto from 'crypto';

// In-memory cache storage
const cache = new Map();

// Cache statistics
const stats = {
  hits: 0,
  misses: 0,
  saves: 0,
  enabled: process.env.ENABLE_AI_CACHE === 'true'
};

/**
 * Generate a cache key from AI call parameters
 */
function generateCacheKey(model, systemPrompt, userPrompt, temperature, jsonMode) {
  // Create a hash of the inputs to use as cache key
  const content = JSON.stringify({
    model,
    systemPrompt: systemPrompt?.substring(0, 1000), // Truncate for performance
    userPrompt: userPrompt?.substring(0, 1000),
    temperature,
    jsonMode
  });
  
  return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
}

/**
 * Get cached AI response if it exists
 */
export function getCachedResponse(model, systemPrompt, userPrompt, temperature, jsonMode) {
  if (!stats.enabled) {
    return null;
  }

  const key = generateCacheKey(model, systemPrompt, userPrompt, temperature, jsonMode);
  const cached = cache.get(key);
  
  if (cached) {
    stats.hits++;
    console.log(`[AI Cache] ✓ Cache HIT (${stats.hits} hits, ${stats.misses} misses, ${getCacheHitRate()}% hit rate)`);
    return cached;
  }
  
  stats.misses++;
  return null;
}

/**
 * Save AI response to cache
 */
export function cacheResponse(model, systemPrompt, userPrompt, temperature, jsonMode, response) {
  if (!stats.enabled) {
    return;
  }

  const key = generateCacheKey(model, systemPrompt, userPrompt, temperature, jsonMode);
  cache.set(key, response);
  stats.saves++;
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    ...stats,
    size: cache.size,
    hitRate: getCacheHitRate()
  };
}

/**
 * Calculate cache hit rate percentage
 */
function getCacheHitRate() {
  const total = stats.hits + stats.misses;
  return total === 0 ? 0 : ((stats.hits / total) * 100).toFixed(1);
}

/**
 * Clear the cache (useful for testing)
 */
export function clearCache() {
  cache.clear();
  stats.hits = 0;
  stats.misses = 0;
  stats.saves = 0;
  console.log('[AI Cache] Cache cleared');
}

/**
 * Log cache statistics
 */
export function logCacheStats() {
  if (!stats.enabled) {
    console.log('[AI Cache] Cache is DISABLED (set ENABLE_AI_CACHE=true to enable)');
    return;
  }

  console.log('[AI Cache] Statistics:', {
    enabled: stats.enabled,
    size: cache.size,
    hits: stats.hits,
    misses: stats.misses,
    saves: stats.saves,
    hitRate: `${getCacheHitRate()}%`
  });
}

// Clear cache on startup if requested
if (process.env.CLEAR_AI_CACHE === 'true' && stats.enabled) {
  clearCache();
  console.log('[AI Cache] Cache cleared on startup (CLEAR_AI_CACHE=true)');
}

// Log cache status on import
if (stats.enabled) {
  console.log('[AI Cache] 🔥 Cache ENABLED - AI responses will be cached in memory');
} else {
  console.log('[AI Cache] Cache disabled (set ENABLE_AI_CACHE=true to enable)');
}
