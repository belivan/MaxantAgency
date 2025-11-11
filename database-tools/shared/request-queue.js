/**
 * Global Request Queue Manager (Simplified with p-limit)
 *
 * Enforces global concurrency limits across all AI API calls within a single engine process.
 * Uses p-limit for queue management + token reservation for rate limit safety.
 *
 * Architecture:
 * - Layer 1: Per-engine global queue (THIS FILE, p-limit(10))
 *   - Limits to 10 concurrent AI calls per engine process
 *   - Token reservation prevents race conditions
 *   - 150ms minimum delay spreads traffic
 * - Layer 2: Cross-engine coordination (distributed-rate-limiter.js, Redis)
 *   - Coordinates quota across all microservices
 *   - Prevents different engines from competing
 *
 * Usage:
 *   import { enqueueAIRequest } from './request-queue.js';
 *
 *   const result = await enqueueAIRequest(
 *     'openai',
 *     'gpt-5-nano',
 *     5000, // estimated tokens
 *     async () => {
 *       // Your AI API call here
 *       return await callOpenAI(...);
 *     }
 *   );
 */

import pLimit from 'p-limit';
import { getRateLimitTracker } from './rate-limit-tracker.js';
import { getDistributedRateLimiter } from './distributed-rate-limiter.js';

// Configuration
const MAX_CONCURRENT_AI_CALLS = parseInt(process.env.MAX_CONCURRENT_AI_CALLS || '10');
const MIN_DELAY_BETWEEN_CALLS_MS = parseInt(process.env.MIN_DELAY_BETWEEN_AI_CALLS_MS || '150');

// Global concurrency limiter (shared across entire process)
const globalLimit = pLimit(MAX_CONCURRENT_AI_CALLS);

// Rate limit trackers
const rateLimitTracker = getRateLimitTracker(); // Local (per-process)
const distributedLimiter = getDistributedRateLimiter(); // Global (cross-engine via Redis)

// Stats (simple counters)
const stats = {
  totalProcessed: 0,
  totalFailed: 0,
  totalWaitTime: 0,
  maxPending: 0
};

console.log(`[Request Queue] Initialized with maxConcurrent=${MAX_CONCURRENT_AI_CALLS}, minDelay=${MIN_DELAY_BETWEEN_CALLS_MS}ms`);

/**
 * Enqueue an AI request with rate limit checking and token reservation
 *
 * @param {string} provider - AI provider (openai, anthropic, xai)
 * @param {string} model - Model name (gpt-5-nano, claude-4-5-haiku, etc.)
 * @param {number} estimatedTokens - Estimated total tokens (input + output)
 * @param {Function} requestFn - Async function that makes the AI API call
 * @returns {Promise<any>} Result from requestFn
 */
export async function enqueueAIRequest(provider, model, estimatedTokens, requestFn) {
  const startTime = Date.now();

  // Track max pending
  stats.maxPending = Math.max(stats.maxPending, globalLimit.pendingCount + globalLimit.activeCount);

  // Warn if queue is getting long
  if (globalLimit.pendingCount > 20) {
    console.warn(`[Request Queue] ${globalLimit.pendingCount} requests pending, ${globalLimit.activeCount} active`);
  }

  return globalLimit(async () => {
    // Track wait time
    const waitTime = Date.now() - startTime;
    stats.totalWaitTime += waitTime;

    if (waitTime > 5000) {
      console.warn(`[Request Queue] Request waited ${Math.round(waitTime / 1000)}s in queue`);
    }

    // Split tokens into input/output (rough estimate)
    const inputTokens = Math.floor(estimatedTokens * 0.6);
    const outputTokens = Math.floor(estimatedTokens * 0.4);

    // Layer 1: Check distributed rate limits (cross-engine coordination)
    const distributedCheck = await distributedLimiter.checkLimit(provider, model, inputTokens, outputTokens);

    if (!distributedCheck.allowed) {
      // Global rate limit exceeded - wait and retry once
      const waitTimeMs = (distributedCheck.waitTime || 1) * 1000;
      console.warn(`[Request Queue] Distributed rate limit exceeded for ${provider}:${model}: ${distributedCheck.reason}, waiting ${distributedCheck.waitTime}s`);
      await new Promise(resolve => setTimeout(resolve, waitTimeMs));

      // Re-check after waiting
      const recheckResult = await distributedLimiter.checkLimit(provider, model, inputTokens, outputTokens);
      if (!recheckResult.allowed) {
        throw new Error(`Distributed rate limit exceeded for ${provider}:${model} (waited ${distributedCheck.waitTime}s but still limited)`);
      }
    }

    // Layer 2: Check local rate limits (per-process tracking)
    const rateLimitCheck = rateLimitTracker.checkLimit(provider, model, inputTokens, outputTokens);

    if (!rateLimitCheck.allowed) {
      // Local rate limit exceeded - wait and retry once
      const waitTimeMs = (rateLimitCheck.waitTime || 1) * 1000;
      console.warn(`[Request Queue] Local rate limit check failed for ${provider}:${model}, waiting ${rateLimitCheck.waitTime}s`);
      await new Promise(resolve => setTimeout(resolve, waitTimeMs));

      // Re-check after waiting
      const recheckResult = rateLimitTracker.checkLimit(provider, model, inputTokens, outputTokens);
      if (!recheckResult.allowed) {
        throw new Error(`Local rate limit exceeded for ${provider}:${model} (waited ${rateLimitCheck.waitTime}s but still limited)`);
      }
    }

    // Reserve tokens to prevent race conditions
    let reservationId = null;
    try {
      reservationId = rateLimitTracker.reserveTokens(provider, model, inputTokens, outputTokens);
    } catch (error) {
      console.error(`[Request Queue] Token reservation failed: ${error.message}`);
    }

    let actualInputTokens = inputTokens;
    let actualOutputTokens = outputTokens;

    try {
      // Execute the actual AI API call
      const result = await requestFn();

      // Extract actual token usage if available in response
      if (result && typeof result === 'object') {
        if (result.usage) {
          actualInputTokens = result.usage.prompt_tokens || result.usage.input_tokens || inputTokens;
          actualOutputTokens = result.usage.completion_tokens || result.usage.output_tokens || outputTokens;
        }
      }

      // Success - update distributed limiter with actual usage
      try {
        await distributedLimiter.recordUsage(provider, model, actualInputTokens, actualOutputTokens);
      } catch (error) {
        console.error(`[Request Queue] Failed to record distributed usage: ${error.message}`);
        // Don't throw - usage recording shouldn't block success
      }

      stats.totalProcessed++;
      return result;

    } catch (error) {
      // Failure
      stats.totalFailed++;
      console.error(`[Request Queue] Request failed for ${provider}:${model}: ${error.message}`);
      throw error;

    } finally {
      // Release local reservation
      if (reservationId) {
        try {
          rateLimitTracker.releaseReservation(provider, model, reservationId);
        } catch (error) {
          console.error(`[Request Queue] Failed to release local reservation: ${error.message}`);
        }
      }

      // Enforce minimum delay between requests
      if (MIN_DELAY_BETWEEN_CALLS_MS > 0) {
        await new Promise(resolve => setTimeout(resolve, MIN_DELAY_BETWEEN_CALLS_MS));
      }
    }
  });
}

/**
 * Get current queue statistics
 *
 * @returns {object} Queue stats
 */
export function getQueueStats() {
  return {
    ...stats,
    pendingCount: globalLimit.pendingCount,
    activeCount: globalLimit.activeCount,
    maxConcurrent: MAX_CONCURRENT_AI_CALLS,
    avgWaitTimeMs: stats.totalProcessed > 0
      ? Math.round(stats.totalWaitTime / stats.totalProcessed)
      : 0,
    successRate: (stats.totalProcessed + stats.totalFailed) > 0
      ? Math.round((stats.totalProcessed / (stats.totalProcessed + stats.totalFailed)) * 100)
      : 100
  };
}

/**
 * Clear all pending requests (emergency stop)
 */
export function clearQueue() {
  console.warn(`[Request Queue] Clearing ${globalLimit.pendingCount} pending requests`);
  globalLimit.clearQueue();
}
