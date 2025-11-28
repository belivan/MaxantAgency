/**
 * Console Logger with SSE Streaming and File/Database Persistence
 *
 * Provides a centralized logging utility that:
 * 1. Logs to console as normal
 * 2. Buffers recent logs in memory
 * 3. Exposes an SSE endpoint for real-time streaming to the UI
 * 4. Optionally persists logs to VPS JSONL files (recommended)
 * 5. Optionally persists logs to Supabase system_logs table (legacy)
 *
 * Usage:
 * import { createLogger, setupLogStreamEndpoint } from './console-logger.js';
 *
 * const logger = createLogger('analysis-engine');
 * logger.info('Starting analysis...');
 * logger.error('Something failed', { error: err.message });
 *
 * // For job-specific logging:
 * logger.setJobContext('job-123');
 * logger.info('Processing lead'); // Also writes to jobs/job-123.jsonl
 *
 * // In Express app:
 * setupLogStreamEndpoint(app);
 *
 * Environment Variables:
 * - LOG_TO_FILE=true  Enable VPS file persistence (recommended)
 * - LOG_TO_DB=true    Enable database persistence (legacy, costs money)
 */

import { getSupabaseClient } from './supabase-client.js';
import {
  appendLog as appendLogToFile,
  appendJobLog,
  cleanupOldLogs as cleanupFileOldLogs,
  ensureLogDirectories
} from './log-storage.js';
import dotenv from 'dotenv';

dotenv.config();

// Persistence config
const LOG_TO_FILE = process.env.LOG_TO_FILE === 'true';
const LOG_TO_DB = process.env.LOG_TO_DB === 'true';

// In-memory log buffer (circular buffer)
const MAX_LOGS = parseInt(process.env.LOG_BUFFER_SIZE) || 500;
const logBuffer = [];
const sseClients = new Set();

// Track if we've warned about issues (avoid spam)
let dbWarningShown = false;
let fileWarningShown = false;

// Track current job context for job-specific logging
let currentJobId = null;

// Log levels with numeric priority
const LOG_LEVELS = {
  debug: 0,
  info: 1,
  success: 2,
  warning: 3,
  error: 4,
};

// ANSI color codes for terminal output
const COLORS = {
  reset: '\x1b[0m',
  debug: '\x1b[90m',    // gray
  info: '\x1b[36m',     // cyan
  success: '\x1b[32m',  // green
  warning: '\x1b[33m',  // yellow
  error: '\x1b[31m',    // red
  timestamp: '\x1b[90m', // gray
  engine: '\x1b[35m',   // magenta
};

/**
 * Format timestamp for display
 */
function formatTimestamp(date) {
  return date.toISOString().split('T')[1].slice(0, 12);
}

/**
 * Persist log to VPS JSONL file (async, non-blocking)
 */
async function persistLogToFile(logEntry) {
  if (!LOG_TO_FILE) return;

  try {
    // Write to engine's daily log file
    await appendLogToFile(logEntry.engine, {
      ts: logEntry.timestamp,
      engine: logEntry.engine,
      module: logEntry.module,
      level: logEntry.level,
      msg: logEntry.message?.slice(0, 5000) || '',
      data: logEntry.data || null
    });

    // Also write to job-specific log if job context is set
    if (currentJobId) {
      await appendJobLog(currentJobId, {
        ts: logEntry.timestamp,
        engine: logEntry.engine,
        module: logEntry.module,
        level: logEntry.level,
        msg: logEntry.message?.slice(0, 5000) || '',
        data: logEntry.data || null
      });
    }
  } catch (err) {
    // Silent fail - don't break operations
    if (!fileWarningShown) {
      // Use original console.warn to avoid recursion
      process.stderr.write(`[Console Logger] File persistence error: ${err.message}\n`);
      fileWarningShown = true;
    }
  }
}

/**
 * Persist log to Supabase system_logs table (async, non-blocking)
 * Legacy - use LOG_TO_FILE instead for cost savings
 */
async function persistLogToDatabase(logEntry) {
  if (!LOG_TO_DB) return;

  try {
    const db = getSupabaseClient();
    if (!db) {
      if (!dbWarningShown) {
        process.stderr.write('[Console Logger] Supabase client not available for log persistence\n');
        dbWarningShown = true;
      }
      return;
    }

    const { error } = await db.from('system_logs').insert({
      engine: logEntry.engine,
      module: logEntry.module || null,
      level: logEntry.level,
      message: logEntry.message?.slice(0, 5000) || '', // Limit message length
      data: logEntry.data || null,
    });

    if (error) {
      // Only warn once to avoid log spam
      if (!dbWarningShown) {
        process.stderr.write(`[Console Logger] Failed to persist log to database: ${error.message}\n`);
        dbWarningShown = true;
      }
    }
  } catch (err) {
    // Silent fail - don't break operations
    if (!dbWarningShown) {
      process.stderr.write(`[Console Logger] Database persistence error: ${err.message}\n`);
      dbWarningShown = true;
    }
  }
}

/**
 * Clean up old logs (older than 5 days)
 * Call this on startup or periodically
 * Handles both file and database cleanup
 */
export async function cleanupOldLogs(retentionDays = 5) {
  const results = {
    fileCleanup: null,
    dbCleanup: null
  };

  // Clean up file logs (VPS storage)
  if (LOG_TO_FILE) {
    try {
      results.fileCleanup = await cleanupFileOldLogs(retentionDays);
    } catch (err) {
      results.fileCleanup = { error: err.message };
    }
  }

  // Clean up database logs (Supabase)
  if (LOG_TO_DB) {
    try {
      const db = getSupabaseClient();
      if (db) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        const { data, error } = await db
          .from('system_logs')
          .delete()
          .lt('created_at', cutoffDate.toISOString())
          .select('id');

        if (error) {
          results.dbCleanup = { deleted: 0, error: error.message };
        } else {
          const deleted = data?.length || 0;
          results.dbCleanup = { deleted };
          if (deleted > 0) {
            process.stdout.write(`[Console Logger] Cleaned up ${deleted} DB logs older than ${retentionDays} days\n`);
          }
        }
      }
    } catch (err) {
      results.dbCleanup = { deleted: 0, error: err.message };
    }
  }

  return results;
}

/**
 * Add log to buffer, broadcast to SSE clients, and persist
 */
function addLog(log) {
  // Add to circular buffer
  logBuffer.push(log);
  if (logBuffer.length > MAX_LOGS) {
    logBuffer.shift();
  }

  // Broadcast to all connected SSE clients
  const data = JSON.stringify(log);
  for (const client of sseClients) {
    try {
      client.write(`data: ${data}\n\n`);
    } catch (err) {
      // Client disconnected, remove from set
      sseClients.delete(client);
    }
  }

  // Persist to VPS file (async, non-blocking) - recommended
  persistLogToFile(log).catch(() => {
    // Silently ignore - we already handle errors inside the function
  });

  // Persist to database (async, non-blocking) - legacy
  persistLogToDatabase(log).catch(() => {
    // Silently ignore - we already handle errors inside the function
  });
}

/**
 * Set the current job context for job-specific logging
 * @param {string|null} jobId - Job ID or null to clear
 */
export function setJobContext(jobId) {
  currentJobId = jobId;
}

/**
 * Clear the current job context
 */
export function clearJobContext() {
  currentJobId = null;
}

/**
 * Create a logger instance for a specific engine/module
 */
export function createLogger(engine, module = 'main') {
  const log = (level, message, data = null) => {
    const timestamp = new Date();
    const logEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: timestamp.toISOString(),
      engine,
      module,
      level,
      message,
      data,
    };

    // Console output with colors
    const color = COLORS[level] || COLORS.info;
    const prefix = `${COLORS.timestamp}[${formatTimestamp(timestamp)}]${COLORS.reset} ${COLORS.engine}[${engine}]${COLORS.reset}`;
    const levelTag = `${color}[${level.toUpperCase()}]${COLORS.reset}`;

    if (data) {
      console.log(`${prefix} ${levelTag} ${message}`, data);
    } else {
      console.log(`${prefix} ${levelTag} ${message}`);
    }

    // Add to buffer and broadcast
    addLog(logEntry);

    return logEntry;
  };

  return {
    debug: (msg, data) => log('debug', msg, data),
    info: (msg, data) => log('info', msg, data),
    success: (msg, data) => log('success', msg, data),
    warn: (msg, data) => log('warning', msg, data),
    warning: (msg, data) => log('warning', msg, data),
    error: (msg, data) => log('error', msg, data),

    // Create a child logger with a specific module name
    child: (childModule) => createLogger(engine, childModule),

    // Set job context for this logger's scope
    setJobContext: (jobId) => setJobContext(jobId),
    clearJobContext: () => clearJobContext(),
  };
}

/**
 * Get recent logs from buffer
 */
export function getRecentLogs(count = 100, filters = {}) {
  let logs = [...logBuffer];

  // Apply filters
  if (filters.engine) {
    logs = logs.filter(l => l.engine === filters.engine);
  }
  if (filters.level) {
    const minLevel = LOG_LEVELS[filters.level] || 0;
    logs = logs.filter(l => LOG_LEVELS[l.level] >= minLevel);
  }
  if (filters.since) {
    const since = new Date(filters.since);
    logs = logs.filter(l => new Date(l.timestamp) > since);
  }

  // Return most recent
  return logs.slice(-count);
}

/**
 * Clear all logs from buffer
 */
export function clearLogs() {
  logBuffer.length = 0;
}

/**
 * Intercept all console.log/warn/error calls and stream them
 * Call this once at startup to capture ALL console output
 */
let consoleIntercepted = false;
let currentEngineName = 'unknown';

export function interceptConsole(engineName) {
  if (consoleIntercepted) return;
  consoleIntercepted = true;
  currentEngineName = engineName;

  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  const originalInfo = console.info;
  const originalDebug = console.debug;

  // Helper to stringify arguments
  const formatArgs = (args) => {
    return args.map(arg => {
      if (typeof arg === 'string') return arg;
      if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
      try {
        return JSON.stringify(arg, null, 2);
      } catch {
        return String(arg);
      }
    }).join(' ');
  };

  // Helper to extract data from args
  const extractData = (args) => {
    const nonStringArgs = args.filter(arg => typeof arg !== 'string');
    if (nonStringArgs.length === 0) return null;
    if (nonStringArgs.length === 1) return nonStringArgs[0];
    return nonStringArgs;
  };

  console.log = (...args) => {
    originalLog.apply(console, args);
    const message = formatArgs(args);
    // Skip internal SSE/stream messages to avoid loops
    if (!message.includes('SSE client') && !message.includes('data: {')) {
      addLog({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        engine: currentEngineName,
        module: 'console',
        level: 'info',
        message: message.slice(0, 2000), // Limit message length
        data: extractData(args),
      });
    }
  };

  console.info = (...args) => {
    originalInfo.apply(console, args);
    const message = formatArgs(args);
    addLog({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      engine: currentEngineName,
      module: 'console',
      level: 'info',
      message: message.slice(0, 2000),
      data: extractData(args),
    });
  };

  console.warn = (...args) => {
    originalWarn.apply(console, args);
    const message = formatArgs(args);
    addLog({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      engine: currentEngineName,
      module: 'console',
      level: 'warning',
      message: message.slice(0, 2000),
      data: extractData(args),
    });
  };

  console.error = (...args) => {
    originalError.apply(console, args);
    const message = formatArgs(args);
    addLog({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      engine: currentEngineName,
      module: 'console',
      level: 'error',
      message: message.slice(0, 2000),
      data: extractData(args),
    });
  };

  console.debug = (...args) => {
    originalDebug.apply(console, args);
    const message = formatArgs(args);
    addLog({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      engine: currentEngineName,
      module: 'console',
      level: 'debug',
      message: message.slice(0, 2000),
      data: extractData(args),
    });
  };
}

/**
 * Setup SSE endpoint for log streaming
 * Call this in your Express app setup
 */
export function setupLogStreamEndpoint(app, engineName) {
  // Intercept console methods to capture all logs
  interceptConsole(engineName);
  // SSE endpoint for real-time log streaming
  app.get('/api/logs/stream', (req, res) => {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected', engine: engineName })}\n\n`);

    // Send recent logs on connect
    const recentLogs = getRecentLogs(50);
    for (const log of recentLogs) {
      res.write(`data: ${JSON.stringify(log)}\n\n`);
    }

    // Add client to set for broadcasts
    sseClients.add(res);

    // Handle client disconnect
    req.on('close', () => {
      sseClients.delete(res);
    });
  });

  // REST endpoint to get recent logs
  app.get('/api/logs', (req, res) => {
    const count = parseInt(req.query.count) || 100;
    const filters = {
      engine: req.query.engine,
      level: req.query.level,
      since: req.query.since,
    };

    res.json({
      success: true,
      logs: getRecentLogs(count, filters),
    });
  });

  // Clear logs endpoint
  app.post('/api/logs/clear', (req, res) => {
    clearLogs();
    res.json({ success: true, message: 'Logs cleared' });
  });
}

export default {
  createLogger,
  getRecentLogs,
  clearLogs,
  setupLogStreamEndpoint,
  interceptConsole,
  cleanupOldLogs,
  setJobContext,
  clearJobContext
};
