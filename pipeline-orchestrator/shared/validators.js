/**
 * Validators
 * Campaign and step configuration validation
 */

import cron from 'node-cron';
import { ValidationError } from './error-handler.js';
import { log } from './logger.js';

/**
 * Validate campaign configuration
 *
 * @param {Object} config - Campaign config
 * @throws {ValidationError} If invalid
 * @returns {boolean} True if valid
 */
export function validateCampaignConfig(config) {
  // Required fields
  if (!config.name) {
    throw new ValidationError('Campaign name is required', 'name');
  }

  if (!config.steps || !Array.isArray(config.steps)) {
    throw new ValidationError('Campaign must have steps array', 'steps');
  }

  if (config.steps.length === 0) {
    throw new ValidationError('Campaign must have at least one step', 'steps');
  }

  // Validate each step
  config.steps.forEach((step, index) => {
    try {
      validateStepConfig(step);
    } catch (error) {
      throw new ValidationError(`Step ${index + 1} invalid: ${error.message}`, `steps[${index}]`);
    }
  });

  // Validate schedule if present
  if (config.schedule) {
    validateScheduleConfig(config.schedule);
  }

  // Validate budget if present
  if (config.budget) {
    validateBudgetConfig(config.budget);
  }

  log.debug('Campaign config validated successfully', { name: config.name });
  return true;
}

/**
 * Validate step configuration
 *
 * @param {Object} step - Step config
 * @throws {ValidationError} If invalid
 * @returns {boolean} True if valid
 */
export function validateStepConfig(step) {
  // Required fields
  if (!step.name) {
    throw new ValidationError('Step name is required', 'name');
  }

  if (!step.engine) {
    throw new ValidationError('Step engine is required', 'engine');
  }

  if (!step.endpoint) {
    throw new ValidationError('Step endpoint is required', 'endpoint');
  }

  // Validate engine type
  const validEngines = ['prospecting', 'analysis', 'outreach', 'sender'];
  if (!validEngines.includes(step.engine)) {
    throw new ValidationError(
      `Invalid engine: ${step.engine}. Must be one of: ${validEngines.join(', ')}`,
      'engine'
    );
  }

  // Validate endpoint URL
  if (!step.endpoint.startsWith('http://') && !step.endpoint.startsWith('https://')) {
    throw new ValidationError('Step endpoint must be a valid URL', 'endpoint');
  }

  // Validate method
  if (step.method && !['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(step.method.toUpperCase())) {
    throw new ValidationError(`Invalid HTTP method: ${step.method}`, 'method');
  }

  // Validate failure action
  if (step.onFailure && !['abort', 'continue', 'log'].includes(step.onFailure)) {
    throw new ValidationError(
      `Invalid onFailure action: ${step.onFailure}. Must be: abort, continue, or log`,
      'onFailure'
    );
  }

  // Validate success action
  if (step.onSuccess && !['continue', 'abort'].includes(step.onSuccess)) {
    throw new ValidationError(
      `Invalid onSuccess action: ${step.onSuccess}. Must be: continue or abort`,
      'onSuccess'
    );
  }

  // Validate retry config
  if (step.retry) {
    validateRetryConfig(step.retry);
  }

  return true;
}

/**
 * Validate schedule configuration
 *
 * @param {Object} schedule - Schedule config
 * @throws {ValidationError} If invalid
 * @returns {boolean} True if valid
 */
export function validateScheduleConfig(schedule) {
  if (schedule.cron) {
    if (!cron.validate(schedule.cron)) {
      throw new ValidationError(`Invalid cron expression: ${schedule.cron}`, 'schedule.cron');
    }
  }

  if (schedule.enabled !== undefined && typeof schedule.enabled !== 'boolean') {
    throw new ValidationError('schedule.enabled must be a boolean', 'schedule.enabled');
  }

  return true;
}

/**
 * Validate budget configuration
 *
 * @param {Object} budget - Budget config
 * @throws {ValidationError} If invalid
 * @returns {boolean} True if valid
 */
export function validateBudgetConfig(budget) {
  const budgetFields = ['daily', 'weekly', 'monthly', 'perLead'];

  for (const field of budgetFields) {
    if (budget[field] !== undefined) {
      if (typeof budget[field] !== 'number' || budget[field] < 0) {
        throw new ValidationError(
          `budget.${field} must be a positive number`,
          `budget.${field}`
        );
      }
    }
  }

  return true;
}

/**
 * Validate retry configuration
 *
 * @param {Object} retry - Retry config
 * @throws {ValidationError} If invalid
 * @returns {boolean} True if valid
 */
export function validateRetryConfig(retry) {
  if (retry.attempts !== undefined) {
    if (!Number.isInteger(retry.attempts) || retry.attempts < 0) {
      throw new ValidationError('retry.attempts must be a non-negative integer', 'retry.attempts');
    }
  }

  if (retry.delay !== undefined) {
    if (typeof retry.delay !== 'number' || retry.delay < 0) {
      throw new ValidationError('retry.delay must be a non-negative number', 'retry.delay');
    }
  }

  if (retry.backoff && !['exponential', 'linear', 'constant'].includes(retry.backoff)) {
    throw new ValidationError(
      `Invalid backoff strategy: ${retry.backoff}. Must be: exponential, linear, or constant`,
      'retry.backoff'
    );
  }

  return true;
}

/**
 * Validate UUID format
 *
 * @param {string} uuid - UUID string
 * @param {string} fieldName - Field name for error message
 * @throws {ValidationError} If invalid
 * @returns {boolean} True if valid
 */
export function validateUUID(uuid, fieldName = 'id') {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(uuid)) {
    throw new ValidationError(`Invalid UUID format: ${uuid}`, fieldName);
  }

  return true;
}

/**
 * Validate email address
 *
 * @param {string} email - Email address
 * @param {string} fieldName - Field name for error message
 * @throws {ValidationError} If invalid
 * @returns {boolean} True if valid
 */
export function validateEmail(email, fieldName = 'email') {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    throw new ValidationError(`Invalid email format: ${email}`, fieldName);
  }

  return true;
}

export default {
  validateCampaignConfig,
  validateStepConfig,
  validateScheduleConfig,
  validateBudgetConfig,
  validateRetryConfig,
  validateUUID,
  validateEmail
};
