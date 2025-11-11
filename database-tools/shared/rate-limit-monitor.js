/**
 * Rate Limit Monitor
 *
 * Real-time monitoring dashboard for distributed rate limit usage across all engines.
 * Shows current token usage, capacity, and alerts when approaching limits.
 *
 * Usage:
 *   import { getRateLimitMonitor } from './rate-limit-monitor.js';
 *
 *   const monitor = getRateLimitMonitor();
 *
 *   // Get current status
 *   const status = await monitor.getStatus();
 *
 *   // Start live monitoring (logs every N seconds)
 *   monitor.startMonitoring(5000); // Every 5 seconds
 *
 *   // Stop monitoring
 *   monitor.stopMonitoring();
 *
 * CLI Usage:
 *   node rate-limit-monitor.js              # One-time status check
 *   node rate-limit-monitor.js --watch      # Live monitoring
 *   node rate-limit-monitor.js --watch=10   # Live monitoring every 10 seconds
 */

import { getDistributedRateLimiter } from './distributed-rate-limiter.js';
import { getQueueStats } from './request-queue.js';

// Alert thresholds
const WARNING_THRESHOLD = 70; // Warn when usage > 70%
const CRITICAL_THRESHOLD = 85; // Critical when usage > 85%

// Singleton instance
let instance = null;

/**
 * Rate Limit Monitor Class
 */
class RateLimitMonitor {
  constructor() {
    this.distributedLimiter = getDistributedRateLimiter();
    this.monitoringInterval = null;
    this.alertsSent = new Set(); // Track which alerts we've already sent
  }

  /**
   * Get comprehensive status of all rate limits
   *
   * @returns {Promise<object>} Status object with all providers/models
   */
  async getStatus() {
    try {
      // Get distributed limiter status
      const distributedStatus = await this.distributedLimiter.getStatus();

      // Get local queue stats
      const queueStats = getQueueStats();

      return {
        timestamp: new Date().toISOString(),
        distributed: distributedStatus,
        localQueue: queueStats,
        alerts: this.generateAlerts(distributedStatus)
      };

    } catch (error) {
      console.error('[Rate Limit Monitor] Failed to get status:', error.message);
      return {
        timestamp: new Date().toISOString(),
        error: error.message,
        distributed: { enabled: false, connected: false, providers: {} },
        localQueue: getQueueStats(),
        alerts: []
      };
    }
  }

  /**
   * Generate alerts based on current usage
   *
   * @param {object} status - Distributed limiter status
   * @returns {Array} Array of alert objects
   */
  generateAlerts(status) {
    const alerts = [];

    if (!status.enabled || !status.connected) {
      alerts.push({
        level: 'warning',
        message: 'Distributed rate limiting is disabled or disconnected',
        provider: 'system',
        model: 'n/a'
      });
      return alerts;
    }

    for (const [provider, models] of Object.entries(status.providers)) {
      for (const [model, usage] of Object.entries(models)) {
        // Check each limit type (tpm, itpm, otpm, rpm)
        for (const [limitType, stats] of Object.entries(usage)) {
          if (stats.percentage >= CRITICAL_THRESHOLD) {
            alerts.push({
              level: 'critical',
              message: `${limitType.toUpperCase()} at ${stats.percentage}% (${stats.used.toLocaleString()}/${stats.capacity.toLocaleString()})`,
              provider,
              model,
              limitType,
              percentage: stats.percentage
            });
          } else if (stats.percentage >= WARNING_THRESHOLD) {
            alerts.push({
              level: 'warning',
              message: `${limitType.toUpperCase()} at ${stats.percentage}% (${stats.used.toLocaleString()}/${stats.capacity.toLocaleString()})`,
              provider,
              model,
              limitType,
              percentage: stats.percentage
            });
          }
        }
      }
    }

    return alerts;
  }

  /**
   * Print formatted status to console
   *
   * @param {object} status - Status object from getStatus()
   */
  printStatus(status) {
    console.log('\n' + '='.repeat(80));
    console.log(`Rate Limit Status - ${status.timestamp}`);
    console.log('='.repeat(80));

    // Distributed limiter status
    if (status.distributed.enabled && status.distributed.connected) {
      console.log('\n📊 Distributed Rate Limits (Cross-Engine)\n');

      for (const [provider, models] of Object.entries(status.distributed.providers)) {
        console.log(`\n  ${provider.toUpperCase()}:`);

        for (const [model, usage] of Object.entries(models)) {
          console.log(`    ${model}:`);

          for (const [limitType, stats] of Object.entries(usage)) {
            const bar = this.createProgressBar(stats.percentage);
            const color = stats.percentage >= CRITICAL_THRESHOLD ? '🔴' :
                         stats.percentage >= WARNING_THRESHOLD ? '🟡' : '🟢';

            console.log(`      ${limitType.toUpperCase()}: ${bar} ${color} ${stats.percentage}% (${stats.used.toLocaleString()}/${stats.capacity.toLocaleString()})`);
          }
        }
      }
    } else {
      console.log('\n⚠️  Distributed rate limiting: DISABLED or DISCONNECTED');
      console.log('   Using local-only rate limiting (per-engine)');
    }

    // Local queue stats
    console.log('\n📦 Local Request Queue\n');
    console.log(`   Active: ${status.localQueue.activeCount}/${status.localQueue.maxConcurrent}`);
    console.log(`   Pending: ${status.localQueue.pendingCount}`);
    console.log(`   Processed: ${status.localQueue.totalProcessed}`);
    console.log(`   Failed: ${status.localQueue.totalFailed}`);
    console.log(`   Success Rate: ${status.localQueue.successRate}%`);
    console.log(`   Avg Wait Time: ${status.localQueue.avgWaitTimeMs}ms`);

    // Alerts
    if (status.alerts.length > 0) {
      console.log('\n🚨 Alerts\n');
      for (const alert of status.alerts) {
        const icon = alert.level === 'critical' ? '🔴' : '🟡';
        console.log(`   ${icon} [${alert.level.toUpperCase()}] ${alert.provider}:${alert.model} - ${alert.message}`);
      }
    } else {
      console.log('\n✅ No Alerts - All systems operating normally');
    }

    console.log('\n' + '='.repeat(80) + '\n');
  }

  /**
   * Create ASCII progress bar
   *
   * @param {number} percentage - Percentage (0-100)
   * @returns {string} ASCII progress bar
   */
  createProgressBar(percentage) {
    const width = 20;
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    return '[' + '█'.repeat(filled) + '░'.repeat(empty) + ']';
  }

  /**
   * Start live monitoring (logs status every N milliseconds)
   *
   * @param {number} intervalMs - Interval in milliseconds (default: 5000)
   */
  async startMonitoring(intervalMs = 5000) {
    if (this.monitoringInterval) {
      console.warn('[Rate Limit Monitor] Monitoring already started');
      return;
    }

    console.log(`[Rate Limit Monitor] Starting live monitoring (every ${intervalMs / 1000}s)`);
    console.log('[Rate Limit Monitor] Press Ctrl+C to stop\n');

    // Initial status
    const initialStatus = await this.getStatus();
    this.printStatus(initialStatus);

    // Periodic updates
    this.monitoringInterval = setInterval(async () => {
      const status = await this.getStatus();
      this.printStatus(status);

      // Send alerts (only once per issue)
      for (const alert of status.alerts) {
        const alertKey = `${alert.provider}:${alert.model}:${alert.limitType}:${alert.level}`;
        if (!this.alertsSent.has(alertKey)) {
          this.sendAlert(alert);
          this.alertsSent.add(alertKey);
        }
      }

      // Clear alerts that are no longer active
      if (status.alerts.length === 0) {
        this.alertsSent.clear();
      }

    }, intervalMs);
  }

  /**
   * Stop live monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('\n[Rate Limit Monitor] Monitoring stopped');
    }
  }

  /**
   * Send alert (can be extended to send to Slack, email, etc.)
   *
   * @param {object} alert - Alert object
   */
  sendAlert(alert) {
    console.error(`\n🚨 ALERT [${alert.level.toUpperCase()}]: ${alert.provider}:${alert.model} - ${alert.message}\n`);

    // TODO: Add integrations for Slack, email, PagerDuty, etc.
    // Example:
    // if (process.env.SLACK_WEBHOOK_URL) {
    //   await fetch(process.env.SLACK_WEBHOOK_URL, {
    //     method: 'POST',
    //     body: JSON.stringify({ text: `🚨 ${alert.message}` })
    //   });
    // }
  }

  /**
   * Get summary statistics
   *
   * @returns {Promise<object>} Summary stats
   */
  async getSummary() {
    const status = await this.getStatus();

    let totalCapacity = 0;
    let totalUsed = 0;
    let modelCount = 0;

    if (status.distributed.enabled && status.distributed.connected) {
      for (const [provider, models] of Object.entries(status.distributed.providers)) {
        for (const [model, usage] of Object.entries(models)) {
          for (const [limitType, stats] of Object.entries(usage)) {
            totalCapacity += stats.capacity;
            totalUsed += stats.used;
            modelCount++;
          }
        }
      }
    }

    const overallPercentage = totalCapacity > 0 ? Math.round((totalUsed / totalCapacity) * 100) : 0;

    return {
      overallUsage: overallPercentage,
      totalModels: modelCount,
      totalAlerts: status.alerts.length,
      criticalAlerts: status.alerts.filter(a => a.level === 'critical').length,
      warningAlerts: status.alerts.filter(a => a.level === 'warning').length,
      queueActive: status.localQueue.activeCount,
      queuePending: status.localQueue.pendingCount,
      queueSuccessRate: status.localQueue.successRate
    };
  }
}

/**
 * Get singleton instance
 */
export function getRateLimitMonitor() {
  if (!instance) {
    instance = new RateLimitMonitor();
  }
  return instance;
}

/**
 * CLI Entry Point
 */
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  const monitor = getRateLimitMonitor();

  // Parse CLI arguments
  const watchArg = process.argv.find(arg => arg.startsWith('--watch'));

  if (watchArg) {
    // Live monitoring mode
    let interval = 5000; // Default 5 seconds

    if (watchArg.includes('=')) {
      const seconds = parseInt(watchArg.split('=')[1], 10);
      if (!isNaN(seconds) && seconds > 0) {
        interval = seconds * 1000;
      }
    }

    monitor.startMonitoring(interval);

    // Graceful shutdown
    process.on('SIGINT', () => {
      monitor.stopMonitoring();
      process.exit(0);
    });

  } else {
    // One-time status check
    const status = await monitor.getStatus();
    monitor.printStatus(status);

    const summary = await monitor.getSummary();
    console.log('📈 Summary:');
    console.log(`   Overall Usage: ${summary.overallUsage}%`);
    console.log(`   Active Models: ${summary.totalModels}`);
    console.log(`   Total Alerts: ${summary.totalAlerts} (${summary.criticalAlerts} critical, ${summary.warningAlerts} warning)`);
    console.log(`   Queue: ${summary.queueActive} active, ${summary.queuePending} pending, ${summary.queueSuccessRate}% success rate\n`);

    process.exit(0);
  }
}
