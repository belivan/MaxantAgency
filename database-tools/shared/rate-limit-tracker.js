/**
 * Rate Limit Tracker - Intelligent rate limit management for AI providers
 *
 * Features:
 * - Token bucket algorithm for real-time usage tracking
 * - Per-provider and per-model rate limits based on November 2025 data
 * - Proactive throttling before hitting limits
 * - Automatic tier detection from environment
 * - Thread-safe tracking with mutex-like behavior
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../../.env') });

/**
 * Rate limit definitions by provider and model
 * Based on November 2025 rate limits research
 */
const RATE_LIMITS = {
  openai: {
    'gpt-5': {
      tier1: { tpm: 500000, rpm: 1000 },
      tier2: { tpm: 1000000, rpm: 2000 },
      tier3: { tpm: 2000000, rpm: 4000 },
      tier4: { tpm: 4000000, rpm: 8000 }
    },
    'gpt-5-mini': {
      tier1: { tpm: 500000, rpm: 1000 },
      tier2: { tpm: 1000000, rpm: 2000 }
    },
    'gpt-5-nano': {
      tier1: { tpm: 500000, rpm: 1000 },
      tier2: { tpm: 1000000, rpm: 2000 }
    },
    'gpt-4o': {
      tier1: { tpm: 500000, rpm: 1000 },
      tier2: { tpm: 1000000, rpm: 2000 }
    }
  },
  anthropic: {
    'claude-4-5-sonnet': {
      tier1: { itpm: 30000, otpm: 8000, rpm: 50 },
      tier2: { itpm: 450000, otpm: 90000, rpm: 100 },
      tier3: { itpm: 800000, otpm: 160000, rpm: 200 },
      tier4: { itpm: 2000000, otpm: 400000, rpm: 400 }
    },
    'claude-sonnet-4-5': {
      tier1: { itpm: 30000, otpm: 8000, rpm: 50 },
      tier2: { itpm: 450000, otpm: 90000, rpm: 100 },
      tier3: { itpm: 800000, otpm: 160000, rpm: 200 },
      tier4: { itpm: 2000000, otpm: 400000, rpm: 400 }
    },
    'claude-4-5-haiku': {
      tier1: { itpm: 50000, otpm: 10000, rpm: 50 },
      tier2: { itpm: 450000, otpm: 90000, rpm: 100 }
    },
    'claude-haiku-4-5': {
      tier1: { itpm: 50000, otpm: 10000, rpm: 50 },
      tier2: { itpm: 450000, otpm: 90000, rpm: 100 }
    }
  },
  grok: {
    'grok-4': {
      default: { tpm: 2000000, rpm: 480 }
    },
    'grok-4-fast': {
      default: { tpm: 4000000, rpm: 480 }
    },
    'grok-4-fast-reasoning': {
      default: { tpm: 4000000, rpm: 480 }
    }
  }
};

/**
 * Safety margin - use only 90% of limits to provide buffer
 */
const SAFETY_MARGIN = 0.9;

/**
 * Token bucket for tracking usage over time
 */
class TokenBucket {
  constructor(capacity, refillRate) {
    this.capacity = capacity;
    this.refillRate = refillRate; // tokens per minute
    this.tokens = capacity; // start full
    this.lastRefill = Date.now();
  }

  /**
   * Refill tokens based on time elapsed
   */
  refill() {
    const now = Date.now();
    const elapsedMs = now - this.lastRefill;
    const elapsedMinutes = elapsedMs / 60000;

    // Calculate tokens to add (continuous refill)
    const tokensToAdd = elapsedMinutes * this.refillRate;

    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * Check if we have enough tokens available
   */
  hasCapacity(tokensNeeded) {
    this.refill();
    return this.tokens >= tokensNeeded;
  }

  /**
   * Consume tokens from bucket
   */
  consume(tokensUsed) {
    this.refill();
    if (this.tokens >= tokensUsed) {
      this.tokens -= tokensUsed;
      return true;
    }
    return false;
  }

  /**
   * Get current token count
   */
  getAvailable() {
    this.refill();
    return this.tokens;
  }

  /**
   * Get time until full capacity (in seconds)
   */
  getTimeUntilFull() {
    this.refill();
    const tokensNeeded = this.capacity - this.tokens;
    if (tokensNeeded <= 0) return 0;

    const minutesNeeded = tokensNeeded / this.refillRate;
    return Math.ceil(minutesNeeded * 60);
  }
}

/**
 * Request counter for RPM tracking (sliding window)
 */
class RequestCounter {
  constructor(rpm) {
    this.rpm = rpm;
    this.requests = []; // timestamps of requests in last minute
  }

  /**
   * Remove old requests outside 1-minute window
   */
  cleanup() {
    const oneMinuteAgo = Date.now() - 60000;
    this.requests = this.requests.filter(ts => ts > oneMinuteAgo);
  }

  /**
   * Check if we can make another request
   */
  canMakeRequest() {
    this.cleanup();
    return this.requests.length < this.rpm;
  }

  /**
   * Record a new request
   */
  recordRequest() {
    this.cleanup();
    if (this.requests.length < this.rpm) {
      this.requests.push(Date.now());
      return true;
    }
    return false;
  }

  /**
   * Get current request count
   */
  getCurrentCount() {
    this.cleanup();
    return this.requests.length;
  }

  /**
   * Get time until next request slot available (in seconds)
   */
  getTimeUntilAvailable() {
    this.cleanup();
    if (this.requests.length < this.rpm) return 0;

    const oldestRequest = Math.min(...this.requests);
    const timeUntilExpiry = 60000 - (Date.now() - oldestRequest);
    return Math.ceil(timeUntilExpiry / 1000);
  }
}

/**
 * Rate Limit Tracker - Main class
 */
class RateLimitTracker {
  constructor() {
    this.buckets = new Map(); // model -> { tpm: TokenBucket, itpm: TokenBucket, otpm: TokenBucket, rpm: RequestCounter }
    this.actualLimits = new Map(); // Store actual limits from API headers
    this.enabled = process.env.ENABLE_RATE_LIMIT_TRACKING !== 'false';

    console.log(`[Rate Limit Tracker] Initialized (enabled: ${this.enabled})`);
  }

  /**
   * Get tier for a provider from environment
   */
  getTier(provider) {
    const tierMap = {
      openai: process.env.OPENAI_TIER || '1',
      anthropic: process.env.ANTHROPIC_TIER || '1',
      grok: process.env.XAI_TIER || 'default'
    };

    const tier = tierMap[provider];
    return tier === 'default' ? 'default' : `tier${tier}`;
  }

  /**
   * Get rate limits for a specific model
   */
  getLimits(provider, model) {
    // Check if we have actual limits from API headers
    const actualKey = `${provider}:${model}`;
    if (this.actualLimits.has(actualKey)) {
      return this.actualLimits.get(actualKey);
    }

    // Fall back to configured limits
    const providerLimits = RATE_LIMITS[provider];
    if (!providerLimits) {
      console.warn(`[Rate Limit Tracker] Unknown provider: ${provider}`);
      return null;
    }

    const modelLimits = providerLimits[model];
    if (!modelLimits) {
      console.warn(`[Rate Limit Tracker] Unknown model: ${model} for provider ${provider}`);
      return null;
    }

    const tier = this.getTier(provider);
    const limits = modelLimits[tier];

    if (!limits) {
      console.warn(`[Rate Limit Tracker] No limits defined for ${provider}/${model}/${tier}`);
      return null;
    }

    // Apply safety margin
    const safeLimits = {};
    if (limits.tpm) safeLimits.tpm = Math.floor(limits.tpm * SAFETY_MARGIN);
    if (limits.itpm) safeLimits.itpm = Math.floor(limits.itpm * SAFETY_MARGIN);
    if (limits.otpm) safeLimits.otpm = Math.floor(limits.otpm * SAFETY_MARGIN);
    if (limits.rpm) safeLimits.rpm = Math.floor(limits.rpm * SAFETY_MARGIN);

    return safeLimits;
  }

  /**
   * Initialize buckets for a model
   */
  initializeBuckets(provider, model) {
    const key = `${provider}:${model}`;
    if (this.buckets.has(key)) return;

    const limits = this.getLimits(provider, model);
    if (!limits) return;

    const buckets = {};

    // Create token buckets based on provider type
    if (limits.tpm) {
      // OpenAI/Grok: combined token limit
      buckets.tpm = new TokenBucket(limits.tpm, limits.tpm);
    }

    if (limits.itpm) {
      // Anthropic: separate input token limit
      buckets.itpm = new TokenBucket(limits.itpm, limits.itpm);
    }

    if (limits.otpm) {
      // Anthropic: separate output token limit
      buckets.otpm = new TokenBucket(limits.otpm, limits.otpm);
    }

    if (limits.rpm) {
      // Request per minute counter
      buckets.rpm = new RequestCounter(limits.rpm);
    }

    this.buckets.set(key, buckets);
    console.log(`[Rate Limit Tracker] Initialized buckets for ${key}:`, limits);
  }

  /**
   * Check if a request would exceed rate limits
   *
   * @param {string} provider - Provider name (openai, anthropic, grok)
   * @param {string} model - Model ID
   * @param {number} estimatedInputTokens - Estimated input tokens
   * @param {number} estimatedOutputTokens - Estimated output tokens
   * @returns {object} { allowed: boolean, reason: string, waitTime: number }
   */
  checkLimit(provider, model, estimatedInputTokens = 1000, estimatedOutputTokens = 1000) {
    if (!this.enabled) {
      return { allowed: true, reason: 'tracking disabled', waitTime: 0 };
    }

    this.initializeBuckets(provider, model);
    const key = `${provider}:${model}`;
    const buckets = this.buckets.get(key);

    if (!buckets) {
      return { allowed: true, reason: 'no limits configured', waitTime: 0 };
    }

    // Check RPM first (fastest check)
    if (buckets.rpm && !buckets.rpm.canMakeRequest()) {
      const waitTime = buckets.rpm.getTimeUntilAvailable();
      return {
        allowed: false,
        reason: 'rpm_exceeded',
        waitTime,
        current: buckets.rpm.getCurrentCount(),
        limit: buckets.rpm.rpm
      };
    }

    // Check token limits
    if (provider === 'anthropic') {
      // Separate input/output limits
      if (buckets.itpm && !buckets.itpm.hasCapacity(estimatedInputTokens)) {
        const waitTime = buckets.itpm.getTimeUntilFull();
        return {
          allowed: false,
          reason: 'input_tokens_exceeded',
          waitTime,
          current: Math.floor(buckets.itpm.capacity - buckets.itpm.getAvailable()),
          limit: buckets.itpm.capacity
        };
      }

      if (buckets.otpm && !buckets.otpm.hasCapacity(estimatedOutputTokens)) {
        const waitTime = buckets.otpm.getTimeUntilFull();
        return {
          allowed: false,
          reason: 'output_tokens_exceeded',
          waitTime,
          current: Math.floor(buckets.otpm.capacity - buckets.otpm.getAvailable()),
          limit: buckets.otpm.capacity
        };
      }
    } else {
      // Combined token limit (OpenAI/Grok)
      const totalTokens = estimatedInputTokens + estimatedOutputTokens;
      if (buckets.tpm && !buckets.tpm.hasCapacity(totalTokens)) {
        const waitTime = buckets.tpm.getTimeUntilFull();
        return {
          allowed: false,
          reason: 'tokens_exceeded',
          waitTime,
          current: Math.floor(buckets.tpm.capacity - buckets.tpm.getAvailable()),
          limit: buckets.tpm.capacity
        };
      }
    }

    return { allowed: true, reason: 'within_limits', waitTime: 0 };
  }

  /**
   * Record actual usage after a successful API call
   */
  recordUsage(provider, model, inputTokens, outputTokens) {
    if (!this.enabled) return;

    this.initializeBuckets(provider, model);
    const key = `${provider}:${model}`;
    const buckets = this.buckets.get(key);

    if (!buckets) return;

    // Record request
    if (buckets.rpm) {
      buckets.rpm.recordRequest();
    }

    // Consume tokens
    if (provider === 'anthropic') {
      if (buckets.itpm) buckets.itpm.consume(inputTokens);
      if (buckets.otpm) buckets.otpm.consume(outputTokens);
    } else {
      const totalTokens = inputTokens + outputTokens;
      if (buckets.tpm) buckets.tpm.consume(totalTokens);
    }

    // console.log(`[Rate Limit Tracker] Recorded usage for ${key}: ${inputTokens}/${outputTokens} tokens`);
  }

  /**
   * Update limits based on actual API response headers
   */
  updateFromHeaders(provider, model, headers) {
    const key = `${provider}:${model}`;
    const limits = {};

    if (provider === 'openai') {
      if (headers['x-ratelimit-limit-tokens']) {
        limits.tpm = parseInt(headers['x-ratelimit-limit-tokens']);
      }
      if (headers['x-ratelimit-limit-requests']) {
        limits.rpm = parseInt(headers['x-ratelimit-limit-requests']);
      }
    } else if (provider === 'anthropic') {
      // Parse Anthropic headers (if available)
      if (headers['anthropic-ratelimit-input-tokens-limit']) {
        limits.itpm = parseInt(headers['anthropic-ratelimit-input-tokens-limit']);
      }
      if (headers['anthropic-ratelimit-output-tokens-limit']) {
        limits.otpm = parseInt(headers['anthropic-ratelimit-output-tokens-limit']);
      }
      if (headers['anthropic-ratelimit-requests-limit']) {
        limits.rpm = parseInt(headers['anthropic-ratelimit-requests-limit']);
      }
    }

    if (Object.keys(limits).length > 0) {
      this.actualLimits.set(key, limits);
      console.log(`[Rate Limit Tracker] Updated limits from headers for ${key}:`, limits);

      // Reinitialize buckets with actual limits
      this.buckets.delete(key);
      this.initializeBuckets(provider, model);
    }
  }

  /**
   * Get current status for a model
   */
  getStatus(provider, model) {
    const key = `${provider}:${model}`;
    const buckets = this.buckets.get(key);

    if (!buckets) {
      return { initialized: false };
    }

    const status = { initialized: true };

    if (buckets.tpm) {
      status.tpm = {
        available: Math.floor(buckets.tpm.getAvailable()),
        capacity: buckets.tpm.capacity,
        percentage: Math.floor((buckets.tpm.getAvailable() / buckets.tpm.capacity) * 100)
      };
    }

    if (buckets.itpm) {
      status.itpm = {
        available: Math.floor(buckets.itpm.getAvailable()),
        capacity: buckets.itpm.capacity,
        percentage: Math.floor((buckets.itpm.getAvailable() / buckets.itpm.capacity) * 100)
      };
    }

    if (buckets.otpm) {
      status.otpm = {
        available: Math.floor(buckets.otpm.getAvailable()),
        capacity: buckets.otpm.capacity,
        percentage: Math.floor((buckets.otpm.getAvailable() / buckets.otpm.capacity) * 100)
      };
    }

    if (buckets.rpm) {
      status.rpm = {
        used: buckets.rpm.getCurrentCount(),
        limit: buckets.rpm.rpm,
        percentage: Math.floor((buckets.rpm.getCurrentCount() / buckets.rpm.rpm) * 100)
      };
    }

    return status;
  }

  /**
   * Reset all buckets (for testing or manual override)
   */
  reset() {
    this.buckets.clear();
    this.actualLimits.clear();
    console.log('[Rate Limit Tracker] Reset all buckets');
  }
}

// Singleton instance
let trackerInstance = null;

/**
 * Get the global rate limit tracker instance
 */
export function getRateLimitTracker() {
  if (!trackerInstance) {
    trackerInstance = new RateLimitTracker();
  }
  return trackerInstance;
}

export default {
  getRateLimitTracker,
  RATE_LIMITS
};
