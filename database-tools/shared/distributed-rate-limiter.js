/**
 * Distributed Rate Limiter (Redis-backed)
 *
 * Coordinates rate limits across multiple engine processes using Redis.
 * Provides system-wide token bucket management for AI API rate limits.
 *
 * Architecture:
 * - Each provider:model has Redis keys for TPM/RPM tracking
 * - Token buckets refill continuously based on capacity
 * - Atomic operations via Lua scripts
 * - Falls back gracefully if Redis unavailable
 *
 * Usage:
 *   import { getDistributedRateLimiter } from './distributed-rate-limiter.js';
 *
 *   const limiter = getDistributedRateLimiter();
 *   const canProceed = await limiter.checkLimit('openai', 'gpt-5', 5000, 2000);
 *   if (canProceed.allowed) {
 *     // Make API call
 *     await limiter.recordUsage('openai', 'gpt-5', 4800, 1900);
 *   }
 */

import Redis from 'ioredis';

// Rate limit capacities (per minute)
const RATE_LIMITS = {
  openai: {
    'gpt-5': { tpm: 500000, rpm: 1000 },
    'gpt-5-mini': { tpm: 500000, rpm: 1000 },
    'gpt-4o': { tpm: 500000, rpm: 1000 },
    'gpt-4o-mini': { tpm: 500000, rpm: 1000 },
  },
  anthropic: {
    'claude-sonnet-4-5': { itpm: 200000, otpm: 100000, rpm: 1000 },
    'claude-4-5-haiku': { itpm: 200000, otpm: 100000, rpm: 1000 },
  },
  xai: {
    'grok-4': { tpm: 500000, rpm: 1000 },
    'grok-4-fast': { tpm: 500000, rpm: 1000 },
  }
};

// Safety margin: only use 90% of capacity
const SAFETY_MARGIN = 0.9;

// Singleton instance
let instance = null;

/**
 * Distributed Rate Limiter Class
 */
class DistributedRateLimiter {
  constructor() {
    this.redis = null;
    this.connected = false;
    this.enabled = process.env.USE_DISTRIBUTED_RATE_LIMITING !== 'false';
    this.fallbackToLocal = process.env.FALLBACK_TO_LOCAL_LIMITING !== 'false';

    if (this.enabled) {
      this.initRedis();
    } else {
      console.log('[Distributed Rate Limiter] Disabled via USE_DISTRIBUTED_RATE_LIMITING=false');
    }
  }

  /**
   * Initialize Redis connection
   */
  initRedis() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    try {
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        enableOfflineQueue: false,
        lazyConnect: true,
      });

      this.redis.on('connect', () => {
        this.connected = true;
        console.log('[Distributed Rate Limiter] Connected to Redis:', redisUrl);
      });

      this.redis.on('error', (error) => {
        this.connected = false;
        if (this.fallbackToLocal) {
          console.warn('[Distributed Rate Limiter] Redis error (falling back to local):', error.message);
        } else {
          console.error('[Distributed Rate Limiter] Redis error:', error.message);
        }
      });

      this.redis.on('close', () => {
        this.connected = false;
        console.warn('[Distributed Rate Limiter] Redis connection closed');
      });

      // Connect asynchronously
      this.redis.connect().catch(error => {
        console.error('[Distributed Rate Limiter] Failed to connect to Redis:', error.message);
        if (!this.fallbackToLocal) {
          throw error;
        }
      });

    } catch (error) {
      console.error('[Distributed Rate Limiter] Redis initialization failed:', error.message);
      if (!this.fallbackToLocal) {
        throw error;
      }
    }
  }

  /**
   * Get Redis key for a specific limit type
   */
  getKey(provider, model, limitType) {
    return `rate-limit:${provider}:${model}:${limitType}`;
  }

  /**
   * Get rate limit capacity for provider/model
   */
  getLimits(provider, model) {
    const limits = RATE_LIMITS[provider]?.[model];
    if (!limits) {
      console.warn(`[Distributed Rate Limiter] No limits defined for ${provider}:${model}`);
      return null;
    }

    // Apply safety margin
    const adjusted = {};
    for (const [key, value] of Object.entries(limits)) {
      adjusted[key] = Math.floor(value * SAFETY_MARGIN);
    }
    return adjusted;
  }

  /**
   * Check if request is within rate limits (distributed check)
   *
   * @param {string} provider - AI provider (openai, anthropic, xai)
   * @param {string} model - Model name
   * @param {number} inputTokens - Estimated input tokens
   * @param {number} outputTokens - Estimated output tokens
   * @returns {Promise<{allowed: boolean, reason?: string, waitTime?: number}>}
   */
  async checkLimit(provider, model, inputTokens, outputTokens) {
    // If not enabled or not connected, allow (fallback to local limiter)
    if (!this.enabled || !this.connected) {
      return { allowed: true };
    }

    const limits = this.getLimits(provider, model);
    if (!limits) {
      return { allowed: true }; // Unknown model, allow
    }

    try {
      // Check token limits
      if (provider === 'anthropic') {
        // Anthropic uses separate input/output TPM
        const [itpmUsed, otpmUsed, rpmUsed] = await Promise.all([
          this.getUsage(provider, model, 'itpm'),
          this.getUsage(provider, model, 'otpm'),
          this.getUsage(provider, model, 'rpm')
        ]);

        const itpmAvailable = limits.itpm - itpmUsed;
        const otpmAvailable = limits.otpm - otpmUsed;
        const rpmAvailable = limits.rpm - rpmUsed;

        if (inputTokens > itpmAvailable) {
          const waitTime = this.calculateWaitTime(itpmUsed, limits.itpm);
          return {
            allowed: false,
            reason: `Input TPM limit exceeded (${itpmUsed}/${limits.itpm})`,
            waitTime
          };
        }

        if (outputTokens > otpmAvailable) {
          const waitTime = this.calculateWaitTime(otpmUsed, limits.otpm);
          return {
            allowed: false,
            reason: `Output TPM limit exceeded (${otpmUsed}/${limits.otpm})`,
            waitTime
          };
        }

        if (rpmUsed >= rpmAvailable) {
          return {
            allowed: false,
            reason: `RPM limit exceeded (${rpmUsed}/${limits.rpm})`,
            waitTime: 60
          };
        }

      } else {
        // OpenAI/xAI use combined TPM
        const totalTokens = inputTokens + outputTokens;
        const [tpmUsed, rpmUsed] = await Promise.all([
          this.getUsage(provider, model, 'tpm'),
          this.getUsage(provider, model, 'rpm')
        ]);

        const tpmAvailable = limits.tpm - tpmUsed;
        const rpmAvailable = limits.rpm - rpmUsed;

        if (totalTokens > tpmAvailable) {
          const waitTime = this.calculateWaitTime(tpmUsed, limits.tpm);
          return {
            allowed: false,
            reason: `TPM limit exceeded (${tpmUsed}/${limits.tpm})`,
            waitTime
          };
        }

        if (rpmUsed >= rpmAvailable) {
          return {
            allowed: false,
            reason: `RPM limit exceeded (${rpmUsed}/${limits.rpm})`,
            waitTime: 60
          };
        }
      }

      return { allowed: true };

    } catch (error) {
      console.error('[Distributed Rate Limiter] Check failed:', error.message);
      if (this.fallbackToLocal) {
        return { allowed: true }; // Fallback: allow and rely on local limiter
      }
      throw error;
    }
  }

  /**
   * Record actual token usage after API call completes
   *
   * @param {string} provider - AI provider
   * @param {string} model - Model name
   * @param {number} inputTokens - Actual input tokens used
   * @param {number} outputTokens - Actual output tokens used
   */
  async recordUsage(provider, model, inputTokens, outputTokens) {
    if (!this.enabled || !this.connected) {
      return; // No-op if not enabled
    }

    try {
      if (provider === 'anthropic') {
        // Increment input/output TPM and RPM
        await Promise.all([
          this.incrementUsage(provider, model, 'itpm', inputTokens),
          this.incrementUsage(provider, model, 'otpm', outputTokens),
          this.incrementUsage(provider, model, 'rpm', 1)
        ]);
      } else {
        // Increment combined TPM and RPM
        const totalTokens = inputTokens + outputTokens;
        await Promise.all([
          this.incrementUsage(provider, model, 'tpm', totalTokens),
          this.incrementUsage(provider, model, 'rpm', 1)
        ]);
      }
    } catch (error) {
      console.error('[Distributed Rate Limiter] Record usage failed:', error.message);
      // Don't throw - usage tracking failure shouldn't block API calls
    }
  }

  /**
   * Get current usage for a specific limit type
   */
  async getUsage(provider, model, limitType) {
    const key = this.getKey(provider, model, limitType);
    try {
      const value = await this.redis.get(key);
      return value ? parseInt(value, 10) : 0;
    } catch (error) {
      console.error('[Distributed Rate Limiter] Get usage failed:', error.message);
      return 0;
    }
  }

  /**
   * Increment usage for a specific limit type
   */
  async incrementUsage(provider, model, limitType, amount) {
    const key = this.getKey(provider, model, limitType);
    const ttl = 60; // 60 second window for per-minute limits

    try {
      // Use Lua script for atomic increment with TTL
      const result = await this.redis.eval(
        `
        local current = redis.call('GET', KEYS[1])
        if current == false then
          redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[2])
          return tonumber(ARGV[1])
        else
          return redis.call('INCRBY', KEYS[1], ARGV[1])
        end
        `,
        1,
        key,
        amount,
        ttl
      );

      return result;
    } catch (error) {
      console.error('[Distributed Rate Limiter] Increment failed:', error.message);
      throw error;
    }
  }

  /**
   * Calculate how long to wait before retrying
   */
  calculateWaitTime(currentUsage, capacity) {
    // Estimate wait time based on usage percentage
    const usagePercent = currentUsage / capacity;

    if (usagePercent >= 1.0) {
      return 60; // Full minute if completely exhausted
    } else if (usagePercent >= 0.9) {
      return 30; // Half minute if nearly full
    } else if (usagePercent >= 0.8) {
      return 15; // Quarter minute if getting high
    } else {
      return 5; // Short wait for edge cases
    }
  }

  /**
   * Get status for all tracked providers/models
   */
  async getStatus() {
    if (!this.enabled || !this.connected) {
      return {
        enabled: this.enabled,
        connected: this.connected,
        providers: {}
      };
    }

    try {
      const status = {
        enabled: true,
        connected: true,
        providers: {}
      };

      for (const [provider, models] of Object.entries(RATE_LIMITS)) {
        status.providers[provider] = {};

        for (const [model, limits] of Object.entries(models)) {
          const usage = {};

          if (provider === 'anthropic') {
            const [itpm, otpm, rpm] = await Promise.all([
              this.getUsage(provider, model, 'itpm'),
              this.getUsage(provider, model, 'otpm'),
              this.getUsage(provider, model, 'rpm')
            ]);

            usage.itpm = {
              used: itpm,
              capacity: limits.itpm,
              available: limits.itpm - itpm,
              percentage: Math.round((itpm / limits.itpm) * 100)
            };

            usage.otpm = {
              used: otpm,
              capacity: limits.otpm,
              available: limits.otpm - otpm,
              percentage: Math.round((otpm / limits.otpm) * 100)
            };

            usage.rpm = {
              used: rpm,
              capacity: limits.rpm,
              available: limits.rpm - rpm,
              percentage: Math.round((rpm / limits.rpm) * 100)
            };

          } else {
            const [tpm, rpm] = await Promise.all([
              this.getUsage(provider, model, 'tpm'),
              this.getUsage(provider, model, 'rpm')
            ]);

            usage.tpm = {
              used: tpm,
              capacity: limits.tpm,
              available: limits.tpm - tpm,
              percentage: Math.round((tpm / limits.tpm) * 100)
            };

            usage.rpm = {
              used: rpm,
              capacity: limits.rpm,
              available: limits.rpm - rpm,
              percentage: Math.round((rpm / limits.rpm) * 100)
            };
          }

          status.providers[provider][model] = usage;
        }
      }

      return status;

    } catch (error) {
      console.error('[Distributed Rate Limiter] Get status failed:', error.message);
      throw error;
    }
  }

  /**
   * Clear all rate limit data (for testing/debugging)
   */
  async clearAll() {
    if (!this.enabled || !this.connected) {
      return;
    }

    try {
      const keys = await this.redis.keys('rate-limit:*');
      if (keys.length > 0) {
        await this.redis.del(...keys);
        console.log(`[Distributed Rate Limiter] Cleared ${keys.length} rate limit keys`);
      }
    } catch (error) {
      console.error('[Distributed Rate Limiter] Clear all failed:', error.message);
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect() {
    if (this.redis) {
      await this.redis.quit();
      this.connected = false;
      console.log('[Distributed Rate Limiter] Disconnected from Redis');
    }
  }
}

/**
 * Get singleton instance
 */
export function getDistributedRateLimiter() {
  if (!instance) {
    instance = new DistributedRateLimiter();
  }
  return instance;
}
