/**
 * MAKSANT - Centralized Logging System
 *
 * Features:
 * - Structured logs with timestamps
 * - Multiple log levels (debug, info, warn, error)
 * - Console output with colors
 * - File output to logs/ directory
 * - Automatic log rotation (daily)
 * - JSON format for easy parsing
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Log levels
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

// ANSI color codes
const COLORS = {
  DEBUG: '\x1b[36m',   // Cyan
  INFO: '\x1b[32m',    // Green
  WARN: '\x1b[33m',    // Yellow
  ERROR: '\x1b[31m',   // Red
  RESET: '\x1b[0m'
};

class Logger {
  constructor(serviceName, options = {}) {
    this.serviceName = serviceName;
    this.minLevel = LOG_LEVELS[options.level?.toUpperCase()] ?? LOG_LEVELS.INFO;
    this.enableConsole = options.console ?? true;
    this.enableFile = options.file ?? true;
    this.logsDir = options.logsDir || path.resolve(__dirname, '..', 'logs');

    // Create logs directory if it doesn't exist
    if (this.enableFile && !fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  /**
   * Get current date string for log file naming (YYYY-MM-DD)
   */
  getDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Get ISO timestamp string
   */
  getTimestamp() {
    return new Date().toISOString();
  }

  /**
   * Format log entry for console
   */
  formatConsole(level, message, data) {
    const timestamp = this.getTimestamp();
    const color = COLORS[level];
    const reset = COLORS.RESET;

    let output = `${color}[${timestamp}] [${this.serviceName}] [${level}]${reset} ${message}`;

    if (data && Object.keys(data).length > 0) {
      output += `\n${color}${JSON.stringify(data, null, 2)}${reset}`;
    }

    return output;
  }

  /**
   * Format log entry for file (JSON)
   */
  formatFile(level, message, data) {
    return JSON.stringify({
      timestamp: this.getTimestamp(),
      service: this.serviceName,
      level,
      message,
      data: data || {}
    }) + '\n';
  }

  /**
   * Write log to file
   */
  writeToFile(level, message, data) {
    if (!this.enableFile) return;

    try {
      const dateStr = this.getDateString();
      const logFile = path.join(this.logsDir, `${this.serviceName}-${dateStr}.log`);
      const logEntry = this.formatFile(level, message, data);

      fs.appendFileSync(logFile, logEntry, 'utf8');
    } catch (error) {
      console.error('Failed to write to log file:', error.message);
    }
  }

  /**
   * Core logging method
   */
  log(level, message, data = {}) {
    const levelValue = LOG_LEVELS[level];

    // Skip if below minimum level
    if (levelValue < this.minLevel) return;

    // Console output
    if (this.enableConsole) {
      console.log(this.formatConsole(level, message, data));
    }

    // File output
    this.writeToFile(level, message, data);
  }

  /**
   * Convenience methods
   */
  debug(message, data) {
    this.log('DEBUG', message, data);
  }

  info(message, data) {
    this.log('INFO', message, data);
  }

  warn(message, data) {
    this.log('WARN', message, data);
  }

  error(message, data) {
    this.log('ERROR', message, data);
  }

  /**
   * Log an HTTP request
   */
  http(method, path, statusCode, duration) {
    const level = statusCode >= 500 ? 'ERROR' : statusCode >= 400 ? 'WARN' : 'INFO';
    this.log(level, `${method} ${path} ${statusCode}`, { duration: `${duration}ms` });
  }

  /**
   * Log cost/billing information
   */
  cost(operation, amount, details = {}) {
    this.info(`Cost: ${operation}`, {
      amount: `$${amount.toFixed(4)}`,
      ...details
    });
  }
}

/**
 * Create a logger instance
 */
export function createLogger(serviceName, options = {}) {
  return new Logger(serviceName, options);
}

/**
 * Express middleware for request logging
 */
export function requestLogger(logger) {
  return (req, res, next) => {
    const start = Date.now();

    // Log when response finishes
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.http(req.method, req.path, res.statusCode, duration);
    });

    next();
  };
}

export default { createLogger, requestLogger };
