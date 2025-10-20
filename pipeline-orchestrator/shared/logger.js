import winston from 'winston';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure logs directory exists
const logsDir = join(__dirname, '..', 'logs');
if (!existsSync(logsDir)) {
  mkdirSync(logsDir, { recursive: true });
}

const logLevel = process.env.LOG_LEVEL || 'info';
const logFile = process.env.LOG_FILE || './logs/orchestrator.log';

// Custom format for better readability
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = '';
    if (Object.keys(meta).length > 0) {
      metaStr = ' ' + JSON.stringify(meta, null, 2);
    }
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
  })
);

// Create the logger
const logger = winston.createLogger({
  level: logLevel,
  format: customFormat,
  transports: [
    // Console output (colored for development)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        customFormat
      )
    }),
    // File output (all logs)
    new winston.transports.File({
      filename: logFile,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Error file output (errors only)
    new winston.transports.File({
      filename: './logs/error.log',
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5
    })
  ]
});

// Helper methods for structured logging
export const log = {
  info: (message, meta = {}) => logger.info(message, meta),
  warn: (message, meta = {}) => logger.warn(message, meta),
  error: (message, meta = {}) => logger.error(message, meta),
  debug: (message, meta = {}) => logger.debug(message, meta),

  // Campaign-specific helpers
  campaignStarted: (campaign, runId) => {
    logger.info('Campaign started', {
      campaign: campaign.name,
      campaignId: campaign.id,
      runId,
      trigger: 'scheduled'
    });
  },

  campaignCompleted: (campaign, runId, results) => {
    logger.info('Campaign completed', {
      campaign: campaign.name,
      campaignId: campaign.id,
      runId,
      stepsCompleted: results.steps_completed,
      stepsFailed: results.steps_failed,
      cost: results.total_cost,
      duration: results.completed_at - results.started_at
    });
  },

  campaignFailed: (campaign, runId, error) => {
    logger.error('Campaign failed', {
      campaign: campaign.name,
      campaignId: campaign.id,
      runId,
      error: error.message,
      stack: error.stack
    });
  },

  stepStarted: (stepName, config) => {
    logger.info('Step started', {
      step: stepName,
      engine: config.engine,
      endpoint: config.endpoint
    });
  },

  stepCompleted: (stepName, result) => {
    logger.info('Step completed', {
      step: stepName,
      success: result.success,
      cost: result.cost,
      timeMs: result.time_ms
    });
  },

  stepFailed: (stepName, error, attempt) => {
    logger.error('Step failed', {
      step: stepName,
      error: error.message,
      attempt
    });
  },

  budgetCheck: (campaign, spending, limits) => {
    logger.info('Budget check', {
      campaign: campaign.name,
      dailySpending: spending.daily,
      dailyLimit: limits.daily,
      weeklySpending: spending.weekly,
      weeklyLimit: limits.weekly,
      monthlySpending: spending.monthly,
      monthlyLimit: limits.monthly
    });
  },

  budgetExceeded: (campaign, period, spent, limit) => {
    logger.warn('Budget exceeded', {
      campaign: campaign.name,
      period,
      spent,
      limit
    });
  }
};

export default logger;
