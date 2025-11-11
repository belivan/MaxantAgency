/**
 * Universal Work Queue System
 *
 * Centralized queue for managing high-level work items across all engines.
 * Provides priority-based scheduling, per-type concurrency limits, cancellation,
 * and Redis-backed persistence for cross-engine coordination.
 *
 * Architecture:
 * - Work Types: analysis, outreach, report, prospecting
 * - Priority: Based on batch size (small batches = high priority)
 * - Concurrency: Per-type limits (e.g., 2 analyses, 2 outreach, 1 report)
 * - Storage: Redis for persistence, in-memory fallback
 * - Cancellation: Can cancel queued items (not running ones)
 *
 * Usage:
 *   import { enqueueWork, cancelWork, getQueueStatus } from './work-queue.js';
 *
 *   // Submit work
 *   const jobId = await enqueueWork('analysis', {
 *     prospect_id: '...',
 *     url: 'https://example.com',
 *     // ... data
 *   }, 30); // batch size for priority calculation
 *
 *   // Cancel queued work
 *   const cancelled = await cancelWork(jobId);
 *
 *   // Get queue status
 *   const status = await getQueueStatus();
 */

import pLimit from 'p-limit';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';

// Configuration
const WORK_TYPE_LIMITS = {
  analysis: parseInt(process.env.MAX_CONCURRENT_ANALYSES || '2'),
  outreach: parseInt(process.env.MAX_CONCURRENT_OUTREACH || '2'),
  report: parseInt(process.env.MAX_CONCURRENT_REPORTS || '1'),
  prospecting: parseInt(process.env.MAX_CONCURRENT_PROSPECTING || '1')
};

const USE_WORK_QUEUE = process.env.USE_WORK_QUEUE !== 'false';
const USE_REDIS = process.env.REDIS_URL && process.env.USE_WORK_QUEUE !== 'false';

// Priority thresholds based on batch size
const PRIORITY_THRESHOLDS = {
  high: 5,    // 1-5 items = Priority 1 (quick tests)
  medium: 20  // 6-20 items = Priority 2, 21+ = Priority 3 (large batches)
};

// Job states
const JobState = {
  QUEUED: 'queued',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

/**
 * Universal Work Queue Class
 */
class WorkQueue {
  constructor() {
    this.redis = null;
    this.connected = false;
    this.enabled = USE_WORK_QUEUE;

    // Per-type concurrency limiters
    this.limiters = {};
    for (const [type, limit] of Object.entries(WORK_TYPE_LIMITS)) {
      this.limiters[type] = pLimit(limit);
      console.log(`[Work Queue] ${type}: max ${limit} concurrent`);
    }

    // In-memory fallback storage
    this.jobs = new Map(); // jobId → job data
    this.queues = {}; // type → priority → [jobIds]
    for (const type of Object.keys(WORK_TYPE_LIMITS)) {
      this.queues[type] = { 1: [], 2: [], 3: [] };
    }

    // Stats
    this.stats = {
      totalQueued: 0,
      totalCompleted: 0,
      totalFailed: 0,
      totalCancelled: 0
    };

    if (USE_REDIS) {
      this.initRedis();
    } else {
      console.log('[Work Queue] Redis disabled, using in-memory queue');
    }

    console.log(`[Work Queue] Initialized (enabled: ${this.enabled})`);
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
        console.log('[Work Queue] Connected to Redis:', redisUrl);
      });

      this.redis.on('error', (error) => {
        this.connected = false;
        console.warn('[Work Queue] Redis error (falling back to in-memory):', error.message);
      });

      this.redis.on('close', () => {
        this.connected = false;
        console.warn('[Work Queue] Redis connection closed');
      });

      // Connect asynchronously
      this.redis.connect().catch(error => {
        console.error('[Work Queue] Failed to connect to Redis:', error.message);
      });

    } catch (error) {
      console.error('[Work Queue] Redis initialization failed:', error.message);
    }
  }

  /**
   * Calculate priority based on batch size
   */
  calculatePriority(batchSize) {
    if (batchSize <= PRIORITY_THRESHOLDS.high) return 1; // High priority
    if (batchSize <= PRIORITY_THRESHOLDS.medium) return 2; // Medium priority
    return 3; // Low priority
  }

  /**
   * Generate unique job ID
   */
  generateJobId() {
    return randomUUID();
  }

  /**
   * Enqueue work item
   *
   * @param {string} type - Work type (analysis, outreach, report, prospecting)
   * @param {object} data - Work data
   * @param {number} batchSize - Total items in batch (for priority calculation)
   * @param {function} executeFn - Async function to execute the work
   * @returns {Promise<string>} Job ID
   */
  async enqueueWork(type, data, batchSize = 1, executeFn) {
    if (!this.enabled) {
      throw new Error('Work queue is disabled');
    }

    if (!WORK_TYPE_LIMITS[type]) {
      throw new Error(`Unknown work type: ${type}`);
    }

    const jobId = this.generateJobId();
    const priority = this.calculatePriority(batchSize);

    const job = {
      id: jobId,
      type,
      data,
      batchSize,
      priority,
      state: JobState.QUEUED,
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
      error: null,
      result: null,
      executeFn // Store execution function
    };

    // Store job
    this.jobs.set(jobId, job);

    // Add to priority queue
    this.queues[type][priority].push(jobId);

    // Update stats
    this.stats.totalQueued++;

    // Persist to Redis if available
    if (this.connected) {
      try {
        await this.redis.set(`work-queue:job:${jobId}`, JSON.stringify({
          ...job,
          executeFn: undefined // Don't serialize function
        }), 'EX', 86400); // 24 hour expiry

        await this.redis.zadd(`work-queue:${type}:${priority}`, Date.now(), jobId);
      } catch (error) {
        console.error(`[Work Queue] Failed to persist job to Redis: ${error.message}`);
      }
    }

    console.log(`[Work Queue] Queued ${type} job ${jobId} (priority ${priority}, batch size ${batchSize})`);

    // Process queue
    this.processQueue(type);

    return jobId;
  }

  /**
   * Process queue for a specific work type
   */
  async processQueue(type) {
    const limiter = this.limiters[type];
    if (!limiter) return;

    // Get next job from highest priority queue
    let jobId = null;
    for (let priority = 1; priority <= 3; priority++) {
      const queue = this.queues[type][priority];
      if (queue.length > 0) {
        jobId = queue.shift();
        break;
      }
    }

    if (!jobId) return; // No jobs in queue

    const job = this.jobs.get(jobId);
    if (!job) return; // Job not found

    // IMPORTANT: Check if job was cancelled before executing
    if (job.state !== JobState.QUEUED) {
      console.log(`[Work Queue] Skipping job ${jobId} (state: ${job.state})`);
      // Process next job in queue
      this.processQueue(type);
      return;
    }

    // Execute with concurrency limit
    limiter(async () => {
      try {
        // Double-check state (race condition protection)
        if (job.state !== JobState.QUEUED) {
          console.log(`[Work Queue] Job ${jobId} was cancelled before execution`);
          return;
        }

        // Mark as running
        job.state = JobState.RUNNING;
        job.startedAt = Date.now();

        if (this.connected) {
          await this.redis.set(`work-queue:job:${jobId}`, JSON.stringify({
            ...job,
            executeFn: undefined
          }), 'EX', 86400);
        }

        console.log(`[Work Queue] Starting ${type} job ${jobId}`);

        // Execute work
        if (job.executeFn) {
          job.result = await job.executeFn(job.data);
        }

        // Mark as completed
        job.state = JobState.COMPLETED;
        job.completedAt = Date.now();
        this.stats.totalCompleted++;

        console.log(`[Work Queue] Completed ${type} job ${jobId} (${job.completedAt - job.startedAt}ms)`);

      } catch (error) {
        // Mark as failed
        job.state = JobState.FAILED;
        job.completedAt = Date.now();
        job.error = error.message;
        this.stats.totalFailed++;

        console.error(`[Work Queue] Failed ${type} job ${jobId}:`, error.message);

      } finally {
        // Persist final state
        if (this.connected) {
          try {
            await this.redis.set(`work-queue:job:${jobId}`, JSON.stringify({
              ...job,
              executeFn: undefined
            }), 'EX', 86400);

            // Remove from priority queue in Redis
            for (let p = 1; p <= 3; p++) {
              await this.redis.zrem(`work-queue:${type}:${p}`, jobId);
            }
          } catch (error) {
            console.error(`[Work Queue] Failed to update job state in Redis: ${error.message}`);
          }
        }

        // Process next job in queue
        this.processQueue(type);
      }
    });
  }

  /**
   * Cancel queued work (only if not running yet)
   *
   * @param {string} jobId - Job ID to cancel
   * @returns {Promise<boolean>} True if cancelled, false if already running/completed
   */
  async cancelWork(jobId) {
    const job = this.jobs.get(jobId);

    if (!job) {
      console.warn(`[Work Queue] Job ${jobId} not found`);
      return false;
    }

    if (job.state !== JobState.QUEUED) {
      console.warn(`[Work Queue] Cannot cancel job ${jobId} in state ${job.state}`);
      return false;
    }

    // Mark as cancelled
    job.state = JobState.CANCELLED;
    job.completedAt = Date.now();
    this.stats.totalCancelled++;

    // Remove from priority queues
    for (let priority = 1; priority <= 3; priority++) {
      const queue = this.queues[job.type][priority];
      const index = queue.indexOf(jobId);
      if (index !== -1) {
        queue.splice(index, 1);
      }
    }

    // Persist to Redis
    if (this.connected) {
      try {
        await this.redis.set(`work-queue:job:${jobId}`, JSON.stringify({
          ...job,
          executeFn: undefined
        }), 'EX', 86400);

        for (let p = 1; p <= 3; p++) {
          await this.redis.zrem(`work-queue:${job.type}:${p}`, jobId);
        }
      } catch (error) {
        console.error(`[Work Queue] Failed to persist cancellation to Redis: ${error.message}`);
      }
    }

    console.log(`[Work Queue] Cancelled ${job.type} job ${jobId}`);
    return true;
  }

  /**
   * Cancel all pending jobs of a specific type
   *
   * @param {string} type - Work type
   * @returns {Promise<number>} Number of jobs cancelled
   */
  async cancelAllPending(type) {
    if (!WORK_TYPE_LIMITS[type]) {
      throw new Error(`Unknown work type: ${type}`);
    }

    let cancelled = 0;

    // Cancel all queued jobs of this type
    for (const job of this.jobs.values()) {
      if (job.type === type && job.state === JobState.QUEUED) {
        const success = await this.cancelWork(job.id);
        if (success) cancelled++;
      }
    }

    console.log(`[Work Queue] Cancelled ${cancelled} pending ${type} jobs`);
    return cancelled;
  }

  /**
   * Get job status
   *
   * @param {string} jobId - Job ID
   * @returns {object|null} Job data or null if not found
   */
  getJob(jobId) {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Get queue status
   *
   * @returns {Promise<object>} Queue status with per-type stats
   */
  async getQueueStatus() {
    const status = {
      enabled: this.enabled,
      redisConnected: this.connected,
      types: {},
      stats: { ...this.stats }
    };

    for (const type of Object.keys(WORK_TYPE_LIMITS)) {
      const limiter = this.limiters[type];

      // Count jobs by state
      const queued = Array.from(this.jobs.values()).filter(
        j => j.type === type && j.state === JobState.QUEUED
      ).length;

      const running = Array.from(this.jobs.values()).filter(
        j => j.type === type && j.state === JobState.RUNNING
      ).length;

      const completed = Array.from(this.jobs.values()).filter(
        j => j.type === type && j.state === JobState.COMPLETED
      ).length;

      const failed = Array.from(this.jobs.values()).filter(
        j => j.type === type && j.state === JobState.FAILED
      ).length;

      const cancelled = Array.from(this.jobs.values()).filter(
        j => j.type === type && j.state === JobState.CANCELLED
      ).length;

      status.types[type] = {
        maxConcurrent: WORK_TYPE_LIMITS[type],
        active: limiter.activeCount,
        pending: limiter.pendingCount,
        queued,
        running,
        completed,
        failed,
        cancelled
      };
    }

    return status;
  }

  /**
   * Clear all jobs (for testing)
   */
  async clearAll() {
    this.jobs.clear();
    for (const type of Object.keys(WORK_TYPE_LIMITS)) {
      this.queues[type] = { 1: [], 2: [], 3: [] };
    }

    if (this.connected) {
      try {
        const keys = await this.redis.keys('work-queue:*');
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
        console.log(`[Work Queue] Cleared ${keys.length} Redis keys`);
      } catch (error) {
        console.error(`[Work Queue] Failed to clear Redis: ${error.message}`);
      }
    }

    this.stats = {
      totalQueued: 0,
      totalCompleted: 0,
      totalFailed: 0,
      totalCancelled: 0
    };

    console.log('[Work Queue] Cleared all jobs');
  }

  /**
   * Disconnect from Redis
   */
  async disconnect() {
    if (this.redis) {
      await this.redis.quit();
      this.connected = false;
      console.log('[Work Queue] Disconnected from Redis');
    }
  }
}

// Singleton instance
let instance = null;

/**
 * Get singleton instance
 */
export function getWorkQueue() {
  if (!instance) {
    instance = new WorkQueue();
  }
  return instance;
}

/**
 * Enqueue work (convenience wrapper)
 */
export async function enqueueWork(type, data, batchSize = 1, executeFn) {
  const queue = getWorkQueue();
  return await queue.enqueueWork(type, data, batchSize, executeFn);
}

/**
 * Cancel work (convenience wrapper)
 */
export async function cancelWork(jobId) {
  const queue = getWorkQueue();
  return await queue.cancelWork(jobId);
}

/**
 * Cancel all pending work of a type (convenience wrapper)
 */
export async function cancelAllPending(type) {
  const queue = getWorkQueue();
  return await queue.cancelAllPending(type);
}

/**
 * Get queue status (convenience wrapper)
 */
export async function getQueueStatus() {
  const queue = getWorkQueue();
  return await queue.getQueueStatus();
}

/**
 * Get job status (convenience wrapper)
 */
export function getJob(jobId) {
  const queue = getWorkQueue();
  return queue.getJob(jobId);
}
