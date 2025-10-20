/**
 * Pipeline Health Monitor
 * Monitors health of all engines and system components
 */

import fetch from 'node-fetch';
import { log } from '../shared/logger.js';

/**
 * Check health of all engines
 *
 * @returns {Promise<Object>} Health status of all components
 */
export async function checkPipelineHealth() {
  const engines = [
    { name: 'Prospecting Engine', url: 'http://localhost:3010/api/health' },
    { name: 'Analysis Engine', url: 'http://localhost:3000/api/health' },
    { name: 'Outreach Engine', url: 'http://localhost:3001/api/health' }
  ];

  const results = {
    healthy: true,
    timestamp: new Date().toISOString(),
    engines: {}
  };

  for (const engine of engines) {
    try {
      const response = await fetch(engine.url, {
        method: 'GET',
        timeout: 5000
      });

      const data = await response.json();

      results.engines[engine.name] = {
        status: response.ok ? 'healthy' : 'unhealthy',
        statusCode: response.status,
        details: data
      };

      if (!response.ok) {
        results.healthy = false;
      }

    } catch (error) {
      results.engines[engine.name] = {
        status: 'unreachable',
        error: error.message
      };
      results.healthy = false;

      log.error(`Engine health check failed: ${engine.name}`, {
        url: engine.url,
        error: error.message
      });
    }
  }

  return results;
}

/**
 * Check if a specific engine is healthy
 *
 * @param {string} engineUrl - Engine health endpoint URL
 * @returns {Promise<boolean>} True if healthy
 */
export async function isEngineHealthy(engineUrl) {
  try {
    const response = await fetch(engineUrl, {
      method: 'GET',
      timeout: 5000
    });

    return response.ok;

  } catch (error) {
    log.error('Engine health check failed', {
      url: engineUrl,
      error: error.message
    });
    return false;
  }
}

/**
 * Monitor pipeline health continuously
 *
 * @param {number} intervalMs - Check interval in milliseconds (default: 60000 = 1 min)
 * @param {Function} onUnhealthy - Callback when pipeline becomes unhealthy
 */
export function startHealthMonitoring(intervalMs = 60000, onUnhealthy = null) {
  log.info('Starting pipeline health monitoring', { intervalMs });

  const intervalId = setInterval(async () => {
    const health = await checkPipelineHealth();

    if (!health.healthy) {
      log.warn('Pipeline unhealthy', { engines: health.engines });

      if (onUnhealthy) {
        onUnhealthy(health);
      }
    } else {
      log.debug('Pipeline health check passed', { timestamp: health.timestamp });
    }
  }, intervalMs);

  return intervalId;
}

/**
 * Stop health monitoring
 *
 * @param {number} intervalId - Interval ID from startHealthMonitoring
 */
export function stopHealthMonitoring(intervalId) {
  if (intervalId) {
    clearInterval(intervalId);
    log.info('Stopped pipeline health monitoring');
  }
}

/**
 * Get detailed system health metrics
 *
 * @returns {Promise<Object>} System health metrics
 */
export async function getSystemHealthMetrics() {
  const pipelineHealth = await checkPipelineHealth();

  const metrics = {
    pipeline: pipelineHealth,
    system: {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version,
      platform: process.platform
    },
    timestamp: new Date().toISOString()
  };

  return metrics;
}

export default {
  checkPipelineHealth,
  isEngineHealthy,
  startHealthMonitoring,
  stopHealthMonitoring,
  getSystemHealthMetrics
};
