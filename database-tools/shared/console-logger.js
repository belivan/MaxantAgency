/**
 * Console Logger with SSE Streaming
 *
 * Provides a centralized logging utility that:
 * 1. Logs to console as normal
 * 2. Buffers recent logs in memory
 * 3. Exposes an SSE endpoint for real-time streaming to the UI
 *
 * Usage:
 * import { createLogger, setupLogStreamEndpoint } from './console-logger.js';
 *
 * const logger = createLogger('analysis-engine');
 * logger.info('Starting analysis...');
 * logger.error('Something failed', { error: err.message });
 *
 * // In Express app:
 * setupLogStreamEndpoint(app);
 */

// In-memory log buffer (circular buffer)
const MAX_LOGS = 500;
const logBuffer = [];
const sseClients = new Set();

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
 * Add log to buffer and broadcast to SSE clients
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

export default { createLogger, getRecentLogs, clearLogs, setupLogStreamEndpoint, interceptConsole };
