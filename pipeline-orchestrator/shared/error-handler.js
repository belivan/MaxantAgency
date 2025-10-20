/**
 * Error Handler
 * Centralized error handling utilities
 */

import { log } from './logger.js';

/**
 * Custom error classes
 */

export class ValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.statusCode = 400;
  }
}

export class NotFoundError extends Error {
  constructor(resource, id = null) {
    super(`${resource} not found${id ? `: ${id}` : ''}`);
    this.name = 'NotFoundError';
    this.resource = resource;
    this.id = id;
    this.statusCode = 404;
  }
}

export class BudgetExceededError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'BudgetExceededError';
    this.details = details;
    this.statusCode = 429;
  }
}

export class EngineError extends Error {
  constructor(engine, message, originalError = null) {
    super(`${engine} error: ${message}`);
    this.name = 'EngineError';
    this.engine = engine;
    this.originalError = originalError;
    this.statusCode = 502;
  }
}

/**
 * Express error handling middleware
 */
export function errorHandler(err, req, res, next) {
  // Log the error
  log.error('Request error', {
    method: req.method,
    path: req.path,
    error: err.message,
    stack: err.stack,
    statusCode: err.statusCode || 500
  });

  // Determine status code
  const statusCode = err.statusCode || 500;

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: err.message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err.details
    })
  });
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors automatically
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Validate required fields
 */
export function validateRequired(obj, fields) {
  const missing = [];

  for (const field of fields) {
    if (obj[field] === undefined || obj[field] === null || obj[field] === '') {
      missing.push(field);
    }
  }

  if (missing.length > 0) {
    throw new ValidationError(`Missing required fields: ${missing.join(', ')}`);
  }

  return true;
}

/**
 * Validate field types
 */
export function validateTypes(obj, schema) {
  for (const [field, expectedType] of Object.entries(schema)) {
    if (obj[field] !== undefined) {
      const actualType = typeof obj[field];
      if (actualType !== expectedType) {
        throw new ValidationError(
          `Invalid type for ${field}: expected ${expectedType}, got ${actualType}`,
          field
        );
      }
    }
  }

  return true;
}

/**
 * Validate enum values
 */
export function validateEnum(value, allowedValues, fieldName) {
  if (!allowedValues.includes(value)) {
    throw new ValidationError(
      `Invalid value for ${fieldName}: ${value}. Allowed: ${allowedValues.join(', ')}`,
      fieldName
    );
  }

  return true;
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff(fn, options = {}) {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    factor = 2,
    onRetry = null
  } = options;

  let lastError;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts) {
        throw error;
      }

      if (onRetry) {
        onRetry(attempt, error);
      }

      log.warn('Retrying after error', {
        attempt,
        maxAttempts,
        delay,
        error: error.message
      });

      await sleep(delay);
      delay = Math.min(delay * factor, maxDelay);
    }
  }

  throw lastError;
}

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Safe JSON parse with error handling
 */
export function safeJSONParse(str, defaultValue = null) {
  try {
    return JSON.parse(str);
  } catch (error) {
    log.error('JSON parse error', { error: error.message });
    return defaultValue;
  }
}

/**
 * Sanitize user input
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;

  return input
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
}

export default {
  ValidationError,
  NotFoundError,
  BudgetExceededError,
  EngineError,
  errorHandler,
  asyncHandler,
  validateRequired,
  validateTypes,
  validateEnum,
  retryWithBackoff,
  safeJSONParse,
  sanitizeInput
};
