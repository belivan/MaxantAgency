import winston from 'winston';
import TransportStream from 'winston-transport';
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from the root .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

const { combine, timestamp, printf, errors } = winston.format;

/**
 * Custom log format for structured logging
 */
const logFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}] ${message}`;

  // Add metadata if present
  if (Object.keys(metadata).length > 0) {
    // Filter out error stack traces for cleaner output
    const cleanMetadata = { ...metadata };
    if (cleanMetadata.stack) {
      delete cleanMetadata.stack;
    }

    if (Object.keys(cleanMetadata).length > 0) {
      msg += ` ${JSON.stringify(cleanMetadata)}`;
    }
  }

  return msg;
});

/**
 * Custom transport that uses console.log so logs get intercepted by console-logger.js
 * This enables real-time log streaming to the UI via SSE
 */
class ConsoleLogTransport extends TransportStream {
  constructor(opts = {}) {
    super(opts);
    this.name = 'consoleLogTransport';
    this.level = opts.level || 'info';
  }

  log(info, callback) {
    setImmediate(() => {
      // Map Winston levels to console methods
      const level = info.level.replace(/\x1B\[[0-9;]*m/g, ''); // Strip ANSI colors
      const message = info[Symbol.for('message')] || info.message;

      switch (level) {
        case 'error':
          console.error(message);
          break;
        case 'warn':
        case 'warning':
          console.warn(message);
          break;
        case 'debug':
          console.debug(message);
          break;
        default:
          console.log(message);
      }
    });
    callback();
  }
}

/**
 * Create Winston logger instance
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports: [
    // Console output via console.log (gets intercepted by console-logger.js)
    new ConsoleLogTransport({
      format: combine(
        timestamp({ format: 'HH:mm:ss' }),
        logFormat
      )
    }),

    // Error log file
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),

    // Combined log file
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ],

  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' })
  ],

  // Handle unhandled rejections
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' })
  ]
});

/**
 * Log helper functions with structured metadata
 */

export function logInfo(message, metadata = {}) {
  logger.info(message, metadata);
}

export function logWarn(message, metadata = {}) {
  logger.warn(message, metadata);
}

export function logError(message, error = null, metadata = {}) {
  const errorData = error ? {
    error: error.message,
    stack: error.stack,
    ...metadata
  } : metadata;

  logger.error(message, errorData);
}

export function logDebug(message, metadata = {}) {
  logger.debug(message, metadata);
}

/**
 * Log pipeline step start
 */
export function logStepStart(step, name, metadata = {}) {
  logger.info(`Step ${step} started: ${name}`, metadata);
}

/**
 * Log pipeline step completion
 */
export function logStepComplete(step, name, duration, metadata = {}) {
  logger.info(`Step ${step} completed: ${name}`, {
    duration_ms: duration,
    ...metadata
  });
}

/**
 * Log API request
 */
export function logApiRequest(service, endpoint, metadata = {}) {
  logger.info(`API request: ${service}`, {
    endpoint,
    ...metadata
  });
}

/**
 * Log API response
 */
export function logApiResponse(service, status, duration, metadata = {}) {
  logger.info(`API response: ${service}`, {
    status,
    duration_ms: duration,
    ...metadata
  });
}

/**
 * Log cost tracking
 */
export function logCost(service, cost, metadata = {}) {
  logger.info(`Cost tracked: ${service}`, {
    cost_usd: cost,
    ...metadata
  });
}

/**
 * Log prospect processing
 */
export function logProspect(action, company, metadata = {}) {
  logger.info(`Prospect ${action}: ${company}`, metadata);
}

export default logger;
